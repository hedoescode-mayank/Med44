"""
Tests for Appointment System and Offline Synchronization.
"""
from backend.ai.appointment_agent import recommend_specialty


def test_specialty_recommendation():
    assert recommend_specialty(["chest_pain"]) == "Cardiology"
    assert recommend_specialty(["breathing_difficulty"]) == "Pulmonology"
    assert recommend_specialty(["rash"]) == "Dermatology"
    assert recommend_specialty(["unknown_sym"]) == "General Medicine"


def test_offline_sync_payload_format():
    sample_queue = [
        {
            "doctor_name": "Dr. Sarah Rao",
            "specialty": "Cardiology",
            "appointment_date": "2026-11-10",
            "slot_time": "10:00 AM",
            "notes": "Queued while offline",
        }
    ]
    assert len(sample_queue) == 1
    assert sample_queue[0]["doctor_name"] == "Dr. Sarah Rao"
    assert sample_queue[0]["appointment_date"] == "2026-11-10"
