'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function DoctorReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [sentReferrals, setSentReferrals] = useState<any[]>([]);
  const [receivedReferrals, setReceivedReferrals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);

  // Form states
  const [patientId, setPatientId] = useState('');
  const [toDoctorId, setToDoctorId] = useState('');
  const [toSpecialtyId, setToSpecialtyId] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergency'>('routine');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    try {
      // Fetch referrals
      const refRes = await api.get<any>('/referrals');
      if (refRes.success && refRes.data) {
        setSentReferrals(refRes.data.sent || []);
        setReceivedReferrals(refRes.data.received || []);
      }

      // Fetch patient selection list
      const apptRes = await api.get<any>('/appointments');
      if (apptRes.success && apptRes.data?.appointments) {
        const uniquePatientsMap = new Map();
        apptRes.data.appointments.forEach((appt: any) => {
          if (appt.patient_id) {
            uniquePatientsMap.set(appt.patient_id, {
              id: appt.patient_id,
              name: appt.patient_name || 'Unnamed Patient',
            });
          }
        });
        setPatients(Array.from(uniquePatientsMap.values()));
      }

      // Fetch other doctors for referral target
      const docRes = await api.get<any>('/doctors');
      if (docRes.success && docRes.data?.doctors) {
        setDoctors(docRes.data.doctors);
      }

      // Fetch specialties
      const specRes = await api.get<any>('/specialties');
      if (specRes.success && specRes.data) {
        setSpecialties(specRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSendReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        patient_id: patientId,
        to_doctor_id: toDoctorId || null,
        to_specialty_id: toSpecialtyId || null,
        urgency,
        reason,
        notes,
      };

      const res = await api.post<any>('/referrals', payload);
      if (res.success) {
        setMessage('Referral submitted successfully to specialist.');
        setPatientId('');
        setToDoctorId('');
        setToSpecialtyId('');
        setUrgency('routine');
        setReason('');
        setNotes('');
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit referral');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, action: 'accept' | 'complete' | 'decline') => {
    let notesInput = null;
    if (action === 'complete' || action === 'decline') {
      notesInput = prompt('Enter notes for this action:');
    }

    try {
      const res = await api.patch<any>(`/referrals/${id}/${action}`, { notes: notesInput });
      if (res.success) {
        alert(`Referral ${action}ed successfully`);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading patient referrals...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏥 Patient Referral Management</h1>
          <p className="page-subtitle">Refer patients to Gambian specialists and track received referrals</p>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1.2fr 1.8fr' }}>
        {/* Send Referral form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📤 Refer Patient to Specialist</span>
          </div>
          <form onSubmit={handleSendReferral} className="card-body">
            {message && <div style={{ background: 'var(--success-50)', color: 'var(--success-600)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>{message}</div>}
            {error && <div className="form-error mb-4">{error}</div>}

            <div className="form-group">
              <label className="form-label">Select Patient</label>
              <select
                required
                className="form-control"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              >
                <option value="">-- Choose Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Specialist Doctor Target</label>
              <select
                className="form-control"
                value={toDoctorId}
                onChange={(e) => {
                  setToDoctorId(e.target.value);
                  if (e.target.value) setToSpecialtyId(''); // exclusive
                }}
              >
                <option value="">-- Select Specialist Doctor --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty_name || 'GP'} — {d.clinic_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Or Target Specialty Department</label>
              <select
                className="form-control"
                value={toSpecialtyId}
                onChange={(e) => {
                  setToSpecialtyId(e.target.value);
                  if (e.target.value) setToDoctorId(''); // exclusive
                }}
              >
                <option value="">-- Select Specialty --</option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Urgency Level</label>
              <select
                className="form-control"
                value={urgency}
                onChange={(e: any) => setUrgency(e.target.value)}
              >
                <option value="routine">🟢 Routine</option>
                <option value="urgent">🟡 Urgent</option>
                <option value="emergency">🔴 Emergency</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Referral</label>
              <textarea
                className="form-control"
                required
                rows={3}
                placeholder="Diagnostic query, specialist second opinion required, complex treatment needed"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Referral Notes</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Include medical history highlights, lab findings"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={formLoading}>
              {formLoading ? 'Submitting Referral...' : '📤 Send Referral'}
            </button>
          </form>
        </div>

        {/* List of Referrals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Received referrals */}
          <div className="card">
            <div className="card-header">
              <span className="card-title font-semibold">📥 Referrals Received from Colleagues</span>
              <span className="badge badge-success">{receivedReferrals.length} received</span>
            </div>
            <div className="card-body">
              {receivedReferrals.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--gray-400)' }}>No incoming referrals.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {receivedReferrals.map((ref) => (
                    <div
                      key={ref.id}
                      style={{
                        padding: '1.25rem',
                        background: 'var(--gray-50)',
                        border: '1px solid var(--gray-200)',
                        borderRadius: 'var(--border-radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className={`badge ${ref.urgency === 'emergency' ? 'badge-danger' : ref.urgency === 'urgent' ? 'badge-warning' : 'badge-primary'}`}>
                            {ref.urgency.toUpperCase()}
                          </span>
                          <h4 style={{ margin: '0.35rem 0 0.15rem' }}>Patient: {ref.patient_name}</h4>
                          <p className="text-xs text-gray">
                            From GP: <strong>{ref.from_doctor_name}</strong>
                          </p>
                        </div>
                        <span className={`badge ${ref.status === 'completed' ? 'badge-success' : ref.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                          {ref.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--gray-100)', margin: '0.75rem 0', fontSize: '0.875rem' }}>
                        <strong>Reason:</strong> {ref.reason}
                        {ref.notes && <p className="text-xs text-gray" style={{ marginTop: '0.25rem' }}>Notes: {ref.notes}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {ref.status === 'pending' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(ref.id, 'accept')}>Accept</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleStatusUpdate(ref.id, 'decline')}>Decline</button>
                          </>
                        )}
                        {ref.status === 'accepted' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(ref.id, 'complete')}>Mark Completed</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sent referrals */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📤 Referrals Sent out</span>
              <span className="badge badge-gray">{sentReferrals.length} sent</span>
            </div>
            <div className="card-body">
              {sentReferrals.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--gray-400)' }}>You haven't referred any patient.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sentReferrals.map((ref) => (
                    <div
                      key={ref.id}
                      style={{
                        padding: '1rem',
                        background: 'var(--gray-50)',
                        border: '1px solid var(--gray-200)',
                        borderRadius: 'var(--border-radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <p className="font-semibold text-sm">Patient: {ref.patient_name}</p>
                        <p className="text-xs text-gray">Target Specialist: {ref.to_doctor_name || ref.to_specialty_name}</p>
                        <p className="text-xs text-gray">Status: <strong>{ref.status}</strong></p>
                      </div>
                      <span className={`badge ${ref.urgency === 'emergency' ? 'badge-danger' : ref.urgency === 'urgent' ? 'badge-warning' : 'badge-primary'}`}>
                        {ref.urgency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
