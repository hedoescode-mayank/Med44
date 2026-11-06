"""
SQLAlchemy async models for Med44 / Nova Care AI.
All seed data is explicitly marked SYNTHETIC.
"""
import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, func,
)
from sqlalchemy.orm import relationship

from backend.db.database import Base


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------
class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String(200), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    allergies = Column(Text, nullable=True)          # comma-separated
    language_pref = Column(String(10), default="en")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    medical_history = relationship("MedicalHistory", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    conversations = relationship("Conversation", back_populates="patient")
    audit_logs = relationship("AuditLog", back_populates="patient")
    documents = relationship("PatientDocument", back_populates="patient")
    symptom_journals = relationship("PatientSymptomJournal", back_populates="patient")
    journey_progress = relationship("PatientJourneyProgress", back_populates="patient")
    support_tickets = relationship("SupportTicket", back_populates="patient")


# ---------------------------------------------------------------------------
# Symptoms
# ---------------------------------------------------------------------------
class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(String(80), nullable=True)
    severity_weight = Column(Float, default=1.0)
    created_at = Column(DateTime, default=func.now())

    aliases = relationship("SymptomAlias", back_populates="symptom")
    followup_questions = relationship("FollowupQuestion", back_populates="symptom")


class SymptomAlias(Base):
    __tablename__ = "symptom_aliases"

    id = Column(Integer, primary_key=True, index=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False)
    alias = Column(String(200), nullable=False)
    language = Column(String(5), default="en")  # en / hi / ta
    created_at = Column(DateTime, default=func.now())

    symptom = relationship("Symptom", back_populates="aliases")


# ---------------------------------------------------------------------------
# Clinical Rules
# ---------------------------------------------------------------------------
class ClinicalRule(Base):
    __tablename__ = "clinical_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    symptoms_json = Column(Text, nullable=False)        # JSON list of symptom names
    action = Column(Text, nullable=False)
    urgency_level = Column(String(10), default="GREEN") # GREEN / YELLOW / RED
    source = Column(String(200), nullable=True)
    version = Column(String(20), default="1.0")
    review_status = Column(String(30), default="PENDING")
    reviewer = Column(String(100), nullable=True)
    review_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)


# ---------------------------------------------------------------------------
# Red Flags
# ---------------------------------------------------------------------------
class RedFlag(Base):
    __tablename__ = "red_flags"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String(200), nullable=False)
    language = Column(String(5), default="en")
    urgency = Column(String(20), default="HIGH")  # CRITICAL / HIGH
    action = Column(Text, nullable=False)
    source = Column(String(200), nullable=True)


# ---------------------------------------------------------------------------
# Followup Questions
# ---------------------------------------------------------------------------
class FollowupQuestion(Base):
    __tablename__ = "followup_questions"

    id = Column(Integer, primary_key=True, index=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False)
    question_en = Column(Text, nullable=False)
    question_hi = Column(Text, nullable=True)
    question_ta = Column(Text, nullable=True)
    field_name = Column(String(80), nullable=False)
    is_required = Column(Boolean, default=False)

    symptom = relationship("Symptom", back_populates="followup_questions")


# ---------------------------------------------------------------------------
# Health Articles
# ---------------------------------------------------------------------------
class HealthArticle(Base):
    __tablename__ = "health_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(80), nullable=True)
    source = Column(String(200), nullable=True)
    version = Column(String(20), default="1.0")
    review_status = Column(String(30), default="PENDING")
    reviewer = Column(String(100), nullable=True)
    review_date = Column(DateTime, nullable=True)


# ---------------------------------------------------------------------------
# Medications
# ---------------------------------------------------------------------------
class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False, index=True)
    generic_name = Column(String(150), nullable=True)
    category = Column(String(80), nullable=True)
    description = Column(Text, nullable=True)
    side_effects = Column(Text, nullable=True)
    contraindications = Column(Text, nullable=True)
    source = Column(String(200), nullable=True)

    prescriptions = relationship("Prescription", back_populates="medication")


