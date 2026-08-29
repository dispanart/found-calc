# Found Calc Phase 05 — Verification Record

**Phase:** 05 — Versioned Rule Platform + Admin Core  
**Status:** IMPLEMENTATION COMPLETE; canonical closure artifacts are under final PR-head verification  
**Implementation source SHA:** `eb67641aeb47222f44258251c2caea93b6809b7f`  
**Implementation CI run:** `33232447867`  
**Implementation job:** `99047494137`  
**Implementation result:** SUCCESS  
**Closure source SHA:** pending closure-head verification  
**Closure CI run/job:** pending closure-head verification

## Verification command

The canonical Phase 05 verification entrypoint is:

```text
pnpm verify:phase05
```

It is a fail-fast superset of Phase 05-specific contracts, rules/web/Cloudflare/browser/build verification, and the complete Phase 04 → Phase 03 → Phase 02 → Phase 01 regression chain. The GitHub workflow also applies both local D1 migrations before the gate and smoke-tests the built vinext Worker afterward against a fresh dedicated D1 persistence state.

## Final implementation run evidence

Run `33232447867` / job `99047494137` completed successfully from source SHA `eb67641aeb47222f44258251c2caea93b6809b7f`.

Observed evidence from that run:

- Phase 04 D1 migration: **9 commands executed successfully**;
- Phase 05 D1 migration: **12 commands executed successfully**;
- dependency-free Phase 05/foundation contracts: **44/44 passed**;
- `@found-calc/rules` tests: **11/11 passed**;
- web unit tests: **18/18 passed** across 7 files;
- Cloudflare D1/auth/rule tests: **13/13 passed** across 6 files;
- web lint: **0 source errors**; inherited generated Worker types emitted 2 non-blocking unused-disable warnings in later regression lint;
- web typecheck: **passed**, including generated Worker types and Cloudflare test TypeScript;
- Phase 05 browser suite: **19 passed plus 1 inherited Phase 04 flaky scenario that passed on retry**;
- the critical guest persistence/claim/load/delete flow passed normally;
- Phase 05 admin localization and 390 px no-horizontal-overflow checks passed;
- synthetic calculator rule-feed unavailable behavior passed;
- Next.js **16.2.9** production build passed;
- `vinext check`: **90% compatible, 0 issues**, with 2 documented partial-support notes;
- `vinext build`: passed;
- inherited Phase 04 verification passed;
- inherited Phase 03 verification passed;
- inherited Phase 02 verification passed;
- inherited Phase 01 verification passed;
- inherited engine tests: **29/29 passed**;
- inherited catalog tests: **2/2 passed**;
- built Worker smoke used one fresh `--persist-to` state, reapplied both migrations successfully, served the published `2026-a` rule feed, and returned **401** for the signed-out admin endpoint;
- overall GitHub Actions job conclusion: **SUCCESS**.

## Phase 05 behavior verified

The verified Phase 05 slice establishes:

- D1-backed immutable version identities `(rule_id, version_id)` with draft/published lifecycle metadata;
- strict effective-period validation and overlap protection owned by `@found-calc/rules`;
- published synthetic reference seed versions `2025-a` and `2026-a` only;
- Better Auth admin bootstrap through `BETTER_AUTH_ADMIN_USER_IDS` without hard-coded production admin identity;
- a public published-only rule feed with no draft/audit actor leakage;
- authenticated/authorized admin create-draft and publish routes with stable error responses;
- synthetic reference calculation loading D1-published versions through the first-party feed while date resolution and arithmetic remain local through the approved rules/engine boundaries;
- localized ID/EN rule-admin UI with explicit synthetic-only trust messaging and narrow-viewport accessibility coverage.

## TDD and systematic-debugging evidence

Phase 05 used RED → GREEN cycles throughout implementation and closure. Important verified regressions include:

1. **Rule-platform contract skeleton** — Phase 05 source contracts were introduced before durable storage/admin/runtime implementation and turned green as each boundary was added.
2. **Current-schema D1 test reset** — the first test helper split trigger SQL incorrectly and Phase 04 auth tests initially reconstructed only migration 0001. The helper was corrected to apply the current schema while preserving complete `CREATE TRIGGER … BEGIN … END;` blocks.
3. **Cloudflare pre-build test isolation** — importing the Cloudflare test helper forced the generated vinext Worker entry to exist before build. The test harness instead stayed on the established D1 binding path so pre-build Cloudflare tests remain independent of generated output.
4. **D1 constraint normalization** — Drizzle surfaced D1 uniqueness through a nested `cause`; repository error classification now walks the error chain so duplicate version identity consistently becomes `duplicate-version` rather than a storage 503.
5. **Publication-period fixture semantics** — the existing `2026-a` seed is open-ended. The publish-success test was moved to the non-overlapping 2024 gap instead of weakening the seed or overlap rule.
6. **React effect-state lint** — admin/rule-feed loaders were refactored so effects start async work while state updates occur from promise callbacks, preserving loading safety without violating React hooks lint.
7. **Exact optional request properties** — optional abort signals are omitted from `fetch` init when absent instead of passing `signal: undefined`, satisfying Worker/DOM `RequestInit` typing under `exactOptionalPropertyTypes`.
8. **Cloudflare Vitest assertion typing** — unsupported generic arguments on `toMatchObject` were removed while preserving exact domain-code assertions.
9. **Built Worker D1 smoke isolation** — run #36 proved the product gate green but exposed an ambiguous/reused smoke database; migration errors were also hidden by `|| true`. A new RED contract required one fresh `$RUNNER_TEMP` persistence path for both migrations and `wrangler dev`, with no swallowed migration errors. Run `33232447867` then passed the full gate and final Worker smoke.
10. **Closure continuity** — closure contracts require updated Phase 05 baseline/handoff/chat template, this verification record, the canonical Phase 05 artifact workflow, and trigger isolation so Phase 06 handoff edits cannot accidentally regenerate the Phase 05 artifact.

