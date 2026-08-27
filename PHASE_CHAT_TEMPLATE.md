# Found Calc — New Phase Chat Template

Copy this as the first message in every new phase chat:

```text
@Superpowers

Continue Found Calc from the attached latest baseline ZIP.

Before implementation:
1. Read BASELINE.md / BASELINE-v2.md.
2. Read PHASE_HANDOFF.md.
3. Read the Master Product & Architecture Design Spec.
4. Read the Tech Stack ADR.
5. Read the Design System Decision and accessibility contract.
6. Read the phase workflow and phase-specific plan.
7. Use Context7 for current library/framework documentation.
8. Use the Cloudflare skill/current Cloudflare docs for Cloudflare-specific implementation.
9. Use design-taste-frontend only within its approved Found Calc scope.

Execute: Phase <N> — <PHASE NAME>.

Constraints:
- Do not reopen approved architecture without a real implementation blocker.
- Testing happens during the phase, not only at the end.
- Preserve deterministic engine truth and versioned rule behavior.
- Never expose secrets or include them in artifacts.
- Preserve ID/EN, accessibility, privacy, trust, and guest-context requirements.
- Keep fixed infrastructure target at Rp0 excluding domain and payment transaction fees.

At completion produce:
- updated BASELINE;
- updated PHASE_HANDOFF.md;
- updated SHA256SUMS;
- complete source/config/tests/docs;
- found-calc-phase-<NN>-<name>.zip.
```
