# Repository Audit & Third-Party Attribution

**Project:** Med44 (Nova Care AI)  
**Date:** November 2026  
**Auditor:** Autonomous Senior Healthcare AI Architect  

---

## 1. Examined Repositories

### Repository A: `triage` (haru-g-cmd/triage)
- **Source URL:** https://github.com/haru-g-cmd/triage
- **Local Clone:** `C:\HealthAI\research\triage`
- **Architecture:** FastAPI backend + LangGraph multi-agent pipeline + React/Vite frontend.
- **Key Characteristics:**
  - 4-agent triage pipeline (`symptom_evaluator`, `policy_agent`, `safety_agent`, `resource_agent`).
  - ChromaDB vector store with 18 medical guideline markdown files.
  - Urgency categorization: GREEN / YELLOW / RED with conditional graph branching.
  - Demo mode fallback without mandatory API keys.
  - SQLite persistence via async SQLAlchemy and JWT authentication.
- **Audit Findings & Incompatibilities:**
  - Hard dependency on heavy vector stores (ChromaDB) and local embeddings for basic offline runs.
  - Tightly coupled to English clinical markdown files without multilingual (Hindi/Tamil) symptom support.
  - Not offline-first for patient mobile/PWA usage.
- **Reused Concepts & Inspiration:**
  - Clean separation of the safety agent as an inviolable post-processing step.
  - Explicit non-autonomous booking requiring patient confirmation.
- **Attribution & License:**
  - Original concepts derived under fair-use educational/research attribution. Med44 codebase is an original ground-up rewrite.

---

### Repository B: `MedicalAgent` (yu-lin-zhang/MedicalAgent)
- **Source URL:** https://github.com/yu-lin-zhang/MedicalAgent
- **Local Clone:** `C:\HealthAI\research\MedicalAgent`
- **Architecture:** Kaggle-centric healthcare AI agent dataset, triage notebooks, and evaluation scripts.
- **Key Characteristics:**
  - `healthcare_ai_agent_dataset.csv` with simulated patient triage dialogues and ground truth urgencies.
  - Retrieval and schema validation modules.
- **Audit Findings & Incompatibilities:**
  - Designed as offline notebook analysis and Kaggle competition benchmark rather than an interactive end-user clinical web/PWA application.
  - Lacked real-time multilingual normalizer and slot booking workflows.
- **Reused Concepts & Inspiration:**
  - Benchmark questions for symptom severity and red-flag escalation mapping.
- **Attribution & License:**
  - Evaluated for architecture and symptom patterns. No proprietary or restricted code was merged.

---

## 2. Med44 Architectural Originality
Med44 is an entirely independent, clean-room implementation:
1. **Deterministic Multilingual Engine:** Custom normalizers and token-level dictionary matchers for Hindi, English, and Tamil.
2. **Dual Intelligence Layer:** Seamless automatic toggle between offline SQLite/rule tables and Groq conversational AI.
3. **PWA Offline-First Support:** Fully functional service worker and offline booking queue.
4. **Distinctive Brand Identity:** Nurse mascot logo, custom green-pink aesthetic, and responsive patient portal.
