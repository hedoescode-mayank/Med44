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
    HealthcareFacility, PatientDocument, CareJourneyTemplate,
    CareJourneyNode, PatientJourneyProgress, PatientSymptomJournal,
    SupportTicket,
)
import bcrypt


def _hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def seed_database():
    """Idempotent seed - populates missing entities cleanly."""
    async with AsyncSessionLocal() as db:
        # Check base patients
        result = await db.execute(select(Patient).limit(1))
        if not result.scalar_one_or_none():
            await _seed_patients(db)
            await _seed_symptoms(db)
            await _seed_clinical_rules(db)
            await _seed_red_flags(db)
            await _seed_followup_questions(db)
            await _seed_health_articles(db)
            await _seed_medications(db)
            await _seed_doctors(db)
            await _seed_sample_appointments(db)

        # Seed PS3 facilities
        fac_res = await db.execute(select(HealthcareFacility).limit(1))
        if not fac_res.scalar_one_or_none():
            await _seed_healthcare_facilities(db)

        # Seed PS3 Care Journeys & Flowcharts
        jour_res = await db.execute(select(CareJourneyTemplate).limit(1))
        if not jour_res.scalar_one_or_none():
            await _seed_care_journeys(db)

        # Seed sample documents
        doc_res = await db.execute(select(PatientDocument).limit(1))
        if not doc_res.scalar_one_or_none():
            await _seed_sample_documents(db)

        # Seed sample recovery symptom journals
        sj_res = await db.execute(select(PatientSymptomJournal).limit(1))
        if not sj_res.scalar_one_or_none():
            await _seed_sample_journals(db)

        await db.commit()
        print("[SEED] Med44 PS3 database initialized and verified.")


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
# Healthcare Facilities (PS3 Module 1) - VERIFIED DEMO DATA
# ---------------------------------------------------------------------------
async def _seed_healthcare_facilities(db: AsyncSession):
    facilities_data = [
        {
            "name": "Apollo Hospitals Delhi",
            "facility_type": "Multi-Specialty Hospital",
            "address": "Sarita Vihar, Delhi Mathura Road",
            "city": "New Delhi",
            "contact_number": "011-26925858",
            "operating_hours": "24/7 Emergency & OPD (08:00 AM - 08:00 PM)",
            "services_offered": ["Emergency Care", "Cardiology", "Neurology", "Orthopedics", "General Medicine", "Dental", "Radiology"],
            "supported_languages": ["English", "Hindi", "Tamil"],
            "accessibility_features": ["Wheelchair Accessible", "Elevators", "Ramp Access", "Accessible Washrooms", "Disabled Parking"],
            "latitude": 28.5355,
            "longitude": 77.2910,
            "source": "State Directorate of Health Services (Verified)",
        },
        {
            "name": "Fortis Escorts Heart Institute",
            "facility_type": "Specialty Hospital",
            "address": "Okhla Road, New Friends Colony",
            "city": "New Delhi",
            "contact_number": "011-47135000",
            "operating_hours": "24/7 Cardiac Emergency & OPD",
            "services_offered": ["Cardiology", "Cardiothoracic Surgery", "ECG", "Echocardiogram", "Cardiac ICU", "Emergency Care"],
            "supported_languages": ["English", "Hindi"],
            "accessibility_features": ["Wheelchair Accessible", "Stretcher Lifts", "Ground Floor OPD", "Assistance Desk"],
            "latitude": 28.5603,
            "longitude": 77.2778,
            "source": "NABH Accredited Hospital Registry (Verified)",
        },
        {
            "name": "Max Super Speciality Hospital Saket",
            "facility_type": "Multi-Specialty Hospital",
            "address": "1, 2, Press Enclave Marg, Saket",
            "city": "New Delhi",
            "contact_number": "011-26515050",
            "operating_hours": "24/7 Emergency & Consultations",
            "services_offered": ["Dermatology", "Pulmonology", "ENT", "Pediatrics", "General Surgery", "Dialysis", "Laboratory"],
            "supported_languages": ["English", "Hindi", "Tamil"],
            "accessibility_features": ["Wheelchair Accessible", "Elevators", "Low-counter Reception", "Braille Signage"],
            "latitude": 28.5284,
            "longitude": 77.2144,
            "source": "Delhi Hospital Regulatory Authority (Verified)",
        },
        {
            "name": "Clove Dental Care Clinic",
            "facility_type": "Dental Specialty Clinic",
            "address": "Inner Circle, Connaught Place",
            "city": "New Delhi",
            "contact_number": "011-43552020",
            "operating_hours": "09:00 AM - 08:00 PM (Mon-Sat)",
            "services_offered": ["Dental Cleaning", "Root Canal Therapy", "Dental Implants", "Digital Dental X-Ray", "Orthodontics"],
            "supported_languages": ["English", "Hindi"],
            "accessibility_features": ["Ramp Entry", "Ground Floor Facility", "Wheelchair Accessible"],
            "latitude": 28.6328,
            "longitude": 77.2197,
            "source": "Dental Council Verified Provider Directory",
        },
        {
            "name": "Dr. Lal PathLabs & Diagnostics",
            "facility_type": "Diagnostic Center",
            "address": "Main Market, Green Park",
            "city": "New Delhi",
            "contact_number": "011-39885050",
            "operating_hours": "07:00 AM - 09:00 PM Daily",
            "services_offered": ["Complete Blood Count (CBC)", "Lipid Profile", "Thyroid Profile", "COVID-19 RT-PCR", "Urine Analysis", "Pathology"],
            "supported_languages": ["English", "Hindi"],
            "accessibility_features": ["Wheelchair Accessible", "Home Sample Collection Available"],
            "latitude": 28.5589,
            "longitude": 77.2074,
            "source": "NABL Accredited Diagnostics Directory",
        },
        {
            "name": "Manipal Hospital Dwarka",
            "facility_type": "Tertiary Care Hospital",
            "address": "Sector 6, Dwarka",
            "city": "New Delhi",
            "contact_number": "011-49674967",
            "operating_hours": "24/7 Emergency & OPD",
            "services_offered": ["Pulmonology", "Internal Medicine", "Gastroenterology", "Critical Care", "Radiology", "Physical Therapy"],
            "supported_languages": ["English", "Hindi", "Tamil"],
            "accessibility_features": ["Wheelchair Accessible", "Dedicated Patient Transport", "Elevators", "Accessible Restrooms"],
            "latitude": 28.5912,
            "longitude": 77.0601,
            "source": "State Health Registry (Verified)",
        },
    ]

    for item in facilities_data:
        db.add(HealthcareFacility(
            name=item["name"],
            facility_type=item["facility_type"],
            address=item["address"],
            city=item["city"],
            contact_number=item["contact_number"],
            operating_hours=item["operating_hours"],
            services_offered_json=json.dumps(item["services_offered"]),
            supported_languages_json=json.dumps(item["supported_languages"]),
            accessibility_features_json=json.dumps(item["accessibility_features"]),
            latitude=item["latitude"],
            longitude=item["longitude"],
            source=item["source"],
            is_verified=True,
        ))
    await db.flush()


