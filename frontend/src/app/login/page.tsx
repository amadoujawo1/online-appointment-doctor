'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'patient' | 'doctor' | 'admin' | 'receptionist'>('patient');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') router.replace('/admin/dashboard');
      else if (user.role === 'doctor') router.replace('/doctor/dashboard');
      else router.replace('/patient/dashboard');
    }
  }, [user, router]);

  const demoCredentials: Record<string, { email: string; password: string }> = {
    patient: { email: 'alieu@example.com', password: 'patient123' },
    doctor: { email: 'lamin.ceesay@medibook.gm', password: 'doctor123' },
    admin: { email: 'admin@medibook.gm', password: 'admin123' },
    receptionist: { email: 'recep@medibook.gm', password: 'recep123' },
  };

  function fillDemo() {
    const creds = demoCredentials[tab];
    setForm(creds);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary-50) 0%, white 100%)', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {/* Logo */}
          <div className="text-center mb-6">
            <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, var(--primary-500), var(--teal-500))', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1rem' }}>🏥</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)' }}>Welcome back</h1>
            <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>Sign in to your MediBook account</p>
          </div>

          <div className="card" style={{ boxShadow: 'var(--shadow-xl)', border: '1px solid var(--gray-200)' }}>
            <div className="card-body">
              {/* Role Tabs */}
              <div className="tabs" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {(['patient', 'doctor', 'receptionist', 'admin'] as const).map(r => (
                  <button key={r} className={`tab-btn ${tab === r ? 'active' : ''}`} onClick={() => { setTab(r); setForm({ email: '', password: '' }); setError(''); }} style={{ flex: '1 1 calc(50% - 0.25rem)' }}>
                    {r === 'patient' ? '🧑 Patient' : r === 'doctor' ? '🩺 Doctor' : r === 'receptionist' ? '👩‍💻 Receptionist' : '⚙️ Admin'}
                  </button>
                ))}
              </div>

              {error && (
                <div style={{ background: 'var(--danger-50)', border: '1px solid #fca5a5', borderRadius: 'var(--border-radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--danger-600)' }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-group">
                    <span className="input-icon">✉️</span>
                    <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-group">
                    <span className="input-icon">🔒</span>
                    <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginBottom: '0.75rem' }}>
                  {loading ? <><span className="spinner spinner-sm"></span> Signing in...</> : 'Sign In'}
                </button>

                <button type="button" className="btn btn-ghost btn-full btn-sm" onClick={fillDemo} style={{ color: 'var(--primary-600)', textDecoration: 'underline' }}>
                  Use Demo {tab.charAt(0).toUpperCase() + tab.slice(1)} Credentials
                </button>
              </form>
            </div>
          </div>

          <p className="text-center mt-4" style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Sign up free</Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
