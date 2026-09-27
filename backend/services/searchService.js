'use strict';

const { db } = require('../db/connection');

const SEARCH_LIMIT = 100;

/**
 * Global search. q is validated (min 2 chars) before this runs.
 * Matches a person name across debts through the payments join so that
 * searching a person returns all their payment history too.
 */
function search(q) {
  const like = `%${q}%`;

  const transactions = db
    .prepare(
      `SELECT * FROM transactions
       WHERE person_name LIKE ? OR description LIKE ? OR category LIKE ?
       ORDER BY date DESC, id DESC LIMIT ?`
    )
    .all(like, like, like, SEARCH_LIMIT);

  const receive = db
    .prepare(
      `SELECT * FROM money_to_receive
       WHERE person_name LIKE ? OR reason LIKE ? OR notes LIKE ?
       ORDER BY date DESC, id DESC LIMIT ?`
    )
    .all(like, like, like, SEARCH_LIMIT);

  const pay = db
    .prepare(
      `SELECT * FROM money_to_pay
       WHERE person_name LIKE ? OR reason LIKE ? OR notes LIKE ?
       ORDER BY date DESC, id DESC LIMIT ?`
    )
    .all(like, like, like, SEARCH_LIMIT);

  const payments = db
    .prepare(
      `SELECT p.* FROM payments p
       LEFT JOIN money_to_receive r ON p.kind = 'receive' AND p.related_debt_id = r.id
       LEFT JOIN money_to_pay m ON p.kind = 'pay' AND p.related_debt_id = m.id
       WHERE p.notes LIKE ? OR COALESCE(r.person_name, '') LIKE ? OR COALESCE(m.person_name, '') LIKE ?
       ORDER BY p.date DESC, p.id DESC LIMIT ?`
    )
    .all(like, like, like, SEARCH_LIMIT);

  return { transactions, receive, pay, payments };
}

module.exports = { search };