# Med44 — Codebase Audit V2
_Generated: 2026-11-06_

## 1. Backend Status
| Item | Status |
|------|--------|
| JWT auth (bcrypt + python-jose) | REAL |
| Offline clinical engine (EN/HI/TA) | REAL |
| Safety engine | REAL |
| Groq agent + LangGraph | REAL (needs GROQ_API_KEY) |
| Appointments / Facilities / Journey / Progress / Support | REAL |
| OCR | **SIMULATED** — `raw_ocr_simulation` canned text |
| Document file storage | **FAKE** — `file_url` defaults to `/sample_prescription.jpg` |
| Multipart upload | **MISSING** — JSON only |
| CORS | BROKEN — `allow_origins=["*"]` with `allow_credentials=True` |
| Dual router mount (`/api` + root) | **BUG** — every route served twice |
| JWT refresh | **MISSING** — 30 min hard expire, no 401 handling |
| Alembic | **MISSING** — raw `create_all` + hand-rolled ALTER TABLE migration |
| i18n | **MISSING** — no i18next, strings hardcoded |
| Wearable | **MISSING** |
| Alert engine | **MISSING** |
| Doctor link | **MISSING** |
| Email notifications | **MISSING** |
| Dexie / IndexedDB | **MISSING** |
| C08 / C10 demos | **MISSING** |
| `sw.js` localStorage in SW | **BUG** — localStorage unavailable in service workers |

## 2. Frontend Status
| Item | Status |
|------|--------|
| React 18 + Vite + TS + Tailwind | REAL |
| Zustand stores (auth, chat, med, appt) | REAL |
| Design system (green/pink) | REAL |
| All pages render | REAL (minor layout bugs) |
| nudgeStore.ts | Partially implemented (created last session, not wired up) |
| Dexie / OPFS doc storage | MISSING |
| i18next | MISSING |
| Document-aware chat | MISSING |

## 3. Phase 0 Fixes (critical, do first)
1. ✅ `.env` already in `.gitignore` — confirm not in git history
2. Fix CORS: restrict to `ALLOWED_ORIGINS` env var
3. Remove duplicate router mount (keep `/api` only)
4. Fix `sw.js` localStorage → use IndexedDB queue
5. Extend `.env.example` with all new env vars
6. Extend `config.py` with all new settings

## 4. Findings: Tesseract Binary
- Python `pytesseract` package: INSTALLED
- Tesseract binary: **NOT FOUND** on PATH
- PyMuPDF: INSTALLED (can extract PDF text layers)
- OpenCV: INSTALLED
- Pillow: INSTALLED
- Plan: OCR endpoint returns `OCR_UNAVAILABLE` with instructions when Tesseract binary missing; PyMuPDF text-layer extraction works as fallback for text-layer PDFs

## 5. Test Results (baseline)
```
20 passed, 1 warning in 0.11s
```
All 20 tests green before any changes.