## Security, privacy, trust, and architecture review

Source and behavior review verified:

- `@found-calc/engine` remains pure/deterministic and free of D1, auth, React, Worker bindings, locale, and network I/O;
- `@found-calc/rules` remains owner of version/effective-period publication semantics and does not import persistence/UI/runtime concerns;
- server routes validate/hydrate/persist rule data but do not execute calculator formulas;
- the public rule feed returns published versions only and excludes draft rows and audit actor IDs;
- admin mutation authorization is rechecked server-side; signed-out mutation/list access receives 401 and non-admin access is rejected;
- no raw calculator input logging was added;
- no Better Auth/session token is stored in localStorage;
- no production secret, admin identity, regulatory rate, or authoritative legal/tax dataset is committed;
- stable API errors do not expose SQL/internal exception detail;
- Phase 04 guest/local/auth draft preservation remains intact;
- no Goals/Projects/Profiles workspace expansion, billing/Xendit, analytics, production SEO hardening, AI, TestSprite launch gate, remote D1 provisioning, DNS, or production deployment was pulled forward.

## Runtime/build notes

### Local D1 and built Worker smoke

The verification job uses the inherited local D1 identity for ordinary test/dev verification. The final built-Worker smoke creates a separate fresh persistence directory under `$RUNNER_TEMP`, applies migration 0001 then 0002 without suppressing errors, and starts the generated Worker with that exact same `--persist-to` path. This prevents Vite/Wrangler state-path ambiguity from masquerading as an application failure.

### Known non-blocking warnings

- Cloudflare Vitest can warn before vinext build that it cannot statically analyze the generated Worker entry; the D1/auth/rule tests still pass.
- vinext warns that the explicit `vinext({ nextConfig })` source overrides `next.config.ts`; this is intentional to prevent the Node-only Cloudflare build stub from leaking into workerd.
- `vinext check` reports partial support for `next/font/google` CDN loading and App Router `reactStrictMode`; it reports **0 issues** overall.
- inherited lint can show two unused eslint-disable warnings in generated `worker-configuration.d.ts`; there are no source lint errors.
- the inherited signed-out 390 px workspace browser scenario can transiently miss the auth link during vinext dev-server network churn; it passed on retry in the successful implementation run. The critical guest claim flow passed normally.
- GitHub runner output can warn that actions implemented on Node 20 are forced onto Node 24; the project job explicitly configures Node 22.

## Canonical closure and artifact gate

The Phase 05 implementation is verified by run `33232447867` / job `99047494137`. The closure tree adds:

- updated `BASELINE.md` for Phase 05;
- updated Phase 05 → Phase 06 `PHASE_HANDOFF.md`;
- updated `PHASE_CHAT_TEMPLATE.md` pointing to the Phase 05 portable baseline and **Phase 06 — Goals, Projects, Profiles & Workspace**;
- this verification record;
- `.github/workflows/phase-05-baseline-artifact.yml`;
- closure contracts that verify both portable handoff content and Phase 05-specific artifact-trigger isolation.

After these closure artifacts receive their first fresh green full Phase 05 CI run, this record is updated once with that closure source SHA/run/job. That documentation update receives one additional fresh final-head CI run before merge; the successful final-head run is merge evidence and does not require another documentation mutation, avoiding an evidence-update loop.

Before merge, the final PR head must have a fresh green `Phase 05 Verification` run and zero unresolved review threads.

After PR #9 is merged to `main`, `.github/workflows/phase-05-baseline-artifact.yml` packages the exact merge `GITHUB_SHA` as:

`found-calc-phase-05-versioned-rule-platform-admin-core.zip`

The workflow also writes `SHA256SUMS`, extracts the archive, checks required Phase 05 source/config/test/docs files, rejects generated/dependency directories, records the exact source commit/tree in `ARTIFACT_VERIFICATION.txt`, and uploads the canonical baseline artifact. The merged artifact commit, not a pre-merge branch SHA, is the canonical Phase 05 portable source identity.
