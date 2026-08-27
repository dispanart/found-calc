import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const requiredFiles = [
  "apps/web/src/app/layout.tsx",
  "apps/web/src/app/page.tsx",
  "apps/web/src/app/[locale]/layout.tsx",
  "apps/web/src/app/[locale]/(public)/page.tsx",
  "apps/web/src/app/[locale]/(workspace)/workspace/page.tsx",
  "apps/web/src/app/[locale]/(admin)/admin/page.tsx",
  "apps/web/src/components/site-header.tsx",
  "apps/web/src/components/ui/button.tsx",
  "apps/web/src/app/globals.css",
];

test("Phase 01 exposes the public, workspace, and admin locale shells", async () => {
  for (const file of requiredFiles) {
    const source = await readFile(file, "utf8");
    assert.ok(source.length > 0, `${file} should not be empty`);
  }

  const rootPage = await readFile("apps/web/src/app/page.tsx", "utf8");
  assert.match(rootPage, /redirect\(["']\/id["']\)/);

  const localeLayout = await readFile("apps/web/src/app/[locale]/layout.tsx", "utf8");
  assert.match(localeLayout, /notFound\(\)/);
  assert.match(localeLayout, /generateStaticParams/);

  const header = await readFile("apps/web/src/components/site-header.tsx", "utf8");
  assert.match(header, /aria-label=/);
  assert.match(header, /localeSwitchLabel/);
});