# ---------------------------------------------------------------------------
# Care Journey Templates & Interactive Flowcharts (PS3 Modules 9, 10, 13)
# ---------------------------------------------------------------------------
async def _seed_care_journeys(db: AsyncSession):
    # 1. Dental Journey
    t_dental = CareJourneyTemplate(
        id="dental_care",
        title="Dental Health & Consultation Journey",
        title_hi="दंत स्वास्थ्य और परामर्श यात्रा",
        category="Dental",
        description="Structured educational roadmap for booking, preparing, and navigating a dental consultation and procedure.",
        description_hi="दांतों के डॉक्टर से मिलने, तैयारी करने और प्रक्रिया को समझने की संपूर्ण मार्गदर्शिका।",
        total_stages=7,
        is_active=True,
    )
    db.add(t_dental)

    dental_nodes = [
        CareJourneyNode(
            id="dental_node_1",
            template_id="dental_care",
            step_number=1,
            node_type="start",
            title="Discover Verified Dental Facility",
            title_hi="सत्यापित दंत चिकित्सा केंद्र खोजें",
            explanation="Identify a licensed dental clinic or hospital offering general or specialty dentistry near you.",
            explanation_hi="अपने पास एक लाइसेंस प्राप्त डेंटल क्लिनिक या अस्पताल खोजें।",
            what_to_bring_json=json.dumps(["Valid government photo ID", "Insurance card if applicable"]),
            questions_to_ask_json=json.dumps(["Is an appointment required for initial screening?", "Does the clinic have in-house digital X-ray facilities?"]),
            what_to_record_json=json.dumps(["Clinic location", "Consultation fee and accepted payment modes"]),
            required_documents_json=json.dumps(["Patient ID", "Previous Dental Records (if any)"]),
        ),
        CareJourneyNode(
            id="dental_node_2",
            template_id="dental_care",
            step_number=2,
            node_type="appointment",
            title="Book Suitable Consultation Slot",
            title_hi="उचित परामर्श समय स्लॉट बुक करें",
            explanation="Select a morning or afternoon slot that allows you adequate time without rushing.",
            explanation_hi="अपनी सुविधानुसार सुबह या शाम का समय चुनें।",
            what_to_bring_json=json.dumps(["Booking confirmation / token number"]),
            questions_to_ask_json=json.dumps(["Should I avoid eating or brushing right before the visit?"]),
            what_to_record_json=json.dumps(["Appointment date and time", "Doctor's name"]),
            required_documents_json=json.dumps([]),
        ),
        CareJourneyNode(
            id="dental_node_3",
            template_id="dental_care",
            step_number=3,
            node_type="patient_action",
            title="Prepare Dental History & Current Symptoms",
            title_hi="दंत इतिहास और वर्तमान लक्षण तैयार करें",
            explanation="Note exactly where you feel sensitivity or pain, how long it has lasted, and whether hot or cold triggers it.",
            explanation_hi="नोट करें कि दर्द कहां है, कब से है, और क्या ठंडा-गर्म खाने से बढ़ता है।",
            what_to_bring_json=json.dumps(["List of current medications", "Previous X-rays or dental notes"]),
            questions_to_ask_json=json.dumps(["Can I take a mild painkiller before examination if pain is acute?"]),
            what_to_record_json=json.dumps(["Symptom severity (1-10)", "Triggers: sweets, pressure, hot, cold"]),
            required_documents_json=json.dumps(["Current Medication List", "Past Dental History"]),
        ),
        CareJourneyNode(
            id="dental_node_4",
            template_id="dental_care",
            step_number=4,
            node_type="consultation",
            title="In-Person Dental Examination",
            title_hi="डॉक्टर द्वारा दांतों की जांच",
            explanation="The dentist will visually inspect your teeth, gums, and bite alignment using standard sterile dental instruments.",
            explanation_hi="दंत चिकित्सक आपके दांतों और मसूड़ों की जांच करेंगे।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps(["Are there signs of active decay, gum inflammation, or enamel wear?"]),
            what_to_record_json=json.dumps(["Teeth numbers discussed", "Dentist's clinical observations"]),
            required_documents_json=json.dumps([]),
        ),
        CareJourneyNode(
            id="dental_node_5",
            template_id="dental_care",
            step_number=5,
            node_type="clinician_decision",
            title="Clinician Decision: Digital X-Ray / IOPA",
            title_hi="चिकित्सक निर्णय: क्या एक्स-रे आवश्यक है?",
            explanation="The clinician determines whether an Intraoral Periapical (IOPA) or OPG radiograph is necessary to evaluate roots or bone.",
            explanation_hi="डॉक्टर तय करेंगे कि जड़ या हड्डी देखने के लिए एक्स-रे की जरूरत है या नहीं।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps(["What will the radiograph clarify that visual examination cannot?"]),
            what_to_record_json=json.dumps(["Imaging decision and recommendations"]),
            required_documents_json=json.dumps([]),
            conditional_branches_json=json.dumps([
                {"condition": "X-Ray Required", "explanation": "Dentist performs quick digital radiograph to check deep roots or bone health.", "next_node_id": "dental_node_6"},
                {"condition": "No X-Ray Needed", "explanation": "Condition is superficial (e.g. routine plaque/cleaning), proceeding directly to care plan.", "next_node_id": "dental_node_6"},
            ]),
        ),
        CareJourneyNode(
            id="dental_node_6",
            template_id="dental_care",
            step_number=6,
            node_type="document_requirement",
            title="Clinician Explains Care Plan & Written Instructions",
            title_hi="उपचार योजना और लिखित सलाह",
            explanation="The dentist outlines recommended procedures (e.g., restoration, scaling, or observation) and provides aftercare instructions.",
            explanation_hi="डॉक्टर सफाई, फिलिंग या अन्य इलाज की सलाह देंगे।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps(["Are there alternative options?", "What are the immediate post-procedure precautions?"]),
            what_to_record_json=json.dumps(["Written prescription and post-care notes"]),
            required_documents_json=json.dumps(["Signed Prescription / Procedure Estimate"]),
        ),
        CareJourneyNode(
            id="dental_node_7",
            template_id="dental_care",
            step_number=7,
            node_type="completion",
            title="Post-Care Navigation & Follow-Up Check",
            title_hi="देखभाल और फॉलो-अप चेक",
            explanation="Follow clinician-directed hygiene steps and attend your scheduled follow-up review if advised.",
            explanation_hi="डॉक्टर द्वारा बताई गई सावधानियां बरतें और समय पर फॉलो-अप करें।",
            what_to_bring_json=json.dumps(["Prescription copy"]),
            questions_to_ask_json=json.dumps(["When should I schedule the next routine checkup?"]),
            what_to_record_json=json.dumps(["Follow-up date", "Resolution of initial pain"]),
            required_documents_json=json.dumps([]),
        ),
    ]
    for n in dental_nodes:
        db.add(n)

    # 2. Acute Infection Journey
    t_inf = CareJourneyTemplate(
        id="acute_infection",
        title="Acute Illness & Infection Navigation Journey",
        title_hi="तीव्र बीमारी और संक्रमण देखभाल यात्रा",
        category="General Medicine",
        description="Educational pathway for sudden onset fever, throat infection, or seasonal viral symptoms.",
        description_hi="अचानक आए बुखार, खांसी या संक्रमण के लिए डॉक्टर परामर्श और देखभाल की मार्गदर्शिका।",
        total_stages=6,
        is_active=True,
    )
    db.add(t_inf)

    inf_nodes = [
        CareJourneyNode(
            id="inf_node_1",
            template_id="acute_infection",
            step_number=1,
            node_type="start",
            title="Discover Nearby Healthcare Facility or OPD",
            title_hi="नजदीकी स्वास्थ्य केंद्र या ओपीडी खोजें",
            explanation="Locate an open general practice clinic, primary health center, or hospital OPD.",
            explanation_hi="अपने नजदीकी क्लिनिक या अस्पताल का पता लगाएं।",
            what_to_bring_json=json.dumps(["Photo ID", "Insurance Card"]),
            questions_to_ask_json=json.dumps(["What are the OPD walk-in timings?"]),
            what_to_record_json=json.dumps(["Facility address", "Emergency hotline"]),
            required_documents_json=json.dumps([]),
        ),
        CareJourneyNode(
            id="inf_node_2",
            template_id="acute_infection",
            step_number=2,
            node_type="patient_action",
            title="Log Symptoms & Temperature Readings",
            title_hi="लक्षण और तापमान का रिकॉर्ड रखें",
            explanation="Record your temperature chart, duration of symptoms, and any other symptoms (cough, chills, body ache).",
            explanation_hi="थर्मामीटर से नापा गया तापमान और लक्षणों के दिन नोट करें।",
            what_to_bring_json=json.dumps(["Thermometer log"]),
            questions_to_ask_json=json.dumps(["What is the safe fever medication threshold?"]),
            what_to_record_json=json.dumps(["Max temperature recorded", "Days elapsed"]),
            required_documents_json=json.dumps(["Symptom Log"]),
        ),
        CareJourneyNode(
            id="inf_node_3",
            template_id="acute_infection",
            step_number=3,
            node_type="consultation",
            title="In-Person Medical Evaluation",
            title_hi="चिकित्सक द्वारा शारीरिक जांच",
            explanation="The physician checks vitals (BP, pulse, oxygen saturation, temperature) and examines throat and chest.",
            explanation_hi="डॉक्टर बीपी, पल्स, ऑक्सीजन और सीने की जांच करेंगे।",
            what_to_bring_json=json.dumps(["Current medications", "Allergy information"]),
            questions_to_ask_json=json.dumps(["Is this consistent with a viral infection?", "What warning signs should I watch for?"]),
            what_to_record_json=json.dumps(["Vitals readings", "Clinician's provisional remarks"]),
            required_documents_json=json.dumps([]),
        ),
        CareJourneyNode(
            id="inf_node_4",
            template_id="acute_infection",
            step_number=4,
            node_type="clinician_decision",
            title="Clinician Decision: Diagnostic Lab Tests",
            title_hi="चिकित्सक निर्णय: क्या खून जांच आवश्यक है?",
            explanation="The doctor decides whether a Complete Blood Count (CBC), Dengue NS1, or throat swab is indicated.",
            explanation_hi="डॉक्टर तय करेंगे कि सीबीसी या डेंगू जांच की आवश्यकता है या नहीं।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps(["Are lab tests necessary today or can we wait 24-48 hours?"]),
            what_to_record_json=json.dumps(["Prescribed lab test names"]),
            required_documents_json=json.dumps([]),
            conditional_branches_json=json.dumps([
                {"condition": "Pathology Tests Prescribed", "explanation": "Doctor requests CBC / Platelet / Viral screen to rule out specific infections.", "next_node_id": "inf_node_5"},
                {"condition": "No Tests Needed (Symptomatic)", "explanation": "Mild viral presentation; clinician directs home hydration and rest.", "next_node_id": "inf_node_5"},
            ]),
        ),
        CareJourneyNode(
            id="inf_node_5",
            template_id="acute_infection",
            step_number=5,
            node_type="document_requirement",
            title="Document Clinician's Treatment & Care Plan",
            title_hi="डॉक्टर की पर्ची और देखभाल योजना सहेजें",
            explanation="Securely save the clinician's written prescription, hydration advice, and approved OTC medications.",
            explanation_hi="दवाइयों की पर्ची और डॉक्टर की सलाह को सुरक्षित रखें।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps(["What are the exact dosages and timing?", "When should I contact emergency services?"]),
            what_to_record_json=json.dumps(["Prescription medication names", "Follow-up date"]),
            required_documents_json=json.dumps(["Doctor's Prescription"]),
        ),
        CareJourneyNode(
            id="inf_node_6",
            template_id="acute_infection",
            step_number=6,
            node_type="follow_up",
            title="Recovery Monitoring & Safety Escalation",
            title_hi="स्वास्थ्य सुधार की निगरानी और आपातकालीन सतर्कता",
            explanation="Log daily progress. If symptoms worsen, fever exceeds 102°F, or breathing difficulty appears, immediately contact emergency services.",
            explanation_hi="रोजाना सुधार नोट करें। यदि स्थिति बिगड़े तो तुरंत डॉक्टर या 112 पर कॉल करें।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps([]),
            what_to_record_json=json.dumps(["Daily symptom severity"]),
            required_documents_json=json.dumps([]),
        ),
    ]
    for n in inf_nodes:
        db.add(n)

    # 3. Respiratory Care Journey
    t_resp = CareJourneyTemplate(
        id="respiratory_care",
        title="Respiratory Health & Asthma Journey",
        title_hi="श्वसन स्वास्थ्य और दमा देखभाल यात्रा",
        category="Pulmonology",
        description="Administrative and clinical educational journey for persistent cough, wheezing, or asthma management.",
        description_hi="लगातार खांसी, सांस फूलने या दमे के लिए परामर्श और देखभाल योजना।",
        total_stages=5,
        is_active=True,
    )
    db.add(t_resp)

    resp_nodes = [
        CareJourneyNode(
            id="resp_node_1",
            template_id="respiratory_care",
            step_number=1,
            node_type="start",
            title="Discover Pulmonologist / Respiratory Service",
            title_hi="छाती रोग विशेषज्ञ खोजें",
            explanation="Locate a hospital or clinic with specialized chest and respiratory diagnostic facilities.",
            explanation_hi="छाती और फेफड़ों के विशेषज्ञ डॉक्टर का पता लगाएं।",
            what_to_bring_json=json.dumps(["Previous chest X-rays", "Inhaler details"]),
            questions_to_ask_json=json.dumps(["Are spirometry facilities available on-site?"]),
            what_to_record_json=json.dumps(["Hospital address"]),
            required_documents_json=json.dumps([]),
        ),
        CareJourneyNode(
            id="resp_node_2",
            template_id="respiratory_care",
            step_number=2,
            node_type="consultation",
            title="Clinical Chest Consultation & Auscultation",
            title_hi="फेफड़ों की स्टेथोस्कोप से जांच",
            explanation="The pulmonologist listens to breath sounds, wheezing, and assesses oxygen saturation levels.",
            explanation_hi="डॉक्टर स्टेथोस्कोप से सांस की आवाज और सीने की जांच करेंगे।",
            what_to_bring_json=json.dumps(["Symptom timeline"]),
            questions_to_ask_json=json.dumps(["Are my symptoms seasonal or triggered by environmental allergies?"]),
            what_to_record_json=json.dumps(["SpO2 level", "Clinical observations"]),
            required_documents_json=json.dumps([]),
        ),
        CareJourneyNode(
            id="resp_node_3",
            template_id="respiratory_care",
            step_number=3,
            node_type="clinician_decision",
            title="Clinician Decision: Spirometry / PFT",
            title_hi="चिकित्सक निर्णय: फेफड़ों की कार्यक्षमता जांच (PFT)",
            explanation="The clinician decides whether Pulmonary Function Testing (PFT) or peak-flow measurement is indicated.",
            explanation_hi="डॉक्टर तय करेंगे कि स्पाइरोमेट्री जांच की आवश्यकता है या नहीं।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps(["How should I prepare for a lung capacity test?"]),
            what_to_record_json=json.dumps(["Test recommendation"]),
            required_documents_json=json.dumps([]),
            conditional_branches_json=json.dumps([
                {"condition": "Spirometry / PFT Advised", "explanation": "Patient performs breathing test into spirometer to quantify airway obstruction.", "next_node_id": "resp_node_4"},
                {"condition": "Clinical Management without PFT", "explanation": "Doctor initiates treatment based on clinical assessment.", "next_node_id": "resp_node_4"},
            ]),
        ),
        CareJourneyNode(
            id="resp_node_4",
            template_id="respiratory_care",
            step_number=4,
            node_type="document_requirement",
            title="Written Inhaler & Medication Action Plan",
            title_hi="लिखित इन्हेलर और दवा कार्य योजना",
            explanation="Patient receives written clinician instructions on correct inhaler usage, spacer technique, and rescue protocol.",
            explanation_hi="इन्हेलर इस्तेमाल करने का सही तरीका और दवा की पर्ची।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps(["What is the difference between controller and rescue inhalers?"]),
            what_to_record_json=json.dumps(["Action plan steps"]),
            required_documents_json=json.dumps(["Asthma / Respiratory Action Plan"]),
        ),
        CareJourneyNode(
            id="resp_node_5",
            template_id="respiratory_care",
            step_number=5,
            node_type="completion",
            title="Routine Monitoring & Emergency Readiness",
            title_hi="नियमित निगरानी और आपातकालीन तैयारी",
            explanation="Log daily breathing ease. In case of acute breathlessness or blue lips/fingers, call 112 immediately.",
            explanation_hi="रोजाना सांस की स्थिति जांचें। गंभीर तकलीफ होने पर तुरंत 112 मिलाएं।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps([]),
            what_to_record_json=json.dumps([]),
            required_documents_json=json.dumps([]),
        ),
    ]
    for n in resp_nodes:
        db.add(n)

    # 4. Cardiac Journey
    t_cardiac = CareJourneyTemplate(
        id="cardiac_eval",
        title="Cardiovascular Assessment & Follow-Up",
        title_hi="हृदय स्वास्थ्य जांच और फॉलो-अप यात्रा",
        category="Cardiology",
        description="Comprehensive healthcare access pathway for cardiac evaluation, BP tracking, and risk assessment.",
        description_hi="दिल की जांच, ईसीजी और रक्तचाप नियंत्रण के लिए संपूर्ण मार्गदर्शिका।",
        total_stages=5,
        is_active=True,
    )
    db.add(t_cardiac)

    cardiac_nodes = [
        CareJourneyNode(
            id="cardiac_node_1",
            template_id="cardiac_eval",
            step_number=1,
            node_type="start",
            title="Find Accredited Cardiac Care Facility",
            title_hi="सत्यापित हृदय रोग अस्पताल खोजें",
            explanation="Locate an accredited hospital with round-the-clock cardiac care and emergency catheterization support.",
            explanation_hi="24 घंटे चालू हृदय रोग अस्पताल का पता लगाएं।",
            what_to_bring_json=json.dumps(["Government ID", "Existing ECG records"]),
            questions_to_ask_json=json.dumps(["Does the facility have emergency cath-lab availability?"]),
            what_to_record_json=json.dumps(["Hospital contact number"]),
            required_documents_json=json.dumps([]),
        ),
        CareJourneyNode(
            id="cardiac_node_2",
            template_id="cardiac_eval",
            step_number=2,
            node_type="patient_action",
            title="Compile Family Cardiac History & Medications",
            title_hi="पारिवारिक हृदय इतिहास और दवाएं एकत्र करें",
            explanation="Document whether parents or siblings had early heart disease, high cholesterol, or hypertension.",
            explanation_hi="परिवार में दिल की बीमारी या बीपी का इतिहास नोट करें।",
            what_to_bring_json=json.dumps(["Previous lipid panel reports"]),
            questions_to_ask_json=json.dumps([]),
            what_to_record_json=json.dumps(["Family history notes"]),
            required_documents_json=json.dumps(["Past Medical History", "Lipid Profile"]),
        ),
        CareJourneyNode(
            id="cardiac_node_3",
            template_id="cardiac_eval",
            step_number=3,
            node_type="consultation",
            title="Cardiologist Clinical Examination",
            title_hi="कार्डियोलॉजिस्ट से परामर्श और जांच",
            explanation="The cardiologist evaluates heart sounds, peripheral pulses, blood pressure, and reviews cardiovascular risk.",
            explanation_hi="हृदय रोग विशेषज्ञ द्वारा शारीरिक जांच और बीपी चेक।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps(["What are my primary cardiovascular risk factors?", "What lifestyle changes are most urgent?"]),
            what_to_record_json=json.dumps(["Blood pressure reading", "Target ranges"]),
            required_documents_json=json.dumps([]),
        ),
        CareJourneyNode(
            id="cardiac_node_4",
            template_id="cardiac_eval",
            step_number=4,
            node_type="clinician_decision",
            title="Clinician Decision: Resting ECG & Echocardiogram",
            title_hi="चिकित्सक निर्णय: ईसीजी या इकोकार्डियोग्राम जांच",
            explanation="The specialist decides if a 12-lead ECG or 2D Echo is required to assess heart rhythm and wall motion.",
            explanation_hi="डॉक्टर तय करेंगे कि ईसीजी या इको जांच की जरूरत है या नहीं।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps(["What will the 2D Echo determine about heart pumping capacity?"]),
            what_to_record_json=json.dumps(["Diagnostic orders"]),
            required_documents_json=json.dumps([]),
            conditional_branches_json=json.dumps([
                {"condition": "ECG & Echo Ordered", "explanation": "Patient undergoes non-invasive electrical and ultrasound evaluation of the heart.", "next_node_id": "cardiac_node_5"},
                {"condition": "Follow-Up without Imaging", "explanation": "Baseline examination normal; lifestyle guidance and follow-up scheduled.", "next_node_id": "cardiac_node_5"},
            ]),
        ),
        CareJourneyNode(
            id="cardiac_node_5",
            template_id="cardiac_eval",
            step_number=5,
            node_type="completion",
            title="Cardiovascular Care Plan & Red-Flag Protocol",
            title_hi="हृदय सुरक्षा योजना और आपातकालीन निर्देश",
            explanation="Record verified medications and dietary guidance. If acute chest pain, pain radiating to left arm, or sudden sweating occurs, call 112 immediately.",
            explanation_hi="दवाइयों का पालन करें। सीने में तेज दर्द होने पर तुरंत 112 पर फोन करें।",
            what_to_bring_json=json.dumps([]),
            questions_to_ask_json=json.dumps([]),
            what_to_record_json=json.dumps([]),
            required_documents_json=json.dumps(["Cardiology Care Plan"]),
        ),
    ]
    for n in cardiac_nodes:
        db.add(n)

    await db.flush()


