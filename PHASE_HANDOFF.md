# Found Calc — Phase Handoff

**Project:** Found Calc  
**Last canonical completed phase:** Phase 07A — Commercial, Trial & Google Auth Amendment  
**Current status:** COMPLETE after merge + artifact verification  
**Next phase:** Phase 07B — Widget Platform Foundation

## Canonical starting artifact

Start the next phase from:

`found-calc-phase-07a-commercial-auth-amendment.zip`

The artifact is produced from the exact merged `main` SHA by `.github/workflows/phase-07a-baseline-artifact.yml`, with `SHA256SUMS` and `ARTIFACT_VERIFICATION.txt` recording integrity, extraction, source commit/tree, and archive provenance.

Historical predecessor continuity remains explicit: Phase 07A started from canonical Phase 07 SHA `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4` and `found-calc-phase-07-billing-entitlements-xendit.zip`.

## Required reading order for Phase 07B

1. `BASELINE.md`
2. `PHASE_HANDOFF.md`
3. `docs/verification/phase-07a-verification.md`
4. `docs/verification/phase-07-verification.md`
5. `docs/superpowers/specs/2026-08-30-found-calc-phase-07a-commercial-trial-google-auth-design.md`
6. `docs/superpowers/plans/2026-08-30-found-calc-phase-07a-commercial-trial-google-auth-implementation-plan.md`
7. approved Master Product & Architecture Design Spec
8. Tech Stack ADR
9. Design System Decision / accessibility-responsive contract
10. canonical Phase Workflow and the exact approved Phase 07B acceptance criteria/exclusions

## Starter prompt for the new Phase 07B chat

```text
@Superpowers @GitHub @Context7

Start Found Calc Phase 07B — Widget Platform Foundation from the attached canonical `found-calc-phase-07a-commercial-auth-amendment.zip`.

Before implementation:
1. Read BASELINE.md and PHASE_HANDOFF.md.
2. Read docs/verification/phase-07a-verification.md plus the approved Phase 07A design/plan.
3. Preserve Phase 01–07A deterministic engine, rule/version, guest/auth persistence, workspace, billing/entitlement, trial, cancellation paid-through, and Google/guest-claim contracts.
4. Confirm the exact bounded Phase 07B Widget Platform Foundation acceptance criteria before planning. Do not pull Phase 08 catalog production forward.
5. Keep Friends / Besties / Family entitlement coordinates authoritative: Friends 1 verified domain + mandatory Powered by Found Calc; Besties up to 3 domains + attribution removal/customization/standard analytics; Family 10+ domains + white-label/advanced analytics/events.
6. Treat entitlement and runtime availability as separate concepts. Build only the approved Widget Platform runtime foundation; do not fabricate Portfolio or later-phase capabilities.
7. Use Context7/current framework docs and current Cloudflare Workers documentation for implementation-sensitive behavior.
8. Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
9. Preserve ID/EN, accessibility, privacy/trust, mobile responsiveness, and Rp0 fixed-infrastructure target excluding domain/payment transaction fees.
10. Keep migrations 0001–0005 immutable; use additive change control for any new persistence requirements.
```

## Stable Phase 07A contracts to preserve

- Public tier names: Friends, Besties, Family. Internal/provider historical identities remain `pro-*` / `business-*` and must not be globally renamed.
- Current checkout prices: Besties Rp24.900/month or Rp199.000/year; Family Rp59.000/month or Rp499.000/year.
- Friends: 5 Saved Calculations, 30-day History, 1 active Goal, 1 active Project; over-limit historical data remains readable.
- Besties trial: manual opt-in, exactly 14×24h server-authoritative, once/account, no card/Xendit, no restart, historical paid users ineligible.
- Effective access precedence: Family paid > Besties paid > active Besties trial > Friends.
- Cancellation stops renewal while paid entitlement can remain valid through authoritative `paid_through_at`; cancellation never deletes data or automatically refunds.
- Google sign-in remains Better Auth-managed with server-only credentials, safe same-origin localized return targets, default account-linking behavior, and guest claim before final navigation.
- First-party D1 remains entitlement authority; ordinary capability/status reads do not call Xendit.
- Widget/Portfolio entitlement language must not be confused with runtime availability.

## Phase 07B scope guard

Phase 07B is **Widget Platform Foundation** only. Phase 08 — Frozen V1 Catalog Production remains deferred. Do not start Phase 08 implementation in the Phase 07B chat unless an explicit later product decision changes the sequence under change control.

## Change control

If Phase 07B conflicts with approved Phase 01–07A contracts, capture reproducible evidence, identify the smallest compatible amendment, and obtain approval before changing an approved truth, persistence, security, authentication, billing, entitlement, or data-retention boundary.
