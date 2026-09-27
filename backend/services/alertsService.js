'use strict';

const { db } = require('../db/connection');
const { todayUTC, addDaysUTC } = require('../utils/dates');

function mapItem(row, side) {
  const base = {
    id: row.id,
    person_name: row.person_name,
    remaining_amount: row.remaining_amount,
    expected_date: row.expected_date,
    reason: row.reason,
    original_amount: row.original_amount,
    status: row.status,
  };
  if (side === 'receive') base.received_amount = row.received_amount;
  if (side === 'pay') base.paid_amount = row.paid_amount;
  return base;
}

function alertsFor(side) {
  const table = side === 'receive' ? 'money_to_receive' : 'money_to_pay';
  const blockedStatus = side === 'receive' ? 'Received' : 'Paid';

  const rows = db
    .prepare(
      `SELECT * FROM ${table}
       WHERE status != ? AND expected_date IS NOT NULL
       ORDER BY expected_date ASC, id ASC`
    )
    .all(blockedStatus);

  const today = todayUTC();
  const soon = addDaysUTC(today, 3);

  const dueToday = [];
  const dueSoon = [];
  const overdue = [];

  for (const row of rows) {
    const exp = row.expected_date;
    const item = mapItem(row, side);
    if (exp === today) dueToday.push(item);
    else if (exp > today && exp <= soon) dueSoon.push(item);
    else if (exp < today) overdue.push(item);
  }

  return { dueToday, dueSoon, overdue };
}

/**
 * Alerts keyed off the current date (UTC YYYY-MM-DD).
 * dueToday:  expected_date == today, not fully settled.
 * dueSoon:   today < expected_date <= today+3, not fully settled.
 * overdue:   expected_date < today, not fully settled.
 */
function getAlerts() {
  return {
    receive: alertsFor('receive'),
    pay: alertsFor('pay'),
  };
}

module.exports = { getAlerts };