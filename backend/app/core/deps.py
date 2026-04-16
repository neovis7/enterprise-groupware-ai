"""FastAPI 의존성 주입"""
import logging
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_token
from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis 연결 풀 (모듈 수준 싱글턴)
_redis_pool: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_pool


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
    access_token: Annotated[str | None, Cookie()] = None,
) -> "UserModel":
    # import here to avoid circular
    from app.models.user import User

    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보가 유효하지 않습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Accept JWT from Authorization: Bearer header or access_token cookie
    token: str | None = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ")
    elif access_token:
        token = access_token

    if not token:
        raise credentials_exc

    payload = verify_token(token, token_type="access")
    if payload is None:
        raise credentials_exc

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exc
    return user


async def get_current_admin(
    current_user: Annotated["UserModel", Depends(get_current_user)],
) -> "UserModel":
    if current_user.role not in ("admin",):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다.",
        )
    return current_user


async def get_current_manager_or_admin(
    current_user: Annotated["UserModel", Depends(get_current_user)],
) -> "UserModel":
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 또는 매니저 권한이 필요합니다.",
        )
    return current_user


# TYPE_CHECKING workaround — forward reference string used above
UserModel = object  # replaced at runtime by actual User model
