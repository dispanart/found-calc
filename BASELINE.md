# Found Calc Phase 05 — Versioned Rule Platform + Admin Core

**Project:** Found Calc  
**Phase state:** COMPLETE  
**Last canonical completed phase:** Phase 05 — Versioned Rule Platform + Admin Core  
**Next phase:** Phase 06 — Goals, Projects, Profiles & Workspace  
**Completion date:** 2026-08-29

## Canonical artifact

`found-calc-phase-05-versioned-rule-platform-admin-core.zip`

GitHub `main` remains the collaborative canonical repository. After the Phase 05 pull request is merged, `.github/workflows/phase-05-baseline-artifact.yml` packages the exact merged `GITHUB_SHA` with `git archive`, writes `SHA256SUMS`, verifies extraction and required Phase 05 files, and records the source commit/tree in `ARTIFACT_VERIFICATION.txt`. That exact post-merge ZIP is the portable recovery/handoff source for Phase 06.

## Canonical implementation evidence

The verified Phase 05 implementation snapshot before continuity closure is:

- source SHA: `eb67641aeb47222f44258251c2caea93b6809b7f`;
- GitHub Actions run: `33232447867`;
- job: `99047494137`;
- result: **SUCCESS**.

That run passed `pnpm verify:phase05`, all inherited Phase 04/03/02/01 regressions, Next.js production build, vinext compatibility/build, browser coverage, both D1 migrations, and the final built-Worker rule-route smoke against a fresh isolated persistence state. The closure tree receives a separate fresh full Phase 05 verification before merge; the canonical artifact workflow then records the exact merged source identity dynamically.

## Completed deliverables

Phase 05 adds a narrow, durable rule platform and admin core without moving deterministic calculation truth out of its approved local boundaries:

- D1 now contains versioned rule records with immutable `(rule_id, version_id)` identity and draft/published lifecycle metadata;
- published rule records are immutable, while strict effective-period validation and overlap protection prevent conflicting publication windows;
- checked-in seed data remains synthetic/reference-only (`2025-a` and `2026-a`), not production legal/tax/regulatory guidance;
- `@found-calc/rules` owns version/effective-period/publication semantics and remains independent from persistence/UI/runtime bindings;
- Better Auth admin bootstrap uses `BETTER_AUTH_ADMIN_USER_IDS`; admin authorization is rechecked server-side and no production admin identity is hard-coded;
- the public rule API returns published versions only and excludes draft/audit actor data;
- protected admin APIs provide rule-version list, draft creation, and idempotent publication with stable generic error responses;
- the synthetic reference calculator consumes the first-party published rule feed, while effective-date resolution and arithmetic remain local through `@found-calc/rules` and `@found-calc/engine`;
- `/{locale}/admin` mounts a localized ID/EN rule-management core with explicit synthetic-only trust copy and responsive/accessibility coverage;
- Phase 04 local unsaved drafts, guest ownership/claim, Better Auth sessions, persisted calculator state, and workspace summary remain regression-covered;
- `verify:phase05` is a fail-fast regression superset of Phase 04 → Phase 01 plus Phase 05 rule/storage/API/admin/browser/build verification;
- final built-Worker smoke uses one fresh dedicated D1 `--persist-to` state for both migrations and `wrangler dev`, and migration failures are no longer swallowed.

## Verification status

Detailed evidence is recorded in `docs/verification/phase-05-verification.md`.

The successful implementation run verified:

- Phase 04 migration: 9 commands successfully applied;
- Phase 05 migration: 12 commands successfully applied;
- dependency-free foundation/Phase 05 contracts: 44/44 passed;
- `@found-calc/rules`: 11/11 tests passed;
- web unit tests: 18/18 passed;
- Cloudflare D1/auth/rule tests: 13/13 passed;
- source lint and TypeScript checks passed;
- browser gate passed, including admin localization/narrow viewport and synthetic rule-feed behavior;
- Next.js 16.2.9 build passed;
- `vinext check` reported 90% compatibility and 0 issues;
- `vinext build` passed;
- all inherited Phase 04/03/02/01 gates passed;
- built Worker public rule feed and signed-out admin 401 smoke passed.

