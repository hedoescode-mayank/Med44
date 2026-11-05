-- Med44 Initial Schema (reference only - SQLAlchemy creates tables via ORM)
-- Version: 001

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    blood_group TEXT,
    allergies TEXT,
    language_pref TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS symptoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT,
    severity_weight REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS symptom_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symptom_id INTEGER NOT NULL REFERENCES symptoms(id),
    alias TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinical_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    symptoms_json TEXT NOT NULL,
    action TEXT NOT NULL,
    urgency_level TEXT DEFAULT 'GREEN',
    source TEXT,
    version TEXT DEFAULT '1.0',
    review_status TEXT DEFAULT 'PENDING',
    reviewer TEXT,
    review_date DATETIME,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS red_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    urgency TEXT DEFAULT 'HIGH',
    action TEXT NOT NULL,
    source TEXT
);

CREATE TABLE IF NOT EXISTS followup_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symptom_id INTEGER NOT NULL REFERENCES symptoms(id),
    question_en TEXT NOT NULL,
    question_hi TEXT,
    question_ta TEXT,
    field_name TEXT NOT NULL,
    is_required INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS health_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    source TEXT,
    version TEXT DEFAULT '1.0',
    review_status TEXT DEFAULT 'PENDING',
    reviewer TEXT,
    review_date DATETIME
);

CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    generic_name TEXT,
    category TEXT,
    description TEXT,
    side_effects TEXT,
    contraindications TEXT,
    source TEXT
);

CREATE TABLE IF NOT EXISTS drug_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drug1_id INTEGER NOT NULL REFERENCES medications(id),
    drug2_id INTEGER NOT NULL REFERENCES medications(id),
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT
);

CREATE TABLE IF NOT EXISTS medical_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    condition TEXT NOT NULL,
    diagnosed_date DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    medication_id INTEGER NOT NULL REFERENCES medications(id),
    dosage TEXT,
    frequency TEXT,
    start_date DATETIME,
    end_date DATETIME,
    prescriber TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    doctor_name TEXT NOT NULL,
    specialty TEXT,
    appointment_date DATETIME NOT NULL,
    slot_time TEXT,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    is_synced INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    mode TEXT DEFAULT 'offline',
    language TEXT DEFAULT 'en',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER REFERENCES patients(id),
    action TEXT NOT NULL,
    details_json TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    rating REAL DEFAULT 4.0,
    hospital TEXT,
    location TEXT,
    available_slots_json TEXT,
    is_active INTEGER DEFAULT 1
);

