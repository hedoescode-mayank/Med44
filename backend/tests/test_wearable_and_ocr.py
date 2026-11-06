"""
Unit tests for Wearable Telemetry, Vital Alert Rules, and OCR Engine.
"""
import pytest
from backend.services.ocr.engine import get_ocr_engine_status
from backend.routers.wearable import evaluate_vital_alerts, ObservationItem


def test_ocr_engine_status():
    status = get_ocr_engine_status()
    assert "tesseract_available" in status
    assert "pymupdf_available" in status
    assert "tesseract_languages" in status
    assert status["pymupdf_available"] is True


def test_normal_vitals_no_alert():
    obs = [
        ObservationItem(sensor_type="HEART_RATE", value=75.0, unit="bpm"),
        ObservationItem(sensor_type="SPO2", value=98.0, unit="%"),
        ObservationItem(sensor_type="BLOOD_PRESSURE_SYS", value=118.0, unit="mmHg"),
    ]
    alerts = evaluate_vital_alerts(obs)
    assert len(alerts) == 0


def test_tachycardia_alert_trigger():
    obs = [
        ObservationItem(sensor_type="HEART_RATE", value=135.0, unit="bpm"),
    ]
    alerts = evaluate_vital_alerts(obs)
    assert len(alerts) == 1
    assert alerts[0]["type"] == "TACHYCARDIA"
    assert alerts[0]["severity"] == "HIGH"
    assert alerts[0]["requires_escalation"] is True


def test_hypoxemia_alert_trigger():
    obs = [
        ObservationItem(sensor_type="SPO2", value=88.5, unit="%"),
    ]
    alerts = evaluate_vital_alerts(obs)
    assert len(alerts) == 1
    assert alerts[0]["type"] == "HYPOXEMIA"
    assert alerts[0]["severity"] == "HIGH"


def test_hypertensive_crisis_alert_trigger():
    obs = [
        ObservationItem(sensor_type="BLOOD_PRESSURE_SYS", value=185.0, unit="mmHg"),
    ]
    alerts = evaluate_vital_alerts(obs)
    assert len(alerts) == 1
    assert alerts[0]["type"] == "HYPERTENSIVE_CRISIS"
    assert alerts[0]["severity"] == "CRITICAL"
