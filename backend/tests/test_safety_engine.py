"""
Tests for Med44 Shared Safety Engine.
Verifies that safety constraints are inviolable, emergency overrides work,
forbidden phrases are stripped, and medical disclaimers are always enforced.
"""
from backend.safety.safety_engine import apply_safety_rules, HARD_CODED_CRITICAL_SYMPTOMS


def test_safety_engine_enforces_critical_escalation():
    # If LLM or rule engine returned GREEN for chest pain, safety MUST escalate to RED
    unsafe_input = {
        "matched_symptoms": ["chest_pain"],
        "urgency": "GREEN",
        "clinical_advice": "Just drink warm water and sleep.",
    }
    safe_output = apply_safety_rules(unsafe_input)
    assert safe_output["urgency"] == "RED"


def test_safety_engine_appends_disclaimer():
    raw_response = {
        "matched_symptoms": ["cough"],
        "urgency": "GREEN",
        "clinical_advice": "Rest and stay hydrated.",
    }
    safe_output = apply_safety_rules(raw_response)
    assert "disclaimer" in safe_output
    assert "NOT a medical diagnosis" in safe_output["disclaimer"]


def test_safety_engine_sanitizes_forbidden_prescription_language():
    unsafe_input = {
        "matched_symptoms": ["headache"],
        "urgency": "GREEN",
        "clinical_advice": "I diagnose you with migraine. I prescribe 500mg paracetamol immediately.",
    }
    safe_output = apply_safety_rules(unsafe_input)
    # Must not contain "I diagnose" or "prescribe"
    assert "i diagnose" not in safe_output["clinical_advice"].lower()
    assert "prescribe" not in safe_output["clinical_advice"].lower()


def test_safety_engine_red_flags_override_normal():
    unsafe_input = {
        "matched_symptoms": ["breathing_difficulty"],
        "urgency": "GREEN",
        "clinical_advice": "Nothing serious.",
    }
    safe_output = apply_safety_rules(unsafe_input)
    assert safe_output["urgency"] == "RED"
