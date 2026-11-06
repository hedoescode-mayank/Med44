"""
Async SQLAlchemy engine and session factory for Med44.
"""
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    # Import models so metadata is populated before create_all
    from backend.db import models  # noqa: F401
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Run safe auto-migrations for SQLite to ensure all model columns exist
        def _migrate(sync_conn):
            import sqlite3
            cursor = sync_conn.connection.cursor()
            cols_map = {
                "appointments": [
                    ("facility_id", "INTEGER"),
                    ("facility_name", "VARCHAR(200)"),
                    ("queue_token", "VARCHAR(50)"),
                    ("is_simulated", "BOOLEAN DEFAULT 1"),
                ],
                "patients": [
                    ("height_cm", "FLOAT"),
                    ("weight_kg", "FLOAT"),
                    ("chronic_conditions", "TEXT"),
                    ("past_surgeries", "TEXT"),
                    ("family_history", "TEXT"),
                    ("vaccinations", "TEXT"),
                    ("current_medications", "TEXT"),
                    ("lifestyle", "TEXT"),
                    ("emergency_contact", "TEXT"),
                    ("has_completed_survey", "BOOLEAN DEFAULT 0"),
                    ("avatar", "VARCHAR(50)"),
                ],
                "patient_documents": [
                    ("file_name", "VARCHAR(255)"),
                    ("mime_type", "VARCHAR(100)"),
                    ("size_bytes", "INTEGER"),
                    ("content_sha256", "VARCHAR(64)"),
                    ("storage_ref", "VARCHAR(300)"),
                    ("ocr_engine_used", "VARCHAR(50)"),
                    ("ocr_confidence_avg", "FLOAT"),
                    ("ocr_language_detected", "VARCHAR(10)"),
                ],
            }
            for table, cols in cols_map.items():
                try:
                    existing = [c[1] for c in cursor.execute(f"PRAGMA table_info({table})").fetchall()]
                    for col_name, col_type in cols:
                        if col_name not in existing:
                            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                except Exception:
                    pass

        await conn.run_sync(_migrate)

