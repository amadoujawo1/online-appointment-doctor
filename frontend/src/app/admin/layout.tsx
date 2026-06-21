'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/login?role=admin');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Verifying admin portal access...</p>
        </div>
      </div>
    );
  }

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/specialties', label: 'Specialties', icon: '🩺' },
    { href: '/admin/doctors', label: 'Doctors', icon: '👨‍⚕️' },
    { href: '/admin/appointments', label: 'Appointments', icon: '📅' },
    { href: '/admin/facilities', label: 'Facilities', icon: '🏥' },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: '📜' },
    { href: '/admin/broadcast', label: 'Broadcast', icon: '📡' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-section-label">Admin Menu</div>
          <ul className="sidebar-nav" style={{ marginTop: '0.5rem' }}>
            {links.map(link => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`sidebar-link ${active ? 'active' : ''}`}
                  >
                    <span className="sidebar-icon">{link.icon}</span>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
        <main className="dashboard-main fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
