"""Project & Task Pydantic v2 스키마"""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, field_validator


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    member_ids: list[uuid.UUID] = []


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is not None and v not in ("active", "completed", "archived"):
            raise ValueError("status는 active, completed, archived 중 하나여야 합니다.")
        return v


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    owner_id: uuid.UUID
    status: str
    task_count: int = 0
    done_count: int = 0
    progress: float = 0.0
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    assignee_id: uuid.UUID | None = None
    priority: str = "medium"
    due_date: date | None = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v not in ("low", "medium", "high"):
            raise ValueError("priority는 low, medium, high 중 하나여야 합니다.")
        return v


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_id: uuid.UUID | None = None
    status: str | None = None
    priority: str | None = None
    due_date: date | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is not None and v not in ("todo", "in_progress", "done"):
            raise ValueError("status는 todo, in_progress, done 중 하나여야 합니다.")
        return v


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    project_id: uuid.UUID
    assignee_id: uuid.UUID | None
    status: str
    priority: str
    due_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}
