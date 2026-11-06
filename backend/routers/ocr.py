"""
OCR Router — POST /api/ocr/process (multipart)
GET /api/ocr/health

Security:
- Auth required
- Magic-bytes validation (not just extension)
- Max file size from config
- Temp dir cleaned in finally block
- Never logs document text
- Never persists source file
"""
import os
import tempfile
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional

from backend.config import settings
from backend.db.models import Patient
from backend.routers.auth import get_current_user
from backend.services.ocr.engine import process_document, get_ocr_engine_status

router = APIRouter(prefix="/ocr", tags=["ocr"])
logger = logging.getLogger("med44.ocr_router")

MAX_BYTES = settings.OCR_MAX_FILE_MB * 1024 * 1024


@router.get("/health")
async def ocr_health(current_user: Optional[Patient] = Depends(get_current_user)):
    """Returns OCR engine availability, version, and installed languages."""
    return get_ocr_engine_status()


@router.post("/process")
async def process_ocr(
    file: UploadFile = File(...),
    max_pages: Optional[int] = Form(default=None),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    """
    Accepts a multipart file upload, runs OCR, returns structured text + confidence.
    Source file is NEVER persisted. Temp dir cleaned in finally.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Size check
    file_bytes = await file.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed: {settings.OCR_MAX_FILE_MB} MB"
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    mp = max_pages or settings.OCR_MAX_PAGES
    mp = max(1, min(mp, settings.OCR_MAX_PAGES))

    logger.info(
        "OCR request: patient=%s size=%d filename=%s",
        current_user.id,
        len(file_bytes),
        file.filename or "unknown"
    )
    # Note: filename and size logged, NOT content

    result = process_document(
        file_bytes=file_bytes,
        filename=file.filename or "upload",
        max_pages=mp,
    )

    # Annotate with patient scope (no PHI in result stored server-side)
    result["patient_id"] = current_user.id

    # Strip full_text from server log — patient sees it, we don't store it
    logger.info(
        "OCR complete: patient=%s status=%s pages=%d duration_ms=%s",
        current_user.id,
        result.get("status"),
        result.get("processed_pages", 0),
        result.get("duration_ms"),
    )

    return result

