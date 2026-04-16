"""Attendance & Leave Pydantic v2 스키마"""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator


class CheckinResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    check_in: datetime

    model_config = {"from_attributes": True}


class CheckoutResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    check_in: datetime | None
    check_out: datetime
    total_hours: float | None

    model_config = {"from_attributes": True}


class AttendanceRecordResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    check_in: datetime | None
    check_out: datetime | None
    total_hours: float | None

    model_config = {"from_attributes": True}


class LeaveCreate(BaseModel):
    type: str
    start_date: date
    end_date: date
    reason: str | None = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ("annual", "sick", "special"):
            raise ValueError("휴가 유형은 annual, sick, special 중 하나여야 합니다.")
        return v

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start and v < start:
            raise ValueError("종료일은 시작일 이후여야 합니다.")
        return v


class LeaveProcess(BaseModel):
    action: str
    comment: str | None = None

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in ("approve", "reject"):
            raise ValueError("action은 approve 또는 reject이어야 합니다.")
        return v


class LeaveResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    start_date: date
    end_date: date
    reason: str | None
    status: str
    approver_id: uuid.UUID | None
    approver_comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
