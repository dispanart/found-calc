# Found Calc — Phase Handoff

**Project:** Found Calc  
Last canonical completed phase is **Phase 07 — Billing, Entitlements & Xendit**  
**Current status:** COMPLETE  
**Next phase:** **Phase 08 — Frozen V1 Catalog Production**

## Rule: one phase = one new chat

Start Phase 08 in a **new chat inside the same Found Calc project** and attach:

`found-calc-phase-07-billing-entitlements-xendit.zip`

Use the exact post-merge artifact produced from `main`. The artifact workflow archives the merged `GITHUB_SHA`, writes `SHA256SUMS`, verifies extraction and required files, and records commit/tree identity in `ARTIFACT_VERIFICATION.txt`.

Historical predecessor continuity: Phase 07 started from `found-calc-phase-06-goals-projects-profiles-workspace.zip`.

## Required reading order for Phase 08

1. `BASELINE.md`
2. `PHASE_HANDOFF.md`
3. `docs/verification/phase-07-verification.md`
4. `docs/superpowers/specs/2026-08-29-found-calc-phase-07-billing-entitlements-xendit-design.md`
5. `docs/superpowers/plans/2026-08-29-found-calc-phase-07-billing-entitlements-xendit.md`
6. approved Master Product & Architecture Design Spec
7. Tech Stack ADR
8. Design System Decision / component requirements
9. Accessibility & Responsive Contract
10. canonical Phase Workflow and exact approved Phase 08 acceptance criteria/exclusions

## Starter prompt for the new Phase 08 chat

```text
@Superpowers @GitHub @Context7

Start Found Calc Phase 08 — Frozen V1 Catalog Production from the attached canonical `found-calc-phase-07-billing-entitlements-xendit.zip`.

Before implementation:
1. Read BASELINE.md and PHASE_HANDOFF.md.
2. Read docs/verification/phase-07-verification.md and the approved Phase 07 design/plan.
3. Read the approved architecture, Tech Stack ADR, design-system/accessibility contracts, and canonical Phase Workflow.
4. Confirm the exact frozen V1 catalog and Phase 08A–08M acceptance criteria before planning; do not pull Phase 09+ scope forward.
5. Treat Phase 01–07 architecture and regression boundaries as approved baseline; reopen them only for a verified blocker under change control.
6. Preserve deterministic engine truth, immutable rule/version semantics, guest/auth persistence, workspace domains, and billing/entitlement authority boundaries.
7. Preserve webhook-authoritative entitlements: browser checkout return never grants paid capability.
8. Use Context7 and current Cloudflare documentation for framework/runtime behavior; use authoritative domain sources for calculators that require regulated or time-sensitive rules.
9. Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
10. Preserve ID/EN, calculator-specific UX, mobile/accessibility, trust/source metadata, privacy, and the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.

Implement Phase 08 in the approved 08A–08M batches. Each calculator must pass its approved Spec → Formula → Fixtures → Inputs → Results → Guidance → Scenario → Recommendation → Source → ID/EN → UI → Mobile → Accessibility → Analytics → Admin QA path. Do not replace calculator-specific UX with a generic formula form.
```

## Stable Phase 07 contracts to preserve

- `@found-calc/engine` remains the only calculator arithmetic truth layer.
- First-party D1 billing state is authorization/entitlement truth; Xendit is the payment/subscription processor.
- Free calculators remain usable without a retroactive paywall.
- Approved V1 commercial coordinates are Free Rp0; Pro Rp25.000/month or Rp250.000/year; Business Rp75.000/month or Rp750.000/year.
- Paid access is capability-based rather than scattered plan-name checks.
- Webhooks are authoritative for entitlement transitions; checkout return URLs are informational only.
- Duplicate, stale, delayed, retry, failed-payment, cancellation, upgrade, and downgrade flows preserve idempotent/ordered first-party state.
- Billing status/entitlement reads do not query Xendit.
- Provider credentials, webhook tokens, raw cookies, and production secrets never enter browser state, source, diagnostic output, or portable artifacts.
- The built vinext Worker has a deterministic smoke gate covering Worker startup, D1 migrations, anonymous billing authorization, webhook-token rejection, Better Auth signup/cookie flow, and authenticated billing status.

## Phase 08 scope guard

The approved successor is **Phase 08 — Frozen V1 Catalog Production**. The frozen catalog is divided into 08A Quick, 08B Finance & Salary, 08C Indonesia Regulatory, 08D Business, 08E Seller/Marketplace, 08F Creator/Affiliate, 08G Freelancer/Agency, 08H Family/Education, 08I Home/Vehicle/Life, 08J Goals, 08K Health/Nutrition, 08L Sport, and 08M Religion/Fiqh.

Reuse mathematical primitives where appropriate, but do not mass-produce generic user experiences. Production analytics/SEO/security/cost hardening beyond what each calculator requires remains Phase 09 scope; launch certification/TestSprite remains Phase 10 scope.

## Change control

If Phase 08 conflicts with approved Phase 01–07 contracts, capture reproducible evidence, identify the smallest compatible amendment, and obtain approval before changing an approved architecture, truth, persistence, security, or entitlement boundary.
