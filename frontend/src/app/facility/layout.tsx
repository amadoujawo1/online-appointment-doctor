'use client';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FacilityLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'receptionist' && user.role !== 'admin'))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user || (user.role !== 'receptionist' && user.role !== 'admin')) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Checking authorization...</p>
      </div>
    );
  }

  const links = [
    { href: '/facility/dashboard', label: 'Overview', icon: '📊' },
    { href: '/facility/queue', label: 'Live Queue Board', icon: '🎟️' },
    { href: '/facility/reports', label: 'Financial Reports', icon: '💰' },
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-section-label">Facility Management</div>
        <ul className="sidebar-nav">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
              >
                <span className="sidebar-icon">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="divider"></div>
        <div style={{ padding: '0.875rem', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
          <p className="font-semibold">Logged in as:</p>
          <p className="truncate" style={{ color: 'var(--gray-700)' }}>{user.name}</p>
          <p className="badge badge-primary" style={{ marginTop: '0.25rem' }}>{user.role.toUpperCase()}</p>
        </div>
      </aside>

      <main className="dashboard-main fade-in">
        {children}
      </main>
    </div>
  );
}
