const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/doctor_appointment.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    -- Users base table (role includes receptionist for Gambia)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'admin', 'receptionist')),
      name TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Specialties
    CREATE TABLE IF NOT EXISTS specialties (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Facilities (clinics, hospitals, health centres)
    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'clinic' CHECK(type IN ('clinic','hospital','health_centre','pharmacy')),
      address TEXT,
      city TEXT,
      region TEXT,
      phone TEXT,
      email TEXT,
      license_number TEXT,
      description TEXT,
      logo TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Facility staff (doctors and receptionists under a facility)
    CREATE TABLE IF NOT EXISTS facility_staff (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      staff_role TEXT NOT NULL DEFAULT 'doctor' CHECK(staff_role IN ('doctor','receptionist','head_doctor')),
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(facility_id, user_id)
    );

    -- Doctors
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      specialty_id TEXT,
      facility_id TEXT,
      qualification TEXT,
      license_number TEXT,
      experience_years INTEGER DEFAULT 0,
      clinic_name TEXT,
      clinic_address TEXT,
      clinic_city TEXT,
      clinic_lat REAL,
      clinic_lng REAL,
      consultation_fee REAL DEFAULT 0,
      bio TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      rating REAL DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    );

    -- Patients (with Gambia-specific identity and location fields)
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      date_of_birth TEXT,
      gender TEXT CHECK(gender IN ('male', 'female', 'other')),
      blood_group TEXT,
      id_type TEXT DEFAULT 'none' CHECK(id_type IN ('national_id','passport','voter_id','none')),
      national_id TEXT,
      passport_number TEXT,
      address TEXT,
      village TEXT,
      district TEXT,
      region TEXT,
      medical_history TEXT,
      allergies TEXT,
      current_medications TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Doctor availability
    CREATE TABLE IF NOT EXISTS availability (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      UNIQUE(doctor_id, day_of_week)
    );

    -- Appointments (with teleconsult + facility + GMD support)
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      facility_id TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      appointment_type TEXT NOT NULL DEFAULT 'in_person' CHECK(appointment_type IN ('in_person','teleconsult','walk_in')),
      teleconsult_link TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed','rescheduled')),
      reason TEXT,
      notes TEXT,
      fee REAL,
      currency TEXT DEFAULT 'GMD',
      cancellation_reason TEXT,
      payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','pending','paid','refunded')),
      queue_position INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    );

    -- Walk-in Queue Management
    CREATE TABLE IF NOT EXISTS queue (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL,
      doctor_id TEXT,
      patient_id TEXT,
      patient_name TEXT NOT NULL,
      patient_phone TEXT,
      ticket_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','called','served','skipped','cancelled')),
      reason TEXT,
      arrival_time TEXT NOT NULL DEFAULT (datetime('now')),
      called_time TEXT,
      served_time TEXT,
      notes TEXT,
      appointment_date TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Electronic Prescriptions
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      appointment_id TEXT,
      doctor_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      diagnosis TEXT,
      medications TEXT NOT NULL DEFAULT '[]',
      instructions TEXT,
      is_dispensed INTEGER NOT NULL DEFAULT 0,
      dispensed_at TEXT,
      valid_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    -- Doctor-to-Doctor Referrals
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      from_doctor_id TEXT NOT NULL,
      to_doctor_id TEXT,
      to_specialty_id TEXT,
      patient_id TEXT NOT NULL,
      appointment_id TEXT,
      reason TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'routine' CHECK(urgency IN ('routine','urgent','emergency')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','completed','declined')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (from_doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (to_doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (to_specialty_id) REFERENCES specialties(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );

    -- Medical Documents (patient file uploads)
    CREATE TABLE IF NOT EXISTS medical_documents (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      appointment_id TEXT,
      document_type TEXT NOT NULL DEFAULT 'other' CHECK(document_type IN ('lab_result','prescription','report','xray','scan','vaccination','other')),
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );

    -- Payments (GMD, mobile money, bank transfer, cash)
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      appointment_id TEXT,
      patient_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GMD',
      method TEXT NOT NULL CHECK(method IN ('mobile_money','bank_transfer','cash','insurance')),
      provider TEXT DEFAULT 'cash' CHECK(provider IN ('afrimoney','qmoney','gtbank','ecobank','trust_bank','cash','insurance','other')),
      mobile_number TEXT,
      account_name TEXT,
      transaction_reference TEXT,
      receipt_number TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed','refunded')),
      paid_at TEXT,
      notes TEXT,
      confirmed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    -- Audit Logs (immutable system trail)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Broadcast Notifications (admin system-wide alerts)
    CREATE TABLE IF NOT EXISTS broadcast_notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_role TEXT NOT NULL DEFAULT 'all' CHECK(target_role IN ('all','patient','doctor','receptionist','admin')),
      created_by TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Reviews
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL UNIQUE,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      related_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Refresh tokens
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Core indexes (columns guaranteed to exist on all DB versions)
    CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty_id);
    CREATE INDEX IF NOT EXISTS idx_doctors_city ON doctors(clinic_city);
    CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_doctor ON reviews(doctor_id);
  `);

  // Run migrations: safely add any columns that may be missing from existing DBs
  runMigrations();

  console.log('✅ Database initialized successfully');
}

function runMigrations() {
  // Helper: check if a column exists in a table
  function hasColumn(table, column) {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    return info.some(col => col.name === column);
  }

  // Helper: check if a table exists
  function hasTable(table) {
    return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  }

  // --- doctors table ---
  if (hasTable('doctors') && !hasColumn('doctors', 'facility_id')) {
    db.exec(`ALTER TABLE doctors ADD COLUMN facility_id TEXT REFERENCES facilities(id)`);
    console.log('Migration: doctors.facility_id added');
  }

  // --- appointments table ---
  if (hasTable('appointments')) {
    if (!hasColumn('appointments', 'facility_id')) {
      db.exec(`ALTER TABLE appointments ADD COLUMN facility_id TEXT REFERENCES facilities(id)`);
      console.log('Migration: appointments.facility_id added');
    }
    if (!hasColumn('appointments', 'appointment_type')) {
      db.exec(`ALTER TABLE appointments ADD COLUMN appointment_type TEXT NOT NULL DEFAULT 'in_person'`);
      console.log('Migration: appointments.appointment_type added');
    }
    if (!hasColumn('appointments', 'teleconsult_link')) {
      db.exec(`ALTER TABLE appointments ADD COLUMN teleconsult_link TEXT`);
      console.log('Migration: appointments.teleconsult_link added');
    }
    if (!hasColumn('appointments', 'currency')) {
      db.exec(`ALTER TABLE appointments ADD COLUMN currency TEXT DEFAULT 'GMD'`);
      console.log('Migration: appointments.currency added');
    }
    if (!hasColumn('appointments', 'payment_status')) {
      db.exec(`ALTER TABLE appointments ADD COLUMN payment_status TEXT DEFAULT 'unpaid'`);
      console.log('Migration: appointments.payment_status added');
    }
    if (!hasColumn('appointments', 'queue_position')) {
      db.exec(`ALTER TABLE appointments ADD COLUMN queue_position INTEGER`);
      console.log('Migration: appointments.queue_position added');
    }
  }

  // --- patients table ---
  if (hasTable('patients')) {
    const patientCols = ['id_type', 'national_id', 'passport_number', 'village', 'district', 'region', 'emergency_contact_name', 'emergency_contact_phone'];
    for (const col of patientCols) {
      if (!hasColumn('patients', col)) {
        const dflt = col === 'id_type' ? `TEXT DEFAULT 'none'` : `TEXT`;
        db.exec(`ALTER TABLE patients ADD COLUMN ${col} ${dflt}`);
        console.log(`Migration: patients.${col} added`);
      }
    }
  }

  // --- users table: receptionist role support ---
  // SQLite cannot modify CHECK constraints, but the role value is accepted as long as
  // we inserted it directly. No migration needed for the CHECK constraint itself.

  // --- Indexes that depend on migrated columns ---
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_doctors_facility ON doctors(facility_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_facility ON appointments(facility_id);
    CREATE INDEX IF NOT EXISTS idx_queue_facility ON queue(facility_id);
    CREATE INDEX IF NOT EXISTS idx_queue_date ON queue(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_from ON referrals(from_doctor_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
    CREATE INDEX IF NOT EXISTS idx_documents_patient ON medical_documents(patient_id);
  `);

  console.log('✅ Migrations complete');
}

module.exports = { db, initializeDatabase };
