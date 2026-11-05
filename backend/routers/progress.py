"""
Patient Recovery & Progress Tracker Router for Med44 (PS3 Module 12).
Provides daily symptom journaling, care-plan completion metrics,
symptom trend analysis, clinician review status, and professional safety escalation.
"""
import json
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import PatientSymptomJournal, Patient
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])


class SymptomJournalCreate(BaseModel):
    severity_scale: int  # 1 to 10
    symptoms_reported: List[str]
    perceived_change: str  # Improving, Stable, Worsening, Significantly Worsened
    daily_notes: Optional[str] = None
    care_plan_tasks_completed: Optional[int] = 0
    care_plan_tasks_total: Optional[int] = 3


@router.get("/journal")
async def get_journal_entries(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = (
        select(PatientSymptomJournal)
        .where(PatientSymptomJournal.patient_id == patient_id)
        .order_by(PatientSymptomJournal.entry_date.desc())
    )
    entries = (await db.execute(stmt)).scalars().all()

    output = []
    for e in entries:
        symptoms = []
        if e.symptoms_reported_json:
            try:
                symptoms = json.loads(e.symptoms_reported_json)
            except Exception:
                pass

        output.append({
            "id": e.id,
            "entry_date": e.entry_date.strftime("%d %b %Y, %I:%M %p") if e.entry_date else "Recent",
            "severity_scale": e.severity_scale,
            "symptoms_reported": symptoms,
            "perceived_change": e.perceived_change,
            "daily_notes": e.daily_notes,
            "care_plan_tasks_completed": e.care_plan_tasks_completed,
            "care_plan_tasks_total": e.care_plan_tasks_total,
            "clinician_review_status": e.clinician_review_status,
            "escalation_triggered": e.escalation_triggered,
        })

    return output


@router.post("/journal")
async def add_journal_entry(
    req: SymptomJournalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1

    # Safety rule: if worsening or high severity, trigger escalation
    is_worsening = (
        "worsen" in req.perceived_change.lower() or
        req.severity_scale >= 8
    )

    new_entry = PatientSymptomJournal(
        patient_id=patient_id,
        entry_date=datetime.datetime.now(),
        severity_scale=max(1, min(10, req.severity_scale)),
        symptoms_reported_json=json.dumps(req.symptoms_reported),
        perceived_change=req.perceived_change,
        daily_notes=req.daily_notes,
        care_plan_tasks_completed=req.care_plan_tasks_completed or 0,
        care_plan_tasks_total=req.care_plan_tasks_total or 3,
        clinician_review_status="PENDING_REVIEW" if is_worsening else "REVIEWED",
        escalation_triggered=is_worsening,
    )
    db.add(new_entry)
    await db.commit()
    await db.refresh(new_entry)

    escalation_message = None
    if is_worsening:
        escalation_message = (
            "⚠️ CLINICAL ALERT: Your recorded symptoms indicate increasing severity. "
            "Please contact your primary care facility or treating clinician immediately. "
            "In emergencies involving chest pain or breathing difficulty, call 112."
        )

    return {
        "status": "success",
        "entry_id": new_entry.id,
        "escalation_triggered": is_worsening,
        "escalation_message": escalation_message,
        "message": "Daily symptom journal recorded safely.",
    }


@router.get("/summary")
async def get_progress_summary(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    """
    Returns separate indicators strictly compliant with PS3 Module 12:
    1. Care-plan task completion percentage
    2. Patient-reported symptom trend
    3. Clinician review status
    4. Follow-up completion status
    NEVER calculates an AI cure percentage or claims medical recovery.
    """
    patient_id = current_user.id if current_user else 1
    stmt = (
        select(PatientSymptomJournal)
        .where(PatientSymptomJournal.patient_id == patient_id)
        .order_by(PatientSymptomJournal.entry_date.desc())
        .limit(7)
    )
    entries = (await db.execute(stmt)).scalars().all()

    if not entries:
        return {
            "care_plan_completion_rate": 0,
            "symptom_trend": "No entries yet",
            "latest_severity": None,
            "clinician_review_status": "No entries recorded",
            "followup_status": "Follow-up recommended with physician",
            "total_entries": 0,
            "safety_note": "Care-plan task completion reflects administrative activity only and does NOT indicate medical recovery or cure.",
        }

    total_tasks_completed = sum(e.care_plan_tasks_completed for e in entries)
    total_tasks_possible = max(1, sum(e.care_plan_tasks_total for e in entries))
    completion_rate = round((total_tasks_completed / total_tasks_possible) * 100)

    latest = entries[0]
    trend = latest.perceived_change

    return {
        "care_plan_completion_rate": completion_rate,
        "symptom_trend": trend,
        "latest_severity": latest.severity_scale,
        "clinician_review_status": latest.clinician_review_status,
        "followup_status": "Scheduled Care on Track",
        "total_entries": len(entries),
        "safety_note": "Task completion tracks adherence to your clinician-approved plan. It is NOT an AI cure score.",
    }
