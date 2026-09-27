'use strict';

process.env.DB_PATH = 'C:\\Users\\JOVIL\\AppData\\Local\\Temp\\opencode\\expense-tracker-api-contract-test.db';
process.env.NODE_ENV = 'test';

const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(`${process.env.DB_PATH}${suffix}`, { force: true });
}

const { db } = require('../db/connection');
const transactionService = require('../services/transactionService');
const debtService = require('../services/debtService');
const paymentService = require('../services/paymentService');
const balanceService = require('../services/balanceService');
const reportService = require('../services/reportService');
const personService = require('../services/personService');
const searchService = require('../services/searchService');
const categoryService = require('../services/categoryService');
const exportService = require('../services/exportService');
const alertsService = require('../services/alertsService');
const transactionValidator = require('../validators/transactionValidator');
const debtValidator = require('../validators/debtValidator');
const paymentValidator = require('../validators/paymentValidator');
const queryValidator = require('../validators/queryValidator');
const { asPositiveInt } = require('../validators/index');
const { todayUTC, addDaysUTC } = require('../utils/dates');

function clearData() {
  db.prepare('DELETE FROM payments').run();
  db.prepare('DELETE FROM transactions').run();
  db.prepare('DELETE FROM money_to_receive').run();
  db.prepare('DELETE FROM money_to_pay').run();
}

