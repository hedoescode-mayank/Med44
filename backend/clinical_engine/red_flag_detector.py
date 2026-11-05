"""
Detects emergency red flags that require immediate escalation.
ALWAYS runs before any other response.
Integrates red-flag rules from Med44 Clinical Knowledge Base v1.0.
Cannot be overridden or disabled.
"""
from typing import List
from .knowledge_base import clinical_kb

RED_FLAG_KEYWORDS = {
    "en": [
        ("chest pain", "CRITICAL", "Call 112 - Possible cardiac emergency"),
        ("chest tightness", "CRITICAL", "Call 112 - Possible cardiac emergency"),
        ("can't breathe", "CRITICAL", "Call 112 - Respiratory emergency"),
        ("cannot breathe", "CRITICAL", "Call 112 - Respiratory emergency"),
        ("difficulty breathing", "CRITICAL", "Call 112 - Respiratory emergency"),
        ("severe bleeding", "CRITICAL", "Call 112 immediately"),
        ("unconscious", "CRITICAL", "Call 112 immediately"),
        ("stroke", "CRITICAL", "Call 112 - Possible stroke"),
        ("seizure", "CRITICAL", "Call 112 immediately"),
        ("convulsion", "CRITICAL", "Call 112 immediately"),
        ("suicidal", "CRITICAL", "Call iCall: 9152987821"),
        ("want to die", "CRITICAL", "Call iCall: 9152987821"),
        ("kill myself", "CRITICAL", "Call iCall: 9152987821"),
        ("poison", "HIGH", "Call Poison Control: 1800-116-117"),
        ("overdose", "CRITICAL", "Call 112 immediately"),
        ("heart attack", "CRITICAL", "Call 112 immediately"),
        ("anaphylaxis", "CRITICAL", "Call 112 - Severe allergic reaction"),
        ("severe allergic", "CRITICAL", "Call 112 - Severe allergic reaction"),
        ("severe burn", "HIGH", "Go to emergency immediately"),
        ("choking", "CRITICAL", "Perform Heimlich maneuver, call 112"),
        ("coughing blood", "HIGH", "Seek immediate medical attention"),
        ("vomiting blood", "CRITICAL", "Call 112 immediately"),
        ("blood in vomit", "CRITICAL", "Call 112 immediately"),
        ("sudden numbness", "CRITICAL", "Call 112 - Possible stroke (FAST test)"),
        ("facial drooping", "CRITICAL", "Call 112 - Possible stroke"),
        ("face drooping", "CRITICAL", "Call 112 - Possible stroke"),
        ("slurred speech", "CRITICAL", "Call 112 - Possible stroke"),
        ("sudden vision loss", "CRITICAL", "Call 112 immediately"),
        ("high blood pressure", "HIGH", "Seek urgent medical evaluation"),
    ],
    "hi": [
        ("सीने में दर्द", "CRITICAL", "112 पर कॉल करें - संभावित हृदय आपात"),
        ("सांस नहीं ले पा रहा", "CRITICAL", "112 पर कॉल करें"),
        ("सांस नहीं आ रही", "CRITICAL", "112 पर कॉल करें"),
        ("बेहोश", "CRITICAL", "112 पर कॉल करें"),
        ("मरना चाहता", "CRITICAL", "iCall: 9152987821"),
        ("मरना चाहती", "CRITICAL", "iCall: 9152987821"),
        ("दौरा", "CRITICAL", "112 पर कॉल करें"),
        ("दिल का दौरा", "CRITICAL", "112 पर कॉल करें"),
        ("खून उल्टी", "CRITICAL", "112 पर कॉल करें"),
        ("ज़हर खाया", "CRITICAL", "112 पर कॉल करें - विष नियंत्रण: 1800-116-117"),
    ],
    "ta": [
        ("மார்பு வலி", "CRITICAL", "112 அழைக்கவும்"),
        ("மூச்சு விட முடியவில்லை", "CRITICAL", "112 அழைக்கவும்"),
        ("மயக்கம்", "CRITICAL", "112 அழைக்கவும்"),
        ("இறந்துவிட வேண்டும்", "CRITICAL", "iCall: 9152987821"),
        ("வலிப்பு", "CRITICAL", "112 அழைக்கவும்"),
        ("இரத்த வாந்தி", "CRITICAL", "112 அழைக்கவும்"),
    ],
}


def detect_red_flags(text: str, language: str = "en") -> List[dict]:
    """
    Detect emergency red flags in patient text.
    ALWAYS runs - cannot be disabled.
    Returns list of red flags found (empty if none).
    """
    text_lower = text.lower()
    flags: List[dict] = []
    seen_keywords = set()

    # 1. Check built-in multilingual keywords
    keywords = RED_FLAG_KEYWORDS.get(language, []) + (
        RED_FLAG_KEYWORDS.get("en", []) if language != "en" else []
    )

    for phrase, severity, action in keywords:
        if phrase.lower() in text_lower:
            if phrase not in seen_keywords:
                seen_keywords.add(phrase)
                flags.append({
                    "keyword": phrase,
                    "severity": severity,
                    "action": action,
                    "language": language,
                })

    # 2. Check 12 red flag rules from Offline Knowledge Base JSON
    kb_flags = clinical_kb.check_red_flags(text)
    for kf in kb_flags:
        t = kf["trigger_term"]
        if t not in seen_keywords:
            seen_keywords.add(t)
            flags.append({
                "keyword": t,
                "severity": "CRITICAL",
                "action": kf["action"] + " — " + kf["message"],
                "language": language,
            })

    return flags


def has_critical_red_flag(text: str, language: str = "en") -> bool:
    flags = detect_red_flags(text, language)
    return any(f["severity"] == "CRITICAL" for f in flags)
