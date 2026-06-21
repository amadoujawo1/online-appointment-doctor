'use client';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Appointment {
  id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_avatar: string;
  specialty_name: string;
  clinic_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  fee: number;
  reason: string;
  notes: string;
  cancellation_reason: string;
  is_reviewed: number;
}

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  // Cancel Modal
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule Modal
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Review Modal
  const [reviewAppt, setReviewAppt] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: { appointments: Appointment[] } }>('/appointments');
      if (res.data?.success) {
        setAppointments(res.data.data.appointments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Load slots when date changes in reschedule modal
  useEffect(() => {
    if (!rescheduleAppt || !newDate) {
      setAvailableSlots([]);
      setSelectedSlot('');
      return;
    }
    loadSlots(rescheduleAppt.doctor_id, newDate);
  }, [newDate, rescheduleAppt]);

  async function loadSlots(doctorId: string, date: string) {
    try {
      setSlotsLoading(true);
      setSelectedSlot('');
      const res = await api.get<{ success: boolean; data: { slots: string[] } }>(`/doctors/${doctorId}/slots?date=${date}`);
      if (res.data?.success) {
        setAvailableSlots(res.data.data.slots);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelId) return;
    try {
      setCancelLoading(true);
      await api.delete(`/appointments/${cancelId}`, { cancellation_reason: cancelReason });
      setCancelId(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err) {
      alert('Failed to cancel appointment. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleAppt || !newDate || !selectedSlot) return;
    try {
      setRescheduleLoading(true);
      await api.put(`/appointments/${rescheduleAppt.id}`, {
        appointment_date: newDate,
        appointment_time: selectedSlot
      });
      setRescheduleAppt(null);
      setNewDate('');
      setSelectedSlot('');
      fetchAppointments();
    } catch (err) {
      alert('Slot conflict or reschedule error. Please try another slot.');
    } finally {
      setRescheduleLoading(false);
    }
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewAppt) return;
    try {
      setReviewLoading(true);
      await api.post('/reviews', {
        appointment_id: reviewAppt.id,
        rating,
        comment
      });
      setReviewAppt(null);
      setComment('');
      setRating(5);
      fetchAppointments();
    } catch (err) {
      alert('Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      case 'completed': return 'badge-primary';
      case 'rescheduled': return 'badge-primary';
      default: return 'badge-gray';
    }
  }

  function formatFriendlyDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  const filteredAppointments = appointments.filter(appt => {
    if (activeTab === 'all') return true;
    if (activeTab === 'upcoming') return ['pending', 'confirmed', 'rescheduled'].includes(appt.status);
    if (activeTab === 'completed') return appt.status === 'completed';
    if (activeTab === 'cancelled') return appt.status === 'cancelled';
    return true;
  });

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Appointments</h1>
          <p className="page-subtitle">View schedules, reschedule bookings, or cancel upcoming visits.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          All Sessions ({appointments.length})
        </button>
        <button className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
          Upcoming ({appointments.filter(a => ['pending', 'confirmed', 'rescheduled'].includes(a.status)).length})
        </button>
        <button className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
          Completed ({appointments.filter(a => a.status === 'completed').length})
        </button>
        <button className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`} onClick={() => setActiveTab('cancelled')}>
          Cancelled ({appointments.filter(a => a.status === 'cancelled').length})
        </button>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading appointments list...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No appointments found</h3>
            <p className="mb-4">There are no records matching your current filter.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredAppointments.map(appt => {
            const isUpcoming = ['pending', 'confirmed', 'rescheduled'].includes(appt.status);
            return (
              <div key={appt.id} className="card card-hover" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="appointment-date-badge">
                      <div className="day">{appt.appointment_date.split('-')[2]}</div>
                      <div className="month">
                        {new Date(appt.appointment_date + 'T00:00:00').toLocaleString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-900)' }}>Dr. {appt.doctor_name}</span>
                        <span className={`badge ${getStatusBadgeClass(appt.status)}`}>{appt.status}</span>
                      </div>
                      <div className="text-sm text-gray">{appt.specialty_name} • {appt.clinic_name}</div>
                      <div className="text-xs text-primary font-semibold mt-1">⏰ {appt.appointment_time} • Consultation Fee: ${appt.fee}</div>
                      {appt.reason && (
                        <div className="text-xs text-gray mt-2" style={{ fontStyle: 'italic' }}>
                          Reason: "{appt.reason}"
                        </div>
                      )}
                      {appt.notes && (
                        <div className="text-xs text-success font-semibold mt-1">
                          Doctor Notes: "{appt.notes}"
                        </div>
                      )}
                      {appt.cancellation_reason && (
                        <div className="text-xs text-danger font-semibold mt-1">
                          Cancellation Reason: "{appt.cancellation_reason}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2" style={{ flexShrink: 0 }}>
                    {isUpcoming && (
                      <>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setRescheduleAppt(appt)}
                        >
                          Reschedule
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setCancelId(appt.id)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {appt.status === 'completed' && appt.is_reviewed === 0 && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setReviewAppt(appt)}
                      >
                        Write Review
                      </button>
                    )}
                    {appt.status === 'completed' && appt.is_reviewed > 0 && (
                      <span className="badge badge-gray">Review Submitted</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelId && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={handleCancel}>
            <div className="modal-header">
              <h3 className="card-title">Cancel Appointment</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCancelId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm mb-4" style={{ color: 'var(--gray-600)' }}>
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Cancellation</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g., Conflicts with another appointment"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setCancelId(null)}>
                Keep Appointment
              </button>
              <button type="submit" className="btn btn-danger" disabled={cancelLoading}>
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleAppt && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={handleReschedule} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="card-title">Reschedule Appointment</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRescheduleAppt(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm mb-4" style={{ color: 'var(--gray-600)' }}>
                Select a new date and available slot to reschedule your consultation with <strong>Dr. {rescheduleAppt.doctor_name}</strong>.
              </p>
              <div className="form-group">
                <label className="form-label">Choose Date</label>
                <input
                  type="date"
                  className="form-control"
                  min={tomorrowStr}
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  required
                />
              </div>

              {newDate && (
                <div className="form-group">
                  <label className="form-label">Available Time Slots</label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray">
                      <div className="spinner spinner-sm"></div> Loading slots...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-danger font-semibold">No available slots for this date.</p>
                  ) : (
                    <div className="time-slots" style={{ marginTop: '0.5rem' }}>
                      {availableSlots.map(slot => (
                        <div
                          key={slot}
                          className={`time-slot ${selectedSlot === slot ? 'selected' : ''}`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setRescheduleAppt(null)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={rescheduleLoading || !newDate || !selectedSlot}
              >
                {rescheduleLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review Modal */}
      {reviewAppt && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={handleReview}>
            <div className="modal-header">
              <h3 className="card-title">Review Dr. {reviewAppt.doctor_name}</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReviewAppt(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm mb-4" style={{ color: 'var(--gray-600)' }}>
                Share your feedback on your consultation. This helps other patients choose the right doctors.
              </p>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div className="star-rating" style={{ fontSize: '1.75rem', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={`star ${rating >= star ? 'filled' : ''}`}
                      onClick={() => setRating(star)}
                      style={{ cursor: 'pointer' }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comment</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Tell us about your experience (e.g., waiting times, doctor friendliness, clarity)..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setReviewAppt(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={reviewLoading}>
                {reviewLoading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
