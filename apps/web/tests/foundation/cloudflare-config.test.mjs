import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function parseJsonc(source) {
  return JSON.parse(source.replace(/^\s*\/\/.*$/gm, ""));
}

test("Cloudflare foundation declares vinext and one local D1 identity shared by Wrangler and Vite", async () => {
  const vite = await readFile("apps/web/vite.config.ts", "utf8");
  assert.match(vite, /vinext\(/);
  assert.match(vite, /cloudflare\(/);
  assert.match(vite, /childEnvironments:\s*\["ssr"\]/);

  const wrangler = parseJsonc(await readFile("apps/web/wrangler.jsonc", "utf8"));
  assert.equal(wrangler.name, "found-calc-web");
  assert.equal(wrangler.compatibility_date, "2026-08-27");
  assert.equal(wrangler.main, "vinext/server/app-router-entry");
  assert.equal(wrangler.d1_databases?.[0]?.binding, "DB");
  assert.equal(wrangler.d1_databases?.[0]?.database_name, "found-calc-local");
  assert.equal(wrangler.d1_databases?.[0]?.database_id, "00000000-0000-0000-0000-000000000000");
  assert.equal(
    wrangler.d1_databases?.[0]?.preview_database_id,
    undefined,
    "local D1 must not use a preview ID different from database_id",
  );
});

test("vinext overrides the canonical Next config so the Node-only Cloudflare stub cannot leak into workerd", async () => {
  const [vite, next] = await Promise.all([
    readFile("apps/web/vite.config.ts", "utf8"),
    readFile("apps/web/next.config.ts", "utf8"),
  ]);

  assert.match(
    next,
    /"cloudflare:workers":\s*"\.\/src\/lib\/cloudflare-workers-build-stub\.ts"/,
    "canonical Next must retain its build-only Cloudflare stub",
  );
  assert.match(
    vite,
    /vinext\(\{[\s\S]*?nextConfig:\s*\{[\s\S]*?reactStrictMode:\s*true[\s\S]*?\}[\s\S]*?\}\)/,
    "vinext must provide an explicit inline nextConfig instead of inheriting the Turbopack alias",
  );
  assert.doesNotMatch(
    vite,
    /cloudflare-workers-build-stub/,
    "the Node build stub must never be aliased by the Cloudflare Vite runtime",
  );
});
