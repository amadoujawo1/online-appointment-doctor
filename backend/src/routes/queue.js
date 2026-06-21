const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendSMS, queueCallSMS } = require('../config/sms');

const requireReceptionistOrDoctor = requireRole('receptionist', 'doctor', 'admin');

// ─── GET /api/queue — Get today's queue ───────────────────────────────────────
router.get('/', authenticate, requireReceptionistOrDoctor, (req, res, next) => {
  try {
    const { facility_id, doctor_id, date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let sql = `
      SELECT q.*, u.name as doctor_name,
        f.name as facility_name
      FROM queue q
      LEFT JOIN doctors d ON q.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN facilities f ON q.facility_id = f.id
      WHERE q.appointment_date = ?
    `;
    const params = [targetDate];
    if (facility_id) { sql += ' AND q.facility_id = ?'; params.push(facility_id); }
    if (doctor_id) { sql += ' AND q.doctor_id = ?'; params.push(doctor_id); }
    sql += ' ORDER BY q.arrival_time ASC';

    const queue = db.prepare(sql).all(...params);
    const stats = {
      waiting: queue.filter(q => q.status === 'waiting').length,
      called: queue.filter(q => q.status === 'called').length,
      served: queue.filter(q => q.status === 'served').length,
      total: queue.length,
    };
    res.json({ success: true, data: { queue, stats } });
  } catch (err) { next(err); }
});

// ─── POST /api/queue — Add walk-in patient ────────────────────────────────────
router.post('/', authenticate, requireReceptionistOrDoctor, (req, res, next) => {
  try {
    const { facility_id, doctor_id, patient_name, patient_phone, reason, appointment_date } = req.body;
    if (!facility_id || !patient_name) {
      return res.status(400).json({ success: false, message: 'facility_id and patient_name are required' });
    }

    // Generate sequential ticket number for today at this facility
    const targetDate = appointment_date || new Date().toISOString().split('T')[0];
    const todayCount = db.prepare(
      'SELECT COUNT(*) as n FROM queue WHERE facility_id = ? AND appointment_date = ?'
    ).get(facility_id, targetDate).n;
    const ticketNumber = String(todayCount + 1).padStart(3, '0');

    const id = uuidv4();
    db.prepare(`
      INSERT INTO queue (id, facility_id, doctor_id, patient_name, patient_phone, ticket_number, reason, appointment_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, facility_id, doctor_id || null, patient_name, patient_phone || null, ticketNumber, reason || null, targetDate);

    const entry = db.prepare(`
      SELECT q.*, u.name as doctor_name FROM queue q
      LEFT JOIN doctors d ON q.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE q.id = ?
    `).get(id);

    res.status(201).json({ success: true, data: entry, message: `Walk-in registered. Ticket #${ticketNumber}` });
  } catch (err) { next(err); }
});

// ─── PATCH /api/queue/:id/call — Call next patient ───────────────────────────
router.patch('/:id/call', authenticate, requireReceptionistOrDoctor, async (req, res, next) => {
  try {
    const entry = db.prepare('SELECT * FROM queue WHERE id = ?').get(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
    if (entry.status !== 'waiting') return res.status(400).json({ success: false, message: 'Patient is not in waiting status' });

    db.prepare("UPDATE queue SET status = 'called', called_time = datetime('now') WHERE id = ?").run(req.params.id);

    // Send SMS if phone available
    if (entry.patient_phone) {
      const doctorUser = entry.doctor_id
        ? db.prepare('SELECT u.name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?').get(entry.doctor_id)
        : null;
      const msg = queueCallSMS(entry.patient_name, entry.ticket_number, doctorUser?.name || 'your doctor');
      sendSMS(entry.patient_phone, msg).catch(console.error);
    }

    res.json({ success: true, message: `Ticket #${entry.ticket_number} — patient called` });
  } catch (err) { next(err); }
});

// ─── PATCH /api/queue/:id/serve — Mark as served ─────────────────────────────
router.patch('/:id/serve', authenticate, requireReceptionistOrDoctor, (req, res, next) => {
  try {
    const { notes } = req.body;
    db.prepare("UPDATE queue SET status = 'served', served_time = datetime('now'), notes = ? WHERE id = ?").run(notes || null, req.params.id);
    res.json({ success: true, message: 'Patient marked as served' });
  } catch (err) { next(err); }
});

// ─── PATCH /api/queue/:id/skip — Skip patient ────────────────────────────────
router.patch('/:id/skip', authenticate, requireReceptionistOrDoctor, (req, res, next) => {
  try {
    db.prepare("UPDATE queue SET status = 'skipped' WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: 'Patient skipped' });
  } catch (err) { next(err); }
});

// ─── DELETE /api/queue/:id — Remove from queue ───────────────────────────────
router.delete('/:id', authenticate, requireReceptionistOrDoctor, (req, res, next) => {
  try {
    db.prepare("UPDATE queue SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: 'Queue entry cancelled' });
  } catch (err) { next(err); }
});

module.exports = router;
