'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AdminFacilitiesPage() {
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Form states for creating facility
  const [name, setName] = useState('');
  const [type, setType] = useState('clinic');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [license, setLicense] = useState('');
  const [description, setDescription] = useState('');

  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Staff association state
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [staffUserId, setStaffUserId] = useState('');
  const [staffRole, setStaffRole] = useState('doctor');

  async function loadData() {
    try {
      const res = await api.get<any>('/facilities');
      if (res.success && res.data?.facilities) {
        setFacilities(res.data.facilities);
      }

      // Fetch all users to assign as staff
      const userRes = await api.get<any>('/admin/users?limit=100');
      if (userRes.success && userRes.data?.users) {
        // Only include doctors and receptionists
        const eligible = userRes.data.users.filter(
          (u: any) => u.role === 'doctor' || u.role === 'receptionist'
        );
        setUsers(eligible);
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

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        name,
        type,
        address,
        city,
        region,
        phone,
        email,
        license_number: license,
        description,
      };

      const res = await api.post<any>('/facilities', payload);
      if (res.success) {
        setMessage('Facility created successfully!');
        setName('');
        setAddress('');
        setCity('');
        setRegion('');
        setPhone('');
        setEmail('');
        setLicense('');
        setDescription('');
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create facility');
    } finally {
      setFormLoading(false);
    }
  };

  const handleVerify = async (id: string, currentStatus: number) => {
    try {
      const res = await api.put<any>(`/facilities/${id}`, { is_verified: currentStatus === 1 ? 0 : 1 });
      if (res.success) {
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Verification update failed');
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId || !staffUserId) return;
    try {
      const res = await api.post<any>(`/facilities/${selectedFacilityId}/staff`, {
        user_id: staffUserId,
        staff_role: staffRole,
      });
      if (res.success) {
        alert('Staff member linked successfully!');
        setStaffUserId('');
        setSelectedFacilityId(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to link staff');
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading facilities panel...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏥 Facility & Hospital Manager</h1>
          <p className="page-subtitle">Configure healthcare clinics, verify credentials, and allocate staff</p>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1.2fr 1.8fr' }}>
        {/* Create Facility Form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">➕ Register Facility</span>
          </div>
          <form onSubmit={handleCreateFacility} className="card-body">
            {message && <div style={{ background: 'var(--success-50)', color: 'var(--success-600)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>{message}</div>}
            {error && <div className="form-error mb-4">{error}</div>}

            <div className="form-group">
              <label className="form-label">Facility Name</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Edward Francis Small Teaching Hospital"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-control"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="clinic">Clinic</option>
                <option value="hospital">Hospital</option>
                <option value="health_centre">Health Centre</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Independence Drive"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Banjul"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="West Coast Region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Official Phone</label>
              <input
                type="text"
                className="form-control"
                placeholder="+220-422xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="facility@health.gov.gm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gambia Medical Council License</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. MDCG-HOSP-001"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Brief Description</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Tertiary teaching facility, specialized care units..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={formLoading}>
              {formLoading ? 'Creating...' : '➕ Register Facility'}
            </button>
          </form>
        </div>

        {/* Facility Lists */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Registered Facilities</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Facility Info</th>
                  <th>License / Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((fac) => (
                  <tr key={fac.id}>
                    <td>
                      <strong>{fac.name}</strong>
                      <div style={{ marginTop: '0.125rem' }}>
                        <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                          {fac.type.replace('_', ' ')}
                        </span>
                        {fac.is_verified === 1 && (
                          <span className="badge badge-success" style={{ marginLeft: '0.25rem' }}>✓ Verified</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <p className="text-xs">{fac.license_number || 'No License'}</p>
                      <p className="text-gray text-xs">{fac.city}, {fac.region}</p>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className={`btn ${fac.is_verified === 1 ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                          onClick={() => handleVerify(fac.id, fac.is_verified)}
                        >
                          {fac.is_verified === 1 ? 'Unverify' : 'Verify'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedFacilityId(fac.id)}
                        >
                          🔗 Link Staff
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Link Staff Modal */}
      {selectedFacilityId && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="card-title">🔗 Allocate Staff Member to Facility</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFacilityId(null)}>✕</button>
            </div>
            <form onSubmit={handleAddStaff}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Registered User</label>
                  <select
                    required
                    className="form-control"
                    value={staffUserId}
                    onChange={(e) => setStaffUserId(e.target.value)}
                  >
                    <option value="">-- Choose Doctor or Receptionist --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.toUpperCase()} — {u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Staff Duty Role</label>
                  <select
                    className="form-control"
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                  >
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="head_doctor">Chief Medical Director (Head Doctor)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedFacilityId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">🔗 Link Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
