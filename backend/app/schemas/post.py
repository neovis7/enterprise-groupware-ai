"""Post Pydantic v2 스키마"""
import uuid
from datetime import datetime

from pydantic import BaseModel


class AttachmentItem(BaseModel):
    name: str
    url: str


class PostCreate(BaseModel):
    title: str
    content: str
    type: str = "general"
    is_pinned: bool = False
    target_departments: list[uuid.UUID] = []
    attachments: list[AttachmentItem] = []


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    type: str | None = None
    is_pinned: bool | None = None
    target_departments: list[uuid.UUID] | None = None
    attachments: list[AttachmentItem] | None = None


class PostResponse(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    type: str
    is_pinned: bool
    author_id: uuid.UUID
    target_departments: list[uuid.UUID] = []
    attachments: list[AttachmentItem] = []
    is_read: bool = False
    view_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PostListResponse(BaseModel):
    success: bool = True
    data: list[PostResponse]
    meta: dict
