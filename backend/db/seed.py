"""
Seed database with SYNTHETIC demo data.
All entries are clearly marked as synthetic/demo data.
"""
import json
import datetime
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import AsyncSessionLocal, init_db
from backend.db.models import (
    Patient, Symptom, SymptomAlias, ClinicalRule, RedFlag,
    FollowupQuestion, HealthArticle, Medication, DrugWarning,
    Doctor, Appointment, MedicalHistory, Prescription,
)
import bcrypt


def _hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def seed_database():
    """Idempotent seed - skips if already seeded."""
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(select(Patient).limit(1))
        if result.scalar_one_or_none():
            return  # Already seeded

        await _seed_patients(db)
        await _seed_symptoms(db)
        await _seed_clinical_rules(db)
        await _seed_red_flags(db)
        await _seed_followup_questions(db)
        await _seed_health_articles(db)
        await _seed_medications(db)
        await _seed_doctors(db)
        await _seed_sample_appointments(db)
        await db.commit()
        print("[SEED] Database seeded with SYNTHETIC demo data.")


# ---------------------------------------------------------------------------
# Patients - SYNTHETIC DATA
# ---------------------------------------------------------------------------
async def _seed_patients(db: AsyncSession):
    patients = [
        Patient(
            name="Demo User",
            email="demo@med44.ai",
            hashed_password=_hash_pw("demo123"),
            age=30,
            gender="Male",
            blood_group="O+",
            allergies="Penicillin",
            language_pref="en",
        ),
        Patient(
            name="Priya Sharma",   # SYNTHETIC
            email="priya@demo.med44.ai",
            hashed_password=_hash_pw("demo123"),
            age=28,
            gender="Female",
            blood_group="A+",
            allergies="",
            language_pref="hi",
        ),
        Patient(
            name="Arjun Kumar",   # SYNTHETIC
            email="arjun@demo.med44.ai",
            hashed_password=_hash_pw("demo123"),
            age=45,
            gender="Male",
            blood_group="B+",
            allergies="Sulfa drugs",
            language_pref="ta",
        ),
    ]
    db.add_all(patients)
    await db.flush()


