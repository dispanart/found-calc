import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(`apps/web/${path}`, "utf8");

test("Phase 08A calculator directory presents Quick products first from the aggregate catalog", async () => {
  const source = await read("src/app/[locale]/(public)/calculators/page.tsx");
  assert.match(source, /calculatorCatalog/);
  assert.match(source, /quickCatalog/);
  assert.match(source, /quickCalculatorsTitle/);
  assert.match(source, /contextCalculatorsTitle/);
  assert.doesNotMatch(source, /referenceCatalog\.map/);
});

test("homepage discovery promotes the intentional Quick cluster instead of the historical three-reference slice", async () => {
  const source = await read("src/app/[locale]/(public)/page.tsx");
  assert.match(source, /quickCatalog/);
  assert.doesNotMatch(source, /referenceCatalog\.map/);
});

test("ID and EN discovery copy no longer describes the product as only three references", async () => {
  const source = await read("src/i18n/messages.ts");
  assert.match(source, /quickCalculatorsTitle/);
  assert.match(source, /contextCalculatorsTitle/);
  assert.doesNotMatch(source, /Tiga referensi|Three references|Kalkulator referensi|Reference calculators/);
});
