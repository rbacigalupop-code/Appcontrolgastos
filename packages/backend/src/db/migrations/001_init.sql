PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS families (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id     INTEGER REFERENCES families(id) ON DELETE SET NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT DEFAULT 'member',
  avatar_url    TEXT,
  currency      TEXT DEFAULT 'CLP',
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id   INTEGER REFERENCES families(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  type        TEXT NOT NULL,
  is_system   INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id     INTEGER REFERENCES families(id) ON DELETE CASCADE,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  amount        REAL NOT NULL,
  currency      TEXT DEFAULT 'CLP',
  amount_clp    REAL,
  description   TEXT,
  date          TEXT NOT NULL,
  is_recurring  INTEGER DEFAULT 0,
  recurrence    TEXT,
  tags          TEXT DEFAULT '[]',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date   ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON transactions(family_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_category    ON transactions(category_id);

CREATE TABLE IF NOT EXISTS savings_accounts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   INTEGER REFERENCES families(id),
  name        TEXT NOT NULL,
  institution TEXT,
  color       TEXT DEFAULT '#6366F1',
  emoji       TEXT DEFAULT '💳',
  balance     REAL DEFAULT 0,
  currency    TEXT DEFAULT 'CLP',
  goal        REAL,
  is_shared   INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS savings_movements (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  savings_account_id  INTEGER NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  type                TEXT NOT NULL,
  amount              REAL NOT NULL,
  description         TEXT,
  date                TEXT NOT NULL,
  created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS investment_portfolios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   INTEGER REFERENCES families(id),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS investment_assets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id    INTEGER NOT NULL REFERENCES investment_portfolios(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  asset_type      TEXT NOT NULL,
  ticker          TEXT,
  amount_invested REAL NOT NULL,
  current_value   REAL NOT NULL,
  currency        TEXT DEFAULT 'CLP',
  allocation_pct  REAL,
  target_pct      REAL,
  annual_return   REAL,
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS investment_alerts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id     INTEGER REFERENCES investment_assets(id) ON DELETE CASCADE,
  alert_type   TEXT NOT NULL,
  threshold    REAL,
  message      TEXT,
  is_read      INTEGER DEFAULT 0,
  triggered_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budgets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id     INTEGER REFERENCES families(id),
  category_id   INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  period        TEXT NOT NULL,
  amount        REAL NOT NULL,
  currency      TEXT DEFAULT 'CLP',
  start_date    TEXT NOT NULL,
  end_date      TEXT,
  alert_at_pct  INTEGER DEFAULT 80,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  entity_id   INTEGER,
  entity_type TEXT,
  is_read     INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_curr  TEXT NOT NULL,
  to_curr    TEXT NOT NULL,
  rate       REAL NOT NULL,
  fetched_at TEXT DEFAULT (datetime('now')),
  UNIQUE(from_curr, to_curr)
);

INSERT OR IGNORE INTO exchange_rates (from_curr, to_curr, rate) VALUES
  ('USD', 'CLP', 950),
  ('EUR', 'CLP', 1030),
  ('UF',  'CLP', 37000);
