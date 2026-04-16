"""AI 어시스턴트 라우터

엔드포인트:
  GET  /api/ai/sessions                     세션 목록 조회
  POST /api/ai/sessions                     새 세션 생성
  POST /api/ai/sessions/{session_id}/messages  질의 전송 (SSE 스트리밍)
  GET  /api/documents/search               RAG 문서 검색

SSE 형식:
  data: {"chunk": "텍스트", "done": false}\n\n
  data: {"chunk": "", "done": true, "sources": [...], "messageId": "..."}\n\n
  에러: data: {"chunk": "", "done": true, "error": "메시지"}\n\n

OWASP 준수:
  - 인증 미들웨어 의존성 주입 (모든 엔드포인트 보호)
  - 입력 길이/유형 Pydantic 검증
  - API 키 서버 전용 (클라이언트 번들 미포함)
  - 스트리밍 에러 시 done:true + error 반드시 전송
"""
import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.core.deps import get_current_user as _get_current_user
from app.models.ai_session import AIMessage, AISession
from app.models.user import User
from app.services.ai_service import ai_service
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── 의존성: 인증된 사용자 추출 ──────────────────────────────────────────────
# NOTE: 실제 운영에서는 JWT 미들웨어에서 주입. 여기서는 헤더 기반 스텁 제공.
# backend-developer가 구현하는 공통 auth dependency와 연동 예정.


async def get_current_user_id(
    current_user: Annotated["User", Depends(_get_current_user)],
) -> uuid.UUID:
    """현재 인증된 사용자 ID 반환 — JWT 쿠키 기반 인증."""
    return current_user.id


