'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Appointment {
  id: string;
  appointment_type: string;
  status: string;
  teleconsult_link?: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  specialty_name?: string;
  fee: number;
}

export default function PatientTeleconsultPage() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeCallLink, setActiveCallLink] = useState<string | null>(null);
  const [activeDoctorName, setActiveDoctorName] = useState('');

  async function loadTeleconsults() {
    try {
      const res = await api.get<{ appointments: Appointment[] }>('/appointments');
      if (res.success && res.data?.appointments) {
        // Filter appointments that are of type 'teleconsult'
        const teleOnly = res.data.appointments.filter(
          (appt: Appointment) => appt.appointment_type === 'teleconsult' && appt.status !== 'cancelled'
        );
        setAppointments(teleOnly);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeleconsults();
  }, []);

  const isWindowActive = (dateStr: string, timeStr: string) => {
    try {
      // Parse appointment date/time
      const apptDate = new Date(`${dateStr}T${timeStr}:00`);
      const now = new Date();
      const diffMs = apptDate.getTime() - now.getTime();
      const diffMinutes = diffMs / 60000;
      // Allow joining 15 minutes before and up to 2 hours after scheduled time
      return diffMinutes >= -120 && diffMinutes <= 15;
    } catch {
      return false;
    }
  };

  const handleJoinCall = (appt: Appointment) => {
    if (!appt.teleconsult_link) {
      alert('Teleconsultation link has not been generated for this appointment.');
      return;
    }
    setActiveCallLink(appt.teleconsult_link);
    setActiveDoctorName(appt.doctor_name || 'Your Doctor');
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading teleconsultation list...</p>
      </div>
    );
  }

  if (activeCallLink) {
    return (
      <div className="page-content" style={{ padding: '1rem' }}>
        <div className="mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0' }}>📹 Teleconsultation Session</h2>
            <p className="text-gray text-xs">Consulting with Dr. {activeDoctorName}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveCallLink(null)}>
            🚪 Exit Call Screen
          </button>
        </div>

        <div className="teleconsult-container">
          <div className="teleconsult-header">
            <span className="font-semibold">📞 Active Call Room (Jitsi Meet)</span>
            <span className="badge badge-success animate-pulse">● LIVE SECURE SESSION</span>
          </div>
          <div className="teleconsult-iframe-container">
            <iframe
              src={activeCallLink}
              allow="camera; microphone; display-capture; fullscreen"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">📹 Video Teleconsultations</h1>
          <p className="page-subtitle">Join secure virtual doctor visits from remote areas in Gambia</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">📅 Remote Consultation Schedule</span>
          <button className="btn btn-secondary btn-sm" onClick={loadTeleconsults}>🔄 Refresh List</button>
        </div>
        <div className="card-body">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📹</span>
              <h3>No Video Bookings</h3>
              <p>You have no scheduled video appointments. Select 'Teleconsult' option when booking a doctor.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {appointments.map((appt) => {
                const active = isWindowActive(appt.appointment_date, appt.appointment_time);
                return (
                  <div
                    key={appt.id}
                    style={{
                      padding: '1.25rem',
                      background: 'white',
                      border: '1.5px solid var(--gray-200)',
                      borderRadius: 'var(--border-radius)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem' }}>Dr. {appt.doctor_name}</h4>
                      <p className="text-xs text-gray">{appt.specialty_name || 'General Practitioner'}</p>
                      <p className="text-xs font-semibold text-primary" style={{ marginTop: '0.25rem' }}>
                        📆 {appt.appointment_date} at {appt.appointment_time}
                      </p>
                      <span className={`badge ${appt.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem', marginTop: '0.5rem' }}>
                        {appt.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span className="text-xs font-bold text-gray">Consult Fee: GMD {appt.fee}</span>
                      {active ? (
                        <button className="btn btn-primary btn-sm animate-pulse" onClick={() => handleJoinCall(appt)}>
                          📹 Join Room (Active)
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.5 }}>
                          🔒 Room Closed
                        </button>
                      )}
                      <span className="text-gray" style={{ fontSize: '0.65rem' }}>
                        {active ? 'Consultation window is open!' : 'Room opens 15 min prior.'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
