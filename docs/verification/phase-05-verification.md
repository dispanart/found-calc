# Found Calc Phase 05 — Verification Record

**Phase:** 05 — Versioned Rule Platform + Admin Core  
**Status:** CLOSURE EVIDENCE RECORDED; final PR-head verification is required before merge  
**Implementation source SHA:** `eb67641aeb47222f44258251c2caea93b6809b7f`  
**Implementation CI run:** `33232447867`  
**Implementation job:** `99047494137`  
**Implementation result:** SUCCESS  
**Closure source SHA:** `8805bdab6085c9522108e765804f495cc6f850d7`  
**Closure CI run:** `33233141515`  
**Closure job:** `99049394758`  
**Closure result:** SUCCESS

## Verification command

The canonical Phase 05 verification entrypoint is:

```text
pnpm verify:phase05
```

It is a fail-fast superset of Phase 05-specific contracts, rules/web/Cloudflare/browser/build verification, and the complete Phase 04 → Phase 03 → Phase 02 → Phase 01 regression chain. The GitHub workflow also applies both local D1 migrations before the gate and smoke-tests the built vinext Worker afterward against a fresh dedicated D1 persistence state.

## Final implementation evidence

Run `33232447867` / job `99047494137` completed successfully from source SHA `eb67641aeb47222f44258251c2caea93b6809b7f` and established the final product implementation before continuity closure.

That run verified:

- Phase 04 D1 migration: **9 commands executed successfully**;
- Phase 05 D1 migration: **12 commands executed successfully**;
- dependency-free foundation/Phase 05 contracts: **44/44 passed** at the implementation snapshot;
- `@found-calc/rules`: **11/11 passed**;
- web unit tests: **18/18 passed**;
- Cloudflare D1/auth/rule tests: **13/13 passed**;
- source lint and TypeScript checks passed;
- browser gate passed, including the localized admin core, narrow viewport coverage, and synthetic rule-feed behavior;
- Next.js 16.2.9 production build passed;
- `vinext check`: **90% compatible, 0 issues** with two documented partial-support notes;
- `vinext build` passed;
- all inherited Phase 04/03/02/01 gates passed;
- built Worker public rule feed returned the published `2026-a` version and the signed-out admin endpoint returned **401**.

## Canonical closure evidence

Run `33233141515` / job `99049394758` completed successfully from closure source SHA `8805bdab6085c9522108e765804f495cc6f850d7` after the Phase 05 baseline, handoff, chat template, verification record, artifact workflow, and successor-safe continuity contracts were present.

Fresh closure evidence from that exact tree:

- Phase 04 D1 migration: **9 commands executed successfully**;
- Phase 05 D1 migration: **12 commands executed successfully**;
- dependency-free foundation/continuity contracts: **46/46 passed, 0 failed**;
- `@found-calc/rules`: **11/11 passed**;
- web unit tests: **18/18 passed**;
- Cloudflare D1/auth/rule tests: **13/13 passed**;
- lint completed with **0 errors**; two inherited warnings occur only in generated `worker-configuration.d.ts`;
- TypeScript checks passed, including generated Worker types and Cloudflare test TypeScript;
- Playwright completed with **19 passed plus one inherited Phase 04 scenario passing on retry** after transient vinext network churn;
- the critical guest save → account claim → workspace/load/delete path passed normally;
- Phase 05 admin localization and 390 px no-horizontal-overflow coverage passed;
- synthetic calculator rule-feed-unavailable behavior passed;
- Next.js 16.2.9 production build passed;
- `vinext check`: **90% compatible, 0 issues**;
- `vinext build` passed;
- Phase 04 → Phase 03 → Phase 02 → Phase 01 inherited regression chain passed;
- inherited engine tests: **29/29 passed**;
- inherited catalog tests: **2/2 passed**;
- built Worker smoke reapplied both migrations in one fresh `$RUNNER_TEMP` `--persist-to` state, served the published `2026-a` rule feed, and returned **401** for signed-out admin access;
- overall workflow job conclusion: **SUCCESS**.

This closure evidence is intentionally recorded once. Because this documentation update creates a new commit, that new final PR head must receive one additional fresh full `Phase 05 Verification` run before merge. The successful final-head run is the merge gate and is not written back into this file, avoiding a self-referential evidence-update loop.

## Phase 05 behavior verified

The verified Phase 05 slice establishes:

- D1-backed immutable version identities `(rule_id, version_id)` with draft/published lifecycle metadata;
- strict ISO date-only effective periods and published-overlap protection owned by `@found-calc/rules`;
- published synthetic/reference seed versions `2025-a` and `2026-a` only, not production regulatory guidance;
- Better Auth admin bootstrap through `BETTER_AUTH_ADMIN_USER_IDS` without a hard-coded production admin identity;
- a public published-only rule feed with no draft or audit-actor leakage;
- authenticated and server-authorized admin list/create-draft/publish routes with stable generic error responses;
- synthetic reference calculation loading D1-published versions through the first-party rule feed while effective-date resolution and arithmetic remain local through the approved rules/engine boundaries;
- localized ID/EN rule-admin UI with explicit synthetic-only trust messaging and narrow-viewport accessibility coverage;
- Phase 04 auth, guest ownership/claim, local unsaved drafts, persisted calculator drafts, and workspace summary preserved as regressions.

