# Med44 — Your AI Health Nurse

Med44 is a locally runnable, privacy-first hybrid healthcare assistant that pairs a deterministic offline clinical query engine with optional online Groq conversational intelligence.

---

## 🌟 Key Features

- **Hybrid Dual Intelligence:** Runs 100% offline using a deterministic SQLite rule engine, or seamlessly connects to Groq API for enhanced conversational triage.
- **Multilingual Support:** Native symptom understanding in **English**, **Hindi (हिन्दी)**, and **Tamil (தமிழ்)**.
- **Shared Inviolable Safety Engine:** Emergency red flags (e.g. chest pain, stroke, respiratory distress) always trigger emergency alerts. Never diagnoses definitively or invents prescriptions.
- **Appointment Management:** Doctor discovery across medical specialties with simulated booking and offline request queuing.
- **Medication Management:** Verified drug reference search, interaction warnings, and prescription reminders.
- **Progressive Web App (PWA):** Installable offline application shell with service worker caching and automatic reconnection synchronization.
- **Original Brand Design:** Custom healthcare interface designed around Med44's AI Nurse mascot with responsive soft-green & rose aesthetics.

---

## 🚀 Quick Start

### 1. Setup & Installation
Run the automated setup script:
```cmd
setup.bat
```
Or manually:
```bash
# Backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configuration (Optional)
Copy `.env.example` to `.env`:
```cmd
copy .env.example .env
```
Add your optional `GROQ_API_KEY` for online conversational capabilities. If omitted, Med44 operates in high-precision offline mode.

### 3. Launching Application
Double click or run:
```cmd
start.bat
```
- **Backend API:** http://localhost:8000 (Docs: http://localhost:8000/docs)
- **Frontend Portal:** http://localhost:5173

---

## 🧪 Running Automated Tests
```bash
python -m pytest backend/tests/ -v
```

---

## 🛡️ Clinical Disclaimer
Med44 provides informational triage guidance only and is **NOT** a medical diagnostic tool. Always seek immediate assistance from emergency services (112) or consult a licensed physician for medical conditions.
