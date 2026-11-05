"""
Follow-up question engine.
For each matched symptom, generates relevant follow-up questions.
Tracks already-answered questions and returns the next unanswered one.
"""
from typing import List, Optional

# In-memory follow-up questions per symptom
# Format: {symptom: [{field, en, hi, ta, required}]}
FOLLOWUP_QUESTIONS = {
    "fever": [
        {
            "field": "duration",
            "en": "How long have you had the fever?",
            "hi": "आपको बुखार कितने समय से है?",
            "ta": "உங்களுக்கு காய்ச்சல் எத்தனை நாட்களாக உள்ளது?",
            "required": True,
        },
        {
            "field": "temperature",
            "en": "Have you measured your temperature? If so, what was the reading?",
            "hi": "क्या आपने तापमान मापा? यदि हां, कितना था?",
            "ta": "உங்கள் வெப்பநிலையை அளந்தீர்களா? என்ன வந்தது?",
            "required": False,
        },
        {
            "field": "chills",
            "en": "Do you have chills or shivering with the fever?",
            "hi": "क्या बुखार के साथ ठंड लग रही है?",
            "ta": "காய்ச்சலுடன் நடுக்கம் உள்ளதா?",
            "required": False,
        },
    ],
    "headache": [
        {
            "field": "severity",
            "en": "On a scale of 1-10, how severe is the headache?",
            "hi": "1-10 के पैमाने पर, सिरदर्द कितना तीव्र है?",
            "ta": "1-10 அளவில், தலைவலி எவ்வளவு தீவிரமானது?",
            "required": True,
        },
        {
            "field": "duration",
            "en": "How long has the headache lasted?",
            "hi": "सिरदर्द कितने समय से है?",
            "ta": "தலைவலி எத்தனை நேரமாக உள்ளது?",
            "required": True,
        },
        {
            "field": "location",
            "en": "Where is the headache - forehead, temples, or back of the head?",
            "hi": "दर्द कहाँ है - माथे में, कनपटी में, या सिर के पीछे?",
            "ta": "தலைவலி எங்கே உள்ளது?",
            "required": False,
        },
    ],
    "chest_pain": [
        {
            "field": "onset",
            "en": "Did the chest pain come on suddenly or gradually?",
            "hi": "क्या सीने का दर्द अचानक शुरू हुआ या धीरे-धीरे?",
            "ta": "மார்பு வலி திடீரென தொடங்கியதா அல்லது மெதுவாகவா?",
            "required": True,
        },
        {
            "field": "radiation",
            "en": "Does the pain spread to your left arm, jaw, or back?",
            "hi": "क्या दर्द बाँई बाँह, जबड़े या पीठ में फैलता है?",
            "ta": "வலி இடது கை, தாடை அல்லது முதுகுக்கு பரவுகிறதா?",
            "required": True,
        },
        {
            "field": "sweating",
            "en": "Do you have sweating, nausea, or shortness of breath with the pain?",
            "hi": "क्या दर्द के साथ पसीना, जी मिचलाना, या सांस की तकलीफ है?",
            "ta": "வலியுடன் வியர்வை, குமட்டல் அல்லது மூச்சுத்திணறல் உள்ளதா?",
            "required": True,
        },
    ],
    "cough": [
        {
            "field": "duration",
            "en": "How long have you had the cough?",
            "hi": "खांसी कितने समय से है?",
            "ta": "இருமல் எத்தனை நாட்களாக உள்ளது?",
            "required": True,
        },
        {
            "field": "productive",
            "en": "Is it a dry cough or are you coughing up mucus/phlegm?",
            "hi": "क्या यह सूखी खांसी है या बलगम आ रहा है?",
            "ta": "இது வறட்டு இருமலா அல்லது சளி வருகிறதா?",
            "required": True,
        },
        {
            "field": "blood",
            "en": "Have you noticed any blood when coughing?",
            "hi": "क्या खांसी में खून आया है?",
            "ta": "இருமும்போது இரத்தம் வருகிறதா?",
            "required": True,
        },
    ],
    "diarrhea": [
        {
            "field": "frequency",
            "en": "How many times per day do you have loose stools?",
            "hi": "दिन में कितनी बार दस्त हो रहे हैं?",
            "ta": "ஒரு நாளில் எத்தனை முறை வயிற்றுப்போக்கு உள்ளது?",
            "required": True,
        },
        {
            "field": "blood",
            "en": "Is there any blood or mucus in the stool?",
            "hi": "क्या मल में खून या बलगम है?",
            "ta": "மலத்தில் இரத்தம் அல்லது சளி உள்ளதா?",
            "required": True,
        },
        {
            "field": "hydration",
            "en": "Are you able to drink fluids and keep them down?",
            "hi": "क्या आप पानी पी पा रहे हैं?",
            "ta": "நீர் குடிக்க முடிகிறதா?",
            "required": True,
        },
    ],
    "vomiting": [
        {
            "field": "frequency",
            "en": "How many times have you vomited?",
            "hi": "कितनी बार उल्टी हुई है?",
            "ta": "எத்தனை முறை வாந்தி ஆனது?",
            "required": True,
        },
        {
            "field": "blood",
            "en": "Is there any blood in the vomit?",
            "hi": "क्या उल्टी में खून है?",
            "ta": "வாந்தியில் இரத்தம் உள்ளதா?",
            "required": True,
        },
    ],
    "abdominal_pain": [
        {
            "field": "location",
            "en": "Where exactly is the pain - upper right, upper left, lower right, lower left, or all over?",
            "hi": "दर्द ठीक कहाँ है - ऊपर दाएं, ऊपर बाएं, नीचे दाएं, नीचे बाएं, या पूरे पेट में?",
            "ta": "வலி எங்கே உள்ளது - மேல் வலது, மேல் இடது, கீழ் வலது, கீழ் இடது?",
            "required": True,
        },
        {
            "field": "severity",
            "en": "On a scale of 1-10, how severe is the pain?",
            "hi": "1-10 के पैमाने पर, दर्द कितना तीव्र है?",
            "ta": "1-10 அளவில், வலி எவ்வளவு தீவிரமானது?",
            "required": True,
        },
    ],
    "dizziness": [
        {
            "field": "trigger",
            "en": "Does the dizziness occur when you stand up suddenly?",
            "hi": "क्या अचानक उठने पर चक्कर आते हैं?",
            "ta": "திடீரென எழுந்திரிக்கும்போது தலைச்சுற்றல் வருகிறதா?",
            "required": True,
        },
        {
            "field": "duration",
            "en": "How long does each episode of dizziness last?",
            "hi": "चक्कर का प्रत्येक दौरा कितनी देर तक रहता है?",
            "ta": "தலைச்சுற்றல் எவ்வளவு நேரம் நீடிக்கிறது?",
            "required": True,
        },
    ],
    "breathing_difficulty": [
        {
            "field": "severity",
            "en": "Can you speak full sentences without getting out of breath?",
            "hi": "क्या आप बिना सांस फूले पूरे वाक्य बोल सकते हैं?",
            "ta": "மூச்சு இல்லாமல் முழு வாக்கியங்கள் பேச முடிகிறதா?",
            "required": True,
        },
        {
            "field": "onset",
            "en": "Did the breathing difficulty start suddenly?",
            "hi": "क्या सांस की तकलीफ अचानक शुरू हुई?",
            "ta": "மூச்சு திணறல் திடீரென தொடங்கியதா?",
            "required": True,
        },
    ],
}

