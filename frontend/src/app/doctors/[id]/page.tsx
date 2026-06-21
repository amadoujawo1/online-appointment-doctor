'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface DoctorProfile {
  id: string; name: string; avatar?: string; specialty_name: string; specialty_icon?: string;
  qualification: string; experience_years: number; clinic_name: string; clinic_address: string;
  clinic_city: string; consultation_fee: number; bio: string; rating: number; total_reviews: number;
  is_verified: number; email: string; phone?: string; member_since: string;
  availability: { day_of_week: number; start_time: string; end_time: string; slot_duration_minutes: number }[];
  reviews: { id: string; rating: number; comment: string; patient_name: string; created_at: string }[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StarRating({ rating, size = '1rem' }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-1 items-center">
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? 'var(--warning-500)' : 'var(--gray-200)' }}>★</span>
      ))}
    </div>
  );
}

function CalendarPicker({ availableDays, selectedDate, onSelect }: { availableDays: number[]; selectedDate: string; onSelect: (d: string) => void }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function getDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function isSelectable(day: number) {
    const d = new Date(year, month, day);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    if (d < todayStart) return false;
    return availableDays.includes(d.getDay());
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}>‹</button>
        <span style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{MONTHS[month]} {year}</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}>›</button>
      </div>
      <div className="calendar-grid mb-2">
        {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', padding: '0.25rem' }}>{d}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => (
          <div key={i} className={`calendar-day ${!day ? 'other-month' : ''} ${day && !isSelectable(day) ? 'disabled' : ''} ${day && getDateStr(day) === selectedDate ? 'selected' : ''} ${day && isSelectable(day) && getDateStr(day) !== selectedDate ? 'has-slots' : ''}`}
            onClick={() => day && isSelectable(day) && onSelect(getDateStr(day))}>
            {day || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews'>('overview');

  useEffect(() => {
    api.get<DoctorProfile>(`/doctors/${id}`).then(res => {
      if (res.data) setDoctor(res.data);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedDate) { setSlots([]); setSelectedSlot(''); return; }
    api.get<{ slots: string[]; booked: string[] }>(`/doctors/${id}/slots?date=${selectedDate}`).then(res => {
      if (res.data) { setSlots(res.data.slots); setBookedSlots(res.data.booked); }
    });
  }, [selectedDate, id]);

  async function handleBook() {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'patient') { setBookingError('Only patients can book appointments'); return; }
    if (!selectedDate || !selectedSlot) return;
    setBooking(true);
    setBookingError('');
    try {
      await api.post('/appointments', { doctor_id: id, appointment_date: selectedDate, appointment_time: selectedSlot, reason });
      setBookingSuccess(true);
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBooking(false);
    }
  }

  if (loading) return (
    <><Navbar /><div className="loading-overlay"><div className="spinner"></div></div></>
  );

  if (!doctor) return (
    <><Navbar /><div className="empty-state"><div className="empty-state-icon">❌</div><h3>Doctor not found</h3></div></>
  );

  const availableDays = [...new Set(doctor.availability.map(a => a.day_of_week))];

  return (
    <>
      <Navbar />
      <div className="page-content" style={{ maxWidth: 1200 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
          {/* Left: Profile */}
          <div>
            {/* Profile Header */}
            <div className="profile-header mb-6">
              <div className="flex gap-4 items-start" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700, color: 'white', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                  {doctor.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 style={{ color: 'white', margin: 0 }}>{doctor.name}</h2>
                    {doctor.is_verified === 1 && <span style={{ background: 'var(--teal-500)', color: 'white', padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>✓ Verified</span>}
                  </div>
                  <p style={{ color: 'var(--primary-200)', marginBottom: '0.5rem' }}>{doctor.specialty_icon} {doctor.specialty_name} · {doctor.experience_years} years experience</p>
                  <p style={{ color: 'var(--primary-100)', fontSize: '0.875rem', marginBottom: '0.875rem' }}>{doctor.qualification}</p>
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <StarRating rating={doctor.rating} size="1.125rem" />
                      <span style={{ color: 'white', fontWeight: 700 }}>{doctor.rating}</span>
                      <span style={{ color: 'var(--primary-200)', fontSize: '0.875rem' }}>({doctor.total_reviews} reviews)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📋 Overview</button>
              <button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>⭐ Reviews ({doctor.total_reviews})</button>
            </div>

            {activeTab === 'overview' && (
              <div className="fade-in">
                <div className="card mb-4">
                  <div className="card-body">
                    <h4 className="mb-3">About Dr. {doctor.name.split(' ').slice(-1)[0]}</h4>
                    <p style={{ color: 'var(--gray-600)', lineHeight: 1.8 }}>{doctor.bio}</p>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <div className="card">
                    <div className="card-body">
                      <h4 className="mb-3">🏥 Clinic Info</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.9rem' }}>
                        <div><strong>{doctor.clinic_name}</strong></div>
                        <div style={{ color: 'var(--gray-600)' }}>📍 {doctor.clinic_address}</div>
                        <div style={{ color: 'var(--gray-600)' }}>{doctor.clinic_city}</div>
                        {doctor.phone && <div style={{ color: 'var(--gray-600)' }}>📞 {doctor.phone}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-body">
                      <h4 className="mb-3">📅 Weekly Schedule</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                        {doctor.availability.map(a => (
                          <div key={a.day_of_week} className="flex justify-between">
                            <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{DAYS[a.day_of_week]}</span>
                            <span style={{ color: 'var(--gray-500)' }}>{a.start_time} – {a.end_time}</span>
                          </div>
                        ))}
                        {doctor.availability.length === 0 && <p style={{ color: 'var(--gray-400)' }}>No schedule set</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <h4 className="mb-3">💳 Consultation Fee</h4>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-600)' }}>${doctor.consultation_fee}</span>
                      <span style={{ color: 'var(--gray-500)' }}>per consultation</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="fade-in">
                {doctor.reviews.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">⭐</div>
                    <h3>No reviews yet</h3>
                    <p>Be the first to leave a review after your appointment</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {doctor.reviews.map(r => (
                      <div key={r.id} className="card">
                        <div className="card-body">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="avatar-placeholder avatar-sm">{r.patient_name.charAt(0)}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.patient_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="flex gap-1" style={{ marginLeft: 'auto' }}>
                              {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= r.rating ? 'var(--warning-500)' : 'var(--gray-200)', fontSize: '0.875rem' }}>★</span>)}
                            </div>
                          </div>
                          {r.comment && <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>{r.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Booking Widget */}
          <div style={{ position: 'sticky', top: 'calc(var(--navbar-height) + 1.5rem)' }}>
            {bookingSuccess ? (
              <div className="card slide-up">
                <div className="card-body text-center" style={{ padding: '2.5rem' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                  <h3 style={{ color: 'var(--gray-900)', marginBottom: '0.5rem' }}>Appointment Booked!</h3>
                  <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
                    Your appointment with Dr. {doctor.name.split(' ').slice(-1)[0]} on {selectedDate} at {selectedSlot} is pending confirmation.
                  </p>
                  <button className="btn btn-primary btn-full" onClick={() => router.push('/patient/appointments')}>
                    View My Appointments
                  </button>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <h4>Book Appointment</h4>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>${doctor.consultation_fee}</span>
                </div>
                <div className="card-body">
                  <div className="mb-4">
                    <p className="form-label mb-3">Select Date</p>
                    <CalendarPicker
                      availableDays={availableDays}
                      selectedDate={selectedDate}
                      onSelect={d => { setSelectedDate(d); setSelectedSlot(''); }}
                    />
                  </div>

                  {selectedDate && (
                    <div className="mb-4 slide-up">
                      <p className="form-label mb-2">Available Time Slots</p>
                      {slots.length === 0 ? (
                        <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem', padding: '1rem', textAlign: 'center', background: 'var(--gray-50)', borderRadius: 'var(--border-radius-sm)' }}>
                          No slots available on this date
                        </p>
                      ) : (
                        <div className="time-slots">
                          {slots.map(slot => (
                            <button
                              key={slot}
                              className={`time-slot ${selectedSlot === slot ? 'selected' : ''} ${bookedSlots.includes(slot) ? 'booked' : ''}`}
                              onClick={() => !bookedSlots.includes(slot) && setSelectedSlot(slot)}
                              disabled={bookedSlots.includes(slot)}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedSlot && (
                    <div className="mb-4 slide-up">
                      <label className="form-label">Reason for Visit (optional)</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Describe your symptoms or reason..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  )}

                  {bookingError && (
                    <div style={{ background: 'var(--danger-50)', border: '1px solid #fca5a5', borderRadius: 'var(--border-radius-sm)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--danger-600)' }}>
                      ⚠️ {bookingError}
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={handleBook}
                    disabled={!selectedDate || !selectedSlot || booking}
                  >
                    {booking ? <><span className="spinner spinner-sm"></span> Booking...</> : !user ? '🔐 Login to Book' : !selectedDate ? '📅 Select a Date' : !selectedSlot ? '🕐 Select a Time' : `Confirm Appointment — $${doctor.consultation_fee}`}
                  </button>

                  {!user && (
                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.75rem' }}>
                      You need to be logged in as a patient to book
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
