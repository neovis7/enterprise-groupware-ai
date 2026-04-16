"""프로젝트 라우터"""
import logging
import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.project import Project, ProjectMember, Task
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, TaskCreate, TaskResponse
from app.services.notification_service import send_task_assigned

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """프로젝트 목록."""
    count_result = await db.execute(select(func.count()).select_from(Project))
    total = count_result.scalar_one()

    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tasks))
        .order_by(Project.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    projects = result.scalars().all()
    return {
        "success": True,
        "data": [_to_project_response(p) for p in projects],
        "meta": {"total": total, "page": page, "limit": limit},
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """프로젝트 생성."""
    project = Project(
        name=body.name,
        description=body.description,
        owner_id=current_user.id,
        status="active",
    )
    db.add(project)
    await db.flush()

    # 멤버 등록 (소유자 포함)
    member_ids = list({str(current_user.id)} | {str(uid) for uid in body.member_ids})
    for uid in member_ids:
        db.add(ProjectMember(project_id=project.id, user_id=uid))
    await db.flush()

    result = await db.execute(
        select(Project).options(selectinload(Project.tasks)).where(Project.id == project.id)
    )
    created = result.scalar_one()
    return {"success": True, "data": _to_project_response(created)}


@router.get("/{project_id}", response_model=dict)
async def get_project(
    project_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """프로젝트 상세 + 진행률."""
    project = await _get_project_or_404(db, project_id)
    return {"success": True, "data": _to_project_response(project)}


@router.put("/{project_id}", response_model=dict)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """프로젝트 수정."""
    project = await _get_project_or_404(db, project_id)
    if str(project.owner_id) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="수정 권한이 없습니다.")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    await db.flush()

    result = await db.execute(
        select(Project).options(selectinload(Project.tasks)).where(Project.id == project.id)
    )
    updated = result.scalar_one()
    return {"success": True, "data": _to_project_response(updated)}


@router.get("/{project_id}/tasks", response_model=dict)
async def list_tasks(
    project_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """프로젝트 태스크 목록."""
    result = await db.execute(
        select(Task).where(Task.project_id == project_id).order_by(Task.created_at.desc())
    )
    tasks = result.scalars().all()
    return {"success": True, "data": [_to_task_response(t) for t in tasks]}


@router.post("/{project_id}/tasks", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: str,
    body: TaskCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """태스크 생성."""
    task = Task(
        title=body.title,
        description=body.description,
        project_id=project_id,
        assignee_id=body.assignee_id,
        priority=body.priority,
        due_date=body.due_date,
        status="todo",
    )
    db.add(task)
    await db.flush()

    if body.assignee_id:
        await send_task_assigned(db, task.id, body.title, body.assignee_id)

    return {"success": True, "data": _to_task_response(task)}


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_project_or_404(db: AsyncSession, project_id: str) -> Project:
    result = await db.execute(
        select(Project).options(selectinload(Project.tasks)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")
    return project


def _to_project_response(project: Project) -> dict:
    task_count = len(project.tasks)
    done_count = sum(1 for t in project.tasks if t.status == "done")
    progress = round(done_count / task_count * 100, 1) if task_count > 0 else 0.0
    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "owner_id": str(project.owner_id),
        "status": project.status,
        "task_count": task_count,
        "done_count": done_count,
        "progress": progress,
        "created_at": project.created_at.isoformat(),
    }


def _to_task_response(task: Task) -> dict:
    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description,
        "project_id": str(task.project_id),
        "assignee_id": str(task.assignee_id) if task.assignee_id else None,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "created_at": task.created_at.isoformat(),
    }