## TDD and systematic-debugging evidence

Phase 05 used RED → GREEN cycles throughout implementation and closure. Important regressions and root-cause fixes include:

1. **Rule-platform boundaries** — storage, publication, admin, and runtime contracts were introduced before or alongside implementation and turned green as each approved boundary was completed.
2. **Current-schema D1 reset** — test setup was corrected to apply the current migration chain while preserving complete SQLite trigger blocks.
3. **Cloudflare pre-build isolation** — Cloudflare tests remain independent of generated vinext output and use the established D1 binding path.
4. **D1 constraint normalization** — nested D1 uniqueness errors are classified through their cause chain so duplicate version identity maps consistently to the domain error.
5. **Publication fixture semantics** — publish-success coverage uses a genuinely non-overlapping effective period rather than weakening the open-ended `2026-a` seed or overlap invariant.
6. **React async loaders** — rule-feed/admin loaders preserve loading/error behavior without violating hooks lint.
7. **Exact optional request properties** — optional abort signals are omitted when absent rather than passed as `undefined`.
8. **Built Worker D1 smoke isolation** — migration and `wrangler dev` share one fresh dedicated persistence path, and migration failures are never swallowed.
9. **Successor-safe closure** — Phase 04 closure tests now protect Phase 04's immutable verification/artifact instead of permanently pinning generic project handoff files; Phase 05 artifact triggers exclude generic handoff files so Phase 06 continuity edits cannot regenerate an old baseline.

## Security, privacy, trust, and architecture review

Verification and source review confirm:

- `@found-calc/engine` remains pure/deterministic and free of D1, auth, React, Worker bindings, locale, and network I/O;
- `@found-calc/rules` remains owner of version/effective-period/publication semantics and does not import persistence/UI/runtime concerns;
- server routes validate, hydrate, authorize, and persist but do not execute calculator formulas;
- the public rule feed exposes published versions only and excludes draft rows and audit actor IDs;
- admin authority is rechecked server-side; signed-out admin access receives 401 and browser state is not an authorization source;
- no raw calculator input logging, device fingerprinting, third-party telemetry, or client-side session token storage was introduced;
- no production secret, production admin identity, authoritative regulatory rate, or production legal/tax dataset is committed;
- stable API errors do not expose SQL/internal exception details;
- no Goals/Projects/Profiles implementation, billing/Xendit, production analytics/SEO hardening, AI, TestSprite launch gate, remote D1 provisioning, DNS, or production deployment was pulled into Phase 05.

## Known non-blocking platform notes

- Cloudflare Vitest can emit a pre-build static-analysis warning because the generated vinext entry does not exist yet; runtime suites still pass.
- vinext warns that explicit `vinext({ nextConfig })` overrides `next.config.ts`; this is intentional so the Node-only `cloudflare:workers` build stub cannot leak into workerd.
- `vinext check` reports partial support for `next/font/google` CDN loading and App Router `reactStrictMode`, with **0 issues** overall.
- inherited lint can show two unused eslint-disable warnings in generated `worker-configuration.d.ts`; source lint has no errors.
- the inherited signed-out 390 px workspace Playwright scenario can transiently miss the auth link during vinext dev-server network churn; it passed on retry in the closure run, while the critical guest claim flow passed normally.
- GitHub runner output can warn that Node 20-based action internals are forced onto Node 24; the project job explicitly configures Node 22.

## Canonical closure and artifact gate

The closure tree contains:

- `BASELINE.md` updated for **Phase 05 — Versioned Rule Platform + Admin Core**;
- `PHASE_HANDOFF.md` updated for **Phase 06 — Goals, Projects, Profiles & Workspace**;
- `PHASE_CHAT_TEMPLATE.md` pointing to the Phase 05 portable baseline;
- this exact verification record;
- `.github/workflows/phase-05-baseline-artifact.yml`;
- successor-safe closure contracts and artifact-trigger isolation.

Before merge, the exact final PR head must have a fresh green `Phase 05 Verification` run and zero unresolved review threads. No further source or documentation mutation is allowed after that evidence is selected for merge.

After PR #9 is merged to `main`, `.github/workflows/phase-05-baseline-artifact.yml` packages the exact merged `GITHUB_SHA` as:

`found-calc-phase-05-versioned-rule-platform-admin-core.zip`

The workflow writes `SHA256SUMS`, extracts and validates the archive, checks required Phase 05 source/config/test/docs files, rejects generated/dependency directories, records the exact source commit/tree in `ARTIFACT_VERIFICATION.txt`, and uploads the canonical portable baseline. The merged `main` commit—not a pre-merge branch SHA—is the canonical Phase 05 portable source identity.
