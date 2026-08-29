# Found Calc — New Phase Chat Template

Copy this as the first message in every new phase chat. The latest completed portable baseline is currently Phase 06: `found-calc-phase-06-goals-projects-profiles-workspace.zip`.

```text
@Superpowers @GitHub @Context7

Continue Found Calc from the attached latest canonical baseline ZIP.

Before implementation:
1. Read BASELINE.md.
2. Read PHASE_HANDOFF.md.
3. Read the latest phase verification record and approved phase design/plan.
4. Read the approved Master Product & Architecture Design Spec.
5. Read the Tech Stack ADR.
6. Read the Design System Decision and accessibility/responsive contract.
7. Read the canonical Phase Workflow and confirm the exact next-phase acceptance criteria/exclusions before implementation.
8. Use Context7 for current library/framework documentation.
9. Use the Cloudflare skill/current Cloudflare docs for Cloudflare-specific implementation.
10. Use the current official provider documentation for any approved external integration; never infer payment/security contracts from stale knowledge.
11. When frontend design work is in scope, use the approved Leonxlnx/taste-skill source only within its Found Calc scope; accessibility/trust/product constraints override aesthetic defaults.

Execute: Phase <N> — <PHASE NAME FROM CANONICAL PHASE WORKFLOW>.

Constraints:
- One phase = one new chat inside the same Found Calc project.
- Do not reopen approved architecture without a verified implementation blocker under change control.
- Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
- Testing happens during the phase, not only at the end.
- Preserve deterministic engine truth, immutable/versioned rule behavior, and established package dependency direction.
- Keep locale presentation, catalog metadata, UI/runtime concerns, persistence/auth/admin/workspace concerns, rule publication/version semantics, and deterministic engine truth in their approved boundaries.
- Reference calculations remain local unless a later approved phase explicitly changes that architecture under change control.
- Preserve Phase 04 guest/local/auth latest-draft semantics and the separate Phase 06 named Project-history domain unless the approved new phase explicitly migrates them through a compatible boundary.
- Preserve Phase 06 server-derived owner/editor/viewer authorization, private Goals, privacy-safe Project export, and hashed one-time invite semantics.
- Public rule feeds expose published data only; admin and Project authority are rechecked server-side.
- Never expose secrets or include production credentials in source, logs, client storage, or artifacts.
- Preserve ID/EN, accessibility, privacy, trust, and guest-context requirements.
- Keep fixed infrastructure target at Rp0 excluding domain and payment transaction fees.
- Do not pull later-phase scope forward.

At completion produce:
- updated BASELINE.md;
- updated PHASE_HANDOFF.md;
- updated PHASE_CHAT_TEMPLATE.md when continuity instructions change;
- exact verification record with CI/run evidence;
- complete source/config/tests/docs;
- canonical found-calc-phase-<NN>-<name>.zip;
- SHA256SUMS and extraction verification for that ZIP.
```

## Next phase

The next phase after the Phase 06 baseline is:

**Phase 07 — Billing, Entitlements & Xendit**

Start it from the exact post-merge `found-calc-phase-06-goals-projects-profiles-workspace.zip`. Use `PHASE_HANDOFF.md` and the canonical Phase Workflow to confirm Phase 07 acceptance criteria and exclusions before writing its design/implementation plan. The title above is continuity metadata, not permission to invent pricing, entitlement, payment, webhook, production-secret, or Phase 08+ scope beyond the approved Phase 07 contract.
