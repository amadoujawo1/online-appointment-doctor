'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function PatientDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);

  // Form states
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('other');
  const [description, setDescription] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadDocuments() {
    try {
      const res = await api.get<any>('/documents');
      if (res.success && res.data) {
        setDocuments(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file to upload first.');
      return;
    }

    setUploadLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      formData.append('description', description);

      const res = await api.postForm<any>('/documents/upload', formData);
      if (res.success) {
        setMessage('Medical document uploaded successfully!');
        setFile(null);
        setDescription('');
        setDocType('other');
        // Reset file input in HTML DOM
        const fileInput = document.getElementById('doc-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        await loadDocuments();
      } else {
        setError(res.message || 'Failed to upload document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document permanently?')) return;
    try {
      const res = await api.delete<any>(`/documents/${id}`);
      if (res.success) {
        alert('Document deleted successfully');
        await loadDocuments();
      }
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'lab_result': return '🧪';
      case 'xray': return '💀';
      case 'scan': return '🩻';
      case 'prescription': return '📝';
      case 'vaccination': return '💉';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading medical documents...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">📄 Medical Document Uploads</h1>
          <p className="page-subtitle">Securely store lab results, prescriptions, and health reports</p>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1.2fr 1.8fr' }}>
        {/* Upload form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📤 Upload New Document</span>
          </div>
          <form onSubmit={handleUpload} className="card-body">
            {message && <div style={{ background: 'var(--success-50)', color: 'var(--success-600)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>{message}</div>}
            {error && <div className="form-error mb-4">{error}</div>}

            <div className="form-group">
              <label className="form-label">Document Category</label>
              <select
                className="form-control"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="lab_result">🧪 Lab Test Results</option>
                <option value="xray">💀 X-Ray Reports</option>
                <option value="scan">🩻 MRI / Ultrasound Scan</option>
                <option value="prescription">📝 Prescription copy</option>
                <option value="vaccination">💉 Vaccination Card</option>
                <option value="report">📄 Medical Summary/Report</option>
                <option value="other">❓ Other / Miscellaneous</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Choose File</label>
              <input
                id="doc-file-input"
                type="file"
                required
                className="form-control"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                onChange={handleFileChange}
              />
              <span className="text-gray text-xs" style={{ display: 'block', marginTop: '0.25rem' }}>
                Accepts PDF, Images, Word, and TXT files (Max 10MB).
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Brief Description / Label</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Malaria blood test result - May 2026"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={uploadLoading}>
              {uploadLoading ? 'Uploading File...' : '📤 Upload Document'}
            </button>
          </form>
        </div>

        {/* Uploaded Documents List */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Secure Health Repository</span>
            <span className="badge badge-primary">{documents.length} files</span>
          </div>
          <div className="card-body">
            {documents.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">📄</span>
                <h3>Repository is Empty</h3>
                <p>Upload your lab reports and medical sheets so doctors can access them during consultation.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: '1rem',
                      background: 'white',
                      border: '1.5px solid var(--gray-200)',
                      borderRadius: 'var(--border-radius)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>{getDocIcon(doc.document_type)}</span>
                      <div>
                        <h4 style={{ margin: '0', fontSize: '0.95rem' }}>{doc.file_name}</h4>
                        {doc.description && <p className="text-xs text-gray" style={{ margin: '0.125rem 0' }}>{doc.description}</p>}
                        <p className="text-gray" style={{ fontSize: '0.7rem' }}>
                          Uploaded by {doc.uploader_name} on {doc.created_at.split(' ')[0]} ({(doc.file_size / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a
                        href={`http://localhost:5000${doc.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        👁️ View / Get
                      </a>
                      <button className="btn btn-danger btn-sm btn-icon" title="Delete File" onClick={() => handleDelete(doc.id)}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
