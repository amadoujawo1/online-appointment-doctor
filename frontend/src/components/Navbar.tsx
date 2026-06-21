'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const notifIcon: Record<string, string> = {
  appointment: '📅',
  review: '⭐',
  verification: '✅',
  welcome: '👋',
  default: '🔔',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  async function fetchNotifications() {
    try {
      const res = await api.get<{ notifications: Notification[]; unread: number }>('/notifications?limit=8');
      if (res.data) {
        setNotifications(res.data.notifications);
        setUnread(res.data.unread);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnread(0);
  }

  function getDashboardLink() {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'doctor') return '/doctor/dashboard';
    if (user.role === 'receptionist') return '/facility/dashboard';
    return '/patient/dashboard';
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <div className="brand-icon">🏥</div>
          MediBook
        </Link>

        {/* Desktop Nav */}
        <ul className="navbar-nav">
          <li><Link href="/doctors" className="nav-link">Find Doctors</Link></li>
          {!user && <li><Link href="/login" className="nav-link">Login</Link></li>}
          {user && <li><Link href={getDashboardLink()} className="nav-link">Dashboard</Link></li>}
        </ul>

        <div className="navbar-actions">
          {user ? (
            <>
              {/* Notification Bell */}
              <div style={{ position: 'relative' }}>
                <button
                  className="notification-btn"
                  onClick={() => setShowNotifs(!showNotifs)}
                  aria-label="Notifications"
                >
                  🔔
                  {unread > 0 && (
                    <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>
                  )}
                </button>
                {showNotifs && (
                  <div className="notification-dropdown" onClick={e => e.stopPropagation()}>
                    <div className="card-header">
                      <span className="card-title">Notifications</span>
                      {unread > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ fontSize: '0.75rem' }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`notif-item ${n.is_read === 0 ? 'unread' : ''}`}
                          onClick={() => markRead(n.id)}
                        >
                          <span className="notif-icon">{notifIcon[n.type] || notifIcon.default}</span>
                          <div>
                            <div className="notif-title">{n.title}</div>
                            <div className="notif-message">{n.message}</div>
                            <div className="notif-time">{timeAgo(n.created_at)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="flex items-center gap-3">
                <div className="avatar-placeholder avatar-sm" style={{ flexShrink: 0 }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)', lineHeight: 1 }}>{user.name.split(' ')[0]}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>{user.role}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showNotifs && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150 }} onClick={() => setShowNotifs(false)} />
      )}
    </nav>
  );
}
