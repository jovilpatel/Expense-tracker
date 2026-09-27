-- =====================================================================
-- Expense & Money Tracker - Schema
-- Contract source: docs/ARCHITECTURE.md (authoritative)
-- Amounts are POSITIVE integers (Rupees, no decimals).
-- =====================================================================

PRAGMA foreign_keys = ON;

-- users ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- categories -------------------------------------------------------------
-- Fixed list seeded below (idempotent).
CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL UNIQUE
);

-- transactions -------------------------------------------------------------
-- AUX columns added by Database Agent (not in contract) to protect
-- system-generated debt flows from double counting / deletion:
--   * source TEXT  -> 'manual' (user entry) | 'lend' | 'receive' | 'borrow' | 'pay'
--   * ref_id INTEGER -> related debt row (money_to_receive.id or
--     money_to_pay.id). Polymorphic reference, so NO FK is declared.
CREATE TABLE IF NOT EXISTS transactions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT    NOT NULL,                          -- YYYY-MM-DD
  time         TEXT,                                      -- HH:MM (nullable)
  person_name  TEXT,
  amount       INTEGER NOT NULL CHECK (amount > 0),
  type         TEXT    NOT NULL CHECK (type IN ('Credit','Debit')),
  payment_mode TEXT    NOT NULL CHECK (payment_mode IN ('Cash','Online')),
  category     TEXT    NOT NULL DEFAULT 'Other' REFERENCES categories(name),
  description  TEXT,
  status       TEXT    NOT NULL DEFAULT 'Completed',
  source       TEXT    NOT NULL DEFAULT 'manual'
               CHECK (source IN ('manual','lend','receive','borrow','pay')),
  ref_id       INTEGER,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- money_to_receive (Lent) ---------------------------------------------------
CREATE TABLE IF NOT EXISTS money_to_receive (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  person_name      TEXT    NOT NULL,
  original_amount  INTEGER NOT NULL CHECK (original_amount > 0),
  received_amount  INTEGER NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
  remaining_amount INTEGER NOT NULL CHECK (remaining_amount >= 0),
  date             TEXT    NOT NULL,                      -- YYYY-MM-DD (when lent)
  expected_date    TEXT,                                  -- YYYY-MM-DD (nullable)
  reason           TEXT,
  status           TEXT    NOT NULL
                   CHECK (status IN ('Pending','Partially Received','Received')),
  notes            TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  -- Invariant: received + remaining == original (SQLite CHECKs multiple columns)
  CHECK (original_amount = received_amount + remaining_amount)
);

-- money_to_pay (Borrowed) ---------------------------------------------------
CREATE TABLE IF NOT EXISTS money_to_pay (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  person_name      TEXT    NOT NULL,
  original_amount  INTEGER NOT NULL CHECK (original_amount > 0),
  paid_amount      INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount INTEGER NOT NULL CHECK (remaining_amount >= 0),
  date             TEXT    NOT NULL,                      -- YYYY-MM-DD (when borrowed)
  expected_date    TEXT,                                  -- YYYY-MM-DD (nullable)
  reason           TEXT,
  status           TEXT    NOT NULL
                   CHECK (status IN ('Pending','Partially Paid','Paid')),
  notes            TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  -- Invariant: paid + remaining == original
  CHECK (original_amount = paid_amount + remaining_amount)
);

-- payments -------------------------------------------------------------------
-- related_debt_id points to a row in money_to_receive (kind='receive') or
-- money_to_pay (kind='pay'). Cross-table reference; no SQLite FK required and
-- none declared. Which table is validated by application logic.
CREATE TABLE IF NOT EXISTS payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  related_debt_id INTEGER NOT NULL CHECK (related_debt_id > 0),
  kind            TEXT    NOT NULL CHECK (kind IN ('receive','pay')),
  amount          INTEGER NOT NULL CHECK (amount > 0),
  payment_mode    TEXT    NOT NULL CHECK (payment_mode IN ('Cash','Online')),
  date            TEXT    NOT NULL,                       -- YYYY-MM-DD
  notes           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Indexes ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_date         ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_type         ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_mode ON transactions (payment_mode);
CREATE INDEX IF NOT EXISTS idx_transactions_category     ON transactions (category);
CREATE INDEX IF NOT EXISTS idx_transactions_person_name  ON transactions (person_name);
CREATE INDEX IF NOT EXISTS idx_transactions_source       ON transactions (source);
CREATE INDEX IF NOT EXISTS idx_transactions_ref_id       ON transactions (ref_id);

CREATE INDEX IF NOT EXISTS idx_payments_debt_kind        ON payments (related_debt_id, kind);

CREATE INDEX IF NOT EXISTS idx_money_to_receive_person   ON money_to_receive (person_name);
CREATE INDEX IF NOT EXISTS idx_money_to_receive_status   ON money_to_receive (status);
CREATE INDEX IF NOT EXISTS idx_money_to_receive_expected ON money_to_receive (expected_date);

CREATE INDEX IF NOT EXISTS idx_money_to_pay_person       ON money_to_pay (person_name);
CREATE INDEX IF NOT EXISTS idx_money_to_pay_status       ON money_to_pay (status);
CREATE INDEX IF NOT EXISTS idx_money_to_pay_expected     ON money_to_pay (expected_date);

-- Seed categories (fixed set, idempotent) --------------------------------------
INSERT OR IGNORE INTO categories (name) VALUES
  ('Food'), ('Travel'), ('Shopping'), ('Bills'), ('Education'),
  ('Entertainment'), ('Salary'), ('Business'), ('Loan'),
  ('Borrowed'), ('Lent'), ('Other');