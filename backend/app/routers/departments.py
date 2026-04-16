"""부서 관리 라우터"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_user
from app.models.department import Department
from app.models.user import User
from app.schemas.department import DeptCreate, DeptResponse, DeptUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=list[DeptResponse])
async def list_departments(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> list[DeptResponse]:
    """부서 목록 — 트리 구조 반환."""
    result = await db.execute(select(Department).order_by(Department.name))
    departments = result.scalars().all()
    return _build_tree(departments)


@router.post("/", response_model=DeptResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    body: DeptCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> DeptResponse:
    """부서 생성 (admin 전용)."""
    dept = Department(
        name=body.name,
        parent_id=body.parent_id,
        manager_id=body.manager_id,
    )
    db.add(dept)
    await db.flush()
    member_count = await _count_members(db, dept.id)
    return _to_response(dept, member_count)


@router.put("/{dept_id}", response_model=DeptResponse)
async def update_department(
    dept_id: str,
    body: DeptUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> DeptResponse:
    """부서 수정 (admin 전용)."""
    dept = await _get_dept_or_404(db, dept_id)
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dept, field, value)
    await db.flush()
    member_count = await _count_members(db, dept.id)
    return _to_response(dept, member_count)


@router.delete("/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    dept_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> None:
    """부서 삭제 (admin 전용)."""
    dept = await _get_dept_or_404(db, dept_id)
    await db.delete(dept)
    await db.flush()


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_dept_or_404(db: AsyncSession, dept_id: str) -> Department:
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="부서를 찾을 수 없습니다.")
    return dept


async def _count_members(db: AsyncSession, dept_id) -> int:
    result = await db.execute(
        select(func.count()).select_from(User).where(User.department_id == dept_id, User.is_active == True)
    )
    return result.scalar_one()


def _to_response(dept: Department, member_count: int = 0) -> DeptResponse:
    return DeptResponse(
        id=dept.id,
        name=dept.name,
        parent_id=dept.parent_id,
        manager_id=dept.manager_id,
        member_count=member_count,
        created_at=dept.created_at.isoformat(),
    )


def _build_tree(departments: list[Department]) -> list[DeptResponse]:
    """flat 목록을 parent_id 기준 트리로 변환."""
    nodes: dict[str, DeptResponse] = {}
    for d in departments:
        nodes[str(d.id)] = DeptResponse(
            id=d.id,
            name=d.name,
            parent_id=d.parent_id,
            manager_id=d.manager_id,
            member_count=0,
            created_at=d.created_at.isoformat(),
        )

    roots: list[DeptResponse] = []
    for d in departments:
        node = nodes[str(d.id)]
        if d.parent_id and str(d.parent_id) in nodes:
            nodes[str(d.parent_id)].children.append(node)
        else:
            roots.append(node)
    return roots
