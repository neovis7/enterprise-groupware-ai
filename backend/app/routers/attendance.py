"""근태 라우터 — 체크인/체크아웃/월별 조회"""
import logging
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.attendance import AttendanceRecord
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/checkin", response_model=dict, status_code=status.HTTP_201_CREATED)
async def checkin(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """출근 체크인 — 오늘 이미 체크인했으면 409."""
    today = date.today()
    existing = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.user_id == current_user.id,
            AttendanceRecord.date == today,
        )
    )
    record = existing.scalar_one_or_none()
    if record is not None and record.check_in is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="오늘 이미 체크인하셨습니다.")

    now = datetime.now(UTC)
    if record is None:
        record = AttendanceRecord(
            user_id=current_user.id,
            date=today,
            check_in=now,
        )
        db.add(record)
    else:
        record.check_in = now
    await db.flush()

    return {
        "success": True,
        "data": {
            "id": str(record.id),
            "user_id": str(record.user_id),
            "date": record.date.isoformat(),
            "check_in": record.check_in.isoformat(),
        },
    }


@router.post("/checkout", response_model=dict)
async def checkout(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """퇴근 체크아웃."""
    today = date.today()
    existing = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.user_id == current_user.id,
            AttendanceRecord.date == today,
        )
    )
    record = existing.scalar_one_or_none()
    if record is None or record.check_in is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="체크인 기록이 없습니다.")
    if record.check_out is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="오늘 이미 체크아웃하셨습니다.")

    now = datetime.now(UTC)
    record.check_out = now
    delta = now - record.check_in
    record.total_hours = round(delta.total_seconds() / 3600, 2)
    await db.flush()

    return {
        "success": True,
        "data": {
            "id": str(record.id),
            "user_id": str(record.user_id),
            "date": record.date.isoformat(),
            "check_in": record.check_in.isoformat() if record.check_in else None,
            "check_out": record.check_out.isoformat(),
            "total_hours": record.total_hours,
        },
    }


@router.get("/", response_model=dict)
async def list_attendance(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    year: int = Query(default=2026),
    month: int = Query(default=1, ge=1, le=12),
) -> dict:
    """월별 근태 조회."""
    result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.user_id == current_user.id,
            extract("year", AttendanceRecord.date) == year,
            extract("month", AttendanceRecord.date) == month,
        ).order_by(AttendanceRecord.date)
    )
    records = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": str(r.id),
                "user_id": str(r.user_id),
                "date": r.date.isoformat(),
                "check_in": r.check_in.isoformat() if r.check_in else None,
                "check_out": r.check_out.isoformat() if r.check_out else None,
                "total_hours": r.total_hours,
            }
            for r in records
        ],
    }
