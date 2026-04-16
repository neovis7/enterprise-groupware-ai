"""감사 로그 기록 유틸리티"""
import logging
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def log_action(
    db: AsyncSession,
    action: str,
    resource: str,
    result: str = "success",
    user_id: str | None = None,
    resource_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    """중요 API 액션을 audit_log 테이블에 기록한다."""
    from app.models.audit_log import AuditLog

    try:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            result=result,
            created_at=datetime.now(UTC),
        )
        db.add(log_entry)
        await db.flush()
    except Exception as exc:
        # 감사 로그 실패가 본 요청을 막아서는 안 됨
        logger.error("Failed to write audit log: action=%s resource=%s error=%s", action, resource, exc)
