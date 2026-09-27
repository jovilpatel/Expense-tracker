import { useState } from 'react';
import Modal from './Modal.jsx';
import { Field, Select } from './Form.jsx';
import { TRANSACTION_TYPES, PAYMENT_MODES, TX_STATUSES } from '../constants/index.js';
import { todayISO, timeNow } from '../utils/format.js';

export default function TransactionForm({ initial, categories, submitting, onSubmit, onCancel }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(() => ({
    date: initial?.date || todayISO(),
    time: initial?.time || timeNow(),
    person_name: initial?.person_name || '',
    type: initial?.type || 'Debit',
    payment_mode: initial?.payment_mode || 'Cash',
    category: initial?.category || '',
    description: initial?.description || '',
    amount: initial ? String(initial.amount) : '',
    status: initial?.status || 'Completed',
  }));
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.date) errs.date = 'Date is required';
    if (!form.amount || Number(form.amount) <= 0 || !Number.isInteger(Number(form.amount))) {
      errs.amount = 'Enter a whole Rupee amount greater than 0';
    }
    if (!form.type) errs.type = 'Type is required';
    if (!form.payment_mode) errs.payment_mode = 'Payment mode is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    onSubmit({
      date: form.date,
      time: form.time || null,
      person_name: form.person_name.trim() || null,
      type: form.type,
      payment_mode: form.payment_mode,
      category: form.category || null,
      description: form.description.trim() || null,
      amount: Number(form.amount),
      status: form.status || null,
    });
  }

  return (
    <Modal title={isEdit ? 'Edit Transaction' : 'Add Transaction'} open onClose={onCancel} size="xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field label="Date" htmlFor="tx-date" required error={errors.date}>
            <input id="tx-date" type="date" className="input" value={form.date} onChange={set('date')} />
          </Field>
          <Field label="Time" htmlFor="tx-time">
            <input id="tx-time" type="time" className="input" value={form.time} onChange={set('time')} />
          </Field>
          <Field label="Type" htmlFor="tx-type" required error={errors.type}>
            <Select id="tx-type" value={form.type} onChange={set('type')}>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Payment Mode" htmlFor="tx-mode" required error={errors.payment_mode}>
            <Select id="tx-mode" value={form.payment_mode} onChange={set('payment_mode')}>
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (₹)" htmlFor="tx-amount" required error={errors.amount}>
            <input
              id="tx-amount"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              className="input"
              placeholder="e.g. 500"
              value={form.amount}
              onChange={set('amount')}
            />
          </Field>
          <Field label="Category" htmlFor="tx-category">
            <Select id="tx-category" value={form.category} onChange={set('category')}>
              <option value="">— none —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Person Name" htmlFor="tx-person">
            <input
              id="tx-person"
              type="text"
              className="input"
              placeholder="Who is this with?"
              value={form.person_name}
              onChange={set('person_name')}
            />
          </Field>
          <Field label="Status" htmlFor="tx-status">
            <Select id="tx-status" value={form.status} onChange={set('status')}>
              {TX_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="tx-desc" className="span-2">
            <input
              id="tx-desc"
              type="text"
              className="input"
              placeholder="What was this for?"
              value={form.description}
              onChange={set('description')}
            />
          </Field>
        </div>
        <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}