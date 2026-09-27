'use strict';

const {
  validationError,
  asPositiveInt,
  asOptStr,
  requireDate,
  requireString,
  optionalDate,
  PAYMENT_MODES,
  RECEIVE_STATUSES,
  PAY_STATUSES,
} = require('./index');

/** Fields that CAN be edited on an existing debt (non-financial only). */
const EDITABLE = ['person_name', 'expected_date', 'reason', 'notes'];

function validateCreateDebt(body, kind) {
  const b = body && typeof body === 'object' ? body : {};
  const details = [];
  const out = {};

  const personName = requireString(details, 'person_name', b.person_name, 200);
  if (personName) out.person_name = personName;

  const amount = asPositiveInt(b.amount);
  if (amount === null) details.push({ field: 'amount', issue: 'Amount must be a positive whole number (Rupees)' });
  else out.amount = amount;

  const mode = PAYMENT_MODES.includes(b.payment_mode) ? b.payment_mode : null;
  if (!mode) details.push({ field: 'payment_mode', issue: 'Payment mode must be Cash or Online (required; it drives the balance effect)' });
  else out.payment_mode = mode;

  const date = requireDate(details, 'date', b.date, 'Date');
  if (date) out.date = date;

  if (b.expected_date !== undefined && b.expected_date !== null && b.expected_date !== '') {
    const exp = optionalDate(details, 'expected_date', b.expected_date);
    if (exp) out.expected_date = exp;
  } else {
    out.expected_date = null;
  }

  const reason = asOptStr(b.reason, 200);
  if (reason === null) details.push({ field: 'reason', issue: 'Must be at most 200 characters' });
  else out.reason = reason || null;

  const notes = asOptStr(b.notes, 500);
  if (notes === null) details.push({ field: 'notes', issue: 'Must be at most 500 characters' });
  else out.notes = notes || null;

  if (details.length) throw validationError(`Invalid money-to-${kind === 'receive' ? 'receive' : 'pay'} data`, details);
  return out;
}

/**
 * Validates the editable fields of an existing debt.
 * Returns { data, unknown } -- the caller decides what to do with `unknown`
 * (financial/system keys are rejected with 409 by the service).
 */
function validateUpdateDebt(body) {
  const b = body && typeof body === 'object' ? body : {};
  const unknown = Object.keys(b).filter((k) => !EDITABLE.includes(k));
  const details = [];
  const out = {};

  if (Object.prototype.hasOwnProperty.call(b, 'person_name')) {
    const personName = requireString(details, 'person_name', b.person_name, 200);
    if (personName) out.person_name = personName;
  }
  if (Object.prototype.hasOwnProperty.call(b, 'expected_date')) {
    if (b.expected_date === null || b.expected_date === '') {
      out.expected_date = null;
    } else {
      const exp = optionalDate(details, 'expected_date', b.expected_date);
      if (exp) out.expected_date = exp;
    }
  }
  if (Object.prototype.hasOwnProperty.call(b, 'reason')) {
    const reason = asOptStr(b.reason, 200);
    if (reason === null) details.push({ field: 'reason', issue: 'Must be at most 200 characters' });
    else out.reason = reason || null;
  }
  if (Object.prototype.hasOwnProperty.call(b, 'notes')) {
    const notes = asOptStr(b.notes, 500);
    if (notes === null) details.push({ field: 'notes', issue: 'Must be at most 500 characters' });
    else out.notes = notes || null;
  }

  if (details.length) throw validationError('Invalid debt data', details);
  return { data: out, unknown };
}

function validateListQuery(kind) {
  const statuses = kind === 'receive' ? RECEIVE_STATUSES : PAY_STATUSES;
  return function validateDebtListQuery(query) {
    const q = query || {};
    const details = [];
    const out = {};

    if (q.status !== undefined && q.status !== '') {
      if (statuses.includes(q.status)) out.status = q.status;
      else details.push({ field: 'status', issue: `Status must be one of ${statuses.join(', ')}` });
    }
    if (q.person_name !== undefined && q.person_name !== '') {
      const person = String(q.person_name).trim();
      if (person.length > 200) details.push({ field: 'person_name', issue: 'person_name must be at most 200 characters' });
      else out.person_name = person;
    }

    const start = q.start_date;
    if (start !== undefined && start !== '') {
      if (requireDate(details, 'start_date', start, 'Start date')) out.start_date = start;
    }
    const end = q.end_date;
    if (end !== undefined && end !== '') {
      if (requireDate(details, 'end_date', end, 'End date')) out.end_date = end;
    }
    const expStart = q.expected_start;
    if (expStart !== undefined && expStart !== '') {
      if (requireDate(details, 'expected_start', expStart, 'Expected start')) out.expected_start = expStart;
    }
    const expEnd = q.expected_end;
    if (expEnd !== undefined && expEnd !== '') {
      if (requireDate(details, 'expected_end', expEnd, 'Expected end')) out.expected_end = expEnd;
    }

    if (q.overdue !== undefined && q.overdue !== '') {
      const ov = String(q.overdue).toLowerCase();
      if (ov === 'true' || ov === '1') out.overdue = true;
      else if (ov === 'false' || ov === '0') out.overdue = false;
      else details.push({ field: 'overdue', issue: 'overdue must be a boolean (true/false/1/0)' });
    }

    if (details.length) throw validationError('Invalid query parameters', details);
    return out;
  };
}

module.exports = { validateCreateDebt, validateUpdateDebt, validateListQuery, EDITABLE };