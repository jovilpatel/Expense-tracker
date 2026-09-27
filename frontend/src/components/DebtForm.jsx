import { useState } from 'react';
import Modal from './Modal.jsx';
import { Field, Select } from './Form.jsx';
import { PAYMENT_MODES } from '../constants/index.js';
import { todayISO } from '../utils/format.js';

export default function DebtForm({ kind, initial, submitting, onSubmit, onCancel }) {
  const isEdit = Boolean(initial);
  const isReceive = kind === 'receive';
  const createdLabel = isReceive ? 'Lent' : 'Borrowed';

  const [form, setForm] = useState(() => ({
    person_name: initial?.person_name || '',
    amount: initial ? String(initial.original_amount) : '',
    date: initial?.date || todayISO(),
    expected_date: initial?.expected_date || '',
    reason: initial?.reason || '',
    notes: initial?.notes || '',
    payment_mode: 'Cash',
  }));
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.person_name.trim()) errs.person_name = 'Person name is required';
    if (!isEdit) {
      if (!form.date) errs.date = 'Date is required';
      if (!form.amount || Number(form.amount) <= 0 || !Number.isInteger(Number(form.amount))) {
        errs.amount = 'Enter a whole Rupee amount greater than 0';
      }
      if (!form.payment_mode) errs.payment_mode = 'Payment mode is required';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (isEdit) {
      onSubmit({
        person_name: form.person_name.trim(),
        expected_date: form.expected_date || null,
        reason: form.reason || null,
        notes: form.notes || null,
      });
    } else {
      onSubmit({
        person_name: form.person_name.trim(),
        amount: Number(form.amount),
        date: form.date,
        expected_date: form.expected_date || null,
        reason: form.reason || null,
        notes: form.notes || null,
        payment_mode: form.payment_mode,
      });
    }
  }

  return (
    <Modal
      title={isEdit ? `Edit ${isReceive ? 'Money to Receive' : 'Money to Pay'}` : `Record ${createdLabel.toLowerCase()}`}
      open
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field label="Person Name" htmlFor={`debt-person-${kind}`} required error={errors.person_name} className="span-2">
            <input
              id={`debt-person-${kind}`}
              type="text"
              className="input"
              placeholder="Name of the person"
              value={form.person_name}
              onChange={set('person_name')}
            />
          </Field>
          {!isEdit ? (
            <>
              <Field label="Amount (₹)" htmlFor={`debt-amount-${kind}`} required error={errors.amount}>
                <input
                  id={`debt-amount-${kind}`}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  className="input"
                  placeholder="e.g. 1000"
                  value={form.amount}
                  onChange={set('amount')}
                />
              </Field>
              <Field label="Payment Mode" htmlFor={`debt-mode-${kind}`} required error={errors.payment_mode}>
                <Select id={`debt-mode-${kind}`} value={form.payment_mode} onChange={set('payment_mode')}>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`${createdLabel} Date`} htmlFor={`debt-date-${kind}`} required error={errors.date}>
                <input id={`debt-date-${kind}`} type="date" className="input" value={form.date} onChange={set('date')} />
              </Field>
              <Field label="Expected Date" htmlFor={`debt-expected-${kind}`}>
                <input
                  id={`debt-expected-${kind}`}
                  type="date"
                  className="input"
                  value={form.expected_date}
                  onChange={set('expected_date')}
                />
              </Field>
            </>
          ) : (
            <div className="span-2">
              <div className="amount-row" style={{ border: '1px dashed var(--border-strong)', borderRadius: 8, padding: '10px 14px' }}>
                <span className="text-muted">Original amount</span>
                <strong>{Number(form.amount).toLocaleString('en-IN')}</strong>
              </div>
            </div>
          )}
          <Field label="Reason" htmlFor={`debt-reason-${kind}`} className="span-2">
            <input
              id={`debt-reason-${kind}`}
              type="text"
              className="input"
              placeholder="Why was the money lent/borrowed?"
              value={form.reason}
              onChange={set('reason')}
            />
          </Field>
          <Field label="Notes" htmlFor={`debt-notes-${kind}`} className="span-2">
            <textarea
              id={`debt-notes-${kind}`}
              className="input"
              placeholder="Optional notes"
              value={form.notes}
              onChange={set('notes')}
            />
          </Field>
        </div>
        <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}