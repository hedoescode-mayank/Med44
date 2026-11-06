"""
Patient Document & Referral Manager Router for Med44 (PS3 Modules 4, 5, 11).
Supports document upload, OCR draft extraction, uncertain-field flagging,
original document preview, and patient verification status.
"""
import json
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import PatientDocument, Patient
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentUploadRequest(BaseModel):
    title: str
    category: str  # Prescription, Referral, Lab Report, Discharge Summary, Insurance
    file_type: Optional[str] = "image"
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    content_sha256: Optional[str] = None
    storage_ref: Optional[str] = None
    notes: Optional[str] = None
    ocr_extracted_text: Optional[str] = None
    ocr_status: Optional[str] = "NOT_PROCESSED"
    ocr_engine_used: Optional[str] = None
    ocr_confidence_avg: Optional[float] = None
    uncertain_fields: Optional[List[dict]] = None
    raw_ocr_simulation: Optional[str] = None


class DocumentVerifyRequest(BaseModel):
    verified_text: str
    notes: Optional[str] = None


REQUIRED_REFERRAL_CHECKLIST = [
    {"category": "Referral", "name": "Specialist Referral Letter", "description": "Required by tertiary OPDs for sub-specialty clinics (e.g. Cardiology, Neurology)"},
    {"category": "Prescription", "name": "Current Active Prescriptions", "description": "Recent prescription from treating physician documenting ongoing doses"},
    {"category": "Lab Report", "name": "Recent Diagnostic & Pathology Reports", "description": "CBC, Lipid profile, or imaging from the past 3-6 months"},
    {"category": "Insurance", "name": "Government Health ID / Insurance Card", "description": "ABHA card or health insurance claim e-card"},
]


@router.get("")
async def get_patient_documents(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = (
        select(PatientDocument)
        .where(PatientDocument.patient_id == patient_id)
        .order_by(PatientDocument.uploaded_at.desc())
    )
    docs = (await db.execute(stmt)).scalars().all()

    uploaded_categories = set(d.category for d in docs)

    # Checklist status
    checklist_status = []
    for req in REQUIRED_REFERRAL_CHECKLIST:
        matching_doc = next((d for d in docs if d.category == req["category"]), None)
        status_val = "VERIFIED" if matching_doc and matching_doc.verified_by_patient else "UPLOADED" if matching_doc else "MISSING"
        checklist_status.append({
            "name": req["name"],
            "category": req["category"],
            "description": req["description"],
            "status": status_val,
            "document_id": matching_doc.id if matching_doc else None,
        })

    output_docs = []
    for d in docs:
        uncertain_fields = []
        if d.uncertain_fields_json:
            try:
                uncertain_fields = json.loads(d.uncertain_fields_json)
            except Exception:
                pass

        output_docs.append({
            "id": d.id,
            "title": d.title,
            "category": d.category,
            "file_name": d.file_name or d.title,
            "file_url": d.file_url,
            "file_type": d.file_type or "image",
            "storage_ref": d.storage_ref,
            "size_bytes": d.size_bytes,
            "content_sha256": d.content_sha256,
            "status": d.status,
            "ocr_extracted_text": d.ocr_extracted_text,
            "ocr_status": d.ocr_status,
            "ocr_engine_used": d.ocr_engine_used,
            "ocr_confidence_avg": d.ocr_confidence_avg,
            "uncertain_fields": uncertain_fields,
            "verified_by_patient": d.verified_by_patient,
            "notes": d.notes,
            "uploaded_at": d.uploaded_at.strftime("%d %b %Y, %I:%M %p") if d.uploaded_at else "Recently",
            "verified_at": d.verified_at.strftime("%d %b %Y") if d.verified_at else None,
        })

    return {
        "documents": output_docs,
        "referral_checklist": checklist_status,
        "total_documents": len(output_docs),
    }


@router.post("/upload")
async def upload_document(
    req: DocumentUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1

    # Real OCR text handling (NO fabricated fake prescription text)
    ocr_text = req.ocr_extracted_text or req.raw_ocr_simulation
    ocr_status = req.ocr_status or ("DRAFT" if ocr_text else "NOT_PROCESSED")

    uncertain_fields = req.uncertain_fields or []

    new_doc = PatientDocument(
        patient_id=patient_id,
        title=req.title,
        category=req.category,
        file_name=req.file_name or req.title,
        mime_type=req.mime_type or "image/jpeg",
        size_bytes=req.size_bytes or 0,
        content_sha256=req.content_sha256,
        storage_ref=req.storage_ref,
        file_url=req.file_url,
        file_type=req.file_type or "image",
        status="UPLOADED",
        ocr_extracted_text=ocr_text,
        ocr_status=ocr_status,
        ocr_engine_used=req.ocr_engine_used,
        ocr_confidence_avg=req.ocr_confidence_avg,
        uncertain_fields_json=json.dumps(uncertain_fields),
        verified_by_patient=False,
        notes=req.notes,
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)

    return {
        "status": "success",
        "message": "Document registered in patient record." if not ocr_text else "Document uploaded with draft OCR text. Please verify accuracy against the original source.",
        "document_id": new_doc.id,
        "ocr_status": new_doc.ocr_status,
        "uncertain_fields_count": len(uncertain_fields),
        "storage_ref": new_doc.storage_ref,
    }


@router.put("/{id}/verify")
async def verify_document_text(
    id: int,
    req: DocumentVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(PatientDocument).where(PatientDocument.id == id, PatientDocument.patient_id == patient_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or unauthorized")

    doc.ocr_extracted_text = req.verified_text
    doc.verified_by_patient = True
    doc.status = "VERIFIED"
    doc.ocr_status = "VERIFIED"
    doc.uncertain_fields_json = "[]"
    doc.verified_at = datetime.datetime.now()
    if req.notes:
        doc.notes = req.notes

    await db.commit()

    return {
        "status": "verified",
        "message": "Prescription / Document instructions verified by patient. Medication reminders can now be securely activated.",
        "document_id": doc.id,
    }


@router.delete("/{id}")
async def delete_document(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(PatientDocument).where(PatientDocument.id == id, PatientDocument.patient_id == patient_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    await db.commit()

    return {"status": "deleted", "document_id": id}

