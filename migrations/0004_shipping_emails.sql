CREATE TABLE IF NOT EXISTS shipping_emails (
  notification_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  fulfillment_uid TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'waiting',
  payload_ciphertext TEXT,
  payload_iv TEXT,
  created_at INTEGER NOT NULL,
  first_attempt_at INTEGER,
  next_attempt_at INTEGER NOT NULL,
  lease_until INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_id TEXT,
  sent_at INTEGER,
  problem TEXT
);
CREATE INDEX IF NOT EXISTS shipping_emails_due ON shipping_emails(state, next_attempt_at);
