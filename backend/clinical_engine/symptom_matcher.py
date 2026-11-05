"""
Matches normalized text against symptom aliases.
Combines both in-memory multilingual dictionaries and 80 symptoms from Offline Clinical Knowledge Base v1.0.
Returns list of matched canonical symptom names.
"""
from typing import List

from .normalizer import normalize_text
from .symptom_dictionary import SYMPTOM_DICT
from .knowledge_base import clinical_kb


def match_symptoms(text: str) -> List[str]:
    """
    Extract canonical symptom names from patient text.
    Supports English, Hindi, and Tamil.
    Returns list of unique canonical symptom names.
    """
    normalized, lang = normalize_text(text)
    matched: List[str] = []

    # 1. Match from base SYMPTOM_DICT
    for canonical, aliases in SYMPTOM_DICT.items():
        lang_aliases = aliases.get(lang, [])
        en_aliases = aliases.get("en", []) if lang != "en" else []
        all_aliases = lang_aliases + en_aliases

        for alias in all_aliases:
            if alias.lower() in normalized:
                if canonical not in matched:
                    matched.append(canonical)
                break

    # 2. Match from 80 symptoms in Clinical Knowledge Base v1.0
    kb_matches = clinical_kb.match_symptoms(text)
    for km in kb_matches:
        cname = km.get("canonical_name", "").lower().replace(" ", "_")
        if cname and cname not in matched:
            matched.append(cname)

    return matched


def match_symptoms_with_confidence(text: str) -> List[dict]:
    """
    Returns list of dicts with canonical name and match details.
    """
    normalized, lang = normalize_text(text)
    results = []

    for canonical, aliases in SYMPTOM_DICT.items():
        lang_aliases = aliases.get(lang, [])
        en_aliases = aliases.get("en", []) if lang != "en" else []
        all_aliases = lang_aliases + en_aliases

        for alias in all_aliases:
            if alias.lower() in normalized:
                results.append({
                    "canonical": canonical,
                    "matched_alias": alias,
                    "language": lang,
                })
                break

    # Also include KB matches
    kb_matches = clinical_kb.match_symptoms(text)
    for km in kb_matches:
        cname = km.get("canonical_name", "").lower().replace(" ", "_")
        if not any(r["canonical"] == cname for r in results):
            results.append({
                "canonical": cname,
                "matched_alias": km.get("matched_term"),
                "language": lang,
                "symptom_id": km.get("id"),
            })

    return results
