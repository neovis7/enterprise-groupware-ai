"""휴가 신청 라우터"""
import logging
import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_manager_or_admin, get_current_user
from app.models.attendance import LeaveRequest
from app.models.user import User
from app.schemas.attendance import LeaveCreate, LeaveProcess
from app.services.notification_service import send_leave_processed, send_leave_request

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_leaves(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """휴가 목록 (본인)."""
    count_result = await db.execute(
        select(func.count()).select_from(LeaveRequest).where(LeaveRequest.user_id == current_user.id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.user_id == current_user.id)
        .order_by(LeaveRequest.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    leaves = result.scalars().all()
    return {
        "success": True,
        "data": [_to_response(lv) for lv in leaves],
        "meta": {"total": total, "page": page, "limit": limit},
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_leave(
    body: LeaveCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """휴가 신청."""
    leave = LeaveRequest(
        user_id=current_user.id,
        type=body.type,
        start_date=body.start_date,
        end_date=body.end_date,
        reason=body.reason,
        status="pending",
    )
    db.add(leave)
    await db.flush()

    # 부서 매니저에게 알림 (매니저가 없으면 admin에게)
    approver_id = await _find_approver(db, current_user)
    if approver_id:
        leave.approver_id = approver_id
        await db.flush()
        await send_leave_request(db, leave.id, current_user.name, approver_id)

    return {"success": True, "data": _to_response(leave)}


@router.put("/{leave_id}/process", response_model=dict)
async def process_leave(
    leave_id: str,
    body: LeaveProcess,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_manager_or_admin)],
) -> dict:
    """휴가 승인/반려 (admin/manager)."""
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = result.scalar_one_or_none()
    if leave is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="휴가 신청을 찾을 수 없습니다.")
    if leave.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 처리된 휴가 신청입니다.")

    leave.status = "approved" if body.action == "approve" else "rejected"
    leave.approver_id = current_user.id
    leave.approver_comment = body.comment
    await db.flush()

    await send_leave_processed(db, leave.id, leave.user_id, body.action)

    return {"success": True, "data": _to_response(leave)}


# ── helpers ──────────────────────────────────────────────────────────────────

async def _find_approver(db: AsyncSession, user: User) -> str | None:
    """부서 매니저 또는 첫 번째 admin을 반환한다."""
    from app.models.department import Department
    if user.department_id:
        dept_result = await db.execute(
            select(Department).where(Department.id == user.department_id)
        )
        dept = dept_result.scalar_one_or_none()
        if dept and dept.manager_id:
            return dept.manager_id

    # 첫 번째 admin
    admin_result = await db.execute(
        select(User.id).where(User.role == "admin", User.is_active == True).limit(1)
    )
    row = admin_result.first()
    return row[0] if row else None


def _to_response(leave: LeaveRequest) -> dict:
    return {
        "id": str(leave.id),
        "user_id": str(leave.user_id),
        "type": leave.type,
        "start_date": leave.start_date.isoformat(),
        "end_date": leave.end_date.isoformat(),
        "reason": leave.reason,
        "status": leave.status,
        "approver_id": str(leave.approver_id) if leave.approver_id else None,
        "approver_comment": leave.approver_comment,
        "created_at": leave.created_at.isoformat(),
    }
