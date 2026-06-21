'use client';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty_name: string;
  clinic_name: string;
  clinic_city: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  rating: number;
  total_reviews: number;
  is_verified: number;
  is_active: number;
  created_at: string;
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, [filter]);

  async function fetchDoctors() {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filter === 'verified') params.verified = 'true';
      if (filter === 'pending') params.verified = 'false';

      const query = new URLSearchParams(params).toString();
      const res = await api.get<{ success: boolean; data: { doctors: Doctor[] } }>(
        `/admin/doctors${query ? `?${query}` : ''}`
      );
      if (res.data?.success) {
        setDoctors(res.data.data.doctors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVerification(doctorId: string, currentStatus: number) {
    try {
      setActionLoading(doctorId);
      await api.patch(`/admin/doctors/${doctorId}/verify`, { is_verified: !currentStatus });
      fetchDoctors();
    } catch (err) {
      alert('Failed to update doctor verification status.');
    } finally {
      setActionLoading(null);
    }
  }

  const filteredDoctors = doctors.filter(d =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    (d.specialty_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctor Verifications</h1>
          <p className="page-subtitle">Review submitted doctor profiles and approve or suspend platform access.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '280px' }}>
            <input
              type="text"
              placeholder="Search by name, email or specialty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tabs" style={{ margin: 0, border: 'none', gap: '0.5rem' }}>
            {(['all', 'verified', 'pending'] as const).map(f => (
              <button
                key={f}
                className={`tab-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
                style={{ border: '1.5px solid var(--gray-200)', borderRadius: '8px', marginBottom: 0 }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner"></div><p>Loading doctor records...</p></div>
      ) : filteredDoctors.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👨‍⚕️</div>
            <h3>No doctors found</h3>
            <p>Adjust filters or wait for new doctor registrations.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Location</th>
                <th>Experience</th>
                <th>Fee</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{doc.name}</div>
                    <div className="text-xs text-gray">{doc.email}</div>
                    <div className="text-xs text-gray">{doc.qualification}</div>
                  </td>
                  <td>{doc.specialty_name || <span className="text-gray text-xs">Not set</span>}</td>
                  <td>
                    <div>{doc.clinic_name || '—'}</div>
                    <div className="text-xs text-gray">{doc.clinic_city || '—'}</div>
                  </td>
                  <td>{doc.experience_years ? `${doc.experience_years} yrs` : '—'}</td>
                  <td>${doc.consultation_fee || 0}</td>
                  <td>
                    {doc.rating ? (
                      <span style={{ color: 'var(--warning-500)' }}>★ {doc.rating} ({doc.total_reviews})</span>
                    ) : '—'}
                  </td>
                  <td>
                    {doc.is_verified ? (
                      <span className="badge badge-success">✅ Verified</span>
                    ) : (
                      <span className="badge badge-warning">⏳ Pending</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${doc.is_verified ? 'btn-danger' : 'btn-primary'}`}
                      disabled={actionLoading === doc.id}
                      onClick={() => toggleVerification(doc.id, doc.is_verified)}
                    >
                      {actionLoading === doc.id ? '...' : doc.is_verified ? 'Revoke' : 'Approve'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
