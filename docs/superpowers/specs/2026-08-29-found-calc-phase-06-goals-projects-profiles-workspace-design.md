# Found Calc Phase 06 — Goals, Projects, Profiles & Workspace Design

**Status:** implementation design for the approved Phase 06 slot in the Found Calc roadmap  
**Date:** 2026-08-29  
**Predecessor:** Phase 05 — Versioned Rule Platform + Admin Core  
**Successor:** Phase 07 — Billing, Entitlements & Xendit

## 1. Purpose

Phase 06 turns the authenticated Phase 04 persistence summary into a real first-party workspace without weakening the deterministic/runtime boundaries established by Phases 01–05. A signed-in user can maintain a lightweight profile, define private goals, organize work into projects, save named calculation snapshots into projects, revisit those snapshots in the matching calculator, collaborate through explicit project membership, and export a project as first-party JSON.

The phase deliberately keeps calculation execution local. Workspace storage persists validated canonical calculator input snapshots and metadata only; it never recomputes results on the server and never treats the Phase 04 `calculator_state` table as calculation history.

## 2. Design decision

Use a normalized relational workspace domain in D1 rather than a JSON workspace blob or a reinterpretation of `calculator_state`.

Rejected alternatives:

1. **Single workspace JSON document per user** — easy to start but poor for authorization, collaboration, referential integrity, partial updates, and bounded queries.
2. **Promote Phase 04 calculator drafts into Projects/history** — violates the existing one-latest-draft contract, creates migration ambiguity for guest-owned state, and confuses draft persistence with intentionally named history.

The selected design adds new tables for profile, goals, projects, memberships, invitations, and named calculation records. Existing Phase 04 draft state remains untouched and continues to work for guests and authenticated users.

## 3. Fixed inherited boundaries

- `@found-calc/engine` remains the only formula-truth owner and receives no workspace, D1, auth, React, locale, network, or collaboration dependency.
- `@found-calc/rules` remains version/effective-period/publication truth. Workspace records may preserve rule-version provenance metadata, but they do not resolve or publish rules.
- `@found-calc/catalog` remains stable calculator identity/discovery metadata.
- Calculator execution remains in the browser/runtime; Phase 06 introduces no server calculation endpoint.
- `calculator_state` remains a latest-draft store with existing guest/user ownership semantics. It is not migrated into projects/history.
- Better Auth remains credential/session truth. Workspace authorization is derived server-side from the authenticated user plus project ownership/membership rows.
- Public calculators remain usable while signed out.
- ID/EN, keyboard operation, accessible status/error behavior, 390 px no-horizontal-overflow, explicit trust/privacy copy, no fingerprinting, no raw-input logging, no browser session-token storage, and the Rp0 fixed-infrastructure target remain mandatory.
- Published rule feeds remain published-only and immutable; Phase 06 does not change Phase 05 admin/public rule behavior.

## 4. Workspace data model

### 4.1 `user_profile`

One optional profile row per Better Auth user:

- `user_id` text primary key, FK `user(id)` with cascade delete;
- `display_name` text, 1–80 trimmed characters;
- `preferred_locale` `id | en`;
- `created_at`, `updated_at` epoch milliseconds.

The profile is product metadata, not an auth credential record. Email/password remain Better Auth-owned.

### 4.2 `workspace_goal`

Private to its owner:

- `id` UUID text primary key;
- `owner_user_id` FK user;
- `title` 1–120 chars;
- optional `note` max 1000 chars;
- optional `target_date` strict ISO date-only;
- `status` `active | completed | archived`;
- timestamps.

Goals are never shared independently. A project can privately reference an owner goal, but collaborator responses do not expose the owner's goal metadata.

### 4.3 `workspace_project`

- `id` UUID text primary key;
- `owner_user_id` FK user;
- optional `goal_id` FK goal with `ON DELETE SET NULL`;
- `name` 1–120 chars;
- optional `description` max 2000 chars;
- `status` `active | archived`;
- timestamps.

Owner rights are implicit from `owner_user_id` and are not duplicated in the membership table.

### 4.4 `workspace_project_member`

- `project_id` FK project cascade delete;
- `user_id` FK user cascade delete;
- `role` `editor | viewer`;
- `joined_at`;
- composite PK `(project_id, user_id)` plus indexes on each side.

Authorization:

- **owner:** read/update/archive/delete project, manage invites/members, save/delete any project calculation, export;
- **editor:** read project, save named calculations, delete calculations they created, export;
- **viewer:** read project/calculations and export only.

Members never gain access to the owner's private Goals through membership.

### 4.5 `workspace_project_invite`

Invitation transport uses an explicit code shown to the project owner; no email service/provider is introduced.

- `id` UUID text primary key;
- `project_id` FK project cascade delete;
- `token_hash` unique SHA-256 hex; raw token is never persisted;
- `role` `editor | viewer`;
- `created_by_user_id` FK user;
- `created_at`, `expires_at`;
- nullable `redeemed_by_user_id`, `redeemed_at`.