# ---------------------------------------------------------------------------
# Symptoms + Aliases - SYNTHETIC DATA
# ---------------------------------------------------------------------------
SYMPTOM_SEED = [
    # (name, category, severity_weight, [en_aliases], [hi_aliases], [ta_aliases])
    ("fever", "general", 2.0,
     ["fever", "high temperature", "temperature", "pyrexia", "febrile"],
     ["बुखार", "ताप", "बुखार है", "तेज़ बुखार"],
     ["காய்ச்சல்", "காய்ச்சல் இருக்கிறது", "ஜுரம்"]),
    ("headache", "neurological", 1.5,
     ["headache", "head pain", "head ache", "migraine", "head hurts"],
     ["सिरदर्द", "सिर दर्द", "सिर में दर्द", "माइग्रेन"],
     ["தலைவலி", "தலை வலி", "தலைவலி இருக்கிறது"]),
    ("cough", "respiratory", 1.5,
     ["cough", "coughing", "dry cough", "wet cough", "persistent cough"],
     ["खांसी", "कफ", "सूखी खांसी", "बलगम वाली खांसी"],
     ["இருமல்", "இருமல் வருகிறது", "கஷாயம்"]),
    ("chest_pain", "cardiac", 4.0,
     ["chest pain", "chest ache", "chest discomfort", "chest tightness", "chest pressure"],
     ["सीने में दर्द", "छाती में दर्द", "सीने में तकलीफ"],
     ["மார்பு வலி", "நெஞ்சு வலி", "மார்பு வலி உள்ளது"]),
    ("breathing_difficulty", "respiratory", 4.0,
     ["breathing difficulty", "shortness of breath", "can't breathe", "cannot breathe",
      "breathlessness", "dyspnea", "hard to breathe", "difficulty breathing"],
     ["सांस लेने में तकलीफ", "सांस नहीं आ रही", "दम फूलना", "सांस की समस्या"],
     ["மூச்சு விட முடியவில்லை", "மூச்சு திணறல்", "சுவாச கஷ்டம்"]),
    ("vomiting", "gastrointestinal", 1.5,
     ["vomiting", "vomit", "throwing up", "nausea and vomiting", "emesis"],
     ["उल्टी", "उल्टी हो रही है", "जी मिचलाना और उल्टी"],
     ["வாந்தி", "வாந்தி வருகிறது", "குமட்டல்"]),
    ("diarrhea", "gastrointestinal", 1.5,
     ["diarrhea", "diarrhoea", "loose stools", "loose motions", "watery stool"],
     ["दस्त", "पेचिश", "ढीले दस्त", "पानी वाले दस्त"],
     ["வயிற்றுப்போக்கு", "வயிறு பிரச்சனை", "அதிக மலம்"]),
    ("abdominal_pain", "gastrointestinal", 2.0,
     ["abdominal pain", "stomach pain", "belly pain", "stomach ache", "stomach cramps", "gut pain"],
     ["पेट दर्द", "पेट में दर्द", "उदर दर्द"],
     ["வயிற்று வலி", "வயிறு வலிக்கிறது", "வயிற்று வலி உள்ளது"]),
    ("back_pain", "musculoskeletal", 1.5,
     ["back pain", "backache", "lower back pain", "spine pain", "back ache"],
     ["पीठ दर्द", "कमर दर्द", "पीठ में दर्द"],
     ["முதுகு வலி", "இடுப்பு வலி"]),
    ("joint_pain", "musculoskeletal", 1.5,
     ["joint pain", "joint ache", "arthralgia", "joints ache", "knee pain", "hip pain"],
     ["जोड़ों में दर्द", "घुटने में दर्द", "संधि शूल"],
     ["மூட்டு வலி", "மூட்டு வலி உள்ளது"]),
    ("fatigue", "general", 1.5,
     ["fatigue", "tiredness", "exhaustion", "weakness", "lack of energy", "lethargy"],
     ["थकान", "कमज़ोरी", "थकावट", "ऊर्जा की कमी"],
     ["சோர்வு", "களைப்பு", "சோர்வாக இருக்கிறேன்"]),
    ("dizziness", "neurological", 2.0,
     ["dizziness", "dizzy", "vertigo", "lightheadedness", "feeling faint", "spinning"],
     ["चक्कर आना", "सिर चकराना", "चक्कर"],
     ["தலைச்சுற்றல்", "தலை சுற்றுகிறது"]),
    ("nausea", "gastrointestinal", 1.0,
     ["nausea", "nauseous", "sick feeling", "queasy", "want to vomit"],
     ["जी मिचलाना", "उबकाई", "मतली"],
     ["குமட்டல்", "வாந்தி உணர்வு"]),
    ("sore_throat", "ENT", 1.0,
     ["sore throat", "throat pain", "throat ache", "strep throat", "throat infection"],
     ["गले में दर्द", "गले में खराश", "गला दुखना"],
     ["தொண்டை வலி", "தொண்டை கரகரப்பு"]),
    ("rash", "dermatology", 1.5,
     ["rash", "skin rash", "hives", "urticaria", "itchy skin", "red spots", "skin eruption"],
     ["दाने", "चकत्ते", "खुजली"],
     ["தோல் வெடிப்பு", "தடிப்பு"]),
    ("swelling", "general", 2.0,
     ["swelling", "swollen", "edema", "puffiness", "bloating"],
     ["सूजन", "फूलना"],
     ["வீக்கம்", "வீக்கம் உள்ளது"]),
    ("blurred_vision", "ophthalmology", 2.5,
     ["blurred vision", "blurry vision", "vision loss", "can't see clearly", "double vision"],
     ["धुंधली दृष्टि", "आँखें धुंधली", "दृष्टि कम होना"],
     ["மங்கலான பார்வை", "தெளிவற்ற பார்வை"]),
    ("confusion", "neurological", 3.0,
     ["confusion", "confused", "disorientation", "altered mental status", "not thinking clearly"],
     ["भ्रम", "भटकाव", "समझ नहीं आ रहा"],
     ["குழப்பம்", "மனக்குழப்பம்"]),
    ("weakness", "neurological", 2.5,
     ["weakness", "muscle weakness", "limb weakness", "arm weakness", "leg weakness"],
     ["कमज़ोरी", "मांसपेशियों की कमज़ोरी"],
     ["பலவீனம்", "தசை பலவீனம்"]),
    ("palpitations", "cardiac", 3.0,
     ["palpitations", "heart racing", "fast heartbeat", "irregular heartbeat", "heart fluttering"],
     ["धड़कन बढ़ना", "दिल तेज़ धड़कना", "अनियमित धड़कन"],
     ["படபடப்பு", "இதய படபடப்பு"]),
    # Additional symptoms
    ("runny_nose", "ENT", 0.5,
     ["runny nose", "nasal discharge", "rhinorrhea", "stuffy nose"],
     ["नाक बहना", "नाक से पानी"], ["மூக்கு ஒழுகுதல்"]),
    ("ear_pain", "ENT", 1.0,
     ["ear pain", "earache", "ear ache", "otitis"],
     ["कान में दर्द", "कान दर्द"], ["காது வலி"]),
    ("eye_pain", "ophthalmology", 1.5,
     ["eye pain", "eye ache", "red eyes", "conjunctivitis", "pink eye"],
     ["आँख में दर्द", "आँखें लाल"], ["கண் வலி", "கண் சிவத்தல்"]),
    ("urinary_pain", "urology", 1.5,
     ["urinary pain", "burning urination", "painful urination", "dysuria"],
     ["पेशाब में जलन", "मूत्र विकार"], ["சிறுநீர் கழிக்கும்போது வலி"]),
    ("sleep_problem", "general", 1.0,
     ["insomnia", "can't sleep", "sleep problem", "sleeplessness", "sleep disorder"],
     ["नींद नहीं आना", "अनिद्रा"], ["தூக்கமின்மை"]),
    ("anxiety", "mental_health", 1.5,
     ["anxiety", "anxious", "panic attack", "nervousness", "worry"],
     ["चिंता", "घबराहट", "बेचैनी"], ["கவலை", "பதட்டம்"]),
    ("depression", "mental_health", 2.0,
     ["depression", "depressed", "feeling low", "sad all the time"],
     ["अवसाद", "उदास रहना"], ["மனச்சோர்வு"]),
    ("numbness", "neurological", 2.0,
     ["numbness", "numb", "tingling", "pins and needles", "paresthesia"],
     ["सुन्नपन", "झनझनाहट"], ["உணர்வின்மை", "மரமரப்பு"]),
    ("loss_of_appetite", "gastrointestinal", 1.0,
     ["loss of appetite", "not hungry", "anorexia", "decreased appetite"],
     ["भूख न लगना", "खाने की इच्छा नहीं"], ["பசியின்மை"]),
    ("weight_loss", "general", 2.0,
     ["weight loss", "losing weight", "unexplained weight loss"],
     ["वज़न कम होना", "अनजाने में वज़न कम"], ["எடை குறைதல்"]),
    ("night_sweats", "general", 1.5,
     ["night sweats", "sweating at night", "excessive sweating"],
     ["रात को पसीना", "अत्यधिक पसीना"], ["இரவு வியர்வை"]),
    ("constipation", "gastrointestinal", 1.0,
     ["constipation", "can't poop", "hard stool", "no bowel movement"],
     ["कब्ज", "मल नहीं होना"], ["மலச்சிக்கல்"]),
]


