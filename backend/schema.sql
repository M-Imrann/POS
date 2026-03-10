-- StockFlow POS - Database Schema
-- Run: psql -U postgres -d stockflow -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Combines auth + profile into one table (no external auth dependency)
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  full_name     TEXT,
  company_name  TEXT,
  role          TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Password Reset Tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT           NOT NULL,
  category            TEXT           NOT NULL DEFAULT 'Clothes',
  subcategory         TEXT           NOT NULL,
  price               NUMERIC(10,2)  NOT NULL,
  cost                NUMERIC(10,2)  NOT NULL DEFAULT 0,
  stock               INTEGER        NOT NULL DEFAULT 0,
  barcode             TEXT,
  size                TEXT,
  color               TEXT,
  material            TEXT,
  image_url           TEXT,
  low_stock_threshold INTEGER        NOT NULL DEFAULT 10,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── Sales ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_number  TEXT           NOT NULL,
  subtotal     NUMERIC(10,2)  NOT NULL,
  tax          NUMERIC(10,2)  NOT NULL,
  discount     NUMERIC(10,2)  NOT NULL DEFAULT 0,
  total        NUMERIC(10,2)  NOT NULL,
  payment_mode TEXT           NOT NULL DEFAULT 'Cash',
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── Sale Items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID          NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id    UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name  TEXT          NOT NULL,
  product_price NUMERIC(10,2) NOT NULL,
  quantity      INTEGER       NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── Stock Entries ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id   UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT        NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN ('in', 'out')),
  quantity     INTEGER     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Triggers ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_user_id      ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode      ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_user_id         ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id    ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_user_id ON stock_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_product ON stock_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token    ON password_reset_tokens(token);
