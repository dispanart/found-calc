ALTER TABLE billing_subscription ADD COLUMN paid_through_at INTEGER;

CREATE TABLE IF NOT EXISTS billing_trial (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  trial_tier TEXT NOT NULL CHECK (trial_tier = 'besties'),
  started_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  converted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  CHECK (ends_at > started_at)
);
CREATE INDEX IF NOT EXISTS billing_trial_ends_idx ON billing_trial(ends_at);
