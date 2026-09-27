# ARCHITECTURE.md — Expense Tracker (Authoritative)

> Contract for Database, Backend, Finance Logic, Frontend, UI/UX, Testing, and Security agents. Implement strictly against this document. No application code to be written by ARCHITECT.

Date: 2026-09-23  
Scope: Personal Expense & Money Tracker (local, single-user)

---

## 1. Stack (fixed)

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite (better-sqlite3, pin ^11.10.0 — v13 hard-crashes on Windows/Node22)
- API Style: REST
- Secrets: Environment variables only
- Currency: INR (₹)
- Theme: light/dark via CSS variables only
- Export: CSV only (MVP)

Root: `C:\Users\JOVIL\expense-tracker`  
Initial folders present: `backend/`, `frontend/`

---

## 2. Final folder structure

### backend/
```
backend/
  app.js (or index.js) — Express app setup (cors, helmet, json, routes mount)
  server.js — bootstraps DB and starts server
  .env.example
  config/
    env.js — load/validate env vars
  db/
    schema.sql — full schema + constraints + indexes
    connection.js — better-sqlite3 open/close, pragmas, helpers
    migrations/ (optional, MVP simple; if used, numbered)
  routes/
    transactions.js
    moneyToReceive.js
    moneyToPay.js
    payments.js
    balances.js
    reports.js
    persons.js
    search.js
    categories.js
    export.js
  services/
    transactionService.js
    debtService.js  (moneyToReceive/moneyToPay)
    paymentService.js
    balanceService.js
    reportService.js
    personService.js
    searchService.js
    categoryService.js
    exportService.js
  validators/
    index.js — common helpers
    transactionValidator.js
    debtValidator.js
    paymentValidator.js
    queryValidator.js
  middleware/
    errorHandler.js
    validate.js
    asyncHandler.js
```

### frontend/
```
frontend/
  src/
    api/ — REST client (endpoints per API contract)
    components/
    pages/
    layouts/
    hooks/
    utils/
    styles/ — CSS variables (light/dark)
    constants/
    types/ (or interfaces)
  index.html
  vite.config.js
  package.json
```

Keep modular, simple. No over-engineering.

---

## 3. Entities and schema (final)

Tables: `users`, `transactions`, `money_to_receive`, `money_to_pay`, `payments`, `categories`

### users
- id INTEGER PRIMARY KEY AUTOINCREMENT
- name TEXT NOT NULL
- email TEXT UNIQUE (optional MVP; local single-user; may be unused)
- created_at TEXT NOT NULL DEFAULT (datetime('now'))
- updated_at TEXT NOT NULL DEFAULT (datetime('now'))

Note: MVP single-user; auth skipped. Table included minimally if future auth added.

### transactions
- id INTEGER PRIMARY KEY AUTOINCREMENT
- date TEXT NOT NULL  (YYYY-MM-DD)
- time TEXT           (HH:MM, nullable)
- person_name TEXT
- amount INTEGER NOT NULL  (positive integer, Rupees)
- type TEXT NOT NULL  (Credit|Debit) CHECK(type IN ('Credit','Debit'))
- payment_mode TEXT NOT NULL (Cash|Online) CHECK(payment_mode IN ('Cash','Online'))
- category TEXT NOT NULL DEFAULT 'Other' REFERENCES categories(name)
- description TEXT
- status TEXT NOT NULL DEFAULT 'Completed' CHECK(status IN ('Completed'))  (system/auto status)
- source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','lend','receive','borrow','pay'))  — AUX: marks system-generated debt-flow rows; protects them from deletion/double-counting
- ref_id INTEGER  (nullable; points to money_to_receive.id for lend/receive or money_to_pay.id for borrow/pay; no FK, app-enforced)
- created_at TEXT NOT NULL DEFAULT (datetime('now'))
- updated_at TEXT NOT NULL DEFAULT (datetime('now'))

Constraints: amount > 0. `person_name` nullable for non-debt-related entries as fits. `category` must exist in categories or be NULL per business rules (allow Other/default). Indexes: (date), (type), (payment_mode), (category), (person_name).