CurrentUserId = Annotated[uuid.UUID, Depends(get_current_user_id)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

# ─── 요청/응답 스키마 ────────────────────────────────────────────────────────


class CreateSessionRequest(BaseModel):
    title: str | None = Field(None, max_length=200)


class SessionResponse(BaseModel):
    sessionId: str
    title: str | None
    createdAt: str
    lastMessageAt: str | None


class MessageRequest(BaseModel):
    # api-contracts AIQuerySchema와 일치: min=1, max=2000
    content: str = Field(..., min_length=1, max_length=2000)


class DocumentSearchResult(BaseModel):
    documentId: str
    title: str
    excerpt: str
    url: str | None
    score: float
    source: str


# ─── SSE 이벤트 직렬화 헬퍼 ─────────────────────────────────────────────────


def _sse_chunk(data: dict[str, Any]) -> str:
    """SSE data 이벤트 포맷 직렬화"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _sse_error(message: str) -> str:
    """SSE 에러 이벤트 — 반드시 done:true 포함"""
    return _sse_chunk({"chunk": "", "done": True, "error": message})


# ─── 엔드포인트 ──────────────────────────────────────────────────────────────


@router.get("/sessions", summary="AI 세션 목록 조회")
async def list_sessions(
    user_id: CurrentUserId,
    db: DbSession,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[SessionResponse]:
    """사용자의 AI 대화 세션 목록을 최신순으로 반환"""
    result = await db.execute(
        select(AISession)
        .where(AISession.user_id == user_id)
        .order_by(AISession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()
    return [
        SessionResponse(
            sessionId=str(s.id),
            title=s.title,
            createdAt=s.created_at.isoformat(),
            lastMessageAt=s.last_message_at.isoformat() if s.last_message_at else None,
        )
        for s in sessions
    ]


@router.post("/sessions", status_code=status.HTTP_201_CREATED, summary="새 AI 세션 생성")
async def create_session(
    user_id: CurrentUserId,
    db: DbSession,
    body: CreateSessionRequest | None = None,
) -> SessionResponse:
    """새 AI 대화 세션 생성 → { sessionId } 반환"""
    session = AISession(
        id=uuid.uuid4(),
        user_id=user_id,
        title=body.title if body else None,
        created_at=datetime.now(UTC),
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    logger.info("새 AI 세션 생성: session_id=%s, user_id=%s", session.id, user_id)
    return SessionResponse(
        sessionId=str(session.id),
        title=session.title,
        createdAt=session.created_at.isoformat(),
        lastMessageAt=None,
    )


@router.post(
    "/sessions/{session_id}/messages",
    summary="AI 질의 전송 (SSE 스트리밍)",
    response_class=StreamingResponse,
)
async def send_message(
    session_id: uuid.UUID,
    body: MessageRequest,
    user_id: CurrentUserId,
    db: DbSession,
) -> StreamingResponse:
    """AI 질의를 SSE 스트리밍으로 응답

    플로우 (SIPOC):
      1. 세션 소유권 검증
      2. 사용자 메시지 DB 저장
      3. RAG 검색 (pgvector 유사도)
      4. 대화 히스토리 조회 (최근 10개)
      5. Gemini 스트리밍 응답 생성
      6. 어시스턴트 메시지 DB 저장 + sources[] 반환
    """
    # 1. 세션 소유권 검증
    result = await db.execute(
        select(AISession).where(
            AISession.id == session_id, AISession.user_id == user_id
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="세션을 찾을 수 없습니다.",
        )

    # 2. 사용자 메시지 저장
    user_msg = AIMessage(
        id=uuid.uuid4(),
        session_id=session_id,
        role="user",
        content=body.content,
        sources=[],
    )
    db.add(user_msg)
    await db.flush()

    # 세션 last_message_at 갱신
    await db.execute(
        update(AISession)
        .where(AISession.id == session_id)
        .values(last_message_at=datetime.now(UTC))
    )
    await db.commit()

    async def _stream_generator() -> AsyncGenerator[str, None]:
        """SSE 스트리밍 제너레이터 — 에러 시 반드시 done:true + error 전송"""
        assistant_message_id = uuid.uuid4()
        full_content_parts: list[str] = []
        sources: list[dict[str, Any]] = []

        try:
            # 3. RAG 검색 (읽기 전용 — 별도 세션 불필요)
            sources_raw = await rag_service.search_similar(query=body.content)
            sources = [
                {
                    "documentId": s["documentId"],
                    "title": s["title"],
                    "excerpt": s["excerpt"],
                    "url": s.get("url"),
                }
                for s in sources_raw
            ]

            # 4. 대화 히스토리 조회 (새 세션으로 db 연결 필요시 별도 처리)
            history = await ai_service.get_session_context(session_id, db)

            # 5. 스트리밍 응답 청크 전송
            async for chunk_text in ai_service.generate_stream(
                session_id=session_id,
                user_message=body.content,
                context_docs=sources_raw,
                history=history,
            ):
                full_content_parts.append(chunk_text)
                yield _sse_chunk({"chunk": chunk_text, "done": False})

            # 6. 어시스턴트 메시지 저장 — 스트리밍 완료 후 독립 세션으로 저장
            full_content = "".join(full_content_parts)
            assistant_msg = AIMessage(
                id=assistant_message_id,
                session_id=session_id,
                role="assistant",
                content=full_content,
                sources=sources,
            )
            async with AsyncSessionLocal() as save_session:
                async with save_session.begin():
                    save_session.add(assistant_msg)

            # 완료 이벤트 — sources[] 포함
            yield _sse_chunk(
                {
                    "chunk": "",
                    "done": True,
                    "sources": sources,
                    "messageId": str(assistant_message_id),
                }
            )

        except Exception as exc:
            logger.error(
                "SSE 스트리밍 오류 (session_id=%s): %s", session_id, exc, exc_info=True
            )
            # 에러 시 반드시 done:true + error 전송 (Anti-Pattern 방지)
            yield _sse_error("응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")

    return StreamingResponse(
        _stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Nginx 버퍼링 비활성화
            "Connection": "keep-alive",
        },
    )


@router.get("/documents/search", summary="RAG 문서 검색")
async def search_documents(
    user_id: CurrentUserId,
    db: DbSession,
    q: str = Query(..., min_length=1, max_length=500, description="검색 쿼리"),
    top_k: int = Query(5, ge=1, le=20),
) -> list[DocumentSearchResult]:
    """사내 문서 유사도 검색 — AI가 내부적으로 사용하는 엔드포인트

    플로우 3: AI가 RAG 검색 → GET /api/documents/search?q=... 자동 호출
    """
    results = await rag_service.search_similar(query=q, top_k=top_k, db=db)
    return [
        DocumentSearchResult(
            documentId=r["documentId"],
            title=r["title"],
            excerpt=r["excerpt"],
            url=r.get("url"),
            score=r["score"],
            source=r["source"],
        )
        for r in results
    ]
