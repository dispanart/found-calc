# Found Calc Phase 07B — Widget Platform Foundation Design

**Status:** Approved in-chat design, pending written-spec review gate  
**Date:** 2026-08-31  
**Phase:** 07B — Widget Platform Foundation  
**Branch:** `phase-07b-widget-platform-foundation`  
**Canonical predecessor:** Phase 07A — Commercial, Trial & Google Auth Amendment  
**Canonical base SHA:** `d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44`

## 1. Purpose and non-goals

Phase 07B adds one reusable first-party Widget Platform Foundation on top of the completed Phase 07A baseline. Its purpose is to make calculator delivery embeddable before Phase 08 Frozen V1 catalog production, so future calculators can inherit widget capability instead of receiving calculator-specific embed implementations.

The governing invariant is:

> same calculator truth, different delivery surface

The widget runtime therefore reuses the existing calculator definition, deterministic engine, rule resolution, result model, locale system, trust/source contracts, and calculator interaction/runtime boundaries. Phase 07B does not create a second calculation engine, duplicate formulas, duplicate regulatory or rule truth, or introduce widget-specific business logic.

Phase 01 through Phase 07A remain completed canonical baseline. Phase 07B is additive. Existing behavior is reopened only for a verified implementation blocker under explicit change control.

### 1.1 Included

Phase 07B includes:

- a hosted iframe widget runtime;
- a tiny framework-independent first-party embed loader;
- a shared calculator renderer registry used by both public and widget delivery surfaces;
- widget configuration and public embed identity;
- verified-domain registration, DNS TXT ownership verification, binding, revocation, disablement, and entitlement-aware effective activation;
- server-authoritative Friends, Besties, and Family widget capability enforcement using the Phase 07A commercial entitlement resolver;
- controlled theme customization and server-derived branding behavior;
- a narrow one-way iframe lifecycle protocol for readiness and responsive resizing;
- privacy-safe widget analytics aggregates;
- a purpose-built ID/EN widget-management workspace surface, creation flow, preview, and embed-code generation;
- additive D1 persistence in migration `0006_phase07b_widget_platform.sql`;
- reference validation using exactly the existing Discount, Business Margin/Profit, and synthetic rule-aware slices;
- regression fixtures proving public/widget calculation truth parity;
- security, accessibility, Cloudflare, cost, and compatibility verification;
- a dedicated `pnpm verify:phase07b` gate that includes the complete canonical Phase 07A regression gate.

### 1.2 Explicit non-goals

Phase 07B does not implement:

- Frozen V1 catalog calculator production;
- Phase 08 calculator content;
- Family Portfolio runtime;
- a public headless Calculation API;
- external developer REST APIs or public API keys;
- an arbitrary JavaScript SDK;
- Web Components or framework packages;
- WordPress, Shopify, Webflow, CMS, or marketplace plugins;
- an AI widget builder;
- arbitrary CSS, HTML, JavaScript, custom formulas, or custom renderer injection;
- marketplace-specific widget runtime;
- payment checkout inside widgets;
- authentication inside widgets;
- custom widget domains;
- custom client logos/assets or arbitrary fonts;
- public developer event streams or custom analytics event APIs;
- later-phase bulk operations or Portfolio functionality.

## 2. Approved baseline and architecture constraints

The Phase 07A baseline establishes the following constraints that Phase 07B must preserve:

- `@found-calc/engine` remains the sole deterministic calculation truth boundary;
- `@found-calc/rules` remains the rule-resolution boundary and must not be duplicated in widget code;
- calculator definitions and result contracts remain locale-independent calculation identities;
- localized copy, labels, trust presentation, and product interaction remain outside engine truth;
- D1 remains server-authoritative persistence for application authorization and entitlement state;
- commercial entitlement is distinct from runtime availability;
- the canonical Friends / Besties / Family commercial coordinates remain authoritative;
- the existing workspace, auth, persistence, billing, and rule platforms remain intact;
- migrations `0001` through `0005` remain immutable;
- ID and EN remain first-class supported locales;
- the approved responsive/accessibility contract remains mandatory;
- fixed infrastructure should remain approximately Rp0 while within free tiers, excluding domain/payment transaction fees;
- Phase 07B must preserve the full Phase 07A regression gate rather than replace it.

The current application already centralizes calculation execution in `apps/web/src/lib/calculators/runtime.ts` and delegates arithmetic to `@found-calc/engine`, while the three existing public calculators own calculator-specific React interaction flows. Phase 07B therefore introduces a reusable delivery boundary around existing interaction/runtime code rather than a generic schema renderer or a new engine.

## 3. Architecture approaches considered

### 3.1 Approach A — direct hosted iframe only

Customers paste a direct iframe whose `src` points to Found Calc.

Advantages:

- smallest JavaScript footprint;
- strong isolation by default;
- framework-independent;
- small attack surface.

Disadvantages:

- responsive iframe height is difficult without customer-side scripting;
- installation quality varies by customer;
- customers must understand sizing and messaging details;
- multiple widgets on one page are less ergonomic.

This approach is secure but insufficient as the primary product experience.

### 3.2 Approach B — hosted iframe + tiny loader + shared renderer registry

Customers paste a small first-party loader snippet. The loader creates and manages a cross-origin Found Calc iframe. The iframe resolves widget configuration and renders the target calculator through a shared renderer registry that also serves the public Found Calc surface.

Conceptual flow:

```text
Host Website
    ↓
Found Calc embed.js
    ↓
Found Calc hosted iframe
    ↓
Widget Runtime Resolver
    ↓
Shared Calculator Renderer Registry
    ↓
Existing Calculator Runtime
    ↓
@found-calc/engine
    ↓
@found-calc/rules when required
```

Advantages:

- keeps iframe isolation;
- provides simple installation;
- enables robust automatic resizing;
- has no host-framework dependency;
- preserves one calculator truth and one calculator interaction/runtime implementation;
- scales naturally across Phase 08 calculators without calculator-specific widget implementations.

Disadvantages:

- introduces one tiny JavaScript asset;
- introduces a small versioned `postMessage` lifecycle contract that must remain compatible.

### 3.3 Approach C — Web Component or headless public calculation runtime

A custom element, SDK, or public headless calculation API runs directly within the customer site.

Advantages:

- maximum integration flexibility;
- deeper host-page integration is possible.

Disadvantages:

- weakens style/runtime isolation;
- turns the runtime ABI into a broader public developer contract;
- increases security and compatibility complexity;
- risks creating a public Calculation API or SDK that is explicitly out of scope;
- increases long-term maintenance burden before the Frozen V1 catalog exists.

### 3.4 Decision

Phase 07B adopts **Approach B: hosted iframe + tiny first-party loader + shared calculator renderer registry**.

The shared renderer registry is not a universal schema-driven calculator renderer. Calculator-specific interaction flows remain valid and intentional. The registry provides a stable way to select one existing calculator renderer by calculator ID and supply a surface policy (`public` or `widget`) so the same interaction/calculation implementation can appear in different delivery shells without duplicating formulas or interpretation logic.

