import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCanonicalDecimal,
  parseLocaleDecimal,
} from "../../apps/web/src/lib/presentation/decimal.ts";

test("locale decimal parser normalizes only unambiguous ID and EN inputs", () => {
  assert.deepEqual(parseLocaleDecimal("1.234,50", "id", 2), { ok: true, value: "1234.50" });
  assert.deepEqual(parseLocaleDecimal("10,5", "id", 2), { ok: true, value: "10.50" });
  assert.deepEqual(parseLocaleDecimal("1,234.50", "en", 2), { ok: true, value: "1234.50" });
  assert.deepEqual(parseLocaleDecimal("10.5", "en", 2), { ok: true, value: "10.50" });
  assert.deepEqual(parseLocaleDecimal("1.234", "id", 2), { ok: false, code: "ambiguous" });
  assert.deepEqual(parseLocaleDecimal("1,234", "en", 2), { ok: false, code: "ambiguous" });
  assert.deepEqual(parseLocaleDecimal("1e3", "en", 2), { ok: false, code: "malformed" });
  assert.deepEqual(parseLocaleDecimal("10.005", "en", 2), { ok: false, code: "scale-exceeded" });
  assert.deepEqual(parseLocaleDecimal("10.500", "en", 2), { ok: true, value: "10.50" });
});

test("canonical formatter changes presentation separators without changing value truth", () => {
  assert.equal(formatCanonicalDecimal("1234.50", "id"), "1.234,50");
  assert.equal(formatCanonicalDecimal("1234.50", "en"), "1,234.50");
  assert.equal(formatCanonicalDecimal("12.5000", "id", { style: "percent" }), "12,5000%");
});
