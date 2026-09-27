'use strict';

const { db, withTransaction } = require('../db/connection');
const { AppError } = require('../middleware/errorHandler');
const { EDITABLE } = require('../validators/debtValidator');

/** Side configuration shared by money_to_receive and money_to_pay. */
const SIDES = {
  receive: {
    table: 'money_to_receive',
    name: 'money-to-receive',
    paymentsKind: 'receive',
    progressCol: 'received_amount',
    finalStatus: 'Received',
    source: 'lend',
    txType: 'Debit',
    txCategory: 'Lent',
    txDescription: (person) => `Lent to ${person}`,
  },
  pay: {
    table: 'money_to_pay',
    name: 'money-to-pay',
    paymentsKind: 'pay',
    progressCol: 'paid_amount',
    finalStatus: 'Paid',
    source: 'borrow',
    txType: 'Credit',
    txCategory: 'Borrowed',
    txDescription: (person) => `Borrowed from ${person}`,
  },
};

function side(name) {
  const s = SIDES[name];
  if (!s) throw new AppError(500, 'INTERNAL_ERROR', `Unknown debt side: ${name}`);
  return s;
}

function getDebt(name, id, { withPayments = false } = {}) {
  const s = side(name);
  const row = db.prepare(`SELECT * FROM ${s.table} WHERE id = ?`).get(id);
  if (!row) return null;
  if (withPayments) {
    row.payments = db
      .prepare(
        `SELECT id, related_debt_id, kind, amount, payment_mode, date, notes, created_at
         FROM payments WHERE related_debt_id = ? AND kind = ? ORDER BY date DESC, id DESC`
      )
      .all(id, s.paymentsKind);
  }
  return row;
}

function listDebts(name, filters = {}) {
  const s = side(name);
  const where = [];
  const params = [];

  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.person_name) {
    where.push('person_name LIKE ?');
    params.push(`%${filters.person_name}%`);
  }
  if (filters.start_date) {
    where.push('date >= ?');
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    where.push('date <= ?');
    params.push(filters.end_date);
  }
  if (filters.expected_start) {
    where.push('expected_date >= ?');
    params.push(filters.expected_start);
  }
  if (filters.expected_end) {
    where.push('expected_date <= ?');
    params.push(filters.expected_end);
  }
  if (filters.overdue) {
    where.push("expected_date IS NOT NULL AND expected_date < date('now') AND status != ?");
    params.push(s.finalStatus);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db
    .prepare(`SELECT * FROM ${s.table} ${whereSql} ORDER BY date DESC, id DESC`)
    .all(...params);
}

/**
 * Create a lend (receive) or borrow (pay) record PLUS its system transaction
 * in a single SQLite transaction.
 *   - money_to_receive + Debit transaction (source='lend', category='Lent')
 *   - money_to_pay     + Credit transaction (source='borrow', category='Borrowed')
 */
function createDebt(name, data) {
  const s = side(name);
  return withTransaction(() => {
    const row = {
      person_name: data.person_name,
      amount: data.amount,
      date: data.date,
      expected_date: data.expected_date || null,
      reason: data.reason || null,
      notes: data.notes || null,
    };
    const info = db
      .prepare(
        `INSERT INTO ${s.table}
           (person_name, original_amount, ${s.progressCol}, remaining_amount, date, expected_date, reason, status, notes)
         VALUES (@person_name, @amount, 0, @amount, @date, @expected_date, @reason, 'Pending', @notes)`
      )
      .run(row);
    const debtId = Number(info.lastInsertRowid);

    db.prepare(
      `INSERT INTO transactions (date, person_name, amount, type, payment_mode, category, description, status, source, ref_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?)`
    ).run(
      data.date,
      data.person_name,
      data.amount,
      s.txType,
      data.payment_mode,
      s.txCategory,
      s.txDescription(data.person_name),
      s.source,
      debtId
    );

    return getDebt(name, debtId);
  });
}

/**
 * Update a debt. Only non-financial fields may change (person_name,
 * expected_date, reason, notes). Providing any financial/system field is
 * rejected with 409 -- amounts are governed by the payment flow.
 */
function updateDebt(name, id, data) {
  const s = side(name);
  const existing = getDebt(name, id);
  if (!existing) return null;

  const unknown = Object.keys(data).filter((k) => !EDITABLE.includes(k));
  if (unknown.length) {
    throw new AppError(
      409,
      'READONLY_FIELD',
      'Financial fields cannot be edited once the record exists; record a payment instead.',
      unknown.map((field) => ({ field, issue: 'This field is read-only (drives balance effects)' }))
    );
  }

  const keys = EDITABLE.filter((k) => Object.prototype.hasOwnProperty.call(data, k));
  if (!keys.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nothing to update', [{ field: 'body', issue: 'Provide at least one editable field' }]);
  }

  const sets = keys.map((k) => `${k} = @${k}`).join(', ');
  const params = { id };
  for (const k of keys) params[k] = data[k];
  db.prepare(`UPDATE ${s.table} SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(params);
  return getDebt(name, id);
}

/**
 * Delete a debt. Rejected with 409 when payments exist against it. When no
 * payments exist, the matching system transaction (lend/borrow) is removed
 * too, atomically, so balances stay consistent.
 */
function deleteDebt(name, id) {
  const s = side(name);
  return withTransaction(() => {
    const existing = db.prepare(`SELECT id FROM ${s.table} WHERE id = ?`).get(id);
    if (!existing) return false;

    const paymentCount = db
      .prepare('SELECT COUNT(*) AS n FROM payments WHERE related_debt_id = ? AND kind = ?')
      .get(id, s.paymentsKind).n;
    if (paymentCount > 0) {
      throw new AppError(
        409,
        'PAYMENT_EXISTS',
        'Cannot delete this record while payments exist against it. Close or adjust it instead.'
      );
    }

    db.prepare(`DELETE FROM ${s.table} WHERE id = ?`).run(id);
    db.prepare('DELETE FROM transactions WHERE source = ? AND ref_id = ?').run(s.source, id);
    return true;
  });
}

module.exports = { getDebt, listDebts, createDebt, updateDebt, deleteDebt };