'use client';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Specialty {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function AdminSpecialties() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSpecialty, setCurrentSpecialty] = useState<Specialty | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🩺'); // Default medical icon
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSpecialties();
  }, []);

  async function fetchSpecialties() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: Specialty[] }>('/admin/specialties');
      if (res.data?.success) {
        setSpecialties(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setCurrentSpecialty(null);
    setName('');
    setDescription('');
    setIcon('🩺');
    setIsModalOpen(true);
  }

  function openEditModal(spec: Specialty) {
    setCurrentSpecialty(spec);
    setName(spec.name);
    setDescription(spec.description || '');
    setIcon(spec.icon || '🩺');
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      if (currentSpecialty) {
        // Update
        await api.put(`/admin/specialties/${currentSpecialty.id}`, { name, description, icon });
      } else {
        // Create
        await api.post('/admin/specialties', { name, description, icon });
      }
      setIsModalOpen(false);
      fetchSpecialties();
    } catch (err) {
      alert('Failed to save specialty.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this specialty? Doctors associated with it may need updating.')) return;
    try {
      await api.delete(`/admin/specialties/${id}`);
      fetchSpecialties();
    } catch (err) {
      alert('Failed to delete specialty.');
    }
  }

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Medical Specialties</h1>
          <p className="page-subtitle">Configure doctor directory indexing, add categories, and edit descriptions.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            ➕ Add New Specialty
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading specialties catalog...</p>
        </div>
      ) : specialties.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🩺</div>
            <h3>No specialties registered</h3>
            <p className="mb-4">Begin by adding your first medical category.</p>
            <button className="btn btn-secondary btn-sm" onClick={openCreateModal}>Create Specialty</button>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {specialties.map(spec => (
            <div key={spec.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-body" style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{spec.icon || '🩺'}</div>
                <h3 className="card-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{spec.name}</h3>
                <p className="text-sm text-gray" style={{ minHeight: '50px', lineHeight: 1.4 }}>
                  {spec.description || 'No description available for this specialty.'}
                </p>
              </div>
              <div
                style={{
                  background: 'var(--gray-50)',
                  borderTop: '1px solid var(--gray-100)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1.25rem'
                }}
              >
                <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(spec)}>
                  ✏️ Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(spec.id)}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={handleSave}>
            <div className="modal-header">
              <h3 className="card-title">{currentSpecialty ? 'Edit Specialty' : 'Add New Specialty'}</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Specialty Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Cardiology, Pediatrics, Dermatology"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Icon (Emoji or single character)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 🩺, 🧠, 🦷, 👶"
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  style={{ width: '100px' }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Brief explanation of the diagnostic scope or conditions treated..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
