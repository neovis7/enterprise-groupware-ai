"""결재 API 테스트 — 기안/조회/처리 플로우 + 상태 전이"""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.models.approval import Approval, ApprovalLine
from app.models.user import User


# ── 픽스처 ─────────────────────────────────────────────────────────────────

@pytest.fixture
def auth_headers_employee(employee_user: User) -> dict:
    token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
    return {"Cookie": f"access_token={token}"}


@pytest.fixture
def auth_headers_admin(admin_user: User) -> dict:
    token = create_access_token({"sub": str(admin_user.id), "role": "admin"})
    return {"Cookie": f"access_token={token}"}


@pytest.fixture
def employee_token(employee_user: User) -> str:
    return create_access_token({"sub": str(employee_user.id), "role": "employee"})


@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token({"sub": str(admin_user.id), "role": "admin"})


# ── 단위 테스트: 상태 전이 로직 ──────────────────────────────────────────────

class TestApprovalStatusTransition:
    """결재 상태 전이 단위 테스트 (pending → approved | rejected)."""

    def test_all_approved_gives_approved(self) -> None:
        """모든 결재자가 approved → 전체 approved."""
        from app.routers.approvals import _determine_approval_status

        lines = [_make_line("approved"), _make_line("approved")]
        assert _determine_approval_status(lines, "approve") == "approved"

    def test_partial_approved_stays_pending(self) -> None:
        """일부만 approved → pending 유지."""
        from app.routers.approvals import _determine_approval_status

        lines = [_make_line("approved"), _make_line("waiting")]
        assert _determine_approval_status(lines, "approve") == "pending"

    def test_reject_gives_rejected_immediately(self) -> None:
        """reject 액션 → 즉시 rejected."""
        from app.routers.approvals import _determine_approval_status

        lines = [_make_line("approved"), _make_line("waiting")]
        assert _determine_approval_status(lines, "reject") == "rejected"

    def test_single_approver_approved(self) -> None:
        """단일 결재자 approved → 전체 approved."""
        from app.routers.approvals import _determine_approval_status

        lines = [_make_line("approved")]
        assert _determine_approval_status(lines, "approve") == "approved"


def _make_line(action: str):
    """테스트용 ApprovalLine stub."""

    class _Line:
        pass

    line = _Line()
    line.action = action
    return line


# ── 통합 테스트: API 엔드포인트 ───────────────────────────────────────────────