async def _seed_symptoms(db: AsyncSession):
    for name, category, weight, en_aliases, hi_aliases, ta_aliases in SYMPTOM_SEED:
        s = Symptom(name=name, category=category, severity_weight=weight)
        db.add(s)
        await db.flush()
        for a in en_aliases:
            db.add(SymptomAlias(symptom_id=s.id, alias=a, language="en"))
        for a in hi_aliases:
            db.add(SymptomAlias(symptom_id=s.id, alias=a, language="hi"))
        for a in ta_aliases:
            db.add(SymptomAlias(symptom_id=s.id, alias=a, language="ta"))
    await db.flush()


# ---------------------------------------------------------------------------
# Clinical Rules - SYNTHETIC DATA - reviewed by SYNTHETIC reviewer
# ---------------------------------------------------------------------------
CLINICAL_RULES = [
    {
        "name": "Fever Management",
        "symptoms": ["fever"],
        "action": "Rest and stay hydrated. Use paracetamol if temperature is above 38°C. Consult a doctor if fever persists beyond 3 days or exceeds 40°C.",
        "urgency": "GREEN",
        "source": "WHO Fever Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Severe Headache Protocol",
        "symptoms": ["headache", "confusion"],
        "action": "Severe headache with confusion may indicate meningitis or intracranial emergency. Seek immediate medical attention.",
        "urgency": "RED",
        "source": "Emergency Medicine Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Chest Pain Emergency",
        "symptoms": ["chest_pain"],
        "action": "EMERGENCY: Call 112 immediately. Possible cardiac event. Do not drive yourself. Chew aspirin 325mg if available and not allergic.",
        "urgency": "RED",
        "source": "AHA Cardiac Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Breathing Difficulty Emergency",
        "symptoms": ["breathing_difficulty"],
        "action": "EMERGENCY: Call 112 immediately. Severe breathing difficulty is life-threatening.",
        "urgency": "RED",
        "source": "Emergency Medicine Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Chest Pain with Breathing Difficulty",
        "symptoms": ["chest_pain", "breathing_difficulty"],
        "action": "CRITICAL EMERGENCY: Call 112 immediately. Possible pulmonary embolism or cardiac arrest.",
        "urgency": "RED",
        "source": "Emergency Medicine Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Gastroenteritis Protocol",
        "symptoms": ["vomiting", "diarrhea"],
        "action": "Stay hydrated with ORS (Oral Rehydration Solution). Avoid solid food for 4-6 hours. Consult doctor if symptoms persist beyond 24 hours or if blood appears in stool.",
        "urgency": "YELLOW",
        "source": "WHO Diarrheal Disease Management (Synthetic Demo Data)",
    },
    {
        "name": "Fever with Rash",
        "symptoms": ["fever", "rash"],
        "action": "Fever with rash can indicate infections like dengue, measles, or chickenpox. Consult a doctor promptly.",
        "urgency": "YELLOW",
        "source": "Infectious Disease Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Upper Respiratory Infection",
        "symptoms": ["cough", "sore_throat", "runny_nose"],
        "action": "Rest, stay hydrated, gargle with warm salt water. Use honey-lemon for sore throat. If fever develops or symptoms worsen, see a doctor.",
        "urgency": "GREEN",
        "source": "Primary Care Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Migraine Protocol",
        "symptoms": ["headache", "nausea", "blurred_vision"],
        "action": "Rest in a dark, quiet room. Apply cold pack. OTC pain relief may help. If severe, consult a neurologist.",
        "urgency": "YELLOW",
        "source": "Neurology Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Cardiac Palpitation Alert",
        "symptoms": ["palpitations", "chest_pain"],
        "action": "Palpitations with chest pain may indicate arrhythmia. Seek immediate medical evaluation. Call 112.",
        "urgency": "RED",
        "source": "Cardiology Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Stroke Warning Signs",
        "symptoms": ["confusion", "weakness", "blurred_vision"],
        "action": "EMERGENCY: May indicate stroke. FAST test: Face drooping, Arm weakness, Speech difficulty, Time to call 112.",
        "urgency": "RED",
        "source": "Stroke Association Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Dehydration Protocol",
        "symptoms": ["diarrhea", "vomiting", "weakness"],
        "action": "Severe dehydration risk. ORS every 15 minutes. If unable to keep fluids down, IV hydration may be needed - go to clinic.",
        "urgency": "YELLOW",
        "source": "WHO Rehydration Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Anxiety Management",
        "symptoms": ["anxiety", "palpitations"],
        "action": "Practice deep breathing (4-7-8 technique). Reduce caffeine intake. If panic attacks are frequent, consult a mental health professional.",
        "urgency": "GREEN",
        "source": "Mental Health Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Urinary Tract Infection",
        "symptoms": ["urinary_pain", "fever"],
        "action": "Possible UTI. Increase fluid intake. Consult a doctor for antibiotic assessment. Do not self-medicate.",
        "urgency": "YELLOW",
        "source": "Urology Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Musculoskeletal Pain",
        "symptoms": ["back_pain", "joint_pain"],
        "action": "Rest and avoid heavy lifting. Apply warm/cold pack. OTC pain relief may help. See doctor if pain is severe or persists > 1 week.",
        "urgency": "GREEN",
        "source": "Orthopedic Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Weight Loss Alert",
        "symptoms": ["weight_loss", "fatigue", "night_sweats"],
        "action": "Unexplained weight loss with fatigue and night sweats warrants medical evaluation. See a doctor promptly.",
        "urgency": "YELLOW",
        "source": "Internal Medicine Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Depression Screening",
        "symptoms": ["depression", "sleep_problem", "loss_of_appetite"],
        "action": "These symptoms may indicate depression. Please speak with a mental health professional. iCall helpline: 9152987821",
        "urgency": "YELLOW",
        "source": "Mental Health Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Severe Abdominal Pain",
        "symptoms": ["abdominal_pain", "vomiting", "fever"],
        "action": "Could indicate appendicitis, pancreatitis, or other serious conditions. Seek immediate medical attention.",
        "urgency": "RED",
        "source": "Emergency Medicine Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Dizziness Evaluation",
        "symptoms": ["dizziness", "nausea"],
        "action": "Rest and avoid sudden movements. Stay hydrated. If dizziness is severe or recurrent, consult an ENT or neurologist.",
        "urgency": "YELLOW",
        "source": "Neurology Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Eye Strain / Infection",
        "symptoms": ["eye_pain", "blurred_vision"],
        "action": "Avoid screen time. If redness or discharge present, consult an ophthalmologist promptly.",
        "urgency": "YELLOW",
        "source": "Ophthalmology Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Ear Infection",
        "symptoms": ["ear_pain", "fever"],
        "action": "May indicate otitis media. See a doctor for evaluation. Do not insert objects in the ear.",
        "urgency": "YELLOW",
        "source": "ENT Guidelines (Synthetic Demo Data)",
    },
    {
        "name": "Peripheral Neuropathy Warning",
        "symptoms": ["numbness", "weakness"],
        "action": "Numbness with weakness may indicate nerve damage or circulatory issue. Consult a neurologist.",
        "urgency": "YELLOW",
        "source": "Neurology Guidelines (Synthetic Demo Data)",
    },
]


