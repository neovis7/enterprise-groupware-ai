"""일정 라우터"""
import logging
import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.schedule import Schedule, ScheduleAttendee
from app.models.user import User
from app.schemas.schedule import ScheduleCreate, ScheduleRespond, ScheduleResponse, ScheduleUpdate
from app.services.notification_service import send_schedule_invite

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_schedules(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    year: int = Query(default=2026),
    month: int = Query(default=1, ge=1, le=12),
) -> dict:
    """월별 일정 목록."""
    result = await db.execute(
        select(Schedule)
        .options(selectinload(Schedule.attendees))
        .where(
            extract("year", Schedule.start_at) == year,
            extract("month", Schedule.start_at) == month,
        )
        .order_by(Schedule.start_at)
    )
    schedules = result.scalars().all()
    return {"success": True, "data": [_to_response(s) for s in schedules]}


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    body: ScheduleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """일정 생성 + 참석자 초대."""
    meeting_url: str | None = None
    if body.is_online:
        # 실제 환경에서는 Google Meet / Zoom API 연동; 여기서는 placeholder 생성
        import uuid as _uuid
        meeting_url = f"https://meet.placeholder.com/{_uuid.uuid4().hex[:10]}"

    schedule = Schedule(
        title=body.title,
        description=body.description,
        start_at=body.start_at,
        end_at=body.end_at,
        location=body.location,
        is_online=body.is_online or False,
        meeting_url=meeting_url,
        organizer_id=current_user.id,
    )
    db.add(schedule)
    await db.flush()

    # 참석자 등록 (주최자 포함)
    all_attendee_ids = list({str(current_user.id)} | {str(uid) for uid in body.attendee_ids})
    for uid in all_attendee_ids:
        attendee = ScheduleAttendee(
            schedule_id=schedule.id,
            user_id=uid,
            response="accepted" if str(uid) == str(current_user.id) else "invited",
        )
        db.add(attendee)
    await db.flush()

    # 알림 발송 (주최자 제외)
    invite_ids = [uid for uid in body.attendee_ids if str(uid) != str(current_user.id)]
    if invite_ids:
        await send_schedule_invite(db, schedule.id, body.title, invite_ids, meeting_url)

    result = await db.execute(
        select(Schedule).options(selectinload(Schedule.attendees)).where(Schedule.id == schedule.id)
    )
    created = result.scalar_one()
    return {"success": True, "data": _to_response(created)}


@router.get("/{schedule_id}", response_model=dict)
async def get_schedule(
    schedule_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    schedule = await _get_schedule_or_404(db, schedule_id)
    return {"success": True, "data": _to_response(schedule)}


@router.put("/{schedule_id}", response_model=dict)
async def update_schedule(
    schedule_id: str,
    body: ScheduleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """일정 수정 (주최자 또는 admin)."""
    schedule = await _get_schedule_or_404(db, schedule_id)
    if str(schedule.organizer_id) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="수정 권한이 없습니다.")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)
    await db.flush()

    result = await db.execute(
        select(Schedule).options(selectinload(Schedule.attendees)).where(Schedule.id == schedule.id)
    )
    updated = result.scalar_one()
    return {"success": True, "data": _to_response(updated)}


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """일정 삭제 (주최자 또는 admin)."""
    schedule = await _get_schedule_or_404(db, schedule_id)
    if str(schedule.organizer_id) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="삭제 권한이 없습니다.")
    await db.delete(schedule)
    await db.flush()


@router.put("/{schedule_id}/respond", response_model=dict)
async def respond_schedule(
    schedule_id: str,
    body: ScheduleRespond,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """참석 응답 (accept/decline)."""
    schedule = await _get_schedule_or_404(db, schedule_id)

    result = await db.execute(
        select(ScheduleAttendee).where(
            ScheduleAttendee.schedule_id == schedule.id,
            ScheduleAttendee.user_id == current_user.id,
        )
    )
    attendee = result.scalar_one_or_none()
    if attendee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="초대받지 않은 일정입니다.")

    attendee.response = "accepted" if body.response == "accept" else "declined"
    await db.flush()
    return {"success": True, "data": {"schedule_id": str(schedule_id), "response": attendee.response}}


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_schedule_or_404(db: AsyncSession, schedule_id: str) -> Schedule:
    result = await db.execute(
        select(Schedule)
        .options(selectinload(Schedule.attendees))
        .where(Schedule.id == schedule_id)
    )
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="일정을 찾을 수 없습니다.")
    return s


def _to_response(schedule: Schedule) -> dict:
    return {
        "id": str(schedule.id),
        "title": schedule.title,
        "description": schedule.description,
        "start_at": schedule.start_at.isoformat(),
        "end_at": schedule.end_at.isoformat(),
        "location": schedule.location,
        "is_online": schedule.is_online,
        "meeting_url": schedule.meeting_url,
        "organizer_id": str(schedule.organizer_id),
        "attendees": [
            {"user_id": str(a.user_id), "status": a.response}
            for a in schedule.attendees
        ],
        "created_at": schedule.created_at.isoformat(),
    }