class DrugWarning(Base):
    __tablename__ = "drug_warnings"

    id = Column(Integer, primary_key=True, index=True)
    drug1_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    drug2_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    severity = Column(String(20), nullable=False)   # MILD / MODERATE / SEVERE
    description = Column(Text, nullable=False)
    source = Column(String(200), nullable=True)


# ---------------------------------------------------------------------------
# Medical History
# ---------------------------------------------------------------------------
class MedicalHistory(Base):
    __tablename__ = "medical_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    condition = Column(String(200), nullable=False)
    diagnosed_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    patient = relationship("Patient", back_populates="medical_history")


# ---------------------------------------------------------------------------
# Prescriptions
# ---------------------------------------------------------------------------
class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    dosage = Column(String(80), nullable=True)
    frequency = Column(String(80), nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    prescriber = Column(String(150), nullable=True)
    is_active = Column(Boolean, default=True)

    patient = relationship("Patient", back_populates="prescriptions")
    medication = relationship("Medication", back_populates="prescriptions")


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    facility_id = Column(Integer, ForeignKey("healthcare_facilities.id"), nullable=True)
    facility_name = Column(String(200), nullable=True)
    doctor_name = Column(String(150), nullable=False)
    specialty = Column(String(100), nullable=True)
    appointment_date = Column(DateTime, nullable=False)
    slot_time = Column(String(20), nullable=True)
    status = Column(String(20), default="PENDING")  # PENDING / CONFIRMED / CANCELLED
    queue_token = Column(String(50), nullable=True)
    is_simulated = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    is_synced = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    patient = relationship("Patient", back_populates="appointments")
    facility = relationship("HealthcareFacility", back_populates="appointments")


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    mode = Column(String(20), default="offline")  # offline / online
    language = Column(String(5), default="en")
    started_at = Column(DateTime, default=func.now())
    ended_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="conversations")
    messages = relationship("ConversationMessage", back_populates="conversation")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)       # user / assistant
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)     # JSON blob
    created_at = Column(DateTime, default=func.now())

    conversation = relationship("Conversation", back_populates="messages")


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    action = Column(String(200), nullable=False)
    details_json = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now())

    patient = relationship("Patient", back_populates="audit_logs")


# ---------------------------------------------------------------------------
# Doctors
# ---------------------------------------------------------------------------
class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    specialty = Column(String(100), nullable=False)
    rating = Column(Float, default=4.0)
    hospital = Column(String(200), nullable=True)
    facility_id = Column(Integer, ForeignKey("healthcare_facilities.id"), nullable=True)
    location = Column(String(200), nullable=True)
    available_slots_json = Column(Text, nullable=True)  # JSON list of slot strings
    is_active = Column(Boolean, default=True)

    facility = relationship("HealthcareFacility", back_populates="doctors")


# ---------------------------------------------------------------------------
# Healthcare Facilities (PS3 Module 1)
# ---------------------------------------------------------------------------
class HealthcareFacility(Base):
    __tablename__ = "healthcare_facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    facility_type = Column(String(80), nullable=False, default="Hospital")  # Hospital, Clinic, Diagnostic Lab, Specialty
    address = Column(String(250), nullable=False)
    city = Column(String(100), nullable=False, default="New Delhi")
    contact_number = Column(String(30), nullable=False)
    operating_hours = Column(String(100), default="24/7 or 08:00 AM - 08:00 PM")
    services_offered_json = Column(Text, nullable=False)        # JSON list of service strings
    supported_languages_json = Column(Text, nullable=False)     # JSON list: ["English", "Hindi", "Tamil"]
    accessibility_features_json = Column(Text, nullable=False)  # JSON list: ["Wheelchair Accessible", "Ramp Entry", "Elevators"]
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    source = Column(String(200), default="State Health Registry (Verified)")
    last_verified = Column(DateTime, default=func.now())
    is_verified = Column(Boolean, default=True)

    doctors = relationship("Doctor", back_populates="facility")
    appointments = relationship("Appointment", back_populates="facility")


