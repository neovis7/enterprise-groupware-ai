"""Post, PostDepartment, PostRead 모델"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("notice", "general", name="post_type"),
        nullable=False,
        default="general",
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(
        Enum("draft", "published", "archived", name="post_status"),
        nullable=False,
        default="published",
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
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
    target_departments: Mapped[list["PostDepartment"]] = relationship(
        "PostDepartment", back_populates="post", cascade="all, delete-orphan"
    )
    reads: Mapped[list["PostRead"]] = relationship(
        "PostRead", back_populates="post", cascade="all, delete-orphan"
    )


class PostDepartment(Base):
    __tablename__ = "post_departments"

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True
    )

    post: Mapped["Post"] = relationship("Post", back_populates="target_departments")
    department: Mapped["Department"] = relationship("Department")


class PostRead(Base):
    __tablename__ = "post_reads"

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    post: Mapped["Post"] = relationship("Post", back_populates="reads")
    user: Mapped["User"] = relationship("User")