## 4. Delivery origins and isolation boundary

Phase 07B uses a dedicated first-party embed origin as a security boundary, conceptually:

```text
https://foundcalc.example       main application
https://embed.foundcalc.example widget runtime and loader
```

Actual production hostnames remain deployment configuration and are not hard-coded architectural truth.

The main application and embed origin may continue to run on the same Cloudflare Worker deployment. A dedicated embed origin is an origin-isolation decision, not a requirement for a second paid service.

The dedicated embed origin exists to:

- prevent Better Auth cookies and main-app sessions from being a widget dependency;
- isolate browser storage from the main application;
- make widget-specific CSP and framing policy explicit;
- reduce the consequences of widget content being opened or embedded in unexpected contexts;
- keep widget surfaces account-free and persistence-free.

The widget must not require a logged-in Found Calc session to calculate.

## 5. Shared calculator renderer boundary

Phase 07B introduces a shared calculator-renderer registry keyed by calculator ID. Conceptually:

```ts
interface CalculatorRendererRegistration {
  calculatorId: string;
  render: CalculatorRenderer;
  widgetDefaultsPolicy: WidgetDefaultsPolicy;
}
```

The registry is used by both:

```text
public calculator page
widget calculator surface
```

A renderer receives a surface context that includes at least:

```text
surface: public | widget
locale
calculator catalog entry
safe initial defaults
lifecycle/analytics sink
```

### 5.1 Public surface policy

The public surface preserves existing product behavior, including where applicable:

- local draft behavior;
- saved calculation persistence;
- workspace/project controls;
- existing navigation and page shell;
- authenticated and guest-preservation flows already implemented by earlier phases.

### 5.2 Widget surface policy

The widget surface is deliberately narrower:

- calculation state is memory-only;
- no Better Auth requirement;
- no account controls;
- no Saved Calculation controls;
- no workspace/project controls;
- no cross-widget local draft persistence;
- no raw calculator values are sent to the parent window;
- only approved lifecycle analytics are emitted.

This policy avoids leaking state across different customer websites that embed the same Found Calc origin and prevents widget delivery from silently inheriting application persistence behavior that was not designed for cross-site embedding.

## 6. Widget identity and configuration model

### 6.1 Internal widget identity

Each widget has an internal opaque database identity:

```text
widgetId
```

The internal ID is not the only public authorization boundary and is not exposed as the canonical embed identity.

### 6.2 Public embed identity

Each widget has a browser-visible public embed key:

```text
publicWidgetKey
```

Example shape:

```text
fcw_<opaque-random-value>
```

Requirements:

- generated with a cryptographically strong random source;
- at least 128 bits of entropy;
- not sequential or guessable;
- does not encode `userId`, owner name, email, calculator ID, plan, Xendit/customer/provider identity, or database row details;
- browser-visible and therefore not treated as a secret credential;
- rotatable by the owner;
- old values become immediately invalid after successful rotation.

Security does not depend on key secrecy. Domain authorization and runtime state remain server-authoritative. Randomness primarily prevents practical enumeration.

### 6.3 Widget configuration

Recommended logical widget configuration:

```text
widgetId
ownerUserId
publicWidgetKey
publicKeyVersion
name
calculatorId
locale
status
themeJson
brandingPreference
defaultInputConfigurationJson
createdAt
updatedAt
keyRotatedAt
```

`status` supports at least:

```text
active
disabled
revoked
```

The configuration must not store:

- formulas;
- calculated results;
- duplicated calculator definitions;
- rule payloads or copied rule truth;
- provider billing identity;
- raw user authentication identity in the public key;
- arbitrary HTML/CSS/JavaScript.

### 6.4 Domain bindings

Widget-to-domain authorization is many-to-many through an explicit binding model:

```text
widget_configuration
      ↓
widget_domain_binding
      ↓
widget_domain
```

One widget can therefore be authorized on 1, 3, or the current Family limit of 10 effective domains without duplicating widget configuration.

## 7. Domain model

### 7.1 Domain normalization

Production registration accepts a hostname or HTTPS origin and normalizes it to one canonical hostname form used for comparison and uniqueness.

Normalization rules:

- lowercase;
- remove a trailing DNS dot;
- convert internationalized names to canonical ASCII/Punycode;
- no path;
- no query;
- no fragment;
- no credentials;
- production authorization is HTTPS only;
- default HTTPS port is implicit;
- non-default production ports are rejected;
- canonical authorization compares normalized origin/hostname values, not user-entered display strings.

A Unicode display form may be retained separately for UX, but authorization uses canonical ASCII/Punycode.

### 7.2 HTTPS expectations

Production widgets authorize only HTTPS customer origins.

HTTP is not accepted for production domain bindings.

### 7.3 Development ports and local hosts

Local development has one explicit restricted exception:

```text
localhost
127.0.0.1
::1
```

Only explicitly configured local development ports are accepted.

There is no production flag such as `skipDomainVerification=true`, no arbitrary host allowlist bypass, and no UI-only bypass.

Tests use injected normalization and DNS verification dependencies rather than weakening production rules.

### 7.4 Subdomain behavior

Verification is exact by registered hostname except for the explicit `www` pair rule below.

Verifying:

```text
example.com
```

does not authorize:

```text
shop.example.com
partner.example.com
```

Sibling and nested subdomains require separate registration and consume separate entitlement domain capacity.

### 7.5 `www` behavior

For product usability, `example.com` and `www.example.com` are treated as one explicit apex/`www` pair for domain-slot authorization.

Verification of the apex authorizes the pair:

```text
https://example.com
https://www.example.com
```

This does not authorize arbitrary sibling subdomains.

If a user enters the `www` hostname first, the platform normalizes the effective pair relationship so the same apex/`www` pair cannot consume two domain slots for the same owner.

### 7.6 Duplicate domains

After normalization, the same effective apex/`www` pair cannot be duplicated within one owner's domain collection.

The same domain may later be verified by another account only if that account independently proves current DNS ownership. Phase 07B does not create a permanent global domain claim that would prevent legitimate ownership transfer.

### 7.7 Domain lifecycle

Stored domain lifecycle supports:

```text
pending
active
disabled
revoked
```

An explicit user deletion action may set `deletedAt` and remove the domain from normal management/runtime eligibility. Deletion is never triggered by subscription downgrade.

Meanings:

- `pending`: registration exists but ownership is not verified;
- `active`: ownership is verified and the domain is eligible for entitlement evaluation;
- `disabled`: owner intentionally disabled the domain without deleting ownership/configuration;
- `revoked`: verification or security authorization was explicitly revoked; new verification is required before reactivation.

Entitlement restriction is a computed effective state and is not a destructive stored-domain status.

## 8. Domain verification

### 8.1 Selected method

Phase 07B uses **DNS TXT verification only** for production V1.

Conceptual challenge:

```text
_foundcalc-verification.example.com
TXT foundcalc-site-verification=<opaque-token>
```