# ---------------------------------------------------------------------------
# Sample Documents & Prescriptions with Draft OCR (PS3 Modules 4, 5, 11)
# ---------------------------------------------------------------------------
async def _seed_sample_documents(db: AsyncSession):
    result = await db.execute(select(Patient).limit(1))
    patient = result.scalar_one_or_none()
    if not patient:
        return

    docs = [
        PatientDocument(
            patient_id=patient.id,
            title="Dr. Priya Sharma — Consultation Prescription",
            category="Prescription",
            file_url="/sample_prescription.jpg",
            file_type="image",
            status="UPLOADED",
            ocr_extracted_text=(
                "APOLLO HOSPITALS DELHI — OPD PRESCRIPTION\n"
                "Patient: Mayank Sharma | Age: 29 | Date: 02/11/2026\n"
                "Rx:\n"
                "1. Tab Paracetamol 650mg — 1 tab SOS (after food) for fever > 100°F\n"
                "2. Cetirizine 10mg — 1 tab at bedtime for 3 days\n"
                "3. Steam inhalation twice daily with warm saline gargles\n"
                "⚠️ Note: Patient allergic to Penicillin. Avoid beta-lactam antibiotics.\n"
                "Review if fever persists > 3 days."
            ),
            ocr_status="DRAFT",
            uncertain_fields_json=json.dumps([
                {"field": "Dosage line 1", "extracted": "650mg SOS", "confidence": "0.82", "flag": "Handwritten number, requires patient verification"},
                {"field": "Duration line 2", "extracted": "for 3 days", "confidence": "0.78", "flag": "Handwritten abbreviation"}
            ]),
            verified_by_patient=False,
            notes="Uploaded via mobile photo camera for OCR drafting.",
        ),
        PatientDocument(
            patient_id=patient.id,
            title="Cardiology Referral Letter from Primary Care",
            category="Referral",
            file_url="/sample_referral.pdf",
            file_type="pdf",
            status="VERIFIED",
            ocr_extracted_text=(
                "REFERRAL TO CARDIOLOGY OPD\n"
                "To: Consultant Cardiologist, Fortis Escorts\n"
                "Patient: Mayank Sharma (29/M)\n"
                "Reason: Family history of early CAD, evaluation of intermittent resting palpitations.\n"
                "Current BP: 128/82 mmHg. Systemic examination unremarkable.\n"
                "Kindly review and advise regarding resting ECG / 2D Echo if indicated.\n"
                "Ref Dr. Anjali Mehta, MBBS MD."
            ),
            ocr_status="VERIFIED",
            uncertain_fields_json=json.dumps([]),
            verified_by_patient=True,
            notes="Officially verified referral document.",
        ),
        PatientDocument(
            patient_id=patient.id,
            title="Dr. Lal PathLabs — Complete Blood Count (CBC)",
            category="Lab Report",
            file_url="/sample_cbc_report.pdf",
            file_type="pdf",
            status="UPLOADED",
            ocr_extracted_text=(
                "DR. LAL PATHLABS — DIAGNOSTIC REPORT\n"
                "Hemoglobin: 14.8 g/dL (Normal: 13.0 - 17.0)\n"
                "Total Leukocyte Count (TLC): 6,800 /uL (Normal: 4,000 - 11,000)\n"
                "Platelet Count: 2.4 Lakh /uL (Normal: 1.5 - 4.5)\n"
                "ESR: 12 mm/hr (Normal: 0 - 15)\n"
                "Impression: Normal hematological indices. No acute leukocytosis."
            ),
            ocr_status="VERIFIED",
            uncertain_fields_json=json.dumps([]),
            verified_by_patient=True,
            notes="Routine diagnostic baseline.",
        ),
    ]

    for d in docs:
        db.add(d)
    await db.flush()


