'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function DoctorPrescriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  // Create form states
  const [patientId, setPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [meds, setMeds] = useState<{ name: string; dosage: string; frequency: string; duration: string }[]>([]);

  // Individual med form fields
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFreq, setMedFreq] = useState('');
  const [medDur, setMedDur] = useState('');

  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [selectedRx, setSelectedRx] = useState<any>(null);

  async function loadData() {
    try {
      // Fetch doctor prescriptions
      const rxRes = await api.get<any>('/prescriptions');
      if (rxRes.success && rxRes.data?.prescriptions) {
        setPrescriptions(rxRes.data.prescriptions);
      }

      // Fetch patients they have appointments with
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const addMedication = () => {
    if (!medName || !medDosage || !medFreq || !medDur) {
      alert('Fill all medication fields (name, dosage, frequency, duration)');
      return;
    }
    setMeds([...meds, { name: medName, dosage: medDosage, frequency: medFreq, duration: medDur }]);
    setMedName('');
    setMedDosage('');
    setMedFreq('');
    setMedDur('');
  };

  const removeMed = (index: number) => {
    setMeds(meds.filter((_, i) => i !== index));
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (meds.length === 0) {
      setError('Add at least one medication to the prescription.');
      return;
    }

    setFormLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        patient_id: patientId,
        diagnosis,
        medications: meds,
        instructions,
        valid_until: validUntil || null,
      };

      const res = await api.post<any>('/prescriptions', payload);
      if (res.success) {
        setMessage('Prescription issued successfully!');
        setPatientId('');
        setDiagnosis('');
        setInstructions('');
        setValidUntil('');
        setMeds([]);
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create prescription');
    } finally {
      setFormLoading(false);
    }
  };

  const viewRxDetails = async (id: string) => {
    try {
      const res = await api.get<any>(`/prescriptions/${id}`);
      if (res.success && res.data) {
        setSelectedRx(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch details');
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading electronic prescriptions...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 Electronic Prescriptions</h1>
          <p className="page-subtitle">Issue digital prescriptions with formal Medical Council format</p>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1.2fr 1.8fr' }}>
        {/* Create Rx card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">✍️ Issue New Prescription (Rx)</span>
          </div>
          <form onSubmit={handleCreatePrescription} className="card-body">
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
              <label className="form-label">Diagnosis / Impression</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Hypertension, Uncomplicated Malaria"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div className="divider"></div>

            {/* Med dynamic builder */}
            <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1rem' }}>
              <span className="form-label font-bold">💊 Add Medication</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Medication Name"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Dosage (e.g. 500mg)"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Frequency (e.g. 3x Daily)"
                  value={medFreq}
                  onChange={(e) => setMedFreq(e.target.value)}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Duration (e.g. 5 Days)"
                  value={medDur}
                  onChange={(e) => setMedDur(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-full"
                style={{ marginTop: '0.75rem' }}
                onClick={addMedication}
              >
                ＋ Add to List
              </button>
            </div>

            {/* Added meds table */}
            {meds.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <span className="text-xs text-gray font-bold">Medications List:</span>
                <ul style={{ fontSize: '0.825rem', paddingLeft: '1.25rem', marginTop: '0.25rem', color: 'var(--gray-700)' }}>
                  {meds.map((m, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>
                      <strong>{m.name}</strong> {m.dosage} — {m.frequency} for {m.duration}
                      <button type="button" style={{ color: 'var(--danger-500)', border: 'none', background: 'none', marginLeft: '0.5rem', cursor: 'pointer' }} onClick={() => removeMed(idx)}>✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">General Advice / Instructions</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Take before food, drink plenty of water"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Valid Until Date (Optional)</label>
              <input
                type="date"
                className="form-control"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={formLoading}>
              {formLoading ? 'Submitting Rx...' : '✍️ Seal & Issue Prescription'}
            </button>
          </form>
        </div>

        {/* Prescription list */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Issued Rx History</span>
          </div>
          <div className="card-body">
            {prescriptions.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">📋</span>
                <h3>No Prescriptions</h3>
                <p>You have not issued any prescriptions yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
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
                      <p className="font-semibold text-sm">Patient: {rx.patient_name}</p>
                      <p className="text-xs text-gray">Diagnosis: {rx.diagnosis || 'General'}</p>
                      <p className="text-xs text-gray">Issued on: {rx.created_at.split(' ')[0]}</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => viewRxDetails(rx.id)}>
                      🔎 View Formal Rx
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formal Rx Modal overlay */}
      {selectedRx && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <span className="card-title">🩺 Official Medical Prescription (Rx)</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRx(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="prescription-med-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--gray-800)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ margin: '0' }}>{selectedRx.facility_name || selectedRx.clinic_name || 'MediBook Medical Clinic'}</h3>
                    <p className="text-xs text-gray">{selectedRx.facility_address || selectedRx.clinic_address || 'The Gambia'}</p>
                    <p className="text-xs text-gray">Phone: {selectedRx.facility_phone || '+220-777-1234'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="font-bold text-primary">Dr. {selectedRx.doctor_name}</p>
                    <p className="text-xs text-gray">{selectedRx.qualification}</p>
                    <p className="text-xs text-gray">Medical License: <strong>{selectedRx.license_number || 'MDCG-TEMP-998'}</strong></p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', fontSize: '0.85rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--gray-200)' }}>
                  <div>
                    <p>Patient Name: <strong>{selectedRx.patient_name}</strong></p>
                    <p>Patient Contact: {selectedRx.patient_phone || 'N/A'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p>Date: <strong>{selectedRx.created_at.split(' ')[0]}</strong></p>
                    <p>Diagnosis: <strong>{selectedRx.diagnosis}</strong></p>
                  </div>
                </div>

                <div className="prescription-rx">℞</div>

                <table className="prescription-med-table">
                  <thead>
                    <tr>
                      <th>Medication (Generic / Brand)</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRx.medications.map((m: any, idx: number) => (
                      <tr key={idx}>
                        <td><strong>{m.name}</strong></td>
                        <td>{m.dosage}</td>
                        <td>{m.frequency}</td>
                        <td>{m.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {selectedRx.instructions && (
                  <div style={{ marginTop: '1.5rem', background: 'var(--gray-50)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}>
                    <strong>Rx Instructions:</strong> {selectedRx.instructions}
                  </div>
                )}

                <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    {selectedRx.valid_until && <p>Valid until: {selectedRx.valid_until}</p>}
                    <p>Formally signed electronically via MediBook</p>
                  </div>
                  <div style={{ borderTop: '1px solid var(--gray-400)', width: '180px', textAlign: 'center', paddingTop: '0.25rem', fontSize: '0.85rem' }}>
                    Doctor's Signature / Stamp
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Print Rx</button>
              <button className="btn btn-primary" onClick={() => setSelectedRx(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