async def _seed_clinical_rules(db: AsyncSession):
    for r in CLINICAL_RULES:
        db.add(ClinicalRule(
            name=r["name"],
            symptoms_json=json.dumps(r["symptoms"]),
            action=r["action"],
            urgency_level=r["urgency"],
            source=r["source"],
            version="1.0",
            review_status="SYNTHETIC_DEMO",
            reviewer="Med44 Demo System",
        ))
    await db.flush()


# ---------------------------------------------------------------------------
# Red Flags - SYNTHETIC DATA
# ---------------------------------------------------------------------------
RED_FLAG_DATA = [
    # English
    ("chest pain", "en", "CRITICAL", "Call 112 - Possible cardiac emergency"),
    ("can't breathe", "en", "CRITICAL", "Call 112 - Respiratory emergency"),
    ("cannot breathe", "en", "CRITICAL", "Call 112 - Respiratory emergency"),
    ("severe bleeding", "en", "CRITICAL", "Call 112 immediately"),
    ("unconscious", "en", "CRITICAL", "Call 112 immediately"),
    ("stroke", "en", "CRITICAL", "Call 112 - Possible stroke"),
    ("seizure", "en", "CRITICAL", "Call 112 immediately"),
    ("suicidal", "en", "CRITICAL", "Call iCall: 9152987821"),
    ("want to die", "en", "CRITICAL", "Call iCall: 9152987821"),
    ("poison", "en", "HIGH", "Call Poison Control: 1800-116-117"),
    ("overdose", "en", "CRITICAL", "Call 112 immediately"),
    ("heart attack", "en", "CRITICAL", "Call 112 immediately"),
    ("anaphylaxis", "en", "CRITICAL", "Call 112 - Severe allergic reaction"),
    ("severe burn", "en", "HIGH", "Go to emergency immediately"),
    ("choking", "en", "CRITICAL", "Perform Heimlich maneuver, call 112"),
    # Hindi
    ("सीने में दर्द", "hi", "CRITICAL", "112 पर कॉल करें - संभावित हृदय आपात"),
    ("सांस नहीं ले पा रहा", "hi", "CRITICAL", "112 पर कॉल करें"),
    ("बेहोश", "hi", "CRITICAL", "112 पर कॉल करें"),
    ("मरना चाहता", "hi", "CRITICAL", "iCall: 9152987821"),
    ("दौरा", "hi", "CRITICAL", "112 पर कॉल करें"),
    # Tamil
    ("மார்பு வலி", "ta", "CRITICAL", "112 அழைக்கவும்"),
    ("மூச்சு விட முடியவில்லை", "ta", "CRITICAL", "112 அழைக்கவும்"),
    ("மயக்கம்", "ta", "CRITICAL", "112 அழைக்கவும்"),
]


async def _seed_red_flags(db: AsyncSession):
    for keyword, lang, urgency, action in RED_FLAG_DATA:
        db.add(RedFlag(
            keyword=keyword,
            language=lang,
            urgency=urgency,
            action=action,
            source="Med44 Safety System (Synthetic Demo Data)",
        ))
    await db.flush()


