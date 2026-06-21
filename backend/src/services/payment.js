/**
 * Payment Service — Gambia Local Payment Integration
 * Supports: Afrimoney, QMoney (via ModemPay scaffold), bank transfer, cash
 * Currency: GMD (Gambian Dalasi)
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

const MODEMPAY_API_KEY = process.env.MODEMPAY_API_KEY;
const MODEMPAY_BASE_URL = process.env.MODEMPAY_BASE_URL || 'https://api.modempay.com';
const MODEMPAY_MERCHANT_ID = process.env.MODEMPAY_MERCHANT_ID;

function generateReceiptNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `MB-${yy}${mm}${dd}-${rand}`;
}

/**
 * Initiate a payment.
 * Cash: immediately marks as completed.
 * Bank Transfer: marks as pending, awaits manual confirmation.
 * Mobile Money: scaffolded - logs intent, marks pending until ModemPay webhook confirms.
 */
async function initiatePayment({
  appointmentId,
  patientId,
  amount,
  method,
  provider = 'cash',
  mobileNumber = null,
  accountName = null,
  notes = null,
}) {
  const paymentId = uuidv4();
  const receiptNumber = generateReceiptNumber();
  let status = 'pending';
  let paidAt = null;
  let transactionRef = null;

  if (method === 'cash') {
    // Cash payments confirmed immediately
    status = 'completed';
    paidAt = new Date().toISOString();
    transactionRef = `CASH-${receiptNumber}`;
  } else if (method === 'bank_transfer') {
    // Bank transfers require manual confirmation
    status = 'pending';
    transactionRef = `BANK-${receiptNumber}`;
  } else if (method === 'mobile_money') {
    // ModemPay mobile money integration (Afrimoney / QMoney)
    if (MODEMPAY_API_KEY && MODEMPAY_MERCHANT_ID) {
      try {
        const result = await initiateModemPay({ amount, mobileNumber, provider, receiptNumber });
        transactionRef = result.reference;
        status = result.status === 'success' ? 'completed' : 'pending';
        paidAt = status === 'completed' ? new Date().toISOString() : null;
      } catch (err) {
        console.error('[ModemPay Error]', err.message);
        // Fall through to pending status
        transactionRef = `MOMO-${receiptNumber}`;
      }
    } else {
      // Scaffold: log intent, wait for credentials
      console.log(`[Payment Scaffold] Mobile money payment of GMD ${amount} via ${provider} to ${mobileNumber}`);
      console.log('[Payment] Set MODEMPAY_API_KEY and MODEMPAY_MERCHANT_ID to enable live mobile money');
      transactionRef = `SCAFFOLD-${receiptNumber}`;
      status = 'pending';
    }
  }

  db.prepare(`
    INSERT INTO payments (id, appointment_id, patient_id, amount, currency, method, provider,
      mobile_number, account_name, transaction_reference, receipt_number, status, paid_at, notes)
    VALUES (?, ?, ?, ?, 'GMD', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    paymentId, appointmentId || null, patientId, amount, method, provider,
    mobileNumber || null, accountName || null, transactionRef,
    receiptNumber, status, paidAt, notes || null
  );

  // Update appointment payment_status if linked
  if (appointmentId && status === 'completed') {
    db.prepare(`UPDATE appointments SET payment_status = 'paid', updated_at = datetime('now') WHERE id = ?`)
      .run(appointmentId);
  } else if (appointmentId && status === 'pending') {
    db.prepare(`UPDATE appointments SET payment_status = 'pending', updated_at = datetime('now') WHERE id = ?`)
      .run(appointmentId);
  }

  return db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
}

/**
 * ModemPay REST API call (scaffolded)
 */
async function initiateModemPay({ amount, mobileNumber, provider, receiptNumber }) {
  const fetch = require('node-fetch');
  const response = await fetch(`${MODEMPAY_BASE_URL}/v1/charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': MODEMPAY_API_KEY,
      'X-Merchant-ID': MODEMPAY_MERCHANT_ID,
    },
    body: JSON.stringify({
      amount,
      currency: 'GMD',
      phone: mobileNumber,
      provider: provider === 'afrimoney' ? 'AFRICELL' : 'QCELL',
      reference: receiptNumber,
      description: 'MediBook Medical Appointment',
    }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message || 'ModemPay error');
  return { reference: data.reference, status: data.status };
}

/**
 * Manually confirm a bank transfer (receptionist/admin)
 */
function confirmBankTransfer(paymentId, confirmedBy) {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.method !== 'bank_transfer') throw new Error('Only bank transfers require manual confirmation');

  db.prepare(`
    UPDATE payments SET status = 'completed', paid_at = datetime('now'),
    confirmed_by = ?, updated_at = datetime('now') WHERE id = ?
  `).run(confirmedBy, paymentId);

  if (payment.appointment_id) {
    db.prepare(`UPDATE appointments SET payment_status = 'paid', updated_at = datetime('now') WHERE id = ?`)
      .run(payment.appointment_id);
  }

  return db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
}

/**
 * Generate a formatted receipt object for printing/downloading
 */
function generateReceipt(paymentId) {
  const payment = db.prepare(`
    SELECT p.*, u.name as patient_name, u.phone as patient_phone,
      a.appointment_date, a.appointment_time,
      du.name as doctor_name, s.name as specialty
    FROM payments p
    JOIN patients pt ON p.patient_id = pt.id
    JOIN users u ON pt.user_id = u.id
    LEFT JOIN appointments a ON p.appointment_id = a.id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    LEFT JOIN users du ON d.user_id = du.id
    LEFT JOIN specialties s ON d.specialty_id = s.id
    WHERE p.id = ?
  `).get(paymentId);

  if (!payment) throw new Error('Payment not found');

  return {
    receiptNumber: payment.receipt_number,
    issuedAt: payment.paid_at || payment.created_at,
    patient: { name: payment.patient_name, phone: payment.patient_phone },
    appointment: payment.appointment_date
      ? { date: payment.appointment_date, time: payment.appointment_time, doctor: payment.doctor_name, specialty: payment.specialty }
      : null,
    payment: {
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      provider: payment.provider,
      reference: payment.transaction_reference,
      status: payment.status,
    },
    facility: 'MediBook Health Platform — The Gambia',
  };
}

module.exports = { initiatePayment, confirmBankTransfer, generateReceipt, generateReceiptNumber };
