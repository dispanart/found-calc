# Found Calc Phase 06 Verification

**Project:** Found Calc  
**Phase:** 06 — Goals, Projects, Profiles & Workspace  
**Status:** COMPLETE pending final closure-head CI and merge  
**Verification date:** 2026-08-29

## Canonical implementation evidence

The verified implementation snapshot before continuity closure is:

- source SHA: `bb1eb7fc98de5673c271c22e6aa12563e78fc92d`;
- GitHub Actions run: `33242970535`;
- job: `99075355501`;
- result: **SUCCESS**.

That run completed the full `pnpm verify:phase06` regression gate and the authenticated built-vinext-Worker smoke successfully. It applied the complete Phase 04 → Phase 06 local D1 migration chain, exercised the Phase 06 workspace contracts and Cloudflare/D1 boundaries, ran browser coverage, lint/type checks, Next/vinext compatibility/build checks, all inherited Phase 05 → Phase 01 regressions, and then exercised the built Worker with public rule reads, signed-out authorization checks, Better Auth sign-up/session cookies, profile persistence, and authenticated Project collection access.

The continuity-closure tree receives a separate fresh full `Phase 06 Verification` run before merge. After merge, `.github/workflows/phase-06-baseline-artifact.yml` records the exact merged source commit/tree dynamically in `ARTIFACT_VERIFICATION.txt`.

## Delivered scope

Phase 06 adds the approved durable workspace domain without changing deterministic calculator truth or reinterpreting Phase 04 draft persistence:

- D1-backed user profiles with ID/EN locale preference;
- private Goals owned by the authenticated user;
- Projects with owner/editor/viewer access derived server-side from session plus D1 state;
- separate Project membership and invite records;
- cryptographically random invite codes stored only as SHA-256 hashes and redeemed atomically once before expiry;
- explicit named calculation history attached to Projects while calculator answers remain local/deterministic;
- creator attribution and role-aware calculation mutation rules;
- privacy-safe Project JSON export;
- localized workspace dashboard and Project detail surfaces;
- explicit calculator controls for saving/reopening named Project calculations without replacing Phase 04 latest-draft controls;
- a Phase 06 verification gate that remains a superset of Phase 05 → Phase 01.

## RED → GREEN evidence

### Accessible Project selector naming

The Phase 06 calculator workspace controls originally placed the Project selector heading ID on a wrapper `section` through `aria-labelledby`. Current Playwright accessibility locators consider ARIA labeling relationships when resolving `getByLabel`, so the wrapper and the form control could share the same accessible name and violate strict-locator uniqueness.

A dependency-free regression was added first and the CI evidence showed the expected failure. The production fix then removed the wrapper `aria-labelledby` relationship while preserving the visible heading and the actual form label/select association. The browser gate passed after the fix; no `.first()`, test-id escape hatch, or weakened assertion was used.

### Built Worker Project collection contract

The authenticated Project collection API correctly returns `projects: { owned: [], shared: [] }` for a new account. The built-Worker smoke still expected the pre-Phase-06 shape `projects: []`.

A regression contract was committed first at `36eeb57bb65373e1c7751fd0183a7540b93468d2`. Pull-request run `33242913805`, job `99075198297`, failed exactly at the new contract with 65 passing dependency-free tests and one expected failure. The workflow was then fixed without changing the production API: it parses the JSON response and requires both `projects.owned` and `projects.shared` to be empty arrays. The implementation head `bb1eb7fc98de5673c271c22e6aa12563e78fc92d` subsequently passed both the full verifier and built-Worker smoke in run `33242970535`.

## Architecture and security review

The final Phase 06 review found no material architecture/security blocker within the approved scope:

- `@found-calc/engine` remains the only deterministic formula-truth owner; workspace routes/repositories store validated canonical calculator state and do not calculate answers;
- `@found-calc/rules` remains rule version/effective-period/publication truth;
- Phase 06 migration `0003_phase06_workspace.sql` creates a separate workspace domain and does not reinterpret the Phase 04 `calculator_state` domain;
- authorization is derived from Better Auth session identity plus D1 Project ownership/membership, never from browser-asserted role state;
- Goals remain owner-private and are not included as shared Project metadata or export payloads;
- viewers are read-only; editors receive only explicitly allowed Project calculation writes; ownership-sensitive mutations remain owner-controlled;
- named calculation deletion remains identity/role constrained instead of becoming an unrestricted shared write;
- invite codes are random, hashed before persistence, expire, and are claimed atomically once; reusable plaintext invite secrets are not stored;
- Project export omits account email, invite code/hash, and private Goal metadata;
- no raw calculator input logging, fingerprinting, analytics/telemetry, or third-party identifier was added;
- no Better Auth/session token is stored in localStorage;
- no production secret, production database identity, authoritative regulatory dataset, or production admin identity was committed;
- server/storage errors remain generic rather than exposing SQL/internal exception details;
- no Phase 07 billing, entitlement, Xendit, invoice, webhook, or subscription surface was pulled into Phase 06.

## Verification boundary

The final merge gate is `.github/workflows/phase-06-verification.yml`. It owns main pull-request verification for the open Phase 06 branch and performs:

1. dependency installation and Chromium setup;
2. clean local D1 migration application for Phase 04, Phase 05, and Phase 06;
3. `pnpm verify:phase06`;
4. authenticated built-Worker smoke against a separate isolated D1 persistence directory.

`verify:phase06` is fail-fast and includes Phase 06 foundation/contracts, Cloudflare tests, E2E coverage, lint/type checks, Next/vinext checks/builds, and the inherited Phase 05 → Phase 01 regression chain.

## Canonical artifact contract

After the pull request is merged, `.github/workflows/phase-06-baseline-artifact.yml` must:

- run from the exact merged `GITHUB_SHA`;
- create `found-calc-phase-06-goals-projects-profiles-workspace.zip` using `git archive`;
- write `SHA256SUMS`;
- extract the archive into a clean verification directory;
- verify required Phase 06 source/config/test/docs files exist;
- reject generated/dependency directory leakage;
- record the source commit/tree, archive tree, checksum, required-file count, and extraction result in `ARTIFACT_VERIFICATION.txt`;
- upload the ZIP plus verification metadata as the portable Phase 07 handoff artifact.

The artifact workflow trigger intentionally excludes `BASELINE.md`, `PHASE_HANDOFF.md`, and `PHASE_CHAT_TEMPLATE.md` so later-phase continuity edits cannot regenerate a historical Phase 06 artifact from a successor tree.

## Known non-blocking platform notes

- `apps/web/wrangler.jsonc` continues to use the inherited all-zero local-only D1 UUID; it is not a production database identity.
- Cloudflare/Vitest can emit inherited generated-entry static-analysis warnings while runtime suites pass.
- generated Worker types can emit inherited non-blocking lint-disable warnings.
- current GitHub-hosted runners can warn about action internals moving from Node 20 to Node 24 while this project workflow explicitly selects Node 22.
- vinext compatibility notes inherited from earlier phases remain platform notes rather than Phase 06 blockers.

## Explicitly deferred

Phase 06 does not authorize or implement:

- billing, paid entitlements, subscriptions, invoices, payment webhooks, or Xendit integration;
- production regulatory/tax/legal rule packs;
- production analytics/telemetry or SEO launch hardening;
- AI explanations or AI product features;
- TestSprite launch certification;
- remote D1 creation/migration, production Cloudflare deployment, DNS, or production secret mutation.

The approved successor is **Phase 07 — Billing, Entitlements & Xendit** and must start from the exact post-merge Phase 06 canonical artifact in a new chat inside the same Found Calc project.
