"""
Follow-up agent for Med44.
Selects and formats follow-up questions to clarify patient concerns.
"""
from typing import List, Dict, Any
from backend.clinical_engine.followup_engine import get_followup_questions


def get_relevant_followups(symptoms: List[str], answered: List[str] = None, language: str = "en") -> List[Dict[str, Any]]:
    """Return prioritized, unanswered follow-up questions for the detected symptoms."""
    return get_followup_questions(
        symptoms=symptoms,
        answered_fields=answered or [],
        language=language,
        max_questions=2
    )
