import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 07A configures Google through Better Auth without weakening the existing auth boundary", () => {
  const server = read("apps/web/src/lib/auth/server.ts");
  const route = read("apps/web/src/app/api/auth/[...all]/route.ts");
  const example = read("apps/web/.dev.vars.example");

  assert.match(server, /emailAndPassword\s*:\s*\{[\s\S]*enabled\s*:\s*true/);
  assert.match(server, /GOOGLE_CLIENT_ID/);
  assert.match(server, /GOOGLE_CLIENT_SECRET/);
  assert.match(server, /socialProviders\s*:/);
  assert.match(server, /google\s*:/);
  assert.match(server, /trustedOrigins/);
  assert.doesNotMatch(server, /allowDifferentEmails\s*:\s*true/);
  assert.doesNotMatch(server, /NEXT_PUBLIC_GOOGLE_(?:CLIENT_ID|CLIENT_SECRET)/);
  assert.match(route, /toNextJsHandler/);

  assert.match(example, /^GOOGLE_CLIENT_ID=$/m);
  assert.match(example, /^GOOGLE_CLIENT_SECRET=$/m);
  assert.match(example, /\/api\/auth\/callback\/google/);
  assert.doesNotMatch(example, /GOOGLE_CLIENT_SECRET=[^\s#]+/);
});