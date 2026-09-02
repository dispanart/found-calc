# Found Calc Phase 08A — Quick Mathematical Primitives Design

**Project:** Found Calc  
**Phase:** 08A — Quick Mathematical Primitives  
**Canonical predecessor:** Phase 07B — Widget Platform Foundation  
**Base branch:** `main` at Phase 07B closure  
**Implementation branch:** `phase-08a-quick-mathematical-primitives`  
**Design status:** APPROVED by standing user direction on 2026-09-01

## 1. Purpose

Phase 08A is the first production catalog batch. It proves that the existing deterministic engine, catalog/discovery runtime, persistence/workspace path, and Phase 07B shared public/widget renderer can accept real production quick calculators without becoming a generic form generator.

The stable invariant remains:

```text
one deterministic calculator truth
+ one calculator-specific interaction renderer
+ multiple delivery surfaces
```

Phase 08A does **not** reopen Phase 01–07B architecture. It adds calculator truth and product experiences through existing boundaries, with the smallest additive contract extensions required for date/select inputs.

## 2. Frozen Phase 08A inventory

Phase 08A contains exactly these quick mathematical primitives:

1. **Percentage** — new production calculator.
2. **Stacked Discount** — existing `reference.discount` calculator is promoted into the production Quick catalog without changing its stable calculator ID, version history, formula, rounding, persistence identity, or widget identity.
3. **Date Difference** — new production calculator.
4. **Length Conversion** — new production calculator implementing the Phase 08 conversion primitive with a deliberately curated length dimension.

No other Phase 08B–08M calculator is pulled into this phase.

### Stable identities

| Product | Calculator ID | Slug | Version |
|---|---|---|---|
| Percentage | `quick.percentage` | `percentage` | `1.0.0` |
| Stacked Discount | `reference.discount` | `discount` | preserve existing `1.0.0` |
| Date Difference | `quick.date-difference` | `date-difference` | `1.0.0` |
| Length Conversion | `quick.length-conversion` | `length-conversion` | `1.0.0` |

The `reference.discount` identity is intentionally not renamed. Historical saved calculations, workspace records, widget configuration, analytics identity, and calculator-version snapshots must continue to resolve.

## 3. Explicit non-goals

Phase 08A does not implement:

- Finance/Salary, regulatory, business, marketplace, creator, family, health, sport, or fiqh production calculators;
- a generic calculator DSL or formula interpreter;
- a schema-driven universal React form renderer;
- a public headless Calculation API, SDK, CMS plugin, or Web Component;
- arbitrary converter dimensions or user-defined conversion factors;
- calendar scheduling, business-day calculations, age calculation, timezone conversion, or recurring-date rules;
- new billing, auth, workspace, or widget-platform architecture;
- new database migrations unless implementation reveals a verified persistence blocker.

## 4. Calculation truth

### 4.1 Percentage

User question: **What is this percentage of this value?**

Inputs:
- `baseValue`: decimal, required, scale 6;
- `percentage`: decimal, required, scale 4, range `0` through `100000` percent.

Outputs:
- primary: `percentageAmount = baseValue × percentage / 100`;
- `increasedValue = baseValue + percentageAmount`;
- `decreasedValue = baseValue - percentageAmount`.

The calculator does not silently turn into percentage-change or reverse-percentage modes. Those can be separate future calculators if frozen later.

Known-answer fixture:

```text
baseValue = 250
percentage = 12.5
percentageAmount = 31.25
increasedValue = 281.25
decreasedValue = 218.75
```

All arithmetic uses `@found-calc/engine` decimal primitives. No floating-point formula may exist in React.

### 4.2 Stacked Discount

Phase 02 truth remains authoritative:

```text
100000
20%
then 10%
=> 72000
=> effective discount 28%
```

Phase 08A changes discovery/product positioning only where necessary. It does not rewrite the formula, rounding, or stable ID.

### 4.3 Date Difference

User question: **How many calendar days are between two dates?**

Inputs:
- `startDate`: ISO Gregorian date `YYYY-MM-DD`;
- `endDate`: ISO Gregorian date `YYYY-MM-DD`;
- supported year range: `0001` through `9999`;
- `endDate` must be equal to or after `startDate`.

Semantics:
- interval is midnight-to-midnight calendar-day distance;
- `2026-01-01` → `2026-01-02` equals `1` day;
- equal dates equal `0` days;
- no timezone or daylight-saving behavior participates in truth.

