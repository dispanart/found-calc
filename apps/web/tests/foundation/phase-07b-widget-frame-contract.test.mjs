import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("public embed route re-authorizes runtime and uses canonical catalog entry", () => {
  const pagePath = "src/app/embed/[publicWidgetKey]/page.tsx";
  assert.equal(existsSync(url(pagePath)), true, `${pagePath} must exist`);
  const page = read(pagePath);
  assert.match(page, /resolvePublicWidgetRuntime/);
  assert.match(page, /getWidgetRouteServices/);
  assert.match(page, /getCalculatorById/);
  assert.match(page, /parentOrigin/);
  assert.match(page, /notFound\(\)/);
  assert.doesNotMatch(page, /ownerUserId|subscription|billing|provider/i);
});

test("widget frame renders only shared calculator surface with controlled theme and attribution", () => {
  const framePath = "src/components/widgets/widget-frame.tsx";
  assert.equal(existsSync(url(framePath)), true, `${framePath} must exist`);
  const frame = read(framePath);
  assert.match(frame, /CalculatorRenderer/);
  assert.match(frame, /surface:\s*["']widget["']/);
  assert.match(frame, /initialDefaults:\s*runtime\.defaults/);
  assert.match(frame, /runtime\.branding\s*===\s*["']foundcalc["']/);
  assert.match(frame, /Powered by Found Calc/);
  assert.match(frame, /target=["']_blank["']/);
  assert.match(frame, /noopener noreferrer/);
  assert.match(frame, /runtime\.theme\.showTitle/);
  assert.match(frame, /sr-only/);
  assert.match(frame, /<main/);
  assert.doesNotMatch(frame, /PersistenceControls|WorkspaceCalculationControls|SiteHeader|Pricing|SignIn|Auth/);
  assert.doesNotMatch(frame, /dangerouslySetInnerHTML|style=\{\{[^}]*runtime\.theme/);
});

test("widget theme maps only enumerated runtime tokens without overriding trust or focus colors", () => {
  const frame = read("src/components/widgets/widget-frame.tsx");
  const css = read("src/app/globals.css");
  for (const token of ["appearance", "accent", "density", "radiusPreset"]) assert.match(frame, new RegExp(`runtime\\.theme\\.${token}`));
  assert.match(css, /foundcalc-widget/);
  assert.doesNotMatch(css, /\.foundcalc-widget[^}]*--trust|\.foundcalc-widget[^}]*--ring/s);
});
