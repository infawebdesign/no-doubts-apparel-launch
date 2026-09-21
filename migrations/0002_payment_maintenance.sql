ALTER TABLE checkout_attempts ADD COLUMN checked_at INTEGER;
ALTER TABLE checkout_attempts ADD COLUMN verified_status TEXT;
CREATE INDEX IF NOT EXISTS checkout_attempts_maintenance ON checkout_attempts(checked_at, created_at);
CREATE INDEX IF NOT EXISTS checkout_attempts_created ON checkout_attempts(created_at);
