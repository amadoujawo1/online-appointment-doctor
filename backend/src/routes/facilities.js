const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// File upload config for facility logos
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `facility-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 2 * 1024 * 1024 } });

// ─── GET /api/facilities — Search facilities (public) ─────────────────────────
router.get('/', (req, res, next) => {
  try {
    const { type, city, region, search, verified } = req.query;
    let sql = `
      SELECT f.*,
        COUNT(DISTINCT fs.user_id) FILTER (WHERE fs.staff_role IN ('doctor','head_doctor') AND fs.is_active = 1) as doctor_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.appointment_date = date('now')) as today_appointments
      FROM facilities f
      LEFT JOIN facility_staff fs ON f.id = fs.facility_id
      LEFT JOIN doctors d ON fs.user_id = d.user_id
      LEFT JOIN appointments a ON d.id = a.doctor_id
      WHERE 1=1
    `;
    const params = [];
    if (type) { sql += ' AND f.type = ?'; params.push(type); }
    if (city) { sql += ' AND f.city LIKE ?'; params.push(`%${city}%`); }
    if (region) { sql += ' AND f.region LIKE ?'; params.push(`%${region}%`); }
    if (search) { sql += ' AND (f.name LIKE ? OR f.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (verified === 'true') { sql += ' AND f.is_verified = 1'; }
    sql += ' GROUP BY f.id ORDER BY f.name ASC';

    const facilities = db.prepare(sql).all(...params);
    res.json({ success: true, data: { facilities } });
  } catch (err) { next(err); }
});

// ─── POST /api/facilities — Create facility (admin) ───────────────────────────
router.post('/', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { name, type, address, city, region, phone, email, license_number, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Facility name is required' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO facilities (id, name, type, address, city, region, phone, email, license_number, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type || 'clinic', address || null, city || null, region || null, phone || null, email || null, license_number || null, description || null);
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM facilities WHERE id = ?').get(id) });
  } catch (err) { next(err); }
});

// ─── GET /api/facilities/:id — Facility profile ───────────────────────────────
router.get('/:id', (req, res, next) => {
  try {
    const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });

    const staff = db.prepare(`
      SELECT fs.staff_role, u.id as user_id, u.name, u.avatar,
        d.id as doctor_id, d.qualification, d.consultation_fee, d.rating, d.total_reviews,
        s.name as specialty_name, s.icon as specialty_icon
      FROM facility_staff fs
      JOIN users u ON fs.user_id = u.id
      LEFT JOIN doctors d ON u.id = d.user_id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE fs.facility_id = ? AND fs.is_active = 1
    `).all(req.params.id);

    res.json({ success: true, data: { facility, staff } });
  } catch (err) { next(err); }
});

// ─── PUT /api/facilities/:id — Update facility ────────────────────────────────
router.put('/:id', authenticate, requireAdmin, uploadLogo.single('logo'), (req, res, next) => {
  try {
    const { name, type, address, city, region, phone, email, license_number, description, is_verified } = req.body;
    const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });

    const logo = req.file ? `/uploads/logos/${req.file.filename}` : facility.logo;
    db.prepare(`
      UPDATE facilities SET name=?, type=?, address=?, city=?, region=?, phone=?, email=?,
        license_number=?, description=?, logo=?, is_verified=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      name || facility.name, type || facility.type, address || facility.address,
      city || facility.city, region || facility.region, phone || facility.phone,
      email || facility.email, license_number || facility.license_number,
      description || facility.description, logo,
      is_verified !== undefined ? (is_verified ? 1 : 0) : facility.is_verified,
      req.params.id
    );
    res.json({ success: true, data: db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id) });
  } catch (err) { next(err); }
});

// ─── POST /api/facilities/:id/staff — Add staff member ───────────────────────
router.post('/:id/staff', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { user_id, staff_role } = req.body;
    const facility = db.prepare('SELECT id FROM facilities WHERE id = ?').get(req.params.id);
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const existing = db.prepare('SELECT id FROM facility_staff WHERE facility_id = ? AND user_id = ?').get(req.params.id, user_id);
    if (existing) {
      db.prepare('UPDATE facility_staff SET staff_role=?, is_active=1 WHERE facility_id=? AND user_id=?').run(staff_role || 'doctor', req.params.id, user_id);
    } else {
      db.prepare('INSERT INTO facility_staff (id, facility_id, user_id, staff_role) VALUES (?, ?, ?, ?)').run(uuidv4(), req.params.id, user_id, staff_role || 'doctor');
    }

    // Update doctor's primary facility
    if (user.role === 'doctor') {
      const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(user_id);
      if (doctor) db.prepare('UPDATE doctors SET facility_id = ? WHERE id = ?').run(req.params.id, doctor.id);
    }

    res.json({ success: true, message: 'Staff member added to facility' });
  } catch (err) { next(err); }
});

// ─── DELETE /api/facilities/:id/staff/:userId — Remove staff ─────────────────
router.delete('/:id/staff/:userId', authenticate, requireAdmin, (req, res, next) => {
  try {
    db.prepare('UPDATE facility_staff SET is_active = 0 WHERE facility_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
    res.json({ success: true, message: 'Staff member removed from facility' });
  } catch (err) { next(err); }
});

// ─── GET /api/facilities/:id/reports — Revenue & appointment reports ──────────
router.get('/:id/reports', authenticate, (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const from = start_date || new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0];
    const to = end_date || new Date().toISOString().split('T')[0];

    const totalAppointments = db.prepare(`
      SELECT COUNT(*) as n FROM appointments WHERE facility_id = ? AND appointment_date BETWEEN ? AND ?
    `).get(req.params.id, from, to).n;

    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM appointments
      WHERE facility_id = ? AND appointment_date BETWEEN ? AND ?
      GROUP BY status
    `).all(req.params.id, from, to);

    const revenue = db.prepare(`
      SELECT COALESCE(SUM(p.amount), 0) as total, p.method, COUNT(*) as count
      FROM payments p
      JOIN appointments a ON p.appointment_id = a.id
      WHERE a.facility_id = ? AND a.appointment_date BETWEEN ? AND ? AND p.status = 'completed'
      GROUP BY p.method
    `).all(req.params.id, from, to);

    const totalRevenue = revenue.reduce((s, r) => s + r.total, 0);

    const walkIns = db.prepare(`
      SELECT COUNT(*) as n FROM queue WHERE facility_id = ? AND appointment_date BETWEEN ? AND ?
    `).get(req.params.id, from, to).n;

    const byDoctor = db.prepare(`
      SELECT u.name as doctor_name, COUNT(a.id) as appointments,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status='completed'), 0) as revenue
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN payments p ON a.id = p.appointment_id
      WHERE a.facility_id = ? AND a.appointment_date BETWEEN ? AND ?
      GROUP BY d.id ORDER BY appointments DESC
    `).all(req.params.id, from, to);

    res.json({
      success: true,
      data: {
        period: { from, to },
        totalAppointments, totalRevenue, walkIns,
        byStatus, revenue, byDoctor,
        currency: 'GMD',
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