### money_to_receive (Lent)
- id INTEGER PRIMARY KEY AUTOINCREMENT
- person_name TEXT NOT NULL
- original_amount INTEGER NOT NULL CHECK(original_amount > 0)
- received_amount INTEGER NOT NULL DEFAULT 0 CHECK(received_amount >= 0)
- remaining_amount INTEGER NOT NULL CHECK(remaining_amount >= 0)
- date TEXT NOT NULL (YYYY-MM-DD)  (when lent)
- expected_date TEXT (YYYY-MM-DD, nullable)
- reason TEXT
- status TEXT NOT NULL CHECK(status IN ('Pending','Partially Received','Received'))
- notes TEXT
- created_at TEXT NOT NULL DEFAULT (datetime('now'))
- updated_at TEXT NOT NULL DEFAULT (datetime('now'))
Invariant: received_amount + remaining_amount == original_amount (enforced in logic + DB checks as feasible)

### money_to_pay (Borrowed)
- id INTEGER PRIMARY KEY AUTOINCREMENT
- person_name TEXT NOT NULL
- original_amount INTEGER NOT NULL CHECK(original_amount > 0)
- paid_amount INTEGER NOT NULL DEFAULT 0 CHECK(paid_amount >= 0)
- remaining_amount INTEGER NOT NULL CHECK(remaining_amount >= 0)
- date TEXT NOT NULL (YYYY-MM-DD)  (when borrowed)
- expected_date TEXT (YYYY-MM-DD, nullable)
- reason TEXT
- status TEXT NOT NULL CHECK(status IN ('Pending','Partially Paid','Paid'))
- notes TEXT
- created_at TEXT NOT NULL DEFAULT (datetime('now'))
- updated_at TEXT NOT NULL DEFAULT (datetime('now'))
Invariant: paid_amount + remaining_amount == original_amount

### payments
- id INTEGER PRIMARY KEY AUTOINCREMENT
- related_debt_id INTEGER NOT NULL  (money_to_receive.id OR money_to_pay.id)
- kind TEXT NOT NULL CHECK(kind IN ('receive','pay'))
- amount INTEGER NOT NULL CHECK(amount > 0)
- payment_mode TEXT NOT NULL CHECK(payment_mode IN ('Cash','Online'))
- date TEXT NOT NULL (YYYY-MM-DD)
- notes TEXT
- created_at TEXT NOT NULL DEFAULT (datetime('now'))
FK conceptually: related_debt_id references the specific debt table row (no cross-table FK in SQLite required; logic enforces). Index (related_debt_id, kind).

### categories
- id INTEGER PRIMARY KEY AUTOINCREMENT
- name TEXT NOT NULL UNIQUE

Seed categories (fixed): Food, Travel, Shopping, Bills, Education, Entertainment, Salary, Business, Loan, Borrowed, Lent, Other

All amounts are positive integers (Rupees, no decimals). Backend converts/validates. Never trust frontend calculations.

---

## 4. Financial rules (MANDATORY)

Formulas:
- Cash Balance = Total Cash Credit − Total Cash Debit
- Online Balance = Total Online Credit − Total Online Debit
- Total Balance = Cash Balance + Online Balance
- Money To Receive = Total Lent − Total Received Back  (sum of remaining on Pending/Partially Received money_to_receive)
- Money To Pay = Total Borrowed − Total Returned  (sum of remaining on Pending/Partially Paid money_to_pay)

Effects on balances by transaction type/payment_mode:
- Cash Credit → +Cash
- Cash Debit → −Cash
- Online Credit → +Online
- Online Debit → −Online

Debt operations (each creates both a payments row and related financial effects):
- Lend someone money: −Cash/−Online depending on payment_mode AND +MoneyToReceive  
  Creates: `money_to_receive` record (original_amount = amount lent, received_amount=0, remaining_amount=amount, status=Pending/appropriate) + a `Debit` transaction reflecting outflow (payment_mode = mode used)
- Receive lent money back: +Cash/+Online AND −MoneyToReceive  
  Creates: `receive` payment row (payments.kind='receive') linked to money_to_receive.id + `Credit` transaction reflecting inflow (payment_mode used) + updates debt (received_amount += amt, remaining_amount -= amt, status transitions)
