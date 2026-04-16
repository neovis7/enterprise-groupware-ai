"""AI 기능 중심 대기업 그룹웨어 — FastAPI 메인 엔트리포인트"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.database import init_db
from app.middleware.audit_middleware import AuditMiddleware
from app.routers import (
    auth, users, departments, approvals,
    schedules, posts, messages, notifications,
    ai, attendance, leaves, files, folders,
    projects, tasks, audit,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Enterprise Groupware AI",
    description="AI 기능 중심 대기업 그룹웨어 API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuditMiddleware)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(departments.router, prefix="/api/departments", tags=["departments"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["approvals"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["schedules"])
app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
app.include_router(leaves.router, prefix="/api/leaves", tags=["leaves"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(folders.router, prefix="/api/folders", tags=["folders"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
