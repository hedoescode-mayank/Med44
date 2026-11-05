"""
Knowledge retriever - searches health articles by symptom/keyword.
Returns relevant article excerpts. Never invents information.
"""
from typing import List, Optional


# In-memory article summaries (populated from seed data or static)
STATIC_ARTICLES = [
    {
        "id": 1,
        "title": "Managing Fever at Home",
        "category": "general",
        "keywords": ["fever", "temperature", "pyrexia", "febrile"],
        "excerpt": (
            "[SYNTHETIC DEMO DATA] Rest, stay hydrated. Use paracetamol if temperature >38°C. "
            "Seek care if fever >40°C, lasts >3 days, or is accompanied by stiff neck, rash, "
            "or difficulty breathing."
        ),
        "source": "Synthetic Demo - WHO Fever Management (Adapted)",
    },
    {
        "id": 2,
        "title": "Heart Attack Warning Signs",
        "category": "cardiac",
        "keywords": ["chest pain", "heart attack", "cardiac", "chest_pain", "palpitations"],
        "excerpt": (
            "[SYNTHETIC DEMO DATA] Warning signs: chest pain, arm/jaw pain, shortness of breath, "
            "cold sweats, nausea. If present, call 112 immediately."
        ),
        "source": "Synthetic Demo - AHA Guidelines (Adapted)",
    },
    {
        "id": 3,
        "title": "Oral Rehydration Therapy",
        "category": "gastrointestinal",
        "keywords": ["diarrhea", "vomiting", "dehydration", "ors", "diarrhoea"],
        "excerpt": (
            "[SYNTHETIC DEMO DATA] WHO ORS: 1L boiled water + 6 tsp sugar + 1/2 tsp salt. "
            "Sip frequently. Seek care for >6 stools/day, blood in stool, or severe dehydration."
        ),
        "source": "Synthetic Demo - WHO ORT Guidelines (Adapted)",
    },
    {
        "id": 4,
        "title": "Mental Health: When to Seek Help",
        "category": "mental_health",
        "keywords": ["depression", "anxiety", "mental health", "suicidal", "panic"],
        "excerpt": (
            "[SYNTHETIC DEMO DATA] Signs to seek help: persistent sadness >2 weeks, inability "
            "to perform daily tasks, thoughts of self-harm. Helplines: iCall: 9152987821, "
            "Vandrevala: 1860-2662-345 (24/7)."
        ),
        "source": "Synthetic Demo - Mental Health Guidelines (Adapted)",
    },
    {
        "id": 5,
        "title": "Stroke Recognition: FAST Test",
        "category": "neurological",
        "keywords": ["stroke", "confusion", "weakness", "facial drooping", "slurred speech"],
        "excerpt": (
            "[SYNTHETIC DEMO DATA] FAST: Face drooping, Arm weakness, Speech difficulty, "
            "Time to call 112. Every minute counts. Fast treatment saves brain tissue."
        ),
        "source": "Synthetic Demo - Stroke Association Guidelines (Adapted)",
    },
    {
        "id": 6,
        "title": "Managing Diabetes in Daily Life",
        "category": "endocrinology",
        "keywords": ["diabetes", "blood sugar", "glucose", "insulin", "diabetic"],
        "excerpt": (
            "[SYNTHETIC DEMO DATA] Key management: regular glucose monitoring, balanced diet, "
            "moderate exercise, medication adherence. Hypoglycemia signs: shakiness, sweating, "
            "confusion - treat with 15g fast-acting carbs."
        ),
        "source": "Synthetic Demo - Diabetes Management (Adapted)",
    },
    {
        "id": 7,
        "title": "Respiratory Hygiene",
        "category": "respiratory",
        "keywords": ["cough", "cold", "flu", "respiratory", "breathing"],
        "excerpt": (
            "[SYNTHETIC DEMO DATA] Respiratory hygiene: cover mouth when coughing, use tissues, "
            "wash hands for 20+ seconds, wear masks when sick, maintain ventilation."
        ),
        "source": "Synthetic Demo - WHO Respiratory Guidelines (Adapted)",
    },
]


def search_articles(
    symptoms: List[str],
    query: Optional[str] = None,
    max_results: int = 3,
) -> List[dict]:
    """
    Search health articles by symptoms and optional text query.
    Returns list of relevant article excerpts.
    NEVER invents medical information - only returns stored content.
    """
    results = []
    seen_ids = set()
    search_terms = set(s.lower() for s in symptoms)
    if query:
        search_terms.update(query.lower().split())

    for article in STATIC_ARTICLES:
        if article["id"] in seen_ids:
            continue

        article_keywords = set(k.lower() for k in article["keywords"])
        if search_terms & article_keywords:
            results.append({
                "id": article["id"],
                "title": article["title"],
                "excerpt": article["excerpt"],
                "category": article["category"],
                "source": article["source"],
            })
            seen_ids.add(article["id"])

        if len(results) >= max_results:
            break

    return results


def get_article_by_id(article_id: int) -> Optional[dict]:
    """Get full article by ID."""
    for article in STATIC_ARTICLES:
        if article["id"] == article_id:
            return article
    return None

