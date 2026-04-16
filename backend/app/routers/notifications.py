"""알림 라우터"""
import logging
import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """알림 목록 (현재 사용자)."""
    count_result = await db.execute(
        select(func.count()).select_from(Notification).where(Notification.user_id == current_user.id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    notifications = result.scalars().all()

    return {
        "success": True,
        "data": [_to_response(n) for n in notifications],
        "meta": {"total": total, "page": page, "limit": limit, "pages": math.ceil(total / limit) if total else 1},
    }


@router.put("/{notification_id}/read", response_model=dict)
async def mark_notification_read(
    notification_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """알림 읽음 처리."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,  # IDOR 방지
        )
    )
    notif = result.scalar_one_or_none()
    if notif is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="알림을 찾을 수 없습니다.")

    notif.is_read = True
    await db.flush()
    return {"success": True, "data": _to_response(notif)}


# ── helpers ──────────────────────────────────────────────────────────────────

def _to_response(notif: Notification) -> dict:
    return {
        "id": str(notif.id),
        "user_id": str(notif.user_id),
        "type": notif.type,
        "title": notif.title,
        "body": notif.body,
        "is_read": notif.is_read,
        "related_id": str(notif.related_id) if notif.related_id else None,
        "related_type": notif.related_type,
        "created_at": notif.created_at.isoformat(),
    }
