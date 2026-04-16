"""태스크 라우터 — 상태 변경"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.project import Task
from app.models.user import User
from app.schemas.project import TaskUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.put("/{task_id}", response_model=dict)
async def update_task(
    task_id: str,
    body: TaskUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """태스크 수정 (상태 변경 포함)."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="태스크를 찾을 수 없습니다.")

    # 담당자 또는 admin만 수정 가능
    if (
        str(task.assignee_id) != str(current_user.id)
        and current_user.role not in ("admin", "manager")
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="수정 권한이 없습니다.")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    await db.flush()

    return {
        "success": True,
        "data": {
            "id": str(task.id),
            "title": task.title,
            "description": task.description,
            "project_id": str(task.project_id),
            "assignee_id": str(task.assignee_id) if task.assignee_id else None,
            "status": task.status,
            "priority": task.priority,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "created_at": task.created_at.isoformat(),
        },
    }
