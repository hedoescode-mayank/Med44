"""
Standard Observation Ingestion Schema for Med44 Sensor Reliability Engine (C10 Part 3).
Defines standard observation models, decision states, and validation schemas.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import uuid


class DataMode(str, Enum):
    REAL = "REAL"
    IMPORTED = "IMPORTED"
    SIMULATED = "SIMULATED"


class ValidationStatus(str, Enum):
    PENDING = "PENDING"
    VALIDATED = "VALIDATED"
    FLAGGED = "FLAGGED"
    REJECTED = "REJECTED"


class ReliabilityDecisionState(str, Enum):
    RELIABLE_OBSERVATION = "RELIABLE_OBSERVATION"
    POSSIBLE_SENSOR_FAULT = "POSSIBLE_SENSOR_FAULT"
    POSSIBLE_MOTION_ARTIFACT = "POSSIBLE_MOTION_ARTIFACT"
    STALE_OR_MISSING_DATA = "STALE_OR_MISSING_DATA"
    CONFLICTING_SOURCES = "CONFLICTING_SOURCES"
    POSSIBLE_REAL_CHANGE = "POSSIBLE_REAL_CHANGE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    HUMAN_VERIFICATION_REQUIRED = "HUMAN_VERIFICATION_REQUIRED"


class SensorType(str, Enum):
    HEART_RATE = "HEART_RATE"
    SPO2 = "SPO2"
    BLOOD_PRESSURE_SYS = "BLOOD_PRESSURE_SYS"
    BLOOD_PRESSURE_DIA = "BLOOD_PRESSURE_DIA"
    RESPIRATORY_RATE = "RESPIRATORY_RATE"
    PPG_WAVEFORM = "PPG_WAVEFORM"
    ACCELEROMETER = "ACCELEROMETER"
    ECG_REFERENCE = "ECG_REFERENCE"
    BLOOD_GLUCOSE = "BLOOD_GLUCOSE"


class AccelerometerContext(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    magnitude: float = 1.0  # sqrt(x^2 + y^2 + z^2) in Gs or m/s^2


class StandardObservation(BaseModel):
    observation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = "patient-001"
    device_id: str = "med44-smartwatch-01"
    sensor_type: SensorType
    metric: str  # e.g., "pulse_rate_bpm", "spo2_pct", "systolic_mmhg"
    value: float
    unit: str  # "bpm", "%", "mmHg", "brpm", "mg/dL"
    measured_at: datetime
    received_at: datetime = Field(default_factory=datetime.now)
    source: str = "WRIST_PPG"  # "WRIST_PPG", "CHEST_ECG", "CONNECTED_CUFF", "MANUAL_ENTRY", "SIMULATOR"
    source_device: str = "WearableSensor"
    quality_metadata: Optional[Dict[str, Any]] = None
    signal_reference: Optional[Dict[str, Any]] = None
    data_mode: DataMode = DataMode.SIMULATED
    session_id: Optional[str] = None
    validation_status: ValidationStatus = ValidationStatus.PENDING

    # Optional waveform payload for PPG / ECG signals
    raw_waveform: Optional[List[float]] = None
    sampling_rate_hz: Optional[float] = None
    accelerometer_context: Optional[AccelerometerContext] = None


class DecisionReport(BaseModel):
    observation_id: str
    sensor_type: str
    metric: str
    value: float
    unit: str
    fault_flags: List[str] = Field(default_factory=list)
    signal_quality: str = "UNCERTAIN_SIGNAL"  # GOOD_SIGNAL, POOR_SIGNAL, UNCERTAIN_SIGNAL, RAW_SIGNAL_UNAVAILABLE
    quality_confidence: float = 0.5
    anomaly_score: float = 0.0
    cross_sensor_status: str = "INSUFFICIENT_CROSS_SENSOR_EVIDENCE"  # CONFIRMED, DISCORDANT, INSUFFICIENT_CROSS_SENSOR_EVIDENCE
    evidence_summary: str
    confidence: float
    decision: ReliabilityDecisionState
    next_action: str
    rule_ids: List[str] = Field(default_factory=list)
    model_version: str = "c10-v1.0.0-hgb"
    evaluated_at: datetime = Field(default_factory=datetime.now)
    data_mode: str = "SIMULATED"
    is_actionable_emergency: bool = False

