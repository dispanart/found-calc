# Found Calc Phase 03 Verification Record

**Phase:** Phase 03 — Product UI Runtime & Discovery  
**Repository:** `dispanart/found-calc`  
**Feature branch:** `phase-03-product-ui-runtime-discovery`  
**Pull request:** #4  
**Verified implementation SHA:** `73413b5f6f55f957532af595cdc811c2990b440f`  
**Verification date:** 2026-08-28

## Result

The Phase 03 implementation snapshot above passes the complete Phase 03 verification gate and built vinext Worker route smoke. Phase 03 preserves the Phase 02 deterministic engine/rules boundaries while activating the public reference catalog, localized product runtime, accessible calculator interactions, and provenance/trust presentation.

The continuity-documentation commit that contains this record must receive a fresh successful Phase 03 workflow run before PR #4 is merged.

## Primary GitHub Actions evidence

**Workflow:** `Phase 03 Verification`  
**Run:** `33175892187`  
**Job:** `98864278561`  
**Head SHA:** `73413b5f6f55f957532af595cdc811c2990b440f`  
**Conclusion:** `success`

The workflow performs a frozen-lock install, installs Playwright Chromium, runs `pnpm verify:phase03`, then starts the built vinext Worker through Wrangler and exercises public routes over HTTP.

## Verification gate coverage

### Dependency-free Phase 03 contracts

`node --experimental-strip-types --test apps/web/tests/foundation/*.test.m* tests/foundation/*.test.m*`

Result on the verified snapshot: **17/17 passed**.

These guards cover, among other requirements:

- calculator primitive field/error association and polite live-result semantics;
- discount UI delegation to presentation/runtime truth rather than formula duplication;
- business-margin baseline/scenario delegation and canonical contextual/demo copy;
- Phase 03 reference catalog completeness and exact three-entry scope;
- ID/EN locale/parser presentation boundaries;
- Phase 03 verification as a superset of catalog/web/Phase 02 gates;
- preservation of the Phase 02 engine dependency boundary;
- inherited Phase 01 foundation and Cloudflare contracts.

### Catalog package

- `@found-calc/catalog` TypeScript typecheck: **passed**.
- package Vitest: **2/2 passed**.

The catalog tests assert exactly three stable Phase 03 reference entries with localized ID/EN copy and valid related-calculator references.

### Web unit tests

`@found-calc/web` Vitest: **8/8 passed** across three test files.

Coverage includes:

- launch-locale behavior;
- locale decimal parser/formatter behavior;
- runtime adapter behavior for discount, business margin, and synthetic rule selection;
- synthetic effective-date behavior across 2025/2026 fixtures plus invalid/unavailable date paths.

### Complete Phase 02 regression gate

`verify:phase03` invokes `verify:phase02` without bypassing the earlier verification layers.

- `@found-calc/engine` strict typecheck: **passed**.
- engine Vitest: **29/29 passed**.
- `@found-calc/rules` strict typecheck: **passed**.
- rules Vitest: **9/9 passed**.
- complete Phase 01 regression gate: **passed**.

No engine formula or rule-resolution boundary was relaxed for Phase 03.

### Web lint/type/runtime

- ESLint: **passed**.
- Wrangler environment type generation: **passed**.
- web TypeScript and Cloudflare test TypeScript: **passed**.
- Cloudflare/D1 Vitest: **1/1 passed**.

### Playwright browser verification

Playwright Chromium: **14/14 passed**.

The suite verifies:

1. root redirect to Indonesian launch locale;
2. native Indonesian/English public shells;
3. stable localized workspace/admin routes;
4. narrow public shell usability;
5. discount controls keyboard operation and polite live-result region;
6. field validation association with the relevant control;
7. no horizontal overflow at 390px on `/id/calculators`;
8. no horizontal overflow at 390px on `/en/calculators/discount`;
9. no horizontal overflow at 390px on `/en/calculators/business-margin`;
10. no horizontal overflow at 390px on `/en/calculators/synthetic-rule-reference`;
11. ID/EN discovery of exactly the three Phase 03 calculators;
12. stacked-discount order and localized presentation;
13. business-margin gross → contribution → engine-backed scenario/impact progression;
14. synthetic rule explicit effective date plus resolved provenance.

