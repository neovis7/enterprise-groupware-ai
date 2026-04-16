"""사내 문서 인덱싱 서비스 — 결재문서/공지사항을 RAG 인덱스에 추가/삭제

LangChain 텍스트 청킹 (512 토큰) → Gemini Embeddings → pgvector 저장
"""
import logging
import uuid
from typing import Any

from langchain.text_splitter import RecursiveCharacterTextSplitter
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_session import DocumentChunk
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

# 청크 크기 (토큰 기준 약 512 — 문자 수로 근사)
_CHUNK_SIZE = 1024
_CHUNK_OVERLAP = 128

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=_CHUNK_SIZE,
    chunk_overlap=_CHUNK_OVERLAP,
    separators=["\n\n", "\n", "。", ".", " ", ""],
)


async def _index_chunks(
    doc_id: str,
    full_text: str,
    source: str,
    base_metadata: dict[str, Any],
    db: AsyncSession,
) -> None:
    """텍스트를 청크 분할 후 pgvector에 저장 (내부 공통 로직)"""
    chunks = _splitter.split_text(full_text)
    if not chunks:
        logger.warning("인덱싱 대상 텍스트가 없습니다: doc_id=%s", doc_id)
        return

    # 기존 청크 삭제 (재인덱싱 지원)
    await db.execute(
        delete(DocumentChunk).where(DocumentChunk.doc_id == doc_id)
    )

    for i, chunk_text in enumerate(chunks):
        chunk_metadata = {**base_metadata, "chunk_index": i, "total_chunks": len(chunks)}
        await rag_service.embed_document(
            content=chunk_text,
            doc_id=doc_id,
            metadata=chunk_metadata,
            source=source,
            db=db,
        )

    logger.info(
        "문서 인덱싱 완료: doc_id=%s, source=%s, chunks=%d",
        doc_id,
        source,
        len(chunks),
    )


async def index_approval_document(
    approval_id: str,
    title: str,
    content: str,
    db: AsyncSession,
    approval_type: str = "general",
    author_name: str | None = None,
) -> None:
    """결재 문서를 RAG 인덱스에 추가

    Args:
        approval_id: 결재 UUID
        title: 결재 제목
        content: 결재 본문
        db: 비동기 DB 세션
        approval_type: 결재 유형 (general/expense/vacation/business_trip)
        author_name: 기안자 이름 (PII 주의 — 이름만 포함, 이메일/전화 제외)
    """
    full_text = f"제목: {title}\n유형: {approval_type}\n내용:\n{content}"
    metadata: dict[str, Any] = {
        "title": title,
        "url": None,
        "approval_type": approval_type,
        "doc_type": "approval",
    }
    if author_name:
        metadata["author_name"] = author_name

    await _index_chunks(
        doc_id=f"approval:{approval_id}",
        full_text=full_text,
        source="approval",
        base_metadata=metadata,
        db=db,
    )


async def index_post(
    post_id: str,
    title: str,
    content: str,
    db: AsyncSession,
    post_type: str = "notice",
    author_name: str | None = None,
) -> None:
    """공지사항/게시물을 RAG 인덱스에 추가

    Args:
        post_id: 게시물 UUID
        title: 게시물 제목
        content: 게시물 본문
        db: 비동기 DB 세션
        post_type: 게시물 유형 (notice/general)
        author_name: 작성자 이름 (PII 주의 — 이름만, 이메일 제외)
    """
    full_text = f"제목: {title}\n유형: {post_type}\n내용:\n{content}"
    metadata: dict[str, Any] = {
        "title": title,
        "url": None,
        "post_type": post_type,
        "doc_type": "post",
    }
    if author_name:
        metadata["author_name"] = author_name

    await _index_chunks(
        doc_id=f"post:{post_id}",
        full_text=full_text,
        source="post",
        base_metadata=metadata,
        db=db,
    )


async def delete_from_index(doc_id: str, db: AsyncSession) -> None:
    """인덱스에서 문서 청크 삭제

    Args:
        doc_id: "approval:{id}" 또는 "post:{id}" 형식
        db: 비동기 DB 세션
    """
    result = await db.execute(
        delete(DocumentChunk).where(DocumentChunk.doc_id == doc_id)
    )
    deleted_count = result.rowcount
    logger.info("인덱스 삭제 완료: doc_id=%s, 삭제된 청크=%d", doc_id, deleted_count)
