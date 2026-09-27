'use strict';

const {
  validationError,
  asPositiveInt,
  asOptStr,
  requireDate,
  requireString,
  isValidTimeStr,
  TRANSACTION_TYPES,
  TX_STATUSES,
  PAYMENT_MODES,
  SORTS,
} = require('./index');

const TX_FIELDS = [
  'date',
  'time',
  'person_name',
  'amount',
  'type',
  'payment_mode',
  'category',
  'description',
  'status',
];

function validateCreate(body) {
  const b = body && typeof body === 'object' ? body : {};
  const details = [];
  const out = {};

  const date = requireDate(details, 'date', b.date, 'Date');
  if (date) out.date = date;

  if (b.time !== undefined && b.time !== null && b.time !== '') {
    if (isValidTimeStr(b.time)) {
      out.time = b.time;
    } else {
      details.push({ field: 'time', issue: 'Time must be in HH:MM format' });
    }
  }

  const personName = asOptStr(b.person_name, 200);
  if (personName === null) details.push({ field: 'person_name', issue: 'Must be at most 200 characters' });
  else out.person_name = personName || null;

  const amount = asPositiveInt(b.amount);
  if (amount === null) details.push({ field: 'amount', issue: 'Amount must be a positive whole number (Rupees)' });
  else out.amount = amount;

  const type = TRANSACTION_TYPES.includes(b.type) ? b.type : null;
  if (!type) details.push({ field: 'type', issue: 'Type must be Credit or Debit' });
  else out.type = type;

  const mode = PAYMENT_MODES.includes(b.payment_mode) ? b.payment_mode : null;
  if (!mode) details.push({ field: 'payment_mode', issue: 'Payment mode must be Cash or Online' });
  else out.payment_mode = mode;

  const category = asOptStr(b.category, 50);
  if (category === null) details.push({ field: 'category', issue: 'Must be at most 50 characters' });
  else out.category = category || 'Other';

  const description = asOptStr(b.description, 200);
  if (description === null) details.push({ field: 'description', issue: 'Must be at most 200 characters' });
  else out.description = description || null;

  const status = b.status === undefined || b.status === null ? 'Completed' : b.status;
  if (!TX_STATUSES.includes(status)) details.push({ field: 'status', issue: 'Status must be Completed or Active' });
  else out.status = status;

  if (details.length) throw validationError('Invalid transaction data', details);
  return out;
}

function validateUpdate(body) {
  const b = body && typeof body === 'object' ? body : {};
  const payloadKeys = Object.keys(b);
  if (payloadKeys.length === 0) {
    throw validationError('Nothing to update', [{ field: 'body', issue: 'Provide at least one field to update' }]);
  }

  const details = [];
  const out = {};
  const unknown = payloadKeys.filter((k) => !TX_FIELDS.includes(k));
  if (unknown.length) {
    throw validationError('Unknown fields', unknown.map((field) => ({ field, issue: 'Not a transaction field' })));
  }

  if (Object.prototype.hasOwnProperty.call(b, 'date')) {
    const date = requireDate(details, 'date', b.date, 'Date');
    if (date) out.date = date;
  }
  if (Object.prototype.hasOwnProperty.call(b, 'time')) {
    if (b.time === null) out.time = null;
    else if (isValidTimeStr(b.time)) out.time = b.time;
    else details.push({ field: 'time', issue: 'Time must be in HH:MM format' });
  }
  if (Object.prototype.hasOwnProperty.call(b, 'person_name')) {
    const personName = asOptStr(b.person_name, 200);
    if (personName === null) details.push({ field: 'person_name', issue: 'Must be at most 200 characters' });
    else out.person_name = personName || null;
  }
  if (Object.prototype.hasOwnProperty.call(b, 'amount')) {
    const amount = asPositiveInt(b.amount);
    if (amount === null) details.push({ field: 'amount', issue: 'Amount must be a positive whole number (Rupees)' });
    else out.amount = amount;
  }
  if (Object.prototype.hasOwnProperty.call(b, 'type')) {
    if (TRANSACTION_TYPES.includes(b.type)) out.type = b.type;
    else details.push({ field: 'type', issue: 'Type must be Credit or Debit' });
  }
  if (Object.prototype.hasOwnProperty.call(b, 'payment_mode')) {
    if (PAYMENT_MODES.includes(b.payment_mode)) out.payment_mode = b.payment_mode;
    else details.push({ field: 'payment_mode', issue: 'Payment mode must be Cash or Online' });
  }
  if (Object.prototype.hasOwnProperty.call(b, 'category')) {
    const category = asOptStr(b.category, 50);
    if (category === null) details.push({ field: 'category', issue: 'Must be at most 50 characters' });
    else out.category = category || 'Other';
  }
  if (Object.prototype.hasOwnProperty.call(b, 'description')) {
    const description = asOptStr(b.description, 200);
    if (description === null) details.push({ field: 'description', issue: 'Must be at most 200 characters' });
    else out.description = description || null;
  }
  if (Object.prototype.hasOwnProperty.call(b, 'status')) {
    const status = b.status === null ? 'Completed' : b.status;
    if (TX_STATUSES.includes(status)) out.status = status;
    else details.push({ field: 'status', issue: 'Status must be Completed or Active' });
  }

  if (details.length) throw validationError('Invalid transaction data', details);
  return out;
}

