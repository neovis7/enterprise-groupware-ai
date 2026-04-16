"""AISession, AIMessage, DocumentChunk 모델 — DDD 도메인 6: AI Assistant"""
import uuid
from datetime import UTC, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

# pgvector 임베딩 차원 (Gemini text-embedding-004 = 768)
EMBEDDING_DIM = 768


class AISession(Base):
    """AI 어시스턴트 대화 세션 애그리거트"""

    __tablename__ = "ai_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # relationships
    messages: Mapped[list["AIMessage"]] = relationship(
        "AIMessage",
        back_populates="session",
        order_by="AIMessage.created_at",
        cascade="all, delete-orphan",
    )


class AIMessage(Base):
    """AI 대화 메시지 엔티티"""

    __tablename__ = "ai_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        Enum("user", "assistant", name="ai_message_role"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # sources[]: RAG 검색 출처 배열 — [{ documentId, title, excerpt, url }]
    sources: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # relationships
    session: Mapped["AISession"] = relationship("AISession", back_populates="messages")


class DocumentChunk(Base):
    """사내 문서 청크 — pgvector 유사도 검색 대상"""

    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # 원본 문서 식별자 (결재 ID, 공지 ID 등)
    doc_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # 청크 본문
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # pgvector 임베딩 벡터
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(EMBEDDING_DIM), nullable=True
    )
    # 문서 출처 (예: "approval", "post", "manual")
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    # 추가 메타데이터 (제목, URL 등)
    chunk_metadata: Mapped[dict | None] = mapped_column(
        "metadata", JSONB, nullable=True, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    __table_args__ = (
        # IVFFlat 인덱스 — 대규모 벡터 검색 성능 향상
        Index(
            "ix_document_chunks_embedding",
            "embedding",
            postgresql_using="ivfflat",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
