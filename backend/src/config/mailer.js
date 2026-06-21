const nodemailer = require('nodemailer');

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.log(`[Email Skipped] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"MediBook" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}

function appointmentConfirmationEmail(patientName, doctorName, date, time) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a73e8; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">MediBook</h1>
        <p style="color: #e8f0fe; margin: 5px 0 0;">Your Health, Our Priority</p>
      </div>
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a1a2e;">Appointment Confirmed ✓</h2>
        <p>Hello <strong>${patientName}</strong>,</p>
        <p>Your appointment has been confirmed:</p>
        <div style="background: white; border-left: 4px solid #1a73e8; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
        <p>Please arrive 10 minutes early. Bring any relevant medical documents.</p>
      </div>
    </div>
  `;
}

function appointmentCancellationEmail(name, doctorName, date, time, reason) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc3545; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">MediBook</h1>
      </div>
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a1a2e;">Appointment Cancelled</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>You can book a new appointment on MediBook anytime.</p>
      </div>
    </div>
  `;
}

module.exports = { sendEmail, appointmentConfirmationEmail, appointmentCancellationEmail };
