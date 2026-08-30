import type { D1Database } from "@cloudflare/workers-types";

import type { FoundCalcAuth } from "@/lib/auth/server";
import type { CommercialCapabilityAuthorizer } from "@/lib/billing/capabilities";
import {
  isWorkspaceId,
  MAX_WORKSPACE_BODY_BYTES,
  parseGoalInput,
  parseGoalPatch,
  parseProjectInput,
  parseProjectPatch,
  type WorkspaceParseResult,
} from "./contracts";
import {
  handleWorkspaceGoalRequest,
  handleWorkspaceGoalsRequest,
  handleWorkspaceProjectRequest,
  handleWorkspaceProjectsRequest,
} from "./http";
import {
  createGoalWithinLimit,
  createProjectWithinLimit,
  updateGoalWithinLimit,
  updateProjectWithinLimit,
  WorkspaceCommercialLimitError,
} from "./limited-repository";
import { createWorkspaceRepository, WorkspaceRepositoryError } from "./repository";

interface CommercialWorkspaceServices {
  readonly DB: D1Database;
  readonly auth: FoundCalcAuth;
  readonly capabilities: CommercialCapabilityAuthorizer;
}

const noStoreHeaders = { "Cache-Control": "no-store" } as const;
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: noStoreHeaders });
const error = (code: string, status: number) => json({ error: { code } }, status);

const authenticate = async (request: Request, services: CommercialWorkspaceServices) => {
  const session = await services.auth.api.getSession({ headers: request.headers });
  return session?.user.id
    ? { ok: true as const, userId: session.user.id }
    : { ok: false as const, response: error("authentication-required", 401) };
};

const readJson = async (
  request: Request,
): Promise<{ readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly response: Response }> => {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_WORKSPACE_BODY_BYTES) {
    return { ok: false, response: error("payload-too-large", 413) };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_WORKSPACE_BODY_BYTES) {
    return { ok: false, response: error("payload-too-large", 413) };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: error("invalid-json", 400) };
  }
};

const parsedBody = async <T>(
  request: Request,
  parser: (value: unknown) => WorkspaceParseResult<T>,
): Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false; readonly response: Response }> => {
  const body = await readJson(request);
  if (!body.ok) return body;
  const parsed = parser(body.value);
  if (!parsed.ok) {
    return { ok: false, response: error(parsed.code, parsed.code === "payload-too-large" ? 413 : 400) };
  }
  return parsed;
};

const commercialWorkspaceError = (caught: unknown): Response => {
  if (caught instanceof WorkspaceCommercialLimitError) return error("commercial-limit-reached", 409);
  if (!(caught instanceof WorkspaceRepositoryError)) return error("storage-unavailable", 503);
  switch (caught.code) {
    case "invalid-workspace-input": return error(caught.code, 400);
    case "workspace-not-found": return error(caught.code, 404);
    case "workspace-forbidden":
    case "project-read-only": return error(caught.code, 403);
    case "workspace-conflict": return error(caught.code, 409);
    case "invite-invalid": return error(caught.code, 400);
    case "invite-expired":
    case "invite-used": return error(caught.code, 410);
    case "stored-workspace-invalid": return error("storage-unavailable", 503);
    default: return error("storage-unavailable", 503);
  }
};

export const handleCommercialWorkspaceGoalsRequest = async (
  method: "GET" | "POST",
  request: Request,
  services: CommercialWorkspaceServices,
): Promise<Response> => {
  if (method === "GET") return handleWorkspaceGoalsRequest(method, request, services);
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const body = await parsedBody(request, parseGoalInput);
    if (!body.ok) return body.response;
    const limits = await services.capabilities.getLimits(auth.userId);
    const goal = await createGoalWithinLimit(services.DB, auth.userId, body.value, limits.activeGoals);
    return json({ goal }, 201);
  } catch (caught) {
    return commercialWorkspaceError(caught);
  }
};

export const handleCommercialWorkspaceGoalRequest = async (
  method: "PATCH" | "DELETE",
  request: Request,
  goalId: string,
  services: CommercialWorkspaceServices,
): Promise<Response> => {
  if (method === "DELETE") return handleWorkspaceGoalRequest(method, request, goalId, services);
  if (!isWorkspaceId(goalId)) return error("workspace-not-found", 404);
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const body = await parsedBody(request, parseGoalPatch);
    if (!body.ok) return body.response;
    const limits = await services.capabilities.getLimits(auth.userId);
    const goal = await updateGoalWithinLimit(services.DB, auth.userId, goalId, body.value, limits.activeGoals);
    return goal ? json({ goal }) : error("workspace-not-found", 404);
  } catch (caught) {
    return commercialWorkspaceError(caught);
  }
};

export const handleCommercialWorkspaceProjectsRequest = async (
  method: "GET" | "POST",
  request: Request,
  services: CommercialWorkspaceServices,
): Promise<Response> => {
  if (method === "GET") return handleWorkspaceProjectsRequest(method, request, services);
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const body = await parsedBody(request, parseProjectInput);
    if (!body.ok) return body.response;
    const limits = await services.capabilities.getLimits(auth.userId);
    const project = await createProjectWithinLimit(services.DB, auth.userId, body.value, limits.activeProjects);
    return json({ project }, 201);
  } catch (caught) {
    return commercialWorkspaceError(caught);
  }
};

export const handleCommercialWorkspaceProjectRequest = async (
  method: "GET" | "PATCH" | "DELETE",
  request: Request,
  projectId: string,
  services: CommercialWorkspaceServices,
): Promise<Response> => {
  if (method !== "PATCH") return handleWorkspaceProjectRequest(method, request, projectId, services);
  if (!isWorkspaceId(projectId)) return error("workspace-not-found", 404);
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repository = createWorkspaceRepository(services.DB);
    const project = await repository.getProject(projectId, auth.userId);
    if (!project) return error("workspace-not-found", 404);
    if (project.access !== "owner") return error("workspace-forbidden", 403);
    const body = await parsedBody(request, parseProjectPatch);
    if (!body.ok) return body.response;
    const limits = await services.capabilities.getLimits(auth.userId);
    const updated = await updateProjectWithinLimit(services.DB, auth.userId, projectId, body.value, limits.activeProjects);
    return updated ? json({ project: updated }) : error("workspace-not-found", 404);
  } catch (caught) {
    return commercialWorkspaceError(caught);
  }
};