"""
Med44 - NOVA CARE AI Backend
Local-first hybrid healthcare assistant combining offline deterministic triage
with optional Groq conversational AI intelligence and rigid shared clinical safety.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.db.database import init_db
from backend.db.seed import seed_database
from backend.routers import (
    auth,
    chat,
    appointments,
    medications,
    profile,
    admin,
    facilities,
    documents,
    journey,
    progress,
    support,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("med44")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Med44 SQLite database & migrations...")
    await init_db()
    logger.info("Checking & applying synthetic seed data...")
    await seed_database()
    logger.info("Med44 clinical backend ready.")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Med44 - Your AI Health Nurse Backend API",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers (both /api prefix and root for seamless client compatibility)
all_routers = [
    auth.router,
    chat.router,
    appointments.router,
    medications.router,
    profile.router,
    admin.router,
    facilities.router,
    documents.router,
    journey.router,
    progress.router,
    support.router,
]
for r in all_routers:
    app.include_router(r, prefix="/api")
    app.include_router(r)


@app.get("/api/health")
@app.get("/health")
async def health_check():
    from backend.ai.groq_client import groq_client
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "groq_available": groq_client.is_available,
        "demo_mode": settings.DEMO_MODE,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
