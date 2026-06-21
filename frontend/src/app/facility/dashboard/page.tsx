'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

export default function FacilityDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ queue: { waiting: 0, called: 0, served: 0, total: 0 }, reports: { totalRevenue: 0, totalAppointments: 0 } });
  const [facility, setFacility] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Find current receptionist facility
        const userRes = await api.get<any>('/auth/me');
        if (userRes.success && userRes.data) {
          // In Gambia seed, Fatoumata Barrow is receptionist at MediBook Clinic Kololi.
          // Get facilities and check where she is registered
          const facRes = await api.get<any>('/facilities');
          if (facRes.success && facRes.data?.facilities?.length > 0) {
            // Find Kololi clinic for receptionist or use the first verified one
            const kololi = facRes.data.facilities.find((f: any) => f.name.includes('Kololi')) || facRes.data.facilities[0];
            setFacility(kololi);

            // Fetch reports for that facility
            const repRes = await api.get<any>(`/facilities/${kololi.id}/reports`);
            if (repRes.success && repRes.data) {
              setStats((prev: any) => ({ ...prev, reports: repRes.data }));
            }

            // Fetch queue stats
            const qRes = await api.get<any>(`/queue?facility_id=${kololi.id}`);
            if (qRes.success && qRes.data) {
              setStats((prev: any) => ({ ...prev, queue: qRes.data.stats }));
            }

            // Fetch today's appointments
            const apptRes = await api.get<any>(`/appointments?facility_id=${kololi.id}&date=${new Date().toISOString().split('T')[0]}`);
            if (apptRes.success && apptRes.data?.appointments) {
              setTodayAppointments(apptRes.data.appointments);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load facility dashboard', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading facility overview...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏥 Facility Dashboard</h1>
          <p className="page-subtitle">
            Overview for <strong>{facility?.name || 'All Facilities'}</strong> — {facility?.city}, Gambia
          </p>
        </div>
        <div className="navbar-actions">
          <Link href="/facility/queue" className="btn btn-primary">🎫 Manage Queue</Link>
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">🎟️</div>
          <div>
            <div className="stat-value">{stats.queue.waiting}</div>
            <div className="stat-label">Patients Waiting</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">💰</div>
          <div>
            <div className="stat-value">GMD {stats.reports.totalRevenue}</div>
            <div className="stat-label">GMD Revenue Collected</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">📅</div>
          <div>
            <div className="stat-value">{stats.reports.totalAppointments}</div>
            <div className="stat-label">Appointments Today</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-teal">🚶</div>
          <div>
            <div className="stat-value">{stats.reports.walkIns || 0}</div>
            <div className="stat-label">Registered Walk-ins</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Live Queue Box */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🎫 Walk-in Queue Overview</span>
            <span className="badge badge-primary">{stats.queue.total || 0} total tickets today</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div style={{ background: 'var(--primary-50)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                <h3 className="text-primary">{stats.queue.waiting}</h3>
                <span className="text-xs text-gray">Waiting</span>
              </div>
              <div style={{ background: 'var(--success-50)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                <h3 className="text-success">{stats.queue.called}</h3>
                <span className="text-xs text-gray">Called</span>
              </div>
              <div style={{ background: 'var(--gray-100)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                <h3 style={{ color: 'var(--gray-600)' }}>{stats.queue.served}</h3>
                <span className="text-xs text-gray">Served</span>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link href="/facility/queue" className="btn btn-secondary btn-full btn-sm">🎟️ Open Queue Management Panel</Link>
            </div>
          </div>
        </div>

        {/* Today's Appointments List */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📅 Today's Bookings</span>
            <span className="badge badge-success">{todayAppointments.length} Booked</span>
          </div>
          <div className="card-body">
            {todayAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                No appointments booked for today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {todayAppointments.slice(0, 5).map((appt) => (
                  <div key={appt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gray-50)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--gray-100)' }}>
                    <div>
                      <p className="font-semibold text-sm">{appt.patient_name}</p>
                      <p className="text-xs text-gray">Dr. {appt.doctor_name} — {appt.appointment_time}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${appt.status === 'confirmed' ? 'badge-success' : appt.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                        {appt.status}
                      </span>
                      <p className="text-xs font-semibold text-primary" style={{ marginTop: '0.125rem' }}>GMD {appt.fee}</p>
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
