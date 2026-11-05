"""
Medication information agent for Med44.
Provides verified drug reference lookups, interaction checking, and safety guardrails.
"""
from typing import Dict, Any, List
from backend.safety.safety_engine import apply_safety_rules


def build_medication_guidance(medication: Dict[str, Any], warnings: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Format verified medication details with clear warnings and clinician escalation.
    """
    interaction_texts = []
    if warnings:
        for w in warnings:
            interaction_texts.append(f"⚠️ {w.get('severity', 'Warning')}: {w.get('description')}")

    advice = (
        f"Verified Reference Info for {medication.get('name')} ({medication.get('generic_name', '')}):\n"
        f"Category: {medication.get('category', 'General')}\n"
        f"Summary: {medication.get('description', '')}\n"
        f"Potential Side Effects: {medication.get('side_effects', 'Consult clinician/pharmacist')}\n"
        f"Contraindications: {medication.get('contraindications', 'None specifically noted')}\n"
    )
    if interaction_texts:
        advice += "\nKnown Interactions:\n" + "\n".join(interaction_texts)

    advice += "\n\n⚠️ IMPORTANT: Always consult your treating physician or pharmacist before taking or modifying any prescription medication."

    res = {
        "medication": medication.get("name"),
        "generic_name": medication.get("generic_name"),
        "clinical_advice": advice,
        "warnings": warnings or [],
        "urgency": "YELLOW" if warnings else "GREEN",
        "matched_symptoms": [],
        "mode": "offline",
    }
    return apply_safety_rules(res)
