-- Initial schema for Startup Search (Phase B).
-- Lucia-compatible session model, plus watchlists / tags / notes / saved searches.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,             -- ULID or UUID
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  avatar_url    TEXT,
  provider      TEXT NOT NULL,                -- 'google' | 'github'
  provider_uid  TEXT NOT NULL,                -- provider account id
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(provider, provider_uid)
);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    INTEGER NOT NULL,             -- unix seconds
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS watchlists (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id             TEXT PRIMARY KEY,
  watchlist_id   TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  company_number TEXT NOT NULL,
  company_name   TEXT NOT NULL,
  status         TEXT,                        -- pipeline status: prospect/contacted/...
  created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(watchlist_id, company_number)
);
CREATE INDEX IF NOT EXISTS idx_wi_company ON watchlist_items(company_number);

CREATE TABLE IF NOT EXISTS tags (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS company_tags (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_number  TEXT NOT NULL,
  tag_id          TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(user_id, company_number, tag_id)
);

CREATE TABLE IF NOT EXISTS notes (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_number  TEXT NOT NULL,
  body            TEXT NOT NULL,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_notes_user_company ON notes(user_id, company_number);

CREATE TABLE IF NOT EXISTS saved_searches (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  query         TEXT NOT NULL,                -- URL-encoded filter query string
  share_slug    TEXT UNIQUE,                  -- nullable; set when user shares it
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_ss_user ON saved_searches(user_id);
