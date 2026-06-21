'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  target_role: string;
  sender_name: string;
  created_at: string;
  expires_at: string | null;
}

const TARGET_ROLES = [
  { value: 'all', label: '🌍 All Users', color: '#6366f1', bg: '#eef2ff' },
  { value: 'patient', label: '🧑‍🤝‍🧑 Patients Only', color: '#059669', bg: '#ecfdf5' },
  { value: 'doctor', label: '👨‍⚕️ Doctors Only', color: '#2563eb', bg: '#eff6ff' },
  { value: 'receptionist', label: '🗂️ Receptionists Only', color: '#d97706', bg: '#fffbeb' },
  { value: 'admin', label: '🔐 Admins Only', color: '#dc2626', bg: '#fef2f2' },
];

export default function AdminBroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [expiresAt, setExpiresAt] = useState('');

  async function loadBroadcasts() {
    setLoading(true);
    try {
      const res = await api.get<{ broadcasts: Broadcast[] }>('/admin/broadcasts');
      if (res.success && res.data) {
        setBroadcasts((res.data as any).broadcasts || (res.data as any) || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBroadcasts(); }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMsg('Title and message are required.');
      return;
    }
    setSending(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.post<any>('/admin/broadcasts', {
        title: title.trim(),
        message: message.trim(),
        target_role: targetRole,
        expires_at: expiresAt || null,
      });
      if (res.success) {
        setSuccessMsg(res.message || 'Broadcast sent successfully!');
        setTitle('');
        setMessage('');
        setTargetRole('all');
        setExpiresAt('');
        loadBroadcasts();
      } else {
        setErrorMsg((res as any).message || 'Failed to send broadcast.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred.');
    } finally {
      setSending(false);
    }
  }

  function getRoleStyle(role: string) {
    return TARGET_ROLES.find(r => r.value === role) || TARGET_ROLES[0];
  }

  const charCount = message.length;
  const maxChars = 500;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">📡 Broadcast Notifications</h1>
          <p className="page-subtitle">Send system-wide alerts and announcements to specific user groups</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '0.35rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 600,
          }}>
            {broadcasts.length} sent
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Compose Panel */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: '2px solid var(--primary)', background: 'linear-gradient(135deg, #667eea15, #764ba215)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--gray-800)' }}>
              ✍️ Compose Broadcast
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
              Messages will be delivered instantly to all matched active users
            </p>
          </div>
          <div className="card-body">
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Target Audience */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">🎯 Target Audience</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {TARGET_ROLES.map(role => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setTargetRole(role.value)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: `2px solid ${targetRole === role.value ? role.color : 'var(--gray-200)'}`,
                        borderRadius: '8px',
                        background: targetRole === role.value ? role.bg : 'white',
                        color: targetRole === role.value ? role.color : 'var(--gray-600)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: targetRole === role.value ? 700 : 500,
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                      }}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">📌 Notification Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. System Maintenance Notice"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.2rem' }}>
                  {title.length}/120 characters
                </p>
              </div>

              {/* Message */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">💬 Message Body</label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="Write your announcement here. Be clear and concise..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={maxChars}
                  required
                  style={{ resize: 'vertical', minHeight: '110px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: charCount > 450 ? '#dc2626' : 'var(--gray-400)' }}>
                    {charCount}/{maxChars} characters
                  </span>
                  {charCount > 450 && (
                    <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>⚠️ Approaching limit</span>
                  )}
                </div>
              </div>

              {/* Expiry Date */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">⏰ Expiry Date <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(Optional)</span></label>
                <input
                  type="date"
                  className="form-control"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.2rem' }}>
                  Leave blank for a permanent notification
                </p>
              </div>

              {/* Preview Banner */}
              {(title || message) && (
                <div style={{
                  border: '1px dashed var(--gray-300)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  background: 'var(--gray-50)',
                }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview</p>
                  <div style={{
                    background: 'white',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    border: `1px solid ${getRoleStyle(targetRole).color}30`,
                    borderLeft: `4px solid ${getRoleStyle(targetRole).color}`,
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-800)' }}>{title || 'Your title here...'}</p>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--gray-600)' }}>{message || 'Your message here...'}</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: getRoleStyle(targetRole).color, fontWeight: 600 }}>
                      → {getRoleStyle(targetRole).label}
                    </p>
                  </div>
                </div>
              )}

              {/* Alerts */}
              {successMsg && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '0.75rem 1rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  ✅ {successMsg}
                </div>
              )}
              {errorMsg && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  ❌ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={sending || !title.trim() || !message.trim()}
                style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', fontWeight: 700, gap: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {sending ? (
                  <><span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Sending...</>
                ) : (
                  <>📡 Send Broadcast Now</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* History Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--gray-800)' }}>📋 Broadcast History</h3>
            <button className="btn btn-secondary btn-sm" onClick={loadBroadcasts}>🔄 Refresh</button>
          </div>

          {loading ? (
            <div className="loading-overlay" style={{ minHeight: '200px', position: 'relative', borderRadius: '12px', background: 'var(--gray-50)' }}>
              <div className="spinner" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
              <p style={{ color: 'var(--gray-500)', margin: 0, fontWeight: 500 }}>No broadcasts sent yet</p>
              <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Compose your first broadcast using the form on the left</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '680px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {broadcasts.map((b) => {
                const roleStyle = getRoleStyle(b.target_role);
                const isExpired = b.expires_at && new Date(b.expires_at) < new Date();
                return (
                  <div
                    key={b.id}
                    className="card"
                    style={{
                      padding: '1rem',
                      borderLeft: `4px solid ${isExpired ? 'var(--gray-300)' : roleStyle.color}`,
                      opacity: isExpired ? 0.65 : 1,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-800)', flex: 1 }}>{b.title}</p>
                      {isExpired && (
                        <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          Expired
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>{b.message}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ background: roleStyle.bg, color: roleStyle.color, fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700 }}>
                        {roleStyle.label}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                        by <strong style={{ color: 'var(--gray-600)' }}>{b.sender_name || 'Admin'}</strong>
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginLeft: 'auto' }}>
                        {new Date(b.created_at).toLocaleString()}
                      </span>
                    </div>
                    {b.expires_at && (
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.7rem', color: isExpired ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                        ⏰ {isExpired ? 'Expired' : 'Expires'}: {new Date(b.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
