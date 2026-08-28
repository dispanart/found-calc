# Found Calc — New Phase Chat Template

Copy this as the first message in every new phase chat. The latest completed portable baseline is currently Phase 03: `found-calc-phase-03-product-ui-runtime-discovery.zip`.

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
7. Read the Phase Workflow and resolve the exact next-phase scope before implementation.
8. Use Context7 for current library/framework documentation.
9. Use the Cloudflare skill/current Cloudflare docs for Cloudflare-specific implementation.
10. When frontend design work is in scope, use the approved Leonxlnx/taste-skill source only within its Found Calc scope; accessibility/trust/product constraints override aesthetic defaults.

Execute: Phase <N> — <PHASE NAME>.

Constraints:
- One phase = one new chat inside the same Found Calc project.
- Do not reopen approved architecture without a verified implementation blocker under change control.
- Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
- Testing happens during the phase, not only at the end.
- Preserve deterministic engine truth, immutable/versioned rule behavior, and established package dependency direction.
- Keep locale presentation, catalog metadata, UI/runtime concerns, persistence/auth concerns, and deterministic engine truth in their approved boundaries.
- Never expose secrets or include them in artifacts.
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

## Next known phase

The next approved phase after the Phase 03 baseline is:

**Phase 04 — Persistence, Auth & Guest Preservation**

Use `PHASE_HANDOFF.md` from the Phase 03 ZIP for the exact starter prompt and required reading order. Do not infer Phase 04 implementation details from the title alone; resolve them from the canonical Phase Workflow/specification before planning.
