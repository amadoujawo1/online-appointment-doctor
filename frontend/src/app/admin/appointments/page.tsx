'use client';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Appointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  specialty_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  fee: number;
}

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'];

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api.get<{ success: boolean; data: { appointments: Appointment[] } }>(
        `/admin/appointments${params}`
      );
      if (res.data?.success) {
        setAppointments(res.data.data.appointments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'confirmed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      case 'completed': return 'badge-primary';
      default: return 'badge-gray';
    }
  }

  const filteredAppointments = appointments.filter(a =>
    !search ||
    a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.doctor_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Appointments</h1>
          <p className="page-subtitle">Audit all bookings across every doctor-patient pair on the system.</p>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="stats-grid mb-6">
        {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
          <div key={s} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter(s)}>
            <div className={`stat-icon stat-icon-${s === 'confirmed' ? 'green' : s === 'pending' ? 'orange' : s === 'cancelled' ? 'red' : 'blue'}`}>
              {s === 'confirmed' ? '✅' : s === 'pending' ? '⏳' : s === 'cancelled' ? '❌' : '🏁'}
            </div>
            <div>
              <div className="stat-value">{appointments.filter(a => a.status === s).length}</div>
              <div className="stat-label" style={{ textTransform: 'capitalize' }}>{s}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Controls */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '280px' }}>
            <input
              type="text"
              placeholder="Search by patient or doctor name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner"></div><p>Loading appointments log...</p></div>
      ) : filteredAppointments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No appointments found</h3>
            <p>No records match the current filter criteria.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Date & Time</th>
                <th>Fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map(appt => (
                <tr key={appt.id}>
                  <td style={{ fontWeight: 600 }}>{appt.patient_name}</td>
                  <td style={{ fontWeight: 600 }}>{appt.doctor_name}</td>
                  <td>{appt.specialty_name || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-primary">{appt.appointment_time}</div>
                  </td>
                  <td>${appt.fee}</td>
                  <td><span className={`badge ${getStatusBadgeClass(appt.status)}`}>{appt.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
