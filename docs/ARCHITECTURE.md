# Med44 Architecture Specification

## 1. Overview
Med44 is a locally runnable, privacy-preserving hybrid healthcare assistant. It operates in two cooperative intelligence modes:
1. **Offline Mode:** Deterministic, rule-driven clinical query engine powered by SQLite and verified knowledge tables.
2. **Online Mode:** Conversational agent workflows powered by Groq API with function/tool orchestration.

Both modes are strictly monitored by an inviolable, shared clinical safety engine.

```
                           +----------------------------+
                           |  React + Vite PWA Client   |
                           |  (English / Hindi / Tamil) |
                           +--------------+-------------+
                                          |
                                HTTP / REST API
                                          |
                                          v
                           +----------------------------+
                           |   FastAPI Service Layer    |
                           +--------------+-------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
         [Offline Clinical Engine]                  [Groq AI Agents]
         - Multilingual Normalizer                  - Symptom Evaluator
         - Symptom Matcher                          - Appointment Agent
         - Red-Flag Detector                        - Medication Info
         - Clinical Decision Rules                  - Fallback Recovery
                      |                                       |
                      +-------------------+-------------------+
                                          |
                                          v
                           +----------------------------+
                           |    Shared Safety Engine    |
                           |  (Emergency Overrides,     |
                           |   Anti-Prescription,       |
                           |   Mandatory Disclaimers)   |
                           +--------------+-------------+
                                          |
                                          v
                           +----------------------------+
                           |     SQLite Database        |
                           |  (Patients, Prescriptions, |
                           |   Appointments, Audit Logs)|
                           +----------------------------+
```

## 2. Core Modules

### 2.1 Clinical Engine (`backend/clinical_engine/`)
- `normalizer.py`: Language detection (English, Hindi Devanagari, Tamil) and string cleansing.
- `symptom_dictionary.py`: Standardized canonical symptom dictionary with multilingual aliases.
- `symptom_matcher.py`: Canonical alias extraction.
- `red_flag_detector.py`: Emergency symptom scanner checking for critical conditions (chest pain, respiratory distress, stroke).
- `rule_engine.py`: Evaluates clinical rules and urgency levels (GREEN, YELLOW, RED).
- `followup_engine.py`: Context-aware clarification question generator.
- `knowledge_retriever.py`: Verified clinical guidance search.
- `response_builder.py`: Structured offline JSON assembler.

### 2.2 Shared Safety Engine (`backend/safety/safety_engine.py`)
- Emergency red flags unconditionally force urgency to **RED**.
- Strips prohibited prescription advice, definitive diagnoses, or dosage instructions.
- Enforces mandatory medical disclaimers on every response payload.
- Maintains comprehensive audit logging.

### 2.3 Groq Conversational AI (`backend/ai/`)
- Uses fast LLaMA models (`llama-3.3-70b-versatile`) via Groq cloud API.
- Fully optional; triggers automatic graceful fallback to the offline deterministic engine whenever offline, rate-limited, or unconfigured.

### 2.4 Offline PWA Client (`frontend/`)
- Built with React, Vite, TypeScript, and Tailwind CSS.
- Service worker caching (`sw.js`) and Web App Manifest (`manifest.json`).
- Offline appointment queue with automatic sync on reconnection.
