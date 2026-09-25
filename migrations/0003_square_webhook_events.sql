CREATE TABLE IF NOT EXISTS square_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  outcome TEXT
);
CREATE INDEX IF NOT EXISTS square_webhook_events_received ON square_webhook_events(received_at);