function validateListQuery(query) {
  const q = query || {};
  const details = [];
  const out = {};

  if (q.type !== undefined && q.type !== '') {
    if (TRANSACTION_TYPES.includes(q.type)) out.type = q.type;
    else details.push({ field: 'type', issue: 'Type must be Credit or Debit' });
  }
  if (q.payment_mode !== undefined && q.payment_mode !== '') {
    if (PAYMENT_MODES.includes(q.payment_mode)) out.payment_mode = q.payment_mode;
    else details.push({ field: 'payment_mode', issue: 'Payment mode must be Cash or Online' });
  }
  if (q.category !== undefined && q.category !== '') {
    const cat = String(q.category).trim();
    if (cat.length > 50) details.push({ field: 'category', issue: 'category must be at most 50 characters' });
    else out.category = cat;
  }

  if (q.person_name !== undefined && q.person_name !== '') {
    const person = String(q.person_name).trim();
    if (person.length > 200) details.push({ field: 'person_name', issue: 'person_name must be at most 200 characters' });
    else out.person_name = person;
  }

  if (q.q !== undefined && q.q !== '') {
    const qs = String(q.q).trim();
    if (qs.length > 100) details.push({ field: 'q', issue: 'q must be at most 100 characters' });
    else if (qs.length >= 2) out.q = qs;
  }

  const start = q.start_date;
  if (start !== undefined && start !== '') {
    if (requireDate(details, 'start_date', start, 'Start date')) out.start_date = start;
  }
  const end = q.end_date;
  if (end !== undefined && end !== '') {
    if (requireDate(details, 'end_date', end, 'End date')) out.end_date = end;
  }
  if (out.start_date && out.end_date && out.start_date > out.end_date) {
    details.push({ field: 'start_date', issue: 'start_date must not be after end_date' });
  }

  // Pagination
  let page = 1;
  let limit = 20;
  if (q.page !== undefined && q.page !== '') {
    const p = Number(q.page);
    if (Number.isInteger(p) && p >= 1) page = p;
    else details.push({ field: 'page', issue: 'page must be a positive integer' });
  }
  if (q.limit !== undefined && q.limit !== '') {
    const l = Number(q.limit);
    if (Number.isInteger(l) && l >= 1 && l <= 200) limit = l;
    else details.push({ field: 'limit', issue: 'limit must be an integer between 1 and 200' });
  }
  out.page = page;
  out.limit = limit;

  out.sort = SORTS.includes(q.sort) ? q.sort : 'date_desc';

  if (details.length) throw validationError('Invalid query parameters', details);
  return out;
}

module.exports = { validateCreate, validateUpdate, validateListQuery };