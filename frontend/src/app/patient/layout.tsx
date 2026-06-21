'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'patient')) {
      router.replace('/login?role=patient');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'patient') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Verifying patient portal access...</p>
        </div>
      </div>
    );
  }

  const links = [
    { href: '/patient/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/doctors', label: 'Find Doctors', icon: '🔍' },
    { href: '/patient/appointments', label: 'My Appointments', icon: '📅' },
    { href: '/patient/profile', label: 'Medical Profile', icon: '👤' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-section-label">Patient Menu</div>
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
