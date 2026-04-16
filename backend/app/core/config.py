"""애플리케이션 설정"""
import logging
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # 앱 기본 설정
    APP_NAME: str = "Enterprise Groupware AI"
    DEBUG: bool = False
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # 데이터베이스 (Supabase)
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AI
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # 파일 업로드
    MAX_UPLOAD_SIZE_MB: int = 50

    # SSO
    SAML_IDP_METADATA_URL: str = ""

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("DATABASE_URL must be a PostgreSQL URL")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
