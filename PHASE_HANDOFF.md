# Found Calc — Phase Handoff

**Project:** Found Calc  
Last canonical completed phase is **Phase 06 — Goals, Projects, Profiles & Workspace**  
**Current status:** COMPLETE  
**Next phase:** **Phase 07 — Billing, Entitlements & Xendit**

## Rule: one phase = one new chat

Start Phase 07 in a **new chat inside the same Found Calc project** and attach:

`found-calc-phase-06-goals-projects-profiles-workspace.zip`

Use the exact post-merge artifact produced from `main`. Its workflow archives the exact merged `GITHUB_SHA`, writes `SHA256SUMS`, verifies extraction/required files, and records commit/tree identity in `ARTIFACT_VERIFICATION.txt`.

Historical predecessor record for regression continuity: immediately before Phase 06, last canonical completed phase is **Phase 05 — Versioned Rule Platform + Admin Core**, and Phase 06 started from `found-calc-phase-05-versioned-rule-platform-admin-core.zip`.

## Required reading order for Phase 07

1. `BASELINE.md`
2. `PHASE_HANDOFF.md`
3. `docs/verification/phase-06-verification.md`
4. `docs/superpowers/specs/2026-08-29-found-calc-phase-06-goals-projects-profiles-workspace-design.md`
5. `docs/superpowers/plans/2026-08-29-found-calc-phase-06-goals-projects-profiles-workspace.md`
6. approved Master Product & Architecture Design Spec
7. Tech Stack ADR
8. Design System Decision / component requirements
9. Accessibility & Responsive Contract
10. canonical Phase Workflow and exact approved Phase 07 acceptance criteria/exclusions

## Starter prompt for the new Phase 07 chat

```text
@Superpowers @GitHub @Context7

Start Found Calc Phase 07 — Billing, Entitlements & Xendit from the attached canonical `found-calc-phase-06-goals-projects-profiles-workspace.zip`.

Before implementation:
1. Read BASELINE.md and PHASE_HANDOFF.md.
2. Read docs/verification/phase-06-verification.md and the approved Phase 06 design/plan.
3. Read the approved architecture, Tech Stack ADR, design-system/accessibility contracts, and canonical Phase Workflow.
4. Confirm exact Phase 07 acceptance criteria and exclusions before planning; do not pull Phase 08+ scope forward.
5. Treat Phase 01–06 architecture and regression boundaries as approved baseline; reopen them only for a verified blocker under change control.
6. Preserve deterministic engine truth, Phase 04 latest-draft semantics, Phase 05 rule semantics, and the separate Phase 06 workspace/Project-history domain.
7. Preserve server-derived authorization, private Goals, privacy-safe exports, and hashed one-time invites.
8. Use Context7 for current framework/library docs, the Cloudflare skill/current Cloudflare docs for Workers, and current official Xendit documentation for Xendit contracts.
9. Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
10. Preserve ID/EN, accessibility, privacy/trust, guest context, and the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.

Create the Phase 07 design/implementation plan first. At completion, produce the next canonical ZIP baseline and updated handoff.
```

## Phase 06 completion evidence

Verified implementation snapshot before continuity closure:

- source SHA: `bb1eb7fc98de5673c271c22e6aa12563e78fc92d`;
- GitHub Actions run: `33242970535`;
- job: `99075355501`;
- result: **SUCCESS**.

That run passed the full Phase 06 verifier and authenticated built-Worker smoke. The closure head must receive a separate fresh green `Phase 06 Verification` run before merge. After merge, the Phase 06 artifact workflow records the exact merged SHA/tree dynamically.

## Stable Phase 06 contracts to preserve

- `@found-calc/engine` owns deterministic formula truth; payment/entitlement code must not become calculator truth.
- `@found-calc/rules` owns version/effective-period/publication semantics.
- Phase 04 latest drafts and Phase 06 named Project history are separate domains.
- Better Auth owns credentials/session behavior; Project roles are derived server-side from session identity plus D1.
- Goals remain private to owners; shared Project/export surfaces do not leak private Goal metadata, emails, or invite secrets.
- Invite codes are random, hashed at rest, expiring, and one-time.
- Public calculators and local deterministic arithmetic remain available according to the approved product baseline unless Phase 07 explicitly gates a separately defined paid capability.
- No server endpoint calculates calculator answers.
- No raw calculator input logging, browser auth-token storage, fingerprinting, or source-committed production secret.

## Phase 07 scope guard

The approved successor is **Phase 07 — Billing, Entitlements & Xendit**. The title alone does not authorize invented pricing, plans, entitlement semantics, webhook behavior, payment methods, credentials, or Phase 08+ work. Derive all such details from the approved Phase Workflow/design process and current official provider documentation.

The Rp0 fixed-infrastructure target remains in force excluding domain and payment transaction fees. Production credentials must never enter source, logs, client storage, or portable artifacts.

## Change control

If Phase 07 conflicts with approved Phase 01–06 contracts, capture reproducible evidence, identify the smallest compatible amendment, and obtain approval before changing an approved architecture or deterministic-truth boundary.
