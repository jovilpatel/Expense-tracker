'use strict';

const transactionService = require('./transactionService');
const debtService = require('./debtService');
const reportService = require('./reportService');
const { db } = require('../db/connection');

/** Escape one CSV field (quote fields containing , " or newline; neutralise formula injection). */
function escapeCsv(value) {
  const s = value === null || value === undefined ? '' : String(value);
  const formulaDangerous = /^[=+\-@]/.test(s);
  const needsQuote = /[",\n\r]/.test(s) || formulaDangerous;
  if (needsQuote) {
    const body = formulaDangerous ? `'${s}` : s;
    return `"${body.replace(/"/g, `""`)}"`;
  }
  return s;
}

/** Build CSV from an array of objects using the given column order. */
function rowsToCsv(rows, columns) {
  const lines = [];
  lines.push(columns.map(escapeCsv).join(','));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsv(row[c])).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** Serialise a report into a compact, sectioned CSV. */
function reportToCsv(report) {
  const rows = [];
  rows.push(['period', report.period]);
  rows.push(['range', `${report.range.start_date},${report.range.end_date}`]);

  rows.push([]); // totals section
  rows.push(['section', 'totals']);
  for (const [key, value] of Object.entries(report.totals)) {
    rows.push([key, value]);
  }

  rows.push([]);
  rows.push(['section', 'byCategory']);
  rows.push(['category', 'expense', 'income']);
  for (const c of report.breakdown.byCategory) {
    rows.push([c.category, c.expense, c.income]);
  }

  rows.push([]);
  rows.push(['section', 'byPaymentMode']);
  rows.push(['mode', 'credit', 'debit']);
  rows.push(['cash', report.breakdown.byPaymentMode.cash.credit, report.breakdown.byPaymentMode.cash.debit]);
  rows.push(['online', report.breakdown.byPaymentMode.online.credit, report.breakdown.byPaymentMode.online.debit]);

  rows.push([]);
  rows.push(['section', 'byType']);
  rows.push(['type', 'total']);
  rows.push(['credit', report.breakdown.byType.credit]);
  rows.push(['debit', report.breakdown.byType.debit]);

  rows.push([]);
  rows.push(['section', 'byDay']);
  rows.push(['date', 'expense', 'income']);
  for (const d of report.breakdown.byDay) {
    rows.push([d.date, d.expense, d.income]);
  }

  return rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n') + '\r\n';
}

function transactionsCsv(filters = {}) {
  const rows = transactionService.findAll(filters);
  return rowsToCsv(rows, [
    'id',
    'date',
    'time',
    'person_name',
    'amount',
    'type',
    'payment_mode',
    'category',
    'description',
    'status',
  ]);
}

function debtsCsv(sideName) {
  // Contract section 5.10: debts-receive and debts-pay use the same column
  // structure, with the side-appropriate progress field name
  // (received_amount for receive, paid_amount for pay).
  const progressCol = sideName === 'receive' ? 'received_amount' : 'paid_amount';
  const columns = [
    'id',
    'person_name',
    'original_amount',
    progressCol,
    'remaining_amount',
    'date',
    'expected_date',
    'reason',
    'status',
    'notes',
  ];
  const rows = debtService.listDebts(sideName, {});
  return rowsToCsv(rows, columns);
}

function paymentsCsv() {
  const rows = db
    .prepare('SELECT id, related_debt_id, kind, amount, payment_mode, date, notes FROM payments ORDER BY date ASC, id ASC')
    .all();
  return rowsToCsv(rows, ['id', 'related_debt_id', 'kind', 'amount', 'payment_mode', 'date', 'notes']);
}

function reportsCsv(query) {
  const report = reportService.getReport(query);
  return reportToCsv(report);
}

/** Set CSV response headers and send. */
function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
}

module.exports = {
  escapeCsv,
  rowsToCsv,
  transactionsCsv,
  debtsCsv,
  paymentsCsv,
  reportsCsv,
  sendCsv,
};