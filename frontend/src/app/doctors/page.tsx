'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';

interface Doctor {
  id: string;
  name: string;
  avatar?: string;
  specialty_name: string;
  specialty_icon?: string;
  qualification: string;
  experience_years: number;
  clinic_name: string;
  clinic_city: string;
  consultation_fee: number;
  rating: number;
  total_reviews: number;
  is_verified: number;
  bio?: string;
  facility_name?: string;
}

interface Specialty { id: string; name: string; icon: string; }

const GAMBIA_CITIES = ['Banjul', 'Serekunda', 'Brikama', 'Kololi', 'Bakau', 'Farafenni', 'Basse', 'Lamin', 'Sukuta'];

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: '0.9rem', color: s <= Math.round(rating) ? '#f59e0b' : 'var(--gray-200)' }}>★</span>
      ))}
      <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginLeft: '0.25rem', fontWeight: 600 }}>{rating.toFixed(1)}</span>
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const initials = doctor.name.replace('Dr. ', '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const facilityName = doctor.clinic_name || doctor.facility_name || '';

  const facilityColor =
    facilityName.includes('Teaching') || facilityName.includes('EFSTH') ? { bg: '#eff6ff', color: '#1d4ed8', label: 'Teaching Hospital' } :
    facilityName.includes('Brikama') ? { bg: '#f0fdf4', color: '#166534', label: 'District Hospital' } :
    facilityName.includes('MediBook') ? { bg: '#faf5ff', color: '#6d28d9', label: 'Private Clinic' } :
    { bg: '#fefce8', color: '#854d0e', label: 'Health Centre' };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
    >
      {/* Top accent bar */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, var(--primary), #7c3aed)' }} />

      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Avatar + name row */}
        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: '1rem',
            flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.3 }}>{doctor.name}</h4>
              {doctor.is_verified === 1 && (
                <span title="Verified by Medical Council of The Gambia" style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '0.1rem 0.45rem', borderRadius: '20px', fontWeight: 700, whiteSpace: 'nowrap' }}>✓ Verified</span>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.15rem 0.6rem', borderRadius: '20px', fontWeight: 600, marginTop: '0.25rem', display: 'inline-block' }}>
              {doctor.specialty_icon} {doctor.specialty_name}
            </span>
          </div>
        </div>

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <StarRating rating={doctor.rating || 0} />
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>({doctor.total_reviews} reviews)</span>
        </div>

        {/* Bio preview */}
        {doctor.bio && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-600)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {doctor.bio}
          </p>
        )}

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <span>🎓</span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{doctor.qualification}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⏱️</span>
            <span>{doctor.experience_years} yrs experience</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📍</span>
            <span>{doctor.clinic_city}, The Gambia</span>
          </div>
        </div>

        {/* Facility tag */}
        {facilityName && (
          <div style={{ background: facilityColor.bg, borderRadius: '6px', padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem' }}>🏥</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: facilityColor.color }}>{facilityName}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '0.875rem 1.25rem', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-600)' }}>
            GMD {doctor.consultation_fee.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginLeft: '0.25rem' }}>/ visit</span>
        </div>
        <Link href={`/doctors/${doctor.id}`} className="btn btn-primary btn-sm">
          Book Now →
        </Link>
      </div>
    </div>
  );
}

