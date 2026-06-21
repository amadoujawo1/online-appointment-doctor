const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate, requireDoctor, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage for doctor avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doctor-${req.user.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/doctors - Search & filter doctors
router.get('/', (req, res, next) => {
  try {
    const {
      specialty,
      city,
      min_fee,
      max_fee,
      min_rating,
      search,
      available_date,
      page = 1,
      limit = 12,
    } = req.query;

    let query = `
      SELECT 
        d.id, d.specialty_id, d.qualification, d.experience_years,
        d.clinic_name, d.clinic_address, d.clinic_city, d.consultation_fee,
        d.bio, d.is_verified, d.rating, d.total_reviews,
        u.name, u.avatar, u.email,
        s.name as specialty_name, s.icon as specialty_icon
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE u.is_active = 1 AND d.is_verified = 1
    `;
    const params = [];

    if (specialty) {
      query += ' AND (s.name LIKE ? OR s.id = ?)';
      params.push(`%${specialty}%`, specialty);
    }
    if (city) {
      query += ' AND d.clinic_city LIKE ?';
      params.push(`%${city}%`);
    }
    if (min_fee) {
      query += ' AND d.consultation_fee >= ?';
      params.push(parseFloat(min_fee));
    }
    if (max_fee) {
      query += ' AND d.consultation_fee <= ?';
      params.push(parseFloat(max_fee));
    }
    if (min_rating) {
      query += ' AND d.rating >= ?';
      params.push(parseFloat(min_rating));
    }
    if (search) {
      query += ' AND (u.name LIKE ? OR d.bio LIKE ? OR d.clinic_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filter by availability on a given date
    if (available_date) {
      const dayOfWeek = new Date(available_date).getDay();
      query += ` AND d.id IN (
        SELECT doctor_id FROM availability 
        WHERE day_of_week = ? AND is_active = 1
      )`;
      params.push(dayOfWeek);
    }

    query += ' ORDER BY d.rating DESC, d.total_reviews DESC';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) subq`;
    const { total } = db.prepare(countQuery).get(params);

    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const doctors = db.prepare(query).all(params);

    res.json({
      success: true,
      data: {
        doctors,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/me - Get current logged-in doctor's profile
router.get('/me', authenticate, requireDoctor, (req, res, next) => {
  try {
    const doctor = db.prepare(`
      SELECT 
        d.*, u.name, u.avatar, u.email, u.phone, u.created_at as member_since,
        s.name as specialty_name, s.description as specialty_description, s.icon as specialty_icon
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.user_id = ? AND u.is_active = 1
    `).get(req.user.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // Get availability
    const availability = db.prepare(`
      SELECT * FROM availability WHERE doctor_id = ? ORDER BY day_of_week
    `).all(doctor.id);

    // Get recent reviews
    const reviews = db.prepare(`
      SELECT r.*, u.name as patient_name, u.avatar as patient_avatar
      FROM reviews r
      JOIN patients p ON r.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE r.doctor_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all(doctor.id);

    res.json({ success: true, data: { ...doctor, availability, reviews } });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/:id - Doctor profile
router.get('/:id', (req, res, next) => {
  try {
    const doctor = db.prepare(`
      SELECT 
        d.*, u.name, u.avatar, u.email, u.phone, u.created_at as member_since,
        s.name as specialty_name, s.description as specialty_description, s.icon as specialty_icon
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.id = ? AND u.is_active = 1
    `).get(req.params.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Get availability
    const availability = db.prepare(`
      SELECT * FROM availability WHERE doctor_id = ? AND is_active = 1 ORDER BY day_of_week
    `).all(req.params.id);

    // Get recent reviews
    const reviews = db.prepare(`
      SELECT r.*, u.name as patient_name, u.avatar as patient_avatar
      FROM reviews r
      JOIN patients p ON r.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE r.doctor_id = ?
      ORDER BY r.created_at DESC
      LIMIT 5
    `).all(req.params.id);

    res.json({ success: true, data: { ...doctor, availability, reviews } });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/:id/slots - Available time slots for a date
router.get('/:id/slots', (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const dayOfWeek = new Date(date).getDay();
    const avail = db.prepare(
      'SELECT * FROM availability WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1'
    ).get(req.params.id, dayOfWeek);

    if (!avail) {
      return res.json({ success: true, data: { slots: [] } });
    }

    // Generate time slots
    const slots = generateTimeSlots(avail.start_time, avail.end_time, avail.slot_duration_minutes);

    // Remove booked slots
    const booked = db.prepare(`
      SELECT appointment_time FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND status IN ('pending','confirmed')
    `).all(req.params.id, date).map(a => a.appointment_time);

    const availableSlots = slots.filter(s => !booked.includes(s));

    res.json({ success: true, data: { slots: availableSlots, booked } });
  } catch (err) {
    next(err);
  }
});

function generateTimeSlots(start, end, duration) {
  const slots = [];
  let current = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  while (current + duration <= endMin) {
    slots.push(minutesToTime(current));
    current += duration;
  }
  return slots;
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60).toString().padStart(2, '0');
  const min = (m % 60).toString().padStart(2, '0');
  return `${h}:${min}`;
}

// PUT /api/doctors/:id - Update doctor profile (doctor only)
router.put('/:id', authenticate, requireDoctor, upload.single('avatar'), async (req, res, next) => {
  try {
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    // Check ownership
    const userDoctor = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(req.user.id);
    if (!userDoctor || userDoctor.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const {
      specialty_id, qualification, experience_years, clinic_name,
      clinic_address, clinic_city, consultation_fee, bio,
      name, phone,
    } = req.body;

    db.transaction(() => {
      db.prepare(`
        UPDATE doctors SET
          specialty_id = COALESCE(?, specialty_id),
          qualification = COALESCE(?, qualification),
          experience_years = COALESCE(?, experience_years),
          clinic_name = COALESCE(?, clinic_name),
          clinic_address = COALESCE(?, clinic_address),
          clinic_city = COALESCE(?, clinic_city),
          consultation_fee = COALESCE(?, consultation_fee),
          bio = COALESCE(?, bio),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(specialty_id || null, qualification || null, experience_years || null,
             clinic_name || null, clinic_address || null, clinic_city || null,
             consultation_fee || null, bio || null, req.params.id);

      if (name || phone || req.file) {
        const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;
        db.prepare(`
          UPDATE users SET
            name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            avatar = COALESCE(?, avatar),
            updated_at = datetime('now')
          WHERE id = ?
        `).run(name || null, phone || null, avatarPath, req.user.id);
      }
    })();

    const updated = db.prepare(`
      SELECT d.*, u.name, u.avatar, u.email, u.phone, s.name as specialty_name
      FROM doctors d JOIN users u ON d.user_id = u.id LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.id = ?
    `).get(req.params.id);

    res.json({ success: true, message: 'Profile updated', data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/doctors/:id/availability - Update availability schedule
router.put('/:id/availability', authenticate, requireDoctor, (req, res, next) => {
  try {
    const userDoctor = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(req.user.id);
    if (!userDoctor || userDoctor.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { schedule } = req.body; // Array of { day_of_week, start_time, end_time, slot_duration_minutes, is_active }
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ success: false, message: 'Schedule must be an array' });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM availability WHERE doctor_id = ?').run(req.params.id);
      const insert = db.prepare(`
        INSERT INTO availability (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of schedule) {
        insert.run(uuidv4(), req.params.id, s.day_of_week, s.start_time, s.end_time, s.slot_duration_minutes || 30, s.is_active ? 1 : 0);
      }
    })();

    const updated = db.prepare('SELECT * FROM availability WHERE doctor_id = ? ORDER BY day_of_week').all(req.params.id);
    res.json({ success: true, message: 'Availability updated', data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