# ---------------------------------------------------------------------------
# Patient Documents & Prescriptions OCR (PS3 Module 4, 5, 11)
# ---------------------------------------------------------------------------
class PatientDocument(Base):
    __tablename__ = "patient_documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    title = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)  # Prescription, Referral, Lab Report, Discharge Summary, Insurance
    file_url = Column(String(500), nullable=True)
    file_type = Column(String(20), default="image")
    file_name = Column(String(255), nullable=True)
    mime_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    content_sha256 = Column(String(64), nullable=True)
    storage_ref = Column(String(300), nullable=True)
    status = Column(String(30), default="UPLOADED")  # PENDING, UPLOADED, VERIFIED, FLAGGED_FOR_REVIEW
    ocr_extracted_text = Column(Text, nullable=True)
    ocr_status = Column(String(30), default="NOT_PROCESSED")  # NOT_PROCESSED, DRAFT, VERIFIED, UNAVAILABLE
    ocr_engine_used = Column(String(50), nullable=True)
    ocr_confidence_avg = Column(Float, nullable=True)
    ocr_language_detected = Column(String(10), nullable=True)
    uncertain_fields_json = Column(Text, nullable=True)       # JSON list of handwritten/uncertain terms
    verified_by_patient = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=func.now())
    verified_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="documents")


# ---------------------------------------------------------------------------
# Care Journey Templates & Interactive Flowcharts (PS3 Module 9, 10, 13)
# ---------------------------------------------------------------------------
class CareJourneyTemplate(Base):
    __tablename__ = "care_journey_templates"

    id = Column(String(50), primary_key=True)  # e.g. "dental_care", "acute_infection", "respiratory_care", "cardiac_eval"
    title = Column(String(200), nullable=False)
    title_hi = Column(String(200), nullable=True)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    description_hi = Column(Text, nullable=True)
    total_stages = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)

    nodes = relationship("CareJourneyNode", back_populates="template", order_by="CareJourneyNode.step_number")


class CareJourneyNode(Base):
    __tablename__ = "care_journey_nodes"

    id = Column(String(50), primary_key=True)  # e.g. "dental_step_1"
    template_id = Column(String(50), ForeignKey("care_journey_templates.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    node_type = Column(String(50), nullable=False)  # start, patient_action, appointment, consultation, document_requirement, clinician_decision, possible_investigation, follow_up, completion
    title = Column(String(200), nullable=False)
    title_hi = Column(String(200), nullable=True)
    explanation = Column(Text, nullable=False)
    explanation_hi = Column(Text, nullable=True)
    what_to_bring_json = Column(Text, nullable=True)          # JSON list of items to bring
    questions_to_ask_json = Column(Text, nullable=True)       # JSON list of questions for clinician
    what_to_record_json = Column(Text, nullable=True)         # JSON list
    required_documents_json = Column(Text, nullable=True)     # JSON list
    conditional_branches_json = Column(Text, nullable=True)   # JSON list of branches with choices

    template = relationship("CareJourneyTemplate", back_populates="nodes")


class PatientJourneyProgress(Base):
    __tablename__ = "patient_journey_progress"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    template_id = Column(String(50), ForeignKey("care_journey_templates.id"), nullable=False)
    current_node_id = Column(String(50), nullable=True)
    completed_node_ids_json = Column(Text, default="[]")       # JSON list of completed node IDs
    preparation_checklist_json = Column(Text, default="[]")    # JSON list of checklist items with status
    selected_branches_json = Column(Text, default="{}")        # JSON map of branch choices
    status = Column(String(30), default="ACTIVE")              # ACTIVE, COMPLETED, ON_HOLD
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="journey_progress")


# ---------------------------------------------------------------------------
# Daily Symptom Journal & Patient Recovery Tracker (PS3 Module 12)
# ---------------------------------------------------------------------------
class PatientSymptomJournal(Base):
    __tablename__ = "patient_symptom_journals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    entry_date = Column(DateTime, default=func.now())
    severity_scale = Column(Integer, nullable=False)           # 1 to 10
    symptoms_reported_json = Column(Text, nullable=False)      # JSON list of symptom strings
    perceived_change = Column(String(50), default="Stable")    # Improving, Stable, Worsening, Significantly Worsened
    daily_notes = Column(Text, nullable=True)
    care_plan_tasks_completed = Column(Integer, default=0)
    care_plan_tasks_total = Column(Integer, default=3)
    clinician_review_status = Column(String(40), default="PENDING_REVIEW")  # PENDING_REVIEW, REVIEWED, NO_REVIEW_REQUIRED
    escalation_triggered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    patient = relationship("Patient", back_populates="symptom_journals")


# ---------------------------------------------------------------------------
# Human Escalation & Facility Inaccuracy Reporting (PS3 Module 8)
# ---------------------------------------------------------------------------
class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    facility_id = Column(Integer, ForeignKey("healthcare_facilities.id"), nullable=True)
    ticket_type = Column(String(50), nullable=False)  # INACCURATE_FACILITY_INFO, CONFLICTING_REQUIREMENTS, BOOKING_ISSUE, GENERAL_ASSISTANCE
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(30), default="OPEN")       # OPEN, UNDER_REVIEW, RESOLVED
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="support_tickets")


