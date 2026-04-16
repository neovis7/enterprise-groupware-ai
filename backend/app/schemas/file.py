"""File & Folder Pydantic v2 스키마"""
import uuid
from datetime import datetime

from pydantic import BaseModel


class FolderCreate(BaseModel):
    name: str
    parent_id: uuid.UUID | None = None
    team_id: uuid.UUID | None = None


class FolderResponse(BaseModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    team_id: uuid.UUID | None
    owner_id: uuid.UUID
    created_at: datetime
    children: list["FolderResponse"] = []

    model_config = {"from_attributes": True}


FolderResponse.model_rebuild()


class FileUploadResponse(BaseModel):
    id: uuid.UUID
    name: str
    path: str
    size: int
    mime_type: str | None
    folder_id: uuid.UUID | None
    owner_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class FileListResponse(BaseModel):
    success: bool = True
    data: list[FileUploadResponse]
    meta: dict


class DownloadUrlResponse(BaseModel):
    url: str
    expires_at: str
