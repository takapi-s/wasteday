-- SQLite schema for Wasteday local database
PRAGMA foreign_keys = ON;

-- sessions: user activity sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL, -- ISO8601
  duration_seconds INTEGER NOT NULL,
  session_key TEXT NOT NULL, -- semicolon key=value pairs
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);

-- waste_categories: classification rules
CREATE TABLE IF NOT EXISTS waste_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- e.g., app, url, etc.
  identifier TEXT NOT NULL,
  label TEXT NOT NULL, -- 'waste' or 'productive'
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(type, identifier)
);

-- user_settings: misc preferences
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- convenience upsert triggers for updated_at
CREATE TRIGGER IF NOT EXISTS trg_sessions_updated_at
AFTER UPDATE ON sessions
FOR EACH ROW BEGIN
  UPDATE sessions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_waste_categories_updated_at
AFTER UPDATE ON waste_categories
FOR EACH ROW BEGIN
  UPDATE waste_categories SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_user_settings_updated_at
AFTER UPDATE ON user_settings
FOR EACH ROW BEGIN
  UPDATE user_settings SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE key = OLD.key;
END;

