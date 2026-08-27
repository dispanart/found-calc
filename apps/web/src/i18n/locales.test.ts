import { describe, expect, it } from "vitest";

import { isLocale, locales } from "./locales";

describe("locale contract", () => {
  it("accepts only launch locales", () => {
    expect(locales).toEqual(["id", "en"]);
    expect(isLocale("id")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});
