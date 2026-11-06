# Med44 — Operational Boundaries, Limitations & Status Matrix

## 1. Operational Boundary & Clinical Safety Guarantee
- **Administrative Navigation Only**: Med44 is strictly an administrative patient navigator and healthcare access coordinator.
- **No Diagnosis or Prescription**: It never generates clinical diagnoses, prescribes drugs, or alters dosages.
- **Safety Interceptor**: All AI and language model outputs pass through a deterministic rule validator (`apply_safety_rules`) before reaching the user. Emergency indicators automatically divert the patient to qualified emergency medical services (112).

---

## 2. Feature Realism Matrix

| Capability | Status | Implementation Details |
|---|---|---|
| **JWT Authentication** | `REAL` | Bcrypt password hashing, 60-min JWT bearer token |
| **Offline Clinical Rule Engine** | `REAL` | Multi-language (EN/HI/TA) symptom matching from verified local knowledge base |
| **Shared Safety Engine** | `REAL` | Deterministic red flag interceptor, non-bypassable |
| **Appointment Booking & Anti-Double-Booking** | `REAL` | SQLite transactions, queue token generator, slot availability validation |
| **Local Document Vault (OPFS/IndexedDB)** | `REAL` | Dexie.js + FileSystemDirectoryHandle with runtime feature detection and persistent storage API |
| **PDF Text-Layer OCR** | `REAL` | PyMuPDF extraction engine for digital clinical records |
| **Image Optical Character Recognition (OCR)** | `BLOCKED (needs Tesseract binary)` | Python package `pytesseract` is installed; host machine currently lacks native `tesseract` binary in `PATH`. System cleanly detects and reports `OCR_UNAVAILABLE` rather than faking text. |
| **Multilingual UI (i18n)** | `REAL` | react-i18next framework with EN, HI, TA locale dictionaries and C08 fallback resilience |
| **Duolingo-Style Nudges & Streaks** | `REAL` | Web Audio harmonic chime, streak counter, XP gamification in Zustand persist |
| **Physiological Sensor Ingestion** | `REAL (API)` | Validated JSON payload ingest with pure-function vital evaluation rules |
| **Physiological Sensor Data Source** | `SIMULATED` | Interactive simulation lab with scenario presets (Tachycardia, Hypoxemia, BP Crisis) |
| **Doctor Alert Outbox & Email Dispatch** | `SIMULATED` | In TEST mode, logs email dispatches to `notification_logs`; real SMTP activated via `.env` credentials |
| **Interactive Care Journey** | `REAL` | Dynamic tree nodes, branching logic, step checkboxes, stage progression |
| **Patient Health Report Card** | `REAL` | Dynamic generation based on real survey vitals, chronic conditions, and appointment history |
