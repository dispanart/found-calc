import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createRuleVersionRepository, RuleRepositoryError } from "../../src/lib/rules/repository";
import { resetCurrentDatabase } from "./test-database";

declare module "cloudflare:workers" {
  interface ProvidedEnv { DB: D1Database; }
}

const actorId = "phase05-admin";
const draft = (overrides: Record<string, unknown> = {}) => ({
  ruleId: "reference.synthetic-rate",
  versionId: "2027-a",
  effectiveFrom: "2027-01-01",
  effectiveUntil: "2027-12-31",
  payload: { ratePercent: "8.25" },
  provenance: { sourceId: "synthetic-admin-test", sourceUrl: "https://example.test/rule" },
  ...overrides,
});

beforeEach(async () => {
  await resetCurrentDatabase();
  await env.DB.prepare(
    "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'admin', 0)",
  ).bind(actorId, "Phase 05 Admin", "phase05-admin@example.test").run();
});

describe("rule version repository", () => {
  it("hydrates the two seeded synthetic published versions", async () => {
    const repo = createRuleVersionRepository(env.DB);
    const versions = await repo.listPublishedVersions("reference.synthetic-rate");
    expect(versions.map((version) => [version.versionId, version.payload.ratePercent, version.status])).toEqual([
      ["2025-a", "5", "published"],
      ["2026-a", "7.5", "published"],
    ]);
  });

  it("keeps drafts admin-only and rejects duplicate identities", async () => {
    const repo = createRuleVersionRepository(env.DB);
    const created = await repo.createDraft(draft(), actorId);
    expect(created.status).toBe("draft");
    expect((await repo.listAdminVersions("reference.synthetic-rate")).some((version) => version.id === created.id)).toBe(true);
    expect((await repo.listPublishedVersions("reference.synthetic-rate")).some((version) => version.id === created.id)).toBe(false);

    await expect(repo.createDraft(draft(), actorId)).rejects.toMatchObject<Partial<RuleRepositoryError>>({ code: "duplicate-version" });
  });

  it("rejects overlapping publication and persists immutable publication metadata", async () => {
    const repo = createRuleVersionRepository(env.DB);
    const overlapping = await repo.createDraft(draft({ versionId: "2026-overlap", effectiveFrom: "2026-06-01" }), actorId);
    await expect(repo.publish(overlapping.id, actorId)).rejects.toMatchObject<Partial<RuleRepositoryError>>({ code: "publication-overlap" });

    const historical = await repo.createDraft(draft({
      versionId: "2024-a",
      effectiveFrom: "2024-01-01",
      effectiveUntil: "2024-12-31",
    }), actorId);
    const published = await repo.publish(historical.id, actorId);
    expect(published.status).toBe("published");
    expect(published.publishedByUserId).toBe(actorId);
    expect(published.publishedAt).toBeTypeOf("number");
    await expect(repo.publish(historical.id, actorId)).resolves.toMatchObject({
      id: historical.id,
      status: "published",
      publishedByUserId: actorId,
      publishedAt: published.publishedAt,
    });

    await expect(env.DB.prepare("UPDATE rule_version SET payload_json = ? WHERE id = ?")
      .bind('{"ratePercent":"9"}', historical.id).run()).rejects.toThrow(/rule_version_published_immutable/);
  });
});
