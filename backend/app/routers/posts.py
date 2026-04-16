"""공지사항/게시글 라우터"""
import logging
import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_manager_or_admin, get_current_user
from app.models.post import Post, PostDepartment, PostRead
from app.models.user import User
from app.schemas.post import PostCreate, PostResponse, PostUpdate
from app.services.notification_service import send_post_published

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_posts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    type_filter: str | None = Query(default=None, alias="type"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """공지/게시글 목록."""
    query = select(Post).options(
        selectinload(Post.target_departments),
        selectinload(Post.reads),
    ).where(Post.status == "published")

    if type_filter:
        query = query.where(Post.type == type_filter)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        query.order_by(Post.is_pinned.desc(), Post.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    posts = result.scalars().all()

    return {
        "success": True,
        "data": [_to_response(p, current_user) for p in posts],
        "meta": {"total": total, "page": page, "limit": limit, "pages": math.ceil(total / limit) if total else 1},
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_post(
    body: PostCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_manager_or_admin)],
) -> dict:
    """공지 생성 (admin/manager)."""
    post = Post(
        title=body.title,
        content=body.content,
        type=body.type,
        is_pinned=body.is_pinned,
        status="published",
        author_id=current_user.id,
    )
    db.add(post)
    await db.flush()

    # 대상 부서 연결
    if body.target_departments:
        for dept_id in body.target_departments:
            db.add(PostDepartment(post_id=post.id, department_id=dept_id))
        await db.flush()

    # 공지 알림 — 대상 부서 사용자 조회
    from app.models.user import User as UserModel
    if body.target_departments:
        user_result = await db.execute(
            select(UserModel.id).where(
                UserModel.department_id.in_(body.target_departments),
                UserModel.is_active == True,
            )
        )
        target_user_ids = [row[0] for row in user_result.all()]
    else:
        # 전체 공지
        user_result = await db.execute(
            select(UserModel.id).where(UserModel.is_active == True)
        )
        target_user_ids = [row[0] for row in user_result.all()]

    if target_user_ids:
        await send_post_published(db, post.id, post.title, target_user_ids)

    result = await db.execute(
        select(Post)
        .options(selectinload(Post.target_departments), selectinload(Post.reads))
        .where(Post.id == post.id)
    )
    created = result.scalar_one()
    return {"success": True, "data": _to_response(created, current_user)}


@router.get("/{post_id}", response_model=dict)
async def get_post(
    post_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """공지 상세 조회."""
    post = await _get_post_or_404(db, post_id)
    # 조회수 증가
    post.view_count = post.view_count + 1
    await db.flush()
    return {"success": True, "data": _to_response(post, current_user)}


@router.put("/{post_id}", response_model=dict)
async def update_post(
    post_id: str,
    body: PostUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_manager_or_admin)],
) -> dict:
    """공지 수정 (admin/manager)."""
    post = await _get_post_or_404(db, post_id)
    update_data = body.model_dump(exclude_unset=True)

    target_departments = update_data.pop("target_departments", None)
    for field, value in update_data.items():
        setattr(post, field, value)

    if target_departments is not None:
        # 기존 부서 연결 삭제 후 재등록
        existing = await db.execute(select(PostDepartment).where(PostDepartment.post_id == post.id))
        for pd in existing.scalars().all():
            await db.delete(pd)
        for dept_id in target_departments:
            db.add(PostDepartment(post_id=post.id, department_id=dept_id))

    await db.flush()
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.target_departments), selectinload(Post.reads))
        .where(Post.id == post.id)
    )
    updated = result.scalar_one()
    return {"success": True, "data": _to_response(updated, current_user)}


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_manager_or_admin)],
) -> None:
    """공지 삭제 (admin)."""
    post = await _get_post_or_404(db, post_id)
    post.status = "archived"
    await db.flush()


@router.put("/{post_id}/read", response_model=dict)
async def mark_post_read(
    post_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """읽음 처리."""
    post = await _get_post_or_404(db, post_id)

    existing = await db.execute(
        select(PostRead).where(
            PostRead.post_id == post.id,
            PostRead.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(PostRead(post_id=post.id, user_id=current_user.id))
        await db.flush()

    return {"success": True, "data": {"post_id": post_id, "is_read": True}}


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_post_or_404(db: AsyncSession, post_id: str) -> Post:
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.target_departments), selectinload(Post.reads))
        .where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시글을 찾을 수 없습니다.")
    return post


def _to_response(post: Post, current_user: User) -> dict:
    is_read = any(str(r.user_id) == str(current_user.id) for r in post.reads)
    return {
        "id": str(post.id),
        "title": post.title,
        "content": post.content,
        "type": post.type,
        "is_pinned": post.is_pinned,
        "author_id": str(post.author_id),
        "target_departments": [str(pd.department_id) for pd in post.target_departments],
        "attachments": [],
        "is_read": is_read,
        "view_count": post.view_count,
        "created_at": post.created_at.isoformat(),
    }