# ---------------------------------------------------------------------------
# Followup Questions - SYNTHETIC DATA
# ---------------------------------------------------------------------------
async def _seed_followup_questions(db: AsyncSession):
    # We need symptom IDs
    result = await db.execute(select(Symptom))
    symptoms = {s.name: s.id for s in result.scalars().all()}

    questions = []
    if "fever" in symptoms:
        sid = symptoms["fever"]
        questions += [
            FollowupQuestion(symptom_id=sid, field_name="duration",
                question_en="How long have you had the fever?",
                question_hi="आपको बुखार कितने समय से है?",
                question_ta="உங்களுக்கு காய்ச்சல் எத்தனை நாட்களாக உள்ளது?",
                is_required=True),
            FollowupQuestion(symptom_id=sid, field_name="temperature",
                question_en="Have you measured your temperature? If so, what was the reading?",
                question_hi="क्या आपने तापमान मापा? यदि हां, तो कितना था?",
                question_ta="உங்கள் வெப்பநிலையை அளந்தீர்களா? என்ன வந்தது?",
                is_required=False),
            FollowupQuestion(symptom_id=sid, field_name="chills",
                question_en="Do you have chills or shivering with the fever?",
                question_hi="क्या बुखार के साथ ठंड लग रही है?",
                question_ta="காய்ச்சலுடன் நடுக்கம் உள்ளதா?",
                is_required=False),
            FollowupQuestion(symptom_id=sid, field_name="travel",
                question_en="Have you traveled recently or been around someone who was sick?",
                question_hi="क्या आप हाल ही में यात्रा करके आए हैं या किसी बीमार से मिले हैं?",
                question_ta="சமீபத்தில் பயணம் செய்தீர்களா அல்லது நோயாளியுடன் தொடர்பில் இருந்தீர்களா?",
                is_required=False),
        ]
    if "headache" in symptoms:
        sid = symptoms["headache"]
        questions += [
            FollowupQuestion(symptom_id=sid, field_name="duration",
                question_en="How long has the headache lasted?",
                question_hi="सिरदर्द कितने समय से है?",
                question_ta="தலைவலி எத்தனை நேரமாக உள்ளது?",
                is_required=True),
            FollowupQuestion(symptom_id=sid, field_name="severity",
                question_en="On a scale of 1-10, how severe is the pain? (10 = worst ever)",
                question_hi="1-10 के पैमाने पर, दर्द कितना तीव्र है? (10 = सबसे ज़्यादा)",
                question_ta="1-10 அளவில், வலி எவ்வளவு தீவிரமானது?",
                is_required=True),
            FollowupQuestion(symptom_id=sid, field_name="location",
                question_en="Where exactly is the headache - forehead, temples, or back of head?",
                question_hi="सिरदर्द कहाँ है - माथे में, कनपटी में, या सिर के पीछे?",
                question_ta="தலைவலி எங்கே உள்ளது - நெற்றி, கோயில், அல்லது தலையின் பின்புறம்?",
                is_required=False),
        ]
    if "chest_pain" in symptoms:
        sid = symptoms["chest_pain"]
        questions += [
            FollowupQuestion(symptom_id=sid, field_name="onset",
                question_en="Did the chest pain come on suddenly?",
                question_hi="क्या सीने का दर्द अचानक शुरू हुआ?",
                question_ta="மார்பு வலி திடீரென தொடங்கியதா?",
                is_required=True),
            FollowupQuestion(symptom_id=sid, field_name="radiation",
                question_en="Does the pain spread to your arm, jaw, or back?",
                question_hi="क्या दर्द बाँह, जबड़े या पीठ में फैलता है?",
                question_ta="வலி கை, தாடை அல்லது முதுகுக்கு பரவுகிறதா?",
                is_required=True),
        ]
    if "cough" in symptoms:
        sid = symptoms["cough"]
        questions += [
            FollowupQuestion(symptom_id=sid, field_name="duration",
                question_en="How long have you had the cough?",
                question_hi="खांसी कितने समय से है?",
                question_ta="இருமல் எத்தனை நாட்களாக உள்ளது?",
                is_required=True),
            FollowupQuestion(symptom_id=sid, field_name="productive",
                question_en="Is it a dry cough or are you coughing up mucus/phlegm?",
                question_hi="क्या यह सूखी खांसी है या बलगम आ रहा है?",
                question_ta="இது வறட்டு இருமலா அல்லது சளி வருகிறதா?",
                is_required=False),
            FollowupQuestion(symptom_id=sid, field_name="blood",
                question_en="Have you noticed any blood when coughing?",
                question_hi="क्या खांसी में खून आया है?",
                question_ta="இருமும்போது இரத்தம் வருகிறதா?",
                is_required=True),
        ]
    if "diarrhea" in symptoms:
        sid = symptoms["diarrhea"]
        questions += [
            FollowupQuestion(symptom_id=sid, field_name="frequency",
                question_en="How many times per day do you have loose stools?",
                question_hi="दिन में कितनी बार दस्त हो रहे हैं?",
                question_ta="ஒரு நாளில் எத்தனை முறை வயிற்றுப்போக்கு உள்ளது?",
                is_required=True),
            FollowupQuestion(symptom_id=sid, field_name="blood",
                question_en="Is there any blood or mucus in the stool?",
                question_hi="क्या मल में खून या बलगम है?",
                question_ta="மலத்தில் இரத்தம் அல்லது சளி உள்ளதா?",
                is_required=True),
        ]

    db.add_all(questions)
    await db.flush()


