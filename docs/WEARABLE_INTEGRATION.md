# Med44 — Wearable & Remote Physiological Monitoring Specification

## 1. Overview
Med44 includes a real-time physiological telemetry intake engine that processes health parameters from patient wearables (smartwatches, pulse oximeters, blood pressure monitors, CGM).

In **TEST mode**, a built-in Physiological Scenario Simulator generates realistic telemetry profiles for testing safety rules and escalation triggers without requiring hardware connected.

---

## 2. Ingest API Specification

- **Endpoint**: `POST /api/wearable/ingest`
- **Authentication**: Bearer JWT (Patient token) or Device-Scoped API Key
- **Content-Type**: `application/json`

### Payload Schema
```json
{
  "device_id": "apple-watch-s9-0012",
  "observations": [
    {
      "sensor_type": "HEART_RATE",
      "value": 74.0,
      "unit": "bpm",
      "source": "DEVICE",
      "confidence": 0.98
    },
    {
      "sensor_type": "SPO2",
      "value": 98.2,
      "unit": "%",
      "source": "DEVICE",
      "confidence": 0.95
    },
    {
      "sensor_type": "BLOOD_PRESSURE_SYS",
      "value": 118.0,
      "unit": "mmHg",
      "source": "DEVICE",
      "confidence": 0.92
    },
    {
      "sensor_type": "BLOOD_PRESSURE_DIA",
      "value": 78.0,
      "unit": "mmHg",
      "source": "DEVICE",
      "confidence": 0.92
    }
  ]
}
```

---

## 3. Deterministic Safety Thresholds & Escalation Rules

| Parameter | Normal Range | Warning Threshold | Critical Escalation Threshold |
|---|---|---|---|
| **Heart Rate** | 60–100 bpm | > 100 or < 50 bpm | > 125 bpm (Tachycardia) / < 45 bpm (Bradycardia) |
| **SpO2 (Oxygen)** | ≥ 95% | 90–94% | < 90% (Hypoxemia) / < 88% (Severe) |
| **Systolic BP** | < 120 mmHg | 130–139 mmHg | ≥ 180 mmHg (Hypertensive Crisis) |

---

## 4. Physician Linking & Consent Verification
- Before any telemetry data or alert notification is dispatched to an external clinician:
  1. The patient must have granted explicit consent (`DOCTOR_ALERT_EMAIL`).
  2. The doctor must be formally linked with an active status (`DoctorPatientLink.status == 'ACTIVE'`).
  3. All dispatches are recorded in `notification_logs` for clinical transparency.

