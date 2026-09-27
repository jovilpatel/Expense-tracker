'use strict';

const { db } = require('../db/connection');

function sumOf(sql, ...params) {
  const row = db.prepare(sql).get(...params);
  return row ? row.s || 0 : 0;
}

/**
 * All balances computed fresh from the transactions + debt tables so the
 * numbers always agree with the recorded ledger.
 */
function getBalances() {
  const totalCashCredit = sumOf("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE payment_mode = 'Cash' AND type = 'Credit'");
  const totalCashDebit = sumOf("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE payment_mode = 'Cash' AND type = 'Debit'");
  const totalOnlineCredit = sumOf("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE payment_mode = 'Online' AND type = 'Credit'");
  const totalOnlineDebit = sumOf("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE payment_mode = 'Online' AND type = 'Debit'");

  const cashBalance = totalCashCredit - totalCashDebit;
  const onlineBalance = totalOnlineCredit - totalOnlineDebit;

  const moneyToReceive = sumOf('SELECT COALESCE(SUM(remaining_amount),0) AS s FROM money_to_receive');
  const moneyToPay = sumOf('SELECT COALESCE(SUM(remaining_amount),0) AS s FROM money_to_pay');

  const totalLent = sumOf('SELECT COALESCE(SUM(original_amount),0) AS s FROM money_to_receive');
  const totalReceivedBack = sumOf('SELECT COALESCE(SUM(received_amount),0) AS s FROM money_to_receive');
  const totalBorrowed = sumOf('SELECT COALESCE(SUM(original_amount),0) AS s FROM money_to_pay');
  const totalReturned = sumOf('SELECT COALESCE(SUM(paid_amount),0) AS s FROM money_to_pay');

  return {
    cashBalance,
    onlineBalance,
    totalBalance: cashBalance + onlineBalance,
    moneyToReceive,
    moneyToPay,
    totalCashCredit,
    totalCashDebit,
    totalOnlineCredit,
    totalOnlineDebit,
    totalLent,
    totalReceivedBack,
    totalBorrowed,
    totalReturned,
  };
}

module.exports = { getBalances };