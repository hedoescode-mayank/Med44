"""
Response builder - assembles the final clinical response.
Integrates outputs from all clinical engine modules and the Offline Clinical Knowledge Base v1.0.
"""
from typing import List, Optional

from .symptom_matcher import match_symptoms, match_symptoms_with_confidence
from .red_flag_detector import detect_red_flags
from .rule_engine import evaluate_rules, get_all_matching_rules
from .followup_engine import get_followup_questions
from .knowledge_retriever import search_articles
from .normalizer import detect_language
from .knowledge_base import clinical_kb

DISCLAIMER = (
    "⚠️ Med44 provides informational triage only. This is NOT a medical diagnosis. "
    "Always consult a qualified healthcare professional for medical decisions."
)


def build_offline_response(
    message: str,
    answered_fields: Optional[List[str]] = None,
    conversation_history: Optional[List[dict]] = None,
) -> dict:
    """
    Build a complete offline clinical response for a patient message.
    This is the primary offline fallback when Groq is unavailable.

    Returns a fully structured response dict.
    """
    language = detect_language(message)
    matched_symptoms_canonical = match_symptoms(message)
    symptom_matches = match_symptoms_with_confidence(message)
    red_flags = detect_red_flags(message, language)

    # Extract KB symptom IDs if available
    kb_symptom_matches = clinical_kb.match_symptoms(message)
    matched_symptom_ids = [s["id"] for s in kb_symptom_matches]

    # Match common conditions from Knowledge Base
    matched_conditions = clinical_kb.match_conditions(matched_symptom_ids)

    # Evaluate standard rules
    urgency, rule_name, clinical_advice = evaluate_rules(matched_symptoms_canonical)

    # Red flags always escalate to RED
    if red_flags:
        urgency = "RED"
        flag_actions = "; ".join(f["action"] for f in red_flags)
        if language == "hi":
            clinical_advice = (
                f"🚨 आपातकालीन चेतावनी (Emergency Detected): {flag_actions}। "
                "कृपया तुरंत नजदीकी अस्पताल जाएं या 112 डायल करें। देरी न करें।"
            )
        else:
            clinical_advice = (
                f"🚨 EMERGENCY DETECTED: {flag_actions}. "
                "Please seek immediate emergency medical care or call 112. Do not delay."
            )
    else:
        # Use Knowledge Base educational guidance if conditions or symptoms are found
        if kb_symptom_matches or matched_conditions:
            kb_urgency, kb_advice = clinical_kb.build_educational_guidance(
                kb_symptom_matches, matched_conditions, language=language
            )
            clinical_advice = kb_advice
            if kb_urgency == "YELLOW" and urgency == "GREEN":
                urgency = "YELLOW"
            if matched_conditions:
                rule_name = matched_conditions[0].get("name", rule_name)

    # Structured follow-up questions
    followup_questions: List[dict] = []
    if urgency != "RED":
        # First gather structured intake prompts from matched KB symptoms
        for ks in kb_symptom_matches[:2]:
            for prompt in ks.get("intake_prompts", []):
                q_text = prompt.get("question")
                if q_text and not any(f.get("question") == q_text for f in followup_questions):
                    followup_questions.append({
                        "question": q_text,
                        "type": prompt.get("type", "single_choice"),
                        "options": prompt.get("options", []),
                        "field": prompt.get("id"),
                    })

        # Supplement with standard follow-up engine
        if len(followup_questions) < 2:
            std_questions = get_followup_questions(
                matched_symptoms_canonical,
                answered_fields=answered_fields,
                language=language,
                max_questions=2 - len(followup_questions),
            )
            followup_questions.extend(std_questions)

    # Search for relevant articles
    articles = search_articles(matched_symptoms_canonical, query=message)

    # Fallback when nothing identified
    if not matched_symptoms_canonical and not kb_symptom_matches and not red_flags:
        if language == "hi":
            clinical_advice = (
                "मैं आपके लक्षण पूरी तरह नहीं समझ पाई। "
                "कृपया थोड़ा और विस्तार से बताएं (उदा. कब से बुखार या दर्द है, सिर में है या पेट में)? "
                "यदि आपातकाल है तो तुरंत 112 पर संपर्क करें।"
            )
        elif language == "ta":
            clinical_advice = (
                "உங்கள் அறிகுறிகளை புரிந்துகொள்ள முடியவில்லை. "
                "தயவுசெய்து விவரமாக சொல்லுங்கள்."
            )
        else:
            clinical_advice = (
                "I could not clearly identify specific symptoms from your message. "
                "Could you please describe your symptoms in more detail (e.g. location, duration, and severity)? "
                "If you are experiencing severe discomfort or emergency symptoms, call 112 immediately."
            )

    all_rules = get_all_matching_rules(matched_symptoms_canonical)

    response = {
        "matched_symptoms": matched_symptoms_canonical,
        "language": language,
        "urgency": urgency,
        "red_flags": red_flags,
        "rule_name": rule_name,
        "all_matched_rules": all_rules,
        "followup_questions": followup_questions[:3],
        "clinical_advice": clinical_advice,
        "articles": articles,
        "disclaimer": DISCLAIMER,
        "mode": "offline",
    }

    return response


def build_emergency_response(red_flags: List[dict], language: str = "en") -> dict:
    flag_actions = "; ".join(f["action"] for f in red_flags)
    return {
        "matched_symptoms": [],
        "language": language,
        "urgency": "RED",
        "red_flags": red_flags,
        "rule_name": "Emergency Red Flag Alert",
        "all_matched_rules": [],
        "followup_questions": [],
        "clinical_advice": f"🚨 EMERGENCY: {flag_actions}. Call 112 immediately.",
        "articles": [],
        "disclaimer": DISCLAIMER,
        "mode": "offline",
    }
