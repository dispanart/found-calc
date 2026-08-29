# Found Calc Phase 05 — Versioned Rule Platform + Admin Core Design

**Status:** implementation design for the approved Phase 05 slot in Found Calc Phase Workflow v2  
**Predecessor:** Phase 04 — Persistence, Auth & Guest Preservation  
**Successor:** Phase 06 — Goals, Projects, Profiles & Workspace

## 1. Goal

Phase 05 turns the Phase 02 immutable rule-version contract into a durable, auditable platform boundary and activates the existing `/admin` route as a narrowly scoped rule-management surface. The phase proves one complete synthetic/reference rule lifecycle without introducing real regulatory guidance or production catalog breadth.

A signed-out or non-admin user must not be able to mutate rule data. A configured admin can create a validated draft version, review its provenance/effective period, publish it exactly once, and then observe that the public rule feed exposes the immutable published version. The reference synthetic calculator consumes published rule versions from the first-party rule feed and still performs resolution and arithmetic locally through `@found-calc/rules` and `@found-calc/engine`.

## 2. Fixed inherited boundaries

- `@found-calc/engine` remains pure and deterministic. It never imports D1, auth, React, Next.js, Worker APIs, or performs network I/O.
- `@found-calc/rules` remains the owner of immutable rule-version/effective-date semantics. Persistence adapters may store and hydrate rule versions but do not become resolver/formula truth.
- Server APIs may validate rule payloads and publication invariants, but may not calculate calculator results.
- Phase 04 guest/local/auth draft preservation remains unchanged.
- ID/EN, keyboard accessibility, explicit field errors/status, 390 px no-horizontal-overflow, privacy/trust, and no raw calculator-input logging remain requirements.
- No remote Cloudflare resource, DNS, production secret, or paid-service mutation is required.
- Fixed infrastructure target remains Rp0 excluding domain/payment transaction fees.

## 3. Scope

### 3.1 Durable rule-version records

Add a D1 `rule_version` table with immutable identity `(rule_id, version_id)` and an internal UUID primary key. Each row stores:

- `rule_id` and `version_id`;
- ISO date-only `effective_from` and optional `effective_until`;
- canonical JSON payload;
- provenance `source_id` and optional `source_url`;
- lifecycle status `draft | published`;
- creation actor/time;
- publication actor/time.

The migration seeds only the existing `reference.synthetic-rate` fixtures (`2025-a`, `2026-a`) as **published synthetic reference data** so current reference behavior is reproducible through D1. Seed rows have system/null actors and retain `source_id = synthetic-reference-fixture`. No real-world tax/regulation/rate data is introduced.

Published rows are immutable: Phase 05 has no edit/delete/unpublish path. Draft correction is handled by creating a new version identity. Publication mutates lifecycle metadata only.

### 3.2 Rule-platform domain validation

`@found-calc/rules` gains persistence-independent publication checks:

- strict ISO date-only period validation;
- `effective_until >= effective_from` when present;
- detection of interval overlap between a candidate and already-published versions for the same rule;
- immutable version identity semantics.

The web adapter owns payload schemas. Phase 05 registers one supported rule payload, `reference.synthetic-rate`, with one canonical `ratePercent` string accepted only when it parses at scale 4 and is in `[0, 100]`. This is rule-input validation, not formula execution.

Gaps are allowed and remain explicit `rule-unavailable` outcomes. Overlapping published coverage is rejected before publication because it would otherwise make resolution ambiguous.

### 3.3 Admin authorization core

Use Better Auth's admin plugin, backed by the existing D1 auth schema. The Phase 05 migration adds the plugin's user fields (`role`, `banned`, `ban_reason`, `ban_expires`). Admin bootstrap uses `BETTER_AUTH_ADMIN_USER_IDS`, a comma-separated environment value. No email allowlist, browser token storage, or hard-coded production admin identity is committed.

Application rule-admin endpoints authorize when the current Better Auth session user is either:

- `role === "admin"`; or
- listed in `BETTER_AUTH_ADMIN_USER_IDS` (bootstrap path).

Unauthenticated mutation requests return 401. Authenticated non-admin requests return 403. Stable API errors do not leak SQL/internal exception detail.

Phase 05 does not add user-management UI, organizations, teams, OAuth, email verification/reset delivery, 2FA, or passkeys.

### 3.4 Rule APIs

Public read endpoint:

`GET /api/rules/:ruleId/versions`

- accepts only registered Phase 05 rule IDs;
- returns published versions only;
- returns canonical locale-neutral values/provenance;
- never returns audit actor IDs or draft rows;
- uses stable errors and no raw input logging.

Admin endpoints:

- `GET /api/admin/rule-versions?ruleId=...` — list draft + published rows for a supported rule;
- `POST /api/admin/rule-versions` — create a validated draft;
- `POST /api/admin/rule-versions/:id/publish` — atomically validate conflicts against current published rows and publish once.

Request bodies are bounded (16 KiB). Unknown keys/unsupported rule IDs/invalid JSON/invalid payload/date ranges return 400-series stable codes. Duplicate `(rule_id, version_id)` returns 409. Publishing an already-published version is idempotent only when the stored row is already published: it returns the existing published representation without changing immutable fields. Publication overlap returns 409.

### 3.5 Runtime consumption

The synthetic calculator no longer imports the static fixture array as its product-time source. Its client adapter loads the public first-party published rule feed, then passes those hydrated `RuleVersion` values into the existing synchronous `resolveRuleVersion` and engine calculation path.