Flow:

```text
Add domain
→ normalize domain
→ create expiring verification challenge
→ show DNS TXT instructions
→ owner publishes TXT record
→ owner requests verification check
→ server resolves TXT
→ exact challenge matches
→ challenge is consumed
→ domain becomes verified/active
```

DNS TXT is selected over HTML/meta verification because it has a smaller and more deterministic V1 security surface. HTML verification would introduce redirect handling, arbitrary remote HTML fetching/parsing, TLS/URL edge cases, and SSRF-related complexity that is unnecessary for this phase.

### 8.2 Cloudflare compatibility

Cloudflare Workers support DNS resolution through the current Node compatibility DNS APIs using Cloudflare DNS-over-HTTPS. DNS checks are used only during explicit ownership verification and count as Worker subrequests. No paid external verification provider is introduced.

### 8.3 Verification challenge lifecycle

A verification challenge stores at least:

```text
pending
verified/consumed
expired
revoked
```

Each challenge is:

- bound to one normalized domain record;
- generated with a cryptographically strong random source;
- valid for 72 hours;
- single-use after successful verification;
- invalidated when replaced by a newer challenge for the same verification attempt;
- never reusable to verify a different domain.

### 8.4 Verification check rate limits

Server-side verification checks are rate-limited by challenge/domain and authenticated owner. The V1 policy allows at most one active verification attempt per domain challenge within a 30-second interval, with bounded handling of repeated failures.

A rate-limit failure is a product error and does not alter domain ownership state.

### 8.5 TXT resolver behavior

The verification adapter must correctly handle DNS TXT values that may be returned as multiple string fragments by joining record fragments according to DNS API semantics before exact token comparison.

The resolver must distinguish:

- expected token found;
- TXT record present but token absent;
- no TXT record;
- DNS resolution/transient failure.

Transient resolver failure does not revoke a previously verified domain.

### 8.6 Development and tests

Production verification is never bypassed globally.

Automated tests use an injectable DNS resolver with deterministic fake responses.

Local manual development uses explicit localhost origins and local fixtures. CI does not depend on live public DNS propagation.

## 9. Entitlement enforcement and downgrade behavior

### 9.1 Source of truth

Phase 07B consumes the existing Phase 07A effective commercial access resolver. It does not read Xendit directly and does not create widget-specific billing plan truth.

Current server-authoritative widget limits are:

| Capability | Friends | Besties | Family |
|---|---:|---:|---:|
| Effective verified domains | 1 | 3 | 10 |
| Remove Found Calc attribution | No | Yes | Yes |
| Controlled theme customization | No | Yes | Yes |
| Standard widget analytics | No | Yes | Yes |
| White-label widget entitlement | No | No | Yes |
| Advanced widget analytics entitlement | No | No | Yes |

The current Family implementation limit is 10 domains. Commercial wording may state “10+”, but Phase 07B must enforce the actual Phase 07A resolver value rather than inventing an unlimited limit.

If the commercial resolver changes in a later approved phase, the widget platform consumes the changed limit without duplicating plan logic.

### 9.2 Effective capability resolution

A widget capability resolver derives from effective commercial access:

```text
effectiveTier
domainLimit
canCustomizeTheme
canRemoveBranding
whiteLabelAvailable
analyticsLevel
```

These values are computed from current entitlement state and are not copied permanently into widget configuration.

Besties trial receives the same effective Besties widget limits while the trial is active, consistent with Phase 07A commercial access semantics.

Paid-through cancellation semantics remain those of Phase 07A: capability remains available while paid access remains effective and then falls back when the effective access resolver changes.

### 9.3 Server-authoritative domain limits

Domain limits are enforced in server-side creation/binding/runtime code. The UI may explain limits but is never the authorization boundary.

A user may retain more stored verified domains than the current entitlement after a downgrade. Only the effective subset remains active.

### 9.4 Downgrade principle

The governing downgrade rule is:

> restrict capability, preserve ownership and configuration

Downgrades do not delete:

- widget configurations;
- domain registrations;
- successful verification history required to preserve ownership state;
- theme preference;
- branding preference;
- domain bindings.

### 9.5 Deterministic effective-domain selection

If stored verified domains exceed the current entitlement and the owner has not explicitly selected the active subset, Phase 07B computes the effective domain set in this order:

1. explicit owner priority on widget-domain bindings;
2. earlier successful verification time;
3. stable domain ID ordering as a final tie-breaker.

The first `N` eligible domains, where `N` is the current entitlement limit, are runtime-active. Remaining domains expose a computed management state:

```text
entitlement_limited
```

They are not deleted, disabled, or revoked.

Upgrading can make them effective again without forcing DNS re-verification, unless the domain was separately revoked.

### 9.6 Branding after downgrade

Branding is recomputed at runtime.

A Besties or Family widget whose stored preference hides branding must immediately render `Powered by Found Calc` if effective access falls to Friends.

No destructive write is required to restore branding after downgrade.

## 10. Runtime and embed routing

### 10.1 Canonical public widget route

The canonical public widget route is:

```text
GET /embed/{publicWidgetKey}
```

on the dedicated embed origin.

The loader supplies the normalized host-page origin as an encoded context parameter:

```text
?parentOrigin=https%3A%2F%2Fcustomer.example
```

The parameter is context, not a permission grant.

### 10.2 Runtime resolution pipeline

The public embed route resolves in this order:

```text
publicWidgetKey
→ Widget Config
→ widget stored status
→ owner effective commercial entitlement
→ Phase 07B runtime capability availability
→ effective widget-domain bindings
→ requested parent-origin authorization
→ calculator catalog definition
→ shared calculator renderer
→ existing calculator runtime
→ @found-calc/engine
→ @found-calc/rules when required
```

A failure at any authorization step returns a generic localized unavailable response that does not reveal owner identity, subscription details, internal IDs, provider IDs, or whether a guessed key nearly matched a real record.

### 10.3 Runtime availability distinction

Phase 07B explicitly preserves:

```text
commercial entitlement ≠ runtime availability
```

A commercial coordinate can exist while a later-phase feature is still unavailable. Phase 07B implements the concrete V1 widget runtime capabilities documented in this spec and must not expose later unavailable developer/bulk features merely because the Family commercial contract contains related entitlement coordinates.

### 10.4 Parent origin authorization

The server normalizes `parentOrigin` and requires it to match an effective verified domain binding for the target widget.

A caller cannot gain authorization by changing the query parameter because the response also emits a dynamic Content Security Policy `frame-ancestors` directive containing only the authorized origin set relevant to that widget/runtime response.

`Origin`, `Referer`, and Fetch Metadata headers may be used as consistency/anomaly signals, but none of them alone is the authorization boundary.

If such a header is present and contradicts the requested/authorized embedding context, the route denies access.

Missing `Origin` or `Referer` never means that an arbitrary domain becomes trusted.

### 10.5 Revocation behavior

The runtime denies access immediately when:

- the widget is revoked;
- the widget is disabled;
- the bound domain is disabled or revoked;
- the domain is not in the current effective entitlement subset;
- the owner no longer has effective runtime capability;
- the public key was rotated;
- the requested parent origin is unauthorized.

No cached public runtime response may allow stale revoked authorization in V1.

## 11. Embed loader

### 11.1 Generated installation contract

The default generated installation snippet is conceptually:

```html
<script defer src="https://embed.foundcalc.example/embed.js"></script>
<div data-foundcalc-widget="fcw_<opaque-key>"></div>
```

The production origin is deployment configuration.

### 11.2 Loader responsibilities

`embed.js` is a small dependency-free browser script that:

- finds Found Calc widget mount points;
- creates one iframe per valid widget mount point;
- supplies the current exact parent origin to the iframe URL;
- provides a localized iframe `title` where embed metadata is available;
- applies the approved iframe sandbox policy;
- validates lifecycle messages from each iframe;
- automatically updates iframe height after safe resize events;
- supports multiple widgets on one page;
- does not read calculator input fields or results;
- does not inspect arbitrary host-page DOM;
- does not monkey-patch global framework/runtime APIs;
- does not depend on React, Vue, Svelte, jQuery, or another host framework.

### 11.3 Direct iframe fallback

A direct iframe form may be documented as an advanced fallback, but it is not the primary generated installation method because automatic responsive sizing would otherwise become the customer’s responsibility.

## 12. Responsive iframe and `postMessage` protocol

### 12.1 Protocol direction

Phase 07B uses child-to-parent lifecycle messages only.

Approved V1 message types:

```text
foundcalc:ready
foundcalc:resize
```

There is no parent-to-child calculation command protocol.

Explicitly unavailable in Phase 07B:

```text
foundcalc:setInput
foundcalc:getResult
foundcalc:calculate
foundcalc:setTheme
```

### 12.2 Protocol envelope

Conceptual message envelope:

```ts
interface FoundCalcWidgetMessageV1 {
  type: "foundcalc:ready" | "foundcalc:resize";
  protocolVersion: 1;
  widgetKey: string;
}
```

Resize adds:

```ts
interface FoundCalcResizeMessageV1 extends FoundCalcWidgetMessageV1 {
  type: "foundcalc:resize";
  heightPx: number;
}
```

The protocol never carries raw calculator inputs, normalized values, sensitive user data, CalculationResult payloads, rule payloads, or arbitrary customer metadata.

### 12.3 Parent-side validation

The loader accepts a message only if all conditions hold:

```text
event.origin === configured Found Calc embed origin
event.source === target iframe.contentWindow
protocolVersion === 1
widgetKey === expected widget key
message type is known
message shape is valid
heightPx is finite and within sane bounds when present
```

Unknown or malformed messages are ignored.

Resize values are clamped to a safe minimum/maximum range before applying them to iframe layout.

### 12.4 Child-side target origin

The iframe sends lifecycle messages using the exact server-authorized parent origin as `targetOrigin`. It never uses `*` for production lifecycle messages.

### 12.5 Resize behavior

The widget observes its rendered document/content size with `ResizeObserver` and sends `foundcalc:resize` when needed, including after:

- initial render;
- validation error expansion;
- result rendering;
- scenario/recommendation expansion;
- trust/source content changes;
- responsive reflow;
- localized copy height changes.

Resize notifications are coalesced through a frame-safe scheduling mechanism and are sent only when effective height changes.

Accessibility content is never clipped merely to keep the iframe short.

## 13. Iframe sandbox, CSP, and navigation policy

### 13.1 Sandbox

The default loader supplies the minimum sandbox capability required by the actual widget implementation.

Approved V1 target policy:

```text
allow-scripts
allow-same-origin
allow-popups
allow-popups-to-escape-sandbox
```

The last two capabilities exist only for explicit trusted/source/Found Calc links that should open outside the widget without navigating the host page.

Phase 07B does not grant:

```text
allow-top-navigation
allow-top-navigation-by-user-activation
allow-storage-access-by-user-activation
```

unless an implementation blocker proves that one is required and change control is approved.

The widget should avoid HTML form navigation, so `allow-forms` is not part of the default policy.

The dedicated embed origin is required because `allow-scripts` plus `allow-same-origin` must not create a same-origin relationship with the customer host page.

Sandbox is defense-in-depth. A customer can modify their own HTML, so authorization cannot depend on the customer preserving the sandbox attribute.

### 13.2 Content Security Policy

Embed responses use a route-specific CSP. At minimum the policy enforces:

```text
default-src restricted to Found Calc requirements
object-src 'none'
base-uri 'none'
form-action 'none'
connect-src first-party only
frame-ancestors <dynamic authorized origins>
```

`script-src` and `style-src` are configured compatibly with the production Next/vinext build without permitting user-controlled CSP content. Where nonce/hash support is required, implementation follows current framework/Cloudflare constraints rather than adding broad unsafe execution merely for convenience.

No widget configuration value can insert or modify a CSP directive.

### 13.3 Redirect and navigation rules

Widget configuration cannot define arbitrary navigation URLs.

The widget cannot navigate the parent window.

Found Calc attribution/source links are fixed first-party or catalog/source-contract URLs and open through explicitly controlled link behavior.

Unexpected external redirect chains are not a runtime feature.

## 14. Theme contract

### 14.1 Controlled token model

Phase 07B supports only controlled, enumerated theme settings. The initial contract is:

```text
appearance: light | dark | system
accent: brand | blue | teal
density: comfortable | compact
radiusPreset: standard | soft | square
showTitle: true | false
```

Every supported preset must meet existing Found Calc readability, focus, trust-label, and contrast requirements.

### 14.2 Forbidden customization

Widget configuration does not accept:

- arbitrary CSS;
- arbitrary style attributes;
- raw HTML;
- JavaScript;
- arbitrary color hex values;
- arbitrary fonts or external font URLs;
- background URLs;
- DOM selectors;
- hiding of trust/source/warning elements.

Host-page CSS cannot cross the iframe boundary to alter widget content.

### 14.3 Tier behavior

Friends always receives Found Calc defaults regardless of stored customization preference.

Besties and Family can use the controlled theme contract.

`appearance: system` follows the iframe’s `prefers-color-scheme` media query.

A downgrade preserves stored theme preference but renders the currently authorized effective theme.

## 15. Branding contract

### 15.1 Stored preference versus effective branding

Widget configuration stores a branding preference:

```text
foundcalc
hidden
```

The runtime derives effective branding from current entitlement:

```text
Friends → foundcalc always
Besties → foundcalc or hidden
Family  → foundcalc or hidden
```

A client query parameter such as `?hideBranding=true` cannot grant removal capability.

### 15.2 Friends attribution

Friends renders persistent:

```text
Powered by Found Calc
```

Requirements:

- small and non-obstructive;
- not over calculator inputs or results;
- visually clear and not deceptive;
- keyboard accessible;
- accessible link text;
- visible focus treatment;
- remains present across calculation/result states;
- cannot be disabled by widget configuration.

### 15.3 Besties

Besties may remove Found Calc attribution.

### 15.4 Family white-label scope

Phase 07B Family white-label means Found Calc attribution may be removed while the widget keeps the approved controlled theme and trust/source system.

It does not mean:

- arbitrary client branding assets;
- custom customer logo injection;
- custom domain;
- arbitrary typography;
- arbitrary CSS;
- removal of rule provenance, trust labels, methodology, warnings, or safety disclosures.

Trust/source disclosures are product truth, not Found Calc marketing branding, and are never removable by entitlement.

## 16. Default input configuration

### 16.1 Purpose

Default input configuration is an optional convenience that pre-populates supported calculator inputs. It is not a second calculation model and cannot contain formulas, results, rule payloads, or derived values.

### 16.2 Storage

Widget configuration stores:

```text
defaultInputConfigurationJson
```

using canonical calculator input IDs and canonical value shapes.

### 16.3 Safety policy

A default is accepted only if:

1. the input ID exists in the target calculator definition;
2. the calculator’s widget metadata marks the input as safe for defaulting;
3. the persisted shape matches the supported input type;
4. the value satisfies the calculator definition scale/range contract;
5. the default does not silently select stale or authoritative rule context that should remain user-explicit.

The widget platform contains generic validation/enforcement, while per-calculator metadata only declares whether an existing input is safe to default. That metadata contains no formula logic.

### 16.4 Rule-aware defaults

For the synthetic rule reference slice, a base value may be permitted if declared safe, but the effective date is not defaulted in V1. This prevents an embed configuration from silently fixing a rule-selection date that users may mistake for current authoritative context.

Phase 08 calculators must explicitly declare safe default metadata when relevant rather than inheriting unsafe assumptions.

## 17. Analytics and privacy contract

### 17.1 Stable event vocabulary

Phase 07B defines a small lifecycle vocabulary:

```text
widget_viewed
calculator_started
calculation_completed
cta_clicked
```

The event contract is intentionally narrower than a general analytics platform.

### 17.2 Logical event envelope

The stable logical schema contains only:

```text
schemaVersion
eventType
widgetId
calculatorId
domainId
locale
occurredDay
```

Operational server timestamps may be added for aggregation/retention without expanding customer data collection.

### 17.3 Sensitive values prohibited

Analytics must not log by default:

- salary;
- income;
- revenue;
- tax value;
- debt;
- medical or health inputs;
- religious or fiqh inputs;
- arbitrary calculator raw values;
- calculation results;
- normalized input JSON;
- rule payloads;
- user email;
- owner `userId` in browser event payloads;
- arbitrary referrer URLs;
- host-page content.

### 17.4 Aggregated storage

Phase 07B does not persist one row per user event. It stores privacy-safe daily aggregates in `widget_event_daily`, unique by effective dimensions such as:

```text
widgetId
domainId
calculatorId
locale
occurredDay
eventType
```

with aggregate fields such as:

```text
count
lastOccurredAt
```

### 17.5 Tier visibility

Friends may use minimal operational aggregate data internally to populate non-sensitive `last activity`, but Friends does not receive a customer analytics dashboard.

Besties receives standard aggregate analytics such as views, starts, completions, CTA clicks, and 7/30-day summaries.

Family uses the same stable event vocabulary and may receive more detailed aggregate breakdowns allowed by the commercial contract. Phase 07B does not expose arbitrary custom events or a public events API.

### 17.6 Consent and privacy posture

The event contract is first-party, coarse, non-sensitive, and limited to widget/product lifecycle. Phase 07B does not add fingerprinting, cross-site user identity, advertising profiles, or customer-page content collection.

The widget-management UI must describe analytics behavior in plain ID/EN copy where analytics are exposed.

Phase 09 may harden retention, consent, abuse, and analytics infrastructure further, but it must preserve this stable non-sensitive event vocabulary unless a later approved change explicitly replaces it.

### 17.7 Retention

Phase 07B retains widget daily aggregates for 90 days.

Rows older than the retention window are excluded from product reads and removed through bounded opportunistic cleanup rather than an always-on paid scheduler requirement.

Analytics writes are best-effort. An analytics write failure must never block or change calculator results.

## 18. Security threat model

### 18.1 Widget URL copied to an unauthorized domain

Control:

- exact verified-domain binding;
- current entitlement subset enforcement;
- `parentOrigin` normalization and authorization;
- dynamic CSP `frame-ancestors` that lets the browser enforce actual allowed ancestors.

### 18.2 Spoofed `Origin` or `Referer`

Control:

- neither header is a sole authorization boundary;
- conflicting available headers cause denial;
- browser `frame-ancestors` enforcement remains independent of a caller-provided query value.

### 18.3 Missing `Origin` or `Referer`

Control:

- absence does not confer trust;
- the requested parent origin still must be an effective verified binding;
- CSP still limits actual embedding ancestors.

### 18.4 Malicious iframe host

Control:

- cross-origin iframe isolation;
- widget calculation state is memory-only;
- no parent access to DOM/calculation state;
- no raw result/input messages;
- no parent-to-child calculation command channel.

### 18.5 Clickjacking

Control:

- widget is intentionally framable only by currently effective verified origins through dynamic CSP `frame-ancestors`;
- unrelated sites cannot frame the route successfully.

### 18.6 Malicious `postMessage`

Control:

- child-to-parent lifecycle direction only;
- exact `event.origin` check;
- exact `event.source` check;
- protocol version check;
- widget key check;
- strict message shape and known-type validation;
- exact child `targetOrigin`.

### 18.7 XSS and configuration injection

Control:

- enum/structured configuration validation;
- no raw HTML/CSS/JS customization;
- React escaping/presentation boundaries;
- route-specific CSP;
- no config-controlled navigation or CSP directives.

### 18.8 CSP bypass

Control:

- CSP values come from server-owned policy and verified origins only;
- no user-provided raw CSP text;
- test exact `frame-ancestors`, script, object, base, form, and connect restrictions.

### 18.9 Iframe sandbox weakening

Control:

- loader emits the approved minimal sandbox;
- authorization does not depend on the customer keeping the sandbox attribute;
- dedicated embed origin contains cross-origin damage boundary.

### 18.10 Domain takeover and re-verification

A successful V1 DNS verification remains valid until owner/security action revokes it. The platform does not perform DNS re-verification on every widget request because that would create latency, cost, and DNS availability coupling.

A revoked domain requires a new DNS verification challenge before it can become active again.

Periodic automated re-verification is deferred to Phase 09 hardening unless real-world evidence requires earlier change control.

### 18.11 Revoked or disabled widget/domain

Control:

- runtime resolution checks current stored status on every uncached V1 initialization;
- disabled or revoked entities are denied immediately.

### 18.12 Expired or downgraded entitlement

Control:

- every runtime initialization resolves current Phase 07A effective commercial access;
- domain subset, branding, theme, and analytics capability are recomputed;
- unauthorized capability is restricted without deleting stored configuration.

### 18.13 Token enumeration

Control:

- ≥128-bit opaque random public keys;
- no sequential/raw database ID embed identity;
- generic unavailable responses;
- bounded runtime abuse/rate defenses.

### 18.14 Replay of verification token

Control:

- challenge bound to one domain record;
- challenge expiration;
- single-use consumption;
- newer challenge invalidates earlier pending token for that attempt.

### 18.15 Verification and runtime rate abuse

Control:

- authenticated verification rate limits;
- public runtime request rate controls at appropriate IP/key/origin dimensions;
- generic errors that do not aid enumeration;
- analytics writes remain bounded and best-effort.

Rate limiting must not introduce a paid third-party dependency.

### 18.16 Unexpected redirect/navigation

Control:

- no config-controlled arbitrary redirects;
- no parent navigation sandbox permission;
- controlled trusted/source links only.

### 18.17 Sensitive data leakage to parent window

Control:

- no raw input/result `postMessage` fields;
- no public calculation API;
- no host-page callbacks carrying calculator truth;
- widget analytics excludes raw values;
- cross-origin DOM isolation.

## 19. Persistence and migration

### 19.1 Migration policy

Migrations `0001`–`0005` remain byte-for-byte immutable.

Phase 07B adds:

```text
apps/web/migrations/0006_phase07b_widget_platform.sql
```

The migration is additive and must apply cleanly after the canonical Phase 07A schema without recreating or destructively altering existing tables.

### 19.2 `widget_domain`

Logical fields:

```text
id
ownerUserId
normalizedHostname
displayHostname
status
verifiedAt
createdAt
updatedAt
deletedAt
```

Required indexes/constraints include owner+normalized-domain uniqueness consistent with the apex/`www` normalization policy and owner/status lookup support.

### 19.3 `widget_verification`

Logical fields:

```text
id
domainId
method = dns_txt
challengeTokenHash or equivalent safe stored verifier material
status
expiresAt
lastCheckedAt
verifiedAt
createdAt
```

The browser-facing token does not need to be persisted as a reusable plaintext secret if exact verification can be performed using stored verifier material. Implementation chooses the simplest auditable approach that supports TXT comparison and replay resistance.

### 19.4 `widget_configuration`

Logical fields:

```text
id
ownerUserId
publicWidgetKeyHash or lookup-safe representation
publicKeyVersion
name
calculatorId
locale
status
themeJson
brandingPreference
defaultInputConfigurationJson
createdAt
updatedAt
keyRotatedAt
```

The public key lookup representation must support efficient exact lookup without exposing owner/provider identity.

### 19.5 `widget_domain_binding`

Logical fields:

```text
widgetId
domainId
priority
createdAt
```

Composite uniqueness prevents duplicate widget/domain bindings.

### 19.6 `widget_event_daily`

Logical fields:

```text
widgetId
domainId
calculatorId
locale
occurredDay
eventType
count
lastOccurredAt
```

A composite unique key supports atomic/bounded aggregate increments.

### 19.7 Downgrade persistence rule

Subscription downgrade performs no destructive delete or forced configuration rewrite in widget tables.

Effective capability is computed at read/runtime time.

## 20. Workspace widget-management UX

### 20.1 Route

The canonical management surface is:

```text
/{locale}/workspace/widgets
```

It remains an authenticated workspace feature.

### 20.2 Information architecture

The page uses a purposeful management table/list rather than generic dashboard-card repetition.

Desktop structure:

```text
Widgets                                      [ Create widget ]

<current plan/domain-capacity summary>

Name / Calculator | Domain | Capability | Status | Branding | Last activity | Actions
```

Mobile converts each row into a semantic stacked record with no horizontal overflow.

### 20.3 Status vocabulary

Management copy distinguishes stored state, verification state, and effective entitlement state:

```text
Active
Needs verification
Disabled
Revoked
Entitlement limited
Needs domain
```

An entitlement-limited configuration is not mislabeled as deleted or invalid.

### 20.4 Actions

Supported actions include:

- configure;
- copy embed code;
- bind/change verified domain;
- disable;
- re-enable;
- revoke or re-verify domain where appropriate;
- regenerate public embed key.

Key regeneration requires explicit confirmation that existing embed code will stop working after rotation.

### 20.5 Plan/capability presentation

The workspace shows the actual effective current capability, including trial state where relevant, without embedding separate plan truth.

Upgrade affordances may explain unavailable controls, but the page must avoid repeated upgrade-card spam and must not advertise later runtime features as already available.

## 21. Widget creation flow

Creation is progressive:

```text
Choose calculator
→ Select locale
→ Choose an existing verified domain or add a domain
→ Verify a new domain when required
→ Configure permitted appearance
→ Configure optional safe defaults
→ Preview
→ Copy embed code
```

Rules:

- advanced options do not appear before they are relevant;
- Friends does not receive editable paid theme controls;
- Besties receives controlled theme and branding-removal controls;
- Family receives the V1 white-label behavior defined in this spec;
- server-side domain capacity is checked before effective activation;
- a widget may be saved in `Needs verification` state before DNS verification completes;
- production embed remains unavailable until at least one effective verified bound domain exists.

## 22. Preview architecture

### 22.1 Same rendering path

Workspace preview must use the production widget rendering path as far as reasonably possible. It does not use a fake visual mock.

Conceptual flow:

```text
authenticated owner preview iframe
→ same Widget Runtime Resolver
→ owner-authorized preview context
→ same effective entitlement/theme/branding resolution
→ same shared calculator renderer
```

The preview bypasses only public customer-domain authorization after authenticating that the current workspace user owns the widget.

### 22.2 Preview fidelity

Preview still applies:

- current effective tier;
- current effective branding;
- actual controlled theme;
- actual locale;
- actual calculator renderer;
- actual safe defaults;
- actual rule resolution and provenance;
- actual responsive iframe shell.

Friends preview still shows `Powered by Found Calc`.

A Besties user cannot preview Family-only white-label capability as if it were authorized.

### 22.3 Width presets

Preview supports at least:

```text
320 px
390 px
container/desktop
```

These are viewport containers around the same iframe runtime, not separate renderers.

Public-domain CSP behavior is verified separately through the real public embed route.

## 23. Reference vertical slices and truth parity

Phase 07B validates architecture using exactly the existing references.

### 23.1 Discount

Proves:

- simple deterministic calculator support;
- repeated discount-step UI;
- dynamic content height changes;
- locale parsing/formatting in widget context;
- identical engine result truth to the main app.

### 23.2 Business Margin/Profit

Proves:

- required plus contextual inputs;
- progressive result sections;
- scenario/recommendation rendering;
- larger dynamic height changes;
- identical existing runtime/engine behavior.

### 23.3 Synthetic rule-aware reference

Proves:

- public published rule feed reuse;
- explicit effective date;
- `@found-calc/rules` resolution before engine execution;
- rule provenance and synthetic warning presentation;
- identical rule dependency/result truth to the main application.

It remains synthetic reference data and is not converted into a production tax, marketplace, legal, financial, health, payroll, or fiqh calculator.

### 23.4 Public/widget truth invariant

For the same:

- calculator version;
- rule version;
- canonical inputs;
- assumptions;
- effective date/context;
- locale/context;

public and widget calculation outcomes must be identical in calculation truth.

Regression fixtures compare, as applicable:

- success/failure classification;
- calculator ID/version;
- normalized inputs;
- assumptions;
- primary answer;
- result sections;
- result scale/unit/currency;
- rule dependencies;
- scenarios;
- recommendations;
- provenance IDs.

Delivery shell, navigation, persistence controls, and branding may differ. Arithmetic, rounding, rule resolution, interpretation, and result structure may not.

## 24. Accessibility and responsive contract

The widget preserves the existing Found Calc accessibility contract and does not create a reduced “embed accessibility” mode.

Requirements include:

- generated iframe has an appropriate localized accessible title;
- internal widget page has a valid landmark and heading hierarchy;
- `showTitle=false` may alter visual presentation but cannot leave the embedded experience unnamed;
- all form controls have associated labels;
- errors remain programmatically associated with controls;
- validation summary does not replace field associations;
- successful result updates are announced politely without stealing focus;
- focus indicators remain visible;
- every action is keyboard-operable;
- no status relies only on color;
- trust/source/warning content remains perceivable;
- controlled theme presets meet contrast requirements;
- layout works at 320 px and 390 px widths;
- zoom/reflow does not create horizontal overflow;
- touch targets remain usable;
- ResizeObserver growth expands the iframe instead of clipping errors/results;
- ID and EN are functionally equivalent;
- reduced-motion preferences are respected for nonessential transitions.

Accessibility requirements take precedence over attempts to minimize iframe height.

## 25. Testing strategy

Implementation proceeds with TDD after the written spec and implementation plan are separately approved.

### 25.1 Domain normalization unit tests

Cover:

- uppercase/lowercase normalization;
- trailing dot;
- apex/`www` pairing;
- sibling subdomains;
- IDN/Punycode;
- invalid path/query/fragment/credentials;
- HTTPS production rules;
- production non-default ports;
- allowed localhost development ports;
- duplicate normalized domains.

### 25.2 Public key tests

Cover:

- entropy/format contract;
- non-encoding of owner/provider identity;
- exact lookup;
- rotation invalidates old key;
- revoked key returns generic failure.

### 25.3 Entitlement matrix tests

Cover at least:

```text
Friends
Besties trial
Besties paid
Family paid
cancelled but paid-through
expired paid access
upgrade
downgrade
```

Assert effective domain count, branding, theme, standard analytics, white-label, and advanced analytics capability.

### 25.4 Domain verification tests

With an injected fake resolver, cover:

- correct TXT;
- incorrect TXT;
- no TXT;
- split TXT fragments;
- resolver failure;
- expired challenge;
- replaced challenge;
- replayed consumed challenge;
- revoked verification;
- rate-limit behavior.

CI does not depend on live DNS.

### 25.5 D1 integration tests

Start from canonical schema through migration `0005`, apply migration `0006`, and prove:

- existing Phase 01–07A data survives;
- new tables/indexes/constraints exist;
- duplicate domains/bindings are rejected correctly;
- downgrade does not delete stored widget/domain configuration;
- effective domain selection remains deterministic;
- event aggregates increment without raw-value storage;
- migration re-application behavior follows the project’s existing migration test conventions.

### 25.6 Runtime authorization tests

Cover:

- valid widget/verified domain;
- unauthorized domain;
- valid key with fake `parentOrigin`;
- conflicting request metadata;
- revoked domain;
- disabled domain;
- revoked widget;
- disabled widget;
- rotated public key;
- entitlement-limited domain;
- expired/downgraded entitlement;
- malformed key;
- unknown key;
- generic error response;
- dynamic CSP `frame-ancestors` content.

### 25.7 Renderer and truth-parity tests

For all three reference slices, execute the same canonical fixtures through the public and widget renderer/runtime paths and assert identical CalculationOutcome truth.

### 25.8 Loader/protocol tests

Cover:

- one widget;
- multiple widgets;
- ready message;
- resize message;
- invalid event origin;
- invalid event source;
- wrong widget key;
- wrong protocol version;
- unknown type;
- malformed height;
- excessive height clamping;
- no calculator input/result data in lifecycle messages.

### 25.9 Playwright browser tests

Use separate test host origins so browser framing/CSP behavior is exercised rather than simulated only in unit tests.

Cover:

- authorized customer host renders;
- unauthorized host is blocked;
- copied widget URL cannot be used from an unauthorized host;
- Friends attribution persists;
- Besties branding removal works;
- Family V1 white-label behavior works;
- theme presets;
- ID/EN;
- keyboard-only operation;
- focus visibility;
- result announcements;
- validation relationships;
- 320/390 px widths;
- no horizontal overflow;
- dynamic iframe resizing;
- rule-aware result/provenance rendering.

### 25.10 Security contract tests

Add explicit tests for:

- no arbitrary CSS/HTML/JS configuration;
- no parent-to-child calculation protocol;
- no raw input/result analytics;
- no provider identity/public user identity in embed key or widget response;
- CSP restrictions;
- sandbox contract;
- no parent navigation capability;
- generic authorization failure behavior.

## 26. Verification gate

Phase 07B adds root script:

```text
pnpm verify:phase07b
```

The gate begins by running:

```text
pnpm verify:phase07a
```

and then adds Phase 07B-specific verification. The final plan must preserve the repository’s established phase-gate pattern and include at least:

- inherited full Phase 07A verification;
- Phase 07B foundation/unit contracts;
- web unit tests;
- Cloudflare/D1 integration tests;
- lint;
- typecheck;
- Playwright;
- Next production build;
- vinext compatibility check;
- vinext production build;
- built Worker/widget smoke coverage for the new public embed path where the existing repository verification architecture supports it.

Phase 07B is not complete if any earlier canonical regression gate is removed or bypassed.

## 27. Cloudflare, performance, abuse, and cost

### 27.1 Infrastructure target

Phase 07B introduces no required paid SaaS dependency.

It remains compatible with the current fixed-infrastructure target of approximately Rp0 while within Cloudflare free tiers, excluding domain/payment transaction fees.

### 27.2 Static loader delivery

`embed.js` is a cacheable static asset with:

- no external dependencies;
- no framework runtime;
- long immutable/version-aware cache behavior when filename/version strategy allows it;
- minimal transfer size.

### 27.3 Public embed route caching

V1 public embed authorization is dynamic and should not use a cache policy that can preserve stale revoked domains, widgets, or downgraded entitlement.

The default Phase 07B decision is **no authorization-response caching that can outlive current server state**. Correct revocation takes precedence over premature optimization.

Later measurement may introduce carefully bounded caching under change control.

### 27.4 D1 access

Widget initialization requires indexed reads for:

- widget public-key lookup;
- owner/effective entitlement inputs;
- domain bindings/domains;
- runtime configuration.

Queries should be indexed and batched where appropriate, but implementation must not denormalize billing truth into widget tables merely to reduce one read.

### 27.5 Calculation execution

Simple/contextual deterministic calculation continues to execute through existing application runtime and engine code without a new calculation API round-trip.

Rule-aware widgets reuse the existing first-party published rule feed and resolver. Phase 07B does not add an external data fetch for every calculation.

### 27.6 DNS cost

DNS resolution occurs only on explicit ownership-verification checks, not on every widget view.

### 27.7 Analytics write volume

Daily aggregates minimize row growth compared with raw event persistence.

Analytics write failures are ignored for calculation availability after bounded error handling.

### 27.8 Abuse controls

Runtime and verification endpoints receive bounded first-party rate controls appropriate to their threat model. Abuse mitigation must not introduce a paid external dependency merely for Phase 07B.

## 28. Rollout and migration compatibility

Rollout is additive:

```text
canonical Phase 07A
→ apply migration 0006
→ deploy widget routes/loader/management UI
→ existing users initially have zero widget records
→ users explicitly create domains/widgets
```

There is:

- no automatic domain creation;
- no automatic widget creation;
- no migration of existing saved calculations into widgets;
- no public calculator URL change required;
- no auth/session migration;
- no billing-provider migration;
- no destructive data backfill.

The existing public calculator route may be refactored internally to use the shared renderer registry, but regression tests must prove the public surface remains behaviorally compatible.

## 29. Family capability boundary

Phase 07B concretely implements for Family:

- the current server-authoritative 10 effective verified domains;
- controlled theme customization;
- Found Calc attribution removal / V1 white-label behavior;
- the same reusable widget runtime;
- privacy-safe analytics foundation and Family-appropriate aggregate visibility;
- multiple stored widgets/domain bindings.

Phase 07B does not falsely advertise as completed runtime:

- arbitrary bulk widget operations;
- developer event streams;
- public event API;
- custom white-label logos/assets;
- custom customer domains;
- arbitrary CSS/fonts;
- Portfolio runtime;
- external SDK/API capability.

Commercial entitlement coordinates may exist before those future runtimes. The UI must preserve the distinction between entitlement and runtime availability.

## 30. Definition of Done

Phase 07B may be marked COMPLETE only when all of the following are implemented and verified:

- one reusable Widget Platform exists;
- hosted iframe runtime exists;
- tiny first-party loader exists;
- dedicated first-party embed-origin isolation works;
- shared calculator renderer registry is used by the widget surface without creating a generic formula/schema engine;
- Discount runs through the widget foundation;
- Business Margin/Profit runs through the widget foundation;
- the synthetic rule-aware reference runs through the widget foundation;
- public/widget calculation truth parity is fixture-proven;
- DNS TXT ownership verification works;
- production does not trust an entered domain without verification;
- Friends maximum 1 effective verified domain is server enforced;
- Besties maximum 3 effective verified domains is server enforced;
- Family current maximum 10 effective verified domains is server enforced;
- downgrade preserves stored configuration and ownership;
- excess domains become entitlement-limited rather than deleted;
- Friends attribution cannot be hidden;
- Besties attribution removal works;
- Family V1 white-label behavior works without falsely exposing later features;
- controlled theme customization works without arbitrary CSS/HTML/JS injection;
- public embed key is opaque, non-enumerable in practice, rotatable, and revocable;
- unauthorized/revoked/disabled runtime access is rejected generically;
- dynamic CSP `frame-ancestors` enforces authorized hosts;
- iframe sandbox and navigation policy are verified;
- `postMessage` is one-way, versioned, origin/source/schema/widget safe;
- no raw calculator inputs/results are sent to parent windows;
- widget state is memory-only and does not expose public/workspace persistence controls;
- privacy-safe analytics aggregates work without raw sensitive values;
- analytics failure cannot change calculator results;
- ID and EN pass;
- 320 px and 390 px layouts pass;
- zoom/reflow has no horizontal overflow;
- keyboard and focus requirements pass;
- result announcements and validation relationships pass;
- migration `0006` is additive;
- migrations `0001`–`0005` remain immutable;
- `pnpm verify:phase07b` exists and begins from the canonical Phase 07A regression gate;
- Phase 01–07A regressions pass;
- no Frozen V1 production calculator content is pulled forward;
- no Portfolio runtime is pulled forward;
- no public headless API/SDK is introduced;
- no secrets or local state are committed;
- `docs/verification/phase-07b-verification.md` is complete at closure;
- `BASELINE.md` is updated at closure while preserving Phase 07A provenance;
- `PHASE_HANDOFF.md` is updated at closure;
- canonical artifact `found-calc-phase-07b-widget-platform-foundation.zip` is generated;
- artifact SHA256 is generated and verified;
- required PR/review/verification gates pass;
- the exact merged SHA becomes the canonical Phase 07B source.

## 31. Phase 08 handoff

After Phase 07B is complete, the next new phase is **Phase 08A — Quick Mathematical Primitives**.

Phase 08 calculator development inherits one new platform rule:

> Implement the normal Found Calc calculator renderer/runtime once; do not create a separate widget calculator.

A Phase 08 calculator becomes widget-capable by:

```text
registering its calculator renderer
+ declaring widget-safe default metadata where relevant
+ satisfying public/widget truth-parity fixtures
```

It then inherits the Phase 07B platform for:

- hosted embed delivery;
- loader installation;
- verified-domain enforcement;
- entitlement-aware active domains;
- theme tokens;
- branding;
- privacy-safe analytics lifecycle;
- responsive iframe sizing;
- CSP/sandbox/postMessage security;
- ID/EN widget shell behavior.

Phase 08 remains calculator-production work. It does not reopen Widget Platform architecture unless a verified implementation blocker requires explicit change control.

## 32. Approved architectural decisions summary

Phase 07B is locked to the following design decisions unless implementation reveals a verified blocker and change control is approved:

```text
Hosted iframe + tiny first-party loader
Dedicated first-party embed origin on the same Worker deployment model
Shared calculator renderer registry, not a generic schema/formula renderer
Memory-only widget calculator state
Opaque rotatable public widget key with ≥128-bit entropy
DNS TXT ownership verification only for production V1
Exact subdomain authorization with one apex/www pair rule
HTTPS-only production origins
Server-authoritative domain limits from Phase 07A commercial access
Dynamic CSP frame-ancestors
One-way foundcalc:ready / foundcalc:resize protocol
Controlled theme tokens only
Server-derived branding
Friends persistent Powered by Found Calc attribution
Besties optional attribution removal + controlled theme + standard aggregate analytics
Family current 10-domain limit + V1 white-label + advanced aggregate entitlement boundary
Daily privacy-safe analytics aggregates with 90-day retention
Additive migration 0006_phase07b_widget_platform.sql
Exactly three existing reference slices for architecture proof
No Phase 08 calculator production
```
