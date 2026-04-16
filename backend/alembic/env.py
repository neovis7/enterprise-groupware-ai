"""Alembic 환경 설정 — Supabase PostgreSQL async"""
import asyncio
import os
from logging.config import fileConfig
from pathlib import Path

from dotenv import load_dotenv

# .env 파일 로드 (alembic은 별도 프로세스로 실행되므로 명시적 로드 필요)
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool

# Alembic Config 객체
config = context.config

# 로깅 설정
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DATABASE_URL 환경변수로 오버라이드
database_url = os.environ.get("DATABASE_URL", "")
if database_url:
    # asyncpg 드라이버 사용
    async_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    # ConfigParser는 % 를 보간 문자로 해석하므로 %% 로 이스케이프
    config.set_main_option("sqlalchemy.url", async_url.replace("%", "%%"))

# 모든 모델 메타데이터 임포트
from app.core.database import Base  # noqa: E402
import app.models  # noqa: E402, F401 — 모든 모델 등록

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """오프라인 모드: SQL 스크립트 생성."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """온라인 모드: async 엔진으로 마이그레이션 실행."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
