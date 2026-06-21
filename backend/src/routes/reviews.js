const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate, requirePatient } = require('../middleware/auth');

// POST /api/reviews - Submit review
router.post('/', authenticate, requirePatient, (req, res, next) => {
  try {
    const { appointment_id, rating, comment } = req.body;
    if (!appointment_id || !rating) {
      return res.status(400).json({ success: false, message: 'Appointment ID and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ? AND patient_id = ?').get(appointment_id, patient.id);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appointment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only review completed appointments' });
    }

    const existing = db.prepare('SELECT id FROM reviews WHERE appointment_id = ?').get(appointment_id);
    if (existing) return res.status(409).json({ success: false, message: 'Review already submitted' });

    const reviewId = uuidv4();
    db.prepare('INSERT INTO reviews (id, appointment_id, patient_id, doctor_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)')
      .run(reviewId, appointment_id, patient.id, appointment.doctor_id, parseInt(rating), comment || null);

    // Update doctor rating
    const stats = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE doctor_id = ?').get(appointment.doctor_id);
    db.prepare('UPDATE doctors SET rating = ?, total_reviews = ? WHERE id = ?')
      .run(Math.round(stats.avg_rating * 10) / 10, stats.total, appointment.doctor_id);

    // Notify doctor
    const doctorUser = db.prepare('SELECT user_id FROM doctors WHERE id = ?').get(appointment.doctor_id);
    db.prepare('INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), doctorUser.user_id, 'review', 'New Patient Review', `${req.user.name} left you a ${rating}-star review`, reviewId);

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
    res.status(201).json({ success: true, message: 'Review submitted', data: review });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/doctor/:id - Get reviews for a doctor
router.get('/doctor/:id', (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const total = db.prepare('SELECT COUNT(*) as n FROM reviews WHERE doctor_id = ?').get(req.params.id).n;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const reviews = db.prepare(`
      SELECT r.*, u.name as patient_name, u.avatar as patient_avatar
      FROM reviews r
      JOIN patients p ON r.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE r.doctor_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.id, parseInt(limit), offset);

    res.json({ success: true, data: { reviews, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
