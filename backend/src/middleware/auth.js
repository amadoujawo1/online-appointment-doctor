const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'medibook_jwt_secret_change_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'medibook_refresh_secret_change_in_production';

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, jti: uuidv4() }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Verify user still exists and is active
    const user = db.prepare('SELECT id, role, is_active FROM users WHERE id = ?').get(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

const requirePatient = requireRole('patient');
const requireDoctor = requireRole('doctor');
const requireAdmin = requireRole('admin');
const requireReceptionist = requireRole('receptionist');
const requirePatientOrAdmin = requireRole('patient', 'admin');
const requireDoctorOrAdmin = requireRole('doctor', 'admin');
const requireReceptionistOrAdmin = requireRole('receptionist', 'admin');

module.exports = {
  authenticate,
  requireRole,
  requirePatient,
  requireDoctor,
  requireAdmin,
  requireReceptionist,
  requirePatientOrAdmin,
  requireDoctorOrAdmin,
  requireReceptionistOrAdmin,
  generateTokens,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
};

