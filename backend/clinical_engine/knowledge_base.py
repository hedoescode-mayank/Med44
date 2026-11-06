"""
Med44 Offline Clinical Knowledge Base v1.0 Loader & Reasoner.
Directly powers the deterministic offline AI clinical query engine.
Loads 80 symptoms, 20 reviewed conditions, 12 red-flag rules, and structured intake prompts.
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

logger = logging.getLogger(__name__)

class OfflineClinicalKnowledgeBase:
    _instance = None

    def __init__(self):
        self.metadata: Dict[str, Any] = {}
        self.symptoms: List[Dict[str, Any]] = []
        self.symptoms_by_id: Dict[str, Dict[str, Any]] = {}
        self.symptoms_by_name: Dict[str, Dict[str, Any]] = {}
        self.term_to_symptom_id: Dict[str, str] = {}
        self.conditions: List[Dict[str, Any]] = []
        self.conditions_by_id: Dict[str, Dict[str, Any]] = {}
        self.red_flag_rules: List[Dict[str, Any]] = []
        self.is_loaded: bool = False
        self._load()

    def _load(self):
        candidates = [
            Path(__file__).parent.parent / "med44_offline_clinical_knowledge_base_v1.json",
            Path("backend/med44_offline_clinical_knowledge_base_v1.json"),
            Path("c:/Users/ASUS/Desktop/MED44/backend/med44_offline_clinical_knowledge_base_v1.json"),
            Path("C:/HealthAI/nova-care-ai/backend/med44_offline_clinical_knowledge_base_v1.json"),
        ]

        data = None
        for p in candidates:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    logger.info(f"Loaded Med44 Offline Clinical Knowledge Base from {p}")
                    break
                except Exception as e:
                    logger.error(f"Error loading KB from {p}: {e}")

        if not data:
            logger.warning("Clinical Knowledge Base JSON could not be loaded; using built-in fallbacks.")
            return

        self.metadata = data.get("dataset_metadata", {})
        self.symptoms = data.get("symptom_dictionary", [])
        self.conditions = data.get("common_conditions", [])
        self.red_flag_rules = data.get("red_flag_rules", [])

        # Index symptoms
        for s in self.symptoms:
            sid = s.get("id")
            cname = s.get("canonical_name", "").lower()
            self.symptoms_by_id[sid] = s
            self.symptoms_by_name[cname] = s

            # Index search terms
            terms = s.get("search_terms", [])
            for t in terms:
                if t:
                    self.term_to_symptom_id[t.strip().lower()] = sid
            if s.get("display_hi"):
                self.term_to_symptom_id[s["display_hi"].strip().lower()] = sid
            if s.get("display_hinglish"):
                self.term_to_symptom_id[s["display_hinglish"].strip().lower()] = sid

        # Index conditions
        for c in self.conditions:
            cid = c.get("id")
            self.conditions_by_id[cid] = c

        self.is_loaded = True

    def match_symptoms(self, text: str) -> List[Dict[str, Any]]:
        """
        Scan text for all 80 symptoms in KB.
        Returns list of matched symptom dicts with canonical_name, id, and intake prompts.
        """
        if not text:
            return []
        text_lower = text.lower()
        matched = []
        seen_ids = set()

        # Sort terms by length descending to match longest phrases first (e.g. "shortness of breath" before "breath")
        sorted_terms = sorted(self.term_to_symptom_id.keys(), key=len, reverse=True)

        for term in sorted_terms:
            if term in text_lower:
                sid = self.term_to_symptom_id[term]
                if sid not in seen_ids:
                    seen_ids.add(sid)
                    s_data = self.symptoms_by_id.get(sid, {})
                    matched.append({
                        "id": sid,
                        "canonical_name": s_data.get("canonical_name"),
                        "matched_term": term,
                        "display_hi": s_data.get("display_hi"),
                        "intake_prompts": s_data.get("intake_prompts", []),
                    })

        return matched

    def match_conditions(self, matched_symptom_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Evaluate 20 common conditions against matched symptom IDs.
        Returns candidate conditions ranked by overlap count.
        """
        if not matched_symptom_ids:
            return []

        sym_set = set(matched_symptom_ids)
        candidates = []

        for c in self.conditions:
            assoc = set(c.get("associated_symptom_ids", []))
            overlap = sym_set & assoc
            if overlap:
                candidates.append({
                    "id": c.get("id"),
                    "name": c.get("name"),
                    "name_hi": c.get("name_hi"),
                    "plain_language_summary": c.get("plain_language_summary"),
                    "safe_next_step": c.get("safe_next_step"),
                    "escalation_note": c.get("escalation_note"),
                    "assessment_questions": c.get("assessment_questions", []),
                    "overlap_count": len(overlap),
                    "matched_symptom_ids": list(overlap),
                })

        # Rank by overlap count descending
        candidates.sort(key=lambda x: x["overlap_count"], reverse=True)
        return candidates

    def check_red_flags(self, text: str) -> List[Dict[str, Any]]:
        """
        Evaluate text against KB red flag rules.
        """
        if not text:
            return []
        text_lower = text.lower()
        flags = []

        for rule in self.red_flag_rules:
            for term in rule.get("trigger_terms", []):
                if term.lower() in text_lower:
                    flags.append({
                        "rule_id": rule.get("id"),
                        "trigger_term": term,
                        "action": rule.get("action", "CALL 112 IMMEDIATELY"),
                        "message": rule.get("message", "Immediate medical attention required."),
                    })
                    break

        return flags

    def build_educational_guidance(
        self,
        matched_symptoms: List[Dict[str, Any]],
        matched_conditions: List[Dict[str, Any]],
        language: str = "en"
    ) -> Tuple[str, str]:
        """
        Generate educational, non-diagnostic guidance strictly adhering to safety policy.
        Returns (urgency, clinical_advice_text).
        """
        if not matched_symptoms:
            if language == "hi":
                return "GREEN", (
                    "मैं आपके लक्षण पूरी तरह नहीं समझ पाई। "
                    "कृपया थोड़ा और विस्तार से बताएं — जैसे कि लक्षण कब से हैं, कहां दर्द है, या कितना गंभीर है? "
                    "यदि आपको अचानक सांस लेने में तकलीफ या सीने में दर्द है तो तुरंत 112 पर संपर्क करें।"
                )
            elif language == "ta":
                return "GREEN", (
                    "உங்கள் அறிகுறிகளை முழுமையாக புரிந்துகொள்ள முடியவில்லை. "
                    "தயவுசெய்து அறிகுறிகளை சற்று விரிவாகக் கூறுங்கள். "
                    "கடுமையான அவசரநிலை இருப்பின் உடனே 112 அழைக்கவும்."
                )
            return "GREEN", (
                "I could not clearly identify specific symptoms from your message. "
                "Could you please share a bit more detail — such as how long you have had this, where the pain or discomfort is, and how severe it feels? "
                "If you are experiencing any severe discomfort, chest pain, or shortness of breath, please dial 112 immediately."
            )

        # Primary condition match - only when at least 2 corroborating symptoms exist (§7 Rule #3)
        primary_cond = matched_conditions[0] if (matched_conditions and len(matched_symptoms) >= 2) else None
        sym_names = [s["canonical_name"] for s in matched_symptoms]
        sym_names_str = ", ".join(sym_names)

        if language == "hi":
            sym_hi_list = [s.get("display_hi") or s["canonical_name"] for s in matched_symptoms]
            sym_hi_str = ", ".join(sym_hi_list)

            if primary_cond:
                cond_name = primary_cond.get("name_hi") or primary_cond.get("name")
                summary = primary_cond.get("plain_language_summary", "")
                safe_steps = primary_cond.get("safe_next_step", "आराम करें और पर्याप्त मात्रा में पानी या ओआरएस पिएं।")
                escalation = primary_cond.get("escalation_note", "यदि लक्षण 3 दिन से अधिक समय तक बने रहें तो डॉक्टर से मिलें।")

                advice = (
                    f"दर्ज लक्षण: {sym_hi_str}।\n\n"
                    f"संभावित सामान्य स्थिति (समीक्षित नैदानिक शिक्षा): {cond_name}।\n"
                    f"{summary}\n\n"
                    f"सुरक्षित घरेलू देखभाल और सलाह:\n"
                    f"• {safe_steps}\n\n"
                    f"⚠️ कब डॉक्टर से संपर्क करें:\n"
                    f"• {escalation}\n\n"
                    f"ध्यान दें: यह कोई अंतिम निदान (diagnosis) नहीं है। सटीक जांच के लिए हमेशा डॉक्टर से परामर्श लें।"
                )
            else:
                advice = (
                    f"दर्ज लक्षण: {sym_hi_str}।\n\n"
                    f"सुरक्षित देखभाल:\n"
                    f"• पर्याप्त आराम करें और पानी/तरल पदार्थ प्रचुर मात्रा में लें।\n"
                    f"• बिना डॉक्टर की सलाह के कोई एंटीबायोटिक या नई दवा न लें।\n"
                    f"• यदि लक्षण बढ़ें, तेज़ बुखार हो या सांस लेने में परेशानी हो तो तुरंत डॉक्टर से मिलें।"
                )
        elif language == "ta":
            if primary_cond:
                advice = (
                    f"கண்டறியப்பட்ட அறிகுறிகள்: {sym_names_str}。\n\n"
                    f"சாத்தியமான நிலை: {primary_cond.get('name')}。\n"
                    f"{primary_cond.get('plain_language_summary', '')}\n\n"
                    f"பாதுகாப்பான கவனிப்பு:\n"
                    f"• {primary_cond.get('safe_next_step', 'ஓய்வு மற்றும் போதுமான நீர்ச்சத்து எடுத்துக்கொள்ளுங்கள்.')}\n\n"
                    f"⚠️ மருத்துவரை எப்போது அணுக வேண்டும்:\n"
                    f"• {primary_cond.get('escalation_note', 'அறிகுறிகள் நீடித்தால் மருத்துவரை அணுகவும்.')}"
                )
            else:
                advice = (
                    f"கண்டறியப்பட்ட அறிகுறிகள்: {sym_names_str}。\n"
                    f"ஓய்வு எடுத்து அறிகுறிகளைக் கவனியுங்கள். தீவிரமானால் உடனே மருத்துவரை அணுகவும்."
                )
        else:
            # English
            if primary_cond:
                advice = (
                    f"Observed Symptoms: {sym_names_str}.\n\n"
                    f"Common reasons people notice these symptoms (information only, not a diagnosis): {primary_cond.get('name')}.\n"
                    f"{primary_cond.get('plain_language_summary', '')}\n\n"
                    f"Recommended Self-Care & Hydration:\n"
                    f"• {primary_cond.get('safe_next_step', 'Rest and ensure adequate fluid intake.')}\n\n"
                    f"⚠️ When to Seek Medical Care:\n"
                    f"• {primary_cond.get('escalation_note', 'Seek medical review if symptoms persist or worsen.')}\n\n"
                    f"Note: Med44 gives general information, not medical advice or a diagnosis. For emergencies call 112."
                )
            else:
                advice = (
                    f"Observed Symptom: {sym_names_str}.\n\n"
                    f"Common reasons people notice this symptom (information only, not a diagnosis):\n"
                    f"• Mild tension, fatigue, lack of sleep, or slight dehydration\n"
                    f"• Early immune or environmental response\n\n"
                    f"Recommended Self-Care:\n"
                    f"• Rest, stay well-hydrated, and monitor symptoms over the next 24–48 hours.\n"
                    f"• Do not start unprescribed antibiotics or prescription medicines.\n"
                    f"• If your condition worsens or high fever/difficulty breathing develops, consult a doctor immediately.\n\n"
                    f"Note: Med44 gives general information, not medical advice or a diagnosis. For emergencies call 112."
                )

        urgency = "YELLOW" if (primary_cond and "severe" in advice.lower()) else "GREEN"
        return urgency, advice


# Singleton instance
clinical_kb = OfflineClinicalKnowledgeBase()

