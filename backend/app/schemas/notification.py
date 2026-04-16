"""Notification Pydantic v2 스키마"""
import uuid
from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    body: str
    is_read: bool
    related_id: uuid.UUID | None
    related_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    success: bool = True
    data: list[NotificationResponse]
    meta: dict
