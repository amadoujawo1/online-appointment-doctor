'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function FacilityQueuePage() {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [facility, setFacility] = useState<any>(null);

  // Form states for walk-in patient
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [stats, setStats] = useState({ waiting: 0, called: 0, served: 0, total: 0 });

  async function loadData() {
    try {
      // Find Kololi facility details or fallback
      const facRes = await api.get<any>('/facilities');
      if (facRes.success && facRes.data?.facilities?.length > 0) {
        const kololi = facRes.data.facilities.find((f: any) => f.name.includes('Kololi')) || facRes.data.facilities[0];
        setFacility(kololi);

        // Fetch queue entries for today
        const qRes = await api.get<any>(`/queue?facility_id=${kololi.id}`);
        if (qRes.success && qRes.data) {
          setQueue(qRes.data.queue);
          setStats(qRes.data.stats);
        }

        // Fetch staff doctors
        const detailRes = await api.get<any>(`/facilities/${kololi.id}`);
        if (detailRes.success && detailRes.data?.staff) {
          const docStaff = detailRes.data.staff.filter((s: any) => s.staff_role === 'doctor' || s.staff_role === 'head_doctor');
          setDoctors(docStaff);
        }
      }
    } catch (err) {
      console.error('Failed to load queue details', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Poll every 10 seconds for live board updates
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        facility_id: facility.id,
        patient_name: patientName,
        patient_phone: patientPhone || null,
        reason: reason || null,
        doctor_id: selectedDoctorId || null,
      };

      const res = await api.post<any>('/queue', payload);
      if (res.success) {
        setMessage(res.message || 'Walk-in patient added to queue');
        setPatientName('');
        setPatientPhone('');
        setReason('');
        setSelectedDoctorId('');
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register patient');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCall = async (id: string) => {
    try {
      const res = await api.patch<any>(`/queue/${id}/call`);
      if (res.success) {
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Call failed');
    }
  };

  const handleServe = async (id: string) => {
    const notes = prompt('Enter consultation notes (optional):');
    try {
      const res = await api.patch<any>(`/queue/${id}/serve`, { notes });
      if (res.success) {
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Serve failed');
    }
  };

  const handleSkip = async (id: string) => {
    if (!confirm('Are you sure you want to skip this patient?')) return;
    try {
      const res = await api.patch<any>(`/queue/${id}/skip`);
      if (res.success) {
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Skip failed');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this ticket?')) return;
    try {
      const res = await api.delete<any>(`/queue/${id}`);
      if (res.success) {
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Cancel failed');
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading live queue board...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">🎫 Live Queue Board</h1>
          <p className="page-subtitle">Walk-in reception desk for {facility?.name}</p>
        </div>
      </div>

      <div className="grid-3 mb-8" style={{ gridTemplateColumns: '1.2fr 1.8fr' }}>
        {/* Walk-in patient form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🚶 Register Walk-in Patient</span>
          </div>
          <form onSubmit={handleRegister} className="card-body">
            {message && <div style={{ background: 'var(--success-50)', color: 'var(--success-600)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>{message}</div>}
            {error && <div className="form-error mb-4">{error}</div>}

            <div className="form-group">
              <label className="form-label">Patient Full Name</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Lamin Touray"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (SMS calls)</label>
              <input
                type="tel"
                className="form-control"
                placeholder="e.g. +220-7771234"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
              />
              <span className="text-gray text-xs" style={{ display: 'block', marginTop: '0.25rem' }}>
                For automated SMS call alerts.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Assign to Doctor (Optional)</label>
              <select
                className="form-control"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                <option value="">Any Available Doctor</option>
                {doctors.map((doc) => (
                  <option key={doc.doctor_id} value={doc.doctor_id}>
                    {doc.name} ({doc.specialty_name || 'General'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Visit</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Routine consultation, malaria check"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={formLoading}>
              {formLoading ? 'Registering...' : '🎫 Issue Queue Ticket'}
            </button>
          </form>
        </div>

        {/* Live queue list */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🚨 Active Queue Ticket List</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge badge-warning">{stats.waiting} waiting</span>
              <span className="badge badge-success">{stats.called} called</span>
            </div>
          </div>
          <div className="card-body">
            {queue.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">🎟️</span>
                <h3>Queue is Empty</h3>
                <p>No walk-in patients registered for today.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className={`queue-ticket ${item.status === 'called' ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      padding: '1.25rem',
                      border: '1.5px solid var(--gray-200)',
                      borderRadius: 'var(--border-radius)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ textAlign: 'center', minWidth: '70px', paddingRight: '1rem', borderRight: '1px solid var(--gray-200)' }}>
                        <div className="ticket-num" style={{ margin: '0', fontSize: '1.75rem' }}>#{item.ticket_number}</div>
                        <span className="text-xs text-gray" style={{ textTransform: 'capitalize' }}>{item.status}</span>
                      </div>
                      <div>
                        <h4 style={{ margin: '0' }}>{item.patient_name}</h4>
                        <p className="text-xs text-gray">
                          Doctor: <strong>{item.doctor_name || 'General Assigner'}</strong>
                        </p>
                        {item.reason && <p className="text-xs text-gray truncate" style={{ maxWidth: '200px', marginTop: '0.125rem' }}>Reason: {item.reason}</p>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {item.status === 'waiting' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleCall(item.id)}>
                          📢 Call Patient
                        </button>
                      )}
                      {item.status === 'called' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleServe(item.id)}>
                          ✅ Serve
                        </button>
                      )}
                      {['waiting', 'called'].includes(item.status) && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleSkip(item.id)}>
                            Skip
                          </button>
                          <button className="btn btn-danger btn-sm btn-icon" title="Cancel Ticket" onClick={() => handleCancel(item.id)}>
                            ✕
                          </button>
                        </>
                      )}
                      {item.status === 'served' && (
                        <span className="badge badge-success">✓ Serviced</span>
                      )}
                      {item.status === 'skipped' && (
                        <span className="badge badge-gray">Skipped</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
