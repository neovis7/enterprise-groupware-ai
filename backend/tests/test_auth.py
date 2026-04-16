"""인증 API 테스트 — 로그인/로그아웃/토큰 갱신/권한 검증"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.models.user import User


@pytest.mark.asyncio
class TestLogin:
    """POST /api/auth/login"""

    async def test_login_success(self, client: AsyncClient, employee_user: User) -> None:
        """올바른 자격증명으로 로그인 성공."""
        response = await client.post(
            "/api/auth/login",
            json={"email": "employee@test.com", "password": "EmpPass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "employee@test.com"
        assert data["user"]["role"] == "employee"
        # httpOnly 쿠키 설정 확인
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    async def test_login_wrong_password(self, client: AsyncClient, employee_user: User) -> None:
        """잘못된 비밀번호로 로그인 실패."""
        response = await client.post(
            "/api/auth/login",
            json={"email": "employee@test.com", "password": "WrongPassword"},
        )
        assert response.status_code == 401
        assert "올바르지 않습니다" in response.json()["detail"]

    async def test_login_nonexistent_user(self, client: AsyncClient) -> None:
        """존재하지 않는 이메일로 로그인 실패."""
        response = await client.post(
            "/api/auth/login",
            json={"email": "nobody@test.com", "password": "SomePass123"},
        )
        assert response.status_code == 401

    async def test_login_invalid_email_format(self, client: AsyncClient) -> None:
        """유효하지 않은 이메일 형식 — 422 반환."""
        response = await client.post(
            "/api/auth/login",
            json={"email": "not-an-email", "password": "SomePass123"},
        )
        assert response.status_code == 422

    async def test_login_short_password(self, client: AsyncClient) -> None:
        """8자 미만 비밀번호 — 422 반환."""
        response = await client.post(
            "/api/auth/login",
            json={"email": "user@test.com", "password": "short"},
        )
        assert response.status_code == 422

    async def test_inactive_user_cannot_login(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        """비활성 사용자는 로그인 불가."""
        import uuid
        user = User(
            id=uuid.uuid4(),
            email="inactive@test.com",
            password_hash=get_password_hash("InactivePass123"),
            name="비활성",
            role="employee",
            is_active=False,
        )
        db_session.add(user)
        await db_session.commit()

        response = await client.post(
            "/api/auth/login",
            json={"email": "inactive@test.com", "password": "InactivePass123"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestRefreshToken:
    """POST /api/auth/refresh"""

    async def test_refresh_success(self, client: AsyncClient, employee_user: User) -> None:
        """유효한 refresh 토큰으로 새 access 토큰 발급."""
        from app.core.security import create_refresh_token

        refresh_token = create_refresh_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("refresh_token", refresh_token)

        response = await client.post("/api/auth/refresh")
        assert response.status_code == 200
        assert "access_token" in response.json()

    async def test_refresh_without_cookie(self, client: AsyncClient) -> None:
        """쿠키 없이 refresh 요청 — 401."""
        response = await client.post("/api/auth/refresh")
        assert response.status_code == 401

    async def test_refresh_with_invalid_token(self, client: AsyncClient) -> None:
        """유효하지 않은 refresh 토큰 — 401."""
        client.cookies.set("refresh_token", "invalid.token.value")
        response = await client.post("/api/auth/refresh")
        assert response.status_code == 401

    async def test_refresh_with_access_token_rejected(
        self, client: AsyncClient, employee_user: User
    ) -> None:
        """access 토큰을 refresh 엔드포인트에 사용 — 401 (token_type 검증)."""
        access_token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("refresh_token", access_token)
        response = await client.post("/api/auth/refresh")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestLogout:
    """POST /api/auth/logout"""

    async def test_logout_clears_cookies(self, client: AsyncClient, employee_user: User) -> None:
        """로그아웃 시 쿠키 삭제 및 204 반환."""
        access_token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("access_token", access_token)

        response = await client.post("/api/auth/logout")
        assert response.status_code == 204

    async def test_logout_without_auth(self, client: AsyncClient) -> None:
        """인증 없이 로그아웃 — 401."""
        response = await client.post("/api/auth/logout")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestGetMe:
    """GET /api/auth/me"""

    async def test_get_me_success(self, client: AsyncClient, employee_user: User) -> None:
        """인증된 사용자 정보 반환."""
        access_token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("access_token", access_token)

        response = await client.get("/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "employee@test.com"
        assert data["role"] == "employee"

    async def test_get_me_unauthenticated(self, client: AsyncClient) -> None:
        """인증 없이 /me 접근 — 401."""
        response = await client.get("/api/auth/me")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestAdminAccess:
    """역할 기반 접근 제어 (RBAC) 테스트"""

    async def test_admin_can_access_users_list(
        self, client: AsyncClient, admin_user: User
    ) -> None:
        """admin은 사용자 목록 조회 가능."""
        access_token = create_access_token({"sub": str(admin_user.id), "role": "admin"})
        client.cookies.set("access_token", access_token)

        response = await client.get("/api/users/")
        assert response.status_code == 200

    async def test_employee_cannot_access_users_list(
        self, client: AsyncClient, employee_user: User
    ) -> None:
        """employee는 사용자 목록 조회 불가 — 403."""
        access_token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("access_token", access_token)

        response = await client.get("/api/users/")
        assert response.status_code == 403
