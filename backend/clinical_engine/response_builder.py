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

    # Check if document context was attached/injected into the query
    if "[Attached Document Context:" in message:
        doc_header = ""
        doc_content = ""
        try:
            parts = message.split("[Attached Document Context:")
            if len(parts) > 1:
                doc_header = parts[1].split("]")[0].strip()
            if "Document Extracted Content:" in message:
                content_part = message.split("Document Extracted Content:")[1].split("[Instruction:")[0]
                doc_content = content_part.strip()
        except Exception:
            pass

        if doc_content:
            urgency = "GREEN"
            if language == "hi":
                clinical_advice = (
                    f"मैं आपकी अपलोड की गई डॉक्टर की पर्ची ({doc_header}) का विवरण नीचे प्रस्तुत कर रहा हूँ:\n\n"
                    f"📋 **दस्तावेज़ से प्राप्त विवरण (Extracted Record):**\n"
                    f"{doc_content}\n\n"
                    "⚠️ **महत्वपूर्ण सुरक्षा निर्देश (Safety Note):**\n"
                    "यह विवरण आपके डॉक्टर द्वारा दिए गए रिकॉर्ड पर आधारित है। Med44 दवाएँ नहीं बदलता या स्वयं नहीं लिखता। किसी भी दवा में बदलाव करने से पहले कृपया अपने डॉक्टर से परामर्श अवश्य लें।"
                )
            elif language == "ta":
                clinical_advice = (
                    f"மருத்துவர் வழங்கிய மருந்துச் சீட்டின் ({doc_header}) விவரங்கள் கீழே கொடுக்கப்பட்டுள்ளன:\n\n"
                    f"📋 **பதிவேற்றப்பட்ட குறிப்புகள்:**\n"
                    f"{doc_content}\n\n"
                    "⚠️ **பாதுகாப்பு குறிப்பு:**\n"
                    "இந்தத் தகவல் உங்கள் மருத்துவரின் சீட்டின் அடிப்படையில் பெறப்பட்டது. மருந்தை மாற்றும் முன் உங்கள் மருத்துவரிடம் ஆலோசிக்கவும்."
                )
            else:
                clinical_advice = (
                    f"I have retrieved your uploaded clinician's prescription ({doc_header}):\n\n"
                    f"📋 **Document Extracted Content:**\n"
                    f"{doc_content}\n\n"
                    "⚠️ **Safety & Clinical Note:**\n"
                    "This summary is read directly from your treating doctor's written prescription. Med44 does not prescribe or alter medications. Always consult your healthcare provider before changing any medication."
                )
            return {
                "conversation_id": 1,
                "matched_symptoms": [],
                "urgency": urgency,
                "red_flags": [],
                "clinical_advice": clinical_advice,
                "followup_questions": [
                    {"question": "Do you need clarification on dosage or instructions?", "options": ["Explain dosage", "Check allergy safeguards", "Find clinic"]},
                ],
                "articles": [],
                "disclaimer": DISCLAIMER,
                "mode": "offline",
                "language": language,
            }

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
    elif not matched_symptoms_canonical and not kb_symptom_matches:
        # §7 Distinct Intent Routing: Greetings & Medicine Inquiries
        msg_clean = message.lower().strip()
        is_greeting = any(
            g in msg_clean
            for g in ["hi", "hello", "hey", "namaste", "vanakkam", "good morning", "good evening", "kaise ho", "namaskar"]
        ) and len(msg_clean.split()) <= 4

        is_medicine_query = any(
            p in msg_clean
            for p in [
                "which medicine", "what medicine", "doctor give", "my prescription",
                "prescribed medicine", "konsi dawa", "kya dawa", "kya prescription",
                "prescription", "parchi", "dawai", "kya likha", "kya de raha", "doctor ne"
            ]
        )

        if is_greeting:
            urgency = "GREEN"
            if language == "hi":
                clinical_advice = (
                    "नमस्ते! मैं आपकी Med44 AI हेल्थ नर्स हूँ। आप आज कैसा महसूस कर रहे हैं? "
                    "कृपया अपने लक्षणों का थोड़ा और विस्तार से वर्णन करें (describe your symptoms in more detail) ताकि मैं आपकी बेहतर सहायता कर सकूँ।"
                )
            elif language == "ta":
                clinical_advice = (
                    "வணக்கம்! நான் உங்கள் Med44 AI சுகாதார செவிலியர். நீங்கள் இன்று எப்படி உணர்கிறீர்கள்? "
                    "தயவுசெய்து உங்கள் அறிகுறிகளை விவரிக்கவும் (describe your symptoms in more detail)."
                )
            else:
                clinical_advice = (
                    "Hello! I am your Med44 AI Health Nurse. How are you feeling today? "
                    "Please describe your symptoms in more detail so I can assist you better, or ask about your records."
                )
            return {
                "conversation_id": 1,
                "matched_symptoms": [],
                "urgency": urgency,
                "red_flags": [],
                "clinical_advice": clinical_advice,
                "followup_questions": [
                    {"question": "What is bothering you today?", "options": ["Headache", "Fever", "Cough", "Stomach pain"]},
                ],
                "articles": [],
                "disclaimer": DISCLAIMER,
                "mode": "offline",
                "language": language,
            }

        elif is_medicine_query:
            urgency = "GREEN"
            clinical_advice = (
                "Med44 does not prescribe, recommend, or modify medications. "
                "To understand which medicine your doctor gave you and why, please attach your prescription document using the paperclip button 📎. "
                "Med44 will extract the doctor's verified clinical notes and instructions for your review. "
                "Always consult your prescribing doctor or pharmacist before taking or altering any medicine."
            )
            return {
                "conversation_id": 1,
                "matched_symptoms": [],
                "urgency": urgency,
                "red_flags": [],
                "clinical_advice": clinical_advice,
                "followup_questions": [
                    {"question": "Would you like to attach a prescription now?", "options": ["Attach Document 📎", "Ask symptom question", "Find doctors"]},
                ],
                "articles": [],
                "disclaimer": DISCLAIMER,
                "mode": "offline",
                "language": language,
            }
        else:
            # Unclear input: ask 1-2 clarifying follow-up questions instead of generic apology (§7)
            urgency = "GREEN"
            clinical_advice = (
                "I want to make sure I understand how you are feeling. Please describe your symptoms in more detail "
                "and how long they have been bothering you. If you are having chest pain or trouble breathing, call 112 immediately."
            )
            return {
                "conversation_id": 1,
                "matched_symptoms": [],
                "urgency": urgency,
                "red_flags": [],
                "clinical_advice": clinical_advice,
                "followup_questions": [
                    {"question": "What kind of symptom are you experiencing?", "options": ["Headache", "Fever", "Cough", "Stomach ache", "Fatigue"]},
                    {"question": "How long have you had this?", "options": ["Less than 24 hours", "1-3 days", "More than a week"]},
                ],
                "articles": [],
                "disclaimer": DISCLAIMER,
                "mode": "offline",
                "language": language,
            }
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
