"""AuditLog Pydantic v2 스키마"""
import uuid
from datetime import datetime

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    resource: str
    resource_id: str | None
    ip_address: str | None
    result: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogFilter(BaseModel):
    user_id: uuid.UUID | None = None
    action: str | None = None
    from_dt: datetime | None = None
    to_dt: datetime | None = None
    page: int = 1
    limit: int = 20
