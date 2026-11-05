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
    doctor_name = Column(String(150), nullable=False)
    specialty = Column(String(100), nullable=True)
    appointment_date = Column(DateTime, nullable=False)
    slot_time = Column(String(20), nullable=True)
    status = Column(String(20), default="PENDING")  # PENDING / CONFIRMED / CANCELLED
    notes = Column(Text, nullable=True)
    is_synced = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    patient = relationship("Patient", back_populates="appointments")


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
    location = Column(String(200), nullable=True)
    available_slots_json = Column(Text, nullable=True)  # JSON list of slot strings
    is_active = Column(Boolean, default=True)

