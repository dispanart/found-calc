# Found Calc Phase 04 — Verification Record

**Phase:** 04 — Persistence, Auth & Guest Preservation  
**Status:** COMPLETE; closure implementation verified and awaiting final documentation-head verification/merge  
**Implementation source SHA:** `5073c3c97667775adc13708ca5507eb809895ebf`  
**Implementation merge commit:** `4cc9fe3c84ea56a0caf587754547da0a59a772e5`  
**Final implementation CI run:** `33199332188`  
**Implementation job:** `98944559520`  
**Closure source SHA:** `326c93de56c83e64d26ef065268707e6e9cc94f9`  
**Closure CI run:** `33219385858`  
**Closure job:** `99010035086`  
**Result:** SUCCESS

## Verification command

The canonical Phase 04 verification entrypoint is:

```text
pnpm verify:phase04
```

It is a fail-fast superset of Phase 04-specific contracts/tests and the complete Phase 03 → Phase 02 → Phase 01 regression chain. The GitHub workflow also applies the local D1 migration before the gate and smoke-tests the built vinext Worker afterward.

## Final implementation run evidence

Run `33199332188` / job `98944559520` completed successfully from source SHA `5073c3c97667775adc13708ca5507eb809895ebf`.

Observed evidence from that run:

- local D1 migration: **9 commands executed successfully**;
- dependency-free Phase 04/foundation contracts: **28/28 passed**;
- web unit tests: **14/14 passed** across 5 files;
- Cloudflare D1/auth/state tests: **7/7 passed** across 4 files;
- web lint: **0 errors** in the Phase 04 gate;
- web typecheck: **passed**, including generated Worker types and Cloudflare test TypeScript;
- Phase 04/03 browser suite: all **17 scenarios completed successfully**, reported by Playwright as 16 passed plus 1 transient flaky scenario that passed on retry;
- the critical guest flow — local guest save → account creation → guest claim → authenticated workspace visibility → load → delete — **passed normally**;
- Next.js 16.2.9 production build: **passed**;
- `vinext check`: **90% compatible, 0 issues**, with 2 documented partial-support notes;
- `vinext build`: **passed**;
- inherited Phase 03 verification: **passed**;
- inherited Phase 02 verification: **passed**;
- inherited Phase 01 verification: **passed**;
- engine tests in inherited gate: **29/29 passed**;
- rules tests in inherited gate: **9/9 passed**;
- catalog tests in inherited gate: **2/2 passed**;
- final built Worker HTTP smoke, including localized/auth/state routes: **passed**;
- overall GitHub Actions job conclusion: **SUCCESS**.

## Closure verification evidence

The Phase 04 closure/handoff implementation was verified separately from product implementation.

Run `33219385858` / job `99010035086` completed successfully from closure source SHA `326c93de56c83e64d26ef065268707e6e9cc94f9` after the closure artifacts and artifact-trigger isolation were in place.

That run verified the complete Phase 04 gate and built Worker smoke on the closure tree, including:

- updated Phase 04 `BASELINE.md`;
- updated Phase 04 → Phase 05 `PHASE_HANDOFF.md` without inventing a Phase 05 title/scope;
- updated `PHASE_CHAT_TEMPLATE.md` pointing to the Phase 04 portable baseline and canonical Phase Workflow requirement;
- this Phase 04 verification record;
- removal of the temporary Phase 04 lockfile-refresh workflow;
- the Phase 04 canonical baseline workflow;
- a post-merge artifact trigger limited to Phase 04-specific closure files so later phase handoffs cannot accidentally rerun the Phase 04 artifact workflow;
- the full inherited product/runtime regression chain.

This verification-record update is documentation-only. The resulting PR head receives one additional fresh full Phase 04 CI run before merge; that final-head run is merge evidence in PR #7 and does not require another documentation mutation, avoiding an evidence-update loop.

## TDD and debugging evidence

Phase 04 used source-contract and integration RED→GREEN cycles throughout implementation. Important verified regressions include:

