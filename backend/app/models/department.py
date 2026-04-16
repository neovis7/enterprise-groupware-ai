"""Department 모델"""
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # relationships
    members: Mapped[list["User"]] = relationship(
        "User", foreign_keys="User.department_id", back_populates="department"
    )
    children: Mapped[list["Department"]] = relationship(
        "Department", foreign_keys=[parent_id], back_populates="parent"
    )
    parent: Mapped["Department | None"] = relationship(
        "Department", foreign_keys=[parent_id], back_populates="children", remote_side="Department.id"
    )
    manager: Mapped["User | None"] = relationship("User", foreign_keys=[manager_id])
