const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/admin/stats - Dashboard analytics
router.get('/stats', authenticate, requireAdmin, (req, res, next) => {
  try {
    const totalPatients = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'patient' AND is_active = 1").get().n;
    const totalDoctors = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'doctor' AND is_active = 1").get().n;
    const totalReceptionists = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'receptionist' AND is_active = 1").get().n;
    const totalFacilities = db.prepare('SELECT COUNT(*) as n FROM facilities').get().n;
    const verifiedDoctors = db.prepare('SELECT COUNT(*) as n FROM doctors WHERE is_verified = 1').get().n;
    const pendingDoctors = db.prepare('SELECT COUNT(*) as n FROM doctors WHERE is_verified = 0').get().n;
    const totalAppointments = db.prepare('SELECT COUNT(*) as n FROM appointments').get().n;
    const todayAppointments = db.prepare("SELECT COUNT(*) as n FROM appointments WHERE appointment_date = date('now')").get().n;
    const completedAppointments = db.prepare("SELECT COUNT(*) as n FROM appointments WHERE status = 'completed'").get().n;
    const cancelledAppointments = db.prepare("SELECT COUNT(*) as n FROM appointments WHERE status = 'cancelled'").get().n;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(fee), 0) as total FROM appointments WHERE status = 'completed'").get().total;
    const avgRating = db.prepare('SELECT ROUND(AVG(rating), 1) as avg FROM reviews').get().avg || 0;
    const totalReviews = db.prepare('SELECT COUNT(*) as n FROM reviews').get().n;

    // Monthly appointment trend (last 6 months)
    const monthlyTrend = db.prepare(`
      SELECT strftime('%Y-%m', appointment_date) as month, COUNT(*) as count
      FROM appointments
      WHERE appointment_date >= date('now', '-6 months')
      GROUP BY month ORDER BY month
    `).all();

    // Top specialties
    const topSpecialties = db.prepare(`
      SELECT s.name, COUNT(a.id) as appointment_count
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN specialties s ON d.specialty_id = s.id
      GROUP BY s.id ORDER BY appointment_count DESC LIMIT 5
    `).all();

    // Top doctors
    const topDoctors = db.prepare(`
      SELECT u.name, d.rating, d.total_reviews, s.name as specialty,
        COUNT(a.id) as appointments
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      LEFT JOIN appointments a ON a.doctor_id = d.id
      WHERE d.is_verified = 1
      GROUP BY d.id ORDER BY d.rating DESC LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        overview: {
          totalPatients, totalDoctors, totalReceptionists, totalFacilities, verifiedDoctors, pendingDoctors,
          totalAppointments, todayAppointments, completedAppointments,
          cancelledAppointments, totalRevenue, currency: 'GMD', avgRating, totalReviews,
        },
        monthlyTrend,
        topSpecialties,
        topDoctors,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get('/users', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    let query = 'SELECT id, email, role, name, phone, avatar, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    if (role) { query += ' AND role = ?'; params.push(role); }
    if (search) { query += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY created_at DESC';
    const total = db.prepare(`SELECT COUNT(*) as n FROM (${query}) s`).get(params).n;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const users = db.prepare(query).all(params);
    res.json({ success: true, data: { users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/status - Activate/deactivate user
router.patch('/users/:id/status', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { is_active } = req.body;
    db.prepare('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(is_active ? 1 : 0, req.params.id);
    res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'}` });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/doctors - All doctors with verification status
router.get('/doctors', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { verified, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT d.*, u.name, u.email, u.phone, u.avatar, u.is_active, u.created_at,
        s.name as specialty_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (verified !== undefined) { query += ' AND d.is_verified = ?'; params.push(verified === 'true' ? 1 : 0); }
    query += ' ORDER BY d.created_at DESC';
    const total = db.prepare(`SELECT COUNT(*) as n FROM (${query}) s`).get(params).n;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const doctors = db.prepare(query).all(params);
    res.json({ success: true, data: { doctors, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/doctors/:id/verify
router.patch('/doctors/:id/verify', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { is_verified } = req.body;
    db.prepare('UPDATE doctors SET is_verified = ? WHERE id = ?').run(is_verified ? 1 : 0, req.params.id);

    if (is_verified) {
      const doctor = db.prepare('SELECT user_id FROM doctors WHERE id = ?').get(req.params.id);
      if (doctor) {
        db.prepare('INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)')
          .run(uuidv4(), doctor.user_id, 'verification', 'Profile Verified!',
            'Congratulations! Your doctor profile has been verified. Patients can now book appointments with you.');
      }
    }
    res.json({ success: true, message: `Doctor ${is_verified ? 'verified' : 'unverified'}` });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/specialties
router.get('/specialties', authenticate, requireAdmin, (req, res, next) => {
  try {
    const specialties = db.prepare('SELECT * FROM specialties ORDER BY name').all();
    res.json({ success: true, data: specialties });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/specialties
router.post('/specialties', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const id = uuidv4();
    db.prepare('INSERT INTO specialties (id, name, description, icon) VALUES (?, ?, ?, ?)').run(id, name, description || null, icon || null);
    const specialty = db.prepare('SELECT * FROM specialties WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: specialty });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/specialties/:id
router.put('/specialties/:id', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { name, description, icon } = req.body;
    db.prepare('UPDATE specialties SET name = COALESCE(?, name), description = COALESCE(?, description), icon = COALESCE(?, icon) WHERE id = ?')
      .run(name || null, description || null, icon || null, req.params.id);
    const specialty = db.prepare('SELECT * FROM specialties WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: specialty });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/specialties/:id
router.delete('/specialties/:id', authenticate, requireAdmin, (req, res, next) => {
  try {
    db.prepare('DELETE FROM specialties WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Specialty deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/appointments
router.get('/appointments', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT a.*, pu.name as patient_name, du.name as doctor_name, s.name as specialty_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id JOIN users pu ON p.user_id = pu.id
      JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND a.status = ?'; params.push(status); }
    query += ' ORDER BY a.appointment_date DESC';
    const total = db.prepare(`SELECT COUNT(*) as n FROM (${query}) s`).get(params).n;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const appointments = db.prepare(query).all(params);
    res.json({ success: true, data: { appointments, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-logs - paginated list of audit actions
router.get('/audit-logs', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, user_id } = req.query;
    let query = `
      SELECT al.*, u.name as user_name, u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action) { query += ' AND al.action = ?'; params.push(action); }
    if (user_id) { query += ' AND al.user_id = ?'; params.push(user_id); }

    query += ' ORDER BY al.created_at DESC';

    const total = db.prepare(`SELECT COUNT(*) as n FROM (${query}) s`).get(params).n;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const logs = db.prepare(query).all(params);
    res.json({ success: true, data: { logs, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/broadcasts - view broadcasts
router.get('/broadcasts', authenticate, requireAdmin, (req, res, next) => {
  try {
    const broadcasts = db.prepare(`
      SELECT bn.*, u.name as sender_name
      FROM broadcast_notifications bn
      JOIN users u ON bn.created_by = u.id
      ORDER BY bn.created_at DESC
    `).all();
    res.json({ success: true, data: broadcasts });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/broadcasts - send broadcast
router.post('/broadcasts', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { title, message, target_role, expires_at } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO broadcast_notifications (id, title, message, target_role, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, message, target_role || 'all', req.user.id, expires_at || null);

    // Create notifications for all matching active users
    let userSql = 'SELECT id FROM users WHERE is_active = 1';
    const params = [];
    if (target_role && target_role !== 'all') {
      userSql += ' AND role = ?';
      params.push(target_role);
    }

    const users = db.prepare(userSql).all(...params);
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, related_id)
      VALUES (?, ?, 'broadcast', ?, ?, ?)
    `);

    db.transaction(() => {
      for (const u of users) {
        insertNotif.run(uuidv4(), u.id, title, message, id);
      }
    })();

    res.status(201).json({
      success: true,
      message: `Broadcast sent successfully to ${users.length} users`,
      data: db.prepare('SELECT * FROM broadcast_notifications WHERE id = ?').get(id)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

