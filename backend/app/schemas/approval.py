"""Approval Pydantic v2 스키마"""
import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class ApprovalLineItem(BaseModel):
    order: int
    user_id: uuid.UUID
    status: str
    comment: str | None
    processed_at: datetime | None

    model_config = {"from_attributes": True}


class ApprovalHistoryItem(BaseModel):
    actor_id: uuid.UUID
    action: str
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AttachmentItem(BaseModel):
    name: str
    url: str


class ApprovalCreate(BaseModel):
    title: str
    content: str
    type: str
    approver_ids: list[uuid.UUID]
    attachments: list[AttachmentItem] = []

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid = {"general", "expense", "vacation", "business_trip", "purchase"}
        if v not in valid:
            raise ValueError(f"유효하지 않은 결재 유형입니다. 허용값: {valid}")
        return v

    @field_validator("approver_ids")
    @classmethod
    def at_least_one_approver(cls, v: list) -> list:
        if len(v) == 0:
            raise ValueError("결재자를 1명 이상 지정해야 합니다.")
        return v


class ApprovalProcess(BaseModel):
    action: str
    comment: str | None = None

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in ("approve", "reject"):
            raise ValueError("action은 approve 또는 reject이어야 합니다.")
        return v


class ApprovalResponse(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    type: str
    status: str
    author_id: uuid.UUID
    approval_line: list[ApprovalLineItem] = []
    attachments: list[AttachmentItem] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApprovalDetailResponse(ApprovalResponse):
    history: list[ApprovalHistoryItem] = []