- Borrow money: +Cash/+Online AND +MoneyToPay  
  Creates: `money_to_pay` record (original_amount borrowed, paid_amount=0, remaining_amount=amount, status Pending) + `Credit` transaction (inflow)
- Return borrowed money: −Cash/−Online AND −MoneyToPay  
  Creates: `pay` payment row (kind='pay') linked to money_to_pay.id + `Debit` transaction (outflow) + updates debt

Rules:
- Partial payments allowed.
- Never negative amounts.
- Payment never exceeds remaining amount of the related debt.
- All multi-step ops must be atomic (use SQLite transaction / better-sqlite3 transaction).
- Status transitions: receive/pay flows update status to Pending → Partially Received/Paid → Received/Paid.
- All amounts treated as positive integers. No decimals.
- Backend is source of truth for calculations; frontend must not recompute critical balances independently except display.

---

## 5. REST API contract (complete)

All endpoints follow: method, path, request body (JSON), response shape, error shape. All times ISO-like strings from DB (YYYY-MM-DD / HH:MM / datetime('now')).

Error shape (standard):
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": { "field": "string", "issue": "string" } | []
  }
}
```
Use appropriate HTTP status codes (200/201/400/404/409/422/500).

### 5.1 Transactions
#### List transactions
- GET `/api/transactions`
- Query: `type`, `payment_mode`, `category`, `person_name`, `q` (keyword search on person_name/description/category, min 2 chars), `start_date`, `end_date`, `page`, `limit`, `sort` (e.g. date_desc|date_asc|amount_desc|amount_asc)
- 200: `{ "data": [Transaction], "pagination": { "page": number, "limit": number, "total": number, "pages": number } }`

Transaction shape: id, date, time, person_name, amount, type, payment_mode, category, description, status, created_at, updated_at

#### Get transaction
- GET `/api/transactions/:id`
- 200: `{ "data": Transaction }`, 404 if not found

#### Create transaction
- POST `/api/transactions`
- Body: { date, time?, person_name?, amount, type, payment_mode, category?, description?, status? }
- Validates: amount>0 integer, enums, dates valid
- 201: `{ "data": Transaction }`

#### Update transaction
- PUT `/api/transactions/:id` (or PATCH)
- Body: partial of create fields
- 200: `{ "data": Transaction }`, 404

#### Delete transaction
- DELETE `/api/transactions/:id`
- 200: `{ "message": "Deleted" }`, 404
Note: Deleting debt-related transactions that were created by payments is discouraged; document rules in service (prefer reversing via payments).

### 5.2 Money To Receive (lent)
#### List
- GET `/api/money-to-receive`
- Query: `status` (Pending|Partially Received|Received), `person_name`, `start_date`, `end_date`, `expected_start`, `expected_end`, `overdue` (boolean)
- 200: `{ "data": [MoneyToReceive], ...pagination? }`

MoneyToReceive: id, person_name, original_amount, received_amount, remaining_amount, date, expected_date, reason, status, notes, created_at, updated_at

#### Get
- GET `/api/money-to-receive/:id`
- 200: includes payments history: `{ "data": {...debt, payments: [PaymentLite] } }`

#### Create
- POST `/api/money-to-receive`
- Body: { person_name, amount (original), date, expected_date?, reason?, notes?, payment_mode? }  
  Effect: creates debt + Debit transaction (Lend). If payment_mode omitted, treat as Cash/Online per design (specify required or default Cash) — choose: require `payment_mode` (Cash|Online) for lend effect consistency.
  - Require `payment_mode` for creation that affects balances (Lend). Default not assumed.
- 201: `{ "data": MoneyToReceive }`

#### Update (non-financial fields mostly)
- PUT/PATCH `/api/money-to-receive/:id`
- 200 or 422 if would corrupt invariants

#### Delete (soft? no; hard) — prevent if has payments? prefer close/adjust
- DELETE `/api/money-to-receive/:id`
- 409 if payments exist

### 5.3 Money To Pay (borrowed)
Mirror of 5.2 with `pay`.
- GET `/api/money-to-pay`
- GET `/api/money-to-pay/:id`
- POST `/api/money-to-pay` — body includes `payment_mode` (required) → creates debt + Credit transaction
- Update/Delete rules same

### 5.4 Payments (partial payments)
#### Receive payment (against money_to_receive)
- POST `/api/payments/receive`
- Body: { related_debt_id, amount, payment_mode, date, notes? }
- Validates: amount>0, <= remaining, debt exists and not Received, enums
- Effect (atomic): insert payments(kind='receive'), update money_to_receive (received_amount, remaining_amount, status), insert Credit transaction (inflow) reflecting received back. Balances +MoneyReceivedBack effect.
- 201: `{ "data": { payment: Payment, debt: MoneyToReceive, transaction: Transaction } }`

Payment row shape: id, related_debt_id, kind, amount, payment_mode, date, notes, created_at

#### Make payment (against money_to_pay)
- POST `/api/payments/pay`
- Body: { related_debt_id, amount, payment_mode, date, notes? }
- Effect (atomic): payments(kind='pay'), update money_to_pay, insert Debit transaction (outflow). Balances −Returned effect.
- 201: same composite shape

### 5.5 Balances / Dashboard
- GET `/api/balances`
- 200: {
  "data": {
    "cashBalance": number,
    "onlineBalance": number,
    "totalBalance": number,
    "moneyToReceive": number,  // remaining total
    "moneyToPay": number,      // remaining total
    "totalCashCredit": number,
    "totalCashDebit": number,
    "totalOnlineCredit": number,
    "totalOnlineDebit": number,
    "totalLent": number,
    "totalReceivedBack": number,
    "totalBorrowed": number,
    "totalReturned": number
  }
}

### 5.6 Reports
- GET `/api/reports`
- Query: `period` = daily|weekly|monthly (default monthly), `start_date`, `end_date`, `group_by` (day|week|month)
- 200: Report payload per spec:
```json
{
  "period": "monthly",
  "range": { "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" },
  "totals": {
    "income": number,        // sum Credit in range (all modes)
    "expense": number,       // sum Debit in range
    "net": number,           // income-expense
    "cashIncome": number,
    "cashExpense": number,
    "onlineIncome": number,
    "onlineExpense": number,
    "moneyReceived": number, // payments.receive in range
    "moneyReturned": number, // payments.pay in range
    "moneyToReceiveNow": number,
    "moneyToPayNow": number,
    "netCashFlow": number    // per formula
  },
  "breakdown": {
    "byCategory": [{ "category": "Food", "expense": number, "income": number }],
    "byPaymentMode": { "cash": { "credit": number, "debit": number }, "online": { "credit": number, "debit": number } },
    "byType": { "credit": number, "debit": number },
    "byDay": [{ "date": "YYYY-MM-DD", "expense": number, "income": number }]
  }
}
```
Net Cash Flow = (Cash/Online credits effects? define): effectively (cashIncome+onlineIncome + moneyReceived contributions? Or standard): include received/returned as flows; define clearly: Net Cash Flow = (cashIncome + onlineIncome + moneyReceived) − (cashExpense + onlineExpense + moneyReturned) for the period (cash-flow view). State logic in service (and this is the definition).

Also alerts embedded? Or separate:
- Alerts (due/soon/overdue): include in balances/dashboard or `/api/reports/alerts`? Add:
#### Alerts
- GET `/api/alerts`
- 200: {
  "receive": { "dueToday": [...], "dueSoon": [...], "overdue": [...] },
  "pay":     { "dueToday": [...], "dueSoon": [...], "overdue": [...] }
}
Thresholds: “soon” default 3 days from today (configurable later; MVP fixed 3). Due today if expected_date == today. Overdue if expected_date < today and status != Received/Paid.

Alert item shape (each item is a debt row): `{ id, person_name, remaining_amount, expected_date, reason, original_amount, received_amount|paid_amount, status }` — frontend links to debt detail via `id`.

### 5.7 Persons / People
- GET `/api/persons`
- 200: list distinct person_name with aggregates: { person_name, lentTotal, receivedBack, netToReceive, borrowedTotal, returned, netToPay, balanceNet }
Aggregations person-wise across transactions and debts.

### 5.8 Global search
- GET `/api/search`
- Query: `q` (string, min 2 chars)
- Searches: transactions (description, person_name, category), money_to_receive, money_to_pay, payments (notes)
- 200: `{ "data": { transactions: [], receive: [], pay: [], payments: [] } }`

### 5.9 Categories
- GET `/api/categories` → 200: `{ "data": [Category] }` (seeded)
- POST `/api/categories` (MVP allow add custom? fixed list given; include Other; allow add if needed) — MVP: return seeded fixed set; optional create. Fixed set specified.
  Fixed: Food, Travel, Shopping, Bills, Education, Entertainment, Salary, Business, Loan, Borrowed, Lent, Other. GET returns these.

### 5.10 Export CSV
- GET `/api/export/transactions.csv` — query filters same as list
- GET `/api/export/debts-receive.csv`
- GET `/api/export/debts-pay.csv`
- GET `/api/export/payments.csv`
- GET `/api/export/reports.csv` (current report view)
- Headers `Content-Type: text/csv`, `Content-Disposition: attachment; filename="..."`

CSV contents:
- transactions: id,date,time,person_name,amount,type,payment_mode,category,description,status
- debts-receive: id,person_name,original_amount,received_amount,remaining_amount,date,expected_date,reason,status,notes
- debts-pay: same columns
- payments: id,related_debt_id,kind,amount,payment_mode,date,notes
- reports.csv: period,start_date,end_date and totals rows + breakdown sections as CSV tables

---

## 6. Data flow (ASCII)

Transaction create → service → DB transaction → finance recompute effects
```
Client (React/Vite)
  -> REST (JSON)
