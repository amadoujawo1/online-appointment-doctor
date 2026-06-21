'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface DoctorProfile {
  id: string;
  rating: number;
  total_reviews: number;
  is_verified: number;
  reviews: Review[];
}

interface Review {
  id: string;
  patient_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Appointment {
  id: string;
  patient_name: string;
  patient_avatar: string;
  patient_phone: string;
  patient_gender: string;
  patient_dob: string;
  patient_blood_group: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
  fee: number;
  notes?: string;
}

interface PatientDetails {
  name: string;
  phone: string;
  gender: string;
  dob: string;
  blood_group: string;
}

export default function DoctorDashboard() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Patient detail modal
  const [viewPatient, setViewPatient] = useState<Appointment | null>(null);

  // Complete appointment notes modal
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const [profileRes, appointmentsRes] = await Promise.all([
        api.get<{ success: boolean; data: DoctorProfile }>('/doctors/me'),
        api.get<{ success: boolean; data: { appointments: Appointment[] } }>('/appointments'),
      ]);

      if (profileRes.data?.success) setProfile(profileRes.data.data);
      if (appointmentsRes.data?.success) setAppointments(appointmentsRes.data.data.appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string, notes?: string) {
    try {
      setStatusLoading(true);
      await api.patch(`/appointments/${id}/status`, { status, notes });
      setCompleteId(null);
      setConsultationNotes('');
      // Refresh
      const appointmentsRes = await api.get<{ success: boolean; data: { appointments: Appointment[] } }>('/appointments');
      if (appointmentsRes.data?.success) setAppointments(appointmentsRes.data.data.appointments);
      
      const profileRes = await api.get<{ success: boolean; data: DoctorProfile }>('/doctors/me');
      if (profileRes.data?.success) setProfile(profileRes.data.data);
    } catch (err) {
      alert('Failed to update appointment status.');
    } finally {
      setStatusLoading(false);
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      case 'completed': return 'badge-primary';
      case 'rescheduled': return 'badge-primary';
      default: return 'badge-gray';
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.appointment_date === todayStr && a.status !== 'cancelled');
  const pendingRequests = appointments.filter(a => a.status === 'pending');
  const completedAppts = appointments.filter(a => a.status === 'completed');

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading doctor dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctor Dashboard</h1>
          <p className="page-subtitle">Manage today's schedule, review patient intake forms, and respond to booking requests.</p>
        </div>
        {!profile?.is_verified && (
          <div className="badge badge-danger" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
            ⚠️ Account Pending Verification by Administrator
          </div>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="stats-grid mb-6">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">📅</div>
          <div>
            <div className="stat-value">{todayAppts.length}</div>
            <div className="stat-label">Today's Schedule</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">⏳</div>
          <div>
            <div className="stat-value">{pendingRequests.length}</div>
            <div className="stat-label">Pending Requests</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green">✅</div>
          <div>
            <div className="stat-value">{completedAppts.length}</div>
            <div className="stat-label">Total Consults Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-teal">⭐</div>
          <div>
            <div className="stat-value">{profile?.rating ? `${profile.rating} / 5` : 'N/A'}</div>
            <div className="stat-label">{profile?.total_reviews || 0} Patient Reviews</div>
          </div>
        </div>
      </div>

      <div className="grid-3 mb-6" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Main Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Today's Schedule */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Today's Appointments ({todayAppts.length})</h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {todayAppts.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <p>No consultations scheduled for today.</p>
                </div>
              ) : (
                todayAppts.map(appt => (
                  <div key={appt.id} className="appointment-card" style={{ cursor: 'pointer' }} onClick={() => setViewPatient(appt)}>
                    <div className="appointment-date-badge" style={{ backgroundColor: 'var(--success-50)', borderColor: 'var(--success-600)' }}>
                      <div className="day" style={{ color: 'var(--success-600)' }}>⏰</div>
                      <div className="month" style={{ color: 'var(--success-600)' }}>{appt.appointment_time}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{appt.patient_name}</span>
                        <span className={`badge ${getStatusBadgeClass(appt.status)}`}>{appt.status}</span>
                      </div>
                      <div className="text-sm text-gray">Reason: "{appt.reason || 'Routine checkup'}"</div>
                      <div className="text-xs text-primary font-semibold mt-1">
                        👤 {appt.patient_gender || 'N/A'} • {appt.patient_dob ? `${new Date().getFullYear() - new Date(appt.patient_dob).getFullYear()} yrs` : 'N/A'} • Blood: {appt.patient_blood_group || 'N/A'}
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      {appt.status === 'confirmed' && (
                        <button className="btn btn-success btn-sm" onClick={() => setCompleteId(appt.id)}>
                          Complete
                        </button>
                      )}
                      {appt.status === 'pending' && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => updateStatus(appt.id, 'confirmed')}>
                            Confirm
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => updateStatus(appt.id, 'cancelled')}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Requests */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Pending Booking Requests ({pendingRequests.length})</h2>
              <Link href="/doctor/appointments" className="nav-link" style={{ fontSize: '0.85rem' }}>Manage All</Link>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingRequests.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <p>No pending appointment requests.</p>
                </div>
              ) : (
                pendingRequests.map(appt => (
                  <div key={appt.id} className="appointment-card">
                    <div className="appointment-date-badge">
                      <div className="day">{appt.appointment_date.split('-')[2]}</div>
                      <div className="month">
                        {new Date(appt.appointment_date + 'T00:00:00').toLocaleString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{appt.patient_name}</div>
                      <div className="text-sm text-gray">⏰ {appt.appointment_time} • Fee: ${appt.fee}</div>
                      <div className="text-xs text-gray" style={{ marginTop: '0.25rem' }}>Reason: "{appt.reason || 'None'}"</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" onClick={() => updateStatus(appt.id, 'confirmed')}>
                        Accept
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => updateStatus(appt.id, 'cancelled')}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Reviews */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Feedback</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
            {!profile?.reviews || profile.reviews.length === 0 ? (
              <p className="text-sm text-center text-gray" style={{ padding: '2rem 0' }}>No reviews submitted yet.</p>
            ) : (
              profile.reviews.map(rev => (
                <div key={rev.id} style={{ borderBottom: '1px solid var(--gray-100)', paddingBottom: '0.75rem' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{rev.patient_name}</span>
                    <span style={{ color: 'var(--warning-500)', fontSize: '0.8rem' }}>
                      {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                    </span>
                  </div>
                  <p className="text-xs text-gray" style={{ fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{rev.comment}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Patient Intake Modal */}
      {viewPatient && (
        <div className="modal-overlay" onClick={() => setViewPatient(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="card-title">Patient Records: {viewPatient.patient_name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewPatient(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="grid-2">
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Date of Birth</label>
                    <p style={{ fontWeight: 600 }}>{viewPatient.patient_dob ? new Date(viewPatient.patient_dob + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Gender</label>
                    <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{viewPatient.patient_gender || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid-2">
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Blood Group</label>
                    <p style={{ fontWeight: 600 }}>{viewPatient.patient_blood_group || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Phone Number</label>
                    <p style={{ fontWeight: 600 }}>{viewPatient.patient_phone || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Reason for Consultation</label>
                  <p className="text-sm" style={{ padding: '0.5rem', background: 'var(--gray-50)', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                    "{viewPatient.reason || 'None provided'}"
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setViewPatient(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Consultation notes (Complete appointment) Modal */}
      {completeId && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={e => {
            e.preventDefault();
            updateStatus(completeId, 'completed', consultationNotes);
          }}>
            <div className="modal-header">
              <h3 className="card-title">Consultation Summary</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompleteId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Diagnosis / Prescription / Treatment Notes</label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="Record prescription or visit details. This will be shared with the patient."
                  value={consultationNotes}
                  onChange={e => setConsultationNotes(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setCompleteId(null)}>Cancel</button>
              <button type="submit" className="btn btn-success" disabled={statusLoading}>
                {statusLoading ? 'Submitting...' : 'Mark Consultation Complete'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
