"""Gemini API 기반 AI 어시스턴트 서비스

SIPOC:
  Supplier  : 사용자(질의), RAG 서비스(컨텍스트 문서)
  Input     : session_id, user_message, context_docs
  Process   : 대화 히스토리 조합 → 시스템 프롬프트 + 컨텍스트 주입 → Gemini 스트리밍
  Output    : AsyncGenerator[str] 청크 스트림
  Customer  : SSE 라우터 → 클라이언트 EventSource

OWASP 준수:
  - API 키 서버 전용 (settings에서만 로드)
  - 사용자 입력 새니타이즈 후 user role 메시지로만 주입 (인젝션 방지)
  - PII 직접 포함 금지 — user_id는 익명 식별자로만 사용
"""
import logging
import re
import uuid
from collections.abc import AsyncGenerator
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage as LCAIMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.ai_session import AIMessage, AISession

logger = logging.getLogger(__name__)

# 시스템 프롬프트 — PII 미포함, 역할 및 행동 정의
_SYSTEM_PROMPT = """당신은 기업 내부 AI 어시스턴트입니다.
사내 규정, 결재 절차, 공지사항, 업무 관련 질문에 답변합니다.
제공된 사내 문서 컨텍스트를 우선 참고하고, 없는 경우 일반 지식으로 답변합니다.
답변은 한국어로 작성하며, 간결하고 정확하게 답변합니다.
추측성 정보는 명확히 구분하여 전달합니다."""

# 대화 히스토리 최대 포함 건수 (최근 N개 메시지)
_MAX_HISTORY_MESSAGES = 10

# 사용자 입력 허용 최대 길이 (api-contracts AIQuerySchema와 일치)
_MAX_INPUT_LENGTH = 2000

# 프롬프트 인젝션 패턴 — 시스템 지시 덮어쓰기 시도 차단
_INJECTION_PATTERNS = [
    r"(?i)ignore\s+(previous|all|above)\s+instructions?",
    r"(?i)forget\s+(everything|all|previous)",
    r"(?i)you\s+are\s+now\s+a",
    r"(?i)system\s*:\s*",
    r"(?i)###\s*system",
    r"(?i)<\s*system\s*>",
]
_COMPILED_INJECTION = [re.compile(p) for p in _INJECTION_PATTERNS]


def _sanitize_input(content: str) -> str:
    """사용자 입력 새니타이즈 — 프롬프트 인젝션 패턴 제거"""
    sanitized = content[:_MAX_INPUT_LENGTH]
    for pattern in _COMPILED_INJECTION:
        sanitized = pattern.sub("[제거됨]", sanitized)
    return sanitized.strip()


def _build_context_block(context_docs: list[dict[str, Any]]) -> str:
    """RAG 검색 결과를 프롬프트 컨텍스트 블록으로 조합"""
    if not context_docs:
        return ""
    lines = ["[참고 사내 문서]"]
    for i, doc in enumerate(context_docs, 1):
        title = doc.get("title", "문서")
        content = doc.get("content", "")
        lines.append(f"\n--- 문서 {i}: {title} ---\n{content}")
    return "\n".join(lines)


class AIService:
    """Gemini 스트리밍 어시스턴트 서비스 — AIProvider 인터페이스 구현"""

    def __init__(self) -> None:
        # API 키는 반드시 settings에서만 로드 (환경변수 → 앱 시작 실패 방지는 config.py에서 처리)
        self._llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            streaming=True,
            temperature=0.3,
            max_output_tokens=2048,
        )

    async def get_session_context(
        self, session_id: uuid.UUID, db: AsyncSession
    ) -> list[AIMessage]:
        """세션의 최근 대화 히스토리 조회 (최대 _MAX_HISTORY_MESSAGES개)"""
        result = await db.execute(
            select(AIMessage)
            .where(AIMessage.session_id == session_id)
            .order_by(AIMessage.created_at.desc())
            .limit(_MAX_HISTORY_MESSAGES)
        )
        messages = list(reversed(result.scalars().all()))
        return messages

    def _build_lc_messages(
        self,
        history: list[AIMessage],
        user_content: str,
        context_docs: list[dict[str, Any]],
    ) -> list:
        """LangChain 메시지 목록 구성 — 시스템/히스토리/사용자 분리"""
        context_block = _build_context_block(context_docs)
        system_content = _SYSTEM_PROMPT
        if context_block:
            system_content = f"{_SYSTEM_PROMPT}\n\n{context_block}"

        lc_messages: list = [SystemMessage(content=system_content)]

        # 히스토리 메시지 추가 (role 분리)
        for msg in history:
            if msg.role == "user":
                lc_messages.append(HumanMessage(content=msg.content))
            else:
                lc_messages.append(LCAIMessage(content=msg.content))

        # 현재 사용자 메시지 (새니타이즈 완료)
        lc_messages.append(HumanMessage(content=user_content))
        return lc_messages

    async def generate_stream(
        self,
        session_id: uuid.UUID,
        user_message: str,
        context_docs: list[dict[str, Any]],
        history: list[AIMessage],
    ) -> AsyncGenerator[str, None]:
        """Gemini 스트리밍 응답 생성기

        Yields:
            str: 텍스트 청크
        Raises:
            RuntimeError: Gemini API 호출 실패 시 fallback 메시지로 대체
        """
        sanitized = _sanitize_input(user_message)
        lc_messages = self._build_lc_messages(history, sanitized, context_docs)

        try:
            async for chunk in self._llm.astream(lc_messages):
                text = chunk.content
                if text:
                    yield str(text)
        except Exception as exc:
            logger.error("Gemini API 스트리밍 실패: %s", exc, exc_info=True)
            # 에러 시 fallback 메시지 yield — SSE 레이어에서 done:true + error 전송
            yield "[AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.]"
            raise


# 싱글턴 인스턴스 — 앱 전체에서 재사용 (LLM 클라이언트 초기화 비용 절감)
ai_service = AIService()
