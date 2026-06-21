'use client';
import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<'patient' | 'doctor' | 'receptionist'>('patient');
  
  // Form fields
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    id_type: 'none',
    national_id: '',
    passport_number: '',
    village: '',
    district: '',
    region: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { ...form, role };
      await register(payload);
      if (role === 'admin') router.push('/admin/dashboard');
      else if (role === 'doctor') router.push('/doctor/dashboard');
      else if (role === 'receptionist') router.push('/facility/dashboard');
      else router.push('/patient/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary-50) 0%, white 100%)', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '500px' }}>
          <div className="text-center mb-6">
            <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, var(--primary-500), var(--teal-500))', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1rem' }}>🏥</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)' }}>Create an Account</h1>
            <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>Join MediBook today</p>
          </div>

          <div className="card" style={{ boxShadow: 'var(--shadow-xl)', border: '1px solid var(--gray-200)' }}>
            <div className="card-body">
              {error && (
                <div style={{ background: 'var(--danger-50)', border: '1px solid #fca5a5', borderRadius: 'var(--border-radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--danger-600)' }}>
                  ⚠️ {error}
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleNext}>
                  <h3 className="mb-4 text-center">Step 1: Choose your role</h3>
                  
                  <div className="grid-2 mb-4" style={{ gap: '1rem' }}>
                    <div 
                      className={`card ${role === 'patient' ? 'selected' : ''}`} 
                      style={{ cursor: 'pointer', border: role === 'patient' ? '2px solid var(--primary-500)' : '1px solid var(--gray-200)' }}
                      onClick={() => setRole('patient')}
                    >
                      <div className="card-body text-center" style={{ padding: '1.5rem 1rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧑</div>
                        <div style={{ fontWeight: 600 }}>Patient</div>
                      </div>
                    </div>
                    
                    <div 
                      className={`card ${role === 'doctor' ? 'selected' : ''}`} 
                      style={{ cursor: 'pointer', border: role === 'doctor' ? '2px solid var(--primary-500)' : '1px solid var(--gray-200)' }}
                      onClick={() => setRole('doctor')}
                    >
                      <div className="card-body text-center" style={{ padding: '1.5rem 1rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🩺</div>
                        <div style={{ fontWeight: 600 }}>Doctor</div>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`card mb-6 ${role === 'receptionist' ? 'selected' : ''}`} 
                    style={{ cursor: 'pointer', border: role === 'receptionist' ? '2px solid var(--primary-500)' : '1px solid var(--gray-200)' }}
                    onClick={() => setRole('receptionist')}
                  >
                    <div className="card-body text-center" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>👩‍💻</div>
                      <div style={{ fontWeight: 600 }}>Facility Receptionist</div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-full btn-lg">
                    Continue
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="flex items-center gap-2 mb-4">
                    <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setStep(1)}>‹</button>
                    <h3 style={{ margin: 0 }}>Step 2: Enter details</h3>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-control" type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number (Optional)</label>
                    <input className="form-control" type="tel" placeholder="+220 XXXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                  </div>

                  {role === 'patient' && (
                    <div className="card mb-4" style={{ background: 'var(--gray-50)', border: 'none' }}>
                      <div className="card-body" style={{ padding: '1rem' }}>
                        <h4 className="mb-3 text-sm" style={{ color: 'var(--gray-600)' }}>Patient Demographics (Optional)</h4>
                        
                        <div className="grid-2" style={{ gap: '0.75rem' }}>
                          <div className="form-group mb-0">
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>ID Type</label>
                            <select className="form-control" value={form.id_type} onChange={e => setForm({ ...form, id_type: e.target.value })}>
                              <option value="none">None</option>
                              <option value="national_id">National ID</option>
                              <option value="passport">Passport</option>
                              <option value="voter_id">Voter ID</option>
                            </select>
                          </div>
                          
                          {form.id_type === 'national_id' && (
                            <div className="form-group mb-0">
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>National ID Number</label>
                              <input className="form-control" type="text" value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} />
                            </div>
                          )}
                          
                          {form.id_type === 'passport' && (
                            <div className="form-group mb-0">
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Passport Number</label>
                              <input className="form-control" type="text" value={form.passport_number} onChange={e => setForm({ ...form, passport_number: e.target.value })} />
                            </div>
                          )}

                          <div className="form-group mb-0">
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Village / Town</label>
                            <input className="form-control" type="text" value={form.village} onChange={e => setForm({ ...form, village: e.target.value })} />
                          </div>
                          <div className="form-group mb-0">
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Region</label>
                            <select className="form-control" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}>
                              <option value="">Select Region</option>
                              <option value="Banjul">Banjul</option>
                              <option value="Kanifing">Kanifing (KMC)</option>
                              <option value="West Coast">West Coast</option>
                              <option value="Lower River">Lower River</option>
                              <option value="North Bank">North Bank</option>
                              <option value="Central River">Central River</option>
                              <option value="Upper River">Upper River</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                    {loading ? <><span className="spinner spinner-sm"></span> Creating Account...</> : 'Complete Registration'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center mt-4" style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Sign in here</Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="loading-overlay"><div className="spinner"></div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