Creation returns the raw random code exactly once. The code uses at least 256 bits of randomness and expires after 7 days. Redemption requires an authenticated user. A migration trigger inserts membership when a previously unused invitation is atomically claimed by a conditional `UPDATE ... RETURNING`; reuse fails without adding another member. Owners cannot redeem their own invites.

### 4.6 `workspace_calculation`

A named calculation is an immutable input snapshot, not a server result:

- `id` UUID text primary key;
- `project_id` FK project cascade delete;
- `created_by_user_id` FK user with `ON DELETE RESTRICT` while project exists;
- `title` 1–120 chars;
- `calculator_id` stable supported catalog ID;
- `calculator_version` current validated engine version;
- `state_json` the exact canonical `PersistedCalculatorState` object validated by the existing Phase 04 parser;
- optional `rule_context_json` for synthetic-rule provenance `{ ruleId, versionId }` only;
- `created_at`.

Snapshots are create/delete only in Phase 06. Editing calculator inputs produces a new record rather than mutating history.

## 5. Domain validation

Create `apps/web/src/lib/workspace/contracts.ts` as the pure workspace shape boundary. It owns:

- profile parsing;
- goal create/update parsing;
- project create/update parsing;
- invite role parsing;
- named calculation create parsing;
- strict title/description/note/date bounds;
- strict unknown-key rejection;
- bounded request sizes (16 KiB for normal mutations, inherited calculator-state limit for calculation snapshot state);
- helper role/status types.

Canonical calculator-state validation continues to use `parsePersistedCalculatorState`; no duplicate decimal/formula validation is introduced.

## 6. Repository and authorization

Create `apps/web/src/lib/workspace/repository.ts` over `drizzle-orm/d1`.

Repository methods are user-scoped or project-scoped and never accept a client-supplied authorization result. Access is re-derived from D1 on every request through helpers such as:

- `getProjectAccess(projectId, userId)` -> `owner | editor | viewer | null`;
- `listWorkspaceProjects(userId)` -> owned + shared summaries;
- `getProjectDetail(projectId, userId)` -> access-filtered detail;
- CRUD for profile/goals/projects;
- invite create/redeem/member revoke;
- named calculation create/get/list/delete;
- export model hydration.

All write methods require an authenticated Better Auth user ID supplied by the HTTP adapter. Stable domain errors are normalized before reaching routes.

## 7. HTTP surface

All workspace endpoints are first-party, `Cache-Control: no-store`, authenticated except public calculators themselves, and return stable generic errors.

- `GET|PUT /api/workspace/profile`
- `GET|POST /api/workspace/goals`
- `PATCH|DELETE /api/workspace/goals/:id`
- `GET|POST /api/workspace/projects`
- `GET|PATCH|DELETE /api/workspace/projects/:id`
- `POST /api/workspace/projects/:id/invites`
- `DELETE /api/workspace/projects/:id/members/:userId`
- `POST /api/workspace/invites/redeem`
- `POST /api/workspace/calculations`
- `GET|DELETE /api/workspace/calculations/:id`
- `GET /api/workspace/projects/:id/export`

Error codes include `authentication-required`, `invalid-workspace-input`, `workspace-not-found`, `workspace-forbidden`, `workspace-conflict`, `invite-invalid`, `invite-expired`, `invite-used`, `project-read-only`, and `storage-unavailable`.

No route accepts or returns Better Auth session tokens, SQL details, stack traces, or raw invite hashes.

## 8. Calculator integration

Each calculator retains its current local draft + explicit Phase 04 Save/Load/Delete draft controls.

Add a separate `WorkspaceCalculationControls` component below draft controls:

- signed-out: compact sign-in affordance and explicit statement that Projects require an account;
- signed-in: load accessible owner/editor projects, let the user name the successful calculation, choose a project, and explicitly save the canonical state snapshot;
- viewer-only projects are visible in workspace but excluded from the save target list;
- save occurs only after a successful local calculation yields the already-validated canonical `PersistedCalculatorState`;
- synthetic calculator also sends its resolved rule version as optional provenance metadata;
- no keystroke or automatic network persistence.

Workspace record links navigate to the matching calculator with `?record=<id>`. The calculator fetches record metadata but does **not** overwrite current local form state automatically. It presents an explicit **Load saved calculation** action; only that action maps canonical state back to localized fields. Failed loads leave the current form untouched.

## 9. Workspace product UI

Replace the Phase 04 persistence-only workspace summary with a signed-in workspace dashboard built from the existing Found Calc shadcn/Tailwind design language.

The current Taste Skill explicitly treats dense dashboards as outside its landing-page focus, so Phase 06 follows its anti-slop principles only where compatible: strong hierarchy, no gratuitous card grid, complete loading/empty/error states, tactile button states, and deliberate responsive spacing. The approved Found Calc Space Grotesk/shadcn palette remains authoritative; no second design system dependency is added.