function assertAppError(fn, status, code) {
  assert.throws(fn, (error) => {
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

function createTransaction(data) {
  return transactionService.create(data);
}

function createDebt(side, data) {
  return debtService.createDebt(side, {
    expected_date: null,
    reason: null,
    notes: null,
    ...data,
  });
}

function findBy(rows, key, value) {
  return rows.find((row) => row[key] === value);
}

test.after(() => {
  db.close();
});

test('transaction service supports filters, pagination, sorting, update, lookup, and category validation', () => {
  clearData();

  const salary = createTransaction({
    date: '2026-04-01',
    time: '09:00',
    person_name: 'Asha',
    amount: 100,
    type: 'Credit',
    payment_mode: 'Cash',
    category: 'Salary',
    description: 'Monthly salary',
  });
  const dinner = createTransaction({
    date: '2026-04-05',
    person_name: 'Rahul',
    amount: 200,
    type: 'Debit',
    payment_mode: 'Online',
    category: 'Food',
    description: 'Dinner with Rahul',
  });
  const refund = createTransaction({
    date: '2026-04-10',
    person_name: 'Asha',
    amount: 300,
    type: 'Credit',
    payment_mode: 'Online',
    category: 'Travel',
    description: 'Flight refund',
  });
  const outside = createTransaction({
    date: '2026-03-31',
    person_name: 'Outside',
    amount: 400,
    type: 'Debit',
    payment_mode: 'Cash',
    category: 'Bills',
    description: 'Outside range',
  });

  let result = transactionService.list({ filters: { type: 'Credit' }, page: 1, limit: 20, sort: 'date_asc' });
  assert.deepEqual(result.data.map((row) => row.id), [salary.id, refund.id]);
  assert.deepEqual(result.pagination, { page: 1, limit: 20, total: 2, pages: 1 });

  result = transactionService.list({ filters: { payment_mode: 'Online' }, page: 1, limit: 20, sort: 'date_desc' });
  assert.deepEqual(result.data.map((row) => row.id), [refund.id, dinner.id]);

  result = transactionService.list({ filters: { category: 'Food' } });
  assert.deepEqual(result.data.map((row) => row.id), [dinner.id]);

  result = transactionService.list({ filters: { person_name: 'ash' } });
  assert.deepEqual(result.data.map((row) => row.id), [refund.id, salary.id]);

  result = transactionService.list({ filters: { q: 'dinner' } });
  assert.deepEqual(result.data.map((row) => row.id), [dinner.id]);
  result = transactionService.list({ filters: { q: 'rah' } });
  assert.deepEqual(result.data.map((row) => row.id), [dinner.id]);

  result = transactionService.list({
    filters: { start_date: '2026-04-01', end_date: '2026-04-10' },
    page: 1,
    limit: 2,
    sort: 'amount_asc',
  });
  assert.deepEqual(result.data.map((row) => row.id), [salary.id, dinner.id]);
  assert.deepEqual(result.pagination, { page: 1, limit: 2, total: 3, pages: 2 });
  result = transactionService.list({
    filters: { start_date: '2026-04-01', end_date: '2026-04-10' },
    page: 2,
    limit: 2,
    sort: 'amount_asc',
  });
  assert.deepEqual(result.data.map((row) => row.id), [refund.id]);

  const updated = transactionService.update(salary.id, { amount: 125, description: 'Updated salary' });
  assert.equal(updated.amount, 125);
  assert.equal(updated.description, 'Updated salary');
  assert.equal(transactionService.getById(salary.id).amount, 125);
  assert.equal(transactionService.getById(999999), null);

  assert.equal(transactionService.remove(outside.id), true);
  assert.equal(transactionService.getById(outside.id), null);
  assert.equal(transactionService.remove(outside.id), false);

  assert.equal(transactionService.assertCategoryExists('Food'), undefined);
  assertAppError(() => transactionService.assertCategoryExists('Not A Category'), 400, 'VALIDATION_ERROR');
});

test('balance service agrees with transaction and debt aggregates', () => {
  clearData();

  createTransaction({
    date: '2026-05-01',
    amount: 1000,
    type: 'Credit',
    payment_mode: 'Cash',
    category: 'Salary',
  });
  createTransaction({
    date: '2026-05-02',
    amount: 800,
    type: 'Credit',
    payment_mode: 'Online',
    category: 'Business',
  });
  createTransaction({
    date: '2026-05-03',
    amount: 200,
    type: 'Debit',
    payment_mode: 'Cash',
    category: 'Food',
  });
  const receiveDebt = createDebt('receive', {
    person_name: 'Riya',
    amount: 500,
    payment_mode: 'Cash',
    date: '2026-05-04',
  });
  paymentService.receivePayment({
    related_debt_id: receiveDebt.id,
    amount: 100,
    payment_mode: 'Online',
    date: '2026-05-05',
  });
  const payDebt = createDebt('pay', {
    person_name: 'Vikram',
    amount: 700,
    payment_mode: 'Online',
    date: '2026-05-06',
  });
  paymentService.payPayment({
    related_debt_id: payDebt.id,
    amount: 200,
    payment_mode: 'Cash',
    date: '2026-05-07',
  });

  const balances = balanceService.getBalances();
  assert.deepEqual(balances, {
    cashBalance: 100,
    onlineBalance: 1600,
    totalBalance: 1700,
    moneyToReceive: 400,
    moneyToPay: 500,
    totalCashCredit: 1000,
    totalCashDebit: 900,
    totalOnlineCredit: 1600,
    totalOnlineDebit: 0,
    totalLent: 500,
    totalReceivedBack: 100,
    totalBorrowed: 700,
    totalReturned: 200,
  });
  assert.equal(
    db.prepare('SELECT COALESCE(SUM(remaining_amount), 0) AS s FROM money_to_receive').get().s,
    balances.moneyToReceive
  );
  assert.equal(
    db.prepare('SELECT COALESCE(SUM(remaining_amount), 0) AS s FROM money_to_pay').get().s,
    balances.moneyToPay
  );
  assert.equal(balances.totalLent - balances.totalReceivedBack, balances.moneyToReceive);
  assert.equal(balances.totalBorrowed - balances.totalReturned, balances.moneyToPay);
});

test('report service returns curated totals and day, week, and month breakdowns', () => {
  clearData();

  createTransaction({
    date: '2026-03-01',
    amount: 1000,
    type: 'Credit',
    payment_mode: 'Cash',
    category: 'Salary',
  });
  createTransaction({
    date: '2026-03-02',
    amount: 400,
    type: 'Credit',
    payment_mode: 'Online',
    category: 'Business',
  });
  createTransaction({
    date: '2026-03-03',
    amount: 200,
    type: 'Debit',
    payment_mode: 'Online',
    category: 'Food',
  });
  const rahulDebt = createDebt('receive', {
    person_name: 'Rahul',
    amount: 500,
    payment_mode: 'Cash',
    date: '2026-03-10',
  });
  paymentService.receivePayment({
    related_debt_id: rahulDebt.id,
    amount: 100,
    payment_mode: 'Online',
    date: '2026-03-15',
  });
  const amitDebt = createDebt('pay', {
    person_name: 'Amit',
    amount: 300,
    payment_mode: 'Cash',
    date: '2026-03-12',
  });
  paymentService.payPayment({
    related_debt_id: amitDebt.id,
    amount: 50,
    payment_mode: 'Cash',
    date: '2026-03-18',
  });

  const query = {
    period: 'monthly',
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    group_by: 'day',
  };
  const report = reportService.getReport(query);
  assert.deepEqual(report.range, { start_date: '2026-03-01', end_date: '2026-03-31' });
  assert.deepEqual(report.totals, {
    income: 1800,
    expense: 750,
    net: 1050,
    cashIncome: 1300,
    cashExpense: 550,
    onlineIncome: 500,
    onlineExpense: 200,
    moneyReceived: 100,
    moneyReturned: 50,
    moneyToReceiveNow: 400,
    moneyToPayNow: 250,
    netCashFlow: 1100,
  });
  assert.deepEqual(Object.keys(report.breakdown).sort(), ['byCategory', 'byDay', 'byPaymentMode', 'byType']);
  assert.deepEqual(report.breakdown.byPaymentMode, {
    cash: { credit: 1300, debit: 550 },
    online: { credit: 500, debit: 200 },
  });
  assert.deepEqual(report.breakdown.byType, { credit: 1800, debit: 750 });
  assert.deepEqual(findBy(report.breakdown.byCategory, 'category', 'Salary'), {
    category: 'Salary',
    expense: 0,
    income: 1000,
  });
  assert.deepEqual(findBy(report.breakdown.byCategory, 'category', 'Food'), {
    category: 'Food',
    expense: 200,
    income: 0,
  });
  assert.deepEqual(findBy(report.breakdown.byCategory, 'category', 'Lent'), {
    category: 'Lent',
    expense: 500,
    income: 100,
  });
  assert.deepEqual(findBy(report.breakdown.byCategory, 'category', 'Borrowed'), {
    category: 'Borrowed',
    expense: 50,
    income: 300,
  });

  const dayReport = reportService.getReport(query);
  assert.deepEqual(findBy(dayReport.breakdown.byDay, 'date', '2026-03-01'), {
    date: '2026-03-01',
    expense: 0,
    income: 1000,
  });
  assert.deepEqual(findBy(dayReport.breakdown.byDay, 'date', '2026-03-10'), {
    date: '2026-03-10',
    expense: 500,
    income: 0,
  });
  assert.equal(dayReport.breakdown.byDay.length, 7);

  const weekReport = reportService.getReport({ ...query, group_by: 'week' });
  assert.deepEqual(findBy(weekReport.breakdown.byDay, 'date', '2026-02-23'), {
    date: '2026-02-23',
    expense: 0,
    income: 1000,
  });
  assert.deepEqual(findBy(weekReport.breakdown.byDay, 'date', '2026-03-09'), {
    date: '2026-03-09',
    expense: 500,
    income: 400,
  });
  assert.equal(weekReport.breakdown.byDay.length, 4);

  const monthReport = reportService.getReport({ ...query, group_by: 'month' });
  assert.deepEqual(monthReport.breakdown.byDay, [
    { date: '2026-03', expense: 750, income: 1800 },
  ]);
});

test('person service returns distinct people with debt-side net balances', () => {
  clearData();

  const rahulDebt = createDebt('receive', {
    person_name: 'Rahul',
    amount: 500,
    payment_mode: 'Cash',
    date: '2026-06-01',
  });
  paymentService.receivePayment({
    related_debt_id: rahulDebt.id,
    amount: 100,
    payment_mode: 'Cash',
    date: '2026-06-02',
  });
  const amitDebt = createDebt('pay', {
    person_name: 'Amit',
    amount: 300,
    payment_mode: 'Online',
    date: '2026-06-03',
  });
  paymentService.payPayment({
    related_debt_id: amitDebt.id,
    amount: 50,
    payment_mode: 'Online',
    date: '2026-06-04',
  });
  createTransaction({
    date: '2026-06-05',
    person_name: 'Asha',
    amount: 50,
    type: 'Credit',
    payment_mode: 'Cash',
    category: 'Salary',
  });

  assert.deepEqual(personService.getPersons(), [
    {
      person_name: 'Amit',
      lentTotal: 0,
      receivedBack: 0,
      netToReceive: 0,
      borrowedTotal: 300,
      returned: 50,
      netToPay: 250,
      balanceNet: -250,
    },
    {
      person_name: 'Asha',
      lentTotal: 0,
      receivedBack: 0,
      netToReceive: 0,
      borrowedTotal: 0,
      returned: 0,
      netToPay: 0,
      balanceNet: 0,
    },
    {
      person_name: 'Rahul',
      lentTotal: 500,
      receivedBack: 100,
      netToReceive: 400,
      borrowedTotal: 0,
      returned: 0,
      netToPay: 0,
      balanceNet: 400,
    },
  ]);
});

test('search service finds people in transactions, debts, and joined payment names', () => {
  clearData();

  const rahulDebt = createDebt('receive', {
    person_name: 'Rahul',
    amount: 500,
    payment_mode: 'Cash',
    date: '2026-07-01',
  });
  const amitDebt = createDebt('pay', {
    person_name: 'Amit',
    amount: 300,
    payment_mode: 'Online',
    date: '2026-07-02',
  });
  const rahulPayment = paymentService.receivePayment({
    related_debt_id: rahulDebt.id,
    amount: 100,
    payment_mode: 'Online',
    date: '2026-07-03',
    notes: 'unrelated note',
  });
  const amitPayment = paymentService.payPayment({
    related_debt_id: amitDebt.id,
    amount: 50,
    payment_mode: 'Cash',
    date: '2026-07-04',
    notes: 'another note',
  });

  const rahulResults = searchService.search('Rahul');
  assert.deepEqual(Object.keys(rahulResults).sort(), ['pay', 'payments', 'receive', 'transactions']);
  assert.equal(rahulResults.transactions.length, 2);
  assert.equal(rahulResults.receive.length, 1);
  assert.equal(rahulResults.pay.length, 0);
  assert.deepEqual(rahulResults.payments.map((row) => row.id), [rahulPayment.payment.id]);

  const amitResults = searchService.search('Amit');
  assert.equal(amitResults.transactions.length, 2);
  assert.equal(amitResults.pay.length, 1);
  assert.equal(amitResults.receive.length, 0);
  assert.deepEqual(amitResults.payments.map((row) => row.id), [amitPayment.payment.id]);
});

test('alerts service returns due-today, due-soon, and overdue arrays for both sides', () => {
  clearData();

  const today = todayUTC();
  const yesterday = addDaysUTC(today, -1);
  const soon = addDaysUTC(today, 2);
  const later = addDaysUTC(today, 5);
  const paySoon = addDaysUTC(today, 3);

  const receiveToday = createDebt('receive', {
    person_name: 'Today Receive',
    amount: 100,
    payment_mode: 'Cash',
    date: today,
    expected_date: today,
  });
  const receiveSoon = createDebt('receive', {
    person_name: 'Soon Receive',
    amount: 100,
    payment_mode: 'Cash',
    date: today,
    expected_date: soon,
  });
  const receiveOverdue = createDebt('receive', {
    person_name: 'Overdue Receive',
    amount: 100,
    payment_mode: 'Cash',
    date: yesterday,
    expected_date: yesterday,
  });
  const receiveLater = createDebt('receive', {
    person_name: 'Later Receive',
    amount: 100,
    payment_mode: 'Cash',
    date: today,
    expected_date: later,
  });
  const payToday = createDebt('pay', {
    person_name: 'Today Pay',
    amount: 100,
    payment_mode: 'Online',
    date: today,
    expected_date: today,
  });
  const paySoonDebt = createDebt('pay', {
    person_name: 'Soon Pay',
    amount: 100,
    payment_mode: 'Online',
    date: today,
    expected_date: paySoon,
  });
  const payOverdue = createDebt('pay', {
    person_name: 'Overdue Pay',
    amount: 100,
    payment_mode: 'Online',
    date: yesterday,
    expected_date: yesterday,
  });

  const alerts = alertsService.getAlerts();
  assert.deepEqual(Object.keys(alerts).sort(), ['pay', 'receive']);
  assert.deepEqual(Object.keys(alerts.receive).sort(), ['dueSoon', 'dueToday', 'overdue']);
  assert.deepEqual(Object.keys(alerts.pay).sort(), ['dueSoon', 'dueToday', 'overdue']);
  assert.deepEqual(alerts.receive.dueToday.map((row) => row.id), [receiveToday.id]);
  assert.deepEqual(alerts.receive.dueSoon.map((row) => row.id), [receiveSoon.id]);
  assert.deepEqual(alerts.receive.overdue.map((row) => row.id), [receiveOverdue.id]);
  assert.deepEqual(alerts.pay.dueToday.map((row) => row.id), [payToday.id]);
  assert.deepEqual(alerts.pay.dueSoon.map((row) => row.id), [paySoonDebt.id]);
  assert.deepEqual(alerts.pay.overdue.map((row) => row.id), [payOverdue.id]);
  assert.equal(alerts.receive.dueToday[0].received_amount, 0);
  assert.equal(alerts.pay.dueToday[0].paid_amount, 0);
  assert.equal(alerts.receive.dueSoon.some((row) => row.id === receiveLater.id), false);
  assert.equal(alerts.receive.overdue.some((row) => row.id === receiveLater.id), false);
});

test('category and export services provide categories and escaped, non-empty CSV', () => {
  clearData();

  const categories = categoryService.list();
  assert.equal(categories.length, 12);
  assert.equal(findBy(categories, 'name', 'Food').name, 'Food');
  assert.equal(categoryService.exists('Other'), true);
  assert.equal(categoryService.exists('Not A Category'), false);

  const escaped = exportService.rowsToCsv(
    [{ value: 'He said "hi", ok\nnext line', plain: 'plain' }],
    ['value', 'plain']
  );
  assert.equal(escaped, 'value,plain\r\n"He said ""hi"", ok\nnext line",plain\r\n');

  const transaction = createTransaction({
    date: '2026-08-10',
    person_name: 'CSV Person',
    amount: 250,
    type: 'Credit',
    payment_mode: 'Online',
    category: 'Business',
    description: 'Invoice, "urgent"\napproved',
  });
  const receiveDebt = createDebt('receive', {
    person_name: 'CSV, "Debt"',
    amount: 300,
    payment_mode: 'Cash',
    date: '2026-08-11',
  });
  paymentService.receivePayment({
    related_debt_id: receiveDebt.id,
    amount: 50,
    payment_mode: 'Online',
    date: '2026-08-12',
    notes: 'Payment, "done"\nverified',
  });
  const payDebt = createDebt('pay', {
    person_name: 'CSV Pay',
    amount: 400,
    payment_mode: 'Online',
    date: '2026-08-13',
  });

  const transactionsCsv = exportService.transactionsCsv();
  assert.match(
    transactionsCsv,
    /^id,date,time,person_name,amount,type,payment_mode,category,description,status\r\n/
  );
  assert.ok(transactionsCsv.length > 100);
  assert.ok(transactionsCsv.includes('Invoice, ""urgent""'));

  const receiveCsv = exportService.debtsCsv('receive');
  assert.match(
    receiveCsv,
    /^id,person_name,original_amount,received_amount,remaining_amount,date,expected_date,reason,status,notes\r\n/
  );
  assert.ok(receiveCsv.includes('CSV, ""Debt""'));

  const payCsv = exportService.debtsCsv('pay');
  assert.match(
    payCsv,
    /^id,person_name,original_amount,paid_amount,remaining_amount,date,expected_date,reason,status,notes\r\n/
  );
  assert.ok(payCsv.includes('CSV Pay'));

  const paymentsCsv = exportService.paymentsCsv();
  assert.match(paymentsCsv, /^id,related_debt_id,kind,amount,payment_mode,date,notes\r\n/);
  assert.ok(paymentsCsv.includes('Payment, ""done""'));

  const reportsCsv = exportService.reportsCsv({
    period: 'monthly',
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    group_by: 'day',
  });
  assert.ok(reportsCsv.length > 100);
  assert.match(reportsCsv, /^period,monthly\r\n/);
  assert.match(reportsCsv, /section,totals\r\n/);
  assert.match(reportsCsv, /category,expense,income\r\n/);
  assert.match(reportsCsv, /income,700\r\n/);
  assert.match(reportsCsv, /expense,300\r\n/);
  assert.ok(reportsCsv.includes('section,byDay'));
});

test('validators accept valid transaction, debt, payment, report, search, and export inputs', () => {
  const transaction = transactionValidator.validateCreate({
    date: '2026-09-01',
    amount: 10,
    type: 'Credit',
    payment_mode: 'Cash',
  });
  assert.deepEqual(transaction, {
    date: '2026-09-01',
    person_name: null,
    amount: 10,
    type: 'Credit',
    payment_mode: 'Cash',
    category: 'Other',
    description: null,
    status: 'Completed',
  });
  assert.deepEqual(transactionValidator.validateUpdate({ amount: 25, type: 'Debit' }), {
    amount: 25,
    type: 'Debit',
  });
  assert.deepEqual(
    transactionValidator.validateListQuery({
      type: 'Credit',
      payment_mode: 'Cash',
      q: 'Asha',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      page: '2',
      limit: '5',
      sort: 'amount_desc',
    }),
    {
      type: 'Credit',
      payment_mode: 'Cash',
      q: 'Asha',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      page: 2,
      limit: 5,
      sort: 'amount_desc',
    }
  );

  const debt = debtValidator.validateCreateDebt({
    person_name: 'Valid Person',
    amount: 20,
    payment_mode: 'Online',
    date: '2026-09-02',
  }, 'pay');
  assert.deepEqual(debt, {
    person_name: 'Valid Person',
    amount: 20,
    payment_mode: 'Online',
    date: '2026-09-02',
    expected_date: null,
    reason: null,
    notes: null,
  });
  assert.deepEqual(
    debtValidator.validateUpdateDebt({ notes: 'Updated', expected_date: null }),
    { data: { expected_date: null, notes: 'Updated' }, unknown: [] }
  );
  assert.deepEqual(
    debtValidator.validateListQuery('receive')({
      status: 'Pending',
      person_name: 'Valid Person',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      expected_start: '2026-09-02',
      expected_end: '2026-09-20',
      overdue: 'true',
    }),
    {
      status: 'Pending',
      person_name: 'Valid Person',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      expected_start: '2026-09-02',
      expected_end: '2026-09-20',
      overdue: true,
    }
  );

  const payment = paymentValidator.validatePayment({
    related_debt_id: 1,
    amount: 5,
    payment_mode: 'Cash',
    date: '2026-09-03',
  });
  assert.deepEqual(payment, {
    related_debt_id: 1,
    amount: 5,
    payment_mode: 'Cash',
    date: '2026-09-03',
    notes: null,
  });

  assert.deepEqual(
    queryValidator.validateReportQuery({ period: 'weekly', start_date: '2026-09-01', end_date: '2026-09-07', group_by: 'week' }),
    { period: 'weekly', start_date: '2026-09-01', end_date: '2026-09-07', group_by: 'week' }
  );
  assert.deepEqual(queryValidator.validateSearchQuery({ q: '  Asha  ' }), { q: 'Asha' });
  assert.deepEqual(
    queryValidator.validateExportQuery({ type: 'Debit', payment_mode: 'Online', page: '2', limit: '10', sort: 'amount_desc' }),
    { type: 'Debit', payment_mode: 'Online', page: 2, limit: 10, sort: 'amount_desc' }
  );
});

test('validators reject invalid amounts, enums, dates, queries, and search text', () => {
  const transactionBase = {
    date: '2026-09-01',
    amount: 10,
    type: 'Credit',
    payment_mode: 'Cash',
  };
  assertAppError(
    () => transactionValidator.validateCreate({ ...transactionBase, amount: -1 }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => transactionValidator.validateCreate({ ...transactionBase, amount: 0 }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => transactionValidator.validateCreate({ ...transactionBase, amount: 1.5 }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => transactionValidator.validateCreate({ ...transactionBase, type: 'Transfer' }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => transactionValidator.validateCreate({ ...transactionBase, date: '2026-02-30' }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => transactionValidator.validateUpdate({ amount: 0 }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => transactionValidator.validateListQuery({ page: '0', limit: '201' }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => debtValidator.validateListQuery('receive')({ status: 'Unknown' }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => debtValidator.validateUpdateDebt({ person_name: '' }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => debtValidator.validateCreateDebt({ person_name: 'X', amount: 0, payment_mode: 'Cash', date: '2026-09-01' }, 'receive'),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => debtValidator.validateCreateDebt({ person_name: 'X', amount: 10, payment_mode: 'Card', date: '2026-09-01' }, 'pay'),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => paymentValidator.validatePayment({ related_debt_id: 1, amount: 1, payment_mode: 'Cash', date: 'bad-date' }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => queryValidator.validateReportQuery({ start_date: '2026-02-30', end_date: '2026-03-01' }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(
    () => queryValidator.validateReportQuery({ group_by: 'quarter' }),
    400,
    'VALIDATION_ERROR'
  );
  assertAppError(() => queryValidator.validateSearchQuery({ q: 'a' }), 422, 'VALIDATION_ERROR');
  assertAppError(() => queryValidator.validateSearchQuery({ q: 'a'.repeat(101) }), 422, 'VALIDATION_ERROR');
  assertAppError(
    () => queryValidator.validateExportQuery({ page: '0', limit: '201' }),
    400,
    'VALIDATION_ERROR'
  );
});

test('asPositiveInt rejects floats, strings, zero, and negative values', () => {
  assert.equal(asPositiveInt(1), 1);
  assert.equal(asPositiveInt(125), 125);
  assert.equal(asPositiveInt(1.5), null);
  assert.equal(asPositiveInt('1'), null);
  assert.equal(asPositiveInt(0), null);
  assert.equal(asPositiveInt(-1), null);
});
