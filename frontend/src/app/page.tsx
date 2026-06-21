'use client';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Specialty { id: string; name: string; icon: string; doctor_count: number; }

export default function HomePage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  useEffect(() => {
    api.get<Specialty[]>('/specialties').then(r => { if (r.data) setSpecialties(r.data.slice(0, 8)); });
  }, []);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <p style={{ color: 'var(--teal-400)', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                🏥 Trusted Healthcare Platform
              </p>
              <h1 className="hero h1" style={{ color: 'white', fontSize: '3.25rem', maxWidth: '680px' }}>
                Find & Book the Best Doctors Near You
              </h1>
              <p style={{ color: 'var(--primary-200)', fontSize: '1.2rem', margin: '1rem 0 2rem', maxWidth: '560px' }}>
                Connect with verified specialist doctors, book appointments instantly, and manage your healthcare — all in one place.
              </p>

              {/* Search Bar */}
              <div style={{ maxWidth: '600px', marginBottom: '3rem' }}>
                <div className="search-bar" style={{ borderRadius: '16px', border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                  <input
                    style={{ background: 'transparent', color: 'white' }}
                    placeholder="Search by doctor name, specialty..."
                    onKeyDown={e => { if (e.key === 'Enter') { window.location.href = `/doctors?search=${encodeURIComponent((e.target as HTMLInputElement).value)}`; } }}
                  />
                  <button className="search-btn" onClick={() => { window.location.href = '/doctors'; }} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                    🔍 Search
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-8 flex-wrap">
                {[
                  { value: '500+', label: 'Verified Doctors' },
                  { value: '50k+', label: 'Patients Served' },
                  { value: '98%', label: 'Satisfaction Rate' },
                  { value: '24/7', label: 'Support' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-200)', marginTop: '0.25rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Specialties */}
        <section style={{ padding: '5rem 0', background: 'white' }}>
          <div className="container">
            <div className="text-center mb-8">
              <h2 style={{ color: 'var(--gray-900)' }}>Browse by Specialty</h2>
              <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>Find the right specialist for your health needs</p>
            </div>
            <div className="grid-4" style={{ gap: '1rem' }}>
              {specialties.map(s => (
                <Link key={s.id} href={`/doctors?specialty=${encodeURIComponent(s.name)}`}>
                  <div className="specialty-card">
                    <div className="specialty-icon">{s.icon}</div>
                    <div className="specialty-name">{s.name}</div>
                    <div className="specialty-count">{s.doctor_count} doctor{s.doctor_count !== 1 ? 's' : ''}</div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/doctors" className="btn btn-secondary btn-lg">
                View All Specialties →
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section style={{ padding: '5rem 0', background: 'var(--gray-50)' }}>
          <div className="container">
            <div className="text-center mb-8">
              <h2>How MediBook Works</h2>
              <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>Book your appointment in 3 easy steps</p>
            </div>
            <div className="grid-3" style={{ gap: '2rem' }}>
              {[
                { step: '01', icon: '🔍', title: 'Find Your Doctor', desc: 'Search by specialty, location, or availability. Filter by fees and ratings.' },
                { step: '02', icon: '📅', title: 'Book a Slot', desc: 'Choose a convenient date and time from the doctor\'s available slots.' },
                { step: '03', icon: '✅', title: 'Get Confirmed', desc: 'Receive instant booking confirmation and appointment reminders.' },
              ].map(item => (
                <div key={item.step} className="card card-hover" style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{item.icon}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-400)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    Step {item.step}
                  </div>
                  <h3 style={{ marginBottom: '0.75rem' }}>{item.title}</h3>
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '5rem 0', background: 'linear-gradient(135deg, var(--primary-900), var(--primary-700))', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>Ready to Take Control of Your Health?</h2>
            <p style={{ color: 'var(--primary-200)', marginBottom: '2rem', fontSize: '1.1rem' }}>
              Join thousands of patients who trust MediBook for their healthcare needs.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/register" className="btn btn-lg" style={{ background: 'white', color: 'var(--primary-700)', fontWeight: 700 }}>
                Register as Patient
              </Link>
              <Link href="/register?role=doctor" className="btn btn-lg btn-secondary" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white', background: 'rgba(255,255,255,0.1)' }}>
                Join as Doctor
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: 'var(--gray-900)', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
            © 2026 MediBook. Connecting patients with quality healthcare.
          </p>
        </footer>
      </main>
    </>
  );
}
