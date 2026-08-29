# Found Calc Phase 07 — Billing, Entitlements & Xendit

**Project:** Found Calc  
**Phase state:** COMPLETE  
**Last canonical completed phase:** Phase 07 — Billing, Entitlements & Xendit  
**Next phase:** Phase 08 — Frozen V1 Catalog Production  
**Completion date:** 2026-08-29

## Canonical artifact

`found-calc-phase-07-billing-entitlements-xendit.zip`

GitHub `main` remains the collaborative canonical repository. After merge, `.github/workflows/phase-07-baseline-artifact.yml` archives the exact merged `GITHUB_SHA` with `git archive`, writes `SHA256SUMS`, verifies ZIP integrity, extraction, and required files, and records exact source commit/tree provenance in `ARTIFACT_VERIFICATION.txt`. The resulting ZIP is the portable recovery/handoff source for Phase 08.

Historical predecessor provenance: Phase 07 started from `found-calc-phase-06-goals-projects-profiles-workspace.zip`.

## Canonical implementation evidence

Final production/runtime candidate before closure-metadata-only changes:

- source SHA: `602d214add0424b0466d0452c8a9b8220e193faa`;
- PR synthetic-merge GitHub Actions run: `33265992747`;
- full verification job: `99136070192` — **SUCCESS**;
- built Worker smoke job: `99136070354` — **SUCCESS**.

That exact source includes the regression-proven hardening for ambiguous Xendit provider plan updates, cross-wired webhook identity, deterministic Worker diagnostics, and recovery from the known local Wrangler/Miniflare fatal `Network connection lost.` proxy signature. Only closure metadata/provenance may change after this milestone; merge remains conditional on a fresh exact closure-head Phase 07 run passing both the full verifier and built-Worker smoke. The canonical artifact workflow records the exact merged identity dynamically.

## Completed deliverables

- First-party D1 billing customer, checkout, subscription, webhook-inbox, pending-plan-change, cancellation, and ordered reconciliation state.
- Approved V1 commercial coordinates: Free Rp0; Pro Rp25.000/month or Rp250.000/year; Business Rp75.000/month or Rp750.000/year.
- Monthly and annual Xendit subscription checkout with annual represented as a 12-month recurring interval.
- Capability-based entitlement resolution from validated first-party state; ordinary entitlement reads do not call Xendit.
- Webhook-authoritative activation/change semantics with duplicate, stale, delayed, retry, failure, and terminal-state protection.
- Authenticated checkout, status, cancellation, and plan-change APIs that never trust provider identity from browser input.
- Upgrade/downgrade staging with entitlement promotion only after matching authoritative successful-cycle reconciliation.
- Ambiguous provider plan-update outcomes preserve staged first-party target state until authoritative reconciliation; definite provider rejection may clear it.
- Localized ID/EN billing workspace UI, monthly/annual offers, lifecycle messaging, keyboard/focus/accessibility coverage, and 390px no-overflow coverage.
- Free public calculators remain usable; Phase 01–06 calculator/rule/persistence/workspace truth is not retroactively paywalled or reinterpreted.
- `verify:phase07` as a fail-fast Phase 06→01 regression superset plus Phase 07 foundation/unit/D1/browser/build checks.
- Deterministic built vinext Worker smoke with named checkpoints, sanitized diagnostics, and bounded recovery only for the exact known local Miniflare connection-loss proxy signature.

Detailed evidence: `docs/verification/phase-07-verification.md`.

## Stable architecture boundaries

### Deterministic truth

`@found-calc/engine` remains the only owner of calculator arithmetic. Billing, entitlements, checkout, Xendit, workspace storage, routes, and UI must not duplicate formulas.

### Rule truth

`@found-calc/rules` continues to own immutable version/effective-date/publication semantics. Billing does not reinterpret rule truth.

### Billing and entitlement truth

First-party D1 state is the application authorization/entitlement truth. Xendit is the payment/subscription processor. Checkout return URLs are informational and never grant paid capability. Valid authenticated provider reconciliation is authoritative for subscription transitions.

### Provider trust boundary

`XENDIT_SECRET_API_KEY` and `XENDIT_WEBHOOK_TOKEN` are server-only. Browser requests never supply trusted provider IDs. Billing status and entitlement reads never require provider network calls. Webhook authentication happens before body mutation and provider payloads are normalized rather than retained raw.

### Persistence and ordering

Phase 07 uses the separate `0004_phase07_billing.sql` domain. Webhook inbox idempotency and event timestamp/rank ordering prevent duplicates, stale events, or older activation from reviving newer terminal state. Pending plan changes do not grant target capabilities before authoritative success. Provider mutation ambiguity is fail-safe: transport/timeout/408/5xx uncertainty preserves the pending target instead of pretending the provider definitely rejected it.

## Deployment-like verification note

An earlier Phase 07 Worker smoke produced a false-negative because a `curl ... | grep -q` assertion ran under `set -euo pipefail`: after `grep -q` found the match and closed the pipe, `curl` could exit with code 23 even though the request succeeded. The smoke now stores responses first, checks HTTP status/body separately, runs as a dedicated parallel job, and emits named sanitized checkpoints.

Later GitHub-hosted Node 22 runs exposed the local Wrangler/Miniflare regression whose exact proxy response is HTTP 500 with body `Error: Network connection lost.` and which can terminate `wrangler dev`, causing subsequent requests to receive connection refused. The final harness tolerates only that exact tooling signature: it stops/restarts the local Wrangler process with the same supported `--persist-to` D1 directory, re-probes readiness, and retries at most three attempts. Arbitrary Found Calc/application 500s still fail immediately. Because signup mutates state, each retry attempt uses an isolated smoke identity so an ambiguous first POST is never replayed against the same email.

Current Context7 `/cloudflare/workers-sdk` documentation confirms `wrangler dev --persist-to <dir>` is the supported custom local persistence mechanism and D1 local migration tooling supports `--local --persist-to`; the recovery therefore preserves the same local D1 state across a tooling-process restart rather than introducing a deployment-specific data workaround.

## Preserved security and interaction contracts

- Public calculators remain usable without authentication.
- Checkout success/cancel return state cannot activate entitlement.
- Cancellation keeps access until authoritative inactivation confirmation.
- Failed/retrying payment does not silently grant new capabilities.
- Duplicate/out-of-order webhooks are idempotent and order-safe.
- Cross-user billing state is scoped by authenticated first-party identity.
- No raw calculator inputs, payment credentials, auth cookies, callback tokens, provider API secrets, or production database identity are logged or included in portable artifacts.
- ID/EN, keyboard accessibility, visible focus, semantic status messaging, and mobile no-overflow requirements remain enforced.
- Fixed infrastructure target remains Rp0 excluding domain and payment transaction fees.

## Explicitly deferred beyond Phase 07

- Frozen V1 calculator catalog production batches (Phase 08).
- Production analytics/SEO/security/cost hardening beyond inherited requirements.
- AI product features.
- TestSprite launch certification.
- Remote Cloudflare production deployment, DNS, real D1 provisioning/migration, or production secret mutation.

## Continuity rule

Start **Phase 08 — Frozen V1 Catalog Production** in a **new chat inside the same Found Calc project** using the exact post-merge `found-calc-phase-07-billing-entitlements-xendit.zip`. Read `PHASE_HANDOFF.md`, this baseline, the Phase 07 verification record/spec/plan, and the canonical Phase Workflow before planning. Treat Phase 01–07 architecture/regression/security boundaries as approved baseline unless a verified implementation blocker requires change control.