# ---------------------------------------------------------------------------
# Sample Recovery Symptom Journals (PS3 Module 12)
# ---------------------------------------------------------------------------
async def _seed_sample_journals(db: AsyncSession):
    result = await db.execute(select(Patient).limit(1))
    patient = result.scalar_one_or_none()
    if not patient:
        return

    now = datetime.datetime.now()
    journals = [
        PatientSymptomJournal(
            patient_id=patient.id,
            entry_date=now - datetime.timedelta(days=2),
            severity_scale=6,
            symptoms_reported_json=json.dumps(["Fever", "Mild Headache", "Sore throat"]),
            perceived_change="Stable",
            daily_notes="Resting in bed, taking fluids and warm soups.",
            care_plan_tasks_completed=2,
            care_plan_tasks_total=3,
            clinician_review_status="REVIEWED",
            escalation_triggered=False,
        ),
        PatientSymptomJournal(
            patient_id=patient.id,
            entry_date=now - datetime.timedelta(days=1),
            severity_scale=4,
            symptoms_reported_json=json.dumps(["Mild Headache", "Fatigue"]),
            perceived_change="Improving",
            daily_notes="Fever has resolved. Throat soreness reduced by 70%.",
            care_plan_tasks_completed=3,
            care_plan_tasks_total=3,
            clinician_review_status="REVIEWED",
            escalation_triggered=False,
        ),
        PatientSymptomJournal(
            patient_id=patient.id,
            entry_date=now,
            severity_scale=2,
            symptoms_reported_json=json.dumps(["Mild tiredness on walking"]),
            perceived_change="Improving",
            daily_notes="Much better today, able to resume light desk work.",
            care_plan_tasks_completed=3,
            care_plan_tasks_total=3,
            clinician_review_status="NO_REVIEW_REQUIRED",
            escalation_triggered=False,
        ),
    ]

    for j in journals:
        db.add(j)

    # Initial journey progress for demo patient
    db.add(PatientJourneyProgress(
        patient_id=patient.id,
        template_id="dental_care",
        current_node_id="dental_node_3",
        completed_node_ids_json=json.dumps(["dental_node_1", "dental_node_2"]),
        preparation_checklist_json=json.dumps([
            {"id": "prep_1", "text": "Organize previous dental notes", "completed": True},
            {"id": "prep_2", "text": "List any current pain medications", "completed": True},
            {"id": "prep_3", "text": "Check photo ID and clinic address", "completed": False},
        ]),
        selected_branches_json=json.dumps({}),
        status="ACTIVE",
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

