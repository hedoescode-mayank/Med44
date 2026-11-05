"""
Comprehensive in-memory symptom dictionary with English, Hindi, and Tamil aliases.
50+ symptoms with multilingual support.

Format: {canonical_name: {en: [...], hi: [...], ta: [...]}}
"""

SYMPTOM_DICT: dict = {
    "fever": {
        "en": ["fever", "high temperature", "temperature", "pyrexia", "febrile", "running a fever"],
        "hi": ["बुखार", "ताप", "बुखार है", "तेज़ बुखार", "बुखार हो रहा है"],
        "ta": ["காய்ச்சல்", "காய்ச்சல் இருக்கிறது", "ஜுரம்", "காய்ச்சல் வருகிறது"],
    },
    "headache": {
        "en": ["headache", "head pain", "head ache", "migraine", "head hurts", "head is pounding"],
        "hi": ["सिरदर्द", "सिर दर्द", "सिर में दर्द", "माइग्रेन", "सिर भारी है"],
        "ta": ["தலைவலி", "தலை வலி", "தலைவலி இருக்கிறது", "தலை வலிக்கிறது"],
    },
    "cough": {
        "en": ["cough", "coughing", "dry cough", "wet cough", "persistent cough", "hacking cough"],
        "hi": ["खांसी", "कफ", "सूखी खांसी", "बलगम वाली खांसी", "खांसी हो रही है"],
        "ta": ["இருமல்", "இருமல் வருகிறது", "வறட்டு இருமல்", "சளி இருமல்"],
    },
    "chest_pain": {
        "en": ["chest pain", "chest ache", "chest discomfort", "chest tightness",
               "chest pressure", "pain in chest", "heart pain"],
        "hi": ["सीने में दर्द", "छाती में दर्द", "सीने में तकलीफ", "सीना दर्द करता है"],
        "ta": ["மார்பு வலி", "நெஞ்சு வலி", "மார்பு வலி உள்ளது", "நெஞ்சில் வலி"],
    },
    "breathing_difficulty": {
        "en": ["breathing difficulty", "shortness of breath", "can't breathe", "cannot breathe",
               "breathlessness", "dyspnea", "hard to breathe", "difficulty breathing",
               "short of breath", "labored breathing"],
        "hi": ["सांस लेने में तकलीफ", "सांस नहीं आ रही", "दम फूलना", "सांस की समस्या",
               "सांस नहीं ले पा रहा"],
        "ta": ["மூச்சு விட முடியவில்லை", "மூச்சு திணறல்", "சுவாச கஷ்டம்", "மூச்சு படாமல் போகுது"],
    },
    "vomiting": {
        "en": ["vomiting", "vomit", "throwing up", "nausea and vomiting", "emesis", "puking"],
        "hi": ["उल्टी", "उल्टी हो रही है", "जी मिचलाना और उल्टी", "उल्टी आना"],
        "ta": ["வாந்தி", "வாந்தி வருகிறது", "வாந்தி ஆகிறது", "குமட்டல் மற்றும் வாந்தி"],
    },
    "diarrhea": {
        "en": ["diarrhea", "diarrhoea", "loose stools", "loose motions", "watery stool",
               "runny stool", "frequent stools"],
        "hi": ["दस्त", "पेचिश", "ढीले दस्त", "पानी वाले दस्त", "बार बार दस्त"],
        "ta": ["வயிற்றுப்போக்கு", "வயிறு பிரச்சனை", "தொடர் மலம்"],
    },
    "abdominal_pain": {
        "en": ["abdominal pain", "stomach pain", "belly pain", "stomach ache", "stomach cramps",
               "gut pain", "tummy ache", "abdominal cramps"],
        "hi": ["पेट दर्द", "पेट में दर्द", "उदर दर्द", "पेट में मरोड़"],
        "ta": ["வயிற்று வலி", "வயிறு வலிக்கிறது", "வயிற்று வலி உள்ளது"],
    },
    "back_pain": {
        "en": ["back pain", "backache", "lower back pain", "spine pain", "back ache",
               "lumbar pain", "back hurts"],
        "hi": ["पीठ दर्द", "कमर दर्द", "पीठ में दर्द", "पीठ का दर्द"],
        "ta": ["முதுகு வலி", "இடுப்பு வலி", "முதுகு வலிக்கிறது"],
    },
    "joint_pain": {
        "en": ["joint pain", "joint ache", "arthralgia", "joints ache", "knee pain", "hip pain",
               "elbow pain", "shoulder pain", "joint swelling"],
        "hi": ["जोड़ों में दर्द", "घुटने में दर्द", "संधि शूल", "जोड़ दर्द"],
        "ta": ["மூட்டு வலி", "மூட்டு வலி உள்ளது", "முழங்கால் வலி"],
    },
    "fatigue": {
        "en": ["fatigue", "tiredness", "exhaustion", "weakness", "lack of energy", "lethargy",
               "always tired", "feel drained"],
        "hi": ["थकान", "कमज़ोरी", "थकावट", "ऊर्जा की कमी", "हमेशा थका हुआ"],
        "ta": ["சோர்வு", "களைப்பு", "சோர்வாக இருக்கிறேன்", "ஆற்றல் இல்லை"],
    },
    "dizziness": {
        "en": ["dizziness", "dizzy", "vertigo", "lightheadedness", "feeling faint", "spinning",
               "room spinning", "unsteady"],
        "hi": ["चक्कर आना", "सिर चकराना", "चक्कर", "चक्कर आ रहे हैं"],
        "ta": ["தலைச்சுற்றல்", "தலை சுற்றுகிறது", "மயக்கம் வருகிறது"],
    },
    "nausea": {
        "en": ["nausea", "nauseous", "sick feeling", "queasy", "want to vomit", "feel like vomiting"],
        "hi": ["जी मिचलाना", "उबकाई", "मतली", "उल्टी जैसा महसूस होना"],
        "ta": ["குமட்டல்", "வாந்தி உணர்வு", "வயிறு குளறுகிறது"],
    },
    "sore_throat": {
        "en": ["sore throat", "throat pain", "throat ache", "strep throat", "throat infection",
               "painful swallowing", "throat hurts"],
        "hi": ["गले में दर्द", "गले में खराश", "गला दुखना", "गले में तकलीफ"],
        "ta": ["தொண்டை வலி", "தொண்டை கரகரப்பு", "தொண்டையில் வலி"],
    },
    "rash": {
        "en": ["rash", "skin rash", "hives", "urticaria", "itchy skin", "red spots",
               "skin eruption", "blisters", "itching"],
        "hi": ["दाने", "चकत्ते", "खुजली", "त्वचा पर दाने"],
        "ta": ["தோல் வெடிப்பு", "தடிப்பு", "அரிப்பு", "சொறி"],
    },
    "swelling": {
        "en": ["swelling", "swollen", "edema", "puffiness", "bloating", "inflamed"],
        "hi": ["सूजन", "फूलना", "सूजा हुआ"],
        "ta": ["வீக்கம்", "வீக்கம் உள்ளது", "வீங்கியிருக்கிறது"],
    },
    "blurred_vision": {
        "en": ["blurred vision", "blurry vision", "vision loss", "can't see clearly",
               "double vision", "dim vision", "vision problems"],
        "hi": ["धुंधली दृष्टि", "आँखें धुंधली", "दृष्टि कम होना", "दो दो दिखना"],
        "ta": ["மங்கலான பார்வை", "தெளிவற்ற பார்வை", "இரட்டை பார்வை"],
    },
    "confusion": {
        "en": ["confusion", "confused", "disorientation", "altered mental status",
               "not thinking clearly", "disoriented", "foggy brain"],
        "hi": ["भ्रम", "भटकाव", "समझ नहीं आ रहा", "दिमाग काम नहीं कर रहा"],
        "ta": ["குழப்பம்", "மனக்குழப்பம்", "தெளிவில்லை"],
    },
    "weakness": {
        "en": ["weakness", "muscle weakness", "limb weakness", "arm weakness", "leg weakness",
               "general weakness", "feeling weak"],
        "hi": ["कमज़ोरी", "मांसपेशियों की कमज़ोरी", "हाथ-पैर में कमज़ोरी"],
        "ta": ["பலவீனம்", "தசை பலவீனம்", "வலிமையற்றதாக இருக்கிறது"],
    },
    "palpitations": {
        "en": ["palpitations", "heart racing", "fast heartbeat", "irregular heartbeat",
               "heart fluttering", "pounding heart", "racing heart"],
        "hi": ["धड़कन बढ़ना", "दिल तेज़ धड़कना", "अनियमित धड़कन", "दिल की धड़कन"],
        "ta": ["படபடப்பு", "இதய படபடப்பு", "இதயம் வேகமாக துடிக்கிறது"],
    },
    "runny_nose": {
        "en": ["runny nose", "nasal discharge", "rhinorrhea", "stuffy nose", "blocked nose"],
        "hi": ["नाक बहना", "नाक से पानी", "नाक बंद होना"],
        "ta": ["மூக்கு ஒழுகுதல்", "மூக்கடைப்பு"],
    },
    "ear_pain": {
        "en": ["ear pain", "earache", "ear ache", "otitis", "pain in ear"],
        "hi": ["कान में दर्द", "कान दर्द", "कान में तकलीफ"],
        "ta": ["காது வலி", "காதில் வலி"],
    },
    "eye_pain": {
        "en": ["eye pain", "eye ache", "red eyes", "conjunctivitis", "pink eye", "eye irritation"],
        "hi": ["आँख में दर्द", "आँखें लाल", "आँखें जलना"],
        "ta": ["கண் வலி", "கண் சிவத்தல்", "கண் எரிச்சல்"],
    },
    "urinary_pain": {
        "en": ["urinary pain", "burning urination", "painful urination", "dysuria",
               "burning when urinating", "urinary tract infection"],
        "hi": ["पेशाब में जलन", "मूत्र विकार", "पेशाब करते समय दर्द"],
        "ta": ["சிறுநீர் கழிக்கும்போது வலி", "சிறுநீர் எரிச்சல்"],
    },
    "sleep_problem": {
        "en": ["insomnia", "can't sleep", "sleep problem", "sleeplessness", "sleep disorder",
               "unable to sleep", "not sleeping well"],
        "hi": ["नींद नहीं आना", "अनिद्रा", "नींद की समस्या"],
        "ta": ["தூக்கமின்மை", "தூக்கம் வரவில்லை"],
    },
    "anxiety": {
        "en": ["anxiety", "anxious", "panic attack", "nervousness", "worry", "panic", "stressed"],
        "hi": ["चिंता", "घबराहट", "बेचैनी", "पैनिक अटैक"],
        "ta": ["கவலை", "பதட்டம்", "பயம்"],
    },
    "depression": {
        "en": ["depression", "depressed", "feeling low", "sad all the time", "hopeless"],
        "hi": ["अवसाद", "उदास रहना", "हमेशा दुखी", "निराशा"],
        "ta": ["மனச்சோர்வு", "சோகமாக இருக்கிறேன்"],
    },
    "numbness": {
        "en": ["numbness", "numb", "tingling", "pins and needles", "paresthesia",
               "loss of feeling", "can't feel"],
        "hi": ["सुन्नपन", "झनझनाहट", "सुन्न हो जाना"],
        "ta": ["உணர்வின்மை", "மரமரப்பு", "உணர்ச்சி இல்லை"],
    },
    "loss_of_appetite": {
        "en": ["loss of appetite", "not hungry", "anorexia", "decreased appetite",
               "don't want to eat", "no appetite"],
        "hi": ["भूख न लगना", "खाने की इच्छा नहीं", "भूख नहीं लगती"],
        "ta": ["பசியின்மை", "சாப்பிட மனமில்லை"],
    },
    "weight_loss": {
        "en": ["weight loss", "losing weight", "unexplained weight loss", "dropping weight"],
        "hi": ["वज़न कम होना", "अनजाने में वज़न कम", "वज़न गिरना"],
        "ta": ["எடை குறைதல்", "திடீர் எடை குறைப்பு"],
    },
    "night_sweats": {
        "en": ["night sweats", "sweating at night", "excessive sweating", "drenched in sweat"],
        "hi": ["रात को पसीना", "अत्यधिक पसीना", "रात में पसीना आना"],
        "ta": ["இரவு வியர்வை", "அதிக வியர்வை"],
    },
    "constipation": {
        "en": ["constipation", "can't poop", "hard stool", "no bowel movement",
               "difficulty passing stool"],
        "hi": ["कब्ज", "मल नहीं होना", "कड़ा मल"],
        "ta": ["மலச்சிக்கல்", "மலம் போகவில்லை"],
    },
    "blood_in_stool": {
        "en": ["blood in stool", "rectal bleeding", "bloody stool", "black stool", "dark stool"],
        "hi": ["मल में खून", "मल में रक्त", "काला मल"],
        "ta": ["மலத்தில் இரத்தம்", "ஆசனவாயில் இரத்தம்"],
    },
    "blood_in_urine": {
        "en": ["blood in urine", "hematuria", "pink urine", "red urine"],
        "hi": ["पेशाब में खून", "मूत्र में रक्त"],
        "ta": ["சிறுநீரில் இரத்தம்"],
    },
    "jaundice": {
        "en": ["jaundice", "yellow eyes", "yellow skin", "yellowing", "icterus"],
        "hi": ["पीलिया", "आँखें पीली", "त्वचा पीली"],
        "ta": ["மஞ்சள் காமாலை", "கண்கள் மஞ்சளாக"],
    },
    "hair_loss": {
        "en": ["hair loss", "hair fall", "alopecia", "balding", "thinning hair"],
        "hi": ["बाल झड़ना", "गंजापन"],
        "ta": ["முடி உதிர்வு", "தலைமுடி உதிர்வு"],
    },
    "toothache": {
        "en": ["toothache", "tooth pain", "dental pain", "tooth ache"],
        "hi": ["दाँत दर्द", "दाँत में दर्द"],
        "ta": ["பல் வலி", "பற்கள் வலிக்கின்றன"],
    },
    "leg_cramps": {
        "en": ["leg cramps", "muscle cramps", "charlie horse", "leg spasm"],
        "hi": ["पैर में ऐंठन", "पेशी में ऐंठन"],
        "ta": ["கால் வலிப்பு", "தசை பிடிப்பு"],
    },
    "shortness_of_breath_on_exertion": {
        "en": ["shortness of breath on exertion", "get winded easily", "breathing hard on exercise"],
        "hi": ["कसरत पर सांस फूलना", "चलने पर दम फूलना"],
        "ta": ["உடற்பயிற்சியில் மூச்சு திணறல்"],
    },
    "loss_of_smell": {
        "en": ["loss of smell", "can't smell", "anosmia", "reduced smell"],
        "hi": ["गंध न आना", "सूंघने में कमी"],
        "ta": ["வாசனை தெரியவில்லை"],
    },
    "loss_of_taste": {
        "en": ["loss of taste", "can't taste", "ageusia", "food has no taste"],
        "hi": ["स्वाद न आना", "खाने का स्वाद नहीं"],
        "ta": ["சுவை தெரியவில்லை"],
    },
    "frequent_urination": {
        "en": ["frequent urination", "urinating often", "urinary frequency", "peeing a lot"],
        "hi": ["बार बार पेशाब", "अधिक पेशाब"],
        "ta": ["அடிக்கடி சிறுநீர்", "அதிக சிறுநீர்"],
    },
    "excessive_thirst": {
        "en": ["excessive thirst", "always thirsty", "polydipsia", "very thirsty"],
        "hi": ["बहुत प्यास लगना", "अत्यधिक प्यास"],
        "ta": ["அதிக தாகம்", "எப்போதும் தாகமாக இருக்கிறது"],
    },
    "cold_hands": {
        "en": ["cold hands", "cold feet", "cold extremities", "poor circulation"],
        "hi": ["हाथ-पैर ठंडे", "हाथ ठंडे रहना"],
        "ta": ["குளிர்ந்த கைகள்", "குளிர்ந்த கால்கள்"],
    },
    "pale_skin": {
        "en": ["pale skin", "pallor", "looking pale", "white skin"],
        "hi": ["पीली त्वचा", "चेहरा पीला होना"],
        "ta": ["வெளிர் தோல்", "முகம் வெளிரி போகிறது"],
    },
}

