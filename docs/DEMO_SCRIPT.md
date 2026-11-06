# Med44 — Judge Presentation & Live Demonstration Script

## Problem Statement
**PS3 — The Missing Link: Patient Journey & Healthcare Access Navigator**

---

## 1. Problem Understanding & Relevance (30% Weightage)

### Core Healthcare Navigation Pain Points
- **The "Missing Link"**: Healthcare access is fragmented. Patients know they feel sick, but don't know *where* to go, *which* facility offers the required specialist, *what* documents or referral letters they need, or *how* to manage their treatment pathway across appointments.
- **Administrative Navigation vs. Clinical Diagnosis**:
  - Med44 is strictly an **administrative navigation and care coordination system**, not a diagnostic engine.
  - It guides the patient across the end-to-end journey: **Discovery → Appointment → Referral/Document Checklist → Recovery & Monitoring → Human Escalation**.
  - All clinical suggestions are guarded by deterministic safety rules and emergency red-flag interceptors.

---

## 2. Working Implementation & Functionality (25% Weightage)

| Module | What Works in Med44 | Verification Path |
|---|---|---|
| **Discovery (Module 1)** | Real facility search, specialty filters, language matching, distance calculation, explainable match reasons | `/appointments` |
| **Profile & Intake (Module 2)** | 5-step intake survey, BMI, personalized health baseline score, allergy safeguards | `/survey`, `/profile` |
| **Appointments (Module 3)** | Real slot booking, queue token allocation, cancellation, anti-double-booking transactions | `/appointments` |
| **Local Document Vault (Module 4 & 5)** | Local-first OPFS/IndexedDB storage, PyMuPDF PDF layer extraction, OCR draft review, side-by-side verification | `/documents` |
| **Care Journey (Module 6 & 9)** | Interactive pathway trees, step checkboxes, stage progression | `/journey` |
| **Multilingual AI Triage (Module 7)** | English, Hindi, Tamil symptom triage with offline clinical rule engine fallback and document grounding | `/chat` |
| **Telemetry & Alerts (Module 8 & 14)** | Sensor simulator, vital thresholds (HR, SpO2, BP), physician email notification outbox | `/simulation` |
| **Duolingo-Style Nudges** | Daily check-in widget, streak tracking, audio chime, XP rewards | `/dashboard` |

---

## 3. Technical Approach & Architecture (20% Weightage)

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Zustand store persistence, Dexie.js (IndexedDB + OPFS local document vault), i18next (EN/HI/TA).
- **Backend**: FastAPI asynchronous server, SQLAlchemy ORM, SQLite database with automatic migration runner.
- **Offline Clinical Engine**: Deterministic clinical knowledge base (`med44_offline_clinical_knowledge_base_v1.json`) with zero external API hard-dependencies; handles EN, HI, and TA symptoms even with zero internet.
- **Shared Safety Engine**: Final validation step on all AI outputs; intercepts emergency red flags (chest pain, stroke, severe respiratory distress) to trigger immediate escalation (112 dispatch notice).
- **Local-First Privacy**: Sensitive medical documents and scans remain encrypted in the client's browser vault; only verified metadata is synchronized.

---

## 4. Live 3-Minute Demo Walkthrough (25% Weightage)

### Step 1: Personalized Dashboard (`/dashboard`)
- Show **BabyNurse mascot** and dynamic greeting.
- Demonstrate the **Duolingo-style Daily Check-in Widget**:
  - Click `"✅ Yes, all taken"` → hear the Web Audio chime, watch the streak and XP increment!
- Highlight the transparent **Health Score Calculation**.

### Step 2: Facility Discovery & Appointments (`/appointments`)
- Search by name, filter by language (Hindi/Tamil) and accessibility.
- Point out **"Why this facility matches"** (Explainable Recommendation).
- Select slot and book with instant **queue token allocation**.

### Step 3: Local Health Vault & Real OCR (`/documents`)
- Upload a prescription or report.
- Point out the **Local Browser Vault indicator** (OPFS/IndexedDB).
- Show the **Side-by-Side Reviewer**: Original file scan on left vs extracted OCR draft on right.
- Click **"Verify & Confirm Document"** to lock the verified instructions.

### Step 4: Document-Aware Multilingual AI Chat (`/chat`)
- Click the **Paperclip icon** in chat to attach the verified document from your local vault.
- Switch language to **Hindi** or **Tamil**.
- Ask a symptom question. Notice:
  - Personalized allergy warnings from survey data.
  - Document grounding reference citation.
  - Safety engine disclaimer and guidance.

### Step 5: Wearable Telemetry & Escalation Lab (`/simulation`)
- Show live resting vitals (HR 74, SpO2 98.5%, BP 118/78).
- Click **"⚡ Tachycardia Spike"** or **"🫁 Hypoxemia Drop"**.
- Watch the **Deterministic Alert Engine** instantly trigger critical alert status.
- Show the **Alert Outbox & Doctor Email Dispatch** log verifying consent and physician alert dispatch.