# ---------------------------------------------------------------------------
# Health Articles - SYNTHETIC DATA
# ---------------------------------------------------------------------------
async def _seed_health_articles(db: AsyncSession):
    articles = [
        HealthArticle(
            title="Managing Fever at Home",
            content=(
                "SYNTHETIC DEMO DATA - For informational purposes only.\n\n"
                "Fever is a natural immune response. Most fevers resolve on their own. "
                "Key steps: 1) Rest adequately. 2) Stay well-hydrated with water and ORS. "
                "3) Use paracetamol (acetaminophen) for comfort if temperature exceeds 38°C. "
                "4) Avoid bundling up tightly. 5) Seek medical attention if: fever exceeds 40°C, "
                "lasts more than 3 days, is accompanied by stiff neck, rash, difficulty breathing, "
                "or if you have a high-risk condition."
            ),
            category="general",
            source="Synthetic Demo - WHO Fever Management (Adapted)",
            review_status="SYNTHETIC_DEMO",
            reviewer="Med44 Demo System",
        ),
        HealthArticle(
            title="Heart Attack Warning Signs",
            content=(
                "SYNTHETIC DEMO DATA - For informational purposes only.\n\n"
                "Common warning signs of a heart attack include: chest pain or discomfort, "
                "pain radiating to the arm, jaw, neck or back, shortness of breath, cold sweats, "
                "nausea, lightheadedness. If you or someone nearby has these symptoms, call 112 "
                "immediately. Do not drive yourself to the hospital. Chew aspirin 325mg if "
                "available and not allergic, while waiting for help."
            ),
            category="cardiac",
            source="Synthetic Demo - AHA Guidelines (Adapted)",
            review_status="SYNTHETIC_DEMO",
            reviewer="Med44 Demo System",
        ),
        HealthArticle(
            title="Oral Rehydration Therapy for Diarrhea",
            content=(
                "SYNTHETIC DEMO DATA - For informational purposes only.\n\n"
                "Oral Rehydration Solution (ORS) is the cornerstone of diarrhea management. "
                "WHO ORS recipe: 1 liter boiled water + 6 teaspoons sugar + 1/2 teaspoon salt. "
                "Drink small sips frequently. Avoid dairy, fatty foods, and caffeine. "
                "Seek medical care if: 6+ loose stools in 24 hours, blood in stool, "
                "unable to keep fluids down, signs of severe dehydration."
            ),
            category="gastrointestinal",
            source="Synthetic Demo - WHO ORT Guidelines (Adapted)",
            review_status="SYNTHETIC_DEMO",
            reviewer="Med44 Demo System",
        ),
        HealthArticle(
            title="Mental Health: When to Seek Help",
            content=(
                "SYNTHETIC DEMO DATA - For informational purposes only.\n\n"
                "Mental health is as important as physical health. Signs you should seek help: "
                "persistent sadness lasting more than 2 weeks, inability to perform daily tasks, "
                "thoughts of self-harm or suicide, panic attacks, severe anxiety. "
                "In India, free mental health helplines: iCall: 9152987821, "
                "Vandrevala Foundation: 1860-2662-345 (24/7). "
                "Remember: Seeking help is a sign of strength."
            ),
            category="mental_health",
            source="Synthetic Demo - Mental Health Guidelines (Adapted)",
            review_status="SYNTHETIC_DEMO",
            reviewer="Med44 Demo System",
        ),
        HealthArticle(
            title="Stroke Recognition: FAST Test",
            content=(
                "SYNTHETIC DEMO DATA - For informational purposes only.\n\n"
                "FAST is an acronym to recognize stroke symptoms:\n"
                "F - Face drooping: Does one side of the face droop?\n"
                "A - Arm weakness: Is one arm weak or numb?\n"
                "S - Speech difficulty: Is speech slurred or strange?\n"
                "T - Time to call 112: Call immediately if any of the above.\n\n"
                "Every minute counts during a stroke. Fast treatment can save brain tissue."
            ),
            category="neurological",
            source="Synthetic Demo - Stroke Association Guidelines (Adapted)",
            review_status="SYNTHETIC_DEMO",
            reviewer="Med44 Demo System",
        ),
        HealthArticle(
            title="Managing Diabetes in Daily Life",
            content=(
                "SYNTHETIC DEMO DATA - For informational purposes only.\n\n"
                "Diabetes management involves: regular blood glucose monitoring, "
                "balanced diet low in refined sugars, regular moderate exercise, "
                "medication adherence, regular doctor check-ups, and foot care. "
                "Warning signs of low blood sugar (hypoglycemia): shakiness, sweating, "
                "confusion, rapid heartbeat. Treat immediately with 15g fast-acting carbs."
            ),
            category="endocrinology",
            source="Synthetic Demo - Diabetes Management Guidelines (Adapted)",
            review_status="SYNTHETIC_DEMO",
            reviewer="Med44 Demo System",
        ),
        HealthArticle(
            title="Respiratory Hygiene and COVID-19 Prevention",
            content=(
                "SYNTHETIC DEMO DATA - For informational purposes only.\n\n"
                "Good respiratory hygiene: cover mouth and nose when coughing/sneezing, "
                "use tissues and dispose immediately, wash hands frequently for 20+ seconds, "
                "wear masks in crowded indoor spaces when sick, maintain ventilation. "
                "These practices reduce spread of respiratory infections including flu and COVID-19."
            ),
            category="respiratory",
            source="Synthetic Demo - WHO Respiratory Guidelines (Adapted)",
            review_status="SYNTHETIC_DEMO",
            reviewer="Med44 Demo System",
        ),
    ]
    db.add_all(articles)
    await db.flush()


