"""User Pydantic v2 스키마"""
import uuid

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str = "employee"
    department_id: uuid.UUID | None = None
    position: str | None = None
    password: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("admin", "manager", "employee"):
            raise ValueError("유효하지 않은 역할입니다.")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return v


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    department_id: uuid.UUID | None = None
    position: str | None = None
    avatar_url: str | None = None
    is_active: bool | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is not None and v not in ("admin", "manager", "employee"):
            raise ValueError("유효하지 않은 역할입니다.")
        return v


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    department_id: uuid.UUID | None
    position: str | None
    avatar_url: str | None
    is_active: bool
    created_at: str

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    success: bool = True
    data: list[UserResponse]
    meta: dict