There is no server-side formula endpoint. If the public rule feed is unavailable, the calculator presents an explicit localized rule-data-unavailable state and does not silently fall back to bundled fixtures. Package/unit tests may continue to use explicit fixture arrays.

### 3.6 Admin UI

The existing localized `/id/admin` and `/en/admin` shell becomes a compact rule-admin surface for `reference.synthetic-rate` only:

- current authorization state;
- list of draft/published versions with effective period and source provenance;
- create-draft form for version ID, effective dates, rate percent, source ID, optional source URL;
- explicit Publish action for drafts;
- success/error status region;
- keyboard-accessible labels/buttons and mobile single-column layout.

The UI makes synthetic/reference status explicit. It does not market these values as current legal, tax, or regulatory guidance.

## 4. Components and boundaries

### `packages/rules`

Adds pure period/publication validation helpers. No D1/auth/network imports.

### `apps/web/src/lib/rules`

- `payload.ts`: supported-rule registry and payload parsing.
- `repository.ts`: D1 persistence adapter and row hydration.
- `http.ts`: stable public/admin HTTP handlers and authorization orchestration.
- `client.ts`: browser public-feed fetch/hydration helper.

### Auth

`apps/web/src/lib/auth/server.ts` enables the Better Auth admin plugin and parses configured bootstrap user IDs. `schema.ts` and the migration receive the required admin plugin fields.

### Routes/UI

Route handlers remain thin adapters around `lib/rules/http.ts`. The admin page renders a client `RuleAdminPanel`; all sensitive authorization is rechecked server-side by admin APIs.

## 5. Data flow

### Public calculation

1. Synthetic calculator mounts.
2. Browser requests published versions from `/api/rules/reference.synthetic-rate/versions`.
3. Server reads published rows from D1 and hydrates canonical `RuleVersion` objects; no formula executes.
4. Browser validates/hydrates the feed.
5. On Calculate, client calls `resolveRuleVersion(versions, effectiveDate)`.
6. Resolved dependency is passed to `calculateSyntheticRuleAmount` locally.
7. Existing result provenance displays rule/version/effective period/source.

### Admin publish

1. Authenticated admin submits a draft.
2. Server validates bounded JSON, supported rule, period, payload, provenance, and unique identity.
3. Repository inserts status `draft` with creator audit metadata.
4. Admin chooses Publish.
5. Server reloads current published siblings, validates no overlapping effective interval, then performs a conditional status transition `draft -> published` with publisher/time.
6. Public reads can now see that immutable version.

## 6. Error handling and safety

Stable error codes include: `authentication-required`, `admin-required`, `unsupported-rule`, `payload-too-large`, `invalid-json`, `invalid-rule-version`, `invalid-rule-payload`, `version-conflict`, `publication-overlap`, `rule-version-not-found`, and `storage-unavailable`.

No endpoint returns SQL errors, stack traces, passwords/session tokens, raw auth secrets, or actor email addresses. Rule payload/provenance are intended public metadata only after publication. Draft/audit records are admin-only.

## 7. Testing

Every task follows RED -> GREEN -> refactor.

Required Phase 05 coverage:

- pure rules package tests for period validation and overlap boundaries;
- repository tests against Cloudflare D1 for seed hydration, draft creation, unique identity, published-only reads, and immutable publication;
- admin authorization/API tests for 401/403/admin success and stable errors;
- public feed test proving drafts are not exposed;
- web unit tests for feed parsing/runtime with explicit rule versions;
- browser test for admin create -> publish -> public synthetic calculation using the new version;
- ID/EN admin accessibility and 390 px no-overflow checks;
- `verify:phase05` as a fail-fast superset of Phase 04 -> 03 -> 02 -> 01;
- canonical Next build, vinext check/build, local D1 migrations, and built Worker smoke.

## 8. Explicit exclusions

Phase 05 does not include:

- real production regulatory/tax/legal rule datasets or authoritative guidance;
- frozen V1 catalog breadth/Phase 08 production publishing;
- Goals, Projects, Profiles, named history, collaboration, sharing, export, or workspace expansion (Phase 06);
- Xendit payments/subscriptions/entitlements/invoices/webhooks (Phase 07);
- production analytics/telemetry, SEO hardening, performance/cost hardening (Phase 09);
- TestSprite/full launch-readiness gate (Phase 10);
- remote D1 provisioning, DNS, production deploy, production secrets, or paid infrastructure;
- rule deletion, unpublish, rollback UI, bulk import, approval workflows, scheduled future publishing, or multi-admin audit dashboards.

## 9. Completion criteria

Phase 05 is complete only when:

- rule platform + admin-core tests pass with observed RED/GREEN evidence;
- published rule versions are immutable and public reads exclude drafts;
- synthetic reference calculation consumes D1-published rule data while formula/resolution remain local/pure;
- admin mutation paths enforce authentication/authorization;
- inherited Phase 04/03/02/01 gates pass;
- production builds and built Worker smoke pass;
- source review finds no server formula duplication, secret leakage, raw calculator-input logging, or Phase 06+ scope;
- `BASELINE.md`, `PHASE_HANDOFF.md`, verification record, workflow, and canonical Phase 05 ZIP are updated;
- fresh GitHub CI on the final PR head is green, review threads are clear, and the Phase 05 PR is merged to `main` before the portable canonical baseline is finalized.
