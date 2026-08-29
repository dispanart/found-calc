ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE user ADD COLUMN banned INTEGER DEFAULT 0;
ALTER TABLE user ADD COLUMN ban_reason TEXT;
ALTER TABLE user ADD COLUMN ban_expires INTEGER;

CREATE TABLE IF NOT EXISTS rule_version (
  id TEXT PRIMARY KEY NOT NULL,
  rule_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  payload_json TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  created_by_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  published_by_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  published_at INTEGER,
  UNIQUE (rule_id, version_id),
  CHECK (length(effective_from) = 10),
  CHECK (effective_until IS NULL OR length(effective_until) = 10),
  CHECK (effective_until IS NULL OR effective_until >= effective_from),
  CHECK (
    (status = 'draft' AND published_by_user_id IS NULL AND published_at IS NULL)
    OR
    (status = 'published' AND published_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS rule_version_rule_status_idx
  ON rule_version(rule_id, status, effective_from);
CREATE INDEX IF NOT EXISTS rule_version_status_idx ON rule_version(status);

CREATE TRIGGER IF NOT EXISTS rule_version_publication_overlap
BEFORE UPDATE OF status ON rule_version
WHEN NEW.status = 'published' AND OLD.status = 'draft'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM rule_version AS sibling
    WHERE sibling.id <> NEW.id
      AND sibling.rule_id = NEW.rule_id
      AND sibling.status = 'published'
      AND (sibling.effective_until IS NULL OR sibling.effective_until >= NEW.effective_from)
      AND (NEW.effective_until IS NULL OR sibling.effective_from <= NEW.effective_until)
  ) THEN RAISE(ABORT, 'rule_version_publication_overlap') END;
END;

CREATE TRIGGER IF NOT EXISTS rule_version_published_immutable
BEFORE UPDATE ON rule_version
WHEN OLD.status = 'published'
BEGIN
  SELECT RAISE(ABORT, 'rule_version_published_immutable');
END;

CREATE TRIGGER IF NOT EXISTS rule_version_published_delete_forbidden
BEFORE DELETE ON rule_version
WHEN OLD.status = 'published'
BEGIN
  SELECT RAISE(ABORT, 'rule_version_published_immutable');
END;

INSERT OR IGNORE INTO rule_version (
  id, rule_id, version_id, effective_from, effective_until, payload_json,
  source_id, source_url, status, created_by_user_id, created_at,
  published_by_user_id, published_at
) VALUES (
  'seed-reference-synthetic-rate-2025-a',
  'reference.synthetic-rate',
  '2025-a',
  '2025-01-01',
  '2025-12-31',
  '{"ratePercent":"5"}',
  'synthetic-reference-fixture',
  NULL,
  'published',
  NULL,
  0,
  NULL,
  0
);

INSERT OR IGNORE INTO rule_version (
  id, rule_id, version_id, effective_from, effective_until, payload_json,
  source_id, source_url, status, created_by_user_id, created_at,
  published_by_user_id, published_at
) VALUES (
  'seed-reference-synthetic-rate-2026-a',
  'reference.synthetic-rate',
  '2026-a',
  '2026-01-01',
  NULL,
  '{"ratePercent":"7.5"}',
  'synthetic-reference-fixture',
  NULL,
  'published',
  NULL,
  0,
  NULL,
  0
);
