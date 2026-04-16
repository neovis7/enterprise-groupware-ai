"""알림 자동 발송 서비스 — 결재/일정/공지/휴가/태스크 이벤트 트리거"""
import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification

logger = logging.getLogger(__name__)


async def _create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    notification_type: str,
    title: str,
    body: str,
    related_id: uuid.UUID | None = None,
    related_type: str | None = None,
) -> None:
    """단일 알림을 DB에 저장한다."""
    notif = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        body=body,
        is_read=False,
        related_id=related_id,
        related_type=related_type,
        created_at=datetime.now(UTC),
    )
    db.add(notif)
    await db.flush()


async def send_approval_request(
    db: AsyncSession,
    approval_id: uuid.UUID,
    title: str,
    approver_ids: list[uuid.UUID],
) -> None:
    """결재 요청 알림 — 모든 결재자에게 발송."""
    for approver_id in approver_ids:
        await _create_notification(
            db=db,
            user_id=approver_id,
            notification_type="approval",
            title="새 결재 요청",
            body=f"결재 요청이 도착했습니다: {title}",
            related_id=approval_id,
            related_type="approval",
        )
    logger.info("Approval request notifications sent: approval_id=%s approvers=%d", approval_id, len(approver_ids))


async def send_approval_processed(
    db: AsyncSession,
    approval_id: uuid.UUID,
    title: str,
    requester_id: uuid.UUID,
    action: str,
) -> None:
    """결재 처리 결과 알림 — 기안자에게 발송."""
    action_label = "승인" if action == "approve" else "반려"
    await _create_notification(
        db=db,
        user_id=requester_id,
        notification_type="approval",
        title=f"결재 {action_label} 완료",
        body=f"결재 '{title}'가 {action_label}되었습니다.",
        related_id=approval_id,
        related_type="approval",
    )
    logger.info("Approval processed notification sent: approval_id=%s action=%s", approval_id, action)


async def send_schedule_invite(
    db: AsyncSession,
    schedule_id: uuid.UUID,
    title: str,
    attendee_ids: list[uuid.UUID],
    meeting_url: str | None = None,
) -> None:
    """일정 초대 알림 — 모든 참석자에게 발송."""
    body = f"일정에 초대되었습니다: {title}"
    if meeting_url:
        body += f"\n화상회의 링크: {meeting_url}"

    for attendee_id in attendee_ids:
        await _create_notification(
            db=db,
            user_id=attendee_id,
            notification_type="schedule",
            title="일정 초대",
            body=body,
            related_id=schedule_id,
            related_type="schedule",
        )
    logger.info("Schedule invite notifications sent: schedule_id=%s attendees=%d", schedule_id, len(attendee_ids))


async def send_post_published(
    db: AsyncSession,
    post_id: uuid.UUID,
    title: str,
    target_user_ids: list[uuid.UUID],
) -> None:
    """공지사항 발행 알림 — 대상 부서 직원들에게 발송."""
    for user_id in target_user_ids:
        await _create_notification(
            db=db,
            user_id=user_id,
            notification_type="post",
            title="새 공지사항",
            body=f"공지사항이 등록되었습니다: {title}",
            related_id=post_id,
            related_type="post",
        )
    logger.info("Post published notifications sent: post_id=%s recipients=%d", post_id, len(target_user_ids))


async def send_leave_request(
    db: AsyncSession,
    leave_id: uuid.UUID,
    requester_name: str,
    approver_id: uuid.UUID,
) -> None:
    """휴가 신청 알림 — 승인자에게 발송."""
    await _create_notification(
        db=db,
        user_id=approver_id,
        notification_type="system",
        title="휴가 승인 요청",
        body=f"{requester_name}님이 휴가를 신청했습니다.",
        related_id=leave_id,
        related_type="leave",
    )
    logger.info("Leave request notification sent: leave_id=%s approver=%s", leave_id, approver_id)


async def send_leave_processed(
    db: AsyncSession,
    leave_id: uuid.UUID,
    requester_id: uuid.UUID,
    action: str,
) -> None:
    """휴가 처리 결과 알림 — 신청자에게 발송."""
    action_label = "승인" if action == "approve" else "반려"
    await _create_notification(
        db=db,
        user_id=requester_id,
        notification_type="system",
        title=f"휴가 신청 {action_label}",
        body=f"휴가 신청이 {action_label}되었습니다.",
        related_id=leave_id,
        related_type="leave",
    )


async def send_task_assigned(
    db: AsyncSession,
    task_id: uuid.UUID,
    task_title: str,
    assignee_id: uuid.UUID,
) -> None:
    """태스크 담당자 배정 알림."""
    await _create_notification(
        db=db,
        user_id=assignee_id,
        notification_type="system",
        title="태스크 배정",
        body=f"새 태스크가 배정되었습니다: {task_title}",
        related_id=task_id,
        related_type="task",
    )
    logger.info("Task assigned notification sent: task_id=%s assignee=%s", task_id, assignee_id)
