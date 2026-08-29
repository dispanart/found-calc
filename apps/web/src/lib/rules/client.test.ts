import { describe, expect, it, vi } from "vitest";
import { fetchPublishedRuleVersions, parsePublishedRuleFeed } from "./client";

const feed = {
  ruleId: "reference.synthetic-rate",
  versions: [{
    ruleId: "reference.synthetic-rate",
    versionId: "2026-a",
    effectiveFrom: "2026-01-01",
    payload: { ratePercent: "7.5" },
    provenance: { sourceId: "synthetic-reference-fixture" },
  }],
};

describe("published rule feed client", () => {
  it("hydrates the strict published rule shape", () => {
    expect(parsePublishedRuleFeed(feed)?.[0]?.versionId).toBe("2026-a");
    expect(parsePublishedRuleFeed({ ...feed, versions: [{ ...feed.versions[0], status: "draft" }] })).toBeNull();
    expect(parsePublishedRuleFeed({ ...feed, versions: [{ ...feed.versions[0], payload: { ratePercent: "7.50000" } }] })).toBeNull();
  });

  it("fetches only through the first-party public route and rejects bad responses", async () => {
    const okFetch = vi.fn(async () => Response.json(feed)) as unknown as typeof fetch;
    await expect(fetchPublishedRuleVersions("reference.synthetic-rate", undefined, okFetch)).resolves.toHaveLength(1);
    expect(okFetch).toHaveBeenCalledWith(
      "/api/rules/reference.synthetic-rate/versions",
      expect.objectContaining({ cache: "no-store" }),
    );

    const badFetch = vi.fn(async () => Response.json({ nope: true })) as unknown as typeof fetch;
    await expect(fetchPublishedRuleVersions("reference.synthetic-rate", undefined, badFetch)).rejects.toThrow("rule-feed-invalid");
  });
});
