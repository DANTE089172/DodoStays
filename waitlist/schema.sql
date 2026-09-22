-- DodoStays waitlist — Cloudflare D1 (SQLite) schema.
-- Mirrors the .NET `waitlist_signups` table so the Pages Functions backend is a
-- drop-in replacement for the Fly.io API. Apply with:
--   wrangler d1 execute dodostays-waitlist --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id         TEXT PRIMARY KEY,        -- UUID
  email      TEXT NOT NULL,           -- normalised: trimmed + lower-cased
  audience   INTEGER NOT NULL,        -- 0 = Traveller, 1 = Host
  name       TEXT,
  region     TEXT,
  message    TEXT,
  locale     TEXT,
  source     TEXT,
  created_at TEXT NOT NULL            -- ISO 8601 UTC
);

-- One signup per email+audience (a person may join once as Traveller AND once
-- as Host). Keeps the join idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS ux_waitlist_email_audience
  ON waitlist_signups (email, audience);

CREATE INDEX IF NOT EXISTS ix_waitlist_created_at
  ON waitlist_signups (created_at);