# ---------------------------------------------------------------------------
# Doctor Contact & Patient Linking (Phase 4)
# ---------------------------------------------------------------------------
class DoctorContact(Base):
    __tablename__ = "doctor_contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False, index=True)
    phone = Column(String(30), nullable=True)
    specialty = Column(String(100), nullable=True)
    hospital_name = Column(String(200), nullable=True)
    registration_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now())


class DoctorPatientLink(Base):
    __tablename__ = "doctor_patient_links"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_contact_id = Column(Integer, ForeignKey("doctor_contacts.id"), nullable=False)
    status = Column(String(30), default="ACTIVE")  # ACTIVE, PENDING, REVOKED
    can_receive_alerts = Column(Boolean, default=True)
    linked_at = Column(DateTime, default=func.now())


class PatientConsent(Base):
    __tablename__ = "patient_consents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    consent_type = Column(String(60), nullable=False)  # WEARABLE_DATA_SHARING, DOCTOR_ALERT_EMAIL, EMERGENCY_ESCALATION
    is_granted = Column(Boolean, default=True)
    granted_at = Column(DateTime, default=func.now())
    revoked_at = Column(DateTime, nullable=True)


# ---------------------------------------------------------------------------
# Wearable Observations & Sensor Telemetry (Phase 4)
# ---------------------------------------------------------------------------
class WearableObservation(Base):
    __tablename__ = "wearable_observations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    device_id = Column(String(100), default="med44-sim-v1")
    sensor_type = Column(String(50), nullable=False)  # HEART_RATE, SPO2, BLOOD_PRESSURE_SYS, BLOOD_PRESSURE_DIA, STEPS, GLUCOSE
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    recorded_at = Column(DateTime, default=func.now())
    source = Column(String(30), default="SIMULATED")  # SIMULATED, DEVICE, MANUAL
    confidence = Column(Float, default=1.0)


class SimulationSession(Base):
    __tablename__ = "simulation_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_name = Column(String(100), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    scenario_type = Column(String(50), default="NORMAL_REST")  # NORMAL_REST, TACHYCARDIA, HYPOXEMIA, HYPERTENSIVE_CRISIS
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


# ---------------------------------------------------------------------------
# Notification & Alert Outbox (Phase 5)
# ---------------------------------------------------------------------------
class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    recipient_email = Column(String(150), nullable=False)
    recipient_role = Column(String(30), default="DOCTOR")  # DOCTOR, PATIENT, EMERGENCY_CONTACT
    notification_type = Column(String(50), nullable=False)  # DOCTOR_ALERT, ESCALATION, APPOINTMENT_CONFIRMATION
    subject = Column(String(200), nullable=False)
    body_text = Column(Text, nullable=True)
    status = Column(String(30), default="SIMULATED")  # SENT, SIMULATED, FAILED
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=func.now())


# ---------------------------------------------------------------------------
# OAuth Token Storage (Google OAuth 2.0 Web Application & Gmail API)
# ---------------------------------------------------------------------------
class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), default="google", index=True)
    user_email = Column(String(150), nullable=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_type = Column(String(30), default="Bearer")
    scope = Column(String(255), default="https://www.googleapis.com/auth/gmail.send")
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())