## Stable architecture boundaries

### Engine truth

`@found-calc/engine` remains the only owner of deterministic formula truth. D1, admin, auth, routes, UI, locale handling, and rule persistence must not duplicate calculator arithmetic.

### Rule truth

`@found-calc/rules` owns immutable version/effective-date/publication semantics outside the engine. Persistence stores/hydrates rule records; it does not become formula truth.

### Catalog ownership

`@found-calc/catalog` continues to own stable calculator identity, canonical slugs, localized discovery/trust copy, category metadata, and relationships. It does not own formulas, auth, persistence, billing, or authoritative production rule datasets.

### Product runtime

`apps/web` owns localized presentation, first-party API consumption, accessible interaction, auth/admin UI, local unsaved draft preservation, and explicit persistence controls. Reference calculations remain local and deterministic.

### Persistence/auth/admin boundary

D1 stores Better Auth records, canonical calculator drafts, and Phase 05 versioned rule records. Better Auth owns credentials/session behavior. Guest ownership remains opaque and first-party. Admin authority is established and enforced server-side; browser state is never the authorization source of truth.

### Public rule boundary

Public rule responses contain published versions needed by the synthetic reference runtime only. Draft rows, internal database details, and audit actor identifiers are not public API data.

## Accessibility, trust, privacy, and security contract

- launch locales remain Indonesian (`id`) and English (`en`);
- Phase 01–04 accessibility contracts remain regression-covered;
- admin UI is keyboard-operable and covered at a 390 px viewport without horizontal overflow;
- synthetic-only rule data is explicitly labeled so it cannot be mistaken for production guidance;
- no raw calculator input logging, fingerprinting, third-party identifier, or telemetry was introduced;
- no Better Auth/session token is stored in localStorage;
- no production secret, production admin identity, production regulatory dataset, or authoritative legal/tax rate is committed;
- malformed/public/storage errors remain stable and do not expose SQL/internal exception detail.

## Known platform notes

- `apps/web/wrangler.jsonc` still uses the inherited all-zero local-only D1 UUID; it is not a remote production database identity.
- Cloudflare Vitest can emit a pre-build static-analysis warning for the generated vinext entry while the runtime suites pass.
- vinext intentionally receives an explicit `nextConfig` so the Node-only `cloudflare:workers` build stub cannot leak into workerd.
- `vinext check` reports 90% compatibility with 0 issues; partial notes remain `next/font/google` CDN loading and App Router `reactStrictMode` behavior.
- generated Worker types can emit two non-blocking unused eslint-disable warnings during inherited lint; source lint has no errors.
- one inherited signed-out 390 px workspace browser scenario can transiently fail during vinext dev-server network churn and passed on retry in the successful implementation run; the critical guest claim flow passed normally.
- GitHub runner output can warn about Node 20-based action internals being forced onto Node 24 while the project job itself explicitly uses Node 22.

## Explicitly deferred beyond Phase 05

Phase 05 does not authorize or implement:

- production regulatory/tax/legal rule packs;
- Goals, Projects, Profiles, named calculation history, collaboration, sharing, or export workspace expansion;
- Xendit/payment/subscription/entitlement/invoice/webhook flows;
- production analytics/telemetry or SEO hardening;
- AI explanations or AI product features;
- TestSprite launch certification;
- remote D1 creation/migration, production Cloudflare deploy, DNS, or production secret mutation.

## Continuity rule

Start **Phase 06 — Goals, Projects, Profiles & Workspace** in a **new chat inside the same Found Calc project** and attach the exact post-merge `found-calc-phase-05-versioned-rule-platform-admin-core.zip`. Read `PHASE_HANDOFF.md`, this baseline, the Phase 05 verification record/spec/plan, and the canonical Phase Workflow before creating the Phase 06 design/implementation plan. Treat Phase 01–05 architecture and regression boundaries as approved baseline and reopen them only for a verified implementation blocker under change control.
