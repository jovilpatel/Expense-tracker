'use strict';

process.env.DB_PATH = 'C:\\Users\\JOVIL\\AppData\\Local\\Temp\\opencode\\expense-tracker-finance-test.db';
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
const transactionValidator = require('../validators/transactionValidator');

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

test.after(() => {
  db.close();
});

test('mandatory finance scenario remains balanced through debt and payment flows', () => {
  clearData();

  let balances = balanceService.getBalances();
  assert.deepEqual(
    {
      cashBalance: balances.cashBalance,
      onlineBalance: balances.onlineBalance,
      totalBalance: balances.totalBalance,
      moneyToReceive: balances.moneyToReceive,
      moneyToPay: balances.moneyToPay,
    },
    { cashBalance: 0, onlineBalance: 0, totalBalance: 0, moneyToReceive: 0, moneyToPay: 0 }
  );

  const cashCredit = createTransaction({
    date: '2026-01-01',
    amount: 10000,
    type: 'Credit',
    payment_mode: 'Cash',
    category: 'Salary',
    description: 'Starting cash',
  });
  assert.equal(cashCredit.source, 'manual');
  balances = balanceService.getBalances();
  assert.equal(balances.cashBalance, 10000);

  createTransaction({
    date: '2026-01-02',
    amount: 2000,
    type: 'Debit',
    payment_mode: 'Cash',
    category: 'Food',
    description: 'Cash spending',
  });
  balances = balanceService.getBalances();
  assert.equal(balances.cashBalance, 8000);

  createTransaction({
    date: '2026-01-03',
    amount: 5000,
    type: 'Credit',
    payment_mode: 'Online',
    category: 'Salary',
    description: 'Online income',
  });
  balances = balanceService.getBalances();
  assert.equal(balances.onlineBalance, 5000);

  createTransaction({
    date: '2026-01-04',
    amount: 1000,
    type: 'Debit',
    payment_mode: 'Online',
    category: 'Bills',
    description: 'Online spending',
  });
  balances = balanceService.getBalances();
  assert.equal(balances.onlineBalance, 4000);
  assert.equal(balances.totalBalance, 12000);

  const rahulDebt = debtService.createDebt('receive', {
    person_name: 'Rahul',
    amount: 2000,
    payment_mode: 'Cash',
    date: '2026-01-05',
    expected_date: '2026-02-05',
    reason: 'Lend',
    notes: 'Cash lent',
  });
  assert.equal(rahulDebt.status, 'Pending');
  assert.equal(rahulDebt.remaining_amount, 2000);
  balances = balanceService.getBalances();
  assert.equal(balances.cashBalance, 6000);
  assert.equal(balances.moneyToReceive, 2000);
  const lendTransaction = transactionService.findAll().find(
    (row) => row.source === 'lend' && row.ref_id === rahulDebt.id
  );
  assert.equal(lendTransaction.type, 'Debit');
  assert.equal(lendTransaction.payment_mode, 'Cash');
  assert.equal(lendTransaction.amount, 2000);

  const rahulPayment = paymentService.receivePayment({
    related_debt_id: rahulDebt.id,
    amount: 500,
    payment_mode: 'Online',
    date: '2026-01-06',
    notes: 'Partial return',
  });
  assert.equal(rahulPayment.payment.kind, 'receive');
  assert.equal(rahulPayment.transaction.type, 'Credit');
  assert.equal(rahulPayment.transaction.source, 'receive');
  assert.equal(rahulPayment.debt.status, 'Partially Received');
  balances = balanceService.getBalances();
  assert.equal(balances.onlineBalance, 4500);
  assert.equal(balances.moneyToReceive, 1500);

  const amitDebt = debtService.createDebt('pay', {
    person_name: 'Amit',
    amount: 3000,
    payment_mode: 'Cash',
    date: '2026-01-07',
    expected_date: '2026-02-07',
    reason: 'Borrow',
    notes: 'Cash borrowed',
  });
  assert.equal(amitDebt.status, 'Pending');
  assert.equal(amitDebt.remaining_amount, 3000);
  balances = balanceService.getBalances();
  assert.equal(balances.cashBalance, 9000);
  assert.equal(balances.moneyToPay, 3000);
  const borrowTransaction = transactionService.findAll().find(
    (row) => row.source === 'borrow' && row.ref_id === amitDebt.id
  );
  assert.equal(borrowTransaction.type, 'Credit');
  assert.equal(borrowTransaction.payment_mode, 'Cash');

  const amitPayment = paymentService.payPayment({
    related_debt_id: amitDebt.id,
    amount: 1000,
    payment_mode: 'Cash',
    date: '2026-01-08',
    notes: 'Partial repayment',
  });
  assert.equal(amitPayment.payment.kind, 'pay');
  assert.equal(amitPayment.transaction.type, 'Debit');
  assert.equal(amitPayment.transaction.source, 'pay');
  assert.equal(amitPayment.debt.status, 'Partially Paid');
  balances = balanceService.getBalances();
  assert.equal(balances.cashBalance, 8000);
  assert.equal(balances.moneyToPay, 2000);

  const systemTransactions = transactionService.findAll().filter((row) => row.source !== 'manual');
  assert.deepEqual(
    systemTransactions.map((row) => row.source).sort(),
    ['borrow', 'lend', 'pay', 'receive']
  );
  for (const transaction of systemTransactions) {
    assertAppError(
      () => transactionService.update(transaction.id, { amount: transaction.amount + 1 }),
      409,
      'SYSTEM_TRANSACTION'
    );
    assertAppError(() => transactionService.remove(transaction.id), 409, 'SYSTEM_TRANSACTION');
  }

  assertAppError(
    () => paymentService.receivePayment({
      related_debt_id: rahulDebt.id,
      amount: 1501,
      payment_mode: 'Cash',
      date: '2026-01-09',
    }),
    422,
    'AMOUNT_EXCEEDS_REMAINING'
  );
  assert.equal(debtService.getDebt('receive', rahulDebt.id).remaining_amount, 1500);
  assertAppError(
    () => paymentService.payPayment({
      related_debt_id: amitDebt.id,
      amount: 2001,
      payment_mode: 'Cash',
      date: '2026-01-09',
    }),
    422,
    'AMOUNT_EXCEEDS_REMAINING'
  );
  assert.equal(debtService.getDebt('pay', amitDebt.id).remaining_amount, 2000);

  assertAppError(() => debtService.deleteDebt('receive', rahulDebt.id), 409, 'PAYMENT_EXISTS');
  assertAppError(() => debtService.deleteDebt('pay', amitDebt.id), 409, 'PAYMENT_EXISTS');

  const discardReceive = debtService.createDebt('receive', {
    person_name: 'Discard Receive',
    amount: 100,
    payment_mode: 'Cash',
    date: '2026-01-10',
    expected_date: null,
    reason: null,
    notes: null,
  });
  const discardReceiveTransaction = transactionService.findAll().find(
    (row) => row.source === 'lend' && row.ref_id === discardReceive.id
  );
  assert.equal(debtService.deleteDebt('receive', discardReceive.id), true);
  assert.equal(debtService.getDebt('receive', discardReceive.id), null);
  assert.equal(transactionService.getById(discardReceiveTransaction.id), null);

  const discardPay = debtService.createDebt('pay', {
    person_name: 'Discard Pay',
    amount: 100,
    payment_mode: 'Online',
    date: '2026-01-11',
    expected_date: null,
    reason: null,
    notes: null,
  });
  const discardPayTransaction = transactionService.findAll().find(
    (row) => row.source === 'borrow' && row.ref_id === discardPay.id
  );
  assert.equal(debtService.deleteDebt('pay', discardPay.id), true);
  assert.equal(debtService.getDebt('pay', discardPay.id), null);
  assert.equal(transactionService.getById(discardPayTransaction.id), null);

  const badTransactions = [
    { date: '2026-01-01', amount: -1, type: 'Credit', payment_mode: 'Cash' },
    { date: '2026-01-01', amount: 0, type: 'Credit', payment_mode: 'Cash' },
    { date: '2026-01-01', amount: 1.5, type: 'Credit', payment_mode: 'Cash' },
    { date: '2026-01-01', amount: 100, type: 'Transfer', payment_mode: 'Cash' },
    { date: '2026-02-30', amount: 100, type: 'Credit', payment_mode: 'Cash' },
  ];
  for (const body of badTransactions) {
    assertAppError(() => transactionValidator.validateCreate(body), 400, 'VALIDATION_ERROR');
  }

  const finalReceive = paymentService.receivePayment({
    related_debt_id: rahulDebt.id,
    amount: 1500,
    payment_mode: 'Online',
    date: '2026-01-12',
  });
  const finalPay = paymentService.payPayment({
    related_debt_id: amitDebt.id,
    amount: 2000,
    payment_mode: 'Cash',
    date: '2026-01-13',
  });
  assert.equal(finalReceive.debt.status, 'Received');
  assert.equal(finalPay.debt.status, 'Paid');

  const finalReceiveDebt = debtService.getDebt('receive', rahulDebt.id);
  const finalPayDebt = debtService.getDebt('pay', amitDebt.id);
  assert.equal(finalReceiveDebt.remaining_amount, 0);
  assert.equal(finalReceiveDebt.received_amount, finalReceiveDebt.original_amount);
  assert.equal(finalPayDebt.remaining_amount, 0);
  assert.equal(finalPayDebt.paid_amount, finalPayDebt.original_amount);

  balances = balanceService.getBalances();
  assert.deepEqual(
    {
      cashBalance: balances.cashBalance,
      onlineBalance: balances.onlineBalance,
      totalBalance: balances.totalBalance,
      moneyToReceive: balances.moneyToReceive,
      moneyToPay: balances.moneyToPay,
      totalReceivedBack: balances.totalReceivedBack,
      totalReturned: balances.totalReturned,
    },
    {
      cashBalance: 6000,
      onlineBalance: 6000,
      totalBalance: 12000,
      moneyToReceive: 0,
      moneyToPay: 0,
      totalReceivedBack: 2000,
      totalReturned: 3000,
    }
  );
  assert.equal(
    finalReceiveDebt.received_amount + finalReceiveDebt.remaining_amount,
    finalReceiveDebt.original_amount
  );
  assert.equal(
    finalPayDebt.paid_amount + finalPayDebt.remaining_amount,
    finalPayDebt.original_amount
  );
  assert.equal(balances.totalLent - balances.totalReceivedBack, balances.moneyToReceive);
  assert.equal(balances.totalBorrowed - balances.totalReturned, balances.moneyToPay);
});
