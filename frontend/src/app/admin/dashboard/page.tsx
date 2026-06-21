'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface AdminStats {
  overview: {
    totalPatients: number;
    totalDoctors: number;
    verifiedDoctors: number;
    pendingDoctors: number;
    totalAppointments: number;
    todayAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalRevenue: number;
    avgRating: number;
    totalReviews: number;
  };
  topSpecialties: Array<{ name: string; appointment_count: number }>;
  topDoctors: Array<{ name: string; rating: number; total_reviews: number; specialty: string; appointments: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: AdminStats }>('/admin/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading administration dashboard...</p>
      </div>
    );
  }

  const overview = stats?.overview;

  return (
    <div className="page-content fade-in">
      <div className="page-header slide-up">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Oversee platform activity, manage doctor verifications, and monitor global metrics.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchStats} disabled={loading} style={{ border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: 'var(--shadow-sm)' }}>
          🔄 Refresh Metrics
        </button>
      </div>

      {/* Overview Analytics Cards */}
      {overview && (
        <>
          <div className="stats-grid mb-6">
            <div className="stat-card slide-up delay-1">
              <div className="stat-icon stat-icon-blue">👥</div>
              <div>
                <div className="stat-value">{overview.totalPatients}</div>
                <div className="stat-label">Total Patients</div>
              </div>
            </div>
            <div className="stat-card slide-up delay-2">
              <div className="stat-icon stat-icon-teal">👨‍⚕️</div>
              <div>
                <div className="stat-value">{overview.totalDoctors}</div>
                <div className="stat-label">Total Doctors</div>
                {overview.pendingDoctors > 0 && (
                  <span className="badge badge-warning mt-1">
                    ⚠️ {overview.pendingDoctors} Pending Verification
                  </span>
                )}
              </div>
            </div>
            <div className="stat-card slide-up delay-3">
              <div className="stat-icon stat-icon-green">📅</div>
              <div>
                <div className="stat-value">{overview.totalAppointments}</div>
                <div className="stat-label">Appointments</div>
                {overview.todayAppointments > 0 && (
                  <span className="badge badge-primary mt-1">
                    📅 {overview.todayAppointments} Today
                  </span>
                )}
              </div>
            </div>
            <div className="stat-card slide-up delay-4">
              <div className="stat-icon stat-icon-orange">💰</div>
              <div>
                <div className="stat-value">D{overview.totalRevenue.toLocaleString()}</div>
                <div className="stat-label">Platform Volume (GMD)</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid-4 mb-6">
            <div className="card slide-up delay-2" style={{ padding: '1.5rem', textAlign: 'center', borderLeft: '4px solid var(--success-500)', background: 'linear-gradient(to right bottom, #ffffff, #f0fdf4)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success-600)', lineHeight: '1.2' }}>{overview.completedAppointments}</div>
              <div className="text-xs text-gray uppercase font-semibold mt-1" style={{ letterSpacing: '0.05em' }}>Completed Consults</div>
            </div>
            <div className="card slide-up delay-2" style={{ padding: '1.5rem', textAlign: 'center', borderLeft: '4px solid var(--danger-500)', background: 'linear-gradient(to right bottom, #ffffff, #fef2f2)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger-500)', lineHeight: '1.2' }}>{overview.cancelledAppointments}</div>
              <div className="text-xs text-gray uppercase font-semibold mt-1" style={{ letterSpacing: '0.05em' }}>Cancelled Consults</div>
            </div>
            <div className="card slide-up delay-3" style={{ padding: '1.5rem', textAlign: 'center', borderLeft: '4px solid var(--warning-500)', background: 'linear-gradient(to right bottom, #ffffff, #fffbeb)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning-600)', lineHeight: '1.2' }}>{overview.avgRating} ★</div>
              <div className="text-xs text-gray uppercase font-semibold mt-1" style={{ letterSpacing: '0.05em' }}>Average Patient Rating</div>
            </div>
            <div className="card slide-up delay-3" style={{ padding: '1.5rem', textAlign: 'center', borderLeft: '4px solid var(--primary-500)', background: 'linear-gradient(to right bottom, #ffffff, #eff6ff)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-600)', lineHeight: '1.2' }}>{overview.totalReviews}</div>
              <div className="text-xs text-gray uppercase font-semibold mt-1" style={{ letterSpacing: '0.05em' }}>Written Reviews</div>
            </div>
          </div>
        </>
      )}

      {/* Top Details Sections */}
      <div className="grid-2 mb-6" style={{ gap: '1.5rem' }}>
        {/* Top Doctors */}
        <div className="card slide-up delay-4" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', background: '#f8fafc' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⭐ Top Rated Doctors</h2>
            <Link href="/admin/doctors" className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>Manage</Link>
          </div>
          <div className="card-body" style={{ flex: 1, padding: 0 }}>
            {!stats?.topDoctors || stats.topDoctors.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p className="text-sm text-gray">No doctor analytics yet.</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ background: 'transparent' }}>Doctor</th>
                      <th style={{ background: 'transparent' }}>Specialty</th>
                      <th style={{ background: 'transparent' }}>Rating</th>
                      <th style={{ background: 'transparent' }}>Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topDoctors.map((doc, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="avatar-placeholder avatar-sm">{doc.name.split(' ').pop()?.[0]}</span>
                          {doc.name}
                        </td>
                        <td>
                          <span className="badge badge-gray">{doc.specialty || 'General'}</span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--warning-500)', marginRight: '2px' }}>★</span>
                          <span style={{ fontWeight: 700 }}>{doc.rating}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginLeft: '4px' }}>({doc.total_reviews})</span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{doc.appointments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Top Specialties */}
        <div className="card slide-up delay-4" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', background: '#f8fafc' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🩺 Popular Specialties</h2>
            <Link href="/admin/specialties" className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>Manage</Link>
          </div>
          <div className="card-body" style={{ flex: 1, padding: 0 }}>
            {!stats?.topSpecialties || stats.topSpecialties.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p className="text-sm text-gray">No specialty bookings recorded yet.</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ background: 'transparent' }}>Specialty</th>
                      <th style={{ background: 'transparent', textAlign: 'right' }}>Consultations Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topSpecialties.map((spec, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>🩺</span>
                          {spec.name}
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--primary-600)', textAlign: 'right', fontSize: '1rem' }}>
                          {spec.appointment_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Quick Action Panel */}
      <div className="card slide-up delay-5" style={{ background: 'linear-gradient(to right bottom, #ffffff, #f8fafc)', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
        <div className="card-header" style={{ background: '#f8fafc' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚙️ Administrative Operations Panel</h2>
        </div>
        <div className="card-body" style={{ padding: '1.75rem' }}>
          <div className="grid-3" style={{ gap: '1.25rem' }}>
            <Link href="/admin/doctors" className="card card-hover text-center" style={{ display: 'block', padding: '1.75rem', background: 'white' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👨‍⚕️</div>
              <div style={{ fontWeight: 800, color: 'var(--gray-900)', fontSize: '1.05rem' }}>Doctor Verifications</div>
              <p className="text-xs text-gray mt-2" style={{ lineHeight: '1.4' }}>Review medical licenses and approve new healthcare providers to go live.</p>
            </Link>
            <Link href="/admin/specialties" className="card card-hover text-center" style={{ display: 'block', padding: '1.75rem', background: 'white' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🩺</div>
              <div style={{ fontWeight: 800, color: 'var(--gray-900)', fontSize: '1.05rem' }}>Manage Specialties</div>
              <p className="text-xs text-gray mt-2" style={{ lineHeight: '1.4' }}>Add, update, or remove medical catalog categories and specialty icons.</p>
            </Link>
            <Link href="/admin/appointments" className="card card-hover text-center" style={{ display: 'block', padding: '1.75rem', background: 'white' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
              <div style={{ fontWeight: 800, color: 'var(--gray-900)', fontSize: '1.05rem' }}>Platform Bookings</div>
              <p className="text-xs text-gray mt-2" style={{ lineHeight: '1.4' }}>Audit, monitor, and search patient appointments and queues globally.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