# ---------------------------------------------------------------------------
# Medications - SYNTHETIC DATA
# ---------------------------------------------------------------------------
MEDICATION_DATA = [
    # (name, generic_name, category, description, side_effects, contraindications)
    ("Paracetamol 500mg", "Paracetamol", "Analgesic/Antipyretic",
     "Used for fever and mild to moderate pain relief.",
     "Nausea (rare), liver toxicity in overdose.",
     "Severe liver disease, known allergy to paracetamol."),
    ("Ibuprofen 400mg", "Ibuprofen", "NSAID",
     "Anti-inflammatory, used for pain, fever, and inflammation.",
     "Stomach upset, GI bleeding (long-term), kidney effects.",
     "Peptic ulcer, kidney disease, pregnancy (3rd trimester), aspirin allergy."),
    ("Aspirin 325mg", "Aspirin", "NSAID/Antiplatelet",
     "Pain relief and antiplatelet agent. Used in cardiac emergencies.",
     "GI irritation, bleeding, tinnitus.",
     "Children under 12, active peptic ulcer, bleeding disorders."),
    ("Amoxicillin 500mg", "Amoxicillin", "Antibiotic",
     "Broad-spectrum antibiotic for bacterial infections.",
     "Rash, diarrhea, nausea, allergic reactions.",
     "Penicillin allergy, mononucleosis."),
    ("Metformin 500mg", "Metformin", "Antidiabetic",
     "First-line medication for type 2 diabetes.",
     "Nausea, diarrhea, vitamin B12 deficiency (long-term).",
     "Renal impairment (eGFR < 30), metabolic acidosis."),
    ("Atorvastatin 10mg", "Atorvastatin", "Statin",
     "Used to lower cholesterol and reduce cardiovascular risk.",
     "Muscle pain (myopathy), elevated liver enzymes.",
     "Active liver disease, pregnancy, breastfeeding."),
    ("Amlodipine 5mg", "Amlodipine", "Calcium Channel Blocker",
     "Used for hypertension and angina.",
     "Peripheral edema, flushing, dizziness.",
     "Known allergy to amlodipine, severe hypotension."),
    ("Omeprazole 20mg", "Omeprazole", "Proton Pump Inhibitor",
     "Used for acid reflux, GERD, and peptic ulcer disease.",
     "Headache, nausea, long-term: B12 and magnesium deficiency.",
     "Known allergy to PPIs."),
    ("Cetirizine 10mg", "Cetirizine", "Antihistamine",
     "Used for allergies, hay fever, and urticaria.",
     "Drowsiness, dry mouth.",
     "Severe renal impairment."),
    ("Metronidazole 400mg", "Metronidazole", "Antibiotic/Antiprotozoal",
     "Used for anaerobic bacterial and protozoal infections.",
     "Nausea, metallic taste, peripheral neuropathy (long-term).",
     "First trimester of pregnancy, alcohol consumption during treatment."),
    ("Salbutamol Inhaler", "Salbutamol", "Bronchodilator",
     "Short-acting beta-agonist for asthma and COPD relief.",
     "Tremor, palpitations, headache.",
     "Known allergy to salbutamol."),
    ("Losartan 50mg", "Losartan", "ARB",
     "Used for hypertension and heart failure.",
     "Dizziness, elevated potassium.",
     "Pregnancy, known allergy to ARBs."),
    ("Pantoprazole 40mg", "Pantoprazole", "Proton Pump Inhibitor",
     "Used for GERD and peptic ulcer disease.",
     "Headache, diarrhea.",
     "Known allergy to PPIs."),
    ("Ciprofloxacin 500mg", "Ciprofloxacin", "Antibiotic",
     "Broad-spectrum antibiotic for urinary, respiratory, and GI infections.",
     "Nausea, tendinitis, photosensitivity.",
     "Children, pregnancy, known allergy to fluoroquinolones."),
    ("Chlorpheniramine 4mg", "Chlorpheniramine", "Antihistamine",
     "Used for colds and allergies.",
     "Drowsiness, dry mouth, urinary retention.",
     "Glaucoma, prostatic hypertrophy."),
    ("Ranitidine 150mg", "Ranitidine", "H2 Blocker",
     "Used for acid reflux and peptic ulcers.",
     "Headache, dizziness.",
     "Known allergy to H2 blockers."),
    ("Dextromethorphan 15mg", "Dextromethorphan", "Antitussive",
     "Cough suppressant for dry cough.",
     "Drowsiness, nausea.",
     "MAO inhibitor use, respiratory depression."),
    ("Ondansetron 4mg", "Ondansetron", "Antiemetic",
     "Used for nausea and vomiting.",
     "Headache, constipation, QT prolongation.",
     "Congenital QT prolongation syndrome."),
    ("Diclofenac 50mg", "Diclofenac", "NSAID",
     "Anti-inflammatory and analgesic for pain and inflammation.",
     "GI upset, cardiovascular risk (long-term).",
     "Active peptic ulcer, severe heart failure, kidney disease."),
    ("Vitamin D3 1000IU", "Cholecalciferol", "Supplement",
     "Vitamin D supplement for deficiency correction.",
     "Hypercalcemia in overdose.",
     "Hypercalcemia, vitamin D toxicity."),
    ("Folic Acid 5mg", "Folic Acid", "Supplement",
     "Used for folate deficiency and pregnancy supplementation.",
     "Rare: nausea.",
     "Known allergy to folic acid."),
    ("Azithromycin 500mg", "Azithromycin", "Antibiotic",
     "Macrolide antibiotic for respiratory and skin infections.",
     "Nausea, diarrhea, QT prolongation.",
     "Known macrolide allergy, QT prolongation syndrome."),
]


