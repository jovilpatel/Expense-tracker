'use strict';

const {
  validationError,
  asPositiveInt,
  asOptStr,
  requireDate,
  PAYMENT_MODES,
} = require('./index');

function validatePayment(body) {
  const b = body && typeof body === 'object' ? body : {};
  const details = [];
  const out = {};

  const debtId = asPositiveInt(b.related_debt_id);
  if (debtId === null) details.push({ field: 'related_debt_id', issue: 'related_debt_id must be a positive integer' });
  else out.related_debt_id = debtId;

  const amount = asPositiveInt(b.amount);
  if (amount === null) details.push({ field: 'amount', issue: 'Amount must be a positive whole number (Rupees)' });
  else out.amount = amount;

  const mode = PAYMENT_MODES.includes(b.payment_mode) ? b.payment_mode : null;
  if (!mode) details.push({ field: 'payment_mode', issue: 'Payment mode must be Cash or Online' });
  else out.payment_mode = mode;

  const date = requireDate(details, 'date', b.date, 'Date');
  if (date) out.date = date;

  const notes = asOptStr(b.notes, 500);
  if (notes === null) details.push({ field: 'notes', issue: 'Must be at most 500 characters' });
  else out.notes = notes || null;

  if (details.length) throw validationError('Invalid payment data', details);
  return out;
}

module.exports = { validatePayment };