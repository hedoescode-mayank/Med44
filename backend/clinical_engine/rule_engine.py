"""
Clinical rule engine - maps matched symptoms to urgency levels and actions.
Uses in-memory rules as primary source; DB rules supplement.
"""
import json
from typing import List, Tuple

# In-memory clinical rules (fallback when DB unavailable)
# Format: (name, symptom_set, urgency, action)
IN_MEMORY_RULES: List[Tuple] = [
    (
        "Cardiac Emergency",
        {"chest_pain", "breathing_difficulty"},
        "RED",
        "EMERGENCY: Call 112 immediately. Possible cardiac or pulmonary emergency.",
    ),
    (
        "Chest Pain Alert",
        {"chest_pain"},
        "RED",
        "Call 112 immediately. Chest pain can indicate a heart attack. Do not delay.",
    ),
    (
        "Breathing Emergency",
        {"breathing_difficulty"},
        "RED",
        "Call 112 immediately. Severe breathing difficulty is life-threatening.",
    ),
    (
        "Stroke Warning",
        {"confusion", "weakness", "blurred_vision"},
        "RED",
        "EMERGENCY: Possible stroke. FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 112.",
    ),
    (
        "Severe Abdominal Emergency",
        {"abdominal_pain", "vomiting", "fever"},
        "RED",
        "Possible appendicitis or peritonitis. Seek emergency care immediately.",
    ),
    (
        "Cardiac Palpitations",
        {"palpitations", "chest_pain"},
        "RED",
        "Palpitations with chest pain may indicate arrhythmia. Call 112.",
    ),
    (
        "Fever with Rash",
        {"fever", "rash"},
        "YELLOW",
        "Fever with rash can indicate dengue, measles, or other infections. See a doctor promptly.",
    ),
    (
        "Severe Headache",
        {"headache", "confusion"},
        "RED",
        "Severe headache with confusion may indicate meningitis or brain emergency. Seek immediate care.",
    ),
    (
        "Gastroenteritis",
        {"vomiting", "diarrhea"},
        "YELLOW",
        "Stay hydrated with ORS. Avoid solid food 4-6 hours. See doctor if symptoms persist >24h or blood appears.",
    ),
    (
        "Fever with Vomiting",
        {"fever", "vomiting"},
        "YELLOW",
        "Possible acute gastroenteritis or infection. Stay hydrated with ORS and monitor closely. Consult a doctor if vomiting persists >24 hours.",
    ),
    (
        "Dehydration Risk",
        {"diarrhea", "vomiting", "weakness"},
        "YELLOW",
        "Risk of dehydration. Take ORS every 15 minutes. Seek IV fluids if unable to keep fluids down.",
    ),
    (
        "Upper Respiratory Infection",
        {"cough", "sore_throat", "runny_nose"},
        "GREEN",
        "Rest and stay hydrated. Gargle with warm salt water. See doctor if fever develops or symptoms worsen.",
    ),
    (
        "Migraine",
        {"headache", "nausea", "blurred_vision"},
        "YELLOW",
        "Rest in dark, quiet room. Apply cold pack. OTC pain relief may help. Consult neurologist if severe.",
    ),
    (
        "UTI",
        {"urinary_pain", "fever"},
        "YELLOW",
        "Possible urinary tract infection. Increase fluids. See doctor for antibiotic evaluation.",
    ),
    (
        "Musculoskeletal Pain",
        {"back_pain", "joint_pain"},
        "GREEN",
        "Rest, avoid heavy lifting. Apply warm/cold pack. OTC pain relief may help. See doctor if >1 week.",
    ),
    (
        "Mental Health Concern",
        {"depression", "sleep_problem", "loss_of_appetite"},
        "YELLOW",
        "These symptoms may indicate depression. Consult a mental health professional. iCall: 9152987821",
    ),
    (
        "Anxiety with Palpitations",
        {"anxiety", "palpitations"},
        "YELLOW",
        "Practice deep breathing (4-7-8). Reduce caffeine. Consult mental health professional if frequent.",
    ),
    (
        "Weight Loss Alert",
        {"weight_loss", "fatigue", "night_sweats"},
        "YELLOW",
        "Unexplained weight loss warrants evaluation. See a doctor promptly.",
    ),
    (
        "Eye Emergency",
        {"eye_pain", "blurred_vision"},
        "YELLOW",
        "Avoid screen time. If redness or discharge, consult ophthalmologist promptly.",
    ),
    (
        "Simple Fever",
        {"fever"},
        "GREEN",
        "Rest and stay hydrated. Paracetamol if temperature >38°C. Consult doctor if fever persists >3 days.",
    ),
    (
        "Dizziness",
        {"dizziness", "nausea"},
        "YELLOW",
        "Rest and avoid sudden movements. Stay hydrated. See ENT or neurologist if severe or recurrent.",
    ),
]


