'use strict';

const { db } = require('../db/connection');
const { AppError } = require('../middleware/errorHandler');

const SORTS = {
  date_desc: 'date DESC, id DESC',
  date_asc: 'date ASC, id ASC',
  amount_desc: 'amount DESC, id DESC',
  amount_asc: 'amount ASC, id ASC',
};

const COLUMNS =
  'id, date, time, person_name, amount, type, payment_mode, category, description, status, source, ref_id, created_at, updated_at';

const UPDATE_FIELDS = [
  'date',
  'time',
  'person_name',
  'amount',
  'type',
  'payment_mode',
  'category',
  'description',
  'status',
];

/** Shared filter builder used by the list and export endpoints. */
function buildWhere(filters) {
  const where = [];
  const params = [];

  if (filters.type) {
    where.push('type = ?');
    params.push(filters.type);
  }
  if (filters.payment_mode) {
    where.push('payment_mode = ?');
    params.push(filters.payment_mode);
  }
  if (filters.category) {
    where.push('category = ?');
    params.push(filters.category);
  }
  if (filters.person_name) {
    where.push('person_name LIKE ?');
    params.push(`%${filters.person_name}%`);
  }
  if (filters.q && filters.q.length >= 2) {
    where.push('(person_name LIKE ? OR description LIKE ? OR category LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  if (filters.start_date) {
    where.push('date >= ?');
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    where.push('date <= ?');
    params.push(filters.end_date);
  }

  return { where, params };
}

function getById(id) {
  return db.prepare(`SELECT ${COLUMNS} FROM transactions WHERE id = ?`).get(id) || null;
}

function list({ filters = {}, page = 1, limit = 20, sort = 'date_desc' }) {
  const { where, params } = buildWhere(filters);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = SORTS[sort] || SORTS.date_desc;

  const total = db.prepare(`SELECT COUNT(*) AS n FROM transactions ${whereSql}`).get(...params).n;
  const pages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const data = db
    .prepare(`SELECT ${COLUMNS} FROM transactions ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return { data, pagination: { page, limit, total, pages } };
}

/** All rows matching the filters (used by CSV export). */
function findAll(filters = {}) {
  const { where, params } = buildWhere(filters);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db
    .prepare(`SELECT ${COLUMNS} FROM transactions ${whereSql} ORDER BY date DESC, id DESC`)
    .all(...params);
}

function create(data) {
  const row = {
    date: data.date,
    time: data.time || null,
    person_name: data.person_name || null,
    amount: data.amount,
    type: data.type,
    payment_mode: data.payment_mode,
    category: data.category || 'Other',
    description: data.description || null,
    status: data.status || 'Completed',
  };
  const info = db
    .prepare(
      `INSERT INTO transactions (date, time, person_name, amount, type, payment_mode, category, description, status, source)
       VALUES (@date, @time, @person_name, @amount, @type, @payment_mode, @category, @description, @status, 'manual')`
    )
    .run(row);
  return getById(info.lastInsertRowid);
}

function update(id, patch) {
  const existing = getById(id);
  if (!existing) return null;
  if (existing.source !== 'manual') {
    throw new AppError(
      409,
      'SYSTEM_TRANSACTION',
      'System-generated transactions (lend/borrow/receive/pay) cannot be edited. Adjust the related debt or record a payment instead.'
    );
  }

  const keys = UPDATE_FIELDS.filter((k) => Object.prototype.hasOwnProperty.call(patch, k));
  const sets = keys.map((k) => `${k} = @${k}`).join(', ');
  const params = { id };
  for (const k of keys) params[k] = patch[k];
  db.prepare(`UPDATE transactions SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(params);
  return getById(id);
}

function remove(id) {
  const existing = getById(id);
  if (!existing) return false;
  if (existing.source !== 'manual') {
    throw new AppError(
      409,
      'SYSTEM_TRANSACTION',
      'System-generated transactions (lend/borrow/receive/pay) cannot be deleted. Delete the related debt or reverse the payment instead.'
    );
  }
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return true;
}

/** Ensure a category exists before referencing it in a transaction (clean 400). */
function assertCategoryExists(category) {
  const row = db.prepare('SELECT id FROM categories WHERE name = ?').get(category);
  if (!row) {
    throw new AppError(400, 'VALIDATION_ERROR', `Unknown category "${category}"`, [
      { field: 'category', issue: `Category must be one of the seeded categories` },
    ]);
  }
}

module.exports = { getById, list, findAll, create, update, remove, assertCategoryExists };