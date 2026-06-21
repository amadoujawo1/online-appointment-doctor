'use client';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface ProfileData {
  name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  id_type: string;
  national_id: string;
  address: string;
  village: string;
  district: string;
  region: string;
  medical_history: string;
  allergies: string;
  current_medications: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export default function PatientProfile() {
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    id_type: 'none',
    national_id: '',
    address: '',
    village: '',
    district: '',
    region: '',
    medical_history: '',
    allergies: '',
    current_medications: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await api.get<ProfileData & { name: string; phone: string }>('/patients/me');
      if (res.success && res.data) {
        const d = res.data;
        setFormData({
          name: d.name || '',
          phone: d.phone || '',
          date_of_birth: d.date_of_birth || '',
          gender: d.gender || '',
          blood_group: d.blood_group || '',
          id_type: d.id_type || 'none',
          national_id: d.national_id || '',
          address: d.address || '',
          village: d.village || '',
          district: d.district || '',
          region: d.region || '',
          medical_history: d.medical_history || '',
          allergies: d.allergies || '',
          current_medications: d.current_medications || '',
          emergency_contact_name: d.emergency_contact_name || '',
          emergency_contact_phone: d.emergency_contact_phone || '',
        });
      }
    } catch (err: unknown) {
      console.error(err);
      setMessage({ type: 'error', text: (err as Error)?.message || 'Failed to load profile details.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await api.put<{ message: string }>('/patients/me', formData);
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Medical profile updated successfully!' });
        refreshUser();
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error)?.message || 'Error saving profile details.' });
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading medical profile...</p>
      </div>
    );
  }

  return (
    <div className="page-content fade-in" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Medical Profile</h1>
          <p className="page-subtitle">Update your personal data, chronic illnesses, active prescriptions, and emergency contact details.</p>
        </div>
      </div>

      {message && (
        <div className={`toast toast-${message.type}`} style={{ position: 'static', minWidth: '100%', marginBottom: '1.5rem', animation: 'none' }}>
          <span className="toast-icon">{message.type === 'success' ? '✅' : '❌'}</span>
          <span className="toast-message">{message.text}</span>
        </div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <div className="card-body">
          {/* Personal Information */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '1rem' }}>Personal Information</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="form-control"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                name="date_of_birth"
                className="form-control"
                value={formData.date_of_birth}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-control" value={formData.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select name="blood_group" className="form-control" value={formData.blood_group} onChange={handleChange}>
                <option value="">Select blood type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          {/* Gambia Identity */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">ID Type</label>
              <select name="id_type" className="form-control" value={formData.id_type} onChange={handleChange}>
                <option value="none">None / Not Provided</option>
                <option value="national_id">National ID Card</option>
                <option value="passport">Passport</option>
                <option value="voter_id">Voter ID</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ID Number</label>
              <input
                type="text"
                name="national_id"
                className="form-control"
                value={formData.national_id}
                onChange={handleChange}
                placeholder="e.g. GMB-2024-00123"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address / Street</label>
            <input
              type="text"
              name="address"
              className="form-control"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. 12 Independence Drive, Banjul"
            />
          </div>

          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Village / Town</label>
              <input type="text" name="village" className="form-control" value={formData.village} onChange={handleChange} placeholder="e.g. Kololi" />
            </div>
            <div className="form-group">
              <label className="form-label">District</label>
              <input type="text" name="district" className="form-control" value={formData.district} onChange={handleChange} placeholder="e.g. Kanifing" />
            </div>
            <div className="form-group">
              <label className="form-label">Region</label>
              <select name="region" className="form-control" value={formData.region} onChange={handleChange}>
                <option value="">Select Region</option>
                <option value="Banjul">Banjul</option>
                <option value="Kanifing">Kanifing</option>
                <option value="Brikama">Brikama</option>
                <option value="Mansakonko">Mansakonko</option>
                <option value="Kerewan">Kerewan</option>
                <option value="Kuntaur">Kuntaur</option>
                <option value="Janjanbureh">Janjanbureh</option>
                <option value="Basse">Basse</option>
              </select>
            </div>
          </div>

          <div className="divider"></div>

          {/* Clinical Information */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '1rem' }}>Clinical Information</h3>
          <div className="form-group">
            <label className="form-label">Allergies (Drugs, Foods, environmental)</label>
            <textarea
              name="allergies"
              className="form-control"
              rows={2}
              value={formData.allergies}
              onChange={handleChange}
              placeholder="e.g. Penicillin, Peanuts (leave empty if none)"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Current Medications</label>
            <textarea
              name="current_medications"
              className="form-control"
              rows={2}
              value={formData.current_medications}
              onChange={handleChange}
              placeholder="e.g. Lisinopril 10mg daily, Metformin 500mg BID"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Chronic Conditions / Medical History</label>
            <textarea
              name="medical_history"
              className="form-control"
              rows={3}
              value={formData.medical_history}
              onChange={handleChange}
              placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma, Surgical history"
            />
          </div>

          <div className="divider"></div>

          {/* Emergency Contact */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '1rem' }}>Emergency Contact</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input
                type="text"
                name="emergency_contact_name"
                className="form-control"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="tel"
                name="emergency_contact_phone"
                className="form-control"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                placeholder="e.g. +1 555-0199"
              />
            </div>
          </div>
        </div>

        <div className="card-footer" style={{ background: 'var(--gray-50)', display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving changes...' : 'Save Profile Details'}
          </button>
        </div>
      </form>
    </div>
  );
}
