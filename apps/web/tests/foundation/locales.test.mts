import assert from "node:assert/strict";
import test from "node:test";

import { isLocale, locales } from "../../src/i18n/locales.ts";

test("locale contract accepts only the launch locales", () => {
  assert.deepEqual(locales, ["id", "en"]);
  assert.equal(isLocale("id"), true);
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("fr"), false);
  assert.equal(isLocale(""), false);
});
