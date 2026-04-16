"""Schedule Pydantic v2 스키마"""
import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class AttendeeItem(BaseModel):
    user_id: uuid.UUID
    status: str

    model_config = {"from_attributes": True}


class ScheduleCreate(BaseModel):
    title: str
    description: str | None = None
    start_at: datetime
    end_at: datetime
    location: str | None = None
    is_online: bool = False
    attendee_ids: list[uuid.UUID] = []

    @field_validator("end_at")
    @classmethod
    def end_after_start(cls, v: datetime, info) -> datetime:
        start = info.data.get("start_at")
        if start and v <= start:
            raise ValueError("종료 시간은 시작 시간 이후여야 합니다.")
        return v


class ScheduleUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    location: str | None = None
    is_online: bool | None = None
    minutes_content: str | None = None


class ScheduleRespond(BaseModel):
    response: str

    @field_validator("response")
    @classmethod
    def validate_response(cls, v: str) -> str:
        if v not in ("accept", "decline"):
            raise ValueError("response는 accept 또는 decline이어야 합니다.")
        return v


class ScheduleResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    start_at: datetime
    end_at: datetime
    location: str | None
    is_online: bool
    meeting_url: str | None
    organizer_id: uuid.UUID
    attendees: list[AttendeeItem] = []
    created_at: datetime

    model_config = {"from_attributes": True}
