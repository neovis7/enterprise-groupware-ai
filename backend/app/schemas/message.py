"""Message Pydantic v2 스키마"""
import uuid
from datetime import datetime

from pydantic import BaseModel


class MessageCreate(BaseModel):
    room_id: uuid.UUID
    content: str
    attachments: list[dict] = []


class MessageResponse(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RoomResponse(BaseModel):
    id: uuid.UUID
    type: str
    name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRoomResponse(BaseModel):
    id: uuid.UUID
    type: str
    name: str | None
    created_at: datetime
    last_message: MessageResponse | None = None

    model_config = {"from_attributes": True}
