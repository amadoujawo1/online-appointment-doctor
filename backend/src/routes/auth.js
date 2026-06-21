const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { generateTokens, JWT_REFRESH_SECRET } = require('../middleware/auth');
const { sendEmail } = require('../config/mailer');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone, id_type, national_id, passport_number, village, district, region } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required' });
    }
    if (!['patient', 'doctor', 'receptionist'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be patient, doctor or receptionist' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, role, name, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertUser.run(userId, email.toLowerCase(), passwordHash, role, name, phone || null);

      if (role === 'patient') {
        const patientId = uuidv4();
        db.prepare(`
          INSERT INTO patients (id, user_id, id_type, national_id, passport_number, village, district, region)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          patientId,
          userId,
          id_type || 'none',
          national_id || null,
          passport_number || null,
          village || null,
          district || null,
          region || null
        );
      } else if (role === 'doctor') {
        const doctorId = uuidv4();
        db.prepare('INSERT INTO doctors (id, user_id) VALUES (?, ?)').run(doctorId, userId);
      } else if (role === 'receptionist') {
        // Receptionist has a base staff record that can be linked to a facility later or via facility management
        console.log(`[Auth] Registered receptionist user ${name}`);
      }
    })();

    const user = db.prepare('SELECT id, email, role, name, phone, avatar FROM users WHERE id = ?').get(userId);
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    const rtId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)').run(rtId, userId, refreshToken, expiresAt);

    // Welcome notification
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), userId, 'welcome', 'Welcome to MediBook!', `Hello ${name}, your account has been created successfully.`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during registration.' });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const rtId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)').run(rtId, user.id, refreshToken, expiresAt);

    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);
    if (!stored || new Date(stored.expires_at) < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = db.prepare('SELECT id, email, role, name FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Rotate refresh token
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    const rtId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)').run(rtId, user.id, newRefreshToken, expiresAt);

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, role, name, phone, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, data: user });
});

module.exports = router;
