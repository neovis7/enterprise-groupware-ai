"""인증 라우터 — 로그인/로그아웃/토큰 갱신/현재 사용자"""
import logging
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_action
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_token,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, TokenResponse, UserInfo
from app.schemas.user import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

_COOKIE_SECURE = not settings.DEBUG
_COOKIE_SAMESITE = "lax"


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LoginResponse:
    """이메일/비밀번호 로그인 — accessToken + refreshToken httpOnly 쿠키 설정."""
    ip = request.client.host if request.client else "unknown"

    result = await db.execute(select(User).where(User.email == body.email, User.is_active == True))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        await log_action(
            db=db,
            action="login",
            resource="auth",
            result="fail",
            ip_address=ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    token_data = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    _set_auth_cookies(response, access_token, refresh_token)

    await log_action(
        db=db,
        action="login",
        resource="auth",
        result="success",
        user_id=str(user.id),
        ip_address=ip,
    )

    user_info = UserInfo(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        department_id=str(user.department_id) if user.department_id else None,
        avatar_url=user.avatar_url,
    )
    return LoginResponse(access_token=access_token, user=user_info)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> TokenResponse:
    """refreshToken 쿠키 검증 → 새 accessToken 발급."""
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="리프레시 토큰이 없습니다.")

    payload = verify_token(refresh_token, token_type="refresh")
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="리프레시 토큰이 유효하지 않습니다.")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="토큰 페이로드가 손상되었습니다.")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")

    token_data = {"sub": str(user.id), "role": user.role}
    new_access_token = create_access_token(token_data)

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return TokenResponse(access_token=new_access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """쿠키 삭제 → 로그아웃."""
    ip = request.client.host if request.client else "unknown"
    _clear_auth_cookies(response)
    await log_action(
        db=db,
        action="logout",
        resource="auth",
        result="success",
        user_id=str(current_user.id),
        ip_address=ip,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """현재 로그인 사용자 정보 반환."""
    return current_user
