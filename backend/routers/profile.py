"""
Profile, Medical History, and Patient Survey Router for Med44.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import Patient, MedicalHistory, Prescription, Medication
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    avatar: Optional[str] = None
    avatar_type: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    language_pref: Optional[str] = None


class SurveySubmission(BaseModel):
    name: str
    age: Optional[int] = 28
    gender: Optional[str] = "Female"
    avatar: Optional[str] = "female"
    avatar_type: Optional[str] = "female"
    height_cm: Optional[float] = 168.0
    weight_kg: Optional[float] = 65.0
    blood_group: Optional[str] = "B+"
    chronic_conditions: Optional[str] = None
    past_surgeries: Optional[str] = None
    family_history: Optional[str] = None
    vaccinations: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    lifestyle: Optional[Dict[str, Any]] = None
    emergency_contact: Optional[str] = None
    language_pref: Optional[str] = "en"
    health_score: Optional[int] = 85
    has_completed_survey: Optional[bool] = True


class HistoryItemCreate(BaseModel):
    condition: str
    notes: Optional[str] = None


@router.get("")
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(Patient).where(Patient.id == patient_id)
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        return {
            "id": 1,
            "name": "Mayank Sharma",
            "email": "demo@med44.ai",
            "age": 29,
            "gender": "Male",
            "avatar": "male",
            "blood_group": "B+",
            "allergies": "Penicillin",
            "language_pref": "en",
            "has_completed_survey": True,
            "health_score": 85,
        }
    return {
        "id": p.id,
        "name": p.name,
        "email": p.email,
        "age": p.age,
        "gender": p.gender,
        "avatar": "male" if p.gender == "Male" else "female",
        "blood_group": p.blood_group,
        "allergies": p.allergies,
        "language_pref": p.language_pref,
        "has_completed_survey": True,
    }


@router.put("")
async def update_profile(
    req: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(Patient).where(Patient.id == patient_id)
    p = (await db.execute(stmt)).scalar_one_or_none()
    if p:
        if req.name is not None:
            p.name = req.name
        if req.age is not None:
            p.age = req.age
        if req.gender is not None:
            p.gender = req.gender
        if req.blood_group is not None:
            p.blood_group = req.blood_group
        if req.allergies is not None:
            p.allergies = req.allergies
        if req.language_pref is not None:
            p.language_pref = req.language_pref
        await db.commit()
        await db.refresh(p)
    return {"status": "success", "message": "Profile updated successfully"}


@router.post("/survey")
async def submit_patient_survey(
    req: SurveySubmission,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    """
    Saves multi-step onboarding intake survey data into SQLite.
    Populates medical history and active medication records.
    """
    patient_id = current_user.id if current_user else 1
    stmt = select(Patient).where(Patient.id == patient_id)
    p = (await db.execute(stmt)).scalar_one_or_none()

    if p:
        p.name = req.name
        p.age = req.age
        p.gender = req.gender
        p.blood_group = req.blood_group
        p.allergies = req.allergies
        p.language_pref = req.language_pref or "en"

    # Add chronic conditions to MedicalHistory if provided
    if req.chronic_conditions and req.chronic_conditions != "None":
        for cond in req.chronic_conditions.split(","):
            c = cond.strip()
            if c and c.lower() != "none":
                hist = MedicalHistory(
                    patient_id=patient_id,
                    condition=c,
                    notes="Reported during Med44 patient onboarding survey",
                )
                db.add(hist)

    # Add medications if provided
    if req.current_medications and req.current_medications.strip() and req.current_medications.lower() != "none":
        # Ensure medication entry exists
        med_name = req.current_medications.split(",")[0].strip()
        stmt_med = select(Medication).where(Medication.name.ilike(med_name))
        med = (await db.execute(stmt_med)).scalar_one_or_none()
        if not med:
            med = Medication(
                name=med_name,
                generic_name=med_name,
                category="Patient Reported",
                description="Prescription recorded in patient survey",
                source="Patient Intake Survey",
            )
            db.add(med)
            await db.flush()

        presc = Prescription(
            patient_id=patient_id,
            medication_id=med.id,
            dosage="As prescribed",
            frequency="Daily",
            prescriber="Primary Clinician",
            is_active=True,
        )
        db.add(presc)

    await db.commit()

    return {
        "status": "success",
        "has_completed_survey": True,
        "health_score": req.health_score,
        "message": "Survey recorded and medical baseline created successfully! 🌿",
    }


@router.get("/report")
async def generate_health_report(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    
    # 1. Patient info
    stmt_p = select(Patient).where(Patient.id == patient_id)
    p = (await db.execute(stmt_p)).scalar_one_or_none()
    
    # 2. Medical history (kya kya dikkat)
    stmt_h = select(MedicalHistory).where(MedicalHistory.patient_id == patient_id)
    history_items = (await db.execute(stmt_h)).scalars().all()
    
    # 3. Medications (konsa medical)
    stmt_m = (
        select(Prescription, Medication)
        .join(Medication, Prescription.medication_id == Medication.id)
        .where(Prescription.patient_id == patient_id)
    )
    presc_results = (await db.execute(stmt_m)).all()
    
    # 4. Appointments
    from backend.db.models import Appointment, Conversation, ConversationMessage
    stmt_a = (
        select(Appointment)
        .where(Appointment.patient_id == patient_id)
        .order_by(Appointment.created_at.desc())
        .limit(5)
    )
    appts = (await db.execute(stmt_a)).scalars().all()
    
    # 5. Recent triage chats (recent kya dikkat aayi)
    stmt_c = (
        select(Conversation)
        .where(Conversation.patient_id == patient_id)
        .order_by(Conversation.started_at.desc())
        .limit(3)
    )
    convs = (await db.execute(stmt_c)).scalars().all()
    recent_triage = []
    for c in convs:
        stmt_msg = (
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == c.id)
            .order_by(ConversationMessage.created_at.asc())
        )
        msgs = (await db.execute(stmt_msg)).scalars().all()
        user_msgs = [m.content for m in msgs if m.role == "user"]
        asst_msgs = [m.content for m in msgs if m.role == "assistant"]
        if user_msgs:
            recent_triage.append({
                "date": str(c.started_at)[:16] if c.started_at else "Recent",
                "patient_reported": " | ".join(user_msgs[:2]),
                "clinical_assessment": asst_msgs[-1][:300] if asst_msgs else "Recorded in Med44 triage.",
                "mode": c.mode,
            })

    from datetime import datetime
    return {
        "report_id": f"MED44-HC-{datetime.now().strftime('%Y%m%d%H%M')}-{patient_id}",
        "generated_at": datetime.now().strftime("%d %B %Y, %I:%M %p"),
        "patient": {
            "id": p.id if p else 1,
            "name": p.name if p else "Mayank Sharma",
            "age": p.age if p else 29,
            "gender": p.gender if p else "Male",
            "blood_group": p.blood_group if p else "B+",
            "allergies": p.allergies if p else "None reported",
        },
        "medical_history": [
            {"condition": h.condition, "notes": h.notes}
            for h in history_items
        ],
        "medications": [
            {
                "name": med.name,
                "dosage": pr.dosage or "As prescribed",
                "frequency": pr.frequency or "Daily",
                "prescriber": pr.prescriber or "Consulting Physician",
                "is_active": pr.is_active,
            }
            for pr, med in presc_results
        ],
        "recent_triage": recent_triage,
        "recent_appointments": [
            {
                "doctor": a.doctor_name,
                "specialty": a.specialty or "General",
                "date": str(a.appointment_date)[:10],
                "time": a.slot_time or "Scheduled",
                "status": a.status,
            }
            for a in appts
        ],
        "disclaimer": "This clinical summary report is automatically generated by Med44 AI Health Nurse for healthcare records and reference. Always consult a qualified medical professional for diagnosis.",
    }


@router.get("/history")
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(MedicalHistory).where(MedicalHistory.patient_id == patient_id)
    res = await db.execute(stmt)
    history = res.scalars().all()
    return [
        {
            "id": h.id,
            "condition": h.condition,
            "diagnosed_date": str(h.diagnosed_date) if h.diagnosed_date else "Verified",
            "notes": h.notes,
        }
        for h in history
    ]


@router.post("/history")
async def add_history(
    req: HistoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    new_item = MedicalHistory(
        patient_id=patient_id,
        condition=req.condition,
        notes=req.notes,
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return {"id": new_item.id, "condition": new_item.condition, "status": "added"}