function DoctorsContent() {
  const searchParams = useSearchParams();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    specialty: searchParams.get('specialty') || '',
    city: '',
    min_fee: '',
    max_fee: '',
    min_rating: '',
  });

  useEffect(() => {
    api.get<Specialty[]>('/specialties').then(r => { if (r.data) setSpecialties(r.data as any); });
  }, []);

  useEffect(() => { fetchDoctors(); }, [filters, page]);

  async function fetchDoctors() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '12' });
      if (filters.search)     params.set('search', filters.search);
      if (filters.specialty)  params.set('specialty', filters.specialty);
      if (filters.city)       params.set('city', filters.city);
      if (filters.min_fee)    params.set('min_fee', filters.min_fee);
      if (filters.max_fee)    params.set('max_fee', filters.max_fee);
      if (filters.min_rating) params.set('min_rating', filters.min_rating);

      const res = await api.get<{ doctors: Doctor[]; pagination: { total: number } }>(`/doctors?${params}`);
      if (res.data) {
        setDoctors((res.data as any).doctors || []);
        setTotal((res.data as any).pagination?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }

  function setFilter(key: string, value: string) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ search: '', specialty: '', city: '', min_fee: '', max_fee: '', min_rating: '' });
    setPage(1);
  }

  const totalPages = Math.ceil(total / 12);

  return (
    <>
      <Navbar />
      <div style={{ background: 'linear-gradient(135deg, #667eea10 0%, #764ba210 100%)', borderBottom: '1px solid var(--gray-100)', padding: '2rem 2rem 1.5rem' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gray-900)', margin: '0 0 0.25rem' }}>
            🇬🇲 Find a Doctor in The Gambia
          </h1>
          <p style={{ color: 'var(--gray-500)', margin: '0 0 1.25rem', fontSize: '1rem' }}>
            {loading ? 'Searching...' : `${total} verified doctors across Banjul, Kololi, Brikama, Serekunda & beyond`}
          </p>

          {/* Search bar */}
          <div className="search-bar">
            <input
              placeholder="Search by name, specialty, clinic, or city..."
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchDoctors()}
            />
            <button className="search-btn" onClick={fetchDoctors}>🔍 Search</button>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: 1400 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Filters */}
          <aside>
            <div className="filters-panel" style={{ position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--gray-800)', fontWeight: 700 }}>🔧 Filters</h4>
                <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ fontSize: '0.78rem', color: 'var(--primary-600)' }}>Clear all</button>
              </div>

              <div className="filter-group">
                <div className="filter-title">Specialty</div>
                <select className="form-control form-select" value={filters.specialty} onChange={e => setFilter('specialty', e.target.value)}>
                  <option value="">All Specialties</option>
                  {(specialties as any[]).map((s: any) => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <div className="filter-title">City / Location</div>
                <select className="form-control form-select" value={filters.city} onChange={e => setFilter('city', e.target.value)}>
                  <option value="">All Locations</option>
                  {GAMBIA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <div className="filter-title">Consultation Fee (GMD)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input className="form-control" type="number" placeholder="Min" value={filters.min_fee} onChange={e => setFilter('min_fee', e.target.value)} />
                  <input className="form-control" type="number" placeholder="Max" value={filters.max_fee} onChange={e => setFilter('max_fee', e.target.value)} />
                </div>
                {/* Quick fee presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {[['Under 200', '', '200'], ['200–500', '200', '500'], ['500+', '500', '']].map(([label, min, max]) => (
                    <button
                      key={label}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', border: '1px solid var(--gray-200)', borderRadius: '20px' }}
                      onClick={() => { setFilters(f => ({ ...f, min_fee: min, max_fee: max })); setPage(1); }}
                    >{label}</button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <div className="filter-title">Minimum Rating</div>
                <select className="form-control form-select" value={filters.min_rating} onChange={e => setFilter('min_rating', e.target.value)}>
                  <option value="">Any Rating</option>
                  <option value="4.8">⭐ 4.8+ Exceptional</option>
                  <option value="4.5">⭐ 4.5+ Excellent</option>
                  <option value="4">⭐ 4.0+ Very Good</option>
                  <option value="3">⭐ 3.0+ Good</option>
                </select>
              </div>

              {/* Stats */}
              <div style={{ marginTop: '1.25rem', padding: '0.875rem', background: 'var(--primary-light)', borderRadius: '10px', fontSize: '0.8rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontWeight: 700, color: 'var(--primary)' }}>🇬🇲 MediBook Gambia</p>
                <p style={{ margin: '0 0 0.15rem', color: 'var(--gray-600)' }}>✓ 4 verified facilities</p>
                <p style={{ margin: '0 0 0.15rem', color: 'var(--gray-600)' }}>✓ 16+ specialist doctors</p>
                <p style={{ margin: 0, color: 'var(--gray-600)' }}>✓ Fees in Gambian Dalasi</p>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card" style={{ height: 320, background: 'linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 14 }} />
                ))}
              </div>
            ) : doctors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No doctors found</h3>
                <p>Try adjusting your filters or search term</p>
                <button className="btn btn-primary mt-4" onClick={clearFilters}>Clear Filters</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                    Showing <strong style={{ color: 'var(--gray-800)' }}>{doctors.length}</strong> of <strong style={{ color: 'var(--gray-800)' }}>{total}</strong> doctors
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  {doctors.map(d => <DoctorCard key={d.id} doctor={d} />)}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                    <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPage(i + 1)}
                        style={{ minWidth: '38px' }}
                      >{i + 1}</button>
                    ))}
                    <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function DoctorsPage() {
  return <Suspense><DoctorsContent /></Suspense>;
}
