/**
 * SMS Service — Africa's Talking integration
 * Gracefully falls back to console logging when AT_API_KEY is not set.
 * Gambia country code: +220
 */

let AfricasTalking = null;
let smsClient = null;

try {
  if (process.env.AT_API_KEY && process.env.AT_API_KEY !== 'your_api_key') {
    AfricasTalking = require('africastalking');
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME || 'sandbox',
    });
    smsClient = at.SMS;
    console.log('📱 Africa\'s Talking SMS service initialized');
  } else {
    console.log('📱 SMS service in console mode (set AT_API_KEY to enable)');
  }
} catch (err) {
  console.log('📱 SMS service unavailable (install africastalking package)');
}

function formatGambiaPhone(phone) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('220')) return `+${clean}`;
  if (clean.length === 7) return `+220${clean}`;
  if (clean.length === 10 && clean.startsWith('7')) return `+220${clean}`;
  return phone.startsWith('+') ? phone : `+${clean}`;
}

async function sendSMS(phone, message) {
  const formatted = formatGambiaPhone(phone);
  if (!formatted) return;

  if (!smsClient) {
    console.log(`[SMS] To: ${formatted}\n[SMS] Message: ${message}`);
    return;
  }

  try {
    await smsClient.send({
      to: [formatted],
      message,
      from: process.env.AT_SENDER_ID || 'MediBook',
    });
  } catch (err) {
    console.error(`[SMS Error] Failed to send to ${formatted}:`, err.message);
  }
}

function appointmentConfirmationSMS(patientName, doctorName, date, time, facilityName) {
  const facility = facilityName ? ` at ${facilityName}` : '';
  return `MediBook: Dear ${patientName}, your appointment with Dr. ${doctorName}${facility} is CONFIRMED for ${date} at ${time}. Please arrive 10 mins early. Call +220-000-0000 to cancel.`;
}

function appointmentReminderSMS(patientName, doctorName, date, time, facilityName) {
  const facility = facilityName ? ` at ${facilityName}` : '';
  return `MediBook REMINDER: Dear ${patientName}, you have an appointment with Dr. ${doctorName}${facility} TOMORROW (${date}) at ${time}. Bring your ID and medical records.`;
}

function appointmentCancellationSMS(patientName, doctorName, date, time) {
  return `MediBook: Dear ${patientName}, your appointment with Dr. ${doctorName} on ${date} at ${time} has been CANCELLED. Book a new appointment at medibook.gm`;
}

function queueCallSMS(patientName, ticketNumber, doctorName) {
  return `MediBook Queue: Dear ${patientName}, ticket #${ticketNumber} — you are now being called. Please proceed to see Dr. ${doctorName}.`;
}

function teleconsultLinkSMS(patientName, doctorName, date, time, link) {
  return `MediBook Teleconsult: Dear ${patientName}, your video consultation with Dr. ${doctorName} is on ${date} at ${time}. Join here: ${link}`;
}

function paymentReceiptSMS(patientName, amount, receiptNumber, method) {
  return `MediBook: Payment confirmed! Dear ${patientName}, GMD ${amount} received via ${method}. Receipt: ${receiptNumber}. Keep this for your records.`;
}

module.exports = {
  sendSMS,
  appointmentConfirmationSMS,
  appointmentReminderSMS,
  appointmentCancellationSMS,
  queueCallSMS,
  teleconsultLinkSMS,
  paymentReceiptSMS,
  formatGambiaPhone,
};
