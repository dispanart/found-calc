CREATE TABLE IF NOT EXISTS billing_customer (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  xendit_customer_id TEXT UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE TABLE IF NOT EXISTS billing_checkout (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL CHECK (length(trim(plan_id)) BETWEEN 2 AND 64),
  provider_reference_id TEXT NOT NULL UNIQUE,
  provider_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
CREATE INDEX IF NOT EXISTS billing_checkout_user_idx ON billing_checkout(user_id, created_at);
CREATE INDEX IF NOT EXISTS billing_checkout_plan_idx ON billing_checkout(plan_id, created_at);

CREATE TABLE IF NOT EXISTS billing_subscription (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL CHECK (length(trim(plan_id)) BETWEEN 2 AND 64),
  provider_plan_id TEXT NOT NULL UNIQUE,
  reference_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'past_due', 'inactive')),
  latest_cycle_status TEXT,
  latest_event_at INTEGER NOT NULL,
  latest_event_rank INTEGER NOT NULL DEFAULT 0,
  current_cycle_started_at INTEGER,
  next_cycle_at INTEGER,
  cancellation_requested_at INTEGER,
  provider_created_at INTEGER,
  provider_updated_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  UNIQUE (user_id, provider_plan_id)
);
CREATE INDEX IF NOT EXISTS billing_subscription_user_idx ON billing_subscription(user_id, updated_at);
CREATE INDEX IF NOT EXISTS billing_subscription_reference_idx ON billing_subscription(reference_id);

CREATE TABLE IF NOT EXISTS billing_webhook_inbox (
  dedupe_key TEXT PRIMARY KEY NOT NULL,
  claim_token TEXT NOT NULL,
  event_name TEXT NOT NULL,
  provider_plan_id TEXT,
  provider_cycle_id TEXT,
  provider_event_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  processed_at INTEGER NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('applied', 'ignored'))
);
CREATE INDEX IF NOT EXISTS billing_webhook_provider_idx
  ON billing_webhook_inbox(provider_plan_id, provider_event_at);
