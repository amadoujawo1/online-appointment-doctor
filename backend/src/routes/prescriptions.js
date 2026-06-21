const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate, requireDoctor, requireRole } = require('../middleware/auth');

// ─── POST /api/prescriptions — Create prescription (doctor) ──────────────────
router.post('/', authenticate, requireDoctor, (req, res, next) => {
  try {
    const { appointment_id, patient_id, diagnosis, medications, instructions, valid_until } = req.body;
    if (!patient_id || !medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ success: false, message: 'patient_id and medications array are required' });
    }

    const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
    if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });

    const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patient_id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO prescriptions (id, appointment_id, doctor_id, patient_id, diagnosis, medications, instructions, valid_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, appointment_id || null, doctor.id, patient_id, diagnosis || null, JSON.stringify(medications), instructions || null, valid_until || null);

    // Create notification for patient
    const patientUser = db.prepare('SELECT u.id FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(patient_id);
    const doctorUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    if (patientUser) {
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, related_id)
        VALUES (?, ?, 'prescription', 'New Prescription', ?, ?)`)
        .run(uuidv4(), patientUser.id, `Dr. ${doctorUser?.name || 'Your doctor'} has issued a new prescription for you.`, id);
    }

    res.status(201).json({
      success: true,
      data: db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id),
      message: 'Prescription created successfully',
    });
  } catch (err) { next(err); }
});

// ─── GET /api/prescriptions — List prescriptions ─────────────────────────────
router.get('/', authenticate, (req, res, next) => {
  try {
    let sql, params;

    if (req.user.role === 'doctor') {
      const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
      if (!doctor) return res.json({ success: true, data: { prescriptions: [] } });
      sql = `
        SELECT p.*, u.name as patient_name, du.name as doctor_name,
          a.appointment_date, a.appointment_time
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.id
        JOIN users u ON pt.user_id = u.id
        JOIN doctors d ON p.doctor_id = d.id
        JOIN users du ON d.user_id = du.id
        LEFT JOIN appointments a ON p.appointment_id = a.id
        WHERE p.doctor_id = ?
        ORDER BY p.created_at DESC
      `;
      params = [doctor.id];
    } else if (req.user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
      if (!patient) return res.json({ success: true, data: { prescriptions: [] } });
      sql = `
        SELECT p.*, u.name as patient_name, du.name as doctor_name,
          a.appointment_date, a.appointment_time
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.id
        JOIN users u ON pt.user_id = u.id
        JOIN doctors d ON p.doctor_id = d.id
        JOIN users du ON d.user_id = du.id
        LEFT JOIN appointments a ON p.appointment_id = a.id
        WHERE p.patient_id = ?
        ORDER BY p.created_at DESC
      `;
      params = [patient.id];
    } else {
      // Admin - all prescriptions
      sql = `
        SELECT p.*, u.name as patient_name, du.name as doctor_name,
          a.appointment_date, a.appointment_time
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.id
        JOIN users u ON pt.user_id = u.id
        JOIN doctors d ON p.doctor_id = d.id
        JOIN users du ON d.user_id = du.id
        LEFT JOIN appointments a ON p.appointment_id = a.id
        ORDER BY p.created_at DESC LIMIT 100
      `;
      params = [];
    }

    const prescriptions = db.prepare(sql).all(...params);
    // Parse medications JSON
    prescriptions.forEach(p => {
      try { p.medications = JSON.parse(p.medications); } catch { p.medications = []; }
    });

    res.json({ success: true, data: { prescriptions } });
  } catch (err) { next(err); }
});

// ─── GET /api/prescriptions/:id — Get prescription detail ────────────────────
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const prescription = db.prepare(`
      SELECT p.*,
        u.name as patient_name, u.phone as patient_phone,
        du.name as doctor_name,
        s.name as specialty_name,
        d.qualification, d.license_number, d.clinic_name, d.clinic_address, d.clinic_city,
        f.name as facility_name, f.address as facility_address, f.phone as facility_phone,
        a.appointment_date, a.appointment_time
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      JOIN users u ON pt.user_id = u.id
      JOIN doctors d ON p.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      LEFT JOIN facilities f ON d.facility_id = f.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });

    // Access control
    if (req.user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
      if (!patient || patient.id !== prescription.patient_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
      if (!doctor || doctor.id !== prescription.doctor_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    try { prescription.medications = JSON.parse(prescription.medications); } catch { prescription.medications = []; }
    res.json({ success: true, data: prescription });
  } catch (err) { next(err); }
});

// ─── PATCH /api/prescriptions/:id/dispense — Mark as dispensed ───────────────
router.patch('/:id/dispense', authenticate, (req, res, next) => {
  try {
    const prescription = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });

    db.prepare("UPDATE prescriptions SET is_dispensed = 1, dispensed_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: 'Prescription marked as dispensed' });
  } catch (err) { next(err); }
});

module.exports = router;