### 9.1 Workspace dashboard `/{locale}/workspace`

Signed out:

- clear sign-in CTA;
- explain that public calculators remain account-free.

Signed in:

- profile editor with display name and preferred locale;
- Goals section with create + status actions;
- Projects section split into **Owned** and **Shared with me**;
- project creation can optionally connect to one of the owner's Goals;
- invite redemption field for users joining a shared project;
- explicit empty states with next actions;
- retained small draft-status summary so Phase 04 saved drafts remain discoverable without being conflated with Projects/history.

### 9.2 Project detail `/{locale}/workspace/projects/[projectId]`

- project identity/status/access role;
- owner-only editable metadata and private goal link;
- member list using profile display names, never credential details beyond the current user's own email in account UI;
- owner-only invite creation and member removal;
- named calculation history with calculator label, creator display name, timestamp, rule-version provenance when present, open-in-calculator link, and authorization-aware delete;
- JSON export action available to all project participants;
- collaboration privacy warning that project members can see saved canonical calculator inputs.

The page remains keyboard operable and has no horizontal overflow at 390 px.

## 10. Export contract

Project export is a portable JSON download generated server-side from authorized rows. It contains:

- schema/version marker;
- project name/description/status;
- participant display names + roles only (no emails, auth IDs, invite tokens/hashes, sessions, or guest IDs);
- named calculation metadata and canonical state snapshots;
- optional synthetic rule provenance metadata;
- export timestamp.

It does not include the owner's private Goal record, Better Auth account data, Phase 04 unrelated drafts, or administrative rule data.

## 11. Privacy, security, and trust

- All workspace APIs require a valid Better Auth session and recheck ownership/membership server-side.
- Invite tokens are cryptographically random, time-limited, stored only as SHA-256 hashes, and single-use.
- No email/account enumeration endpoint is introduced.
- Collaboration is explicit; adding a project member cannot expose other projects/goals/drafts.
- Named calculation inputs are user-selected persistence events; no automatic raw-input logging or telemetry is added.
- Project collaboration UI warns that project members can view saved calculation input snapshots.
- Export omits auth/internal identifiers and private Goals.
- Stable API failures do not expose D1/SQL internals.

## 12. Testing and verification

Every implementation task follows RED -> GREEN -> refactor.

Phase 06 verification adds:

- dependency-free source/schema/route/boundary contracts;
- pure workspace validator tests;
- Cloudflare D1 repository tests for profile/goal/project ownership, membership authorization, invite one-time redemption, immutable named snapshots, deletion rules, and export privacy;
- HTTP tests for 401/403/validation/conflict paths and collaborator permissions;
- web unit tests for workspace client payload parsing and calculator record restoration;
- Playwright ID/EN flows for profile/goal/project creation, save calculation to project, reopen calculation, invite/redeem collaboration, viewer/editor differences, export, keyboard interaction, and 390 px no-overflow;
- unchanged Phase 05 -> 01 regression gates;
- Next.js build, vinext compatibility/build, migration chain, and built Worker workspace-route smoke.

`pnpm verify:phase06` becomes the fail-fast Phase 06 entrypoint and remains a strict superset of `verify:phase05`.

## 13. Explicit exclusions

Phase 06 does not include:

- Xendit, subscriptions, plans, entitlements, invoices, payment webhooks, or paid gates (Phase 07);
- production regulatory/tax/legal datasets or changes to rule publication semantics;
- public unauthenticated project sharing links;
- email invitation delivery, OAuth/social auth, organizations/teams, presence, comments, real-time cursors, or conflict-free collaborative editing;
- arbitrary file attachments, PDF/CSV export, cloud object storage, or import;
- analytics/telemetry provider integration, SEO hardening, or production observability (Phase 09);
- AI explanations/features;
- TestSprite/full launch certification (Phase 10);
- remote D1 provisioning/migration, production Cloudflare deploy, DNS, or production secret mutation;
- server-side calculator execution or result verification.

## 14. Completion criteria

Phase 06 is complete only when:

- profile/goals/projects/membership/invite/named-calculation/export flows are implemented with observed RED/GREEN evidence;
- `calculator_state` guest/local/auth semantics remain unchanged and regression-covered;
- no server formula duplication exists;
- project access and invite redemption are enforced server-side;
- named calculation restoration is explicit and cannot silently overwrite local form state;
- ID/EN and 390 px accessibility gates pass;
- full Phase 06 CI, production builds, migration chain, Worker smoke, and inherited Phase 05–01 regressions are green on the final PR head;
- review threads are clear;
- the PR is merged to `main`;
- Phase 06 verification/baseline/handoff artifacts are updated and the exact merged source is packaged as `found-calc-phase-06-goals-projects-profiles-workspace.zip` with SHA256/extraction/source-tree verification.
