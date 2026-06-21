const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { initiatePayment, confirmBankTransfer, generateReceipt } = require('../services/payment');
const { sendSMS, paymentReceiptSMS } = require('../config/sms');

// ─── POST /api/payments/initiate ──────────────────────────────────────────────
router.post('/initiate', authenticate, async (req, res, next) => {
  try {
    const { appointment_id, method, provider, mobile_number, account_name, notes } = req.body;

    let patientId;
    let amount;

    if (appointment_id) {
      // Find appointment and patient info
      const appt = db.prepare(`
        SELECT a.id, a.fee, a.patient_id, u.name as patient_name, u.phone as patient_phone
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE a.id = ?
      `).get(appointment_id);

      if (!appt) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      patientId = appt.patient_id;
      amount = appt.fee;

      // Access checks: only patient themselves, receptionist, or admin
      if (req.user.role === 'patient') {
        const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
        if (!patient || patient.id !== patientId) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }
    } else {
      // For general payments (e.g. walk-in registration, direct patient fee)
      const { amount: inputAmount, patient_id } = req.body;
      if (!inputAmount || !patient_id) {
        return res.status(400).json({ success: false, message: 'appointment_id or (amount and patient_id) required' });
      }
      patientId = patient_id;
      amount = inputAmount;
    }

    const payment = await initiatePayment({
      appointmentId: appointment_id,
      patientId,
      amount,
      method,
      provider,
      mobileNumber: mobile_number,
      accountName: account_name,
      notes
    });

    // If completed instantly (e.g. Cash), trigger SMS notification
    if (payment.status === 'completed') {
      const patientUser = db.prepare(`
        SELECT u.name, u.phone
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(patientId);

      if (patientUser && (mobile_number || patientUser.phone)) {
        const smsMsg = paymentReceiptSMS(
          patientUser.name,
          amount,
          payment.receipt_number,
          method === 'cash' ? 'Cash' : provider
        );
        sendSMS(mobile_number || patientUser.phone, smsMsg).catch(console.error);
      }
    }

    res.status(201).json({
      success: true,
      data: payment,
      message: payment.status === 'completed'
        ? 'Payment completed successfully'
        : 'Payment initiated. Awaiting confirmation'
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/payments/:id/receipt ───────────────────────────────────────────
router.get('/:id/receipt', authenticate, (req, res, next) => {
  try {
    const receipt = generateReceipt(req.params.id);

    // Simple access check: patient can only view their own receipts
    if (req.user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
      const payment = db.prepare('SELECT patient_id FROM payments WHERE id = ?').get(req.params.id);
      if (!patient || !payment || patient.id !== payment.patient_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, data: receipt });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/payments ────────────────────────────────────────────────────────
router.get('/', authenticate, (req, res, next) => {
  try {
    let sql = `
      SELECT p.*, u.name as patient_name,
        a.appointment_date, a.appointment_time, du.name as doctor_name
      FROM payments p
      JOIN patients pt ON p.patient_id = pt.id
      JOIN users u ON pt.user_id = u.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'patient') {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id);
      if (!patient) return res.json({ success: true, data: [] });
      sql += ' AND p.patient_id = ?';
      params.push(patient.id);
    } else if (req.user.role === 'doctor') {
      const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
      if (!doctor) return res.json({ success: true, data: [] });
      sql += ' AND a.doctor_id = ?';
      params.push(doctor.id);
    }

    sql += ' ORDER BY p.created_at DESC';
    const payments = db.prepare(sql).all(...params);
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/payments/:id/confirm ───────────────────────────────────────────
router.post('/:id/confirm', authenticate, requireRole('receptionist', 'admin'), (req, res, next) => {
  try {
    const payment = confirmBankTransfer(req.params.id, req.user.id);

    // Send SMS notification
    const patientUser = db.prepare(`
      SELECT u.name, u.phone
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(payment.patient_id);

    if (patientUser && (payment.mobile_number || patientUser.phone)) {
      const smsMsg = paymentReceiptSMS(
        patientUser.name,
        payment.amount,
        payment.receipt_number,
        payment.method === 'bank_transfer' ? 'Bank Transfer' : payment.provider
      );
      sendSMS(payment.mobile_number || patientUser.phone, smsMsg).catch(console.error);
    }

    res.json({
      success: true,
      data: payment,
      message: 'Payment confirmed successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/payments/webhook (ModemPay callback) ───────────────────────────
router.post('/webhook', (req, res, next) => {
  try {
    const { reference, status, amount } = req.body;

    console.log('[Webhook Received]', req.body);

    const payment = db.prepare('SELECT * FROM payments WHERE transaction_reference = ?').get(reference);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment reference not found' });
    }

    if (status === 'success') {
      db.prepare(`
        UPDATE payments
        SET status = 'completed', paid_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(payment.id);

      if (payment.appointment_id) {
        db.prepare(`UPDATE appointments SET payment_status = 'paid', updated_at = datetime('now') WHERE id = ?`)
          .run(payment.appointment_id);
      }

      // SMS receipt
      const patientUser = db.prepare(`
        SELECT u.name, u.phone
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(payment.patient_id);

      if (patientUser && (payment.mobile_number || patientUser.phone)) {
        const smsMsg = paymentReceiptSMS(
          patientUser.name,
          payment.amount,
          payment.receipt_number,
          payment.provider
        );
        sendSMS(payment.mobile_number || patientUser.phone, smsMsg).catch(console.error);
      }
    } else {
      db.prepare(`
        UPDATE payments
        SET status = 'failed', updated_at = datetime('now')
        WHERE id = ?
      `).run(payment.id);

      if (payment.appointment_id) {
        db.prepare(`UPDATE appointments SET payment_status = 'unpaid', updated_at = datetime('now') WHERE id = ?`)
          .run(payment.appointment_id);
      }
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
