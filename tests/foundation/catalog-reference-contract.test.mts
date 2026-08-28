import assert from "node:assert/strict";
import test from "node:test";

import {
  getReferenceCalculatorById,
  getReferenceCalculatorBySlug,
  referenceCatalog,
} from "../../packages/catalog/src/catalog.ts";

test("Phase 03 reference catalog contains exactly three complete localized calculators", () => {
  assert.equal(referenceCatalog.length, 3);

  const ids = referenceCatalog.map((entry) => entry.id);
  const slugs = referenceCatalog.map((entry) => entry.slug);
  assert.equal(new Set(ids).size, 3);
  assert.equal(new Set(slugs).size, 3);
  assert.deepEqual(slugs, ["discount", "business-margin", "synthetic-rule-reference"]);

  for (const entry of referenceCatalog) {
    assert.ok(entry.copy.id.title.length > 0);
    assert.ok(entry.copy.en.title.length > 0);
    assert.ok(entry.copy.id.description.length > 0);
    assert.ok(entry.copy.en.description.length > 0);
    assert.ok(Object.keys(entry.copy.id.fields).length > 0);
    assert.ok(Object.keys(entry.copy.en.fields).length > 0);
    assert.ok(Object.keys(entry.copy.id.results).length > 0);
    assert.ok(Object.keys(entry.copy.en.results).length > 0);
    assert.equal(getReferenceCalculatorBySlug(entry.slug)?.id, entry.id);
    assert.equal(getReferenceCalculatorById(entry.id)?.slug, entry.slug);
    for (const relatedId of entry.relatedCalculatorIds) {
      assert.ok(ids.includes(relatedId));
      assert.notEqual(relatedId, entry.id);
    }
  }

  const synthetic = getReferenceCalculatorBySlug("synthetic-rule-reference");
  assert.equal(synthetic?.classification, "rule-based");
  assert.equal(synthetic?.syntheticWarning, true);

  for (const entry of referenceCatalog.filter((item) => item.slug !== "synthetic-rule-reference")) {
    assert.equal(entry.classification, "exact/deterministic");
    assert.equal(entry.syntheticWarning, false);
  }
});
