/**
 * Teleconsultation Service — Jitsi Meet Integration
 * Uses public meet.jit.si by default.
 * Set JITSI_DOMAIN for a self-hosted instance.
 */

const crypto = require('crypto');

const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
const JITSI_APP_ID = process.env.JITSI_APP_ID || null;
const JITSI_APP_SECRET = process.env.JITSI_APP_SECRET || null;

/**
 * Generate a deterministic, collision-resistant room name from appointment ID.
 * Uses first 12 chars of SHA256 hash to keep URL short but unique.
 */
function generateRoomName(appointmentId) {
  const hash = crypto.createHash('sha256').update(`medibook-${appointmentId}`).digest('hex');
  return `medibook-${hash.slice(0, 12)}`;
}

/**
 * Generate the full join link for a teleconsult appointment.
 * If JITSI_APP_ID is set, signs a JWT for private room access.
 */
function generateJoinLink(appointmentId, userRole = 'participant') {
  const roomName = generateRoomName(appointmentId);

  if (JITSI_APP_ID && JITSI_APP_SECRET) {
    try {
      const jwt = require('jsonwebtoken');
      const now = Math.floor(Date.now() / 1000);
      const token = jwt.sign(
        {
          iss: JITSI_APP_ID,
          sub: JITSI_DOMAIN,
          aud: 'jitsi',
          room: roomName,
          moderator: userRole === 'doctor',
          exp: now + 3600, // 1 hour
          nbf: now - 60,
          iat: now,
        },
        JITSI_APP_SECRET
      );
      return `https://${JITSI_DOMAIN}/${roomName}?jwt=${token}`;
    } catch {
      // Fall through to public link
    }
  }

  return `https://${JITSI_DOMAIN}/${roomName}`;
}

/**
 * Check if it's within the consultation window (15 min before - 2hr after).
 */
function isWithinConsultationWindow(appointmentDate, appointmentTime) {
  try {
    const apptDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
    const now = new Date();
    const diffMs = apptDateTime - now;
    const diffMinutes = diffMs / 60000;
    return diffMinutes >= -120 && diffMinutes <= 15;
  } catch {
    return false;
  }
}

module.exports = { generateRoomName, generateJoinLink, isWithinConsultationWindow };