1. **Persistence/auth contract skeleton** — initial contracts failed because Phase 04 artifacts were absent, then became green as D1/auth/API boundaries were implemented.
2. **Local draft persistence** — contracts required namespaced schema-versioned browser storage, explicit Save/Load/Delete integration on all three calculators, and no auth-token browser storage.
3. **Guest claim/workspace** — browser/source tests required post-auth claim, retry semantics, three-calculator workspace summary, keyboard operation, and narrow viewport behavior.
4. **React 19 hydration** — lint rejected synchronous state restoration in effects; calculator draft hydration was refactored to hydration-safe client readiness/snapshot behavior without overwriting stored drafts.
5. **Cloudflare Vitest aliasing** — Cloudflare tests initially could not resolve `@/`; the Cloudflare test config received the appropriate alias instead of rewriting production imports.
6. **D1 migration test fixture** — migration production SQL was valid under Wrangler; the test fixture was corrected to execute complete prepared statements through D1 batch rather than misusing multiline `D1.exec`.
7. **Browser runtime D1 503** — diagnostics first isolated failure to repository access. The decisive root cause was that vinext inherited the canonical Next `turbopack.resolveAlias` for `cloudflare:workers`, causing the Node-only build stub to leak into workerd. A regression contract now requires vinext to override the root Next config so native Worker bindings are used.
8. **Build-artifact contamination** — running canonical Next and vinext builds before inherited gates left incompatible `.next` generated types. Phase 04 now clears `apps/web/.next` before the inherited Phase 03 gate; a contract fixes this ordering.
9. **Closure continuity** — closure PR RED run `33218860432` / job `99008461132` intentionally failed at the dependency-free contract layer because `docs/verification/phase-04-verification.md` and `.github/workflows/phase-04-baseline-artifact.yml` did not yet exist. This proves the closure contract detects missing canonical handoff artifacts before GREEN implementation.
10. **Artifact trigger isolation** — RED run `33219253308` / job `99009668445` passed **29/30** contracts and failed only because the Phase 04 artifact workflow listened to generic `BASELINE.md` / handoff / chat-template paths. The workflow trigger was narrowed to Phase 04-specific closure files, and run `33219385858` then passed the full gate.

## Security, privacy, and architecture review

Source and behavior review verified:

- no server route duplicates discount, business-margin, scenario, synthetic-rule, rate, or recommendation arithmetic;
- persistence validation only validates canonical state shape/syntax/version and does not become formula truth;
- `@found-calc/engine` remains free of auth, persistence, Worker binding, locale, React, and network concerns;
- `@found-calc/rules` remains the effective-date/version resolver;
- no raw calculator input logging was added;
- no Better Auth/session token is written to localStorage;
- guest ownership uses an opaque HttpOnly first-party cookie and no fingerprinting;
- no committed production credential/secret exists; CI uses an explicit non-production test value;
- stable API errors do not expose SQL/internal exception detail;
- failed persisted load does not overwrite local in-progress input;
- failed guest claim does not roll back a successful authentication session;
- no Xendit/billing, remote D1 provisioning, production rule packs, Projects/history, analytics, AI, OAuth, email delivery, or other Phase 05+ implementation was pulled forward.

## Runtime/build notes

### Next build vs vinext/workerd

Canonical `next build` uses a non-executing local alias for `cloudflare:workers` because Node build-time evaluation does not have Worker bindings. vinext explicitly supplies its own `nextConfig` so this alias does not propagate into Vite/workerd. Regression coverage enforces that isolation.

### D1 identity

The local D1 configuration uses the inherited all-zero UUID and one consistent local identity for Wrangler/Vite. It is local/test-only and is not a remote production database.

### Known warnings

- Cloudflare Vitest may emit a pre-build warning that it cannot statically analyze the generated vinext entry. Cloudflare runtime tests still pass.
- `vinext check` reports partial support for `next/font/google` (CDN loaded by vinext) and the documented App Router `reactStrictMode` behavior; it reports **0 issues** overall.
- inherited lint can show two warnings in generated `worker-configuration.d.ts` for unused eslint-disable directives; these are generated Worker types and are not source errors.
- GitHub runner output can warn that actions implemented on Node 20 are being forced onto Node 24. The project job explicitly configures Node 22.
- the signed-out 390px workspace test encountered a transient vinext `Network connection lost` on its first attempt in run `33199332188` and passed on retry. The critical persistence/claim test passed without that retry.

## Canonical closure and artifact gate

The closure implementation is verified by run `33219385858` / job `99010035086`. Before merge, the documentation-updated final PR head must also have a fresh green `Phase 04 Verification` run and zero unresolved review threads.

After the closure PR is merged to `main`, `.github/workflows/phase-04-baseline-artifact.yml` packages the exact merge `GITHUB_SHA` as:

`found-calc-phase-04-persistence-auth-guest-preservation.zip`

The workflow also writes `SHA256SUMS`, extracts the archive, checks required Phase 04 source/config/test/docs files, rejects generated/dependency directories, confirms the temporary lockfile workflow is absent, records the exact source commit/tree in `ARTIFACT_VERIFICATION.txt`, and uploads the canonical baseline artifact.
