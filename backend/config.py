from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    SECRET_KEY: str = "med44-dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "sqlite+aiosqlite:///./med44.db"
    APP_NAME: str = "Med44"
    APP_VERSION: str = "1.1.0"

    # Mode: TEST or PRODUCTION
    MED44_MODE: str = "TEST"
    DEMO_MODE: bool = True

    # CORS — comma-separated origins; * only in TEST mode
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # AI
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # OCR
    OCR_ENGINE: str = "tesseract"
    TESSERACT_CMD: Optional[str] = None          # e.g. C:\\Program Files\\Tesseract-OCR\\tesseract.exe
    OCR_MAX_FILE_MB: int = 10
    OCR_MAX_PAGES: int = 10
    OCR_TEMP_TTL_SECONDS: int = 300

    # Email & Google OAuth 2.0 Web Application (Gmail API)
    EMAIL_PROVIDER: str = "gmail_api"
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    GMAIL_API_SCOPE: str = "https://www.googleapis.com/auth/gmail.send"
    AUTHORIZED_GMAIL_USER: str = "mayankmayank9444@gmail.com"
    DEMO_ALERT_EMAILS: str = "mayankmayank9444@gmail.com,md6074@srmist.edu.in"
    GMAIL_SMTP_USER: Optional[str] = None
    GMAIL_SMTP_APP_PASSWORD: Optional[str] = None
    GMAIL_OAUTH_CLIENT_ID: Optional[str] = None
    GMAIL_OAUTH_CLIENT_SECRET: Optional[str] = None
    GMAIL_OAUTH_REFRESH_TOKEN: Optional[str] = None

    # Test identities (never hardcoded in source)
    TEST_DOCTOR_EMAIL: Optional[str] = None
    TEST_PATIENT_EMAIL: Optional[str] = None

    # Emergency
    EMERGENCY_NUMBER: Optional[str] = None
    EMERGENCY_NUMBER_VERIFIED_BY: Optional[str] = None

    # Public base URL for signed links
    PUBLIC_BASE_URL: str = "http://localhost:5173"

    # SMS (optional)
    SMS_PROVIDER: Optional[str] = None

    @property
    def cors_origins(self) -> List[str]:
        if self.MED44_MODE == "TEST":
            return ["*"]
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_test_mode(self) -> bool:
        return self.MED44_MODE.upper() == "TEST"


settings = Settings()

