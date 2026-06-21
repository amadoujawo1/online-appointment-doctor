const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendEmail, appointmentConfirmationEmail, appointmentCancellationEmail } = require('../config/mailer');
const { sendSMS, appointmentConfirmationSMS, appointmentReminderSMS, appointmentCancellationSMS, teleconsultLinkSMS } = require('../config/sms');
const { generateJoinLink } = require('../services/teleconsult');

function createNotification(userId, type, title, message, relatedId = null) {
  try {
    db.prepare('INSERT INTO notifications (id, user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), userId, type, title, message, relatedId);
  } catch (e) { /* silently fail */ }
}

// GET /api/appointments - List appointments based on role & filter by facility
router.get('/', authenticate, (req, res, next) => {
  try {
    const { status, date, facility_id, page = 1, limit = 20 } = req.query;
    let query = '';
    const params = [];

    if (req.user.role === 'patient') {
      query = `
        SELECT a.*, 
          u.name as doctor_name, u.avatar as doctor_avatar,
          d.clinic_name, d.consultation_fee,
          s.name as specialty_name,
          f.name as facility_name,
          (SELECT COUNT(*) FROM reviews r WHERE r.appointment_id = a.id) as is_reviewed
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specialties s ON d.specialty_id = s.id
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN facilities f ON a.facility_id = f.id
        WHERE p.user_id = ?
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'doctor') {
      query = `
        SELECT a.*,
          pu.name as patient_name, pu.avatar as patient_avatar, pu.phone as patient_phone,
          pat.gender as patient_gender, pat.date_of_birth as patient_dob,
          pat.blood_group, f.name as facility_name
        FROM appointments a
        JOIN patients pat ON a.patient_id = pat.id
        JOIN users pu ON pat.user_id = pu.id
        JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN facilities f ON a.facility_id = f.id
        WHERE d.user_id = ?
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'receptionist') {
      // Receptionist - view all appointments for their facility
      const staff = db.prepare('SELECT facility_id FROM facility_staff WHERE user_id = ? AND is_active = 1').get(req.user.id);
      const facilityId = staff ? staff.facility_id : null;

      query = `
        SELECT a.*,
          pu.name as patient_name, pu.avatar as patient_avatar, pu.phone as patient_phone,
          du.name as doctor_name, s.name as specialty_name, f.name as facility_name
        FROM appointments a
        JOIN patients pat ON a.patient_id = pat.id
        JOIN users pu ON pat.user_id = pu.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users du ON d.user_id = du.id
        LEFT JOIN specialties s ON d.specialty_id = s.id
        LEFT JOIN facilities f ON a.facility_id = f.id
        WHERE a.facility_id = ?
      `;
      params.push(facilityId);
    } else {
      // Admin - all appointments
      query = `
        SELECT a.*,
          pu.name as patient_name, du.name as doctor_name,
          s.name as specialty_name, f.name as facility_name
        FROM appointments a
        JOIN patients pat ON a.patient_id = pat.id
        JOIN users pu ON pat.user_id = pu.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users du ON d.user_id = du.id
        LEFT JOIN specialties s ON d.specialty_id = s.id
        LEFT JOIN facilities f ON a.facility_id = f.id
        WHERE 1=1
      `;
    }

    if (status) { query += ' AND a.status = ?'; params.push(status); }
    if (date) { query += ' AND a.appointment_date = ?'; params.push(date); }
    if (facility_id && req.user.role !== 'receptionist') { query += ' AND a.facility_id = ?'; params.push(facility_id); }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const countResult = db.prepare(`SELECT COUNT(*) as total FROM (${query}) sub`).get(params);
    const total = countResult.total;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const appointments = db.prepare(query).all(params);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments - Book appointment
router.post('/', authenticate, requireRole('patient', 'receptionist', 'admin'), (req, res, next) => {
  try {
    const { doctor_id, appointment_date, appointment_time, reason, appointment_type, facility_id, patient_id } = req.body;
    if (!doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ success: false, message: 'Doctor, date and time are required' });
    }

    let patient;
    if (req.user.role === 'patient') {
      patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.user.id);
    } else {
      // Admin/receptionist can book on behalf of a patient using patient_id
      if (!patient_id) {
        return res.status(400).json({ success: false, message: 'patient_id is required when booking on behalf of patient' });
      }
      patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient_id);
    }

    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

    const doctor = db.prepare(`
      SELECT d.*, u.name as doctor_name, u.email as doctor_email
      FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?
    `).get(doctor_id);
    if (!doctor || !doctor.is_verified) {
      return res.status(404).json({ success: false, message: 'Doctor not found or not verified' });
    }

    // Check slot is available
    const existing = db.prepare(`
      SELECT id FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ('pending','confirmed')
    `).get(doctor_id, appointment_date, appointment_time);

    if (existing) {
      return res.status(409).json({ success: false, message: 'This slot is already booked' });
    }

    // Check patient doesn't already have appointment at same time
    const patientConflict = db.prepare(`
      SELECT id FROM appointments
      WHERE patient_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ('pending','confirmed')
    `).get(patient.id, appointment_date, appointment_time);

    if (patientConflict) {
      return res.status(409).json({ success: false, message: 'Patient already has an appointment at this time' });
    }

    const type = appointment_type || 'in_person';
    const appointmentId = uuidv4();
    let teleconsultLink = null;

    if (type === 'teleconsult') {
      teleconsultLink = generateJoinLink(appointmentId);
    }

    // Determine target facility
    const targetFacilityId = facility_id || doctor.facility_id || null;

    db.prepare(`
      INSERT INTO appointments (id, patient_id, doctor_id, facility_id, appointment_date, appointment_time, appointment_type, teleconsult_link, reason, fee, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      appointmentId,
      patient.id,
      doctor_id,
      targetFacilityId,
      appointment_date,
      appointment_time,
      type,
      teleconsultLink,
      reason || null,
      doctor.consultation_fee
    );

    const patientUser = db.prepare('SELECT name, phone, email FROM users WHERE id = ?').get(patient.user_id);
    const facility = targetFacilityId ? db.prepare('SELECT name FROM facilities WHERE id = ?').get(targetFacilityId) : null;

    // Notify doctor
    createNotification(
      doctor.user_id, 'appointment', 'New Appointment Request',
      `${patientUser?.name || 'A patient'} has booked an appointment on ${appointment_date} at ${appointment_time}`, appointmentId
    );

    // Notify patient
    createNotification(
      patient.user_id, 'appointment', 'Appointment Booked',
      `Your appointment with Dr. ${doctor.doctor_name} on ${appointment_date} at ${appointment_time} is pending confirmation`, appointmentId
    );

    // Send SMS notification if phone number exists
    if (patientUser?.phone) {
      const smsMsg = appointmentConfirmationSMS(
        patientUser.name,
        doctor.doctor_name,
        appointment_date,
        appointment_time,
        facility?.name
      );
      sendSMS(patientUser.phone, smsMsg).catch(console.error);

      // Send teleconsult link if applicable
      if (type === 'teleconsult' && teleconsultLink) {
        const teleSMS = teleconsultLinkSMS(
          patientUser.name,
          doctor.doctor_name,
          appointment_date,
          appointment_time,
          teleconsultLink
        );
        sendSMS(patientUser.phone, teleSMS).catch(console.error);
      }
    }

    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
    res.status(201).json({ success: true, message: 'Appointment booked successfully', data: appointment });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/:id - Get single appointment
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const appointment = db.prepare(`
      SELECT a.*,
        pu.name as patient_name, pu.email as patient_email, pu.phone as patient_phone, pu.avatar as patient_avatar,
        du.name as doctor_name, du.email as doctor_email, du.avatar as doctor_avatar,
        d.clinic_name, d.clinic_address, d.consultation_fee,
        s.name as specialty_name, f.name as facility_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      LEFT JOIN facilities f ON a.facility_id = f.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Access control
    const patient = db.prepare('SELECT user_id FROM patients WHERE id = ?').get(appointment.patient_id);
    const doctor = db.prepare('SELECT user_id FROM doctors WHERE id = ?').get(appointment.doctor_id);

    let isStaff = false;
    if (req.user.role === 'receptionist') {
      const staff = db.prepare('SELECT facility_id FROM facility_staff WHERE user_id = ? AND is_active = 1').get(req.user.id);
      if (staff && staff.facility_id === appointment.facility_id) {
        isStaff = true;
      }
    }

    if (req.user.role !== 'admin' && !isStaff && patient.user_id !== req.user.id && doctor.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/status - Confirm/complete/cancel status updates
router.patch('/:id/status', authenticate, requireRole('doctor', 'receptionist', 'admin'), (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['confirmed', 'cancelled', 'completed', 'rescheduled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const appointment = db.prepare(`
      SELECT a.*, d.user_id as doctor_user_id, p.user_id as patient_user_id,
        du.name as doctor_name, pu.name as patient_name, pu.email as patient_email, pu.phone as patient_phone,
        f.name as facility_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      LEFT JOIN facilities f ON a.facility_id = f.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Receptionist check
    let isStaff = false;
    if (req.user.role === 'receptionist') {
      const staff = db.prepare('SELECT facility_id FROM facility_staff WHERE user_id = ? AND is_active = 1').get(req.user.id);
      if (staff && staff.facility_id === appointment.facility_id) {
        isStaff = true;
      }
    }

    if (req.user.role !== 'admin' && !isStaff && appointment.doctor_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    db.prepare(`
      UPDATE appointments SET status = ?, notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?
    `).run(status, notes || null, req.params.id);

    // Notifications & SMS alerts
    const patientUserId = appointment.patient_user_id;
    if (status === 'confirmed') {
      createNotification(patientUserId, 'appointment', 'Appointment Confirmed',
        `Dr. ${appointment.doctor_name} confirmed your appointment on ${appointment.appointment_date} at ${appointment.appointment_time}`, req.params.id);

      // Email
      sendEmail({
        to: appointment.patient_email,
        subject: 'Appointment Confirmed - MediBook',
        html: appointmentConfirmationEmail(appointment.patient_name, appointment.doctor_name, appointment.appointment_date, appointment.appointment_time),
      }).catch(console.error);

      // SMS
      if (appointment.patient_phone) {
        const smsMsg = appointmentConfirmationSMS(
          appointment.patient_name,
          appointment.doctor_name,
          appointment.appointment_date,
          appointment.appointment_time,
          appointment.facility_name
        );
        sendSMS(appointment.patient_phone, smsMsg).catch(console.error);
      }
    } else if (status === 'cancelled') {
      createNotification(patientUserId, 'appointment', 'Appointment Cancelled',
        `Your appointment with Dr. ${appointment.doctor_name} has been cancelled`, req.params.id);

      // Email
      sendEmail({
        to: appointment.patient_email,
        subject: 'Appointment Cancelled - MediBook',
        html: appointmentCancellationEmail(appointment.patient_name, appointment.doctor_name, appointment.appointment_date, appointment.appointment_time),
      }).catch(console.error);

      // SMS
      if (appointment.patient_phone) {
        const smsMsg = appointmentCancellationSMS(
          appointment.patient_name,
          appointment.doctor_name,
          appointment.appointment_date,
          appointment.appointment_time
        );
        sendSMS(appointment.patient_phone, smsMsg).catch(console.error);
      }
    } else if (status === 'completed') {
      createNotification(patientUserId, 'review', 'Leave a Review',
        `How was your appointment with Dr. ${appointment.doctor_name}? Share your experience!`, req.params.id);
    }

    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: `Appointment ${status}`, data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id - Reschedule (patient, receptionist, doctor)
router.put('/:id', authenticate, requireRole('patient', 'receptionist', 'doctor', 'admin'), (req, res, next) => {
  try {
    const { appointment_date, appointment_time, reason } = req.body;

    const appointment = db.prepare(`
      SELECT a.*, p.user_id as patient_user_id
      FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE a.id = ?
    `).get(req.params.id);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Access control
    let isStaff = false;
    if (req.user.role === 'receptionist') {
      const staff = db.prepare('SELECT facility_id FROM facility_staff WHERE user_id = ? AND is_active = 1').get(req.user.id);
      if (staff && staff.facility_id === appointment.facility_id) {
        isStaff = true;
      }
    }

    const doctor = db.prepare('SELECT user_id FROM doctors WHERE id = ?').get(appointment.doctor_id);

    if (req.user.role !== 'admin' && !isStaff && appointment.patient_user_id !== req.user.id && doctor?.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!['pending', 'confirmed', 'rescheduled'].includes(appointment.status)) {
      return res.status(400).json({ success: false, message: 'Cannot reschedule this appointment' });
    }

    // Check new slot is free
    if (appointment_date && appointment_time) {
      const conflict = db.prepare(`
        SELECT id FROM appointments
        WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ('pending','confirmed') AND id != ?
      `).get(appointment.doctor_id, appointment_date, appointment_time, req.params.id);
      if (conflict) return res.status(409).json({ success: false, message: 'This slot is already booked' });
    }

    db.prepare(`
      UPDATE appointments SET
        appointment_date = COALESCE(?, appointment_date),
        appointment_time = COALESCE(?, appointment_time),
        reason = COALESCE(?, reason),
        status = 'rescheduled',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(appointment_date || null, appointment_time || null, reason || null, req.params.id);

    // Notify doctor & patient
    const doctorUser = db.prepare('SELECT user_id FROM doctors WHERE id = ?').get(appointment.doctor_id);
    const patientUser = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(appointment.patient_user_id);

    createNotification(
      doctorUser.user_id, 'appointment', 'Appointment Rescheduled',
      `Appointment rescheduled to ${appointment_date} at ${appointment_time}`, req.params.id
    );

    // Send SMS updates
    if (patientUser?.phone) {
      const smsMsg = `MediBook: Appointment rescheduled. Your appointment is now set for ${appointment_date} at ${appointment_time}.`;
      sendSMS(patientUser.phone, smsMsg).catch(console.error);
    }

    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Appointment rescheduled', data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/appointments/:id - Cancel (patient, receptionist, doctor)
router.delete('/:id', authenticate, requireRole('patient', 'receptionist', 'doctor', 'admin'), (req, res, next) => {
  try {
    const { cancellation_reason } = req.body;

    const appointment = db.prepare(`
      SELECT a.*, p.user_id as patient_user_id,
        d.user_id as doctor_user_id, du.name as doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Access checks
    let isStaff = false;
    if (req.user.role === 'receptionist') {
      const staff = db.prepare('SELECT facility_id FROM facility_staff WHERE user_id = ? AND is_active = 1').get(req.user.id);
      if (staff && staff.facility_id === appointment.facility_id) {
        isStaff = true;
      }
    }

    if (req.user.role !== 'admin' && !isStaff && appointment.patient_user_id !== req.user.id && appointment.doctor_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot cancel this appointment' });
    }

    db.prepare(`
      UPDATE appointments SET status = 'cancelled', cancellation_reason = ?, updated_at = datetime('now') WHERE id = ?
    `).run(cancellation_reason || null, req.params.id);

    const patientUser = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(appointment.patient_user_id);

    createNotification(
      appointment.doctor_user_id, 'appointment', 'Appointment Cancelled',
      `${patientUser?.name || 'A patient'} cancelled their appointment on ${appointment.appointment_date} at ${appointment.appointment_time}`, req.params.id
    );

    // SMS Confirmation
    if (patientUser?.phone) {
      const smsMsg = appointmentCancellationSMS(
        patientUser.name,
        appointment.doctor_name,
        appointment.appointment_date,
        appointment.appointment_time
      );
      sendSMS(patientUser.phone, smsMsg).catch(console.error);
    }

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
