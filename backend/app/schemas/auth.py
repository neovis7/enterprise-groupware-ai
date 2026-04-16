"""인증 관련 Pydantic v2 스키마"""
from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return v


class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department_id: str | None
    avatar_url: str | None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    user: UserInfo


class RefreshRequest(BaseModel):
    pass  # refresh_token은 httpOnly 쿠키에서 읽음


class TokenResponse(BaseModel):
    access_token: str
