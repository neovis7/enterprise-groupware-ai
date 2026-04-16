"""RAG (Retrieval Augmented Generation) 서비스 — pgvector 기반 사내 문서 검색

OWASP 준수:
  - 쿼리 파라미터화 (SQL 인젝션 방지)
  - 검색 결과 반드시 sources[] 배열로 반환 (출처 투명성)
  - 사용자 입력 길이 제한 적용
"""
import logging
import uuid
from typing import Any

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.ai_session import DocumentChunk, EMBEDDING_DIM

logger = logging.getLogger(__name__)

# 유사도 검색 기본 상위 k
_DEFAULT_TOP_K = 5

# 유사도 임계값 — 이 값 미만의 결과는 낮은 관련성으로 필터링
_SIMILARITY_THRESHOLD = 0.3

# 청크 최대 길이 (토큰 절약)
_MAX_CHUNK_LENGTH = 1000


class RAGService:
    """pgvector 기반 RAG 파이프라인 서비스"""

    def __init__(self) -> None:
        # Gemini Embeddings API — API 키는 settings에서만 로드
        self._embeddings = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=settings.GEMINI_API_KEY,
        )

    async def embed_document(
        self,
        content: str,
        doc_id: str,
        metadata: dict[str, Any],
        source: str,
        db: AsyncSession,
    ) -> None:
        """문서 청크를 벡터화하여 pgvector에 저장

        Args:
            content: 청크 텍스트
            doc_id: 원본 문서 식별자
            metadata: 제목, URL 등 메타데이터
            source: 문서 유형 ("approval", "post", "manual" 등)
            db: 비동기 DB 세션
        """
        truncated = content[:_MAX_CHUNK_LENGTH]
        try:
            vector = await self._embeddings.aembed_query(truncated)
        except Exception as exc:
            logger.error("임베딩 생성 실패 (doc_id=%s): %s", doc_id, exc, exc_info=True)
            raise

        chunk = DocumentChunk(
            id=uuid.uuid4(),
            doc_id=doc_id,
            content=truncated,
            embedding=vector,
            source=source,
            metadata=metadata,
        )
        db.add(chunk)
        await db.flush()
        logger.info("문서 청크 인덱싱 완료: doc_id=%s, source=%s", doc_id, source)

    async def search_similar(
        self,
        query: str,
        top_k: int = _DEFAULT_TOP_K,
        db: AsyncSession | None = None,
    ) -> list[dict[str, Any]]:
        """쿼리와 유사한 사내 문서 청크 검색

        Args:
            query: 검색 쿼리 텍스트
            top_k: 반환할 최대 결과 수
            db: 비동기 DB 세션 (None이면 내부 세션 생성)

        Returns:
            sources[]: [{ documentId, title, excerpt, url, score, source, metadata }]
        """
        try:
            query_vector = await self._embeddings.aembed_query(query)
        except Exception as exc:
            logger.error("쿼리 임베딩 실패: %s", exc, exc_info=True)
            return []

        async def _execute(session: AsyncSession) -> list[dict[str, Any]]:
            # pgvector cosine 유사도 검색 — 파라미터화 쿼리로 SQL 인젝션 방지
            # 1 - cosine_distance = cosine_similarity
            stmt = (
                select(
                    DocumentChunk,
                    (1 - DocumentChunk.embedding.cosine_distance(query_vector)).label(
                        "score"
                    ),
                )
                .where(
                    (1 - DocumentChunk.embedding.cosine_distance(query_vector))
                    >= _SIMILARITY_THRESHOLD
                )
                .order_by(
                    DocumentChunk.embedding.cosine_distance(query_vector)
                )
                .limit(top_k)
            )
            result = await session.execute(stmt)
            rows = result.all()

            sources: list[dict[str, Any]] = []
            for chunk, score in rows:
                meta = chunk.chunk_metadata or {}
                sources.append(
                    {
                        "documentId": str(chunk.id),
                        "title": meta.get("title", chunk.source),
                        "excerpt": chunk.content[:300],
                        "url": meta.get("url"),
                        "score": float(score),
                        "source": chunk.source,
                        "content": chunk.content,
                        "metadata": meta,
                    }
                )
            return sources

        if db is not None:
            return await _execute(db)

        async with AsyncSessionLocal() as session:
            return await _execute(session)

    async def build_context(self, docs: list[dict[str, Any]]) -> str:
        """검색된 문서 목록을 LLM 프롬프트용 컨텍스트 문자열로 조합

        Args:
            docs: search_similar() 반환값

        Returns:
            str: 시스템 프롬프트에 주입할 컨텍스트 블록
        """
        if not docs:
            return ""
        lines: list[str] = []
        for i, doc in enumerate(docs, 1):
            title = doc.get("title", "문서")
            content = doc.get("content", doc.get("excerpt", ""))
            lines.append(f"[문서 {i}] {title}\n{content}")
        return "\n\n".join(lines)


# 싱글턴 인스턴스
rag_service = RAGService()
