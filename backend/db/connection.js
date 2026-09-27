'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = './data/expense.db';
const BACKEND_DIR = path.resolve(__dirname, '..');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

function resolveDbPath(configured) {
  // Env takes precedence; relative paths are anchored to the backend root.
  const value = configured || DEFAULT_DB_PATH;
  return path.isAbsolute(value) ? value : path.resolve(BACKEND_DIR, value);
}

const DB_PATH = resolveDbPath(process.env.DB_PATH);
const DATA_DIR = path.dirname(DB_PATH);

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Pragmas (see contract section 8):
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

function ensureSchema() {
  const existing = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'transactions' LIMIT 1")
    .get();
  if (!existing) {
    const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    db.exec(sql);
  }
}

ensureSchema();

/**
 * Run `fn(...args)` atomically inside a single SQLite transaction.
 * Uses BEGIN IMMEDIATE so the write lock is taken up-front (avoids
 * lock-upgrade deadlocks on the payment/debt flows which read-then-write).
 * On throw: better-sqlite3 rolls back automatically and re-throws.
 *
 * @template T
 * @param {(...args: any[]) => T} fn
 * @param {...any} args passed through to fn
 * @returns {T} the return value of fn
 */
function withTransaction(fn, ...args) {
  return db.transaction(fn).immediate(...args);
}

module.exports = {
  db,
  withTransaction,
  DB_PATH,
  resolveDbPath,
};