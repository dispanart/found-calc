CREATE TABLE widget_domain (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  normalized_hostname TEXT NOT NULL,
  display_hostname TEXT NOT NULL,
  pair_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'disabled', 'revoked')),
  verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE UNIQUE INDEX widget_domain_owner_pair_active_unique
  ON widget_domain(owner_user_id, pair_key)
  WHERE deleted_at IS NULL;
CREATE INDEX widget_domain_owner_status_idx
  ON widget_domain(owner_user_id, status, updated_at);

CREATE TABLE widget_verification (
  id TEXT PRIMARY KEY NOT NULL,
  domain_id TEXT NOT NULL REFERENCES widget_domain(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('dns_txt', 'local_development')),
  challenge_token TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'expired', 'revoked')),
  expires_at INTEGER,
  last_checked_at INTEGER,
  verified_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX widget_verification_domain_status_idx
  ON widget_verification(domain_id, status, created_at);
CREATE UNIQUE INDEX widget_verification_challenge_unique
  ON widget_verification(challenge_token)
  WHERE challenge_token IS NOT NULL;

CREATE TABLE widget_configuration (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  public_widget_key TEXT NOT NULL UNIQUE,
  public_key_version INTEGER NOT NULL,
  name TEXT NOT NULL,
  calculator_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('id', 'en')),
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled', 'revoked')),
  theme_json TEXT NOT NULL,
  branding_preference TEXT NOT NULL CHECK (branding_preference IN ('foundcalc', 'hidden')),
  default_input_configuration_json TEXT NOT NULL,
  key_rotated_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX widget_configuration_owner_idx
  ON widget_configuration(owner_user_id, updated_at);

CREATE TABLE widget_domain_binding (
  widget_id TEXT NOT NULL REFERENCES widget_configuration(id) ON DELETE CASCADE,
  domain_id TEXT NOT NULL REFERENCES widget_domain(id) ON DELETE CASCADE,
  priority INTEGER,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (widget_id, domain_id)
);

CREATE INDEX widget_domain_binding_domain_idx
  ON widget_domain_binding(domain_id, widget_id);

CREATE TABLE widget_event_daily (
  widget_id TEXT NOT NULL REFERENCES widget_configuration(id) ON DELETE CASCADE,
  domain_id TEXT NOT NULL REFERENCES widget_domain(id) ON DELETE CASCADE,
  calculator_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('id', 'en')),
  event_type TEXT NOT NULL CHECK (event_type IN ('widget_viewed', 'calculator_started', 'calculation_completed', 'cta_clicked')),
  event_day TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  last_occurred_at INTEGER NOT NULL,
  PRIMARY KEY (widget_id, domain_id, calculator_id, locale, event_type, event_day)
);

CREATE INDEX widget_event_daily_widget_day_idx
  ON widget_event_daily(widget_id, event_day, event_type);
