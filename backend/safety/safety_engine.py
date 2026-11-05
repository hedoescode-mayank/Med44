"""
Shared deterministic safety layer for Med44.
ALWAYS runs on every response. Cannot be overridden by LLM or any other module.
"""
import re
from typing import List

SAFETY_RULES = [
    "Never diagnose definitively",
    "Never prescribe medications or dosages",
    "Never recommend stopping prescribed treatment",
    "Always recommend doctor consultation for serious symptoms",
    "Emergency red flags ALWAYS escalate to CRITICAL/RED",
    "Require explicit confirmation before appointment booking",
    "Never fabricate medical information",
    "Always append medical disclaimer",
]

# Symptoms that ALWAYS escalate to RED regardless of other logic
HARD_CODED_CRITICAL_SYMPTOMS = {
    "chest_pain",
    "breathing_difficulty",
    "palpitations",  # when combined - but escalate conservatively
}

# Phrases that must NEVER appear in clinical_advice
FORBIDDEN_PHRASES = [
    r"\bprescribe\b",
    r"\bi diagnose\b",
    r"\byou have\s+\w+\s+disease\b",
    r"\bstop (taking|your) (medication|medicine|drug|prescription)\b",
    r"\bno need to see a doctor\b",
    r"\bno need for medical attention\b",
]

DISCLAIMER = (
    "⚠️ Med44 provides information only. This is NOT a medical diagnosis. "
    "Always consult a qualified healthcare professional for medical decisions."
)

EMERGENCY_NUMBERS = {
    "emergency": "112",
    "poison_control": "1800-116-117",
    "mental_health": "iCall: 9152987821",
    "vandrevala": "1860-2662-345 (24/7)",
}


def apply_safety_rules(response: dict) -> dict:
    """
    Apply all safety rules to any response (offline or online).
    This function MUST be called on every response before it is sent to the user.
    Returns the sanitized response.
    """
    # 1. Escalate if hard-coded critical symptoms found
    matched = set(response.get("matched_symptoms", []))
    if matched & HARD_CODED_CRITICAL_SYMPTOMS:
        # Only escalate chest_pain and breathing_difficulty to RED unconditionally
        if "chest_pain" in matched or "breathing_difficulty" in matched:
            response["urgency"] = "RED"

    # 2. If red flags present, always RED
    if response.get("red_flags"):
        response["urgency"] = "RED"

    # 3. Sanitize clinical_advice - remove forbidden phrases
    advice = response.get("clinical_advice", "")
    for pattern in FORBIDDEN_PHRASES:
        advice = re.sub(pattern, "[REDACTED BY SAFETY ENGINE]", advice, flags=re.IGNORECASE)
    response["clinical_advice"] = advice

    # 4. Remove any AI-generated diagnosis language
    response["clinical_advice"] = _sanitize_diagnosis_language(response["clinical_advice"])

    # 5. Always append disclaimer
    response["disclaimer"] = DISCLAIMER

    # 6. Ensure no prescription content leaks through
    if "prescriptions_suggested" in response:
        del response["prescriptions_suggested"]

    # 7. Add emergency contacts for RED responses
    if response.get("urgency") == "RED":
        response["emergency_contacts"] = EMERGENCY_NUMBERS

    # 8. Mark response as safety-checked
    response["safety_checked"] = True

    return response


def _sanitize_diagnosis_language(text: str) -> str:
    """Remove language that implies definitive diagnosis."""
    # Replace "you have X" with safer phrasing
    text = re.sub(
        r"\byou (definitely |certainly |clearly )?(have|are suffering from|are diagnosed with)\b",
        "your symptoms may be associated with",
        text,
        flags=re.IGNORECASE,
    )
    return text


def validate_appointment_intent(message: str) -> bool:
    """
    Check if user message contains explicit appointment confirmation intent.
    Returns True only if explicit confirmation detected.
    """
    confirmation_phrases = [
        "yes", "confirm", "book it", "go ahead", "schedule it",
        "please book", "i want to book", "yes please", "ok book",
        "हाँ", "बुक करो", "ठीक है", "ஆம்", "முன்பதிவு செய்யுங்கள்",
    ]
    lower_msg = message.lower().strip()
    return any(phrase in lower_msg for phrase in confirmation_phrases)


def get_safety_rules() -> List[str]:
    """Return the list of active safety rules."""
    return SAFETY_RULES.copy()

