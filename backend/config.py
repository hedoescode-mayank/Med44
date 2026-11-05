from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    SECRET_KEY: str = "med44-dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    DATABASE_URL: str = "sqlite+aiosqlite:///./med44.db"
    DEMO_MODE: bool = True
    APP_NAME: str = "Med44"
    APP_VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"


settings = Settings()

