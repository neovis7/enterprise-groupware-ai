"""감사 로그 자동 기록 미들웨어"""
import logging
import time
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# 감사 로그를 반드시 기록할 액션 패턴 (method, path_prefix)
_AUDITED_ROUTES = [
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/logout"),
    ("PUT", "/api/approvals"),        # 결재 처리
    ("POST", "/api/approvals"),       # 결재 기안
    ("GET", "/api/files"),            # 파일 다운로드
    ("DELETE", "/api/files"),         # 파일 삭제
    ("POST", "/api/users"),           # 사용자 생성
    ("DELETE", "/api/users"),         # 사용자 삭제
    ("PUT", "/api/users"),            # 사용자 수정
]


class AuditMiddleware(BaseHTTPMiddleware):
    """모든 요청에 대해 선택적 감사 로그를 기록한다.

    - 중요 액션만 기록 (로그인, 결재, 파일 다운로드)
    - 응답 상태 코드로 result(success/fail) 결정
    - DB 세션은 라우터 내 log_action()으로 처리하므로 여기서는 메타데이터만 기록
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000, 2)

        # 감사 대상 라우트인지 확인
        if self._should_audit(request.method, request.url.path):
            result = "success" if response.status_code < 400 else "fail"
            ip = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("user-agent", "")[:200]

            logger.info(
                "AUDIT method=%s path=%s status=%d result=%s ip=%s duration_ms=%s ua=%s",
                request.method,
                request.url.path,
                response.status_code,
                result,
                ip,
                duration_ms,
                user_agent,
            )

        return response

    @staticmethod
    def _should_audit(method: str, path: str) -> bool:
        return any(
            method == m and path.startswith(p)
            for m, p in _AUDITED_ROUTES
        )