async def _seed_medications(db: AsyncSession):
    meds = []
    for name, generic, cat, desc, se, ci in MEDICATION_DATA:
        m = Medication(
            name=name, generic_name=generic, category=cat,
            description=desc, side_effects=se, contraindications=ci,
            source="Synthetic Demo Data - Consult prescriber",
        )
        meds.append(m)
        db.add(m)

    await db.flush()

    # Add some drug warnings
    result = await db.execute(select(Medication))
    med_map = {m.name: m.id for m in result.scalars().all()}

    warnings = [
        ("Aspirin 325mg", "Ibuprofen 400mg", "MODERATE",
         "Concurrent use increases GI bleeding risk."),
        ("Metformin 500mg", "Ciprofloxacin 500mg", "MODERATE",
         "Fluoroquinolones can alter blood glucose when used with metformin."),
        ("Dextromethorphan 15mg", "Ciprofloxacin 500mg", "MILD",
         "May increase dextromethorphan levels."),
        ("Amoxicillin 500mg", "Metronidazole 400mg", "MILD",
         "Increased antibiotic coverage - monitor for GI effects."),
        ("Atorvastatin 10mg", "Azithromycin 500mg", "MODERATE",
         "Azithromycin may increase statin exposure, raising myopathy risk."),
        ("Amlodipine 5mg", "Ciprofloxacin 500mg", "MILD",
         "Ciprofloxacin may increase amlodipine levels slightly."),
    ]

    for d1, d2, severity, desc in warnings:
        if d1 in med_map and d2 in med_map:
            db.add(DrugWarning(
                drug1_id=med_map[d1],
                drug2_id=med_map[d2],
                severity=severity,
                description=desc,
                source="Synthetic Demo Data",
            ))
    await db.flush()


# ---------------------------------------------------------------------------
# Doctors - SYNTHETIC DATA
# ---------------------------------------------------------------------------
DOCTOR_DATA = [
    ("Dr. Anjali Mehta", "General Physician", 4.8, "Apollo Hospital", "Delhi",
     ["09:00", "10:00", "11:00", "14:00", "15:00"]),
    ("Dr. Ramesh Nair", "Cardiologist", 4.9, "Fortis Hospital", "Mumbai",
     ["10:00", "11:00", "16:00", "17:00"]),
    ("Dr. Priya Venkataraman", "Neurologist", 4.7, "AIIMS", "Delhi",
     ["09:00", "10:30", "14:00"]),
    ("Dr. Suresh Kumar", "Orthopedic", 4.6, "Manipal Hospital", "Bangalore",
     ["09:00", "10:00", "15:00", "16:00"]),
    ("Dr. Meena Pillai", "Gynecologist", 4.8, "Rainbow Hospital", "Hyderabad",
     ["10:00", "11:00", "14:00", "15:00"]),
    ("Dr. Vikram Singh", "Gastroenterologist", 4.5, "Max Hospital", "Noida",
     ["09:30", "11:00", "14:30"]),
    ("Dr. Lakshmi Rao", "Dermatologist", 4.7, "Medanta", "Gurgaon",
     ["10:00", "11:00", "12:00", "15:00"]),
    ("Dr. Arun Sharma", "Psychiatrist", 4.9, "NIMHANS", "Bangalore",
     ["09:00", "10:00", "14:00", "15:00"]),
    ("Dr. Fatima Khan", "Pediatrician", 4.8, "Children's Hospital", "Mumbai",
     ["09:00", "10:00", "11:00", "16:00"]),
    ("Dr. Santosh Joshi", "ENT Specialist", 4.6, "City Hospital", "Pune",
     ["10:00", "11:30", "14:00", "16:00"]),
]


async def _seed_doctors(db: AsyncSession):
    for name, specialty, rating, hospital, location, slots in DOCTOR_DATA:
        db.add(Doctor(
            name=name, specialty=specialty, rating=rating,
            hospital=hospital, location=location,
            available_slots_json=json.dumps(slots),
            is_active=True,
        ))
    await db.flush()


# ---------------------------------------------------------------------------
# Sample Appointments - SYNTHETIC DATA
# ---------------------------------------------------------------------------
async def _seed_sample_appointments(db: AsyncSession):
    result = await db.execute(select(Patient).limit(1))
    patient = result.scalar_one_or_none()
    if not patient:
        return

    db.add(Appointment(
        patient_id=patient.id,
        doctor_name="Dr. Anjali Mehta",
        specialty="General Physician",
        appointment_date=datetime.datetime.now() + datetime.timedelta(days=3),
        slot_time="10:00",
        status="PENDING",
        notes="Routine checkup - SYNTHETIC DEMO DATA",
        is_synced=False,
    ))
    await db.flush()


if __name__ == "__main__":
    asyncio.run(init_db())
    asyncio.run(seed_database())

