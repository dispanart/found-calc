# Found Calc Phase 03 — Product UI Runtime & Discovery

**Project:** Found Calc  
**Phase state:** COMPLETE  
**Last canonical completed phase:** Phase 03 — Product UI Runtime & Discovery  
**Next phase:** Phase 04 — Persistence, Auth & Guest Preservation  
**Completion date:** 2026-08-28

## Canonical artifact

`found-calc-phase-03-product-ui-runtime-discovery.zip`

The canonical portable ZIP is produced from the verified merged Phase 03 source tree by the post-merge baseline-artifact workflow, together with `SHA256SUMS` and extraction verification. GitHub `main` remains the collaborative canonical repository; the ZIP is the portable recovery/handoff copy for the next phase chat.

## Completed deliverables

Phase 03 activates the public product UI runtime without changing Phase 02 deterministic truth boundaries:

- `@found-calc/catalog` is now a formal workspace package containing exactly three Phase 03 reference calculator entries with stable IDs/slugs, ID/EN copy, category/discovery metadata, trust copy, and related-calculator relationships;
- locale-aware presentation parsing and formatting converts ID/EN user input to canonical decimal strings while leaving calculation truth in `@found-calc/engine`;
- a client-side runtime adapter delegates discount and business-margin calculations to `@found-calc/engine` and resolves the synthetic reference rule through `@found-calc/rules` before invoking the engine;
- localized calculator discovery is available at `/{locale}/calculators`, with public-home discovery and canonical calculator routes at `/{locale}/calculators/{slug}`;
- locale switching preserves the current calculator slug and remains compatible with Next.js typed routes;
- source-owned accessible calculator primitives provide stable labels/IDs, helper/error associations, validation summaries, trust messaging, and polite result status regions;
- stacked discount UI supports ordered discount steps, add/remove controls, localized values, sequential deterministic results, savings, and effective combined discount;
- business-margin UI progresses from gross result to contextual contribution metrics and an engine-backed baseline/scenario/impact comparison, with synthetic recommendation content explicitly framed as demo/reference only;
- synthetic rule reference UI requires an explicit effective date, shows a prominent synthetic-fixture warning, maps rule/date failures accessibly, and exposes resolved version/effective-period/source provenance;
- keyboard interaction, field error association, ID/EN discovery, calculator flows, narrow-viewport overflow, Next production build, vinext compatibility/build, and built Worker routes are all covered by the Phase 03 verification gate;
- `verify:phase03` is a fail-fast superset of Phase 03 contracts plus the complete Phase 02 and Phase 01 regression gates.

## Verification status

Detailed evidence is recorded in `docs/verification/phase-03-verification.md`.

The verified pre-handoff implementation snapshot is:

- source SHA: `73413b5f6f55f957532af595cdc811c2990b440f`;
- GitHub Actions run: `33175892187`;
- job: `98864278561`;
- result: **SUCCESS**.

That run includes 17/17 dependency-free Phase 03 contracts, 2/2 catalog tests, 8/8 web unit tests, 29/29 engine tests, 9/9 rules tests, 1/1 Cloudflare D1 runtime test, 14/14 Playwright tests, Next.js 16.2.9 production build, `vinext check`, `vinext build`, and built Worker HTTP smoke for locale/discovery/reference-calculator routes. Continuity documentation must receive a fresh green Phase 03 run before merge.

## Stable architecture boundaries

### Engine truth

`@found-calc/engine` remains the only owner of deterministic formula truth. UI code must not reproduce formula arithmetic, use binary floating-point as calculation truth, resolve rules, persist inputs, or perform network I/O for calculations.

### Rule truth

`@found-calc/rules` remains outside the engine and resolves immutable effective-date/version dependencies. The synthetic Phase 03 UI passes an explicit effective date to the runtime adapter; no current-date fallback is allowed.

### Catalog ownership

`@found-calc/catalog` owns reference discovery metadata, stable slugs/IDs, localized product copy, trust copy, and related-calculator relationships. It does not own calculation formulas, persistence, auth, billing, or production regulatory data.

### Presentation/runtime ownership

`apps/web` owns localized input normalization, localized output formatting, calculator-specific forms/results, accessible interaction, discovery/navigation, and trust/provenance presentation. Calculation execution remains local and deterministic for these reference slices.

### Shared UI boundary

Calculator primitives remain source-owned in `apps/web` until reuse across multiple product surfaces is proven. Phase 03 does not promote these primitives into `@found-calc/ui` merely for abstraction.

## Phase 03 reference catalog

The public reference catalog intentionally contains exactly three entries:

1. `reference.discount` → `/calculators/discount`
2. `reference.business-margin` → `/calculators/business-margin`
3. `reference.synthetic-rule` → `/calculators/synthetic-rule-reference`

The synthetic calculator and synthetic business-margin recommendation threshold remain contract/demo fixtures, not authoritative advice or production rule data.

## Accessibility, trust, and privacy contract

- launch locales remain Indonesian (`id`) and English (`en`);
- field errors are associated with their controls using `aria-invalid`/`aria-describedby`;
- result updates use a polite status region rather than noisy per-keystroke calculation;
- explicit calculate/scenario actions are keyboard operable;
- narrow 390px Phase 03 reference surfaces are verified without horizontal overflow;
- synthetic rule provenance and non-production warning remain visible;
- Phase 03 introduces no account persistence, browser persistence, calculation API, telemetry, or raw-input network transmission;
- source review found no new `fetch` or `localStorage` path in the Phase 03 diff.

## Known limitations

- `apps/web/wrangler.jsonc` still uses the inherited all-zero local-only D1 UUID; no remote database/deployment/DNS/credential mutation was performed.
- `vinext check` remains **88% compatible with 0 issues**. Partial-support notes are unchanged: `next/font/google` is CDN-loaded by vinext rather than self-hosted at build time, and `reactStrictMode` has the documented App Router compatibility caveat.
- Cloudflare Vitest can warn before a vinext build that it cannot statically analyze the generated vinext Worker entry; the D1 runtime test passes and the final built Worker smoke passes.
- GitHub-hosted CI may report a slow filesystem during `next dev`; this did not fail the browser suite.
- the Phase 03 calculator catalog is a reference proof, not a production-scale discovery/SEO catalog.
- no Better Auth, account/session behavior, durable guest state, Drizzle product persistence, Xendit/payment integration, production regulatory packs, Admin publishing, Goals/Projects, analytics, AI explanations, or remote Cloudflare deployment is included.

## Continuity rule

Start **Phase 04 — Persistence, Auth & Guest Preservation** in a **new chat inside the same Found Calc project** and attach `found-calc-phase-03-product-ui-runtime-discovery.zip`. Read `PHASE_HANDOFF.md` and `docs/verification/phase-03-verification.md` before implementation. Treat Phase 01–03 architecture and deterministic/product-runtime boundaries as approved baseline; reopen them only for a verified implementation blocker under change control.
