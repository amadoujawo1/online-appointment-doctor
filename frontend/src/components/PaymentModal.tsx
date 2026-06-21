'use client';
import { useState } from 'react';
import api from '@/lib/api';

interface PaymentData {
  id: string;
  amount: number;
  method: string;
  provider: string;
  status: string;
}

interface Receipt {
  payment: PaymentData;
  facility: string;
  receiptNumber: string;
  patient: { name: string; phone: string };
  appointment?: { doctor: string; specialty: string; date: string; time: string };
}

interface InitiatePaymentResponse {
  id: string;
}

interface PaymentModalProps {
  appointmentId?: string;
  patientId: string;
  amount: number;
  onSuccess: (paymentData: PaymentData) => void;
  onClose: () => void;
}

export default function PaymentModal({
  appointmentId,
  patientId,
  amount,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const [method, setMethod] = useState<'mobile_money' | 'bank_transfer' | 'cash'>('mobile_money');
  const [provider, setProvider] = useState<'afrimoney' | 'qmoney' | 'gtbank' | 'ecobank' | 'trust_bank' | 'cash'>('afrimoney');
  const [mobileNumber, setMobileNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        appointment_id: appointmentId,
        patient_id: patientId,
        amount,
        method,
        provider: method === 'cash' ? 'cash' : provider,
        mobile_number: method === 'mobile_money' ? mobileNumber : null,
        account_name: method === 'bank_transfer' ? accountName : null,
        notes,
      };

      const res = await api.post<InitiatePaymentResponse>('/payments/initiate', payload);
      if (res.success && res.data) {
        // Fetch full receipt details
        const receiptRes = await api.get<Receipt>(`/payments/${res.data.id}/receipt`);
        if (receiptRes.success && receiptRes.data) {
          setReceipt(receiptRes.data);
        } else {
          onSuccess(res.data as PaymentData);
        }
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (receipt) {
    return (
      <div className="modal-overlay" style={{ zIndex: 1100 }}>
        <div className="modal" style={{ maxWidth: '640px' }}>
          <div className="modal-header">
            <span className="card-title">🧾 Payment Receipt</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { onSuccess(receipt.payment); onClose(); }}>✕</button>
          </div>
          <div className="modal-body">
            <div className="receipt-print-wrapper" style={{ margin: '0', border: 'none', boxShadow: 'none', padding: '1rem' }}>
              <div className="receipt-header">
                <div style={{ fontSize: '1.75rem' }}>🏥</div>
                <h3 className="receipt-title">MediBook Gambia</h3>
                <p className="text-xs text-gray">{receipt.facility}</p>
                <p className="text-xs text-gray" style={{ marginTop: '0.25rem' }}>Receipt: <strong>{receipt.receiptNumber}</strong></p>
              </div>

              <div className="receipt-meta-grid">
                <div>
                  <span className="text-xs text-gray">Patient Details</span>
                  <p className="font-semibold text-sm">{receipt.patient.name}</p>
                  <p className="text-xs text-gray">{receipt.patient.phone || 'No Phone'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray">Payment Details</span>
                  <p className="font-semibold text-sm">
                    {receipt.payment.method === 'mobile_money' ? 'Mobile Money' : receipt.payment.method === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}
                  </p>
                  <p className="text-xs text-gray">Provider: {receipt.payment.provider.toUpperCase()}</p>
                </div>
              </div>

              {receipt.appointment && (
                <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--border-radius)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  <p className="font-semibold mb-1">Appointment Medical Consultation</p>
                  <p className="text-gray text-xs">Doctor: {receipt.appointment.doctor} ({receipt.appointment.specialty})</p>
                  <p className="text-gray text-xs">Date/Time: {receipt.appointment.date} at {receipt.appointment.time}</p>
                </div>
              )}

              <div className="receipt-amount-block" style={{ margin: '0' }}>
                <span className="text-xs text-gray">Total Paid</span>
                <div className="receipt-amount-val">GMD {receipt.payment.amount}</div>
                <span className={`badge ${receipt.payment.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: '0.5rem' }}>
                  {receipt.payment.status.toUpperCase()}
                </span>
              </div>

              {receipt.payment.status === 'pending' && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--warning-50)', border: '1px solid var(--warning-600)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', color: 'var(--warning-600)' }}>
                  ⚠️ <strong>Awaiting Confirmation:</strong> This payment requires manual verification of bank transfer or mobile money aggregator callback. Your appointment status will update once cleared.
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={handlePrint}>🖨️ Print Receipt</button>
            <button className="btn btn-primary" onClick={() => { onSuccess(receipt.payment); onClose(); }}>Finish</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal">
        <div className="modal-header">
          <span className="card-title">💸 Complete Consultation Payment</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error mb-4">{error}</div>}

            <div style={{ background: 'var(--primary-50)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1.5rem', textAlign: 'center' }}>
              <span className="text-gray text-xs">Total Fee</span>
              <h2 style={{ color: 'var(--primary-700)', fontWeight: 800 }}>GMD {amount}</h2>
            </div>

            <div className="form-group">
              <label className="form-label">Select Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${method === 'mobile_money' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 0.25rem', fontSize: '0.85rem' }}
                  onClick={() => { setMethod('mobile_money'); setProvider('afrimoney'); }}
                >
                  📱 Mobile Money
                </button>
                <button
                  type="button"
                  className={`btn ${method === 'bank_transfer' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 0.25rem', fontSize: '0.85rem' }}
                  onClick={() => { setMethod('bank_transfer'); setProvider('gtbank'); }}
                >
                  🏦 Bank Transfer
                </button>
                <button
                  type="button"
                  className={`btn ${method === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 0.25rem', fontSize: '0.85rem' }}
                  onClick={() => { setMethod('cash'); setProvider('cash'); }}
                >
                  💵 Cash Arrival
                </button>
              </div>
            </div>

            {method === 'mobile_money' && (
              <div className="slide-up">
                <div className="form-group">
                  <label className="form-label">Mobile Money Wallet</label>
                  <select
                    className="form-control"
                    value={provider}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProvider(e.target.value as 'afrimoney' | 'qmoney')}
                  >
                    <option value="afrimoney">Afrimoney (Africell)</option>
                    <option value="qmoney">QMoney (QCell)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Wallet Phone Number</label>
                  <input
                    type="tel"
                    required
                    className="form-control"
                    placeholder="+220-xxxxxxx"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                  />
                  <span className="text-gray text-xs" style={{ marginTop: '0.25rem', display: 'block' }}>
                    A push prompt will request payment authorization on your phone.
                  </span>
                </div>
              </div>
            )}

            {method === 'bank_transfer' && (
              <div className="slide-up">
                <div className="form-group">
                  <label className="form-label">Target Gambian Bank</label>
                  <select
                    className="form-control"
                    value={provider}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProvider(e.target.value as 'gtbank' | 'ecobank' | 'trust_bank')}
                  >
                    <option value="gtbank">Guaranty Trust Bank (GTBank)</option>
                    <option value="ecobank">Ecobank Gambia</option>
                    <option value="trust_bank">Trust Bank Gambia</option>
                  </select>
                </div>
                <div style={{ background: 'var(--gray-50)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '1rem', border: '1px solid var(--gray-200)' }}>
                  🏥 <strong>MediBook Account details:</strong><br />
                  Bank: {provider.toUpperCase()} Gambia<br />
                  Account Name: <strong>MediBook Health Tech Ltd</strong><br />
                  Account Number: <strong>220-0012498-10</strong>
                </div>
                <div className="form-group">
                  <label className="form-label">Sender Account Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Enter your name on bank receipt"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {method === 'cash' && (
              <div className="slide-up" style={{ padding: '0.75rem', background: 'var(--success-50)', color: 'var(--success-600)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}>
                ✅ You will settle the GMD {amount} fee directly at the facility frontdesk. The receptionist will print your receipt upon payment arrival.
              </div>
            )}

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Payment Notes (Optional)</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Reference number or description"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Settle Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
