import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function parseJsonc(source) {
  return JSON.parse(source.replace(/^\s*\/\/.*$/gm, ""));
}

test("Cloudflare foundation declares vinext and a local D1 DB binding", async () => {
  const vite = await readFile("apps/web/vite.config.ts", "utf8");
  assert.match(vite, /vinext\(\)/);
  assert.match(vite, /cloudflare\(/);
  assert.match(vite, /childEnvironments:\s*\["ssr"\]/);

  const wrangler = parseJsonc(await readFile("apps/web/wrangler.jsonc", "utf8"));
  assert.equal(wrangler.name, "found-calc-web");
  assert.equal(wrangler.compatibility_date, "2026-08-27");
  assert.equal(wrangler.main, "vinext/server/app-router-entry");
  assert.equal(wrangler.d1_databases?.[0]?.binding, "DB");
  assert.equal(wrangler.d1_databases?.[0]?.database_name, "found-calc-local");
  assert.equal(wrangler.d1_databases?.[0]?.database_id, "00000000-0000-0000-0000-000000000000");
  assert.equal(wrangler.d1_databases?.[0]?.preview_database_id, "found-calc-local");
});
