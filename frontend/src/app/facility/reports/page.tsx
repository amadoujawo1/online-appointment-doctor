'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function FacilityReportsPage() {
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  async function loadReports() {
    setLoading(true);
    try {
      const facRes = await api.get<any>('/facilities');
      if (facRes.success && facRes.data?.facilities?.length > 0) {
        const kololi = facRes.data.facilities.find((f: any) => f.name.includes('Kololi')) || facRes.data.facilities[0];
        setFacility(kololi);

        const repRes = await api.get<any>(`/facilities/${kololi.id}/reports?start_date=${startDate}&end_date=${endDate}`);
        if (repRes.success && repRes.data) {
          setReports(repRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to load facility reports', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  if (loading && !reports) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading financial reports...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Financial Reports</h1>
          <p className="page-subtitle">Revenue totals and booking metrics for {facility?.name}</p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="card mb-8">
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: '0', flex: '1', minWidth: '150px' }}>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: '0', flex: '1', minWidth: '150px' }}>
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={loadReports} disabled={loading}>
              {loading ? 'Recalculating...' : '🔍 Filter Reports'}
            </button>
          </div>
        </div>
      </div>

      {reports && (
        <div className="slide-up">
          {/* Overview summary cards */}
          <div className="stats-grid mb-8">
            <div className="stat-card">
              <div className="stat-icon stat-icon-green">💰</div>
              <div>
                <div className="stat-value">GMD {reports.totalRevenue}</div>
                <div className="stat-label">Total Revenue Collected</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-blue">📅</div>
              <div>
                <div className="stat-value">{reports.totalAppointments}</div>
                <div className="stat-label">Consultations Booked</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-orange">🚶</div>
              <div>
                <div className="stat-value">{reports.walkIns || 0}</div>
                <div className="stat-label">Walk-in Tickets Issued</div>
              </div>
            </div>
          </div>

          <div className="grid-2 mb-8">
            {/* Revenue by Method */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">💵 Revenue Split by Settle Method</span>
              </div>
              <div className="card-body">
                {reports.revenue.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No transactions found for this period.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reports.revenue.map((rev: any) => (
                      <div key={rev.method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--gray-100)' }}>
                        <div style={{ textTransform: 'capitalize' }}>
                          <span style={{ marginRight: '0.5rem' }}>
                            {rev.method === 'mobile_money' ? '📱' : rev.method === 'bank_transfer' ? '🏦' : '💵'}
                          </span>
                          <strong>{rev.method.replace('_', ' ')}</strong>
                          <p className="text-xs text-gray">{rev.count} transaction(s)</p>
                        </div>
                        <h4 className="text-primary">GMD {rev.total}</h4>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bookings Status */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📊 Appointment Attendance Status</span>
              </div>
              <div className="card-body">
                {reports.byStatus.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No bookings recorded.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reports.byStatus.map((status: any) => (
                      <div key={status.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--gray-100)' }}>
                        <span className={`badge ${status.status === 'completed' ? 'badge-success' : status.status === 'pending' ? 'badge-warning' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                          {status.status}
                        </span>
                        <h4 style={{ color: 'var(--gray-700)' }}>{status.count}</h4>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Revenue by Doctor */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🩺 Staff Doctor Consultation Breakdown</span>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Total Consultations</th>
                    <th>Cleared Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.byDoctor.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No staff bookings recorded.</td>
                    </tr>
                  ) : (
                    reports.byDoctor.map((doc: any) => (
                      <tr key={doc.doctor_name}>
                        <td><strong>{doc.doctor_name}</strong></td>
                        <td>{doc.appointments} consultations</td>
                        <td className="text-primary"><strong>GMD {doc.revenue}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
