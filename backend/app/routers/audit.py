"""감사 로그 라우터 (admin 전용)"""
import csv
import io
import logging
import math
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.audit_log import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/logs", response_model=dict)
async def list_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    user_id: str | None = Query(default=None),
    action: str | None = Query(default=None),
    from_dt: datetime | None = Query(default=None, alias="from"),
    to_dt: datetime | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    """감사 로그 목록 (admin 전용)."""
    query = select(AuditLog)

    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if from_dt:
        query = query.where(AuditLog.created_at >= from_dt)
    if to_dt:
        query = query.where(AuditLog.created_at <= to_dt)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    logs = result.scalars().all()

    return {
        "success": True,
        "data": [_to_response(log) for log in logs],
        "meta": {"total": total, "page": page, "limit": limit, "pages": math.ceil(total / limit) if total else 1},
    }


@router.get("/logs/export")
async def export_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    user_id: str | None = Query(default=None),
    action: str | None = Query(default=None),
    from_dt: datetime | None = Query(default=None, alias="from"),
    to_dt: datetime | None = Query(default=None, alias="to"),
) -> Response:
    """감사 로그 CSV 다운로드."""
    query = select(AuditLog)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if from_dt:
        query = query.where(AuditLog.created_at >= from_dt)
    if to_dt:
        query = query.where(AuditLog.created_at <= to_dt)

    result = await db.execute(query.order_by(AuditLog.created_at.desc()).limit(10000))
    logs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "user_id", "action", "resource", "resource_id", "ip_address", "result", "created_at"])
    for log in logs:
        writer.writerow([
            str(log.id),
            str(log.user_id) if log.user_id else "",
            log.action,
            log.resource,
            log.resource_id or "",
            log.ip_address or "",
            log.result,
            log.created_at.isoformat(),
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )


# ── helpers ──────────────────────────────────────────────────────────────────

def _to_response(log: AuditLog) -> dict:
    return {
        "id": str(log.id),
        "user_id": str(log.user_id) if log.user_id else None,
        "action": log.action,
        "resource": log.resource,
        "resource_id": log.resource_id,
        "ip_address": log.ip_address,
        "result": log.result,
        "created_at": log.created_at.isoformat(),
    }
