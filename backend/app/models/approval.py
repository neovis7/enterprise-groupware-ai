"""Approval, ApprovalLine, ApprovalHistory 모델"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("general", "expense", "vacation", "business_trip", "purchase", name="approval_type"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        Enum("pending", "approved", "rejected", "cancelled", name="approval_status"),
        nullable=False,
        default="pending",
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])
    approval_lines: Mapped[list["ApprovalLine"]] = relationship(
        "ApprovalLine", back_populates="approval", order_by="ApprovalLine.order", cascade="all, delete-orphan"
    )
    history: Mapped[list["ApprovalHistory"]] = relationship(
        "ApprovalHistory", back_populates="approval", order_by="ApprovalHistory.created_at", cascade="all, delete-orphan"
    )


class ApprovalLine(Base):
    __tablename__ = "approval_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    approval_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("approvals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    approver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(
        Enum("waiting", "approved", "rejected", name="approval_line_action"),
        nullable=False,
        default="waiting",
    )
    comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    approval: Mapped["Approval"] = relationship("Approval", back_populates="approval_lines")
    approver: Mapped["User"] = relationship("User", foreign_keys=[approver_id])


class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    approval_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("approvals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    approval: Mapped["Approval"] = relationship("Approval", back_populates="history")
    actor: Mapped["User"] = relationship("User", foreign_keys=[actor_id])
