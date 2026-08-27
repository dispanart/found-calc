import assert from "node:assert/strict";
import test from "node:test";

import { getMessages } from "../../src/i18n/messages.ts";

test("foundation messages are native for Indonesian and English shells", () => {
  const id = getMessages("id");
  const en = getMessages("en");

  assert.equal(id.brand, "Found Calc");
  assert.equal(en.brand, "Found Calc");
  assert.match(id.heroTitle, /keputusan/i);
  assert.match(en.heroTitle, /decision/i);
  assert.notEqual(id.heroTitle, en.heroTitle);
  assert.equal(id.localeSwitchLabel, "Ganti bahasa");
  assert.equal(en.localeSwitchLabel, "Change language");
});
