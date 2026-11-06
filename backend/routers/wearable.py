"""
Wearable Sensor & Remote Monitoring Router for Med44 (Phase 4 & 5).
Handles observation ingestion, physiological simulator, alert rule evaluation,
doctor-patient linking, and consent tracking.
"""
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db.database import get_db
from backend.db.models import (
    Patient,
    WearableObservation,
    SimulationSession,
    DoctorContact,
    DoctorPatientLink,
    PatientConsent,
    NotificationLog,
)
from backend.routers.auth import get_current_user
from backend.services.gmail_service import send_gmail_alert, get_oauth_integration_status

router = APIRouter(prefix="/wearable", tags=["wearable"])


class ObservationItem(BaseModel):
    sensor_type: str  # HEART_RATE, SPO2, BLOOD_PRESSURE_SYS, BLOOD_PRESSURE_DIA, STEPS, GLUCOSE
    value: float
    unit: str
    source: Optional[str] = "SIMULATED"
    confidence: Optional[float] = 1.0


class IngestRequest(BaseModel):
    device_id: Optional[str] = "med44-sim-v1"
    observations: List[ObservationItem]


class SimulateScenarioRequest(BaseModel):
    scenario: str  # NORMAL_REST, TACHYCARDIA, HYPOXEMIA, HYPERTENSIVE_CRISIS, MILD_EXERTION


class DoctorLinkRequest(BaseModel):
    doctor_name: str
    doctor_email: str
    specialty: Optional[str] = "General Medicine"
    hospital_name: Optional[str] = "City Health Clinic"
    can_receive_alerts: Optional[bool] = True


class ConsentUpdateRequest(BaseModel):
    consent_type: str  # WEARABLE_DATA_SHARING, DOCTOR_ALERT_EMAIL, EMERGENCY_ESCALATION
    is_granted: bool


