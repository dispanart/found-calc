# Found Calc — New Phase Chat Template

Copy this as the first message in every new phase chat. The latest completed portable baseline is currently Phase 04: `found-calc-phase-04-persistence-auth-guest-preservation.zip`.

```text
@Superpowers @GitHub @Context7

Continue Found Calc from the attached latest canonical baseline ZIP.

Before implementation:
1. Read BASELINE.md.
2. Read PHASE_HANDOFF.md.
3. Read the latest phase verification record and approved phase spec/plan.
4. Read the approved Master Product & Architecture Design Spec.
5. Read the Tech Stack ADR.
6. Read the Design System Decision and accessibility/responsive contract.
7. Read the canonical Phase Workflow and resolve the exact next-phase title/scope before implementation.
8. Use Context7 for current library/framework documentation.
9. Use the Cloudflare skill/current Cloudflare docs for Cloudflare-specific implementation.
10. When frontend design work is in scope, use the approved Leonxlnx/taste-skill source only within its Found Calc scope; accessibility/trust/product constraints override aesthetic defaults.

Execute: Phase <N> — <PHASE NAME FROM CANONICAL PHASE WORKFLOW>.

Constraints:
- One phase = one new chat inside the same Found Calc project.
- Do not invent the next phase title/scope when the canonical Phase Workflow is unavailable; request/provide that source before planning.
- Do not reopen approved architecture without a verified implementation blocker under change control.
- Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
- Testing happens during the phase, not only at the end.
- Preserve deterministic engine truth, immutable/versioned rule behavior, and established package dependency direction.
- Keep locale presentation, catalog metadata, UI/runtime concerns, persistence/auth concerns, and deterministic engine truth in their approved boundaries.
- Reference calculations remain local unless a later approved phase explicitly changes that architecture under change control.
- Never expose secrets or include production credentials in artifacts.
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

The next phase number after the Phase 04 baseline is **Phase 05**.

Its exact approved title and scope are intentionally **not inferred here** because the canonical Phase Workflow is the source of truth and is not checked into the current repository. Use `PHASE_HANDOFF.md` plus the canonical Phase Workflow to resolve Phase 05 before creating its design/implementation plan.