# Default questions for symptoms without specific follow-ups
DEFAULT_QUESTIONS = [
    {
        "field": "duration",
        "en": "How long have you been experiencing this?",
        "hi": "आप इसे कितने समय से अनुभव कर रहे हैं?",
        "ta": "இது எத்தனை நாட்களாக உள்ளது?",
        "required": True,
    },
    {
        "field": "severity",
        "en": "On a scale of 1-10, how severe is the symptom?",
        "hi": "1-10 के पैमाने पर, लक्षण कितना तीव्र है?",
        "ta": "1-10 அளவில், அறிகுறி எவ்வளவு தீவிரமானது?",
        "required": True,
    },
]


def get_followup_questions(
    matched_symptoms: List[str],
    answered_fields: Optional[List[str]] = None,
    language: str = "en",
    max_questions: int = 3,
) -> List[dict]:
    """
    Get next unanswered follow-up questions for matched symptoms.
    Returns list of questions in the requested language.
    """
    answered_fields = answered_fields or []
    questions_to_ask: List[dict] = []
    seen_fields = set(answered_fields)

    for symptom in matched_symptoms:
        q_list = FOLLOWUP_QUESTIONS.get(symptom, DEFAULT_QUESTIONS)
        for q in q_list:
            field_key = f"{symptom}:{q['field']}"
            if field_key not in seen_fields:
                questions_to_ask.append({
                    "symptom": symptom,
                    "field": q["field"],
                    "question": q.get(language, q["en"]),  # fallback to English
                    "required": q["required"],
                    "field_key": field_key,
                })
                seen_fields.add(field_key)

            if len(questions_to_ask) >= max_questions:
                return questions_to_ask

    return questions_to_ask


def get_next_question(
    matched_symptoms: List[str],
    answered_fields: Optional[List[str]] = None,
    language: str = "en",
) -> Optional[dict]:
    """Get the single most important next follow-up question."""
    questions = get_followup_questions(
        matched_symptoms, answered_fields, language, max_questions=1
    )
    return questions[0] if questions else None

