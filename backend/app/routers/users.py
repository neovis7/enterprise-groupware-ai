"""사용자 관리 라우터 (admin 전용 + self)"""
import logging
import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_user
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserListResponse, UserResponse, UserUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=UserListResponse)
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> UserListResponse:
    """사용자 목록 (admin 전용)."""
    offset = (page - 1) * limit
    total_result = await db.execute(select(func.count()).select_from(User))
    total = total_result.scalar_one()

    result = await db.execute(select(User).offset(offset).limit(limit).order_by(User.created_at.desc()))
    users = result.scalars().all()

    return UserListResponse(
        success=True,
        data=[_to_response(u) for u in users],
        meta={"total": total, "page": page, "limit": limit, "pages": math.ceil(total / limit)},
    )


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> UserResponse:
    """사용자 생성 (admin 전용)."""
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다.")

    user = User(
        name=body.name,
        email=body.email,
        role=body.role,
        department_id=body.department_id,
        position=body.position,
        password_hash=get_password_hash(body.password),
    )
    db.add(user)
    await db.flush()
    return _to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """사용자 상세 조회 (admin 또는 본인)."""
    # IDOR 방지: 본인 또는 admin만 접근 가능
    if current_user.role != "admin" and str(current_user.id) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")

    user = await _get_user_or_404(db, user_id)
    return _to_response(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """사용자 수정 (admin 또는 본인). role 변경은 admin만."""
    if current_user.role != "admin" and str(current_user.id) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")
    if body.role is not None and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="역할 변경은 관리자만 가능합니다.")

    user = await _get_user_or_404(db, user_id)
    update_data = body.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    return _to_response(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_admin)],
) -> None:
    """사용자 삭제 (admin 전용) — soft delete."""
    user = await _get_user_or_404(db, user_id)
    user.is_active = False
    await db.flush()


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_user_or_404(db: AsyncSession, user_id: str) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    return user


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department_id=user.department_id,
        position=user.position,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )
