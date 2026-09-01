# Found Calc Phase 07B — Widget Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement one reusable, secure, entitlement-aware hosted-iframe Widget Platform Foundation that runs the existing Discount, Business Margin/Profit, and synthetic rule-aware calculators with identical calculation truth to the main Found Calc application.

**Architecture:** Keep `@found-calc/engine` and `@found-calc/rules` as the only calculation/rule truth. Add an additive D1-backed widget management/runtime subsystem in `apps/web`, refactor the three existing calculator React flows behind a shared surface/renderer registry, serve widgets from a dedicated first-party embed origin, enforce verified domains and Phase 07A commercial access server-side, and use a tiny dependency-free loader plus a one-way `ready`/`resize` message protocol. Dynamic embed CSP is applied in Next.js 16 `proxy.ts`; the embed page independently re-resolves authorization as defense in depth.

**Tech Stack:** pnpm 11.24.0, Node.js 22+, Next.js 16.2.9 App Router, React 19.2.8, TypeScript strict, Tailwind CSS 4.3.3, Better Auth 1.6.29, Drizzle ORM 0.45.2, Cloudflare Workers/D1, vinext 1.0.0-beta.8, Wrangler 4.127.0, Vitest 4.1.x, Cloudflare Vitest plugin, Playwright 1.62.1.

**Spec:** `docs/superpowers/specs/2026-08-31-found-calc-phase-07b-widget-platform-foundation-design.md`

## Global Constraints

- Canonical predecessor is Phase 07A merge SHA `d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44`.
- Work stays on isolated branch `phase-07b-widget-platform-foundation` until finishing-development-branch review/verification.
- Phase 01–07A are completed canonical baseline; do not reopen them without a verified blocker and explicit change control.
- `@found-calc/engine` remains the sole deterministic calculation truth; no widget formulas, rounding, or result derivation.
- `@found-calc/rules` remains the rule-resolution truth; no copied rule payloads or widget-specific rule logic.
- Preserve invariant: `same calculator truth, different delivery surface`.
- Preserve ID/EN, trust/source labels, warnings, provenance, and accessibility behavior.
- Widget calculation state is memory-only: no local drafts, Saved Calculation controls, workspace/project controls, or Better Auth dependency inside public widgets.
- Friends: 1 effective verified domain and mandatory persistent `Powered by Found Calc` attribution.
- Besties: 3 effective verified domains, optional attribution removal, controlled theme customization, standard aggregate analytics.
- Family: current server-authoritative limit 10 effective verified domains, V1 white-label/no attribution, advanced aggregate entitlement boundary; do not expose later bulk/developer/Portfolio runtime.
- Downgrade rule is `restrict capability, preserve ownership and configuration`; never delete configuration because entitlement shrank.
- Production domain verification is DNS TXT only; local development exception is restricted to `localhost`, `127.0.0.1`, and `::1` with configured ports.
- Production customer origins are HTTPS only; non-default production ports are rejected.
- Exact subdomains are independent except the explicit apex/`www` pair rule.
- Public embed key is browser-visible, opaque, rotatable, revocable, and generated with at least 128 bits of cryptographic entropy; it is not treated as a secret.
- Parent-window protocol is child→parent only: `foundcalc:ready` and `foundcalc:resize`; no calculator input/result messages and no parent commands.
- No arbitrary CSS, HTML, JavaScript, fonts, custom formulas, Web Components, public Calculation API, SDK, CMS plugins, payment checkout, or widget authentication.
- Migrations `0001`–`0005` are immutable. Phase 07B uses only additive `apps/web/migrations/0006_phase07b_widget_platform.sql`.
- Preserve fixed infrastructure target ≈ Rp0 while within free tiers, excluding domain/payment transaction fees; add no paid SaaS dependency.
- `pnpm verify:phase07b` must execute the complete `pnpm verify:phase07a` gate rather than replacing it.
- Every implementation task follows TDD: failing test → observe expected failure → minimal implementation → focused pass → regression pass → commit.
- Use `superpowers:systematic-debugging` for unexpected failures, `superpowers:requesting-code-review` / `receiving-code-review` at review gates, and `superpowers:verification-before-completion` before any completion claim.

---

## File Structure / Responsibility Map

### Commercial access

- Modify `apps/web/src/lib/billing/capabilities.ts` — expose reusable effective commercial access without duplicating billing resolution; preserve existing persistence-limit authorizer.
- Modify `apps/web/src/lib/billing/capabilities.test.ts` or create it if absent — prove persistence callers remain compatible and widget callers receive full `EffectiveCommercialAccess`.

### Widget domain/config/runtime contracts

- Create `apps/web/src/lib/widgets/contracts.ts` — statuses, theme/branding/default/analytics types and strict parsers.
- Create `apps/web/src/lib/widgets/domain.ts` — production/local origin normalization, IDN/Punycode, apex/`www` pair key, origin authorization helpers.
- Create `apps/web/src/lib/widgets/identity.ts` — widget public key and verification challenge generation/validation.
- Create `apps/web/src/lib/widgets/capabilities.ts` — map Phase 07A access to runtime widget capabilities and deterministic effective-domain selection.
- Create `apps/web/src/lib/widgets/defaults.ts` — per-calculator safe default allowlist and canonical default validation.
- Create focused unit tests beside each module.

### Persistence

- Create `apps/web/migrations/0006_phase07b_widget_platform.sql` — additive widget tables/indexes only.
- Modify `apps/web/src/lib/persistence/schema.ts` — Drizzle mirrors for Phase 07B tables.
- Create `apps/web/src/lib/widgets/domain-repository.ts` — domain/verification persistence.
- Create `apps/web/src/lib/widgets/widget-repository.ts` — widget config/binding/key lifecycle persistence.
- Create `apps/web/src/lib/widgets/analytics-repository.ts` — daily aggregate upsert/read/retention cleanup.
- Create `apps/web/tests/cloudflare/phase-07b-migration.test.ts` and `phase-07b-widget-repository.test.ts`.

### DNS verification and authenticated management HTTP

- Create `apps/web/src/lib/widgets/verification.ts` — DNS TXT resolver abstraction, 72-hour challenge, 30-second check throttle, exact token matching, local-development verification.
- Create `apps/web/src/lib/widgets/http.ts` — authenticated widget/domain management handlers and API DTOs.
- Create `apps/web/src/lib/widgets/route-services.ts` — `cloudflare:workers` bindings, auth, commercial access, DNS resolver wiring.
- Create workspace API routes under `apps/web/src/app/api/workspace/widget-domains/**` and `apps/web/src/app/api/workspace/widgets/**`.

### Shared calculator delivery boundary

- Create `apps/web/src/components/calculator/calculator-surface.tsx` — public/widget surface context.
- Create `apps/web/src/components/calculator/renderer-registry.tsx` — calculator-ID registry selecting the existing calculator components.
- Modify the three calculator components to consume surface policy and canonical safe defaults while preserving current interaction logic.
- Modify `apps/web/src/app/[locale]/(public)/calculators/[slug]/page.tsx` to render through the registry.
- Add parity/surface tests without changing `apps/web/src/lib/calculators/runtime.ts` formulas.

### Public embed runtime/security

- Create `apps/web/src/lib/widgets/runtime.ts` — server-side public/preview runtime resolver.
- Create `apps/web/src/lib/widgets/security.ts` — host policy, CSP construction, embed-origin checks, generic unavailable response.
- Create `apps/web/src/proxy.ts` — Next.js 16 route matcher for embed-origin isolation and dynamic authorized `frame-ancestors`.
- Create `apps/web/src/app/embed/[publicWidgetKey]/page.tsx` — public iframe page.
- Create `apps/web/src/components/widgets/widget-frame.tsx` — isolated shell, effective theme/branding, lifecycle bridge.
- Create `apps/web/src/components/widgets/widget-lifecycle.tsx` — ResizeObserver + exact-target `postMessage`.
- Create `apps/web/src/lib/widgets/protocol.ts` — message schemas/constants.
- Create `apps/web/public/embed.js` — tiny dependency-free host loader.

### Analytics

- Create `apps/web/src/lib/widgets/analytics.ts` — event validation and aggregate write service.
- Create `apps/web/src/app/api/embed/[publicWidgetKey]/events/route.ts` — first-party best-effort event ingestion.

### Workspace UX / preview

- Create `apps/web/src/lib/widgets/client.ts` — typed management API client.
- Create `apps/web/src/app/[locale]/(workspace)/workspace/widgets/page.tsx` — widget list/create entry.
- Create `apps/web/src/app/[locale]/(workspace)/workspace/widgets/[widgetId]/page.tsx` — configure/preview/analytics surface.
- Create `apps/web/src/components/widgets/widget-manager.tsx` and focused subcomponents for progressive creation/configuration rather than dashboard-card spam.
- Create `apps/web/src/app/widget-preview/[widgetId]/page.tsx` — owner-authenticated preview using the same render model/components as public widget, bypassing only public-domain authorization.
- Modify workspace/site navigation minimally to expose Widgets.

### Verification/closure

- Create Phase 07B unit/Cloudflare/E2E/foundation contract tests.
- Create `scripts/verify-phase-07b.mjs` and root `verify:phase07b` script.
- Create `.github/workflows/phase-07b-verification.yml` and `.github/workflows/phase-07b-baseline-artifact.yml`.
- Create `docs/verification/phase-07b-verification.md` at closure and update `BASELINE.md`, `PHASE_HANDOFF.md`, and `PHASE_CHAT_TEMPLATE.md` only after all implementation verification is green.

---

### Task 1: Expose Effective Commercial Access for Widget Authorization

**Files:**
- Modify: `apps/web/src/lib/billing/capabilities.ts`
- Test: `apps/web/src/lib/billing/capabilities.test.ts`
- Regression: `apps/web/src/lib/billing/commercial.test.ts`
- Regression: `apps/web/tests/cloudflare/phase-07a-commercial-limits.test.ts`

**Interfaces:**
- Consumes: existing `resolveEffectiveCommercialAccess(input): EffectiveCommercialAccess`, `createBillingRepository`, `offerInternalTier`.
- Produces:

```ts
export interface CommercialAccessAuthorizer {
  getAccess(userId: string, now?: Date): Promise<EffectiveCommercialAccess>;
}

export const createCommercialAccessAuthorizer: (
  database: D1Database,
  clock?: () => Date,
) => CommercialAccessAuthorizer;
```

- Existing `CommercialCapabilityAuthorizer#getLimits()` must remain behavior-compatible by delegating to `CommercialAccessAuthorizer`.

- [ ] **Step 1: Write failing tests for paid, Besties trial, Friends fallback, and paid-through cancellation through the new authorizer.**

```ts
it("returns the full Besties trial access snapshot", async () => {
  const access = await authorizer.getAccess("user_trial", new Date(1_800_000_000_000));
  expect(access.tier).toBe("besties");
  expect(access.source).toBe("trial");
  expect(access.limits.widgetDomains).toBe(3);
});
```

- [ ] **Step 2: Run focused test and confirm RED.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/billing/capabilities.test.ts`
Expected: FAIL because `createCommercialAccessAuthorizer` does not exist.

- [ ] **Step 3: Extract the current repository/status/trial resolution into `createCommercialAccessAuthorizer`; make persistence authorizer delegate.**

```ts
export const createCommercialAccessAuthorizer = (database: D1Database, clock = () => new Date()) => {
  const repository = createBillingRepository(database);
  return {
    getAccess: async (userId: string, now = clock()) => {
      const nowMs = now.valueOf();
      if (!Number.isSafeInteger(nowMs)) throw new RangeError("now must be a valid millisecond timestamp");
      const [status, trial] = await Promise.all([
        repository.getStatusForUser(userId),
        repository.getTrialForUser(userId),
      ]);
      const subscription = status.subscription;
      return resolveEffectiveCommercialAccess({
        paidTier: subscription ? offerInternalTier(subscription.planId) : null,
        subscriptionStatus: subscription?.status ?? null,
        paidThroughAt: subscription?.paidThroughAt ?? null,
        trial,
        now: nowMs,
        checkoutPending: status.checkoutPending,
      });
    },
  } satisfies CommercialAccessAuthorizer;
};
```

- [ ] **Step 4: Run focused test and Phase 07A commercial regressions.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/billing/capabilities.test.ts src/lib/billing/commercial.test.ts`
Expected: PASS.

Run: `pnpm --filter @found-calc/web test:cloudflare -- --run apps/web/tests/cloudflare/phase-07a-commercial-limits.test.ts`
Expected: PASS; if the Vitest CLI wrapper does not forward the path, run the repository's canonical `pnpm --filter @found-calc/web test:cloudflare` instead.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/lib/billing/capabilities.ts apps/web/src/lib/billing/capabilities.test.ts
git commit -m "refactor: expose commercial access authorizer"
```

---

### Task 2: Add Widget Contracts, Domain Normalization, and Opaque Identities

**Files:**
- Create: `apps/web/src/lib/widgets/contracts.ts`
- Create: `apps/web/src/lib/widgets/domain.ts`
- Create: `apps/web/src/lib/widgets/identity.ts`
- Test: `apps/web/src/lib/widgets/contracts.test.ts`
- Test: `apps/web/src/lib/widgets/domain.test.ts`
- Test: `apps/web/src/lib/widgets/identity.test.ts`

**Interfaces:**

```ts
export type WidgetStatus = "active" | "disabled" | "revoked";
export type WidgetDomainStatus = "pending" | "active" | "disabled" | "revoked";
export type WidgetBrandingPreference = "foundcalc" | "hidden";
export type WidgetAppearance = "light" | "dark" | "system";
export type WidgetDensity = "comfortable" | "compact";
export type WidgetRadiusPreset = "standard" | "soft" | "square";
export type WidgetAccent = "brand" | "blue" | "teal";
export type WidgetAnalyticsLevel = "operational" | "standard" | "advanced";
export type WidgetEventType = "widget_viewed" | "calculator_started" | "calculation_completed" | "cta_clicked";

export interface WidgetTheme {
  readonly appearance: WidgetAppearance;
  readonly accent: WidgetAccent;
  readonly density: WidgetDensity;
  readonly radiusPreset: WidgetRadiusPreset;
  readonly showTitle: boolean;
}

export interface NormalizedWidgetOrigin {
  readonly origin: string;
  readonly hostname: string;
  readonly displayHostname: string;
  readonly pairKey: string;
  readonly isLocalDevelopment: boolean;
}
```

```ts
export const normalizeWidgetOrigin: (
  value: string,
  options: { readonly mode: "production" | "development"; readonly localPorts?: readonly number[] },
) => { readonly ok: true; readonly value: NormalizedWidgetOrigin } |
     { readonly ok: false; readonly code: "invalid-origin" | "https-required" | "port-not-allowed" | "host-not-allowed" };

export const generatePublicWidgetKey: () => string;
export const generateVerificationChallenge: () => string;
```

- [ ] **Step 1: Write normalization tests for uppercase, trailing dot, apex/`www`, true subdomains, IDN/Punycode, HTTPS, credentials/path/query/fragment rejection, production ports, and local loopback ports.**

```ts
expect(normalizeWidgetOrigin("https://WWW.Example.COM./", { mode: "production" })).toEqual({
  ok: true,
  value: expect.objectContaining({ hostname: "www.example.com", pairKey: "example.com" }),
});
expect(normalizeWidgetOrigin("https://shop.example.com", { mode: "production" })).toEqual({
  ok: true,
  value: expect.objectContaining({ pairKey: "shop.example.com" }),
});
expect(normalizeWidgetOrigin("http://example.com", { mode: "production" })).toEqual({ ok: false, code: "https-required" });
```

- [ ] **Step 2: Run tests and confirm RED.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/contracts.test.ts src/lib/widgets/domain.test.ts src/lib/widgets/identity.test.ts`
Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement strict parsers and normalization using platform `URL` plus Node's URL domain conversion (`domainToASCII`) available under the existing Node 22/Workers compatibility baseline.**

```ts
const canonicalPairKey = (hostname: string) =>
  hostname.startsWith("www.") && hostname.split(".").length >= 3 ? hostname.slice(4) : hostname;
```

Do not collapse arbitrary subdomains and do not accept wildcard hosts.

- [ ] **Step 4: Generate public keys/challenges from cryptographic bytes and encode URL-safe.**

```ts
const randomToken = (bytes: number) => {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return btoa(String.fromCharCode(...buffer)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};
export const generatePublicWidgetKey = () => `fcw_${randomToken(16)}`;
```

- [ ] **Step 5: Run focused tests and typecheck.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/contracts.test.ts src/lib/widgets/domain.test.ts src/lib/widgets/identity.test.ts`
Expected: PASS.

Run: `pnpm --filter @found-calc/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/web/src/lib/widgets
git commit -m "feat: add widget platform contracts"
```

---

### Task 3: Map Commercial Access to Widget Runtime Capabilities and Downgrade Selection

**Files:**
- Create: `apps/web/src/lib/widgets/capabilities.ts`
- Test: `apps/web/src/lib/widgets/capabilities.test.ts`

**Interfaces:**

```ts
export interface WidgetRuntimeCapabilities {
  readonly tier: "friends" | "besties" | "family";
  readonly runtimeAvailable: true;
  readonly maxEffectiveDomains: number;
  readonly canCustomizeTheme: boolean;
  readonly canRemoveBranding: boolean;
  readonly whiteLabelAvailable: boolean;
  readonly analyticsLevel: WidgetAnalyticsLevel;
  readonly bulkManagementAvailable: false;
  readonly publicEventApiAvailable: false;
  readonly portfolioRuntimeAvailable: false;
}

export interface WidgetDomainCandidate {
  readonly domainId: string;
  readonly status: WidgetDomainStatus;
  readonly verifiedAt: number | null;
  readonly priority: number | null;
}

export const widgetCapabilitiesForAccess: (access: EffectiveCommercialAccess) => WidgetRuntimeCapabilities;
export const selectEffectiveWidgetDomains: (
  candidates: readonly WidgetDomainCandidate[],
  limit: number,
) => readonly string[];
```

- [ ] **Step 1: Write failing matrix tests for Friends, Besties trial/paid, Family, and explicit unavailable later features.**

```ts
expect(widgetCapabilitiesForAccess(friendsAccess)).toMatchObject({
  maxEffectiveDomains: 1,
  canRemoveBranding: false,
  bulkManagementAvailable: false,
});
expect(widgetCapabilitiesForAccess(familyAccess)).toMatchObject({
  maxEffectiveDomains: 10,
  whiteLabelAvailable: true,
  publicEventApiAvailable: false,
});
```

- [ ] **Step 2: Write deterministic downgrade selection tests.**

```ts
expect(selectEffectiveWidgetDomains([
  { domainId: "b", status: "active", verifiedAt: 200, priority: null },
  { domainId: "a", status: "active", verifiedAt: 100, priority: null },
], 1)).toEqual(["a"]);
```

- [ ] **Step 3: Run tests and confirm RED.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/capabilities.test.ts`
Expected: FAIL because module does not exist.

- [ ] **Step 4: Implement mapping only from `access.limits`; do not introduce plan-name checks or Xendit reads.**

`analyticsLevel` is `advanced` when `advancedWidgetAnalytics`, else `standard` when `standardWidgetAnalytics`, else `operational`.

- [ ] **Step 5: Implement stable ordering: explicit priority ascending, then verifiedAt ascending, then domainId lexical; exclude pending/disabled/revoked.**

- [ ] **Step 6: Run focused tests plus billing access tests.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/capabilities.test.ts src/lib/billing/capabilities.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add apps/web/src/lib/widgets/capabilities.ts apps/web/src/lib/widgets/capabilities.test.ts
git commit -m "feat: add widget entitlement resolution"
```

---

### Task 4: Add Additive Phase 07B D1 Schema and Migration

**Files:**
- Create: `apps/web/migrations/0006_phase07b_widget_platform.sql`
- Modify: `apps/web/src/lib/persistence/schema.ts`
- Create: `apps/web/tests/cloudflare/phase-07b-migration.test.ts`
- Modify: `apps/web/tests/cloudflare/sql-statements.ts` only if the test harness explicitly enumerates migrations.

**Interfaces / schema:**

`widget_domain`:

```text
id TEXT PRIMARY KEY
owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
normalized_hostname TEXT NOT NULL
display_hostname TEXT NOT NULL
pair_key TEXT NOT NULL
status TEXT NOT NULL CHECK pending|active|disabled|revoked
verified_at INTEGER NULL
created_at INTEGER NOT NULL
updated_at INTEGER NOT NULL
deleted_at INTEGER NULL
```

Use a partial unique index on `(owner_user_id, pair_key) WHERE deleted_at IS NULL`.

`widget_verification`:

```text
id TEXT PRIMARY KEY
domain_id TEXT NOT NULL REFERENCES widget_domain(id) ON DELETE CASCADE
method TEXT NOT NULL CHECK dns_txt|local_development
challenge_token TEXT NULL
status TEXT NOT NULL CHECK pending|verified|expired|revoked
expires_at INTEGER NULL
last_checked_at INTEGER NULL
verified_at INTEGER NULL
created_at INTEGER NOT NULL
```

`widget_configuration`:

```text
id TEXT PRIMARY KEY
owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
public_widget_key TEXT NOT NULL UNIQUE
public_key_version INTEGER NOT NULL
name TEXT NOT NULL
calculator_id TEXT NOT NULL
locale TEXT NOT NULL CHECK id|en
status TEXT NOT NULL CHECK active|disabled|revoked
theme_json TEXT NOT NULL
branding_preference TEXT NOT NULL CHECK foundcalc|hidden
default_input_configuration_json TEXT NOT NULL
key_rotated_at INTEGER NULL
created_at INTEGER NOT NULL
updated_at INTEGER NOT NULL
```

`widget_domain_binding`: composite PK `(widget_id, domain_id)`, integer `priority`, cascade FKs.

`widget_event_daily`: composite PK `(widget_id, domain_id, calculator_id, locale, event_type, event_day)`, `count INTEGER NOT NULL`, `last_occurred_at INTEGER NOT NULL`.

- [ ] **Step 1: Write a Cloudflare migration test that applies `0001`–`0005`, inserts representative Phase 07A rows, applies `0006`, and asserts prior rows survive.**

- [ ] **Step 2: Assert every new table/index exists and duplicate active pair/public key constraints fail as intended.**

- [ ] **Step 3: Run migration test and confirm RED because migration/table mirrors do not exist.**

Run: `pnpm --filter @found-calc/web test:cloudflare`
Expected: Phase 07B migration assertions FAIL while inherited tests remain green.

- [ ] **Step 4: Write `0006_phase07b_widget_platform.sql` without modifying earlier SQL files.**

- [ ] **Step 5: Mirror the same tables/indexes in Drizzle `schema.ts`, including the partial unique index.**

```ts
uniqueIndex("widget_domain_owner_pair_active_unique")
  .on(table.ownerUserId, table.pairKey)
  .where(sql`${table.deletedAt} IS NULL`)
```

- [ ] **Step 6: Run Cloudflare tests and typecheck.**

Run: `pnpm --filter @found-calc/web test:cloudflare`
Expected: PASS.

Run: `pnpm --filter @found-calc/web typecheck`
Expected: PASS.

- [ ] **Step 7: Verify historical migration immutability from git.**

Run: `git diff d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44 -- apps/web/migrations/0001_phase04_auth_and_calculator_state.sql apps/web/migrations/0002_phase05_rule_platform_admin.sql apps/web/migrations/0003_phase06_workspace.sql apps/web/migrations/0004_phase07_billing.sql apps/web/migrations/0005_phase07a_commercial_auth_amendment.sql`
Expected: no output.

- [ ] **Step 8: Commit.**

```bash
git add apps/web/migrations/0006_phase07b_widget_platform.sql apps/web/src/lib/persistence/schema.ts apps/web/tests/cloudflare/phase-07b-migration.test.ts apps/web/tests/cloudflare/sql-statements.ts
git commit -m "feat: add Phase 07B widget storage"
```

---

### Task 5: Implement Domain, Widget, and Analytics Repositories

**Files:**
- Create: `apps/web/src/lib/widgets/domain-repository.ts`
- Create: `apps/web/src/lib/widgets/widget-repository.ts`
- Create: `apps/web/src/lib/widgets/analytics-repository.ts`
- Create: `apps/web/tests/cloudflare/phase-07b-widget-repository.test.ts`

**Interfaces:**

```ts
export const createWidgetDomainRepository: (db: D1Database) => {
  listForOwner(userId: string): Promise<StoredWidgetDomain[]>;
  getForOwner(userId: string, domainId: string): Promise<StoredWidgetDomain | null>;
  create(userId: string, origin: NormalizedWidgetOrigin, now: number): Promise<StoredWidgetDomain>;
  setStatus(userId: string, domainId: string, status: WidgetDomainStatus, now: number): Promise<StoredWidgetDomain | null>;
  softDelete(userId: string, domainId: string, now: number): Promise<boolean>;
  createVerification(input: CreateWidgetVerificationInput): Promise<StoredWidgetVerification>;
  getPendingVerification(domainId: string): Promise<StoredWidgetVerification | null>;
  recordVerificationCheck(id: string, checkedAt: number): Promise<void>;
  completeVerification(id: string, domainId: string, verifiedAt: number): Promise<void>;
};
```

```ts
export const createWidgetRepository: (db: D1Database) => {
  listForOwner(userId: string): Promise<StoredWidget[]>;
  getForOwner(userId: string, widgetId: string): Promise<StoredWidget | null>;
  getByPublicKey(publicWidgetKey: string): Promise<StoredWidget | null>;
  create(input: CreateStoredWidgetInput): Promise<StoredWidget>;
  update(input: UpdateStoredWidgetInput): Promise<StoredWidget | null>;
  rotatePublicKey(userId: string, widgetId: string, nextKey: string, now: number): Promise<StoredWidget | null>;
  bindDomain(userId: string, widgetId: string, domainId: string, priority: number): Promise<void>;
  unbindDomain(userId: string, widgetId: string, domainId: string): Promise<void>;
  listBindings(widgetId: string): Promise<StoredWidgetDomainBinding[]>;
};
```

Analytics repository upserts daily counts atomically and returns 7/30-day summaries without exposing raw events.

- [ ] **Step 1: Write Cloudflare repository tests for owner isolation, duplicate domain pair, public-key lookup/rotation, bindings, soft deletion, and daily aggregate increments.**

- [ ] **Step 2: Add downgrade-preservation test: create three domains/config/bindings, simulate effective limit externally, verify repository rows are unchanged.**

- [ ] **Step 3: Run Cloudflare tests and confirm RED.**

Run: `pnpm --filter @found-calc/web test:cloudflare`
Expected: FAIL because repositories do not exist.

- [ ] **Step 4: Implement focused repositories using Drizzle D1 patterns already used by persistence/billing/workspace repositories; validate/decode JSON through `contracts.ts`.**

- [ ] **Step 5: Implement atomic aggregate update with a hard logical daily count ceiling `100000` to avoid unbounded count values; analytics writes remain best effort at service layer.**

- [ ] **Step 6: Run Cloudflare tests and typecheck.**

Run: `pnpm --filter @found-calc/web test:cloudflare`
Expected: PASS.

Run: `pnpm --filter @found-calc/web typecheck`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add apps/web/src/lib/widgets/*repository.ts apps/web/tests/cloudflare/phase-07b-widget-repository.test.ts
git commit -m "feat: add widget repositories"
```

---

### Task 6: Implement DNS TXT Verification and Safe Local Development Verification

**Files:**
- Create: `apps/web/src/lib/widgets/verification.ts`
- Create: `apps/web/src/lib/widgets/verification.test.ts`

**Interfaces:**

```ts
export interface WidgetTxtResolver {
  resolveTxt(hostname: string): Promise<readonly (readonly string[])[]>;
}

export const createCloudflareWidgetTxtResolver: () => WidgetTxtResolver;

export const verifyWidgetDomain: (input: {
  readonly domain: StoredWidgetDomain;
  readonly verification: StoredWidgetVerification;
  readonly resolver: WidgetTxtResolver;
  readonly now: number;
}) => Promise<
  | { readonly ok: true }
  | { readonly ok: false; readonly code: "check-too-soon" | "challenge-expired" | "token-not-found" | "dns-unavailable" }
>;
```

Constants:

```ts
export const WIDGET_VERIFICATION_TTL_MS = 72 * 60 * 60 * 1000;
export const WIDGET_VERIFICATION_MIN_CHECK_INTERVAL_MS = 30 * 1000;
```

Production TXT host is `_foundcalc-verification.${normalizedHostname}` and token value is `foundcalc-site-verification=${challengeToken}`.

- [ ] **Step 1: Write tests for exact token, split TXT fragments, unrelated TXT, NXDOMAIN/empty, transient resolver error, expiry, replayed/non-pending challenge, and 30-second throttle.**

```ts
resolver.resolveTxt = async () => [["foundcalc-site-", "verification=abc"]];
expect(await verifyWidgetDomain(fixture("abc"))).toEqual({ ok: true });
```

- [ ] **Step 2: Write local-development tests proving only configured loopback hosts/ports can use `local_development` verification and production mode can never use it.**

- [ ] **Step 3: Run focused tests and confirm RED.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/verification.test.ts`
Expected: FAIL because module does not exist.

- [ ] **Step 4: Implement resolver with `node:dns` `promises.resolveTxt`; join each TXT record's fragments before exact comparison.**

```ts
import { promises as dns } from "node:dns";
export const createCloudflareWidgetTxtResolver = (): WidgetTxtResolver => ({
  resolveTxt: (hostname) => dns.resolveTxt(hostname),
});
```

- [ ] **Step 5: Run focused tests and typecheck.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/verification.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/web/src/lib/widgets/verification.ts apps/web/src/lib/widgets/verification.test.ts
git commit -m "feat: add DNS widget verification"
```

---

### Task 7: Add Safe Default-Input Policies

**Files:**
- Create: `apps/web/src/lib/widgets/defaults.ts`
- Create: `apps/web/src/lib/widgets/defaults.test.ts`
- Read-only reference: `packages/engine/src/reference/discount.ts`
- Read-only reference: `packages/engine/src/reference/business-margin.ts`
- Read-only reference: `packages/engine/src/reference/synthetic-rule.ts`

**Interfaces:**

```ts
export type WidgetDefaultConfiguration = Readonly<Record<string, string | readonly string[]>>;

export const parseWidgetDefaults: (
  calculatorId: SupportedCalculatorId,
  value: unknown,
) => { readonly ok: true; readonly value: WidgetDefaultConfiguration } |
     { readonly ok: false; readonly code: "invalid-defaults" | "unsupported-default-field" | "invalid-default-value" };
```

Safe fields:

```text
reference.discount: baseAmount, discountPercentages
reference.business-margin: sellingPrice, productCost, variableSellingCostPerOrder
reference.synthetic-rule: baseAmount only
```

`effectiveDate` is explicitly forbidden for the synthetic rule slice.

- [ ] **Step 1: Write tests proving only the listed fields are accepted, engine input scale/range is honored, and synthetic `effectiveDate` is rejected.**

- [ ] **Step 2: Run focused test and confirm RED.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/defaults.test.ts`
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement validation from existing engine definition metadata plus calculator-specific safe-field allowlist; do not duplicate formulas or calculate derived values.**

- [ ] **Step 4: Run focused tests and engine regressions.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/defaults.test.ts`
Expected: PASS.

Run: `pnpm test:engine`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/lib/widgets/defaults.ts apps/web/src/lib/widgets/defaults.test.ts
git commit -m "feat: validate widget default inputs"
```

---

### Task 8: Add Authenticated Widget/Domain Management HTTP APIs

**Files:**
- Create: `apps/web/src/lib/widgets/http.ts`
- Create: `apps/web/src/lib/widgets/http.test.ts`
- Create: `apps/web/src/lib/widgets/route-services.ts`
- Create API routes:
  - `apps/web/src/app/api/workspace/widget-domains/route.ts`
  - `apps/web/src/app/api/workspace/widget-domains/[domainId]/route.ts`
  - `apps/web/src/app/api/workspace/widget-domains/[domainId]/verify/route.ts`
  - `apps/web/src/app/api/workspace/widgets/route.ts`
  - `apps/web/src/app/api/workspace/widgets/[widgetId]/route.ts`
  - `apps/web/src/app/api/workspace/widgets/[widgetId]/domains/route.ts`
  - `apps/web/src/app/api/workspace/widgets/[widgetId]/rotate-key/route.ts`
  - `apps/web/src/app/api/workspace/widgets/[widgetId]/analytics/route.ts`
- Create: `apps/web/tests/cloudflare/phase-07b-widget-api.test.ts`

**Interfaces / behavior:**

All management handlers require Better Auth session and `Cache-Control: no-store`. Body size uses the existing workspace maximum unless a smaller widget constant is defined.

`POST /api/workspace/widget-domains`:

```json
{ "origin": "https://example.com" }
```

Returns domain plus either DNS challenge instructions or immediate `local_development` verified state when the strict local mode applies.

`POST /verify` never trusts UI state; it reads stored pending verification, enforces check interval/expiry, performs TXT lookup, and activates domain only on exact match.

`POST /api/workspace/widgets` accepts `name`, `calculatorId`, `locale`, optional bound domain IDs, theme, branding preference, and validated defaults. Server recomputes commercial capability and clamps/rejects unauthorized paid settings.

- [ ] **Step 1: Write HTTP unit tests for auth-required, invalid JSON, invalid origin, duplicate domain, verification throttling, domain-limit enforcement, Friends forced branding/default theme, Besties customization, Family white-label, owner isolation, disable/re-enable, and key rotation.**

- [ ] **Step 2: Write Cloudflare API tests using real D1 repositories and synthetic commercial access fixtures.**

- [ ] **Step 3: Run focused unit/Cloudflare tests and confirm RED.**

Run: `pnpm --filter @found-calc/web test:unit`
Expected: Phase 07B HTTP tests FAIL because handlers/routes do not exist.

Run: `pnpm --filter @found-calc/web test:cloudflare`
Expected: Phase 07B API tests FAIL.

- [ ] **Step 4: Implement `route-services.ts` with `env.DB`, `getFoundCalcAuth()`, `createCommercialAccessAuthorizer(DB)`, repositories, and DNS resolver.**

Do not import Xendit client or provider identifiers.

- [ ] **Step 5: Implement handlers with server-authoritative capability checks.**

Friends attempts to set hidden branding or custom theme must persist safe effective values, not trust submitted capability flags.

- [ ] **Step 6: Wire thin App Router route files to handlers and map unknown failures to generic `service-unavailable` without stack traces.**

- [ ] **Step 7: Run unit, Cloudflare, lint, and typecheck.**

Run: `pnpm --filter @found-calc/web test:unit && pnpm --filter @found-calc/web test:cloudflare && pnpm --filter @found-calc/web lint && pnpm --filter @found-calc/web typecheck`
Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add apps/web/src/lib/widgets apps/web/src/app/api/workspace/widget-domains apps/web/src/app/api/workspace/widgets apps/web/tests/cloudflare/phase-07b-widget-api.test.ts
git commit -m "feat: add widget management APIs"
```

---

### Task 9: Introduce Shared Calculator Surface Policy and Renderer Registry

**Files:**
- Create: `apps/web/src/components/calculator/calculator-surface.tsx`
- Create: `apps/web/src/components/calculator/renderer-registry.tsx`
- Modify: `apps/web/src/components/calculator/discount-calculator.tsx`
- Modify: `apps/web/src/components/calculator/business-margin-calculator.tsx`
- Modify: `apps/web/src/components/calculator/synthetic-rule-calculator.tsx`
- Modify: `apps/web/src/app/[locale]/(public)/calculators/[slug]/page.tsx`
- Create: `apps/web/src/components/calculator/renderer-registry.test.tsx` if current Vitest React transform supports component rendering; otherwise use foundation source-contract + Playwright tests in this task.
- Modify/Create foundation tests under `apps/web/tests/foundation/` and `tests/foundation/`.

**Interfaces:**

```ts
export type CalculatorSurface = "public" | "widget";
export type CalculatorLifecycleEvent = "calculator_started" | "calculation_completed" | "cta_clicked";

export interface CalculatorSurfacePolicy {
  readonly surface: CalculatorSurface;
  readonly recordId?: string;
  readonly initialDefaults?: WidgetDefaultConfiguration;
  readonly onLifecycleEvent?: (event: CalculatorLifecycleEvent) => void;
}
```

`CalculatorSurfaceProvider` defaults to public behavior when absent so existing component imports remain safe during the refactor.

```tsx
export function CalculatorRenderer(props: {
  locale: Locale;
  entry: ReferenceCatalogEntry;
  policy: CalculatorSurfacePolicy;
}) { /* registry lookup by entry.id */ }
```

- [ ] **Step 1: Write regression contract asserting the public route no longer hard-codes a ternary but imports `CalculatorRenderer`, and registry contains exactly the three existing reference IDs.**

- [ ] **Step 2: Write surface behavior tests: public permits drafts/persistence/workspace; widget suppresses all three and accepts memory-only initial defaults.**

- [ ] **Step 3: Run focused tests and confirm RED.**

Run: `pnpm test:foundation`
Expected: new renderer/surface contract FAIL.

- [ ] **Step 4: Add provider/context and registry; keep each calculator-specific form/result implementation intact.**

- [ ] **Step 5: Modify each calculator so local draft reads/writes and persistence/workspace controls execute/render only for `surface === "public"`.**

Pattern:

```ts
const surface = useCalculatorSurface();
const [initialDraft] = useState(() => surface.surface === "public" ? readLocalDraft(...) : null);
useEffect(() => {
  if (surface.surface !== "public") return;
  writeLocalDraft(...);
}, [surface.surface, ...]);
```

- [ ] **Step 6: Emit `calculator_started` once when a user first meaningfully edits a widget calculator and `calculation_completed` only after a successful calculation; never include inputs/results in the callback.**

- [ ] **Step 7: Replace public-page ternary with registry and preserve `recordId` through public policy.**

- [ ] **Step 8: Run existing calculator unit/foundation/E2E regressions.**

Run: `pnpm --filter @found-calc/web test:unit && pnpm test:foundation && pnpm --filter @found-calc/web test:e2e -- --grep "calculator|accessibility"`
Expected: PASS; public behavior unchanged.

- [ ] **Step 9: Commit.**

```bash
git add apps/web/src/components/calculator apps/web/src/app/[locale]/\(public\)/calculators/[slug]/page.tsx apps/web/tests/foundation tests/foundation
git commit -m "refactor: share calculator renderer surfaces"
```

---

### Task 10: Apply Canonical Safe Defaults in Widget Surface

**Files:**
- Modify: the three calculator components from Task 9.
- Test: focused calculator surface/default tests.

**Interfaces:**

`initialDefaults` contains canonical decimal strings/list values already validated by `parseWidgetDefaults`. UI converts them through existing presentation formatters; no default is treated as a precomputed result.

- [ ] **Step 1: Write tests proving Discount defaults populate base/list, Business Margin defaults populate available fields, synthetic base amount populates, and synthetic effective date remains empty.**

- [ ] **Step 2: Run focused tests and confirm RED because calculators do not consume `initialDefaults` yet.**

- [ ] **Step 3: Initialize widget state from canonical defaults using `formatCanonicalDecimal`; public draft precedence remains unchanged.**

- [ ] **Step 4: Verify defaults do not automatically trigger a calculation and do not create localStorage/D1 persistence.**

- [ ] **Step 5: Run focused tests plus `pnpm test:engine`.**

Expected: PASS and engine files unchanged.

- [ ] **Step 6: Commit.**

```bash
git add apps/web/src/components/calculator
git commit -m "feat: apply safe widget defaults"
```

---

### Task 11: Implement Public Widget Runtime Resolver and Security Policy

**Files:**
- Create: `apps/web/src/lib/widgets/runtime.ts`
- Create: `apps/web/src/lib/widgets/runtime.test.ts`
- Create: `apps/web/src/lib/widgets/security.ts`
- Create: `apps/web/src/lib/widgets/security.test.ts`
- Create: `apps/web/src/proxy.ts`
- Create: `apps/web/tests/foundation/phase-07b-proxy-contract.test.mjs`

**Interfaces:**

```ts
export interface ResolvedWidgetRuntime {
  readonly widgetId: string;
  readonly publicWidgetKey: string;
  readonly calculatorId: SupportedCalculatorId;
  readonly locale: Locale;
  readonly parentOrigin: string;
  readonly domainId: string;
  readonly theme: WidgetTheme;
  readonly branding: "foundcalc" | "hidden";
  readonly defaults: WidgetDefaultConfiguration;
  readonly analyticsLevel: WidgetAnalyticsLevel;
}

export const resolvePublicWidgetRuntime: (input: {
  readonly publicWidgetKey: string;
  readonly parentOrigin: string;
  readonly now?: Date;
}, services: WidgetRuntimeServices) => Promise<
  { readonly ok: true; readonly value: ResolvedWidgetRuntime } |
  { readonly ok: false; readonly code: "unavailable" }
>;
```

All lookup/status/entitlement/origin failures collapse to public `unavailable`.

```ts
export const buildWidgetCsp: (authorizedParentOrigin: string, nonce?: string) => string;
export const isEmbedHostRequest: (requestUrl: URL, configuredEmbedOrigin: string) => boolean;
```

CSP includes `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, first-party-only connect/script/style/font/image requirements compatible with the built app, and exact `frame-ancestors <authorized-parent-origin>`.

- [ ] **Step 1: Write runtime tests for valid Friends/Besties/Family, unknown key, disabled/revoked widget/domain, entitlement-limited domain, expired downgrade, unauthorized parent origin, apex/`www`, sibling subdomain rejection, rotated key, and generic error code.**

- [ ] **Step 2: Write CSP tests asserting exact parent origin, no wildcard, and no user-controlled directives.**

- [ ] **Step 3: Run tests and confirm RED.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/runtime.test.ts src/lib/widgets/security.test.ts`
Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement runtime resolver from repositories + `CommercialAccessAuthorizer` + `selectEffectiveWidgetDomains`; compute branding server-side.**

Friends always returns `branding: "foundcalc"` and default theme regardless of stored preference.

- [ ] **Step 5: Implement `src/proxy.ts` matcher for `/embed/:path*` and `/widget-preview/:path*`. For public embed requests, normalize `parentOrigin`, perform the same server authorization service, return a generic 404-like unavailable response on failure, and set dynamic CSP on successful response.**

Next.js 16 pattern:

```ts
export const config = { matcher: ["/embed/:path*", "/widget-preview/:path*"] };
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
```

The proxy must overwrite/ignore any incoming internal widget headers rather than trust caller-supplied versions.

- [ ] **Step 6: Add embed-origin host allowlist policy: on configured embed origin permit only `/embed/*`, `/embed.js`, `/api/embed/*`, public read-only `/api/rules/*`, and framework/static assets. Reject auth, workspace, billing, and admin routes on embed origin. Public app origin remains unchanged.**

- [ ] **Step 7: Run unit/foundation tests.**

Run: `pnpm --filter @found-calc/web test:unit && pnpm test:foundation`
Expected: PASS.

- [ ] **Step 8: Run Next and vinext compatibility gates immediately, before building more code on proxy behavior.**

Run: `pnpm --filter @found-calc/web build`
Expected: PASS.

Run: `pnpm --filter @found-calc/web vinext:check && pnpm --filter @found-calc/web build:vinext`
Expected: PASS. If the pinned vinext `1.0.0-beta.8` rejects Next 16 `proxy.ts`, stop this task and use `superpowers:systematic-debugging`; do not silently fall back to weaker static CSP. Treat a required adapter upgrade or alternate response-header boundary as explicit change control against this approved plan.

- [ ] **Step 9: Commit.**

```bash
git add apps/web/src/lib/widgets/runtime.ts apps/web/src/lib/widgets/runtime.test.ts apps/web/src/lib/widgets/security.ts apps/web/src/lib/widgets/security.test.ts apps/web/src/proxy.ts apps/web/tests/foundation/phase-07b-proxy-contract.test.mjs
git commit -m "feat: authorize widget embed runtime"
```

---

### Task 12: Build Public Iframe Route, Effective Theme/Branding, and Accessibility Shell

**Files:**
- Create: `apps/web/src/app/embed/[publicWidgetKey]/page.tsx`
- Create: `apps/web/src/components/widgets/widget-frame.tsx`
- Create: `apps/web/src/components/widgets/widget-frame.test.tsx` when supported; otherwise foundation/E2E assertions.
- Modify: `apps/web/src/app/globals.css` only for controlled widget token mappings that are reused by the frame.

**Interfaces:**

`WidgetFrame` receives only `ResolvedWidgetRuntime` + catalog entry and renders `CalculatorRenderer` with `surface: "widget"`.

Branding behavior:

```tsx
{runtime.branding === "foundcalc" ? (
  <a href={publicAppOrigin} target="_blank" rel="noopener noreferrer">Powered by Found Calc</a>
) : null}
```

Trust/source/warning panels remain part of calculator output and are never hidden by branding/theme.

- [ ] **Step 1: Write route/frame tests for generic unavailable state, localized title/content, Friends attribution, Besties hidden attribution, Family hidden attribution, and controlled theme class/token mapping.**

- [ ] **Step 2: Run tests and confirm RED.**

- [ ] **Step 3: Implement dynamic embed page; re-run `resolvePublicWidgetRuntime` in the page as defense in depth and call `notFound()`/generic unavailable rendering without owner metadata on denial.**

- [ ] **Step 4: Render the same catalog entry and shared calculator renderer; do not include site header, auth, workspace, persistence, or pricing UI.**

- [ ] **Step 5: Implement controlled theme tokens only; reject/raw-ignore arbitrary CSS strings at parser boundary. Ensure focus ring/trust colors are not overridden by accent.**

- [ ] **Step 6: Add accessible embedded-context heading/main behavior and persistent Friends link after calculator content. `showTitle=false` may visually hide the title but must preserve an accessible name/heading.**

- [ ] **Step 7: Run unit/foundation/build/typecheck.**

Run: `pnpm --filter @found-calc/web test:unit && pnpm test:foundation && pnpm --filter @found-calc/web typecheck && pnpm --filter @found-calc/web build`
Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add apps/web/src/app/embed apps/web/src/components/widgets/widget-frame.tsx apps/web/src/app/globals.css
git commit -m "feat: render hosted widget iframe"
```

---

### Task 13: Add Versioned One-Way Lifecycle Protocol and Tiny Embed Loader

**Files:**
- Create: `apps/web/src/lib/widgets/protocol.ts`
- Create: `apps/web/src/lib/widgets/protocol.test.ts`
- Create: `apps/web/src/components/widgets/widget-lifecycle.tsx`
- Create: `apps/web/public/embed.js`
- Create: `apps/web/tests/foundation/phase-07b-embed-loader-contract.test.mjs`

**Interfaces:**

```ts
export const FOUND_CALC_WIDGET_PROTOCOL_VERSION = 1 as const;
export type FoundCalcWidgetMessage =
  | { readonly type: "foundcalc:ready"; readonly protocolVersion: 1; readonly widgetKey: string }
  | { readonly type: "foundcalc:resize"; readonly protocolVersion: 1; readonly widgetKey: string; readonly heightPx: number };

export const parseWidgetMessage: (value: unknown) => FoundCalcWidgetMessage | null;
```

Height is finite integer and clamped by host loader to `160..4000` px.

- [ ] **Step 1: Write parser tests rejecting unknown types, wrong protocol version, missing/wrong key, non-finite/negative/huge resize values, and any unexpected command shape.**

- [ ] **Step 2: Run focused tests and confirm RED.**

- [ ] **Step 3: Implement child lifecycle component using `ResizeObserver`, `requestAnimationFrame` coalescing, change-only height sends, and exact `postMessage(payload, runtime.parentOrigin)` target. Send `ready` once after mount.**

- [ ] **Step 4: Implement `public/embed.js` without imports/dependencies. Derive embed origin from the loader script URL, find `[data-foundcalc-widget]`, create sandboxed iframes, and use `location.origin` as encoded `parentOrigin`.**

Generated iframe sandbox:

```text
allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox
```

Do not include top-navigation, form, or storage-access capabilities.

- [ ] **Step 5: Validate messages in loader with all four checks: `event.origin === embedOrigin`, `event.source === iframe.contentWindow`, exact widget key/version/type, valid height. No parent→child messages are sent.**

- [ ] **Step 6: Support multiple widgets and optional generated `data-foundcalc-title`; default iframe title is `Found Calc calculator` only when localized title is not supplied.**

- [ ] **Step 7: Add source-contract test asserting loader contains no framework import, no input/result extraction, no `postMessage(..., "*")`, and no parent command protocol.**

- [ ] **Step 8: Run focused tests, lint, and build.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/protocol.test.ts && pnpm test:foundation && pnpm --filter @found-calc/web lint && pnpm --filter @found-calc/web build`
Expected: PASS.

- [ ] **Step 9: Commit.**

```bash
git add apps/web/src/lib/widgets/protocol.ts apps/web/src/lib/widgets/protocol.test.ts apps/web/src/components/widgets/widget-lifecycle.tsx apps/web/public/embed.js apps/web/tests/foundation/phase-07b-embed-loader-contract.test.mjs
git commit -m "feat: add responsive widget embed loader"
```

---

### Task 14: Implement Privacy-Safe Aggregate Analytics

**Files:**
- Create: `apps/web/src/lib/widgets/analytics.ts`
- Create: `apps/web/src/lib/widgets/analytics.test.ts`
- Create: `apps/web/src/app/api/embed/[publicWidgetKey]/events/route.ts`
- Extend: `apps/web/tests/cloudflare/phase-07b-widget-api.test.ts`
- Modify: `apps/web/src/components/widgets/widget-frame.tsx`
- Modify: `apps/web/src/components/calculator/calculator-surface.tsx` only to connect existing lifecycle callback.

**Interfaces:**

```ts
export interface WidgetAnalyticsEvent {
  readonly schemaVersion: 1;
  readonly eventType: WidgetEventType;
  readonly widgetKey: string;
  readonly parentOrigin: string;
}
```

Server derives `widgetId`, `domainId`, `calculatorId`, and locale from runtime resolution; client cannot submit those authoritative IDs.

No API schema contains an `input`, `result`, `value`, `amount`, `salary`, `income`, `revenue`, `tax`, `debt`, `health`, or `fiqh` payload field.

- [ ] **Step 1: Write parser/service tests accepting only four event types and rejecting extra/raw-value payloads, oversized bodies, invalid key/origin, revoked runtime, and unauthorized domains.**

- [ ] **Step 2: Write repository integration test that two completions increment one daily aggregate row and never create raw event rows.**

- [ ] **Step 3: Run focused tests and confirm RED.**

- [ ] **Step 4: Implement POST event route. Re-resolve public runtime from widget key + parentOrigin, derive all authoritative metadata, and write aggregate best effort. Return `204` for accepted event; analytics storage failure returns `204` after safe logging without raw payload values so calculation UX never fails.**

- [ ] **Step 5: Add bounded opportunistic cleanup deleting aggregate rows older than 90 days only during management analytics reads or a low-frequency bounded write path; do not add a paid scheduler/service.**

- [ ] **Step 6: Wire `widget_viewed` from frame mount and calculator lifecycle events from shared surface. CTA event is emitted only for first-party widget CTA links that actually exist; do not invent a CTA solely for analytics.**

- [ ] **Step 7: Run unit/Cloudflare tests and inspect source for forbidden raw fields.**

Run: `pnpm --filter @found-calc/web test:unit && pnpm --filter @found-calc/web test:cloudflare`
Expected: PASS.

Run: `rg -n "salary|income|revenue|taxValue|debt|health|fiqh|rawInput|resultValue" apps/web/src/lib/widgets apps/web/src/app/api/embed`
Expected: no analytics payload/storage fields; legitimate comments/tests must be reviewed manually.

- [ ] **Step 8: Commit.**

```bash
git add apps/web/src/lib/widgets/analytics* apps/web/src/app/api/embed apps/web/src/components/widgets/widget-frame.tsx apps/web/src/components/calculator/calculator-surface.tsx apps/web/tests/cloudflare/phase-07b-widget-api.test.ts
git commit -m "feat: add privacy-safe widget analytics"
```

---

### Task 15: Build Purpose-Built Widget Management UX and Progressive Creation Flow

**Files:**
- Create: `apps/web/src/lib/widgets/client.ts`
- Create: `apps/web/src/lib/widgets/client.test.ts`
- Create: `apps/web/src/app/[locale]/(workspace)/workspace/widgets/page.tsx`
- Create: `apps/web/src/app/[locale]/(workspace)/workspace/widgets/[widgetId]/page.tsx`
- Create: `apps/web/src/components/widgets/widget-manager.tsx`
- Create focused components such as `widget-list.tsx`, `widget-creation-flow.tsx`, `widget-configurator.tsx`, and `widget-analytics-summary.tsx` if `widget-manager.tsx` exceeds one coherent responsibility.
- Modify: `apps/web/src/components/site-header.tsx` or the existing workspace navigation surface minimally.
- Create: `apps/web/tests/e2e/phase-07b-widget-management.spec.ts`

**UX contract:**

List columns/semantic fields: Widget Name / Calculator, Domain, Plan capability, Status, Branding, Last activity, Actions.

Creation steps:

```text
Choose calculator → Select locale → Add/choose domain → Verify domain → Appearance → Safe defaults → Preview → Copy embed code
```

- [ ] **Step 1: Write client tests for management DTO decoding and error mapping.**

- [ ] **Step 2: Write Playwright tests for signed-out redirect/optional behavior consistent with existing workspace auth, ID/EN list rendering, create flow, Friends forced branding, Besties appearance controls, domain capacity messaging, copy embed code, disable/re-enable, and rotate-key confirmation.**

- [ ] **Step 3: Run focused tests and confirm RED.**

Run: `pnpm --filter @found-calc/web test:unit`
Expected: client tests FAIL.

Run: `pnpm --filter @found-calc/web test:e2e -- --grep "widget management"`
Expected: E2E FAIL because pages do not exist.

- [ ] **Step 4: Implement typed fetch client with `credentials: "include"` and no provider/billing IDs exposed to UI.**

- [ ] **Step 5: Implement list as semantic table/list rather than card grid; mobile renders stacked labelled rows without horizontal overflow.**

- [ ] **Step 6: Implement progressive creation flow; save unverified production widgets as `Needs verification` and do not issue a usable public embed until an effective verified binding exists.**

- [ ] **Step 7: Generate embed code from effective public key + localized title only; do not add `hideBranding` or entitlement query parameters.**

```html
<script defer src="https://<configured-embed-origin>/embed.js"></script>
<div data-foundcalc-widget="fcw_..." data-foundcalc-title="..."></div>
```

- [ ] **Step 8: Implement analytics summary only when effective access allows standard/advanced analytics; Friends still sees operational `Last activity` but no analytics dashboard.**

- [ ] **Step 9: Run unit/E2E/accessibility smoke, lint, typecheck.**

Run: `pnpm --filter @found-calc/web test:unit && pnpm --filter @found-calc/web test:e2e -- --grep "widget management" && pnpm --filter @found-calc/web lint && pnpm --filter @found-calc/web typecheck`
Expected: PASS.

- [ ] **Step 10: Commit.**

```bash
git add apps/web/src/lib/widgets/client* apps/web/src/app/[locale]/\(workspace\)/workspace/widgets apps/web/src/components/widgets apps/web/src/components/site-header.tsx apps/web/tests/e2e/phase-07b-widget-management.spec.ts
git commit -m "feat: add widget management workspace"
```

---

### Task 16: Add Owner-Authenticated Isolated Preview Using Production Render Model

**Files:**
- Create: `apps/web/src/app/widget-preview/[widgetId]/page.tsx`
- Extend: `apps/web/src/lib/widgets/runtime.ts`
- Extend: `apps/web/src/lib/widgets/security.ts` / `apps/web/src/proxy.ts` for preview framing policy.
- Modify: `apps/web/src/components/widgets/widget-configurator.tsx` or equivalent.
- Extend: `apps/web/tests/e2e/phase-07b-widget-management.spec.ts`

**Interfaces:**

```ts
export const resolveWidgetPreviewRuntime: (input: {
  readonly widgetId: string;
  readonly ownerUserId: string;
  readonly now?: Date;
}, services: WidgetRuntimeServices) => Promise<ResolvedWidgetRuntime | null>;
```

Preview bypasses only public-domain authorization. It still applies effective current tier, branding, theme, calculator ID, locale, defaults, rule path, and widget surface policy.

- [ ] **Step 1: Write runtime tests proving wrong owner cannot preview, Friends preview forces attribution, downgraded Besties preview immediately shows Friends capability, and revoked widget preview is unavailable.**

- [ ] **Step 2: Write E2E test for width presets 320, 390, and container/desktop using the iframe preview route.**

- [ ] **Step 3: Run tests and confirm RED.**

- [ ] **Step 4: Implement preview resolver using Better Auth session on main application origin and the same `WidgetFrame` + `CalculatorRenderer`; do not create fake result/appearance markup.**

- [ ] **Step 5: Set preview CSP to `frame-ancestors 'self'` (main application workspace) and never expose preview route on the dedicated embed origin.**

- [ ] **Step 6: Run unit/E2E/build/vinext checks.**

Run: `pnpm --filter @found-calc/web test:unit && pnpm --filter @found-calc/web test:e2e -- --grep "widget management|preview" && pnpm --filter @found-calc/web build && pnpm --filter @found-calc/web vinext:check`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add apps/web/src/app/widget-preview apps/web/src/lib/widgets/runtime* apps/web/src/lib/widgets/security* apps/web/src/proxy.ts apps/web/src/components/widgets apps/web/tests/e2e/phase-07b-widget-management.spec.ts
git commit -m "feat: add widget runtime preview"
```

---

### Task 17: Prove Public/Widget Calculation Truth Parity for Three Reference Slices

**Files:**
- Create: `apps/web/src/lib/widgets/parity.test.ts`
- Extend: `apps/web/src/lib/calculators/runtime.test.ts`
- Create/Extend: `apps/web/tests/e2e/phase-07b-widget-runtime.spec.ts`

**Test fixtures:**

Discount fixture: canonical base amount + multiple ordered discounts.

Business Margin fixture: selling price/product cost plus contextual variable selling cost, including scenario/recommendation path already emitted by engine.

Synthetic fixture: base amount + explicit effective date + exact published synthetic rule version set.

- [ ] **Step 1: Write parity helper that runs the existing `runDiscount`, `runBusinessMargin`/scenario, and `runSyntheticRule` functions from a public-surface fixture and a widget-surface fixture and compares complete `CalculationOutcome` objects.**

Do not implement a second widget calculation function merely to make the test pass.

- [ ] **Step 2: Add assertions for primary answer, sections, assumptions, scenarios/recommendations where applicable, rule dependencies/provenance, calculator version, and normalized inputs.**

- [ ] **Step 3: Run focused parity test; it should PASS only after shared surface work because both surfaces call the existing runtime. If it fails, use systematic debugging and fix surface/context drift rather than engine truth.**

Run: `pnpm --filter @found-calc/web exec vitest run src/lib/widgets/parity.test.ts src/lib/calculators/runtime.test.ts`
Expected: PASS.

- [ ] **Step 4: Write browser E2E that embeds all three reference calculators on approved local test hosts and compares visible canonical-equivalent results with corresponding main-app routes.**

- [ ] **Step 5: Run E2E.**

Run: `pnpm --filter @found-calc/web test:e2e -- --grep "Phase 07B widget runtime"`
Expected: PASS.

- [ ] **Step 6: Verify engine/rules source has no Phase 07B formula edits unless a previously approved blocker exists.**

Run: `git diff d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44 -- packages/engine packages/rules`
Expected: no formula/business-rule changes. Test-only additions are acceptable only if required for parity and reviewed explicitly.

- [ ] **Step 7: Commit.**

```bash
git add apps/web/src/lib/widgets/parity.test.ts apps/web/src/lib/calculators/runtime.test.ts apps/web/tests/e2e/phase-07b-widget-runtime.spec.ts
git commit -m "test: prove widget calculation parity"
```

---

### Task 18: Browser Security, Responsive Resize, and Accessibility Verification

**Files:**
- Extend: `apps/web/tests/e2e/phase-07b-widget-runtime.spec.ts`
- Create: `apps/web/tests/e2e/phase-07b-widget-accessibility.spec.ts`
- Create: `apps/web/tests/e2e/widget-host-server.ts` — small Node HTTP fixture serving host pages on distinct loopback ports; no production dependency.

**Host test setup:**

Use app on `127.0.0.1:3000` and fixture host pages on explicitly configured local-development origins such as `http://127.0.0.1:3101` and `http://127.0.0.1:3102`. The local verification mechanism must be enabled only in test/development configuration and only for these loopback ports.

- [ ] **Step 1: Add valid-host vs unauthorized-host browser test using actual iframe navigation.**

Valid host loads calculator. Unauthorized host is blocked/gets generic unavailable and cannot read iframe DOM due cross-origin boundary.

- [ ] **Step 2: Add copied-widget-URL test: same public key on an unbound host must not render despite correct key.**

- [ ] **Step 3: Add message spoof tests by dispatching messages with wrong origin/source/key/version/type and assert iframe height is unchanged.**

- [ ] **Step 4: Add ResizeObserver flow tests: dynamic Discount rows, validation errors, Business Margin result expansion, and synthetic provenance all resize without clipping.**

- [ ] **Step 5: Add 320px/390px tests for no horizontal overflow, zoom/reflow, keyboard-only traversal, visible focus, labels/errors, dynamic result announcement, and persistent Friends attribution.**

- [ ] **Step 6: Add ID/EN embedded title/labels and synthetic warning/provenance checks.**

- [ ] **Step 7: Add CSP/sandbox assertions from network/DOM: exact `frame-ancestors`, no wildcard, sandbox lacks top-navigation/forms/storage-access permissions.**

- [ ] **Step 8: Run Phase 07B E2E files repeatedly once to catch resize races.**

Run: `pnpm --filter @found-calc/web exec playwright test tests/e2e/phase-07b-widget-runtime.spec.ts tests/e2e/phase-07b-widget-accessibility.spec.ts --repeat-each=2`
Expected: PASS with no retries required for deterministic resize assertions.

- [ ] **Step 9: Commit.**

```bash
git add apps/web/tests/e2e/phase-07b-widget-runtime.spec.ts apps/web/tests/e2e/phase-07b-widget-accessibility.spec.ts apps/web/tests/e2e/widget-host-server.ts
git commit -m "test: harden widget browser security"
```

---

### Task 19: Cloudflare Configuration, Worker Smoke, and Phase 07B Verification Gate

**Files:**
- Modify: `apps/web/.dev.vars.example`
- Modify: `apps/web/wrangler.jsonc` only for non-secret documented host/config needs that are actually required by implementation.
- Create: `scripts/smoke-phase-07b-worker.sh`
- Create: `scripts/verify-phase-07b.mjs`
- Modify: root `package.json`
- Create: `tests/foundation/phase-07b-verification-contract.test.mjs`
- Create: `.github/workflows/phase-07b-verification.yml`

**Environment contract:**

Document non-secret examples for `PUBLIC_APP_ORIGIN`, `EMBED_APP_ORIGIN`, and local allowed widget ports (for example `WIDGET_LOCAL_DEV_PORTS=3101,3102`). Do not commit production domains, secrets, auth tokens, or provider identities.

`verify:phase07b` order starts with inherited gate:

```js
const steps = [
  ["canonical Phase 07A regression gate", "pnpm", ["verify:phase07a"]],
  ["Phase 07B foundation contracts", "pnpm", ["test:foundation"]],
  ["Phase 07B web unit tests", "pnpm", ["--filter", "@found-calc/web", "test:unit"]],
  ["Phase 07B Cloudflare tests", "pnpm", ["--filter", "@found-calc/web", "test:cloudflare"]],
  ["Phase 07B lint", "pnpm", ["--filter", "@found-calc/web", "lint"]],
  ["Phase 07B typecheck", "pnpm", ["--filter", "@found-calc/web", "typecheck"]],
  ["Phase 07B Playwright", "pnpm", ["--filter", "@found-calc/web", "test:e2e"]],
  ["Phase 07B Next build", "pnpm", ["--filter", "@found-calc/web", "build"]],
  ["Phase 07B vinext check", "pnpm", ["--filter", "@found-calc/web", "vinext:check"]],
  ["Phase 07B vinext build", "pnpm", ["--filter", "@found-calc/web", "build:vinext"]],
  ["Phase 07B Worker smoke", "bash", ["scripts/smoke-phase-07b-worker.sh"]],
];
```

- [ ] **Step 1: Write verification-contract test first asserting root script exists, `verify:phase07b` invokes `verify:phase07a`, required Phase 07B suites/builds/smoke are present, and migrations `0001`–`0005` remain in the canonical chain.**

- [ ] **Step 2: Run foundation test and confirm RED.**

Run: `pnpm test:foundation`
Expected: FAIL because Phase 07B verification script/workflow do not exist.

- [ ] **Step 3: Add `.dev.vars.example` documented non-secret widget origin/local-port settings.**

- [ ] **Step 4: Build worker smoke script that applies migrations `0001`–`0006` to local D1, launches built vinext Worker, exercises one valid local widget embed, one unauthorized origin/key case, rule feed path, and confirms auth/workspace paths are unavailable on simulated embed-host routing where the harness can set the Host header.**

- [ ] **Step 5: Add `scripts/verify-phase-07b.mjs`, root `verify:phase07b`, and CI workflow with the same test environment placeholders used by prior phases plus non-secret widget origin config.**

- [ ] **Step 6: Run foundation contract and focused build/smoke.**

Run: `pnpm test:foundation`
Expected: PASS.

Run: `pnpm --filter @found-calc/web build:vinext && bash scripts/smoke-phase-07b-worker.sh`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add apps/web/.dev.vars.example apps/web/wrangler.jsonc scripts/smoke-phase-07b-worker.sh scripts/verify-phase-07b.mjs package.json tests/foundation/phase-07b-verification-contract.test.mjs .github/workflows/phase-07b-verification.yml
git commit -m "ci: add Phase 07B verification gate"
```

---

### Task 20: Full Review Gate Before Closure Docs

**Files:** all Phase 07B implementation files; no closure-doc edits yet.

- [ ] **Step 1: Run `superpowers:requesting-code-review` against the complete diff from canonical Phase 07A.**

Review specifically for:

```text
calculation truth duplication
domain authorization bypass
Origin/Referer trust mistakes
CSP/frame-ancestors correctness
postMessage direction/source/origin/schema validation
Friends branding bypass
Besties/Family entitlement drift
downgrade destructive writes
raw analytics values
widget persistence/auth leakage
arbitrary CSS/HTML/JS paths
Phase 08/Portfolio/API scope leakage
```

- [ ] **Step 2: Process every material review finding with `superpowers:receiving-code-review`; verify each suggestion against repository/runtime facts before editing.**

- [ ] **Step 3: For every accepted defect, add/reproduce a failing regression test before the fix, then run RED→GREEN.**

- [ ] **Step 4: Run the complete verification gate fresh.**

Run: `pnpm verify:phase07b`
Expected: PASS, exit 0, including inherited `verify:phase07a`.

- [ ] **Step 5: If any command fails, use `superpowers:systematic-debugging`; do not write completion docs while verification is red.**

- [ ] **Step 6: Commit review fixes only after focused tests and `pnpm verify:phase07b` are green.**

```bash
git add <reviewed-files>
git commit -m "fix: address Phase 07B review findings"
```

Skip this commit only when review produced no code changes.

---

### Task 21: Close Phase 07B Documentation and Canonical Artifact Contracts

**Files:**
- Create: `docs/verification/phase-07b-verification.md`
- Modify: `BASELINE.md`
- Modify: `PHASE_HANDOFF.md`
- Modify: `PHASE_CHAT_TEMPLATE.md` only if the canonical next-chat template requires the new Phase 08A starting point.
- Create: `.github/workflows/phase-07b-baseline-artifact.yml`
- Extend: `tests/foundation/phase-07b-verification-contract.test.mjs`

**Closure document must record:**

- Phase 07A canonical predecessor SHA `d54344e8...`.
- Phase 07B branch and exact pre-merge verification head.
- migration `0006` provenance and `0001`–`0005` immutability.
- Friends/Besties/Family verified domain/branding/theme/analytics behavior.
- public/widget parity evidence for all three reference slices.
- browser CSP/postMessage/accessibility/responsive evidence.
- exact `pnpm verify:phase07b` fresh result.
- canonical artifact name `found-calc-phase-07b-widget-platform-foundation.zip` and SHA256 generation/verification procedure.
- explicit next phase `Phase 08A — Quick Mathematical Primitives` and rule that Phase 08 calculators register once into the shared renderer rather than creating widget-specific calculators.

- [ ] **Step 1: Write failing closure contract asserting required docs/workflow/artifact name/provenance fields.**

- [ ] **Step 2: Run foundation test and confirm RED.**

Run: `pnpm test:foundation`
Expected: FAIL because closure docs/workflow are absent.

- [ ] **Step 3: Write `phase-07b-verification.md` only from fresh evidence produced by Task 20; do not claim remote deployment or checks that were not run.**

- [ ] **Step 4: Update `BASELINE.md` and `PHASE_HANDOFF.md` preserving Phase 07A provenance and marking Phase 07B as the new additive canonical candidate pending merge.**

- [ ] **Step 5: Add baseline artifact workflow based on prior canonical workflows, but package exact merge SHA when run on `main`; required-file list includes spec, plan, migration 0006, widget runtime/security/loader/management files, verification doc, and Phase 07B scripts/tests.**

Artifact steps:

```bash
git archive --format=zip --output=found-calc-phase-07b-widget-platform-foundation.zip "$GITHUB_SHA"
sha256sum found-calc-phase-07b-widget-platform-foundation.zip > SHA256SUMS
unzip -tq found-calc-phase-07b-widget-platform-foundation.zip
```

Also scan archive for `.env`, `.dev.vars`, `.env.local`, `node_modules`, `.next`, `dist`, `.wrangler`, Playwright reports/results, and other generated/local state.

- [ ] **Step 6: Run closure contract plus full gate again because closure files/workflow are part of canonical output.**

Run: `pnpm test:foundation && pnpm verify:phase07b`
Expected: PASS.

- [ ] **Step 7: Commit closure docs/workflow.**

```bash
git add docs/verification/phase-07b-verification.md BASELINE.md PHASE_HANDOFF.md PHASE_CHAT_TEMPLATE.md .github/workflows/phase-07b-baseline-artifact.yml tests/foundation/phase-07b-verification-contract.test.mjs
git commit -m "docs: close Phase 07B widget platform"
```

---

### Task 22: Final Verification, PR, Merge, and Canonical SHA

**Files:** no implementation changes unless verification/review discovers a defect.

- [ ] **Step 1: Use `superpowers:verification-before-completion`; run fresh full Phase 07B gate at exact branch HEAD.**

Run: `git rev-parse HEAD && pnpm verify:phase07b`
Expected: exact HEAD printed; all steps PASS; exit 0.

- [ ] **Step 2: Re-run secret/generated-state checks against the exact diff.**

```bash
git diff --name-only d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44...HEAD
find . -maxdepth 4 -type f \( -name '.env' -o -name '.env.local' -o -name '.dev.vars' \) -print
```

Expected: no secret-bearing local env files are tracked/added; only `.dev.vars.example` is permitted.

- [ ] **Step 3: Verify no Phase 08 production calculator, Portfolio runtime, public Calculation API/SDK, arbitrary CSS/custom-formula feature, or provider secret leaked into diff.**

- [ ] **Step 4: Use `superpowers:finishing-a-development-branch` to prepare merge. Create PR from `phase-07b-widget-platform-foundation` to `main` with canonical predecessor, spec/plan links, verification evidence, migration statement, security model, and explicit out-of-scope statement.**

- [ ] **Step 5: Wait only for required synchronous GitHub checks/review visible in the current session; do not claim success from pending checks. Address material review feedback with receiving-code-review + TDD.**

- [ ] **Step 6: Immediately before merge, verify branch HEAD and required checks again. Merge only when required checks are green.**

- [ ] **Step 7: Fetch merged `main`, record the exact merge SHA as canonical Phase 07B source, and verify it contains the Phase 07B tree.**

- [ ] **Step 8: Verify canonical artifact workflow output for the merged SHA: ZIP integrity PASS and SHA256 matches generated `SHA256SUMS`. If workflow artifact bytes are available through GitHub connector, download and independently verify; otherwise record only the GitHub workflow evidence actually observable.**

- [ ] **Step 9: Stop. Do not begin Phase 08A in this chat.**

---

## Self-Review Checklist for This Plan

The plan must not be considered approved for execution until all checks below are true:

- Every design-spec area maps to at least one task: purpose/non-goals; architecture; widget identity/config; domain verification; entitlement; runtime; iframe/protocol; theme/branding; analytics/privacy; threat model; persistence; workspace UX; reference slices; testing; accessibility; Cloudflare/cost; rollout; DoD; Phase 08 handoff.
- No task creates a second calculation engine, public Calculation API, SDK, Web Component, arbitrary CSS, custom formula, Portfolio runtime, production Phase 08 calculator, or widget authentication.
- Friends/Besties/Family limits are consumed from Phase 07A effective access rather than copied from plan-name strings.
- `0001`–`0005` remain immutable and `0006` is additive.
- Public embed authorization does not rely on `Origin`/`Referer` alone and combines server-verified binding with exact dynamic `frame-ancestors`.
- Public key randomness is enumeration resistance, not the sole authorization boundary.
- Parent messaging is one-way and contains no raw calculator values.
- Widget calculators suppress local draft/persistence/workspace state.
- Synthetic rule reference keeps explicit effective date and existing published rule feed/provenance.
- Analytics stores daily aggregates only and contains no raw input/result values.
- Preview reuses the production render model and bypasses only public-domain authorization after owner authentication.
- `verify:phase07b` begins with `verify:phase07a`.
- Full Next build, vinext check/build, Worker smoke, Cloudflare tests, browser security/accessibility, code review, closure docs, artifact verification, and exact merged SHA are explicit gates.
- Implementation stops after canonical Phase 07B merge; next chat is Phase 08A — Quick Mathematical Primitives.
