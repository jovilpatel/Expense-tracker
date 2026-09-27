'use strict';

const { db, withTransaction } = require('../db/connection');
const { AppError } = require('../middleware/errorHandler');

/** Side configuration for receive/pay payment flows. */
const SIDES = {
  receive: {
    table: 'money_to_receive',
    progressCol: 'received_amount',
    remainingCol: 'remaining_amount',
    partialStatus: 'Partially Received',
    finalStatus: 'Received',
    blockedStatus: 'Received',
    kind: 'receive',
    source: 'receive',
    txType: 'Credit',
    txCategory: 'Lent',
    txDescription: (person) => `Received from ${person}`,
  },
  pay: {
    table: 'money_to_pay',
    progressCol: 'paid_amount',
    remainingCol: 'remaining_amount',
    partialStatus: 'Partially Paid',
    finalStatus: 'Paid',
    blockedStatus: 'Paid',
    kind: 'pay',
    source: 'pay',
    txType: 'Debit',
    txCategory: 'Borrowed',
    txDescription: (person) => `Paid to ${person}`,
  },
};

/**
 * Atomic payment application:
 *  1. INSERT payments row
 *  2. UPDATE debt (progress += amount, remaining -= amount, status transition)
 *  3. INSERT system transaction (Credit for receive / Debit for pay)
 * Rolled back automatically on any failure via withTransaction.
 */
function applyPayment(name, data) {
  const s = SIDES[name];
  return withTransaction(() => {
    const debt = db.prepare(`SELECT * FROM ${s.table} WHERE id = ?`).get(data.related_debt_id);
    if (!debt) {
      throw new AppError(404, 'NOT_FOUND', 'Debt record not found');
    }
    if (debt.status === s.blockedStatus) {
      throw new AppError(409, 'CONFLICT', `This record is already fully ${s.finalStatus.toLowerCase()}`);
    }
    if (data.amount > debt.remaining_amount) {
      throw new AppError(
        422,
        'AMOUNT_EXCEEDS_REMAINING',
        `Amount (${data.amount}) exceeds the remaining amount of ${debt.remaining_amount}`,
        [{ field: 'amount', issue: `Max allowed is ${debt.remaining_amount}` }]
      );
    }

    const newProgress = debt[s.progressCol] + data.amount;
    const newRemaining = debt[s.remainingCol] - data.amount;
    const status = newRemaining === 0 ? s.finalStatus : s.partialStatus;

    const paymentInfo = db
      .prepare(
        `INSERT INTO payments (related_debt_id, kind, amount, payment_mode, date, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(data.related_debt_id, s.kind, data.amount, data.payment_mode, data.date, data.notes || null);

    db.prepare(
      `UPDATE ${s.table}
       SET ${s.progressCol} = ?, ${s.remainingCol} = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(newProgress, newRemaining, status, data.related_debt_id);

    const txInfo = db
      .prepare(
        `INSERT INTO transactions (date, person_name, amount, type, payment_mode, category, description, status, source, ref_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?)`
      )
      .run(
        data.date,
        debt.person_name,
        data.amount,
        s.txType,
        data.payment_mode,
        s.txCategory,
        s.txDescription(debt.person_name),
        s.source,
        data.related_debt_id
      );

    return {
      payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentInfo.lastInsertRowid),
      debt: db.prepare(`SELECT * FROM ${s.table} WHERE id = ?`).get(data.related_debt_id),
      transaction: db.prepare('SELECT * FROM transactions WHERE id = ?').get(txInfo.lastInsertRowid),
    };
  });
}

function receivePayment(data) {
  return applyPayment('receive', data);
}

function payPayment(data) {
  return applyPayment('pay', data);
}

module.exports = { receivePayment, payPayment };