Express routes
  -> validators (validate.js)
  -> asyncHandler
  -> services (business/finance rules)
  -> db/connection (better-sqlite3, prepared statements)
  -> SQLite (atomic transaction)
Service returns domain model -> route -> JSON response
Errors -> errorHandler middleware
```
Example payment flow (atomic):
1. Validate amount <= remaining, enums
2. Begin SQLite transaction
3. INSERT payments
4. UPDATE debt (increment received/paid, decrement remaining, set status)
5. INSERT transaction (Credit/Debit)
6. Commit; if fail rollback
7. Return composite

---

## 7. Auth & security decision (state clearly)

This is a local single-user application.  
**Recommendation (MVP): SKIP full authentication (no login/signup, no sessions/tokens).**  
Rationale: reliability and simplicity for local use; no network exposure assumed local-only.

Post-MVP: add auth if multi-user or remote.

Security hardening (required):
- Parameterized SQL via better-sqlite3 (prepared statements only)
- Input validation on all endpoints (validators/)
- Helmet, CORS restricted appropriately
- Environment variables for secrets (no hardcoded secrets)
- No secrets in repo
- Validation of enums and positive integers
- Rate limiting optional MVP; not required local
- Sanitize text fields (trim)
- Errors do not leak internals

State: all agents agree to skip auth for MVP and enforce hardening.

---

## 8. Configuration & env

`.env.example`:
```
PORT=4000
NODE_ENV=development
DB_PATH=./data/expense.db
CORS_ORIGIN=http://localhost:5173
```
`config/env.js` validates presence. `data/` directory created at startup.

DB pragmas: WAL, foreign keys off or on as appropriate, busy timeout.

---

## 9. Non-functional
- All list endpoints paginated (default page=1, limit=20)
- Dates ISO YYYY-MM-DD; times HH:MM
- Indexes on frequent filters
- Atomic writes for debt/payment flows
- Consistent status enums everywhere
- Currency display ₹ (frontend)

---

## 10. Agent alignment notes
- Finance Logic: owns exact calc; API exposes formulas
- No frontend trust for calculations
- Payment drives both payments row AND financial effects
- Amounts are positive integers always
- Status values enumerated as given
- Keep CSV export list per context as specified
- Modular backend layout as specified

This document is the single source of truth. No agent needs to guess.