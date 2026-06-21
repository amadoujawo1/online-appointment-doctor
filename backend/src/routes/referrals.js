const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate, requireDoctor } = require('../middleware/auth');

// ─── POST /api/referrals — Create referral (doctor) ──────────────────────────
router.post('/', authenticate, requireDoctor, (req, res, next) => {
  try {
    const { patient_id, to_doctor_id, to_specialty_id, appointment_id, reason, urgency, notes } = req.body;
    if (!patient_id || !reason) {
      return res.status(400).json({ success: false, message: 'patient_id and reason are required' });
    }

    const fromDoctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
    if (!fromDoctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });
    if (!to_doctor_id && !to_specialty_id) {
      return res.status(400).json({ success: false, message: 'Provide either to_doctor_id or to_specialty_id' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO referrals (id, from_doctor_id, to_doctor_id, to_specialty_id, patient_id, appointment_id, reason, urgency, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, fromDoctor.id, to_doctor_id || null, to_specialty_id || null, patient_id, appointment_id || null, reason, urgency || 'routine', notes || null);

    // Notify receiving doctor if specified
    if (to_doctor_id) {
      const toDocUser = db.prepare('SELECT u.id FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?').get(to_doctor_id);
      const fromDocUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
      const patientUser = db.prepare('SELECT u.name FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(patient_id);
      if (toDocUser) {
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?, ?, 'referral', 'New Patient Referral', ?, ?)`)
          .run(uuidv4(), toDocUser.id, `Dr. ${fromDocUser?.name || 'A colleague'} has referred ${patientUser?.name || 'a patient'} to you (${urgency} urgency).`, id);
      }
    }

    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM referrals WHERE id = ?').get(id), message: 'Referral created' });
  } catch (err) { next(err); }
});

// ─── GET /api/referrals — List referrals ─────────────────────────────────────
router.get('/', authenticate, (req, res, next) => {
  try {
    let sql, params;
    const baseSelect = `
      SELECT r.*,
        fu.name as from_doctor_name, tu.name as to_doctor_name,
        pu.name as patient_name,
        s.name as to_specialty_name
      FROM referrals r
      JOIN doctors fd ON r.from_doctor_id = fd.id
      JOIN users fu ON fd.user_id = fu.id
      LEFT JOIN doctors td ON r.to_doctor_id = td.id
      LEFT JOIN users tu ON td.user_id = tu.id
      JOIN patients p ON r.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      LEFT JOIN specialties s ON r.to_specialty_id = s.id
    `;

    if (req.user.role === 'doctor') {
      const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
      if (!doctor) return res.json({ success: true, data: { sent: [], received: [] } });
      const sent = db.prepare(`${baseSelect} WHERE r.from_doctor_id = ? ORDER BY r.created_at DESC`).all(doctor.id);
      const received = db.prepare(`${baseSelect} WHERE r.to_doctor_id = ? ORDER BY r.created_at DESC`).all(doctor.id);
      return res.json({ success: true, data: { sent, received } });
    } else if (req.user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
      if (!patient) return res.json({ success: true, data: { referrals: [] } });
      const referrals = db.prepare(`${baseSelect} WHERE r.patient_id = ? ORDER BY r.created_at DESC`).all(patient.id);
      return res.json({ success: true, data: { referrals } });
    } else {
      // Admin
      const referrals = db.prepare(`${baseSelect} ORDER BY r.created_at DESC LIMIT 100`).all();
      return res.json({ success: true, data: { referrals } });
    }
  } catch (err) { next(err); }
});

// ─── GET /api/referrals/:id — Referral detail ────────────────────────────────
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const referral = db.prepare(`
      SELECT r.*,
        fu.name as from_doctor_name, fd.qualification as from_doctor_qual,
        tu.name as to_doctor_name, td.qualification as to_doctor_qual, td.clinic_name as to_clinic,
        pu.name as patient_name, pu.phone as patient_phone,
        s.name as to_specialty_name
      FROM referrals r
      JOIN doctors fd ON r.from_doctor_id = fd.id
      JOIN users fu ON fd.user_id = fu.id
      LEFT JOIN doctors td ON r.to_doctor_id = td.id
      LEFT JOIN users tu ON td.user_id = tu.id
      JOIN patients p ON r.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      LEFT JOIN specialties s ON r.to_specialty_id = s.id
      WHERE r.id = ?
    `).get(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: 'Referral not found' });
    res.json({ success: true, data: referral });
  } catch (err) { next(err); }
});

// ─── PATCH /api/referrals/:id/accept — Accept referral ───────────────────────
router.patch('/:id/accept', authenticate, requireDoctor, (req, res, next) => {
  try {
    const referral = db.prepare('SELECT * FROM referrals WHERE id = ?').get(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: 'Referral not found' });
    const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
    if (!doctor || doctor.id !== referral.to_doctor_id) {
      return res.status(403).json({ success: false, message: 'Only the receiving doctor can accept this referral' });
    }
    db.prepare("UPDATE referrals SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: 'Referral accepted' });
  } catch (err) { next(err); }
});

// ─── PATCH /api/referrals/:id/complete — Complete referral ───────────────────
router.patch('/:id/complete', authenticate, requireDoctor, (req, res, next) => {
  try {
    const { notes } = req.body;
    db.prepare("UPDATE referrals SET status = 'completed', notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes || null, req.params.id);
    res.json({ success: true, message: 'Referral marked as completed' });
  } catch (err) { next(err); }
});

// ─── PATCH /api/referrals/:id/decline — Decline referral ─────────────────────
router.patch('/:id/decline', authenticate, requireDoctor, (req, res, next) => {
  try {
    const { notes } = req.body;
    db.prepare("UPDATE referrals SET status = 'declined', notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes || null, req.params.id);
    res.json({ success: true, message: 'Referral declined' });
  } catch (err) { next(err); }
});

module.exports = router;
