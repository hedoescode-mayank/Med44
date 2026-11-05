"""
Appointment assistant agent for Med44.
Helps match patient symptoms to medical specialties and doctor slots.
"""
from typing import Dict, Any, List

SPECIALTY_MAP = {
    "chest_pain": "Cardiology",
    "palpitations": "Cardiology",
    "breathing_difficulty": "Pulmonology",
    "cough": "Pulmonology",
    "fever": "General Medicine",
    "headache": "Neurology",
    "dizziness": "Neurology",
    "abdominal_pain": "Gastroenterology",
    "vomiting": "Gastroenterology",
    "diarrhea": "Gastroenterology",
    "rash": "Dermatology",
    "joint_pain": "Orthopedics",
    "back_pain": "Orthopedics",
    "sore_throat": "ENT",
}


def recommend_specialty(symptoms: List[str]) -> str:
    """Recommend medical specialty based on matched symptoms."""
    for s in symptoms:
        if s in SPECIALTY_MAP:
            return SPECIALTY_MAP[s]
    return "General Medicine"


def format_appointment_prompt(specialty: str, doctors: List[Dict[str, Any]]) -> str:
    lines = [f"Recommended Specialty: {specialty}", "Available Doctors:"]
    for doc in doctors:
        lines.append(f"- Dr. {doc.get('name')} ({doc.get('specialty')}, Rating: {doc.get('rating')}) - Hospital: {doc.get('hospital')}")
    return "\n".join(lines)