Outputs:
- primary: `totalDays`;
- `wholeWeeks = floor(totalDays / 7)`;
- `remainingDays = totalDays mod 7`.

Date validation and day-number conversion live in the engine. React may only collect/format ISO dates.

Known-answer fixtures:

```text
2024-02-28 -> 2024-03-01 = 2 days
2025-02-28 -> 2025-03-01 = 1 day
2026-01-01 -> 2026-01-01 = 0 days
```

### 4.4 Length Conversion

Phase 08A deliberately implements one curated conversion dimension instead of a universal converter.

Input:
- `value`: non-negative decimal, scale 6;
- `fromUnit`: one of `mm`, `cm`, `m`, `km`, `in`, `ft`, `yd`, `mi`;
- `toUnit`: one of the same set.

Exact conversion anchors use integer nanometres per unit:

```text
mm = 1,000,000 nm
cm = 10,000,000 nm
m  = 1,000,000,000 nm
km = 1,000,000,000,000 nm
in = 25,400,000 nm
ft = 304,800,000 nm
yd = 914,400,000 nm
mi = 1,609,344,000,000 nm
```

Output scale is 8 decimal places with half-up rounding through the existing decimal engine.

Known-answer fixtures:

```text
1 in = 2.54 cm
1 mi = 1.609344 km
1 m = 1000 mm
3 ft = 1 yd
```

No browser `Number`/floating-point conversion factors are allowed.

## 5. Engine contract extension

The existing `InputDefinition` supports only decimal inputs. Phase 08A adds the smallest safe discriminated extension:

```ts
type InputDefinition =
  | DecimalInputDefinition
  | DecimalListInputDefinition
  | DateInputDefinition
  | SelectInputDefinition;
```

`date` inputs may define ISO `min`/`max`. `select` inputs declare immutable option IDs. Existing decimal definitions retain their exact semantics.

`CalculationResult.normalizedInputs` already supports strings and string arrays, so it requires no widening for date/select values.

No generic formula execution or runtime reflection is introduced.

## 6. Catalog architecture

Phase 03 reference provenance must stay testable while public discovery expands.

The catalog therefore gains a production-facing aggregate without mutating the historical reference subset:

```text
referenceCatalog    = the original three Phase 03 entries
quickCatalog        = Percentage + promoted Discount + Date Difference + Length Conversion
calculatorCatalog   = complete routable catalog, unique by calculator ID and slug
```

`referenceCatalog` remains exactly three entries for historical Phase 03 contract tests. `calculatorCatalog` is used by current public discovery, static route generation, related calculators, workspace labels, widget preview/embed lookup, and new Phase 08A tests.

A single calculator ID appears only once in `calculatorCatalog`; the promoted Discount entry is shared rather than duplicated.

Catalog entries expose ID/EN copy, trust framing, relation IDs, classification, phase/category metadata, and whether a calculator is widget-safe.

## 7. Interaction design — no universal form

Each calculator gets its own renderer component and focused interaction model.

### Percentage

Two numeric fields are grouped around the natural sentence “X% of Y”. The result surface leads with the percentage amount, then shows “after adding” and “after subtracting”. It does not expose modes/tabs that are not part of the formula.

### Stacked Discount

Existing sequential-discount UX is retained. Phase 08A may polish catalog copy but must preserve add/remove step behavior and effective-discount explanation.

### Date Difference

Two native date controls with explicit Start/End semantics. Result communicates total days first, then an exact weeks-plus-days decomposition. Error copy explains invalid order separately from malformed/missing dates.

### Length Conversion

One value field plus distinct From/To selectors. A swap action exchanges units without changing the numeric input. The primary result visually pairs the converted value with the destination unit; supporting copy states the exact conversion basis where useful.

All renderers use existing Found Calc tokens/components. They must remain usable at 390px, keyboard navigable, screen-reader labelled, and free of horizontal overflow.

## 8. Persistence and workspace

All four Quick calculators support the existing calculate-first flow.

New calculator persisted-state unions are additive. Validation is server/domain enforced exactly as existing calculators are; the client cannot persist arbitrary calculator state.

Local drafts are calculator-specific and remain local-only before authentication.

No migration is needed because persisted calculation payloads and calculator IDs are already stored as bounded serialized application state/text; Phase 08A extends application validators, not the D1 schema.

The Friends 5 Saved Calculations limit and all inherited history/workspace authorization remain unchanged.

## 9. Widget Platform integration

All four Phase 08A calculators are widget-safe.

They become widget-capable only through the existing shared renderer registry and Phase 07B runtime. There is no separate widget calculator implementation.

Safe widget defaults:
- Percentage: `baseValue`, `percentage`;
- Discount: existing `baseAmount`, `discountPercentages`;
- Date Difference: `startDate`, `endDate`;
- Length Conversion: `value`, `fromUnit`, `toUnit`.

Widget-default parsing gains date/select canonicalization while preserving all Phase 07B domain, entitlement, CSP, iframe, messaging, branding, analytics, and privacy boundaries.

Public/widget truth-parity tests are required for all Phase 08A calculators.

## 10. Discovery and localization

Public calculator listing and homepage discovery move from `referenceCatalog` to `calculatorCatalog` while retaining the existing design language.

Every new calculator ships with complete ID/EN title, concise question/description, field labels, result labels, trust title/body, validation/action copy, and related-calculator links.

The Quick category is a real browsing cluster, not four visually identical cards with generic descriptions.

Next.js 16 static generation continues to return locale/slug pairs from the catalog; current Next.js documentation confirms `generateStaticParams()` plus Promise-based `params` remains valid in the App Router.

## 11. Analytics and privacy

Existing widget lifecycle events may report started/completed state for new calculators. They must never include raw calculator input values.

Phase 08A does not add a new analytics vendor or sensitive-value telemetry.

## 12. Testing strategy

TDD is mandatory.

### Engine
- known-answer fixtures for every new formula;
- malformed, scale, boundary, invalid-order, leap-year, same-unit, and unit-rounding cases;
- no `Number` arithmetic for deterministic conversion truth.

### Catalog
- historical `referenceCatalog` remains exactly three entries;
- `quickCatalog` contains exactly the four frozen 08A products;
- `calculatorCatalog` has unique IDs/slugs and resolvable relationships;
- complete ID/EN copy and renderer coverage.

### Persistence
- new state parses only for exact calculator versions and bounded fields;
- invalid dates/select options are rejected;
- inherited payload-size and Friends limits remain green.

### Widget
- new supported IDs/default parsers;
- public/widget calculation truth parity;
- no raw input analytics regression;
- inherited domain/CSP/protocol tests remain green.

### Browser/accessibility
Critical public flows for Percentage, Date Difference, and Length Conversion in ID and EN; keyboard operation; validation focus/announcements; 390px reflow; and widget embed parity for at least one ID and one EN route per new calculator.

## 13. Verification and closure

Add `pnpm verify:phase08a` as a strict superset of `pnpm verify:phase07b`.

Final gate must include at minimum:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:engine
pnpm test:rules
pnpm test:catalog
pnpm verify:phase07b
pnpm verify:phase08a
pnpm build
pnpm --filter @found-calc/web vinext:check
pnpm --filter @found-calc/web build:vinext
```

The Phase 08A GitHub workflow must run the same authoritative gate plus built-Worker smoke where inherited Phase 07B requires it.

Closure requires final code review, fresh exact-head verification, `docs/verification/phase-08a-verification.md`, updated `BASELINE.md`/`PHASE_HANDOFF.md`, canonical `found-calc-phase-08a-quick-mathematical-primitives.zip` with SHA256 and secret/generated-state checks, PR merge only after green checks, and exact merged SHA provenance for Phase 08B.

## 14. Decision rationale

Chosen approach: calculator-specific production slices on shared primitives.

Rejected approaches:
- **One universal schema/form generator:** faster initially but violates the approved non-generic product requirement and hides interaction semantics.
- **All Phase 08A–08M in one branch:** increases review/regression blast radius and conflicts with canonical phase handoff discipline.
- **Rename `reference.discount`:** cleaner branding internally but breaks stable persisted/widget/history identity for no user benefit.
- **Universal unit converter:** broad but shallow; creates a generic utility surface and much larger validation/copy matrix. Curated length conversion proves the conversion primitive cleanly.
- **Date logic through JavaScript local-time arithmetic:** compact but timezone/DST-sensitive. Engine-owned Gregorian day arithmetic is deterministic and portable.
