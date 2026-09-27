'use strict';

const {
  validationError,
  requireDate,
  REPORT_PERIODS,
  GROUP_BYS,
} = require('./index');

const PERIOD_DEFAULTS = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

function groupByFor(period) {
  return PERIOD_DEFAULTS[period] || 'month';
}

function validateReportQuery(query) {
  const q = query || {};
  const details = [];
  const out = {};

  out.period = REPORT_PERIODS.includes(q.period) ? q.period : 'monthly';

  if (q.start_date !== undefined && q.start_date !== '') {
    if (requireDate(details, 'start_date', q.start_date, 'Start date')) out.start_date = q.start_date;
  }
  if (q.end_date !== undefined && q.end_date !== '') {
    if (requireDate(details, 'end_date', q.end_date, 'End date')) out.end_date = q.end_date;
  }
  if (out.start_date && out.end_date && out.start_date > out.end_date) {
    details.push({ field: 'start_date', issue: 'start_date must not be after end_date' });
  }

  if (q.group_by !== undefined && q.group_by !== '') {
    if (GROUP_BYS.includes(q.group_by)) out.group_by = q.group_by;
    else details.push({ field: 'group_by', issue: 'group_by must be day, week or month' });
  } else {
    out.group_by = groupByFor(out.period);
  }

  if (details.length) throw validationError('Invalid report query parameters', details);
  return out;
}

function validateSearchQuery(query) {
  const q = query || {};
  const value = typeof q.q === 'string' ? q.q.trim() : '';
  if (value.length < 2) {
    throw validationError(
      'Search query is too short',
      [{ field: 'q', issue: 'q must be at least 2 characters' }],
      422
    );
  }
  if (value.length > 100) {
    throw validationError('Search query is too long', [{ field: 'q', issue: 'q must be at most 100 characters' }], 422);
  }
  return { q: value };
}

/** Shared export query validation (CSV endpoints reuse list filters). */
function validateExportQuery(query) {
  const transactionsValidator = require('./transactionValidator');
  return transactionsValidator.validateListQuery(query);
}

module.exports = {
  validateReportQuery,
  validateSearchQuery,
  validateExportQuery,
};