# ---------------------------------------------------------------------------
# Dynamic Offline Clinical Knowledge Base v1.0 Loader
# ---------------------------------------------------------------------------
def _load_offline_kb():
    import json
    import os
    from pathlib import Path

    candidates = [
        Path(__file__).parent.parent / "med44_offline_clinical_knowledge_base_v1.json",
        Path("backend/med44_offline_clinical_knowledge_base_v1.json"),
        Path("c:/Users/ASUS/Desktop/MED44/backend/med44_offline_clinical_knowledge_base_v1.json"),
        Path("C:/HealthAI/nova-care-ai/backend/med44_offline_clinical_knowledge_base_v1.json"),
    ]

    for p in candidates:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    kb = json.load(f)
                    symptoms = kb.get("symptom_dictionary", [])
                    for s in symptoms:
                        cname = s.get("canonical_name", "").lower().replace(" ", "_")
                        if not cname:
                            continue
                        if cname not in SYMPTOM_DICT:
                            SYMPTOM_DICT[cname] = {"en": [], "hi": [], "ta": []}
                        # Add search terms
                        for term in s.get("search_terms", []):
                            t = term.strip().lower()
                            if t and t not in SYMPTOM_DICT[cname]["en"]:
                                SYMPTOM_DICT[cname]["en"].append(t)
                        # Add Hindi display if present
                        hi_term = s.get("display_hi")
                        if hi_term and hi_term not in SYMPTOM_DICT[cname]["hi"]:
                            SYMPTOM_DICT[cname]["hi"].append(hi_term)
                        # Add Hinglish display
                        hinglish_term = s.get("display_hinglish")
                        if hinglish_term and hinglish_term not in SYMPTOM_DICT[cname]["hi"]:
                            SYMPTOM_DICT[cname]["hi"].append(hinglish_term)
                break
            except Exception:
                pass

_load_offline_kb()