@pytest.mark.asyncio
class TestCreateApproval:
    """POST /api/approvals"""

    async def test_create_approval_success(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
    ) -> None:
        """결재 기안 성공."""
        token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("access_token", token)

        response = await client.post(
            "/api/approvals",
            json={
                "title": "출장비 청구",
                "content": "서울 출장 경비 청구합니다.",
                "type": "expense",
                "approver_ids": [str(admin_user.id)],
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "pending"
        assert data["data"]["title"] == "출장비 청구"
        assert len(data["data"]["approval_line"]) == 1

    async def test_create_approval_no_approvers(
        self,
        client: AsyncClient,
        employee_user: User,
    ) -> None:
        """결재자 없이 기안 — 422 반환."""
        token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("access_token", token)

        response = await client.post(
            "/api/approvals",
            json={
                "title": "테스트",
                "content": "내용",
                "type": "general",
                "approver_ids": [],
            },
        )
        assert response.status_code == 422

    async def test_create_approval_invalid_type(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
    ) -> None:
        """유효하지 않은 결재 유형 — 422."""
        token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("access_token", token)

        response = await client.post(
            "/api/approvals",
            json={
                "title": "테스트",
                "content": "내용",
                "type": "invalid_type",
                "approver_ids": [str(admin_user.id)],
            },
        )
        assert response.status_code == 422

    async def test_create_approval_requires_auth(self, client: AsyncClient) -> None:
        """인증 없이 결재 기안 — 401."""
        response = await client.post(
            "/api/approvals",
            json={"title": "test", "content": "c", "type": "general", "approver_ids": []},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestListApprovals:
    """GET /api/approvals"""

    async def test_list_my_approvals(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
        db_session: AsyncSession,
    ) -> None:
        """status=mine 쿼리로 내 기안 목록 조회."""
        # 사전 데이터 생성
        approval = Approval(
            title="내 결재",
            content="내용",
            type="general",
            status="pending",
            author_id=employee_user.id,
        )
        db_session.add(approval)
        await db_session.flush()
        db_session.add(ApprovalLine(
            approval_id=approval.id,
            approver_id=admin_user.id,
            order=1,
            action="waiting",
        ))
        await db_session.commit()

        token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("access_token", token)

        response = await client.get("/api/approvals?status=mine")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert any(a["title"] == "내 결재" for a in data["data"])

    async def test_list_pending_approvals_for_approver(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
        db_session: AsyncSession,
    ) -> None:
        """status=pending&assignee=me 로 대기 결재 조회."""
        approval = Approval(
            title="승인 대기",
            content="내용",
            type="general",
            status="pending",
            author_id=employee_user.id,
        )
        db_session.add(approval)
        await db_session.flush()
        db_session.add(ApprovalLine(
            approval_id=approval.id,
            approver_id=admin_user.id,
            order=1,
            action="waiting",
        ))
        await db_session.commit()

        token = create_access_token({"sub": str(admin_user.id), "role": "admin"})
        client.cookies.set("access_token", token)

        response = await client.get("/api/approvals?status=pending&assignee=me")
        assert response.status_code == 200
        data = response.json()
        assert any(a["title"] == "승인 대기" for a in data["data"])


@pytest.mark.asyncio
class TestProcessApproval:
    """PUT /api/approvals/:id/process — 결재 처리 상태 전이"""

    async def _create_approval_with_line(
        self,
        db_session: AsyncSession,
        author_id,
        approver_id,
    ) -> Approval:
        approval = Approval(
            title="처리 대기 결재",
            content="내용",
            type="general",
            status="pending",
            author_id=author_id,
        )
        db_session.add(approval)
        await db_session.flush()
        db_session.add(ApprovalLine(
            approval_id=approval.id,
            approver_id=approver_id,
            order=1,
            action="waiting",
        ))
        await db_session.commit()
        return approval

    async def test_approve_transitions_to_approved(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
        db_session: AsyncSession,
    ) -> None:
        """승인 처리 → status: approved."""
        approval = await self._create_approval_with_line(
            db_session, employee_user.id, admin_user.id
        )

        token = create_access_token({"sub": str(admin_user.id), "role": "admin"})
        client.cookies.set("access_token", token)

        response = await client.put(
            f"/api/approvals/{approval.id}/process",
            json={"action": "approve", "comment": "승인합니다."},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["status"] == "approved"

    async def test_reject_transitions_to_rejected(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
        db_session: AsyncSession,
    ) -> None:
        """반려 처리 → status: rejected."""
        approval = await self._create_approval_with_line(
            db_session, employee_user.id, admin_user.id
        )

        token = create_access_token({"sub": str(admin_user.id), "role": "admin"})
        client.cookies.set("access_token", token)

        response = await client.put(
            f"/api/approvals/{approval.id}/process",
            json={"action": "reject", "comment": "반려합니다."},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["status"] == "rejected"

    async def test_non_approver_cannot_process(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
        db_session: AsyncSession,
    ) -> None:
        """결재선에 없는 사용자는 처리 불가 — 403."""
        approval = await self._create_approval_with_line(
            db_session, admin_user.id, admin_user.id  # admin이 기안 + 결재
        )

        # employee_user는 결재선에 없음
        token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("access_token", token)

        response = await client.put(
            f"/api/approvals/{approval.id}/process",
            json={"action": "approve"},
        )
        assert response.status_code == 403

    async def test_cannot_process_already_processed(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
        db_session: AsyncSession,
    ) -> None:
        """이미 처리된 결재는 재처리 불가 — 409."""
        approval = Approval(
            title="완료된 결재",
            content="내용",
            type="general",
            status="approved",  # 이미 승인됨
            author_id=employee_user.id,
        )
        db_session.add(approval)
        await db_session.flush()
        db_session.add(ApprovalLine(
            approval_id=approval.id,
            approver_id=admin_user.id,
            order=1,
            action="approved",
        ))
        await db_session.commit()

        token = create_access_token({"sub": str(admin_user.id), "role": "admin"})
        client.cookies.set("access_token", token)

        response = await client.put(
            f"/api/approvals/{approval.id}/process",
            json={"action": "approve"},
        )
        assert response.status_code == 409

    async def test_invalid_action_rejected(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
        db_session: AsyncSession,
    ) -> None:
        """유효하지 않은 action — 422."""
        approval = await self._create_approval_with_line(
            db_session, employee_user.id, admin_user.id
        )

        token = create_access_token({"sub": str(admin_user.id), "role": "admin"})
        client.cookies.set("access_token", token)

        response = await client.put(
            f"/api/approvals/{approval.id}/process",
            json={"action": "invalid"},
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestApprovalDetail:
    """GET /api/approvals/:id"""

    async def test_author_can_view_detail(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
        db_session: AsyncSession,
    ) -> None:
        """기안자는 상세 조회 가능."""
        approval = Approval(
            title="내 결재",
            content="내용",
            type="general",
            status="pending",
            author_id=employee_user.id,
        )
        db_session.add(approval)
        await db_session.flush()
        db_session.add(ApprovalLine(
            approval_id=approval.id,
            approver_id=admin_user.id,
            order=1,
            action="waiting",
        ))
        await db_session.commit()

        token = create_access_token({"sub": str(employee_user.id), "role": "employee"})
        client.cookies.set("access_token", token)

        response = await client.get(f"/api/approvals/{approval.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == str(approval.id)
        assert "history" in data["data"]

    async def test_unrelated_user_cannot_view(
        self,
        client: AsyncClient,
        employee_user: User,
        admin_user: User,
        db_session: AsyncSession,
    ) -> None:
        """관계없는 사용자는 조회 불가 — 403."""
        # 제3의 사용자 생성
        other = User(
            id=uuid.uuid4(),
            email="other@test.com",
            password_hash=get_password_hash("OtherPass123"),
            name="제3자",
            role="employee",
            is_active=True,
        )
        db_session.add(other)

        approval = Approval(
            title="비공개 결재",
            content="내용",
            type="general",
            status="pending",
            author_id=admin_user.id,
        )
        db_session.add(approval)
        await db_session.flush()
        db_session.add(ApprovalLine(
            approval_id=approval.id,
            approver_id=admin_user.id,
            order=1,
            action="waiting",
        ))
        await db_session.commit()

        token = create_access_token({"sub": str(other.id), "role": "employee"})
        client.cookies.set("access_token", token)

        response = await client.get(f"/api/approvals/{approval.id}")
        assert response.status_code == 403
