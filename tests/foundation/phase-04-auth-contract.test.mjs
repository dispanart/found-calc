import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 04 auth is D1-backed Better Auth with email/password only", () => {
  const server = read("apps/web/src/lib/auth/server.ts");
  const route = read("apps/web/src/app/api/auth/[...all]/route.ts");
  const client = read("apps/web/src/lib/auth/client.ts");
  const config = read("apps/web/next.config.ts");
  const example = read("apps/web/.dev.vars.example");

  assert.match(server, /betterAuth/);
  assert.match(server, /drizzleAdapter/);
  assert.match(server, /emailAndPassword\s*:\s*\{[\s\S]*enabled\s*:\s*true/);
  assert.match(server, /BETTER_AUTH_SECRET/);
  assert.doesNotMatch(server, /socialProviders|twoFactor|organization\(/);
  assert.match(route, /toNextJsHandler/);
  assert.match(client, /createAuthClient/);
  assert.match(config, /cloudflare:workers/);
  assert.match(example, /BETTER_AUTH_SECRET=/);
  assert.doesNotMatch(example, /[A-Za-z0-9_-]{48,}/, "example must not contain a realistic committed secret");
});
