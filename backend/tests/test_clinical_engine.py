"""
Tests for Med44 Deterministic Clinical Query Engine.
Verifies multilingual symptom extraction (Hindi, English, Tamil),
rule evaluations, unknown symptom handling, and emergency red-flag triggers.
"""
import pytest
from backend.clinical_engine.normalizer import normalize_text, detect_language
from backend.clinical_engine.symptom_matcher import match_symptoms
from backend.clinical_engine.red_flag_detector import detect_red_flags
from backend.clinical_engine.rule_engine import evaluate_rules
from backend.clinical_engine.response_builder import build_offline_response


def test_language_detection():
    assert detect_language("I feel sick") == "en"
    assert detect_language("मुझे बुखार है") == "hi"
    assert detect_language("காய்ச்சல் இருக்கிறது") == "ta"


def test_english_symptom_matching():
    symptoms = match_symptoms("I have severe fever and bad headache")
    assert "fever" in symptoms
    assert "headache" in symptoms


def test_hindi_symptom_matching():
    symptoms = match_symptoms("मुझे बुखार और सिरदर्द है")
    assert "fever" in symptoms
    assert "headache" in symptoms


def test_tamil_symptom_matching():
    symptoms = match_symptoms("எனக்கு காய்ச்சல் மற்றும் தலைவலி உள்ளது")
    assert "fever" in symptoms
    assert "headache" in symptoms


def test_multiple_symptoms():
    symptoms = match_symptoms("Patient has cough, vomiting, and diarrhea for 2 days")
    assert "cough" in symptoms
    assert "vomiting" in symptoms
    assert "diarrhea" in symptoms


def test_unknown_symptoms_handling():
    res = build_offline_response("I have flurble wobble xyzzy")
    assert res["matched_symptoms"] == []
    assert res["urgency"] == "GREEN"
    assert "describe your symptoms in more detail" in res["clinical_advice"]


def test_incomplete_input():
    res = build_offline_response("hello")
    assert res["matched_symptoms"] == []
    assert res["urgency"] == "GREEN"
    assert "describe your symptoms in more detail" in res["clinical_advice"]


def test_emergency_red_flags_english():
    flags = detect_red_flags("I have severe chest pain and cannot breathe", language="en")
    assert len(flags) > 0
    assert any("chest pain" in f["keyword"].lower() for f in flags)
    assert any(f["severity"] == "CRITICAL" for f in flags)

    res = build_offline_response("I have severe chest pain")
    assert res["urgency"] == "RED"
    assert "EMERGENCY" in res["clinical_advice"]


def test_emergency_red_flags_hindi():
    flags = detect_red_flags("मेरे सीने में दर्द है", language="hi")
    assert len(flags) > 0
    assert any("सीने में दर्द" in f["keyword"] for f in flags)

    res = build_offline_response("सीने में दर्द")
    assert res["urgency"] == "RED"


def test_rule_evaluation_urgency():
    # chest pain should be RED
    urgency, rule_name, advice = evaluate_rules(["chest_pain"])
    assert urgency == "RED"

    # high fever or persistent vomiting should be YELLOW
    urgency, rule_name, advice = evaluate_rules(["fever", "vomiting"])
    assert urgency in ["YELLOW", "RED"]

    # mild fatigue
    urgency, rule_name, advice = evaluate_rules(["fatigue"])
    assert urgency in ["GREEN", "YELLOW"]
