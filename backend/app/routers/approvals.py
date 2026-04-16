"""결재 라우터 — 기안/조회/처리"""
import logging
import math
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_action
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.approval import Approval, ApprovalHistory, ApprovalLine
from app.models.user import User
from app.schemas.approval import (
    ApprovalCreate,
    ApprovalDetailResponse,
    ApprovalHistoryItem,
    ApprovalLineItem,
    ApprovalProcess,
    ApprovalResponse,
    AttachmentItem,
)
from app.services.notification_service import send_approval_processed, send_approval_request

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_approvals(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status_filter: str | None = Query(default=None, alias="status"),
    assignee: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """결재 목록 조회.
    - status=mine: 내가 기안한 결재
    - status=pending&assignee=me: 내가 처리해야 할 대기 결재
    """
    query = select(Approval).options(
        selectinload(Approval.approval_lines),
        selectinload(Approval.history),
    )

    if status_filter == "mine":
        query = query.where(Approval.author_id == current_user.id)
    elif status_filter == "pending" and assignee == "me":
        # 내 결재선에 있고 아직 waiting 상태인 결재
        query = query.join(
            ApprovalLine,
            (ApprovalLine.approval_id == Approval.id) &
            (ApprovalLine.approver_id == current_user.id) &
            (ApprovalLine.action == "waiting"),
        ).where(Approval.status == "pending")
    elif status_filter:
        query = query.where(Approval.status == status_filter)
    else:
        # 내가 기안했거나 결재선에 있는 것
        query = query.join(
            ApprovalLine,
            ApprovalLine.approval_id == Approval.id,
            isouter=True,
        ).where(
            or_(
                Approval.author_id == current_user.id,
                ApprovalLine.approver_id == current_user.id,
            )
        ).distinct()

    # count
    from sqlalchemy import func
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.order_by(Approval.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    approvals = result.scalars().all()

    return {
        "success": True,
        "data": [_to_response(a) for a in approvals],
        "meta": {"total": total, "page": page, "limit": limit, "pages": math.ceil(total / limit) if total else 1},
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_approval(
    body: ApprovalCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """결재 기안 제출."""
    approval = Approval(
        title=body.title,
        content=body.content,
        type=body.type,
        status="pending",
        author_id=current_user.id,
    )
    db.add(approval)
    await db.flush()

    # 결재선 생성
    for order, approver_id in enumerate(body.approver_ids, start=1):
        line = ApprovalLine(
            approval_id=approval.id,
            approver_id=approver_id,
            order=order,
            action="waiting",
        )
        db.add(line)

    # 이력 기록
    history = ApprovalHistory(
        approval_id=approval.id,
        actor_id=current_user.id,
        action="submit",
        comment=None,
    )
    db.add(history)
    await db.flush()

    # 알림 발송
    await send_approval_request(db, approval.id, body.title, body.approver_ids)

    # eager reload
    result = await db.execute(
        select(Approval)
        .options(selectinload(Approval.approval_lines), selectinload(Approval.history))
        .where(Approval.id == approval.id)
    )
    created = result.scalar_one()
    return {"success": True, "data": _to_response(created)}


@router.get("/{approval_id}", response_model=dict)
async def get_approval(
    approval_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """결재 상세 조회."""
    approval = await _get_approval_or_404(db, approval_id)
    _assert_can_view(approval, current_user)
    return {"success": True, "data": _to_detail_response(approval)}


@router.put("/{approval_id}/process", response_model=dict)
async def process_approval(
    approval_id: str,
    body: ApprovalProcess,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """결재 처리 (승인/반려) — pending → approved|rejected 상태 전이."""
    approval = await _get_approval_or_404(db, approval_id)

    if approval.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"이미 처리된 결재입니다. (현재 상태: {approval.status})",
        )

    # 현재 결재자 차례인지 확인
    my_line = next(
        (ln for ln in approval.approval_lines
         if str(ln.approver_id) == str(current_user.id) and ln.action == "waiting"),
        None,
    )
    if my_line is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="결재 처리 권한이 없거나 이미 처리하셨습니다.",
        )

    # 결재선 업데이트
    line_action = "approved" if body.action == "approve" else "rejected"
    my_line.action = line_action
    my_line.comment = body.comment
    my_line.processed_at = datetime.now(UTC)

    # 전체 결재 상태 전이 결정
    new_status = _determine_approval_status(approval.approval_lines, body.action)
    approval.status = new_status
    approval.updated_at = datetime.now(UTC)

    # 이력 추가
    db.add(ApprovalHistory(
        approval_id=approval.id,
        actor_id=current_user.id,
        action=body.action,
        comment=body.comment,
    ))
    await db.flush()

    # 완전히 처리된 경우 기안자에게 알림
    if new_status in ("approved", "rejected"):
        await send_approval_processed(
            db, approval.id, approval.title, approval.author_id, body.action
        )

    await log_action(
        db=db,
        action="approval_process",
        resource="approval",
        resource_id=str(approval.id),
        user_id=str(current_user.id),
        result="success",
    )

    return {
        "success": True,
        "data": {
            "id": str(approval.id),
            "status": approval.status,
            "updated_at": approval.updated_at.isoformat(),
        },
    }


# ── helpers ──────────────────────────────────────────────────────────────────

def _determine_approval_status(lines: list[ApprovalLine], action: str) -> str:
    """결재선 전체를 보고 최종 상태를 결정한다."""
    if action == "reject":
        return "rejected"
    # 모든 결재자가 approved면 전체 approved
    if all(ln.action == "approved" for ln in lines):
        return "approved"
    return "pending"


async def _get_approval_or_404(db: AsyncSession, approval_id: str) -> Approval:
    result = await db.execute(
        select(Approval)
        .options(selectinload(Approval.approval_lines), selectinload(Approval.history))
        .where(Approval.id == approval_id)
    )
    approval = result.scalar_one_or_none()
    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="결재를 찾을 수 없습니다.")
    return approval


def _assert_can_view(approval: Approval, user: User) -> None:
    """기안자 또는 결재선에 포함된 사람만 조회 가능."""
    if user.role == "admin":
        return
    if str(approval.author_id) == str(user.id):
        return
    if any(str(ln.approver_id) == str(user.id) for ln in approval.approval_lines):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="조회 권한이 없습니다.")


def _to_response(approval: Approval) -> dict:
    return {
        "id": str(approval.id),
        "title": approval.title,
        "content": approval.content,
        "type": approval.type,
        "status": approval.status,
        "authorId": str(approval.author_id),
        "approvalLine": [
            {
                "order": ln.order,
                "userId": str(ln.approver_id),
                "status": ln.action,
                "comment": ln.comment,
                "processedAt": ln.processed_at.isoformat() if ln.processed_at else None,
            }
            for ln in sorted(approval.approval_lines, key=lambda x: x.order)
        ],
        "attachments": [],
        "createdAt": approval.created_at.isoformat(),
        "updatedAt": approval.updated_at.isoformat(),
    }


def _to_detail_response(approval: Approval) -> dict:
    data = _to_response(approval)
    data["history"] = [
        {
            "actorId": str(h.actor_id),
            "action": h.action,
            "comment": h.comment,
            "createdAt": h.created_at.isoformat(),
        }
        for h in sorted(approval.history, key=lambda x: x.created_at)
    ]
    return data
