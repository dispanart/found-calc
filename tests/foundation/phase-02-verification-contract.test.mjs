import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readText = (relativePath) => readFile(path.join(repositoryRoot, relativePath), "utf8");

const collectTypeScriptFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTypeScriptFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }

  return files;
};

test("Phase 02 verification remains a superset of engine, rules, and Phase 01 gates", async () => {
  const [rootPackageText, phase02Script, phase02Workflow] = await Promise.all([
    readText("package.json"),
    readText("scripts/verify-phase-02.mjs"),
    readText(".github/workflows/phase-02-verification.yml"),
  ]);
  const rootPackage = JSON.parse(rootPackageText);

  assert.match(rootPackage.scripts["verify:phase02"], /verify-phase-02\.mjs/);
  assert.match(phase02Script, /@found-calc\/engine/);
  assert.match(phase02Script, /@found-calc\/rules/);
  assert.match(phase02Script, /verify-phase-01\.mjs|verify:phase01/);
  assert.match(phase02Workflow, /pnpm install --frozen-lockfile/);
  assert.match(phase02Workflow, /pnpm verify:phase02/);
  assert.match(phase02Workflow, /playwright install --with-deps chromium/);
  assert.match(phase02Workflow, /127\.0\.0\.1:8787\/id/);
  assert.match(phase02Workflow, /127\.0\.0\.1:8787\/en/);
});

test("engine source stays isolated from rules, UI, runtime bindings, I/O, and hidden nondeterminism", async () => {
  const engineRoot = path.join(repositoryRoot, "packages/engine/src");
  const files = await collectTypeScriptFiles(engineRoot);
  assert.ok(files.length > 0, "expected engine TypeScript sources");

  const forbidden = [
    ["rules package dependency", /@found-calc\/rules/],
    ["Next.js dependency", /["']next\//],
    ["React dependency", /\breact\b/i],
    ["Cloudflare runtime dependency", /\bcloudflare\b/i],
    ["Wrangler dependency", /\bwrangler\b/i],
    ["D1 binding dependency", /\bD1(?:Database)?\b/],
    ["network fetch", /\bfetch\s*\(/],
    ["wall-clock time", /Date\.now\s*\(/],
    ["randomness", /Math\.random\s*\(/],
    ["locale-sensitive Intl usage", /\bIntl\./],
  ];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const relativePath = path.relative(repositoryRoot, file);
    for (const [label, pattern] of forbidden) {
      assert.doesNotMatch(source, pattern, `${relativePath} contains forbidden ${label}`);
    }
  }
});
