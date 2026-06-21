'use client';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

interface AvailabilityItem {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: number;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export default function DoctorSchedule() {
  const [doctorId, setDoctorId] = useState('');
  const [schedule, setSchedule] = useState<AvailabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: { id: string; availability: AvailabilityItem[] } }>('/doctors/me');
      if (res.data?.success) {
        setDoctorId(res.data.data.id);
        
        // Initialize availability items for all 7 days of the week (0 = Sunday to 6 = Saturday)
        const currentAvail = res.data.data.availability;
        const fullSchedule: AvailabilityItem[] = [];
        
        for (let i = 0; i < 7; i++) {
          const found = currentAvail.find(item => item.day_of_week === i);
          if (found) {
            fullSchedule.push({
              day_of_week: i,
              start_time: found.start_time,
              end_time: found.end_time,
              slot_duration_minutes: found.slot_duration_minutes,
              is_active: found.is_active
            });
          } else {
            fullSchedule.push({
              day_of_week: i,
              start_time: '09:00',
              end_time: '17:00',
              slot_duration_minutes: 30,
              is_active: 0
            });
          }
        }
        setSchedule(fullSchedule);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error fetching availability settings.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!doctorId) return;
    try {
      setSaving(true);
      setMessage(null);
      
      // Send only active days, or send everything (the backend transaction deletes existing and re-adds everything, which works!)
      // Let's filter to active schedule entries or send all. Send all is fine as backend handles active/inactive.
      const res = await api.put<{ success: boolean; message: string }>(`/doctors/${doctorId}/availability`, {
        schedule
      });

      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Weekly availability schedule saved successfully!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error updating schedule. Please ensure times are valid (24-hour HH:MM).' });
    } finally {
      setSaving(false);
    }
  }

  function handleFieldChange(index: number, field: keyof AvailabilityItem, value: string | number) {
    setSchedule(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading availability schedule...</p>
      </div>
    );
  }

  return (
    <div className="page-content fade-in" style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Weekly Schedule Settings</h1>
          <p className="page-subtitle">Configure your clinic hours and appointments slot duration for each day of the week.</p>
        </div>
      </div>

      {message && (
        <div className={`toast toast-${message.type}`} style={{ position: 'static', minWidth: '100%', marginBottom: '1.5rem', animation: 'none' }}>
          <span className="toast-icon">{message.type === 'success' ? '✅' : '❌'}</span>
          <span className="toast-message">{message.text}</span>
        </div>
      )}

      <form className="card" onSubmit={handleSave}>
        <div className="card-header">
          <h2 className="card-title">Manage Availability hours</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray mb-4">
            Toggle which days you are available to consult with patients. Confirm start and end times, and define slot increments.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {schedule.map((item, idx) => (
              <div
                key={item.day_of_week}
                className="card"
                style={{
                  padding: '1rem',
                  backgroundColor: item.is_active ? 'var(--primary-50)' : 'transparent',
                  borderColor: item.is_active ? 'var(--primary-200)' : 'var(--gray-200)',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  
                  {/* Day Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '150px' }}>
                    <input
                      type="checkbox"
                      id={`day-${item.day_of_week}`}
                      checked={item.is_active === 1}
                      onChange={e => handleFieldChange(idx, 'is_active', e.target.checked ? 1 : 0)}
                      style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                    />
                    <label
                      htmlFor={`day-${item.day_of_week}`}
                      style={{ fontWeight: 700, cursor: 'pointer', color: item.is_active ? 'var(--primary-900)' : 'var(--gray-700)' }}
                    >
                      {WEEKDAYS[item.day_of_week]}
                    </label>
                  </div>

                  {/* Settings */}
                  {item.is_active === 1 ? (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.125rem' }}>Start Time</label>
                        <input
                          type="time"
                          className="form-control"
                          value={item.start_time}
                          onChange={e => handleFieldChange(idx, 'start_time', e.target.value)}
                          style={{ padding: '0.375rem 0.625rem', width: '110px' }}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.125rem' }}>End Time</label>
                        <input
                          type="time"
                          className="form-control"
                          value={item.end_time}
                          onChange={e => handleFieldChange(idx, 'end_time', e.target.value)}
                          style={{ padding: '0.375rem 0.625rem', width: '110px' }}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.125rem' }}>Slot Duration (Min)</label>
                        <select
                          className="form-control"
                          value={item.slot_duration_minutes}
                          onChange={e => handleFieldChange(idx, 'slot_duration_minutes', parseInt(e.target.value))}
                          style={{ padding: '0.375rem 0.625rem', width: '110px' }}
                        >
                          <option value={15}>15 mins</option>
                          <option value={20}>20 mins</option>
                          <option value={30}>30 mins</option>
                          <option value={45}>45 mins</option>
                          <option value={60}>60 mins</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray" style={{ fontStyle: 'italic' }}>Unavailable for bookings</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-footer" style={{ background: 'var(--gray-50)', display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving changes...' : 'Save Availability settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
