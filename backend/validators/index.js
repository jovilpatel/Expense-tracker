'use strict';

const { AppError } = require('../middleware/errorHandler');
const { isValidDateStr, isValidTimeStr } = require('../utils/dates');

const PAYMENT_MODES = ['Cash', 'Online'];
const TRANSACTION_TYPES = ['Credit', 'Debit'];
const TX_STATUSES = ['Completed', 'Active'];
const RECEIVE_STATUSES = ['Pending', 'Partially Received', 'Received'];
const PAY_STATUSES = ['Pending', 'Partially Paid', 'Paid'];
const SORTS = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'];
const REPORT_PERIODS = ['daily', 'weekly', 'monthly'];
const GROUP_BYS = ['day', 'week', 'month'];

const MAX_TEXT = 200;

/** Build a 400 validation error with collected field issues. */
function validationError(message, details, status = 400) {
  return new AppError(status, 'VALIDATION_ERROR', message, details);
}

/** Positive, whole-number rupee amount. Rejects floats, strings, 0, negatives. */
function asPositiveInt(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function asEnum(value, allowed) {
  return allowed.includes(value) ? value : null;
}

/** Trim; enforce max length. Returns undefined when the field is absent. */
function asOptStr(value, max = MAX_TEXT) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw validationError('Invalid field type', [{ field: '', issue: 'Value must be a string' }]);
  const trimmed = value.trim();
  if (trimmed.length > max) return null;
  return trimmed;
}

/** Parse and validate an :id path param -> positive integer. */
function parseId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid id', [{ field: 'id', issue: 'Id must be a positive integer' }]);
  }
  return n;
}

function requireString(collection, field, value, max = MAX_TEXT, extra = {}) {
  if (value === undefined || value === null || value === '') {
    collection.push({ field, issue: extra.issue || 'This field is required' });
    return null;
  }
  if (typeof value !== 'string') {
    collection.push({ field, issue: 'Value must be a string' });
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    collection.push({ field, issue: extra.issue || 'This field is required' });
    return null;
  }
  if (trimmed.length > max) {
    collection.push({ field, issue: `Must be at most ${max} characters` });
    return null;
  }
  return trimmed;
}

function requireDate(collection, field, value, label) {
  if (value === undefined || value === null || value === '') {
    collection.push({ field, issue: `${label || field} is required` });
    return null;
  }
  if (!isValidDateStr(value)) {
    collection.push({ field, issue: `${label || field} must be a real date in YYYY-MM-DD format` });
    return null;
  }
  return value;
}

function optionalDate(collection, field, value) {
  if (value === undefined || value === null || value === '') return null;
  if (!isValidDateStr(value)) {
    collection.push({ field, issue: 'Must be a real date in YYYY-MM-DD format' });
    return null;
  }
  return value;
}

module.exports = {
  PAYMENT_MODES,
  TRANSACTION_TYPES,
  TX_STATUSES,
  RECEIVE_STATUSES,
  PAY_STATUSES,
  SORTS,
  REPORT_PERIODS,
  GROUP_BYS,
  MAX_TEXT,
  validationError,
  asPositiveInt,
  asEnum,
  asOptStr,
  parseId,
  requireString,
  requireDate,
  optionalDate,
  isValidDateStr,
  isValidTimeStr,
};