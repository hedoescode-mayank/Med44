"""
Med44 - Support & Human Escalation Router (PS3 Module 8)
Allows patients to report inaccurate facility information, raise booking/requirement
conflicts, and get administrative human support.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.db.database import get_db
from backend.db.models import SupportTicket, Patient
from backend.routers.auth import get_current_patient

router = APIRouter(prefix="/support", tags=["Support & Escalation"])


class TicketCreate(BaseModel):
    ticket_type: str  # INACCURATE_FACILITY_INFO, CONFLICTING_REQUIREMENTS, BOOKING_ISSUE, GENERAL_ASSISTANCE
    subject: str
    description: str
    facility_id: Optional[int] = None


class TicketOut(BaseModel):
    id: int
    patient_id: int
    facility_id: Optional[int]
    ticket_type: str
    subject: str
    description: str
    status: str
    resolution_notes: Optional[str]
    created_at: datetime
    updated_at: datetime


@router.get("/tickets", response_model=List[TicketOut])
async def list_support_tickets(
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """List all support tickets created by the current patient."""
    stmt = (
        select(SupportTicket)
        .where(SupportTicket.patient_id == current_patient.id)
        .order_by(desc(SupportTicket.created_at))
    )
    result = await db.execute(stmt)
    tickets = result.scalars().all()
    return [
        TicketOut(
            id=t.id,
            patient_id=t.patient_id,
            facility_id=t.facility_id,
            ticket_type=t.ticket_type,
            subject=t.subject,
            description=t.description,
            status=t.status,
            resolution_notes=t.resolution_notes,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in tickets
    ]


@router.post("/tickets", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_support_ticket(
    payload: TicketCreate,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """File a human support / escalation ticket."""
    valid_types = [
        "INACCURATE_FACILITY_INFO",
        "CONFLICTING_REQUIREMENTS",
        "BOOKING_ISSUE",
        "GENERAL_ASSISTANCE",
    ]
    if payload.ticket_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ticket_type. Must be one of: {', '.join(valid_types)}",
        )

    ticket = SupportTicket(
        patient_id=current_patient.id,
        facility_id=payload.facility_id,
        ticket_type=payload.ticket_type,
        subject=payload.subject.strip(),
        description=payload.description.strip(),
        status="OPEN",
        resolution_notes="Ticket received. Med44 patient care coordinator will review within 24 hours.",
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return TicketOut(
        id=ticket.id,
        patient_id=ticket.patient_id,
        facility_id=ticket.facility_id,
        ticket_type=ticket.ticket_type,
        subject=ticket.subject,
        description=ticket.description,
        status=ticket.status,
        resolution_notes=ticket.resolution_notes,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


@router.get("/tickets/{ticket_id}", response_model=TicketOut)
async def get_support_ticket(
    ticket_id: int,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of a specific ticket."""
    stmt = select(SupportTicket).where(
        SupportTicket.id == ticket_id,
        SupportTicket.patient_id == current_patient.id,
    )
    result = await db.execute(stmt)
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    return TicketOut(
        id=ticket.id,
        patient_id=ticket.patient_id,
        facility_id=ticket.facility_id,
        ticket_type=ticket.ticket_type,
        subject=ticket.subject,
        description=ticket.description,
        status=ticket.status,
        resolution_notes=ticket.resolution_notes,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )
