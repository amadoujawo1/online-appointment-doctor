'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function DoctorCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<any[]>([]);

  async function loadSchedule() {
    setLoading(true);
    try {
      const res = await api.get<any>(`/appointments?date=${selectedDate}`);
      if (res.success && res.data?.appointments) {
        setAppointments(res.data.appointments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, [selectedDate]);

  // Generate hourly slots from 08:00 to 18:00
  const hourSlots = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8;
    return `${String(hour).padStart(2, '0')}:00`;
  });

  const getAppointmentsForHour = (hourStr: string) => {
    const hourPrefix = hourStr.slice(0, 2);
    return appointments.filter((appt) => appt.appointment_time.startsWith(hourPrefix));
  };

  const handleJoinTeleconsult = (link: string) => {
    if (!link) return;
    window.open(link, '_blank');
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Daily Appointment Calendar</h1>
          <p className="page-subtitle">Visual daily timeline for consultation bookings</p>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1fr 2.5fr', alignItems: 'flex-start' }}>
        {/* Date Picker & Stats Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">📅 Choose Day</span>
            </div>
            <div className="card-body">
              <div className="form-group" style={{ margin: '0' }}>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">📊 Day Metrics</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span className="text-gray">Total Bookings:</span>
                  <strong className="text-primary">{appointments.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span className="text-gray">In-Person:</span>
                  <strong>{appointments.filter(a => a.appointment_type === 'in_person').length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span className="text-gray">Video Teleconsult:</span>
                  <strong>{appointments.filter(a => a.appointment_type === 'teleconsult').length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span className="text-gray">Walk-in Tickets:</span>
                  <strong>{appointments.filter(a => a.appointment_type === 'walk_in').length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hour timeline */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Hours Timeline — {selectedDate}</span>
            <button className="btn btn-secondary btn-sm" onClick={loadSchedule} disabled={loading}>🔄 Sync</button>
          </div>
          <div className="card-body" style={{ padding: '1.5rem 2.5rem' }}>
            {loading ? (
              <div className="loading-overlay" style={{ padding: '2rem 0' }}>
                <div className="spinner spinner-sm"></div>
                <p>Loading timeline...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {hourSlots.map((hour) => {
                  const hourAppts = getAppointmentsForHour(hour);
                  return (
                    <div
                      key={hour}
                      style={{
                        display: 'flex',
                        borderBottom: '1px solid var(--gray-100)',
                        padding: '1.25rem 0',
                        minHeight: '85px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div style={{ width: '80px', flexShrink: 0, fontWeight: 700, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                        {hour}
                      </div>

                      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {hourAppts.length === 0 ? (
                          <div style={{ color: 'var(--gray-300)', fontSize: '0.85rem', fontStyle: 'italic', paddingTop: '0.125rem' }}>
                            -- Free Slot --
                          </div>
                        ) : (
                          hourAppts.map((appt) => (
                            <div
                              key={appt.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: appt.appointment_type === 'teleconsult' ? 'var(--primary-50)' : appt.appointment_type === 'walk_in' ? 'var(--success-50)' : 'var(--gray-50)',
                                borderLeft: `4px solid ${appt.appointment_type === 'teleconsult' ? 'var(--primary-500)' : appt.appointment_type === 'walk_in' ? 'var(--success-500)' : 'var(--gray-400)'}`,
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--border-radius-sm)',
                                borderTop: '1px solid rgba(0,0,0,0.02)',
                                borderRight: '1px solid rgba(0,0,0,0.02)',
                                borderBottom: '1px solid rgba(0,0,0,0.02)'
                              }}
                            >
                              <div>
                                <p className="font-semibold text-sm" style={{ margin: '0' }}>{appt.patient_name}</p>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                                  <span className="text-xs text-gray">{appt.appointment_time}</span>
                                  <span className={`badge ${appt.appointment_type === 'teleconsult' ? 'badge-primary' : appt.appointment_type === 'walk_in' ? 'badge-success' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                                    {appt.appointment_type.toUpperCase()}
                                  </span>
                                  <span className={`badge ${appt.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                                    {appt.status}
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {appt.appointment_type === 'teleconsult' && appt.teleconsult_link && (
                                  <button
                                    onClick={() => handleJoinTeleconsult(appt.teleconsult_link)}
                                    className="btn btn-primary btn-sm"
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  >
                                    📹 Join Jitsi Call
                                  </button>
                                )}
                                <span className="text-xs font-bold text-gray">GMD {appt.fee}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