### Next.js production build

`next build` under Next.js **16.2.9**: **passed**.

Typed-route verification remains enabled. The locale switch uses Next's `Route` type for the non-literal pathname derived from `usePathname`; typed routes were not disabled to silence the compiler.

The production build generated the localized calculator discovery routes and all three calculator slugs in both launch locales.

### vinext / Cloudflare build

`vinext check`: **88% compatible, 6 supported, 2 partial, 0 issues**.

Partial-support notes:

- `next/font/google`: vinext loads fonts from CDN rather than self-hosting at build time;
- `reactStrictMode`: vinext documents an App Router wrapping caveat while Next's App Router defaults strict mode behavior.

`vinext build`: **passed**.

### Built Worker HTTP smoke

The workflow starts the built Worker with:

`pnpm exec wrangler dev --config dist/server/wrangler.json --port 8787`

After readiness, HTTP requests succeeded for:

- `/id`
- `/en`
- `/id/calculators`
- `/en/calculators`
- `/id/calculators/discount`
- `/id/calculators/business-margin`
- `/id/calculators/synthetic-rule-reference`

Two initial readiness probes were refused while Wrangler was still starting; the retry loop then observed readiness and the smoke step concluded successfully.

## TDD and debugging evidence

Phase 03 was implemented against observed RED checkpoints rather than by declaring tests after the fact.

Key checkpoints:

- initial Phase 03 E2E baseline: inherited shell tests passed while the ten new discovery/calculator assertions were RED;
- after discovery/routing: **9/14 E2E passed**, leaving only calculator interactions RED;
- after discount: **12/14 E2E passed**, leaving business-margin and synthetic-rule flows RED;
- business-margin implementation then reduced the intended RED surface to synthetic rule only;
- synthetic-rule UI brought the calculator suite to **14/14**;
- a Next typed-route production-build failure exposed the dynamic locale switch type; Context7 Next.js 16.2.9 documentation was used to retain typed-route safety with `Route`;
- review found business-margin UI references to non-canonical catalog keys. A new dependency-free guard was added first and produced an intentional **16/17** RED run (`33175721033`, job `98863693126`); the product code was then corrected to `contextualHint`, `recommendationTitle`, and `demoNote`, producing the final green run above.

Earlier strict TypeScript and accessibility locator failures were diagnosed before patching. Notable fixes included exact-optional property typing for field helper/error props, a unique accessible name for discount remove controls, and Playwright exact label matching where the baseline and scenario margin labels intentionally share a phrase.

## Context7 documentation used

Current external library behavior was verified through Context7 rather than relying on stale API memory:

- **Playwright** `/microsoft/playwright`: label locator matching/strictness and `exact` behavior for intentionally overlapping accessible labels;
- **Next.js 16.2.9** `/vercel/next.js/v16.2.9`: typed routes, `Route`, `Link` and dynamically computed route strings.

## Cloudflare-specific verification

Cloudflare work followed the existing Workers/vinext foundation and Cloudflare skill guidance. Phase 03 does not create a calculation API or remote persistence path. The existing D1 binding remains a local foundation binding, and the final verification exercises the actual built vinext Worker over HTTP.

## Design/taste pre-flight

The requested `design-taste-frontend` plugin is not installed in the current ChatGPT plugin catalog. The original public source `Leonxlnx/taste-skill` was therefore read directly from GitHub for a **manual source-based pre-flight**, without claiming plugin execution.

The source describes `design-taste-frontend` as an anti-slop frontend skill and states that quiet constraints such as accessibility/regulatory/trust-first contexts override aesthetics. Its trust-first preset biases toward lower design variance/motion and moderate density. Relevant pre-flight criteria include one design system, stable responsive containers/grids, avoiding generic AI-purple/three-equal-card defaults, avoiding `h-screen`, controlled card use, allowed icon families, explicit mobile behavior, and accessibility-first behavior.