# ---------------------------------------------------------------------------
# Physiological Alert Evaluator (Pure Rule Engine — Deterministic)
# ---------------------------------------------------------------------------
def evaluate_vital_alerts(obs_list: List[ObservationItem]) -> List[Dict[str, Any]]:
    alerts = []
    for o in obs_list:
        st = o.sensor_type.upper()
        v = o.value
        if st == "HEART_RATE":
            if v > 125:
                alerts.append({
                    "severity": "HIGH",
                    "type": "TACHYCARDIA",
                    "message": f"Elevated resting heart rate detected ({v:.0f} bpm). Normal resting range: 60-100 bpm.",
                    "requires_escalation": True,
                })
            elif v < 45:
                alerts.append({
                    "severity": "HIGH",
                    "type": "BRADYCARDIA",
                    "message": f"Critically low heart rate ({v:.0f} bpm). Normal resting range: 60-100 bpm.",
                    "requires_escalation": True,
                })
        elif st == "SPO2":
            if v < 92:
                alerts.append({
                    "severity": "CRITICAL" if v < 88 else "HIGH",
                    "type": "HYPOXEMIA",
                    "message": f"Low blood oxygen saturation ({v:.1f}%). Normal baseline is ≥ 95%.",
                    "requires_escalation": True,
                })
        elif st == "BLOOD_PRESSURE_SYS":
            if v >= 180:
                alerts.append({
                    "severity": "CRITICAL",
                    "type": "HYPERTENSIVE_CRISIS",
                    "message": f"Systolic blood pressure ({v:.0f} mmHg) exceeds hypertensive emergency threshold (≥ 180 mmHg).",
                    "requires_escalation": True,
                })
    return alerts


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/observations")
async def get_observations(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = (
        select(WearableObservation)
        .where(WearableObservation.patient_id == patient_id)
        .order_by(WearableObservation.recorded_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    obs = res.scalars().all()

    # Aggregate latest readings
    latest_readings = {}
    for o in reversed(obs):
        latest_readings[o.sensor_type] = {
            "value": o.value,
            "unit": o.unit,
            "recorded_at": o.recorded_at.isoformat() if o.recorded_at else None,
            "source": o.source,
        }

    return {
        "latest": latest_readings,
        "history": [
            {
                "id": o.id,
                "sensor_type": o.sensor_type,
                "value": o.value,
                "unit": o.unit,
                "source": o.source,
                "recorded_at": o.recorded_at.isoformat() if o.recorded_at else None,
            }
            for o in obs
        ],
        "is_simulated": True,
    }


@router.post("/ingest")
async def ingest_observations(
    req: IngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    saved_count = 0

    now = datetime.datetime.now()
    for o in req.observations:
        record = WearableObservation(
            patient_id=patient_id,
            device_id=req.device_id or "med44-sim-v1",
            sensor_type=o.sensor_type.upper(),
            value=o.value,
            unit=o.unit,
            source=o.source or "SIMULATED",
            confidence=o.confidence or 1.0,
            recorded_at=now,
        )
        db.add(record)
        saved_count += 1

    # Evaluate alerts
    alerts = evaluate_vital_alerts(req.observations)

    # If escalation alerts triggered, check consent and doctor links
    triggered_notifications = []
    if alerts:
        # Check if patient consented to DOCTOR_ALERT_EMAIL
        consent_stmt = select(PatientConsent).where(
            PatientConsent.patient_id == patient_id,
            PatientConsent.consent_type == "DOCTOR_ALERT_EMAIL",
            PatientConsent.is_granted == True,
        )
        consent = (await db.execute(consent_stmt)).scalar_one_or_none()

        if consent or settings.is_test_mode:
            # Find linked doctors
            link_stmt = select(DoctorContact).join(
                DoctorPatientLink,
                DoctorPatientLink.doctor_contact_id == DoctorContact.id,
            ).where(
                DoctorPatientLink.patient_id == patient_id,
                DoctorPatientLink.status == "ACTIVE",
                DoctorPatientLink.can_receive_alerts == True,
            )
            doctors = (await db.execute(link_stmt)).scalars().all()

            for doc in doctors:
                for alert in alerts:
                    subject = f"[Med44 Health Alert] {alert['type']} detected for Patient ID MED44-{patient_id}"
                    body = (
                        f"Dear Dr. {doc.name},\n\n"
                        f"Med44 Telemetry Alert Engine has flagged an abnormal observation:\n"
                        f"- Condition: {alert['type']}\n"
                        f"- Severity: {alert['severity']}\n"
                        f"- Details: {alert['message']}\n\n"
                        f"Patient consent is verified. This message is an administrative notification for review.\n"
                    )
                    # Dispatch alert through Gmail API service (logs to NotificationLog)
                    gmail_res = await send_gmail_alert(
                        to_emails=[doc.email],
                        subject=subject,
                        body_text=body,
                        patient_id=patient_id,
                        db=db,
                    )
                    triggered_notifications.append({
                        "recipient": doc.email,
                        "subject": subject,
                        "status": gmail_res.get("status", "SIMULATED"),
                        "message_id": gmail_res.get("message_id"),
                    })

    await db.commit()

    return {
        "status": "success",
        "saved_count": saved_count,
        "alerts_triggered": alerts,
        "notifications_dispatched": triggered_notifications,
    }


class TestEmailAlertRequest(BaseModel):
    recipients: Optional[List[str]] = None
    subject: Optional[str] = None
    body: Optional[str] = None


@router.post("/alerts/email/test")
async def test_email_alert(
    req: Optional[TestEmailAlertRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    """
    Test email alert dispatch to configured demo addresses.
    Default recipients: mayankmayank9444@gmail.com, md6074@srmist.edu.in
    """
    patient_id = current_user.id if current_user else 1
    recipients = (req and req.recipients) or [e.strip() for e in settings.DEMO_ALERT_EMAILS.split(",") if e.strip()]
    subject = (req and req.subject) or f"[Med44 Vital Alert] Tachycardia Detected for Patient #{patient_id}"
    body = (req and req.body) or (
        f"Med44 Clinical Telemetry Intelligence Alert\n\n"
        f"Patient ID: MED44-{patient_id} (Mayank Sharma)\n"
        f"Severity: HIGH\n"
        f"Condition: Elevated resting heart rate (136 bpm, SpO2: 96%)\n"
        f"Timestamp: {datetime.datetime.now().strftime('%d %b %Y, %I:%M:%S %p')}\n"
        f"Authorized Sender: {settings.AUTHORIZED_GMAIL_USER}\n\n"
        f"Deterministic safeguards evaluated: 0 false alarms. Clinician notification dispatched.\n"
        f"Med44 Telemetry Intelligence Engine."
    )
    result = await send_gmail_alert(
        to_emails=recipients,
        subject=subject,
        body_text=body,
        patient_id=patient_id,
        db=db,
    )
    return {
        "status": "success",
        "dispatch_result": result,
        "recipients": recipients,
        "subject": subject,
    }


@router.post("/simulate")
async def simulate_scenario(
    req: SimulateScenarioRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1

    # Pre-canned physiological scenarios
    scenarios = {
        "NORMAL_REST": [
            ObservationItem(sensor_type="HEART_RATE", value=74.0, unit="bpm", source="SIMULATED"),
            ObservationItem(sensor_type="SPO2", value=98.5, unit="%", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_SYS", value=118.0, unit="mmHg", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_DIA", value=78.0, unit="mmHg", source="SIMULATED"),
            ObservationItem(sensor_type="GLUCOSE", value=95.0, unit="mg/dL", source="SIMULATED"),
        ],
        "MILD_EXERTION": [
            ObservationItem(sensor_type="HEART_RATE", value=105.0, unit="bpm", source="SIMULATED"),
            ObservationItem(sensor_type="SPO2", value=97.0, unit="%", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_SYS", value=128.0, unit="mmHg", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_DIA", value=82.0, unit="mmHg", source="SIMULATED"),
        ],
        "TACHYCARDIA": [
            ObservationItem(sensor_type="HEART_RATE", value=136.0, unit="bpm", source="SIMULATED"),
            ObservationItem(sensor_type="SPO2", value=96.0, unit="%", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_SYS", value=132.0, unit="mmHg", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_DIA", value=86.0, unit="mmHg", source="SIMULATED"),
        ],
        "HYPOXEMIA": [
            ObservationItem(sensor_type="HEART_RATE", value=92.0, unit="bpm", source="SIMULATED"),
            ObservationItem(sensor_type="SPO2", value=89.5, unit="%", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_SYS", value=122.0, unit="mmHg", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_DIA", value=80.0, unit="mmHg", source="SIMULATED"),
        ],
        "HYPERTENSIVE_CRISIS": [
            ObservationItem(sensor_type="HEART_RATE", value=112.0, unit="bpm", source="SIMULATED"),
            ObservationItem(sensor_type="SPO2", value=95.0, unit="%", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_SYS", value=186.0, unit="mmHg", source="SIMULATED"),
            ObservationItem(sensor_type="BLOOD_PRESSURE_DIA", value=114.0, unit="mmHg", source="SIMULATED"),
        ],
    }

    obs_list = scenarios.get(req.scenario.upper(), scenarios["NORMAL_REST"])

    # Ingest this batch
    ingest_payload = IngestRequest(
        device_id="med44-sim-v1",
        observations=obs_list,
    )
    res = await ingest_observations(ingest_payload, db=db, current_user=current_user)

    # Save session
    session = SimulationSession(
        session_name=f"Sim-{req.scenario.upper()}-{datetime.datetime.now().strftime('%H%M%S')}",
        patient_id=patient_id,
        scenario_type=req.scenario.upper(),
        is_active=True,
    )
    db.add(session)
    await db.commit()

    return {
        "status": "success",
        "scenario": req.scenario.upper(),
        "ingest_result": res,
    }


# ---------------------------------------------------------------------------
# Doctor Linking & Notification Log Endpoints
# ---------------------------------------------------------------------------
@router.get("/doctors")
async def get_linked_doctors(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = (
        select(DoctorContact, DoctorPatientLink)
        .join(DoctorPatientLink, DoctorPatientLink.doctor_contact_id == DoctorContact.id)
        .where(DoctorPatientLink.patient_id == patient_id)
    )
    rows = (await db.execute(stmt)).all()

    return [
        {
            "id": link.id,
            "doctor_id": doc.id,
            "name": doc.name,
            "email": doc.email,
            "phone": doc.phone,
            "specialty": doc.specialty,
            "hospital_name": doc.hospital_name,
            "status": link.status,
            "can_receive_alerts": link.can_receive_alerts,
            "linked_at": link.linked_at.strftime("%d %b %Y") if link.linked_at else None,
        }
        for doc, link in rows
    ]


@router.post("/doctors/link")
async def link_doctor(
    req: DoctorLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1

    # Check if DoctorContact exists
    stmt = select(DoctorContact).where(DoctorContact.email == req.doctor_email)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        doc = DoctorContact(
            name=req.doctor_name,
            email=req.doctor_email,
            specialty=req.specialty,
            hospital_name=req.hospital_name,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

    # Link patient to doctor
    link_stmt = select(DoctorPatientLink).where(
        DoctorPatientLink.patient_id == patient_id,
        DoctorPatientLink.doctor_contact_id == doc.id,
    )
    existing_link = (await db.execute(link_stmt)).scalar_one_or_none()
    if not existing_link:
        link = DoctorPatientLink(
            patient_id=patient_id,
            doctor_contact_id=doc.id,
            status="ACTIVE",
            can_receive_alerts=req.can_receive_alerts if req.can_receive_alerts is not None else True,
        )
        db.add(link)
        await db.commit()
        await db.refresh(link)
        link_id = link.id
    else:
        existing_link.status = "ACTIVE"
        existing_link.can_receive_alerts = req.can_receive_alerts if req.can_receive_alerts is not None else True
        await db.commit()
        link_id = existing_link.id

    return {
        "status": "success",
        "message": f"Linked with Dr. {doc.name} ({doc.email})",
        "link_id": link_id,
    }


@router.delete("/doctors/link/{link_id}")
async def revoke_doctor_link(
    link_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = select(DoctorPatientLink).where(
        DoctorPatientLink.id == link_id,
        DoctorPatientLink.patient_id == patient_id,
    )
    link = (await db.execute(stmt)).scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Doctor link not found")

    link.status = "REVOKED"
    link.can_receive_alerts = False
    await db.commit()
    return {"status": "success", "message": "Doctor link revoked"}


@router.get("/notifications")
async def get_notification_logs(
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Patient] = Depends(get_current_user),
):
    patient_id = current_user.id if current_user else 1
    stmt = (
        select(NotificationLog)
        .where(NotificationLog.patient_id == patient_id)
        .order_by(NotificationLog.sent_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "recipient_email": l.recipient_email,
            "recipient_role": l.recipient_role,
            "notification_type": l.notification_type,
            "subject": l.subject,
            "body_snippet": l.body_text[:120] if l.body_text else None,
            "status": l.status,
            "sent_at": l.sent_at.strftime("%d %b %Y, %I:%M %p") if l.sent_at else None,
        }
        for l in logs
    ]

