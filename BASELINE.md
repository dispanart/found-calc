# Found Calc Phase 01 — Repository & Cloudflare Foundation

**Project:** Found Calc
**Phase state:** COMPLETE
**Last canonical completed phase:** Phase 01 — Repository & Cloudflare Foundation
**Next phase:** Phase 02 — Deterministic Engine + Reference Vertical Slices
**Completion date:** 2026-08-28

## Canonical artifact

`found-calc-phase-01-foundation.zip`

This ZIP is the authoritative continuity baseline for the next Found Calc implementation chat. It supersedes `found-calc-phase-01-foundation-unverified.zip`.

## Completed deliverables

Phase 01 establishes the implementation foundation without pulling Phase 02+ domain behavior forward:

- pnpm workspace with strict TypeScript defaults;
- `apps/web` on Next.js 16 App Router;
- canonical Next.js build path kept independent from the Cloudflare compatibility path;
- Tailwind CSS v4, source-owned shadcn/ui setup, and Space Grotesk via `next/font/google`;
- Found Calc semantic design-token skeleton;
- native Bahasa Indonesia (`id`) and English (`en`) route shells;
- public, workspace, and admin route-group separation;
- vinext + Vite + Cloudflare Workers configuration;
- Wrangler configuration with local D1 binding `DB`;
- generated Cloudflare runtime types through `wrangler types`;
- Vitest, Cloudflare Workers Vitest, and Playwright test harnesses;
- GitHub Actions verification on Node 22 with frozen pnpm dependencies;
- strict Phase 01 verification script and Worker HTTP smoke test.

No Better Auth integration, Xendit integration, production persistence schema, calculator engine, production catalog behavior, or Phase 02+ vertical-slice behavior is included.

## Verification status

Canonical network-enabled verification passed with a committed `pnpm-lock.yaml` and `pnpm install --frozen-lockfile`.

The full gate covers:

1. six dependency-free foundation tests;
2. ESLint;
3. Cloudflare type generation + TypeScript app/test typecheck;
4. unit Vitest;
5. Cloudflare Workers Vitest proving local D1 access;
6. Playwright route/locale/responsive smoke tests;
7. canonical `next build`;
8. `vinext check`;
9. `vinext build`;
10. built/local Worker HTTP smoke for `/id` and `/en`.

Detailed evidence is in `docs/verification/phase-01-verification.md`.

## Current pinned/declared toolchain

- pnpm `11.24.0`
- Next.js `16.2.9`
- React / React DOM `19.2.8`
- Tailwind CSS `4.3.3`
- shadcn CLI `4.19.0`
- vinext `1.0.0-beta.8`
- Vite `8.2.2`
- `@cloudflare/vite-plugin` `1.54.1`
- Wrangler `4.127.0`
- `@cloudflare/vitest-plugin` `1.1.0`
- `@cloudflare/workers-types` `5.20260827.1`
- Playwright `1.62.1`

## Known limitations

- `apps/web/wrangler.jsonc` intentionally uses the all-zero local-only D1 UUID. A real Cloudflare D1 database ID is required before remote deployment.
- No Cloudflare account deployment, remote database creation, DNS operation, or credential mutation was performed in Phase 01.
- `vinext check` reports **88% compatible with 0 issues**: `next/font/google` and `reactStrictMode` are reported as partial support. Space Grotesk therefore remains a known vinext compatibility consideration for later hardening.
- The Cloudflare Vitest harness may warn that it cannot statically analyze the vinext Worker entry before a vinext build exists; the D1 binding runtime test itself passes.
- Phase 01 provides route and runtime foundations only; authentication, billing, deterministic calculation truth, and production data behavior intentionally remain for later phases.

## Continuity rule

Start Phase 02 in a **new chat inside the same Found Calc project** and attach this ZIP. Read `PHASE_HANDOFF.md` before implementation. Do not reopen approved architecture unless implementation exposes a real conflict that requires change control.
