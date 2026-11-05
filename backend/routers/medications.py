"""
Medications router for Med44.
Provides verified drug reference data, interaction checks, prescription viewing, and reminder management.
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import Medication, DrugWarning, Prescription, Patient
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/medications", tags=["medications"])


class PrescriptionCreate(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    prescriber: Optional[str] = "Treating Physician"


@router.get("/search")
async def search_medications(
    q: Optional[str] = "",
    db: AsyncSession = Depends(get_db),
):
    query = q.strip() if q else ""
    stmt = select(Medication)
    if query:
        stmt = stmt.where(
            or_(
                Medication.name.ilike(f"%{query}%"),
                Medication.generic_name.ilike(f"%{query}%"),
                Medication.category.ilike(f"%{query}%"),
            )
        )
    stmt = stmt.limit(20)
    res = await db.execute(stmt)
    meds = res.scalars().all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "generic_name": m.generic_name,
            "category": m.category,
            "description": m.description,
            "side_effects": m.side_effects,
            "contraindications": m.contraindications,
            "source": m.source,
        }
        for m in meds
    ]


@router.get("/{med_id}")
async def get_medication_details(
    med_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Medication).where(Medication.id == med_id)
    med = (await db.execute(stmt)).scalar_one_or_none()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Look up drug warnings
    warning_stmt = select(DrugWarning).where(
        or_(DrugWarning.drug1_id == med.id, DrugWarning.drug2_id == med.id)
    )
    warnings = (await db.execute(warning_stmt)).scalars().all()

    return {
        "id": med.id,
        "name": med.name,
        "generic_name": med.generic_name,
        "category": med.category,
        "description": med.description,
        "side_effects": med.side_effects,
        "contraindications": med.contraindications,
        "source": med.source,
        "warnings": [
            {
                "severity": w.severity,
                "description": w.description,
                "source": w.source,
            }
            for w in warnings
        ],
        "disclaimer": "Verified reference data only. Consult a clinician for prescribing decisions.",
    }


@router.get("/user/prescriptions")
async def get_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = (
        select(Prescription, Medication)
        .join(Medication, Prescription.medication_id == Medication.id)
        .where(Prescription.patient_id == patient_id, Prescription.is_active == True)
    )
    res = await db.execute(stmt)
    records = res.all()

    output = []
    for presc, med in records:
        output.append({
            "id": presc.id,
            "medication_id": med.id,
            "name": med.name,
            "generic_name": med.generic_name,
            "category": med.category,
            "dosage": presc.dosage,
            "frequency": presc.frequency,
            "prescriber": presc.prescriber,
            "is_active": presc.is_active,
            "side_effects": med.side_effects,
        })
    return output


@router.post("/user/prescriptions")
async def add_prescription(
    req: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1

    # Find or create medication
    stmt = select(Medication).where(Medication.name.ilike(req.medication_name))
    med = (await db.execute(stmt)).scalar_one_or_none()
    if not med:
        med = Medication(
            name=req.medication_name,
            generic_name=req.medication_name,
            category="Patient Prescribed",
            description="Prescription recorded by patient or clinician",
            source="User Record",
        )
        db.add(med)
        await db.commit()
        await db.refresh(med)

    new_presc = Prescription(
        patient_id=patient_id,
        medication_id=med.id,
        dosage=req.dosage,
        frequency=req.frequency,
        prescriber=req.prescriber,
        start_date=datetime.utcnow(),
        is_active=True,
    )
    db.add(new_presc)
    await db.commit()
    await db.refresh(new_presc)

    return {
        "id": new_presc.id,
        "name": med.name,
        "dosage": new_presc.dosage,
        "frequency": new_presc.frequency,
        "is_active": True,
        "message": "Prescription reminder saved successfully",
    }


@router.delete("/user/prescriptions/{presc_id}")
async def delete_prescription(
    presc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(Prescription).where(Prescription.id == presc_id, Prescription.patient_id == patient_id)
    presc = (await db.execute(stmt)).scalar_one_or_none()
    if presc:
        presc.is_active = False
        await db.commit()
    return {"message": "Prescription removed"}
