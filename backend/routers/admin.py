"""
Admin and audit log router for Med44.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import AuditLog, ClinicalRule, HealthArticle

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/audit-logs")
async def get_audit_logs(db: AsyncSession = Depends(get_db)):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(50)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "patient_id": l.patient_id,
            "action": l.action,
            "details": l.details_json,
            "ip_address": l.ip_address,
            "created_at": str(l.created_at),
        }
        for l in logs
    ]


@router.get("/clinical-rules")
async def get_clinical_rules(db: AsyncSession = Depends(get_db)):
    stmt = select(ClinicalRule).where(ClinicalRule.is_active == True)
    res = await db.execute(stmt)
    rules = res.scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "urgency_level": r.urgency_level,
            "source": r.source,
            "version": r.version,
            "review_status": r.review_status,
            "reviewer": r.reviewer,
            "review_date": str(r.review_date) if r.review_date else None,
        }
        for r in rules
    ]
