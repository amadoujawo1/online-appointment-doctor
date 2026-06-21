'use client';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

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
  cancellation_reason?: string;
}

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [viewPatient, setViewPatient] = useState<Appointment | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: { appointments: Appointment[] } }>('/appointments');
      if (res.data?.success) {
        setAppointments(res.data.data.appointments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string, notes?: string) {
    try {
      setActionLoading(true);
      await api.patch(`/appointments/${id}/status`, { status, notes });
      setCompleteId(null);
      setConsultationNotes('');
      fetchAppointments();
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setActionLoading(false);
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

  const filteredAppointments = appointments.filter(appt => {
    // Role status filter
    if (activeTab !== 'all' && appt.status !== activeTab) return false;
    // Patient name search
    if (search && !appt.patient_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointment Management</h1>
          <p className="page-subtitle">Track consultation records, search patient logs, and manage today's schedule.</p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="card mb-6">
        <div className="card-body" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '280px', borderRadius: '8px' }}>
            <input
              type="text"
              placeholder="Search patients by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.5rem 0.875rem' }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          All Appointments ({appointments.length})
        </button>
        <button className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          Pending ({appointments.filter(a => a.status === 'pending').length})
        </button>
        <button className={`tab-btn ${activeTab === 'confirmed' ? 'active' : ''}`} onClick={() => setActiveTab('confirmed')}>
          Confirmed ({appointments.filter(a => a.status === 'confirmed').length})
        </button>
        <button className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
          Completed ({appointments.filter(a => a.status === 'completed').length})
        </button>
        <button className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`} onClick={() => setActiveTab('cancelled')}>
          Cancelled ({appointments.filter(a => a.status === 'cancelled').length})
        </button>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading records...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No appointments found</h3>
            <p>We couldn't find any appointment matching the selected criteria.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredAppointments.map(appt => (
            <div key={appt.id} className="card card-hover" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setViewPatient(appt)}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-900)' }}>{appt.patient_name}</span>
                    <span className={`badge ${getStatusBadgeClass(appt.status)}`}>{appt.status}</span>
                  </div>
                  <div className="text-sm text-gray" style={{ marginTop: '0.25rem' }}>
                    📅 {new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • ⏰ {appt.appointment_time}
                  </div>
                  <div className="text-xs text-primary font-semibold mt-1">
                    👤 {appt.patient_gender || 'N/A'} • {appt.patient_dob ? `${new Date().getFullYear() - new Date(appt.patient_dob).getFullYear()} yrs` : 'N/A'} • Blood: {appt.patient_blood_group || 'N/A'}
                  </div>
                  {appt.reason && (
                    <div className="text-xs text-gray mt-2" style={{ fontStyle: 'italic' }}>
                      Reason: "{appt.reason}"
                    </div>
                  )}
                  {appt.notes && (
                    <div className="text-xs text-success font-semibold mt-1">
                      My Consultation Notes: "{appt.notes}"
                    </div>
                  )}
                  {appt.cancellation_reason && (
                    <div className="text-xs text-danger font-semibold mt-1">
                      Cancellation Reason: "{appt.cancellation_reason}"
                    </div>
                  )}
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
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient Profile Modal */}
      {viewPatient && (
        <div className="modal-overlay" onClick={() => setViewPatient(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="card-title">Patient Intake Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewPatient(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="grid-2">
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Patient Name</label>
                    <p style={{ fontWeight: 600 }}>{viewPatient.patient_name}</p>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Phone Number</label>
                    <p style={{ fontWeight: 600 }}>{viewPatient.patient_phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Gender</label>
                    <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{viewPatient.patient_gender || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Date of Birth</label>
                    <p style={{ fontWeight: 600 }}>{viewPatient.patient_dob || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Blood Group</label>
                    <p style={{ fontWeight: 600 }}>{viewPatient.patient_blood_group || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Reason for Visit</label>
                  <p className="text-sm" style={{ padding: '0.5rem', background: 'var(--gray-50)', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                    "{viewPatient.reason || 'None provided'}"
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setViewPatient(null)}>Close Record</button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
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
              <button type="submit" className="btn btn-success" disabled={actionLoading}>
                {actionLoading ? 'Submitting...' : 'Mark Consultation Complete'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
