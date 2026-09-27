'use strict';

const { db } = require('../db/connection');
const { todayUTC, addDaysUTC, mondayOfWeek, startOfMonth, endOfMonth } = require('../utils/dates');

function periodFor(period, anchor) {
  switch (period) {
    case 'daily':
      return { start: anchor, end: anchor };
    case 'weekly':
      return { start: mondayOfWeek(anchor), end: anchor };
    case 'monthly':
    default:
      return { start: startOfMonth(anchor), end: anchor };
  }
}

function resolveRange(period, startDate, endDate) {
  if (startDate && endDate) return { start_date: startDate, end_date: endDate };
  if (startDate) {
    let end = startDate;
    if (period === 'weekly') end = addDaysUTC(startDate, 6);
    if (period === 'monthly') end = endOfMonth(startDate);
    return { start_date: startDate, end_date: end };
  }
  if (endDate) {
    let start = endDate;
    if (period === 'weekly') start = mondayOfWeek(endDate);
    if (period === 'monthly') start = startOfMonth(endDate);
    return { start_date: start, end_date: endDate };
  }
  return periodFor(period, todayUTC());
}

function groupLabel(groupBy, date) {
  if (groupBy === 'day') return date;
  if (groupBy === 'week') return mondayOfWeek(date);
  return date.slice(0, 7); // month
}

/**
 * Report per contract section 5.6. All figures are computed live from the
 * database for the requested range.
 */
function getReport({ period = 'monthly', start_date: startDate, end_date: endDate, group_by: groupBy = 'month' } = {}) {
  const range = resolveRange(period, startDate, endDate);

  const txRows = db
    .prepare('SELECT date, type, payment_mode, category, amount FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date ASC, id ASC')
    .all(range.start_date, range.end_date);

  const paymentRows = db
    .prepare('SELECT kind, amount FROM payments WHERE date BETWEEN ? AND ?')
    .all(range.start_date, range.end_date);

  let income = 0;
  let expense = 0;
  let cashIncome = 0;
  let cashExpense = 0;
  let onlineIncome = 0;
  let onlineExpense = 0;

  const byCategory = new Map();
  const byDay = new Map();

  for (const t of txRows) {
    const isCredit = t.type === 'Credit';
    if (isCredit) income += t.amount;
    else expense += t.amount;

    if (t.payment_mode === 'Cash') {
      if (isCredit) cashIncome += t.amount;
      else cashExpense += t.amount;
    } else {
      if (isCredit) onlineIncome += t.amount;
      else onlineExpense += t.amount;
    }

    const c = byCategory.get(t.category) || { category: t.category, expense: 0, income: 0 };
    if (isCredit) c.income += t.amount;
    else c.expense += t.amount;
    byCategory.set(t.category, c);

    const label = groupLabel(groupBy, t.date);
    const d = byDay.get(label) || { date: label, expense: 0, income: 0 };
    if (isCredit) d.income += t.amount;
    else d.expense += t.amount;
    byDay.set(label, d);
  }

  let moneyReceived = 0;
  let moneyReturned = 0;
  for (const p of paymentRows) {
    if (p.kind === 'receive') moneyReceived += p.amount;
    else moneyReturned += p.amount;
  }

  const moneyToReceiveNow = db.prepare('SELECT COALESCE(SUM(remaining_amount),0) AS s FROM money_to_receive').get().s || 0;
  const moneyToPayNow = db.prepare('SELECT COALESCE(SUM(remaining_amount),0) AS s FROM money_to_pay').get().s || 0;

  const net = income - expense;
  const netCashFlow = (cashIncome + onlineIncome + moneyReceived) - (cashExpense + onlineExpense + moneyReturned);

  return {
    period,
    range: { start_date: range.start_date, end_date: range.end_date },
    totals: {
      income,
      expense,
      net,
      cashIncome,
      cashExpense,
      onlineIncome,
      onlineExpense,
      moneyReceived,
      moneyReturned,
      moneyToReceiveNow,
      moneyToPayNow,
      netCashFlow,
    },
    breakdown: {
      byCategory: [...byCategory.values()],
      byPaymentMode: {
        cash: { credit: cashIncome, debit: cashExpense },
        online: { credit: onlineIncome, debit: onlineExpense },
      },
      byType: { credit: income, debit: expense },
      byDay: [...byDay.values()],
    },
  };
}

module.exports = { getReport };