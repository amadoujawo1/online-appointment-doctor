'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface PatientProfile {
  id: string;
  blood_group: string;
  gender: string;
  date_of_birth: string;
  allergies: string;
  current_medications: string;
  medical_history: string;
}

interface Appointment {
  id: string;
  doctor_name: string;
  doctor_avatar: string;
  specialty_name: string;
  clinic_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  fee: number;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const [profileRes, appointmentsRes] = await Promise.all([
        api.get<{ success: boolean; data: PatientProfile }>('/patients/me'),
        api.get<{ success: boolean; data: { appointments: Appointment[] } }>('/appointments?limit=5'),
      ]);

      if (profileRes.data?.success) setProfile(profileRes.data.data);
      if (appointmentsRes.data?.success) setAppointments(appointmentsRes.data.data.appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelId) return;
    try {
      setCancelLoading(true);
      await api.delete(`/appointments/${cancelId}`, { cancellation_reason: cancelReason });
      setCancelId(null);
      setCancelReason('');
      // Refresh
      const appointmentsRes = await api.get<{ success: boolean; data: { appointments: Appointment[] } }>('/appointments?limit=5');
      if (appointmentsRes.data?.success) setAppointments(appointmentsRes.data.data.appointments);
    } catch (err) {
      alert('Failed to cancel appointment. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      case 'completed': return 'badge-primary';
      default: return 'badge-gray';
    }
  }

  function formatFriendlyDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  const upcoming = appointments.filter(a => ['pending', 'confirmed', 'rescheduled'].includes(a.status));
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name}!</h1>
          <p className="page-subtitle">Manage your consultations, view medical profile, and search specialists.</p>
        </div>
        <div>
          <Link href="/doctors" className="btn btn-primary">
            🔍 Book New Appointment
          </Link>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="stats-grid mb-6">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">📅</div>
          <div>
            <div className="stat-value">{appointments.length}</div>
            <div className="stat-label">Total Appointments</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">⏳</div>
          <div>
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending Confirmation</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green">✅</div>
          <div>
            <div className="stat-value">{completedCount}</div>
            <div className="stat-label">Completed Consults</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-teal">🩺</div>
          <div>
            <div className="stat-value">{profile?.blood_group || 'N/A'}</div>
            <div className="stat-label">Blood Group</div>
          </div>
        </div>
      </div>

      <div className="grid-3 mb-6" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Appointments Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Upcoming Appointments</h2>
            <Link href="/patient/appointments" className="nav-link" style={{ fontSize: '0.85rem' }}>View All</Link>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <div className="empty-state-icon">📅</div>
                <h3>No upcoming appointments</h3>
                <p className="mb-4">You do not have any pending or confirmed sessions scheduled.</p>
                <Link href="/doctors" className="btn btn-secondary btn-sm">Find a Doctor</Link>
              </div>
            ) : (
              upcoming.map(appt => (
                <div key={appt.id} className="appointment-card">
                  <div className="appointment-date-badge">
                    <div className="day">{appt.appointment_date.split('-')[2]}</div>
                    <div className="month">
                      {new Date(appt.appointment_date + 'T00:00:00').toLocaleString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Dr. {appt.doctor_name}</span>
                      <span className={`badge ${getStatusBadgeClass(appt.status)}`}>{appt.status}</span>
                    </div>
                    <div className="text-sm text-gray">{appt.specialty_name} • {appt.clinic_name}</div>
                    <div className="text-xs text-primary font-semibold mt-1">⏰ {appt.appointment_time}</div>
                  </div>
                  <div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setCancelId(appt.id)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Profile Snapshot */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Medical Summary</h2>
            <Link href="/patient/profile" className="nav-link" style={{ fontSize: '0.85rem' }}>Edit</Link>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Allergies</span>
                <p className="text-sm" style={{ fontWeight: 500, color: profile?.allergies ? 'var(--danger-500)' : 'var(--gray-600)' }}>
                  {profile?.allergies || 'No known allergies reported.'}
                </p>
              </div>
              <div className="divider" style={{ margin: '0.25rem 0' }}></div>
              <div>
                <span className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Current Medications</span>
                <p className="text-sm" style={{ fontWeight: 500, color: 'var(--gray-800)' }}>
                  {profile?.current_medications || 'None active.'}
                </p>
              </div>
              <div className="divider" style={{ margin: '0.25rem 0' }}></div>
              <div>
                <span className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Chronic Conditions / History</span>
                <p className="text-sm" style={{ fontWeight: 500, color: 'var(--gray-800)' }}>
                  {profile?.medical_history || 'No medical conditions noted.'}
                </p>
              </div>
              <div className="divider" style={{ margin: '0.25rem 0' }}></div>
              <div className="grid-2">
                <div>
                  <span className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Gender</span>
                  <p className="text-sm" style={{ fontWeight: 600, color: 'var(--gray-800)', textTransform: 'capitalize' }}>
                    {profile?.gender || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Date of Birth</span>
                  <p className="text-sm" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                    {profile?.date_of_birth ? formatFriendlyDate(profile.date_of_birth) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancelId && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={handleCancelAppointment}>
            <div className="modal-header">
              <h3 className="card-title">Cancel Appointment</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCancelId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm mb-4" style={{ color: 'var(--gray-600)' }}>
                Are you sure you want to cancel this appointment? Please let the doctor know why.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Cancellation</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g., Change of plans, conflict with work schedule"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setCancelId(null)}>
                Keep Appointment
              </button>
              <button type="submit" className="btn btn-danger" disabled={cancelLoading}>
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
