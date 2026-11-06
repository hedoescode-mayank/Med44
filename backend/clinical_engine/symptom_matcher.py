"""
Matches normalized text against symptom aliases.
Combines both in-memory multilingual dictionaries and 80 symptoms from Offline Clinical Knowledge Base v1.0.
Features fuzzy matching (edit distance <= 2) for typos (e.g., 'heache' -> 'headache')
and Hinglish/Romanized Hindi & Tamil transliterations.
"""
from typing import List, Dict, Set
import re

from .normalizer import normalize_text
from .symptom_dictionary import SYMPTOM_DICT
from .knowledge_base import clinical_kb

# Hinglish & Romanized symptom aliases
HINGLISH_ALIASES: Dict[str, List[str]] = {
    "headache": [
        "sir dard", "sar dard", "sar dukh raha", "sir me dard", "sar me dard",
        "sar ghum raha", "heache", "hedache", "headach", "thalavali", "thala vali",
    ],
    "fever": [
        "bukhar", "tez bukhar", "badan garam", "tap", "jwar", "juram", "kaaichal",
    ],
    "cough": [
        "khasi", "sukhi khasi", "balgam", "caugh", "irumal", "varattu irumal",
    ],
    "chest_pain": [
        "chhati me dard", "seene me dard", "seena dard", "chhati dard",
        "nenju vali", "marbu vali", "chest tight",
    ],
    "breathing_difficulty": [
        "saans lene me dikkat", "saans phoolna", "dum ghutna", "saans nahi aa rahi",
        "moochu thinaral", "breathless",
    ],
    "abdominal_pain": [
        "pet dard", "pet me dard", "pet kharab", "vayiru vali", "stomache ache",
    ],
    "vomiting": [
        "ulti", "kayil", "vaanthi", "vanthi", "vomit",
    ],
    "diarrhea": [
        "dast", "loose motion", "pet kharab", "vayitru pokku",
    ],
    "fatigue": [
        "thakan", "thakavat", "kamzori", "kamjori", "lethargic", "asathi",
    ],
    "dizziness": [
        "chakkar", "sir ghoomna", "thalai suthal", "mayakkam",
    ],
    "sore_throat": [
        "gale me dard", "gala kharab", "thondai vali", "throat pain",
    ],
}


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein distance between two short strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def match_symptoms(text: str) -> List[str]:
    """
    Extract canonical symptom names from patient text with fuzzy typo tolerance.
    Supports English, Hindi, Tamil, and Hinglish.
    """
    if not text:
        return []

    normalized, lang = normalize_text(text)
    matched: List[str] = []
    text_lower = text.lower()
    words = re.findall(r"\b\w+\b", text_lower)

    # 1. Match from base SYMPTOM_DICT (exact substring)
    for canonical, aliases in SYMPTOM_DICT.items():
        lang_aliases = aliases.get(lang, [])
        en_aliases = aliases.get("en", []) if lang != "en" else []
        all_aliases = lang_aliases + en_aliases

        for alias in all_aliases:
            if alias.lower() in normalized or alias.lower() in text_lower:
                if canonical not in matched:
                    matched.append(canonical)
                break

    # 2. Match from Hinglish/Romanized aliases
    for canonical, h_aliases in HINGLISH_ALIASES.items():
        for ha in h_aliases:
            if ha in text_lower:
                if canonical not in matched:
                    matched.append(canonical)
                break

    # 3. Match from 80 symptoms in Clinical Knowledge Base v1.0
    kb_matches = clinical_kb.match_symptoms(text)
    for km in kb_matches:
        cname = km.get("canonical_name", "").lower().replace(" ", "_")
        if cname and cname not in matched:
            matched.append(cname)

    # 4. Fuzzy Matching for typos (edit distance <= 2 for words >= 5 letters)
    # Catches typos like 'heache' -> 'headache'
    candidate_targets = {
        "headache": ["headache", "migraine"],
        "fever": ["fever", "pyrexia"],
        "cough": ["cough", "coughing"],
        "fatigue": ["fatigue", "exhaustion"],
        "dizziness": ["dizziness", "vertigo"],
        "vomiting": ["vomiting", "nausea"],
        "diarrhea": ["diarrhea", "diarrhoea"],
    }

    for canonical, targets in candidate_targets.items():
        if canonical in matched:
            continue
        for word in words:
            if len(word) >= 5:
                for target in targets:
                    if abs(len(word) - len(target)) <= 2:
                        dist = _levenshtein_distance(word, target)
                        if dist <= 2:
                            matched.append(canonical)
                            break

    return matched


def match_symptoms_with_confidence(text: str) -> List[dict]:
    """Returns list of dicts with canonical name and match details."""
    matched_canonicals = match_symptoms(text)
    results = []
    for c in matched_canonicals:
        results.append({
            "canonical": c,
            "matched_alias": c.replace("_", " "),
            "language": "auto",
        })
    return results
