-- FinanzasApp — Schema para Supabase (PostgreSQL)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

CREATE TABLE IF NOT EXISTS families (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  family_id     BIGINT REFERENCES families(id) ON DELETE SET NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT DEFAULT 'member',
  avatar_url    TEXT,
  currency      TEXT DEFAULT 'CLP',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id          BIGSERIAL PRIMARY KEY,
  family_id   BIGINT REFERENCES families(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  type        TEXT NOT NULL,
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id     BIGINT REFERENCES families(id) ON DELETE CASCADE,
  category_id   BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  amount        NUMERIC NOT NULL,
  currency      TEXT DEFAULT 'CLP',
  amount_clp    NUMERIC,
  description   TEXT,
  date          DATE NOT NULL,
  is_recurring  BOOLEAN DEFAULT FALSE,
  recurrence    TEXT,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date   ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON transactions(family_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_category    ON transactions(category_id);

CREATE TABLE IF NOT EXISTS savings_accounts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   BIGINT REFERENCES families(id),
  name        TEXT NOT NULL,
  institution TEXT,
  color       TEXT DEFAULT '#6366F1',
  emoji       TEXT DEFAULT '💳',
  balance     NUMERIC DEFAULT 0,
  currency    TEXT DEFAULT 'CLP',
  goal        NUMERIC,
  is_shared   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings_movements (
  id                  BIGSERIAL PRIMARY KEY,
  savings_account_id  BIGINT NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
  user_id             BIGINT NOT NULL REFERENCES users(id),
  type                TEXT NOT NULL,
  amount              NUMERIC NOT NULL,
  description         TEXT,
  date                DATE NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment_portfolios (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   BIGINT REFERENCES families(id),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment_assets (
  id              BIGSERIAL PRIMARY KEY,
  portfolio_id    BIGINT NOT NULL REFERENCES investment_portfolios(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  asset_type      TEXT NOT NULL,
  ticker          TEXT,
  amount_invested NUMERIC NOT NULL,
  current_value   NUMERIC NOT NULL,
  currency        TEXT DEFAULT 'CLP',
  allocation_pct  NUMERIC,
  target_pct      NUMERIC,
  annual_return   NUMERIC,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment_alerts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id     BIGINT REFERENCES investment_assets(id) ON DELETE CASCADE,
  alert_type   TEXT NOT NULL,
  threshold    NUMERIC,
  message      TEXT,
  is_read      BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id     BIGINT REFERENCES families(id),
  category_id   BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  period        TEXT NOT NULL,
  amount        NUMERIC NOT NULL,
  currency      TEXT DEFAULT 'CLP',
  start_date    DATE NOT NULL,
  end_date      DATE,
  alert_at_pct  INTEGER DEFAULT 80,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  entity_id   BIGINT,
  entity_type TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id         BIGSERIAL PRIMARY KEY,
  from_curr  TEXT NOT NULL,
  to_curr    TEXT NOT NULL,
  rate       NUMERIC NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_curr, to_curr)
);

-- Tasas de cambio iniciales (CLP)
INSERT INTO exchange_rates (from_curr, to_curr, rate) VALUES
  ('USD', 'CLP', 950),
  ('EUR', 'CLP', 1030),
  ('UF',  'CLP', 37000)
ON CONFLICT (from_curr, to_curr) DO NOTHING;

-- Categorías del sistema
INSERT INTO categories (family_id, name, icon, color, type, is_system) VALUES
  (NULL, 'Sueldo',           '💰', '#22c55e', 'income',  TRUE),
  (NULL, 'Freelance',        '💻', '#16a34a', 'income',  TRUE),
  (NULL, 'Inversiones',      '📈', '#15803d', 'income',  TRUE),
  (NULL, 'Arriendo',         '🏠', '#166534', 'income',  TRUE),
  (NULL, 'Otros ingresos',   '➕', '#4ade80', 'income',  TRUE),
  (NULL, 'Alimentación',     '🛒', '#ef4444', 'expense', TRUE),
  (NULL, 'Restaurantes',     '🍽️', '#dc2626', 'expense', TRUE),
  (NULL, 'Transporte',       '🚗', '#f97316', 'expense', TRUE),
  (NULL, 'Salud',            '🏥', '#ec4899', 'expense', TRUE),
  (NULL, 'Educación',        '📚', '#8b5cf6', 'expense', TRUE),
  (NULL, 'Entretenimiento',  '🎬', '#6366f1', 'expense', TRUE),
  (NULL, 'Ropa',             '👕', '#f59e0b', 'expense', TRUE),
  (NULL, 'Servicios básicos','💡', '#0ea5e9', 'expense', TRUE),
  (NULL, 'Arriendo/Hipoteca','🏡', '#06b6d4', 'expense', TRUE),
  (NULL, 'Tecnología',       '📱', '#3b82f6', 'expense', TRUE),
  (NULL, 'Viajes',           '✈️', '#10b981', 'expense', TRUE),
  (NULL, 'Mascotas',         '🐾', '#a78bfa', 'expense', TRUE),
  (NULL, 'Deudas/Cuotas',   '💳', '#f43f5e', 'expense', TRUE),
  (NULL, 'Seguros',          '🛡️', '#64748b', 'expense', TRUE),
  (NULL, 'Otros gastos',     '📦', '#94a3b8', 'expense', TRUE)
ON CONFLICT DO NOTHING;