Phase 03 passes the relevant Found Calc subset:

- one existing shadcn/Tailwind product language is retained; no second design system is mixed in;
- Space Grotesk and the existing warm neutral/green token system are preserved rather than replaced by generic AI-purple styling;
- public/discovery layout uses `max-w-7xl`, responsive CSS grids, and `min-w-0` containment rather than brittle flex percentage math;
- no `h-screen` hero or ornamental motion system was added; the trust-first surface remains restrained;
- discovery uses structured list rows rather than default three-equal feature cards;
- source-owned buttons/components remain consistent with the established app rather than shipping untouched default component examples;
- mobile overflow checks, keyboard operation, validation association and live-result semantics are independently verified by Playwright;
- trust/provenance and synthetic/demo disclaimers are first-class content rather than decorative metadata.

The source revision read for this pre-flight is `Leonxlnx/taste-skill` `skills/taste-skill/SKILL.md` blob `b72132fcd466da605623ffe96e370b3991fc5285`.

## Code review / diff review

Superpowers `requesting-code-review` guidance was applied. A dedicated subagent dispatcher is not available in this runtime, so review was performed directly against the GitHub PR diff, changed-file set, workflow logs, and review-thread state.

Review facts at the verified snapshot:

- feature branch is ahead of the Phase 02 `main` baseline with no behind divergence;
- no unresolved PR review thread was present during review;
- source diff review found no new `fetch(` or `localStorage` path for reference calculations;
- the verified trust-copy defect in business-margin UI was fixed through RED→GREEN contract testing before completion;
- no architecture change to engine/rules truth was required.

Before merge, PR #4 must again be checked for unresolved threads and the continuity-documentation head must have a fresh successful Phase 03 run.

## Known warnings / limitations

These warnings are recorded rather than silently treated as failures:

- Cloudflare Vitest can emit `[vpw:warn]` that the pre-build vinext `server/app-router-entry` cannot be statically analyzed; the D1 test passes, vinext build passes, and built Worker smoke passes.
- GitHub-hosted CI can report a slow filesystem while running Next development server tests.
- Next production build reports no build cache in the ephemeral Actions runner.
- GitHub Actions reports Node 20 deprecation for `actions/checkout@v4` / `actions/setup-node@v4` internals while the workflow itself configures Node 22.
- `vinext check` remains 88% with the two partial-support notes listed above and **0 issues**.
- `apps/web/wrangler.jsonc` retains the inherited all-zero local-only D1 UUID; no remote Cloudflare deployment/database/DNS/credential operation is part of Phase 03.

## Explicit exclusions

Phase 03 does not implement:

- Better Auth/account/session flows;
- durable guest preservation or persistence schemas;
- production D1 database provisioning/migrations;
- Xendit/payment/billing;
- production regulatory/rule data packs;
- production-scale catalog publishing/SEO administration;
- Admin publishing, Goals/Projects, analytics, or AI explanations;
- remote Cloudflare deployment.

## Portable baseline completion protocol

After PR #4 receives a fresh green documentation-head run and no unresolved review threads:

1. mark the PR ready for review;
2. merge Phase 03 to `main` while preserving the verified history;
3. record the merged implementation commit/tree;
4. create a separate baseline-artifact workflow branch/PR following the Phase 02 precedent;
5. have that workflow check out the exact merged Phase 03 tree, create `found-calc-phase-03-product-ui-runtime-discovery.zip`, generate `SHA256SUMS`, extract the ZIP, verify required Phase 03 files, and emit artifact verification metadata;
6. download and independently check the artifact before using it as the Phase 04 baseline;
7. merge the workflow-only artifact PR after its artifact is proven valid.

The ZIP must exclude Git metadata, installed dependencies, build output, test reports, and secrets because it is created with `git archive` from the canonical merged source tree.
