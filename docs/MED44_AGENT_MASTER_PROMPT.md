# MED44 — AGENT MASTER PROMPT (v2, audited against the real repo)

You are a senior full-stack engineer extending the EXISTING Med44 repo (FastAPI + SQLAlchemy/SQLite backend, React 18 + Vite + TS + Tailwind + Zustand PWA frontend). This is an implementation job. Work in phases, run the real app, and verify every claim.

This prompt supersedes and merges the earlier "Wearable/Sensor/Escalation" prompt and the "Master" prompt. Where they overlap, this one wins.

---

## 0. WORKING RULES

1. Inspect before editing. Run backend (`uvicorn backend.main:app`) and frontend (`npm run dev`), open every page, check browser console + network tab. Write findings to `docs/AUDIT_V2.md`.
2. Work **phase by phase**. At the end of each phase: run tests, commit (`git commit` per phase), then post a short report (changed files, what works, what is simulated, what's blocked on me). **Deliver each phase as usable on its own; do not wait to finish everything.**
3. Be token-frugal: no rewrites of working files, no cosmetic polish passes, no long narration. Edit surgically.
4. Never claim something works unless you ran it. Label each feature in the final report: `REAL`, `SIMULATED`, or `BLOCKED (needs: …)`.
5. Preserve: Med44 branding, green/pink design system, mascot, PS3 features, offline clinical engine, shared safety engine, existing auth and patient data.
6. Med44 never diagnoses, prescribes, or changes doses. Keep the safety engine as the last step on every AI output.
7. No secrets in code, logs, frontend, or git. No PHI in logs.

---

## 1. GROUND TRUTH — what the repo actually contains (audited)

**Real and working:** JWT auth (bcrypt), clinical offline engine (EN/HI/TA symptom matching), safety engine, Groq agents with fallback, appointments, facilities, journey, progress, medications reference, 20 passing pytest tests, PWA shell.

**Fake / missing (must be built, not "preserved"):**
- **OCR is simulated.** `backend/routers/documents.py` returns canned text (`raw_ocr_simulation`, category templates) and `file_url` defaults to `/sample_prescription.jpg`. No file is read, no OCR runs.
- **No local document storage.** No IndexedDB/OPFS anywhere in `frontend/src`.
- **No i18n framework.** No `i18next`; strings are hardcoded in pages (SettingsPage etc.). Only the clinical engine understands HI/TA.
- **No C08 or C10 demonstrations exist in code** (grep found nothing). The earlier prompts say "retain" — in reality they must be **built**.
- **No wearable, simulator, alert engine, notification, consent, or doctor-link code.**
- Chat has no document attachment.

**Defects to fix first (Phase 0):**
1. `.env` is inside the project archive → treat its contents as leaked. Remove from git history/ignore it; I will rotate the Groq key. Fail startup in non-demo mode if `SECRET_KEY` is the default.
2. `CORS allow_origins=["*"]` with `allow_credentials=True` → restrict to configured origins.
3. Every router is mounted twice (`/api` and root) → keep `/api` only; update `api.ts`.
4. `public/sw.js` uses `localStorage` inside the service worker (not available there) → queue offline writes in IndexedDB instead; also fix queue replay.
5. JWT 30 min with no refresh → add refresh or silent re-login flow; handle 401 globally.
6. Raw SQL migration + `create_all` → introduce **Alembic**; all new tables go through migrations.
7. `/documents/upload` accepts JSON metadata only → replace with multipart upload (see §3).
8. Add `docs/UI_BUGS.md`: click through every page at 360px, 768px, 1280px; log + fix real UI bugs (overflow, broken buttons, console errors, dead links). Fix only genuine bugs; no redesign.
9. Authorisation audit: every query filtered by `current_user.id`; add a pytest that patient A gets 403/404 on patient B's records for every router.

**Phase 0 exit:** app runs clean, tests green, UI_BUGS.md resolved, secrets handled.

---

## 2. TARGET ARCHITECTURE

```
 PATIENT BROWSER (PWA)                                   BACKEND (FastAPI)
 ┌──────────────────────────────┐                       ┌────────────────────────────────────┐
 │ React + react-i18next        │   multipart (temp)    │ routers/                           │
 │ Dexie (IndexedDB) metadata   │ ───────────────────▶  │  documents_ocr  chat  wearable     │
 │ OPFS / Blob: original files  │ ◀── text+confidence── │  simulation  alerts  consent       │
 │ WebCrypto AES-GCM at rest    │                       │  doctor_link  notifications        │
 │ navigator.storage.persist()  │                       │  facility_reliability  audit       │
 │ Web Bluetooth HR (experiment)│                       ├────────────────────────────────────┤
 └──────────────────────────────┘                       │ services/                          │
          ▲                                             │  ocr/ (Tesseract|Paddle adapters)  │
          │ readings                                    │  reliability/ (validator – pure)   │
 ┌────────┴─────────┐                                   │  alerts/ (rule engine – pure)      │
 │ Android companion│  HTTPS + device token             │  notify/ (Email provider, outbox)  │
 │ (Health Connect) │ ────────────────────────────────▶ │  wearable/adapters/                │
 │ iOS (HealthKit)  │   [later, native, BLOCKED]        │  i18n/ (backend templates)         │
 └──────────────────┘                                   │  safety/ (existing, last step)     │
                                                        ├────────────────────────────────────┤
                                                        │ SQLite (WAL) + Alembic             │
                                                        │ Outbox worker (asyncio/APScheduler)│
                                                        └────────────────────────────────────┘
 Optional, later, behind interfaces: Azure Functions / ACS / Key Vault. Core must not depend on them.
```

Design principles: (a) validators and rule engine are **pure functions** with unit tests; (b) every side effect (email, DB write) goes through an **outbox/audit** record; (c) TEST vs PRODUCTION separation is enforced in the **data model and send path**, not only the UI; (d) providers (OCR, email, wearable, LLM) sit behind interfaces.

---

## 3. PHASE 1 — LOCAL DOCUMENT LIBRARY + REAL BACKEND OCR

### Frontend storage (new `src/lib/docstore/`)
- `DocStore` interface with two implementations: `OpfsStore` (preferred) and `IdbBlobStore` (fallback). Feature-detect at runtime.
- **Dexie** table `documents`: id, patientId, category, originalName, mime, size, storageRef, uploadedAt, documentDate, ocrStatus, ocrTextRef, ocrLanguage, tags[], verificationStatus (`NONE|OCR_DRAFT|PATIENT_CONFIRMED|PROFESSIONALLY_VERIFIED`), contentSha256.
- Separate tables: `ocrResults` (pages, words with bbox+confidence, uncertain regions, engine, version), `ocrCorrections` (patient edits stored **alongside**, never overwriting OCR output or the original).
- Call `navigator.storage.persist()` on first upload; show `navigator.storage.estimate()` usage; warn at >80%; show persisted yes/no.
- **Encryption at rest:** AES-GCM via WebCrypto; key is a non-extractable `CryptoKey` kept in IndexedDB, with optional passphrase (PBKDF2) mode. Be honest in UI: protects against casual disk access, not a compromised browser profile; clearing site data destroys the key.
- Scope all records by `patientId`; on logout/user switch, never expose another user's store.
- Operations: upload, preview (image/PDF), open, rename, categorise, search (filename, tags, OCR text), filter, export (original file), **backup/restore** (single encrypted archive), delete (original + OCR + corrections), reprocess OCR, attach to chat.
- Always show the banner: "Stored only in this browser profile. Export a backup to keep it safe."
- Never overwrite an original; "replace" creates a new version.

### Backend OCR (`backend/services/ocr/`)
- Endpoint `POST /api/ocr/process` (auth required, multipart): validate extension **and** magic bytes, max size (config), max pages, reject encrypted/malformed PDFs; process in a temp dir; delete in `finally` + TTL sweeper; never persist the file by default.
- **Engine choice:** default **Tesseract** (`pytesseract`, langs `eng+hin+tam`) because Hindi/Tamil are required and install is light; `PaddleOCR` as optional adapter; `PyMuPDF` for PDF pages and embedded text-layer shortcut; `OpenCV` for deskew/denoise/contrast; `Pillow` for IO. Windows: document Tesseract binary path + `tessdata` setup in README and expose `GET /api/ocr/health` (engine, version, languages installed). If the engine is missing, return a clear `OCR_UNAVAILABLE` — **never fall back to fake text**.
- Response: per page text, per-word confidence (`image_to_data`), `uncertain_regions` (conf < configurable threshold), detected script/language, engine+version, preprocessing steps applied.
- Handwriting: always flagged `UNCERTAIN`. Never auto-correct drug names or doses.
- Logging: log doc id, size, duration, status only. Never text.
- Optional `AzureDocIntelProvider`: disabled by default; requires explicit consent flag + config.
- **Remove** `raw_ocr_simulation` and the sample file URL path. If I need a demo fixture, put sample images under `tests/fixtures/` and use them only in tests.

### Frontend OCR viewer
Side-by-side: original (zoom, page nav) | editable OCR text with low-confidence words highlighted **and labelled** (icon + text, not colour alone). Buttons: Confirm, Mark uncertain, Re-run, Save correction. Status chips: Processing, Needs review, Uncertain, Verified, Failed, Offline.

**Acceptance (automated where possible):** upload → reload → still there; real OCR on a fixture prescription image returns non-canned text; offline → clear "OCR needs connection" state; export returns byte-identical original; delete removes file+OCR+corrections; cross-patient isolation.

---

## 4. PHASE 2 — DOCUMENT-AWARE CHAT + PRESCRIPTION ORGANISER

### Chat attachment
- Chat composer: Attach → My Documents | Upload new | Preview | Remove.
- On send, frontend includes `{docId, title, category, text (patient-corrected if present), ocrConfidenceSummary, uncertainRegions}` **only for explicitly attached docs**, plus `thirdPartyAiConsent` state.
- Backend `chat` flow: verify auth → check Groq/third-party consent for health text → build grounded prompt → LLM → **safety engine** → return answer with `sources: [{docId, title, page}]`.
- Grounding rules in prompt: answer only from supplied text + clearly-labelled general explanations; structure = (1) what the document says (2) plain-language meaning (3) what couldn't be read (4) what to confirm with doctor/pharmacist; never invent missing text; if confidence is poor, ask for a clearer upload.
- **No consent / offline / no key:** deterministic fallback = regex/dictionary extraction (medicine names against the existing `medications` table, strengths, abbreviations glossary such as OD/BD/TDS/SOS/HS/AC/PC) returning "as written" with uncertainty flags — no LLM.
- Store only `chatbot_document_contexts(conversation_id, doc_id, attached_at, text_sha256)`, not document text.
- Support "compare with previous report" by attaching two docs; side-by-side parameters, no interpretation beyond reference-range text present in the document.

### Prescription Organiser
- Parse (rule-based first, LLM-assist optional) into fields: medicine as written, strength, form, instructions as written, duration (only if explicit), prescriber, date, source page/bbox, confidence.
- Three visibly separate layers per field: `OCR_EXTRACTED` → `PATIENT_CONFIRMED` → `PROFESSIONALLY_VERIFIED`.
- **Reminders** only from patient-confirmed explicit instructions; reminder text is the clinician's wording, copied, never computed. If frequency is unclear → block creation and show "needs verification with doctor/pharmacist". No dose/frequency/duration/substitution suggestions anywhere.
- Reuse existing `prescriptions` and `medicationStore`; migrate, don't duplicate.
- Reminders via Notification API + in-app (permission explained); history view.

---

## 5. PHASE 3 — APPLICATION-WIDE i18n + C08

- `react-i18next` + `i18next-browser-languagedetector`; locales `en`, `hi`, `ta` first (these already exist in the clinical engine); architecture must let me add more by dropping JSON files. Namespaces per area (`common`, `auth`, `appointments`, `documents`, `chat`, `medications`, `wearable`, `alerts`, `settings`, `errors`, `a11y`). Keys like `documents.review_required`.
- Migrate **every** hardcoded user-facing string, including `aria-label`s, toasts, validation errors, empty states, dialogs, `document.title`, and email templates (backend: Jinja2 templates per language).
- `Intl.DateTimeFormat` / `Intl.NumberFormat` with the active locale; persist language in profile + localStorage; `<html lang>` updated; font stack covering Devanagari/Tamil (Noto Sans); layout tolerant to +40% string length.
- Each translation entry has metadata in `locales/_meta.json`: `{key: {critical: bool, approvedBy, approvedAt}}`.
- **C08 behaviour (build + demo page `/demo/c08`):**
  - Missing **non-critical** key → fall back to `en`, show it normally, log key to `missing_translation_log` (key, locale, page, time).
  - Missing/unapproved **critical** key (emergency guidance, medication instructions, consent text, alert guidance) → do **not** machine-guess; show the approved fallback **clearly labelled** "translation pending verification" and require explicit acknowledgement; block the dependent action (e.g. creating a reminder from a translated instruction) until verified.
- CI script `scripts/i18n-check`: key parity across locales, unused/missing keys, and a lint rule/grep that fails on hardcoded JSX text.
- Chatbot: send `uiLanguage`; reply in that language; keep drug names/units untranslated; OCR language and answer language are independent; mark machine-translated critical text "needs professional review".

---

## 6. PHASE 4 — PATIENT/DOCTOR LINKING, WEARABLE LAYER, SIMULATOR, C10

### Identity, consent, doctor link
- Tables: `doctor_contacts`, `doctor_patient_links`, `patient_consents` (type: `WEARABLE_COLLECTION`, `EMERGENCY_NOTIFICATION`, `THIRD_PARTY_AI`; status, consent_text_version, language, granted_at, revoked_at, ip/user-agent hash).
- Patient profile gains: preferred language, verified email flag, mobile + verification status.
- **Email ownership verification:** send 6-digit OTP or signed magic link via the same email provider; store hash + expiry + attempts. Same for the doctor's email (doctor confirms the link request). A link is `ACTIVE` only when: patient email verified + consent granted + doctor email confirmed. Patient can change/revoke doctor, toggle notifications, view notification history. Revoke stops all sends immediately.
- **Mobile verification:** real SMS OTP needs a provider (Twilio or Azure Communication Services). Until I supply one, mobile stays `UNVERIFIED` and the UI says so.
- Test identities come **only** from env: `TEST_DOCTOR_EMAIL`, `TEST_PATIENT_EMAIL` (values given in my original brief). No defaults in source.
- No automatic document sharing with the doctor. Sharing is a separate per-item consent action.

### Wearable abstraction (`backend/services/wearable/adapters/`)
Interface `WearableAdapter.normalize(raw) -> Observation` with `Observation{patient_id, metric(HR|SPO2), value, unit, measured_at, received_at, source_type(REAL_WEARABLE|IMPORTED_DATASET|MANUAL_SIMULATOR), device_id, source_id, quality{...}, raw_payload_ref, environment(TEST|PRODUCTION)}`.
Adapters to build now: `ManualSimulatorAdapter`, `DatasetImportAdapter` (CSV/JSON with documented schema + sample files), `GenericIngestAdapter` (authenticated `POST /api/wearable/ingest` with per-device token — this is the contract a future companion app will use).
Adapters to build as **documented stubs, marked BLOCKED**: `HealthConnectAdapter`, `HealthKitAdapter`. State plainly: Health Connect/HealthKit are **on-device native APIs**; a web page cannot read them. Reading a watch requires a small native companion app (Android: Health Connect `HeartRateRecord`/`OxygenSaturationRecord` read permissions only) that POSTs to the ingest endpoint. Write `docs/WEARABLE_INTEGRATION.md` with the exact permissions and payload spec; do not claim connectivity.
Optional experimental `WebBluetoothHeartRateAdapter` (standard GATT Heart Rate service, Chrome on Android/desktop, HTTPS, user gesture). Works only for BLE devices that expose HR; label "experimental / device dependent" and test or leave disabled.
Device status UI: connected / last sync / stale / never connected — computed from real timestamps.

### Sensor Simulation Lab (`/simulation`, visible only when `MODE=TEST` or role=tester)
- Separate tables: `simulation_sessions`, `simulation_observations` — **never** the same table as `wearable_observations`. Dashboards query them through an explicit `environment` filter; real view cannot include sim rows (DB CHECK + test).
- Controls: manual entry (value, metric, timestamp picker), CSV/JSON upload + replay (speed control), inject **missing**, **delayed** (arrival after measurement by N min), **duplicate**, **spike**, **conflicting** (two sources, same time, different values), "trigger configured test event". `Reset Simulation`, `Clear Test History`.
- Every simulated record, alert, email, and UI card carries a persistent **TEST DATA** badge (text + icon).

### Validation & reliability engine (`services/reliability/`, pure + tested)
Order of checks, each emitting an explicit state and reason code; raw observation **always preserved** in `sensor_validation_events` and never mutated:
1. schema/type → invalid ⇒ quarantine (`PENDING_VERIFICATION`), not coerced
2. timestamp sanity (future, absurdly old) and freshness vs configurable max age ⇒ `STALE`
3. null/absent ⇒ `MISSING` (stored/displayed as "no reading", never 0)
4. duplicate (same device+metric+timestamp+value, or repeated-value flatline beyond configured window) ⇒ `DUPLICATE`
5. implausible per **configurable** rules table ⇒ `SUSPICIOUS`
6. two sources disagree beyond configured tolerance in a window ⇒ `CONFLICTING`
7. poor quality metadata ⇒ `PENDING_VERIFICATION` or `SUSPICIOUS`
8. else `VALID`
Only `VALID` readings count as reliable clinical observations. Everything else is shown with its state and reason, and may raise a **sensor-fault** notice, not a clinical alert.

### C10 facility-data reliability (official mapping — keep primary)
- New `facility_readings` (facility_id, metric e.g. bed availability / oxygen stock / OPD wait / equipment-operational flag, value, measured_at, source) feeding the **same reliability engine**.
- Demo page `/demo/c10`: seeded faulty reading (e.g., impossible bed count, stale timestamp, two sources disagreeing) → engine flags → UI shows **"Uncertain — verify with facility"** → creates a `human_verification_request` (queue UI, who/when resolved) → facility discovery **does not auto-recommend or auto-book** based on an unverified reading; it shows last-verified data with age.
- The wearable simulator is only a *secondary* demo of the same principles; docs and report must say C10 = facility operational data.

---

## 7. PHASE 5 — ALERT ENGINE, ESCALATION, NOTIFICATIONS

### Alert rules (`services/alerts/`, pure + tested)
- `alert_rules`: patient_id, metric, operator, threshold, unit, severity, persistence_count, persistence_window_s, min_quality, max_age_s, requires_consent flag, configured_by (clinician name/ID), approved_at, active, `is_test_rule`.
- **No built-in clinical thresholds.** Ship seed rules only as `is_test_rule=true`, labelled "TEST ONLY — not clinical guidance". Production rules require a configured_by/approved_at; engine refuses to evaluate unapproved rules in PRODUCTION.
- Evaluate only `VALID` readings; `persistence_count=1` rules fire immediately (serious events are never delayed waiting for repeats). Sensor faults → separate `SENSOR_FAULT` notice.
- Every `patient_alerts` row stores: rule id + snapshot of rule, triggering observation ids, validation state, environment, timestamps, status lifecycle (`OPEN → NOTIFIED → ACKNOWLEDGED → CLOSED`).
- Wording: never name a condition, never advise treatment/medication. Patient message: "A reading you configured an alert for was received. Please contact your doctor. If you feel unwell or unsafe, seek emergency help now." (translated, critical-key, approved.)

### Escalation flow (per confirmed alert)
1. Create alert record + audit event.
2. Urgent in-app banner/modal (TEST badge when simulated), persistent until acknowledged.
3. Enqueue doctor email into **outbox** (`notification_logs`: channel, recipient hash, template, language, environment, status `PENDING|SENT|FAILED|SKIPPED_NO_CONSENT`, provider message id, error, attempts, timestamps). Worker retries with backoff; failures are visible in UI and audit log.
4. "Call my doctor" button → confirmation dialog → `tel:` link with the verified number; log `CALL_INITIATED` (never "answered"). No claim of silent calling.
5. Separate "Call emergency services" action using `EMERGENCY_NUMBER` from env with `EMERGENCY_NUMBER_VERIFIED_BY/AT`; show a clear notice if unset. Do not hardcode.
6. Escalation history timeline per alert. UI text must never imply the doctor has read or will respond.

### Email provider (`services/notify/`)
- `EmailProvider` interface; implement **Gmail SMTP with App Password** first (fastest for testing) and **Gmail API OAuth** as the production-grade option; both read credentials from env/secret store only.
- Subject (TEST): `[MED44 TEST] Wearable Monitoring Alert`; PRODUCTION subject differs and never contains "TEST". Body: patient identifier (or approved test name), alert type, reading source, timestamp, data-quality state, simulated yes/no, signed dashboard link. **No raw readings dump, no attachments, no documents.** Minimal PHI.
- Dashboard link for the doctor: signed, expiring, read-only, alert-scoped token (no doctor account needed); page shows that alert + data-quality + TEST badge.
- Modes: `MED44_MODE=TEST|PRODUCTION` env. TEST: all emails go to `TEST_DOCTOR_EMAIL` regardless of linked doctor, subject-prefixed, body banner "SIMULATED — not a real emergency". PRODUCTION: sends only to a verified, consented, active doctor link; **refuses** to send if `is_test` is true or rule unapproved. A unit test must prove a test alert can't reach production sending.

---

## 8. PHASE 6 — HARDENING, DASHBOARD, DOCS, DEMO

- **Wearable Monitoring page:** latest readings (HR, SpO2) with source, timestamp, quality state; missing shown as "No reading"; trend chart (gaps rendered as gaps, state-coloured **plus** icons/labels); active alerts; alert history; device status; doctor contact status; notification delivery status; TEST/PRODUCTION indicator always visible. Add `recharts` (or similar) if charting is missing.
- Navigation entries for: My Documents, Prescriptions, Chat with Documents, Reminders, Wearable, Simulation Lab, Alerts, Doctor & Contacts, Language settings. Keep the design system; status never by colour alone.
- Security checklist: rate limits on auth/OTP/ocr/ingest; upload hardening; secure headers; CSP; HTTPS note; per-device tokens hashed at rest; `audit_events` for consent, link changes, alert, notification, export, delete; data-deletion endpoint for backend-held data (consents, alerts, notification logs, derived OCR metadata); no compliance claims (no "HIPAA compliant" etc.).
- Tests: extend pytest (validators, rules, TEST/PROD guard, authZ, OCR with fixtures, email outbox with a fake provider + one real send test gated by env) and add Playwright e2e for: upload→reload→OCR→attach→ask; language switch; simulator→alert→email outbox→call dialog; C08 + C10 demo pages. Existing 20 tests must stay green.
- Docs: update `README`, `docs/ARCHITECTURE.md`, add `docs/WEARABLE_INTEGRATION.md`, `docs/DEMO_SCRIPT.md` (exact click path), `docs/TEST_REPORT.md` (real results), `docs/LIMITATIONS.md`.
- Azure: not in scope until the above works. If added later, only as optional adapters (e.g., ACS for SMS/email, Key Vault), behind interfaces, never required.

---

## 9. DATABASE (Alembic migrations; UTC timestamps; FKs; indexes on patient_id + time)

New/extended tables: `doctor_contacts`, `doctor_patient_links`, `patient_consents`, `email_verifications`, `wearable_devices`, `sensor_sources`, `wearable_observations`, `sensor_validation_events`, `alert_rules`, `patient_alerts`, `notification_logs`, `simulation_sessions`, `simulation_observations`, `facility_readings`, `human_verification_requests`, `document_ocr_metadata` (no text, no files), `chatbot_document_contexts`, `patient_reminders`, `missing_translation_log`, `audit_events`. Extend existing `patients`, `doctors`, `prescriptions`, `patient_documents` (deprecate fake `file_url`/`ocr_extracted_text` columns via migration, don't drop data silently).

Rule: **real vs simulated** separation by table AND `environment` column with CHECK constraints.

---

## 10. ENV VARIABLES (document in `.env.example`, no real values)

```
MED44_MODE=TEST                 # TEST | PRODUCTION
SECRET_KEY=                     # required when MED44_MODE=PRODUCTION
ALLOWED_ORIGINS=http://localhost:5173
GROQ_API_KEY=
TEST_DOCTOR_EMAIL=
TEST_PATIENT_EMAIL=
EMAIL_PROVIDER=gmail_smtp       # gmail_smtp | gmail_api
GMAIL_SMTP_USER=
GMAIL_SMTP_APP_PASSWORD=
GMAIL_OAUTH_CLIENT_ID=
GMAIL_OAUTH_CLIENT_SECRET=
GMAIL_OAUTH_REFRESH_TOKEN=
PUBLIC_BASE_URL=http://localhost:5173
EMERGENCY_NUMBER=
EMERGENCY_NUMBER_VERIFIED_BY=
SMS_PROVIDER=                   # optional: twilio | acs
OCR_ENGINE=tesseract
TESSERACT_CMD=
OCR_MAX_FILE_MB=10
OCR_MAX_PAGES=10
OCR_TEMP_TTL_SECONDS=300
```

---

## 11. FINAL REPORT FORMAT (after each phase, brief; full at the end)

1. Files changed. 2. What works (REAL) / what is SIMULATED / what is BLOCKED and the exact credential or app I must provide. 3. Test results (paste real output). 4. Remaining limitations. 5. Click-by-click demo steps for the phase.

Do not claim: smartwatch connectivity, Health Connect/HealthKit access, Gmail delivery, automatic calling, OCR accuracy, offline support, or clinical validity, unless you tested it and can show the evidence.
