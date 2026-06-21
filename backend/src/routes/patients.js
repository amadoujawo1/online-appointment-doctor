const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate, requirePatient, requireAdmin } = require('../middleware/auth');

// GET /api/patients/me - Get my patient profile
router.get('/me', authenticate, requirePatient, (req, res, next) => {
  try {
    const patient = db.prepare(`
      SELECT p.*, u.name, u.email, u.phone, u.avatar
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `).get(req.user.id);

    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
});

// PUT /api/patients/me - Update patient profile
router.put('/me', authenticate, requirePatient, (req, res, next) => {
  try {
    const {
      date_of_birth, gender, blood_group,
      id_type, national_id, passport_number,
      address, village, district, region,
      medical_history, allergies, current_medications,
      emergency_contact_name, emergency_contact_phone,
      name, phone,
    } = req.body;

    db.transaction(() => {
      db.prepare(`
        UPDATE patients SET
          date_of_birth = COALESCE(?, date_of_birth),
          gender = COALESCE(?, gender),
          blood_group = COALESCE(?, blood_group),
          id_type = COALESCE(?, id_type),
          national_id = COALESCE(?, national_id),
          passport_number = COALESCE(?, passport_number),
          address = COALESCE(?, address),
          village = COALESCE(?, village),
          district = COALESCE(?, district),
          region = COALESCE(?, region),
          medical_history = COALESCE(?, medical_history),
          allergies = COALESCE(?, allergies),
          current_medications = COALESCE(?, current_medications),
          emergency_contact_name = COALESCE(?, emergency_contact_name),
          emergency_contact_phone = COALESCE(?, emergency_contact_phone),
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(
        date_of_birth || null, gender || null, blood_group || null,
        id_type || null, national_id || null, passport_number || null,
        address || null, village || null, district || null, region || null,
        medical_history || null, allergies || null, current_medications || null,
        emergency_contact_name || null, emergency_contact_phone || null,
        req.user.id
      );

      if (name || phone) {
        db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = datetime(\'now\') WHERE id = ?')
          .run(name || null, phone || null, req.user.id);
      }
    })();

    const updated = db.prepare(`
      SELECT p.*, u.name, u.email, u.phone, u.avatar
      FROM patients p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?
    `).get(req.user.id);

    res.json({ success: true, message: 'Profile updated', data: updated });
  } catch (err) {
    next(err);
  }
});


// GET /api/patients/:id - Get patient by ID (admin or doctor with appointment)
router.get('/:id', authenticate, (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const patient = db.prepare(`
      SELECT p.id, p.date_of_birth, p.gender, p.blood_group, p.address, p.medical_history,
             p.allergies, p.current_medications, u.name, u.email, u.phone, u.avatar
      FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?
    `).get(req.params.id);

    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