def evaluate_rules(matched_symptoms: List[str]) -> Tuple[str, str, str]:
    """
    Evaluate clinical rules against matched symptoms.
    Returns (urgency_level, rule_name, recommended_action).
    Urgency is the highest found across all matching rules.
    """
    if not matched_symptoms:
        return "GREEN", "No specific rule matched", (
            "No specific symptoms identified. Please describe your symptoms in more detail. "
            "If you have any urgent symptoms, please consult a doctor."
        )

    symptom_set = set(matched_symptoms)
    urgency_rank = {"GREEN": 0, "YELLOW": 1, "RED": 2}
    best_urgency = "GREEN"
    best_rule = "General Symptom Advice"
    best_action = (
        "Based on your symptoms, rest and monitor carefully. "
        "Consult a doctor if symptoms worsen or new symptoms develop."
    )
    best_match_count = 0

    # First pass: Rules where ALL required symptoms are present
    full_matches = []
    for rule_name, rule_symptoms, urgency, action in IN_MEMORY_RULES:
        if rule_symptoms.issubset(symptom_set):
            full_matches.append((rule_name, rule_symptoms, urgency, action, len(rule_symptoms)))

    if full_matches:
        # Pick the highest urgency, then highest symptom count
        for rule_name, rule_symptoms, urgency, action, match_count in full_matches:
            if (urgency_rank[urgency] > urgency_rank[best_urgency] or
                    (urgency_rank[urgency] == urgency_rank[best_urgency]
                     and match_count > best_match_count)):
                best_urgency = urgency
                best_rule = rule_name
                best_action = action
                best_match_count = match_count
        return best_urgency, best_rule, best_action

    # Second pass: Partial matches for multi-symptom rules (require at least 2 overlaps for non-RED rules)
    for rule_name, rule_symptoms, urgency, action in IN_MEMORY_RULES:
        if urgency == "RED":
            continue  # Do not trigger RED emergencies on partial symptom matches unless explicit
        overlap = symptom_set & rule_symptoms
        if len(overlap) >= 2:
            match_count = len(overlap)
            if (urgency_rank[urgency] > urgency_rank[best_urgency] or
                    (urgency_rank[urgency] == urgency_rank[best_urgency]
                     and match_count > best_match_count)):
                best_urgency = urgency
                best_rule = rule_name
                best_action = action
                best_match_count = match_count

    return best_urgency, best_rule, best_action


def get_all_matching_rules(matched_symptoms: List[str]) -> List[dict]:
    """Return all matching rules for the given symptoms."""
    symptom_set = set(matched_symptoms)
    results = []
    for rule_name, rule_symptoms, urgency, action in IN_MEMORY_RULES:
        overlap = symptom_set & rule_symptoms
        # Include full matches or multi-symptom overlaps >= 2
        if rule_symptoms.issubset(symptom_set) or (len(overlap) >= 2 and urgency != "RED"):
            results.append({
                "rule_name": rule_name,
                "matched_symptoms": list(overlap),
                "urgency": urgency,
                "action": action,
            })
    return results

