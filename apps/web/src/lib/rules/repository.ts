import type { D1Database } from "@cloudflare/workers-types";
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { findOverlappingRuleVersion, type RuleVersion } from "@found-calc/rules";

import { ruleVersions } from "../persistence/schema";
import { parseSupportedRuleDraft, type SupportedRuleDraft, type SyntheticRatePayload } from "./payload";

export type RuleVersionStatus = "draft" | "published";

export interface StoredRuleVersion extends RuleVersion<SyntheticRatePayload> {
  readonly id: string;
  readonly status: RuleVersionStatus;
  readonly provenance: RuleVersion<SyntheticRatePayload>["provenance"] & { readonly sourceUrl?: string };
  readonly createdByUserId?: string;
  readonly createdAt: number;
  readonly publishedByUserId?: string;
  readonly publishedAt?: number;
}

export type RuleRepositoryErrorCode =
  | "invalid-rule-draft"
  | "duplicate-version"
  | "rule-version-not-found"
  | "rule-version-not-draft"
  | "publication-overlap"
  | "stored-rule-invalid";

export class RuleRepositoryError extends Error {
  readonly code: RuleRepositoryErrorCode;
  constructor(code: RuleRepositoryErrorCode) {
    super(code);
    this.name = "RuleRepositoryError";
    this.code = code;
  }
}

const rowToStored = (row: typeof ruleVersions.$inferSelect): StoredRuleVersion => {
  let payload: unknown;
  try {
    payload = JSON.parse(row.payloadJson);
  } catch {
    throw new RuleRepositoryError("stored-rule-invalid");
  }
  const parsed = parseSupportedRuleDraft({
    ruleId: row.ruleId,
    versionId: row.versionId,
    effectiveFrom: row.effectiveFrom,
    ...(row.effectiveUntil === null ? {} : { effectiveUntil: row.effectiveUntil }),
    payload,
    provenance: {
      sourceId: row.sourceId,
      ...(row.sourceUrl === null ? {} : { sourceUrl: row.sourceUrl }),
    },
  });
  if (!parsed.ok) throw new RuleRepositoryError("stored-rule-invalid");

  return {
    id: row.id,
    ruleId: parsed.value.ruleId,
    versionId: parsed.value.versionId,
    effectiveFrom: parsed.value.effectiveFrom,
    ...(parsed.value.effectiveUntil === undefined ? {} : { effectiveUntil: parsed.value.effectiveUntil }),
    payload: parsed.value.payload,
    provenance: parsed.value.provenance,
    status: row.status,
    ...(row.createdByUserId === null ? {} : { createdByUserId: row.createdByUserId }),
    createdAt: row.createdAt.getTime(),
    ...(row.publishedByUserId === null ? {} : { publishedByUserId: row.publishedByUserId }),
    ...(row.publishedAt === null ? {} : { publishedAt: row.publishedAt.getTime() }),
  };
};

const errorChainIncludes = (error: unknown, marker: string): boolean => {
  const needle = marker.toLowerCase();
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    if (current.message.toLowerCase().includes(needle)) return true;
    current = current.cause;
  }

  return false;
};

export const createRuleVersionRepository = (binding: D1Database) => {
  const db = drizzle(binding);

  const listAdminVersions = async (ruleId: string): Promise<StoredRuleVersion[]> =>
    (await db.select().from(ruleVersions).where(eq(ruleVersions.ruleId, ruleId)).orderBy(asc(ruleVersions.effectiveFrom)))
      .map(rowToStored);

  const listPublishedVersions = async (ruleId: string): Promise<StoredRuleVersion[]> =>
    (await db.select().from(ruleVersions).where(and(eq(ruleVersions.ruleId, ruleId), eq(ruleVersions.status, "published")))
      .orderBy(asc(ruleVersions.effectiveFrom)))
      .map(rowToStored);

  const getById = async (id: string): Promise<StoredRuleVersion | null> => {
    const rows = await db.select().from(ruleVersions).where(eq(ruleVersions.id, id)).limit(1);
    return rows[0] ? rowToStored(rows[0]) : null;
  };

  const createDraft = async (unknownInput: unknown, actorId: string): Promise<StoredRuleVersion> => {
    const parsed = parseSupportedRuleDraft(unknownInput);
    if (!parsed.ok) throw new RuleRepositoryError("invalid-rule-draft");
    const input: SupportedRuleDraft = parsed.value;
    const id = crypto.randomUUID();
    try {
      await db.insert(ruleVersions).values({
        id,
        ruleId: input.ruleId,
        versionId: input.versionId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil ?? null,
        payloadJson: JSON.stringify(input.payload),
        sourceId: input.provenance.sourceId,
        sourceUrl: input.provenance.sourceUrl ?? null,
        status: "draft",
        createdByUserId: actorId,
      });
    } catch (error) {
      if (errorChainIncludes(error, "unique constraint failed")) {
        throw new RuleRepositoryError("duplicate-version");
      }
      throw error;
    }
    const stored = await getById(id);
    if (!stored) throw new RuleRepositoryError("stored-rule-invalid");
    return stored;
  };

  const publish = async (id: string, actorId: string): Promise<StoredRuleVersion> => {
    const candidate = await getById(id);
    if (!candidate) throw new RuleRepositoryError("rule-version-not-found");
    if (candidate.status === "published") return candidate;
    if (candidate.status !== "draft") throw new RuleRepositoryError("rule-version-not-draft");

    const published = await listPublishedVersions(candidate.ruleId);
    if (findOverlappingRuleVersion(published, candidate)) {
      throw new RuleRepositoryError("publication-overlap");
    }

    const publishedAt = new Date();
    try {
      const result = await db.update(ruleVersions)
        .set({ status: "published", publishedByUserId: actorId, publishedAt })
        .where(and(eq(ruleVersions.id, id), eq(ruleVersions.status, "draft")));
      if (!result.meta.changes) throw new RuleRepositoryError("rule-version-not-draft");
    } catch (error) {
      if (errorChainIncludes(error, "rule_version_publication_overlap")) {
        throw new RuleRepositoryError("publication-overlap");
      }
      throw error;
    }

    const stored = await getById(id);
    if (!stored || stored.status !== "published") throw new RuleRepositoryError("stored-rule-invalid");
    return stored;
  };

  return { listAdminVersions, listPublishedVersions, createDraft, publish } as const;
};
