import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("embed loader is dependency-free, sandboxed, one-way, and validates message provenance", () => {
  const loaderPath = "public/embed.js";
  assert.equal(existsSync(url(loaderPath)), true, `${loaderPath} must exist`);
  const source = read(loaderPath);
  assert.doesNotMatch(source, /\bimport\b|\brequire\s*\(/);
  assert.match(source, /data-foundcalc-widget/);
  assert.match(source, /data-foundcalc-title/);
  assert.match(source, /allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox/);
  assert.doesNotMatch(source, /allow-top-navigation|allow-forms|allow-storage-access/);
  assert.match(source, /event\.origin\s*!==\s*embedOrigin/);
  assert.match(source, /event\.source\s*!==\s*iframe\.contentWindow/);
  assert.match(source, /protocolVersion\s*!==\s*1/);
  assert.match(source, /widgetKey\s*!==\s*widgetKey/);
  assert.match(source, /Math\.min\(4000,\s*Math\.max\(160/);
  assert.doesNotMatch(source, /postMessage\s*\([^)]*,\s*["']\*["']/s);
  assert.doesNotMatch(source, /setInput|getResult|foundcalc:calculate|querySelectorAll\([^)]*(input|result)/i);
});

test("child lifecycle sends only ready/resize to the exact authorized parent origin", () => {
  const componentPath = "src/components/widgets/widget-lifecycle.tsx";
  assert.equal(existsSync(url(componentPath)), true, `${componentPath} must exist`);
  const source = read(componentPath);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /foundcalc:ready/);
  assert.match(source, /foundcalc:resize/);
  assert.match(source, /runtime\.parentOrigin/);
  assert.doesNotMatch(source, /postMessage\s*\([^)]*,\s*["']\*["']/s);
  assert.doesNotMatch(source, /setInput|getResult|foundcalc:calculate/);
});
