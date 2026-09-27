'use strict';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** Parse a YYYY-MM-DD string as a Date in UTC. */
function toUTCDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(0);
  dt.setUTCFullYear(y, m - 1, d);
  return dt;
}

/**
 * Strict real-date check for YYYY-MM-DD. Rejects 2024-13-45, 2024-02-30, etc.
 */
function isValidDateStr(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = toUTCDate(value);
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Validate HH:MM (24h clock). */
function isValidTimeStr(value) {
  if (typeof value !== 'string' || !TIME_RE.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Today's date as YYYY-MM-DD in UTC. */
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/** Add a signed number of days to a YYYY-MM-DD date (UTC) -> YYYY-MM-DD. */
function addDaysUTC(iso, days) {
  const dt = toUTCDate(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Monday of the ISO-ish (Mon-start) week containing the given date (UTC). */
function mondayOfWeek(iso) {
  const dt = toUTCDate(iso);
  const wd = dt.getUTCDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function startOfMonth(iso) {
  return `${iso.slice(0, 8)}01`;
}

function endOfMonth(iso) {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(0);
  last.setUTCFullYear(y, m, 0); // day 0 of the *next* month = last day of this month
  return last.toISOString().slice(0, 10);
}

module.exports = {
  toUTCDate,
  isValidDateStr,
  isValidTimeStr,
  todayUTC,
  addDaysUTC,
  mondayOfWeek,
  startOfMonth,
  endOfMonth,
};