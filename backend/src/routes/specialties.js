const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET /api/specialties - Public endpoint
router.get('/', (req, res, next) => {
  try {
    const specialties = db.prepare(`
      SELECT s.*, COUNT(d.id) as doctor_count
      FROM specialties s
      LEFT JOIN doctors d ON d.specialty_id = s.id AND d.is_verified = 1
      GROUP BY s.id
      ORDER BY s.name
    `).all();
    res.json({ success: true, data: specialties });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
