CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  bucket INTEGER NOT NULL,
  count INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS counters_updated_at ON counters(updated_at);
