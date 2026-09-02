import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(`apps/web/${path}`, "utf8");
const calculatorIds = [
  "reference.discount",
  "reference.business-margin",
  "reference.synthetic-rule",
  "quick.percentage",
  "quick.date-difference",
  "quick.length-conversion",
] as const;

test("widget runtime, HTTP parser, and client accept the complete routable calculator set", async () => {
  for (const path of ["src/lib/widgets/runtime.ts", "src/lib/widgets/http.ts", "src/lib/widgets/client.ts"]) {
    const source = await read(path);
    for (const id of calculatorIds) assert.match(source, new RegExp(id.replaceAll(".", "\\.")), `${path} must support ${id}`);
  }
});

test("widget embed and preview resolve calculators from the aggregate catalog", async () => {
  for (const path of ["src/app/embed/[publicWidgetKey]/page.tsx", "src/app/widget-preview/[widgetId]/page.tsx"]) {
    const source = await read(path);
    assert.match(source, /getCalculatorById/);
  }
  const frame = await read("src/components/widgets/widget-frame.tsx");
  assert.match(frame, /CalculatorCatalogEntry/);
  assert.doesNotMatch(frame, /ReferenceCatalogEntry/);
});

test("widget creation exposes every widget-safe Phase 08A calculator with purpose-built safe defaults", async () => {
  const source = await read("src/components/widgets/widget-creation-flow.tsx");
  assert.match(source, /calculatorCatalog/);
  assert.match(source, /widgetSafe/);
  for (const id of calculatorIds) assert.match(source, new RegExp(id.replaceAll(".", "\\.")));
  for (const field of ["baseValue", "percentage", "startDate", "endDate", "value", "fromUnit", "toUnit"]) {
    assert.match(source, new RegExp(field));
  }
  assert.doesNotMatch(source, /definition\.inputs\.map|entry\.definition\.inputs\.map/);
});
