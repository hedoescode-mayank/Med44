"""
Text normalizer for multilingual symptom extraction.
Detects language (en/hi/ta), lowercases, removes punctuation,
maps common abbreviations.
"""
import re
from typing import Tuple

# Sample character sets for language detection
HINDI_CHARS = set(
    'अआइईउऊएऐओऔकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह'
    'ाािीुूृेैोौंःँ़़ऱ'
)
TAMIL_CHARS = set(
    'அஆஇஈஉஊஎஏஐஒஓஔகங்சஞடணதநபமயரலவழளறன'
    'ாிீுூெேைொோௌ்'
)

ABBREV_MAP = {
    "sob": "shortness of breath",
    "cp": "chest pain",
    "ha": "headache",
    "gi": "gastrointestinal",
    "bp": "blood pressure",
    "hr": "heart rate",
    "temp": "temperature",
    "abd": "abdominal",
}


def detect_language(text: str) -> str:
    """Detect language: returns 'en', 'hi', or 'ta'"""
    chars = set(text)
    if chars & HINDI_CHARS:
        return "hi"
    if chars & TAMIL_CHARS:
        return "ta"
    return "en"


def normalize_text(text: str) -> Tuple[str, str]:
    """
    Returns (normalized_text, detected_language)
    Normalizes: lowercases, removes punctuation, expands abbreviations.
    """
    import unicodedata

    lang = detect_language(text)
    normalized = text.lower().strip()
    # Remove punctuation (category 'P') without destroying Indic vowels/combining marks
    normalized = "".join(" " if unicodedata.category(c).startswith("P") else c for c in normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()

    if lang == "en":
        # Expand abbreviations
        words = normalized.split()
        words = [ABBREV_MAP.get(w, w) for w in words]
        normalized = " ".join(words)

    return normalized, lang

