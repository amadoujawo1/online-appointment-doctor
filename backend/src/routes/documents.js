const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads/medical_docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep original extension, but use unique filename to avoid conflict
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Word, Images, TXT'));
    }
  }
});

// ─── POST /api/documents/upload ──────────────────────────────────────────────
router.post('/upload', authenticate, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { document_type, description, appointment_id, patient_id } = req.body;
    let targetPatientId = patient_id;

    // If uploader is patient, check/use their own patient ID
    if (req.user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
      if (!patient) {
        return res.status(400).json({ success: false, message: 'Patient profile not found' });
      }
      targetPatientId = patient.id;
    } else if (!targetPatientId) {
      return res.status(400).json({ success: false, message: 'patient_id is required' });
    }

    const docId = uuidv4();
    const filePath = `/uploads/medical_docs/${req.file.filename}`;

    db.prepare(`
      INSERT INTO medical_documents (id, patient_id, uploaded_by, appointment_id, document_type, file_path, file_name, file_size, mime_type, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      targetPatientId,
      req.user.id,
      appointment_id || null,
      document_type || 'other',
      filePath,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      description || null
    );

    const document = db.prepare('SELECT * FROM medical_documents WHERE id = ?').get(docId);
    res.status(201).json({
      success: true,
      data: document,
      message: 'Medical document uploaded successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/documents ──────────────────────────────────────────────────────
router.get('/', authenticate, (req, res, next) => {
  try {
    const { patient_id, appointment_id } = req.query;
    let sql = `
      SELECT md.*, u.name as uploader_name, u.role as uploader_role
      FROM medical_documents md
      JOIN users u ON md.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
      if (!patient) return res.json({ success: true, data: [] });
      sql += ' AND md.patient_id = ?';
      params.push(patient.id);
    } else if (patient_id) {
      sql += ' AND md.patient_id = ?';
      params.push(patient_id);
    }

    if (appointment_id) {
      sql += ' AND md.appointment_id = ?';
      params.push(appointment_id);
    }

    sql += ' ORDER BY md.created_at DESC';
    const documents = db.prepare(sql).all(...params);

    res.json({ success: true, data: documents });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/documents/:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, (req, res, next) => {
  try {
    const doc = db.prepare('SELECT * FROM medical_documents WHERE id = ?').get(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Access check: only patient who owns it, doctor who uploaded it, or admin
    if (req.user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
      if (!patient || patient.id !== doc.patient_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (req.user.role !== 'admin' && doc.uploaded_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete file
    const absolutePath = path.join(__dirname, '../..', doc.file_path);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    db.prepare('DELETE FROM medical_documents WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
