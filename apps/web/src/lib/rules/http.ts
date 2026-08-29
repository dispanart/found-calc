import type { D1Database } from "@cloudflare/workers-types";

import type { FoundCalcAuth } from "@/lib/auth/server";
import { MAX_RULE_REQUEST_BYTES, SYNTHETIC_RATE_RULE_ID } from "./payload";
import { createRuleVersionRepository, RuleRepositoryError, type StoredRuleVersion } from "./repository";

interface RuleServices {
  readonly DB: D1Database;
  readonly auth: FoundCalcAuth;
  readonly adminUserIds: readonly string[];
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const error = (code: string, status: number) => json({ error: { code } }, status);

const publicVersion = (version: StoredRuleVersion) => ({
  ruleId: version.ruleId,
  versionId: version.versionId,
  effectiveFrom: version.effectiveFrom,
  ...(version.effectiveUntil === undefined ? {} : { effectiveUntil: version.effectiveUntil }),
  payload: version.payload,
  provenance: {
    sourceId: version.provenance.sourceId,
    ...(version.provenance.sourceUrl === undefined ? {} : { sourceUrl: version.provenance.sourceUrl }),
  },
});

const adminVersion = (version: StoredRuleVersion) => ({
  ...publicVersion(version),
  id: version.id,
  status: version.status,
  ...(version.createdByUserId === undefined ? {} : { createdByUserId: version.createdByUserId }),
  createdAt: version.createdAt,
  ...(version.publishedByUserId === undefined ? {} : { publishedByUserId: version.publishedByUserId }),
  ...(version.publishedAt === undefined ? {} : { publishedAt: version.publishedAt }),
});

const authorizeAdmin = async (request: Request, services: RuleServices) => {
  const session = await services.auth.api.getSession({ headers: request.headers });
  if (!session) return { ok: false as const, response: error("authentication-required", 401) };
  const user = session.user as typeof session.user & { readonly role?: string | null };
  if (user.role !== "admin" && !services.adminUserIds.includes(user.id)) {
    return { ok: false as const, response: error("admin-required", 403) };
  }
  return { ok: true as const, userId: user.id };
};

const readJson = async (request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> => {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_RULE_REQUEST_BYTES) {
    return { ok: false, response: error("payload-too-large", 413) };
  }
  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_RULE_REQUEST_BYTES) {
    return { ok: false, response: error("payload-too-large", 413) };
  }
  try {
    return { ok: true, value: JSON.parse(bodyText) as unknown };
  } catch {
    return { ok: false, response: error("invalid-json", 400) };
  }
};

const repositoryError = (caught: unknown): Response => {
  if (!(caught instanceof RuleRepositoryError)) return error("storage-unavailable", 503);
  switch (caught.code) {
    case "invalid-rule-draft": return error(caught.code, 400);
    case "duplicate-version":
    case "publication-overlap":
    case "rule-version-not-draft": return error(caught.code, 409);
    case "rule-version-not-found": return error(caught.code, 404);
    default: return error("storage-unavailable", 503);
  }
};

export const handlePublishedRuleVersionsRequest = async (
  ruleId: string,
  services: Pick<RuleServices, "DB">,
): Promise<Response> => {
  if (ruleId !== SYNTHETIC_RATE_RULE_ID) return error("unsupported-rule", 404);
  try {
    const versions = await createRuleVersionRepository(services.DB).listPublishedVersions(ruleId);
    return json({ ruleId, versions: versions.map(publicVersion) });
  } catch {
    return error("storage-unavailable", 503);
  }
};

export const handleAdminRuleVersionsRequest = async (
  method: "GET" | "POST",
  request: Request,
  services: RuleServices,
): Promise<Response> => {
  try {
    const authorization = await authorizeAdmin(request, services);
    if (!authorization.ok) return authorization.response;
    const repo = createRuleVersionRepository(services.DB);

    if (method === "GET") {
      const ruleId = new URL(request.url).searchParams.get("ruleId") ?? SYNTHETIC_RATE_RULE_ID;
      if (ruleId !== SYNTHETIC_RATE_RULE_ID) return error("unsupported-rule", 404);
      const versions = await repo.listAdminVersions(ruleId);
      return json({ ruleId, versions: versions.map(adminVersion) });
    }

    const body = await readJson(request);
    if (!body.ok) return body.response;
    const created = await repo.createDraft(body.value, authorization.userId);
    return json({ version: adminVersion(created) }, 201);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleAdminRulePublishRequest = async (
  request: Request,
  id: string,
  services: RuleServices,
): Promise<Response> => {
  try {
    const authorization = await authorizeAdmin(request, services);
    if (!authorization.ok) return authorization.response;
    const published = await createRuleVersionRepository(services.DB).publish(id, authorization.userId);
    return json({ version: adminVersion(published) });
  } catch (caught) {
    return repositoryError(caught);
  }
};
