'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Specialty {
  id: string;
  name: string;
}

interface DoctorProfileData {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  specialty_id: string;
  qualification: string;
  experience_years: string;
  clinic_name: string;
  clinic_address: string;
  clinic_city: string;
  consultation_fee: string;
  bio: string;
}

export default function DoctorProfile() {
  const { refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<DoctorProfileData>({
    id: '',
    name: '',
    phone: '',
    avatar: '',
    specialty_id: '',
    qualification: '',
    experience_years: '',
    clinic_name: '',
    clinic_address: '',
    clinic_city: '',
    consultation_fee: '',
    bio: '',
  });

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    try {
      setLoading(true);
      const [profileRes, specRes] = await Promise.all([
        api.get<{ success: boolean; data: DoctorProfileData }>('/doctors/me'),
        api.get<{ success: boolean; data: Specialty[] }>('/specialties'),
      ]);

      if (profileRes.data?.success) {
        const d = profileRes.data.data;
        setFormData({
          id: d.id || '',
          name: d.name || '',
          phone: d.phone || '',
          avatar: d.avatar || '',
          specialty_id: d.specialty_id || '',
          qualification: d.qualification || '',
          experience_years: d.experience_years ? String(d.experience_years) : '',
          clinic_name: d.clinic_name || '',
          clinic_address: d.clinic_address || '',
          clinic_city: d.clinic_city || '',
          consultation_fee: d.consultation_fee ? String(d.consultation_fee) : '',
          bio: d.bio || '',
        });
        if (d.avatar) {
          // If avatar is relative to backend, pre-append API root
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          const host = apiBase.replace('/api', '');
          setFilePreview(d.avatar.startsWith('http') ? d.avatar : `${host}${d.avatar}`);
        }
      }

      if (specRes.data?.success) {
        setSpecialties(specRes.data.data);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error loading profile settings.' });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.id) return;
    try {
      setSaving(true);
      setMessage(null);

      // Create FormData for multipart upload
      const submission = new FormData();
      submission.append('name', formData.name);
      submission.append('phone', formData.phone);
      submission.append('specialty_id', formData.specialty_id);
      submission.append('qualification', formData.qualification);
      submission.append('experience_years', formData.experience_years);
      submission.append('clinic_name', formData.clinic_name);
      submission.append('clinic_address', formData.clinic_address);
      submission.append('clinic_city', formData.clinic_city);
      submission.append('consultation_fee', formData.consultation_fee);
      submission.append('bio', formData.bio);

      if (selectedFile) {
        submission.append('avatar', selectedFile);
      }

      const res = await api.uploadForm<{ avatar: string }>(`/doctors/${formData.id}`, submission);

      if (res.success) {
        setMessage({ type: 'success', text: 'Doctor profile updated successfully!' });
        refreshUser();
        
        // Refresh preview with new server response if uploaded
        if (res.data?.avatar) {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          const host = apiBase.replace('/api', '');
          setFilePreview(`${host}${res.data.avatar}`);
        }
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update profile. Make sure all values are filled.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading doctor profile...</p>
      </div>
    );
  }

  return (
    <div className="page-content fade-in" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctor Profile Settings</h1>
          <p className="page-subtitle">Configure credentials, clinic location details, consultation fees, and write your public bio.</p>
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
          {/* Avatar Section */}
          <div className="flex items-center gap-6 mb-6" style={{ flexWrap: 'wrap' }}>
            <div
              style={{
                position: 'relative',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-100)',
                overflow: 'hidden',
                border: '3px solid var(--primary-300)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {filePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={filePreview}
                  alt="Doctor Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                  {formData.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">Profile Photo</h3>
              <p className="text-xs text-gray mb-3">Upload a high-quality professional portrait. JPG, PNG formats up to 5MB.</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Photo
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="divider"></div>

          {/* Account Details */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '1.5rem' }}>Core Credentials</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name (including prefix, e.g. Dr. Jane Doe)</label>
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
              <label className="form-label">Contact Phone</label>
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
              <label className="form-label">Medical Specialty</label>
              <select name="specialty_id" className="form-control" value={formData.specialty_id} onChange={handleChange} required>
                <option value="">Choose Specialization</option>
                {specialties.map(spec => (
                  <option key={spec.id} value={spec.id}>{spec.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Qualifications</label>
              <input
                type="text"
                name="qualification"
                className="form-control"
                value={formData.qualification}
                onChange={handleChange}
                placeholder="e.g. MD, FACP, MBBS"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input
                type="number"
                name="experience_years"
                className="form-control"
                value={formData.experience_years}
                onChange={handleChange}
                min={0}
                required
              />
            </div>
          </div>

          <div className="divider"></div>

          {/* Clinic Details */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '1.5rem' }}>Clinic & Financial Details</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Clinic Name</label>
              <input
                type="text"
                name="clinic_name"
                className="form-control"
                value={formData.clinic_name}
                onChange={handleChange}
                placeholder="e.g. Metropolis Specialty Hospital"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Consultation Fee ($ USD)</label>
              <input
                type="number"
                name="consultation_fee"
                className="form-control"
                value={formData.consultation_fee}
                onChange={handleChange}
                min={0}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Clinic Physical Address</label>
              <input
                type="text"
                name="clinic_address"
                className="form-control"
                value={formData.clinic_address}
                onChange={handleChange}
                placeholder="e.g. Suite 402, 5th Avenue"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Clinic City</label>
              <input
                type="text"
                name="clinic_city"
                className="form-control"
                value={formData.clinic_city}
                onChange={handleChange}
                placeholder="e.g. New York"
                required
              />
            </div>
          </div>

          <div className="divider"></div>

          {/* Biography */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '1.5rem' }}>Biography</h3>
          <div className="form-group">
            <label className="form-label">Tell patients about your medical philosophy, background, and expertises.</label>
            <textarea
              name="bio"
              className="form-control"
              rows={5}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Write a brief professional summary..."
              required
            />
          </div>
        </div>

        <div className="card-footer" style={{ background: 'var(--gray-50)', display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Updating profile details...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
