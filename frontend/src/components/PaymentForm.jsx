import { useState } from 'react';
import { Field, Select } from './Form.jsx';
import { PAYMENT_MODES } from '../constants/index.js';
import { api } from '../api/client.js';
import { useToast } from './Toast.jsx';
import { formatINR, todayISO } from '../utils/format.js';

export default function PaymentForm({ kind, debtId, remaining, onSubmitted }) {
  const toast = useToast();
  const [form, setForm] = useState({ amount: '', payment_mode: 'Cash', date: todayISO(), notes: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isReceive = kind === 'receive';

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amt = Number(form.amount);
    if (!form.amount || amt <= 0 || !Number.isInteger(amt)) {
      setError('Enter a whole Rupee amount greater than 0.');
      return;
    }
    if (amt > remaining) {
      setError(`Amount exceeds the remaining amount of ${formatINR(remaining)}.`);
      return;
    }
    if (!form.date) {
      setError('Date is required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(isReceive ? '/payments/receive' : '/payments/pay', {
        related_debt_id: debtId,
        amount: amt,
        payment_mode: form.payment_mode,
        date: form.date,
        notes: form.notes || null,
      });
      toast.success(isReceive ? 'Payment received and recorded' : 'Payment made and recorded');
      setForm({ amount: '', payment_mode: form.payment_mode, date: todayISO(), notes: '' });
      if (onSubmitted) onSubmitted(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field label={`Amount (₹) — max ${formatINR(remaining)}`} htmlFor="pay-amount" required error={error}>
        <input
          id="pay-amount"
          type="number"
          min="1"
          step="1"
          max={remaining}
          inputMode="numeric"
          className="input"
          placeholder="e.g. 200"
          value={form.amount}
          onChange={set('amount')}
        />
      </Field>
      <div className="form-grid">
        <Field label="Payment Mode" htmlFor="pay-mode" required>
          <Select id="pay-mode" value={form.payment_mode} onChange={set('payment_mode')}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="pay-date" required>
          <input id="pay-date" type="date" className="input" value={form.date} onChange={set('date')} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="pay-notes">
        <input id="pay-notes" type="text" className="input" placeholder="Optional" value={form.notes} onChange={set('notes')} />
      </Field>
      <button type="submit" className="btn btn-success" disabled={submitting} style={{ width: '100%' }}>
        {submitting ? 'Recording…' : isReceive ? 'Receive Payment' : 'Make Payment'}
      </button>
    </form>
  );
}