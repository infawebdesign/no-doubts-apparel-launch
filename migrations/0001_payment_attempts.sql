-- Existing encrypted square_oauth_tokens are deliberately not modified.
CREATE TABLE IF NOT EXISTS checkout_attempts (
  attempt_id TEXT PRIMARY KEY,
  cart_json TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  request_json TEXT NOT NULL,
  order_id TEXT,
  checkout_url TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
CREATE TABLE IF NOT EXISTS payment_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS square_refresh_locks (
  merchant_id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
