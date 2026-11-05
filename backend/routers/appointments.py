"""
Appointments router for Med44.
Manages doctor directory, slot queries, booking requests, cancellations, and offline synchronization.
"""
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import Appointment, Doctor, Patient, AuditLog
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/appointments", tags=["appointments"])


class AppointmentCreate(BaseModel):
    doctor_name: str
    specialty: Optional[str] = "General Medicine"
    appointment_date: str  # YYYY-MM-DD or ISO string
    slot_time: str
    notes: Optional[str] = None
    is_offline_queued: Optional[bool] = False


class AppointmentSyncItem(BaseModel):
    doctor_name: str
    specialty: Optional[str] = "General Medicine"
    appointment_date: str
    slot_time: str
    notes: Optional[str] = None
    client_id: Optional[str] = None


@router.get("/doctors")
async def get_doctors(
    specialty: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Doctor).where(Doctor.is_active == True)
    if specialty and specialty.lower() != "all":
        stmt = stmt.where(Doctor.specialty.ilike(f"%{specialty}%"))
    res = await db.execute(stmt)
    doctors = res.scalars().all()
    
    output = []
    for doc in doctors:
        slots = []
        if doc.available_slots_json:
            try:
                slots = json.loads(doc.available_slots_json)
            except Exception:
                slots = ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"]
        output.append({
            "id": doc.id,
            "name": doc.name,
            "specialty": doc.specialty,
            "rating": doc.rating,
            "hospital": doc.hospital,
            "location": doc.location,
            "available_slots": slots,
        })
    return output


@router.get("/doctors/specialties")
async def get_specialties(db: AsyncSession = Depends(get_db)):
    stmt = select(Doctor.specialty).distinct()
    res = await db.execute(stmt)
    specialties = res.scalars().all()
    return list(filter(None, specialties))


@router.get("")
async def get_my_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(Appointment).where(Appointment.patient_id == patient_id).order_by(Appointment.created_at.desc())
    res = await db.execute(stmt)
    apps = res.scalars().all()
    return [
        {
            "id": a.id,
            "doctor_name": a.doctor_name,
            "specialty": a.specialty,
            "appointment_date": a.appointment_date.strftime("%Y-%m-%d") if a.appointment_date else "",
            "slot_time": a.slot_time,
            "status": a.status,
            "notes": a.notes,
            "is_synced": a.is_synced,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "",
        }
        for a in apps
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_appointment(
    req: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1

    try:
        if "T" in req.appointment_date:
            app_date = datetime.fromisoformat(req.appointment_date)
        else:
            app_date = datetime.strptime(req.appointment_date, "%Y-%m-%d")
    except Exception:
        app_date = datetime.utcnow()

    new_app = Appointment(
        patient_id=patient_id,
        doctor_name=req.doctor_name,
        specialty=req.specialty,
        appointment_date=app_date,
        slot_time=req.slot_time,
        status="CONFIRMED" if not req.is_offline_queued else "PENDING",
        notes=req.notes,
        is_synced=True,
    )
    db.add(new_app)
    
    # Audit log
    audit = AuditLog(
        patient_id=patient_id,
        action="BOOK_APPOINTMENT_REQUEST",
        details_json=json.dumps({
            "doctor": req.doctor_name,
            "specialty": req.specialty,
            "slot": req.slot_time,
        }),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_app)

    return {
        "id": new_app.id,
        "doctor_name": new_app.doctor_name,
        "specialty": new_app.specialty,
        "appointment_date": new_app.appointment_date.strftime("%Y-%m-%d"),
        "slot_time": new_app.slot_time,
        "status": new_app.status,
        "notes": new_app.notes,
        "is_synced": True,
        "notice": "Simulated booking confirmed for demonstration purposes."
    }


@router.put("/{app_id}")
async def update_appointment(
    app_id: int,
    status_update: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    new_status = status_update.get("status", "CONFIRMED")
    
    stmt = (
        update(Appointment)
        .where(Appointment.id == app_id, Appointment.patient_id == patient_id)
        .values(status=new_status)
    )
    res = await db.execute(stmt)
    await db.commit()
    return {"id": app_id, "status": new_status, "updated": True}


@router.delete("/{app_id}")
async def cancel_appointment(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = (
        update(Appointment)
        .where(Appointment.id == app_id, Appointment.patient_id == patient_id)
        .values(status="CANCELLED")
    )
    await db.execute(stmt)
    await db.commit()
    return {"id": app_id, "status": "CANCELLED", "message": "Appointment cancelled successfully"}


@router.post("/sync")
async def sync_offline_appointments(
    items: List[AppointmentSyncItem],
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    """Sync appointments created on client while offline."""
    patient_id = current_user.id if current_user else 1
    synced = []
    for item in items:
        try:
            app_date = datetime.strptime(item.appointment_date, "%Y-%m-%d")
        except Exception:
            app_date = datetime.utcnow()
        new_app = Appointment(
            patient_id=patient_id,
            doctor_name=item.doctor_name,
            specialty=item.specialty,
            appointment_date=app_date,
            slot_time=item.slot_time,
            status="CONFIRMED",
            notes=f"[Offline Synced] {item.notes or ''}",
            is_synced=True,
        )
        db.add(new_app)
        synced.append(item.doctor_name)

    await db.commit()
    return {"synced_count": len(synced), "doctors": synced, "status": "SYNC_SUCCESS"}
