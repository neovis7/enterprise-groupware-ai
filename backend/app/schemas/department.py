"""Department Pydantic v2 스키마"""
import uuid

from pydantic import BaseModel


class DeptCreate(BaseModel):
    name: str
    parent_id: uuid.UUID | None = None
    manager_id: uuid.UUID | None = None


class DeptUpdate(BaseModel):
    name: str | None = None
    parent_id: uuid.UUID | None = None
    manager_id: uuid.UUID | None = None


class DeptResponse(BaseModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    manager_id: uuid.UUID | None
    member_count: int = 0
    created_at: str
    children: list["DeptResponse"] = []

    model_config = {"from_attributes": True}


DeptResponse.model_rebuild()
