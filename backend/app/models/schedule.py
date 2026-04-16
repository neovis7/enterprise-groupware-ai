"""Schedule, ScheduleAttendee 모델"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    meeting_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    organizer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    minutes_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    organizer: Mapped["User"] = relationship("User", foreign_keys=[organizer_id])
    attendees: Mapped[list["ScheduleAttendee"]] = relationship(
        "ScheduleAttendee", back_populates="schedule", cascade="all, delete-orphan"
    )


class ScheduleAttendee(Base):
    __tablename__ = "schedule_attendees"

    schedule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("schedules.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    response: Mapped[str] = mapped_column(
        Enum("invited", "accepted", "declined", name="attendee_response"),
        nullable=False,
        default="invited",
    )

    schedule: Mapped["Schedule"] = relationship("Schedule", back_populates="attendees")
    user: Mapped["User"] = relationship("User")
