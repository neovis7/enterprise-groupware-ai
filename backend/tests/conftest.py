"""pytest 공통 픽스처"""
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models.user import User
from main import app

# 인메모리 SQLite (테스트용)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """각 테스트마다 독립적인 DB 세션 제공."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """테스트용 FastAPI 클라이언트."""
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """테스트용 admin 사용자 생성."""
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        password_hash=get_password_hash("AdminPass123"),
        name="관리자",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    return user


@pytest_asyncio.fixture
async def employee_user(db_session: AsyncSession) -> User:
    """테스트용 일반 사용자 생성."""
    user = User(
        id=uuid.uuid4(),
        email="employee@test.com",
        password_hash=get_password_hash("EmpPass123"),
        name="직원",
        role="employee",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    return user
