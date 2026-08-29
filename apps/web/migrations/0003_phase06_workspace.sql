CREATE TABLE IF NOT EXISTS user_profile (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 80),
  preferred_locale TEXT NOT NULL CHECK (preferred_locale IN ('id', 'en')),
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE TABLE IF NOT EXISTS workspace_goal (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  note TEXT CHECK (note IS NULL OR length(trim(note)) BETWEEN 1 AND 1000),
  target_date TEXT CHECK (target_date IS NULL OR length(target_date) = 10),
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'archived')),
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
CREATE INDEX IF NOT EXISTS workspace_goal_owner_idx
  ON workspace_goal(owner_user_id, status, updated_at);

CREATE TABLE IF NOT EXISTS workspace_project (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  goal_id TEXT REFERENCES workspace_goal(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR length(trim(description)) BETWEEN 1 AND 2000),
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
CREATE INDEX IF NOT EXISTS workspace_project_owner_idx
  ON workspace_project(owner_user_id, status, updated_at);
CREATE INDEX IF NOT EXISTS workspace_project_goal_idx ON workspace_project(goal_id);

CREATE TABLE IF NOT EXISTS workspace_project_member (
  project_id TEXT NOT NULL REFERENCES workspace_project(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  joined_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS workspace_project_member_project_idx ON workspace_project_member(project_id);
CREATE INDEX IF NOT EXISTS workspace_project_member_user_idx ON workspace_project_member(user_id);

CREATE TABLE IF NOT EXISTS workspace_project_invite (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES workspace_project(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL CHECK (length(token_hash) = 64),
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  created_by_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  expires_at INTEGER NOT NULL,
  redeemed_by_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  redeemed_at INTEGER,
  CHECK (
    (redeemed_by_user_id IS NULL AND redeemed_at IS NULL)
    OR (redeemed_by_user_id IS NOT NULL AND redeemed_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS workspace_project_invite_project_idx
  ON workspace_project_invite(project_id, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_project_invite_token_unique
  ON workspace_project_invite(token_hash);

CREATE TRIGGER IF NOT EXISTS workspace_project_invite_redeem_member
AFTER UPDATE OF redeemed_by_user_id, redeemed_at ON workspace_project_invite
WHEN OLD.redeemed_by_user_id IS NULL
  AND NEW.redeemed_by_user_id IS NOT NULL
  AND NEW.redeemed_at IS NOT NULL
BEGIN
  INSERT INTO workspace_project_member (project_id, user_id, role, joined_at)
  VALUES (NEW.project_id, NEW.redeemed_by_user_id, NEW.role, NEW.redeemed_at)
  ON CONFLICT(project_id, user_id) DO UPDATE SET
    role = CASE
      WHEN workspace_project_member.role = 'editor' OR excluded.role = 'editor' THEN 'editor'
      ELSE 'viewer'
    END;
END;

CREATE TABLE IF NOT EXISTS workspace_calculation (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES workspace_project(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  calculator_id TEXT NOT NULL CHECK (calculator_id IN ('reference.discount', 'reference.business-margin', 'reference.synthetic-rule')),
  calculator_version TEXT NOT NULL,
  state_json TEXT NOT NULL,
  rule_context_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
CREATE INDEX IF NOT EXISTS workspace_calculation_project_idx
  ON workspace_calculation(project_id, created_at);
CREATE INDEX IF NOT EXISTS workspace_calculation_creator_idx
  ON workspace_calculation(created_by_user_id, created_at);
