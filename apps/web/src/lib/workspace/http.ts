import type { D1Database } from "@cloudflare/workers-types";

import type { FoundCalcAuth } from "@/lib/auth/server";
import {
  isWorkspaceId,
  MAX_WORKSPACE_BODY_BYTES,
  parseGoalInput,
  parseGoalPatch,
  parseInviteInput,
  parseNamedCalculationInput,
  parseProfileInput,
  parseProjectInput,
  parseProjectPatch,
  type WorkspaceParseResult,
} from "./contracts";
import {
  createWorkspaceRepository,
  WorkspaceRepositoryError,
  type StoredWorkspaceCalculation,
  type WorkspaceParticipant,
} from "./repository";

interface WorkspaceServices {
  readonly DB: D1Database;
  readonly auth: FoundCalcAuth;
}

const noStoreHeaders = { "Cache-Control": "no-store" } as const;
const json = (body: unknown, status = 200, extraHeaders?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: {
      ...noStoreHeaders,
      ...Object.fromEntries(new Headers(extraHeaders).entries()),
    },
  });
const error = (code: string, status: number) => json({ error: { code } }, status);
const noContent = () => new Response(null, { status: 204, headers: noStoreHeaders });

const authenticate = async (request: Request, services: WorkspaceServices) => {
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

const repositoryError = (caught: unknown): Response => {
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

const calculationResponse = (calculation: StoredWorkspaceCalculation, canDelete?: boolean) => ({
  id: calculation.id,
  projectId: calculation.projectId,
  title: calculation.title,
  calculatorId: calculation.calculatorId,
  calculatorVersion: calculation.calculatorVersion,
  state: calculation.state,
  creatorDisplayName: calculation.creatorDisplayName,
  ...(calculation.ruleContext === undefined ? {} : { ruleContext: calculation.ruleContext }),
  createdAt: calculation.createdAt,
  ...(canDelete === undefined ? {} : { canDelete }),
});

const participantResponse = (
  participant: WorkspaceParticipant,
  includeMemberId: boolean,
) => ({
  ...(includeMemberId && participant.role !== "owner" ? { userId: participant.userId } : {}),
  displayName: participant.displayName,
  role: participant.role,
});

const requireWorkspaceId = (id: string): Response | null =>
  isWorkspaceId(id) ? null : error("workspace-not-found", 404);

const readRedeemCode = async (request: Request) => {
  const body = await readJson(request);
  if (!body.ok) return body;
  if (
    typeof body.value !== "object" || body.value === null || Array.isArray(body.value) ||
    Object.keys(body.value).length !== 1 || typeof (body.value as Record<string, unknown>).code !== "string"
  ) {
    return { ok: false as const, response: error("invalid-workspace-input", 400) };
  }
  return { ok: true as const, value: (body.value as { code: string }).code };
};

export const handleWorkspaceProfileRequest = async (
  method: "GET" | "PUT",
  request: Request,
  services: WorkspaceServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repo = createWorkspaceRepository(services.DB);
    if (method === "GET") return json({ profile: await repo.getProfile(auth.userId) });
    const body = await parsedBody(request, parseProfileInput);
    if (!body.ok) return body.response;
    return json({ profile: await repo.upsertProfile(auth.userId, body.value) });
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceGoalsRequest = async (
  method: "GET" | "POST",
  request: Request,
  services: WorkspaceServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repo = createWorkspaceRepository(services.DB);
    if (method === "GET") return json({ goals: await repo.listGoals(auth.userId) });
    const body = await parsedBody(request, parseGoalInput);
    if (!body.ok) return body.response;
    return json({ goal: await repo.createGoal(auth.userId, body.value) }, 201);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceGoalRequest = async (
  method: "PATCH" | "DELETE",
  request: Request,
  goalId: string,
  services: WorkspaceServices,
): Promise<Response> => {
  const invalidId = requireWorkspaceId(goalId);
  if (invalidId) return invalidId;
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repo = createWorkspaceRepository(services.DB);
    if (method === "DELETE") {
      return await repo.deleteGoal(auth.userId, goalId) ? noContent() : error("workspace-not-found", 404);
    }
    const body = await parsedBody(request, parseGoalPatch);
    if (!body.ok) return body.response;
    const goal = await repo.updateGoal(auth.userId, goalId, body.value);
    return goal ? json({ goal }) : error("workspace-not-found", 404);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceProjectsRequest = async (
  method: "GET" | "POST",
  request: Request,
  services: WorkspaceServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repo = createWorkspaceRepository(services.DB);
    if (method === "GET") return json({ projects: await repo.listWorkspaceProjects(auth.userId) });
    const body = await parsedBody(request, parseProjectInput);
    if (!body.ok) return body.response;
    return json({ project: await repo.createProject(auth.userId, body.value) }, 201);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceProjectRequest = async (
  method: "GET" | "PATCH" | "DELETE",
  request: Request,
  projectId: string,
  services: WorkspaceServices,
): Promise<Response> => {
  const invalidId = requireWorkspaceId(projectId);
  if (invalidId) return invalidId;
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repo = createWorkspaceRepository(services.DB);
    const project = await repo.getProject(projectId, auth.userId);
    if (!project) return error("workspace-not-found", 404);

    if (method === "GET") {
      const [participants, calculations] = await Promise.all([
        repo.listProjectParticipants(projectId, auth.userId),
        repo.listProjectCalculations(projectId, auth.userId),
      ]);
      return json({
        project,
        participants: participants.map((participant) => participantResponse(participant, project.access === "owner")),
        calculations: calculations.map((calculation) => calculationResponse(
          calculation,
          project.access === "owner" || (project.access === "editor" && calculation.createdByUserId === auth.userId),
        )),
      });
    }

    if (project.access !== "owner") return error("workspace-forbidden", 403);
    if (method === "DELETE") {
      return await repo.deleteProject(auth.userId, projectId) ? noContent() : error("workspace-not-found", 404);
    }
    const body = await parsedBody(request, parseProjectPatch);
    if (!body.ok) return body.response;
    const updated = await repo.updateProject(auth.userId, projectId, body.value);
    return updated ? json({ project: updated }) : error("workspace-not-found", 404);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceProjectInviteRequest = async (
  request: Request,
  projectId: string,
  services: WorkspaceServices,
): Promise<Response> => {
  const invalidId = requireWorkspaceId(projectId);
  if (invalidId) return invalidId;
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repo = createWorkspaceRepository(services.DB);
    const access = await repo.getProjectAccess(projectId, auth.userId);
    if (access === null) return error("workspace-not-found", 404);
    if (access !== "owner") return error("workspace-forbidden", 403);
    const body = await parsedBody(request, parseInviteInput);
    if (!body.ok) return body.response;
    const invite = await repo.createInvite(projectId, auth.userId, body.value.role);
    return json({ invite: { code: invite.code, role: invite.role, expiresAt: invite.expiresAt } }, 201);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceProjectMemberRequest = async (
  request: Request,
  projectId: string,
  memberUserId: string,
  services: WorkspaceServices,
): Promise<Response> => {
  const invalidId = requireWorkspaceId(projectId);
  if (invalidId) return invalidId;
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repo = createWorkspaceRepository(services.DB);
    const access = await repo.getProjectAccess(projectId, auth.userId);
    if (access === null) return error("workspace-not-found", 404);
    if (access !== "owner") return error("workspace-forbidden", 403);
    return await repo.removeProjectMember(projectId, auth.userId, memberUserId)
      ? noContent()
      : error("workspace-not-found", 404);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceInviteRedeemRequest = async (
  request: Request,
  services: WorkspaceServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const body = await readRedeemCode(request);
    if (!body.ok) return body.response;
    const claimed = await createWorkspaceRepository(services.DB).redeemInvite(body.value, auth.userId);
    return json(claimed);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceCalculationsRequest = async (
  request: Request,
  services: WorkspaceServices,
): Promise<Response> => {
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const body = await parsedBody(request, parseNamedCalculationInput);
    if (!body.ok) return body.response;
    const calculation = await createWorkspaceRepository(services.DB).createCalculation(auth.userId, body.value);
    return json({ calculation: calculationResponse(calculation, true) }, 201);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceCalculationRequest = async (
  method: "GET" | "DELETE",
  request: Request,
  calculationId: string,
  services: WorkspaceServices,
): Promise<Response> => {
  const invalidId = requireWorkspaceId(calculationId);
  if (invalidId) return invalidId;
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repo = createWorkspaceRepository(services.DB);
    const calculation = await repo.getCalculation(calculationId, auth.userId);
    if (!calculation) return error("workspace-not-found", 404);
    if (method === "GET") return json({ calculation: calculationResponse(calculation) });
    return await repo.deleteCalculation(auth.userId, calculationId)
      ? noContent()
      : error("workspace-not-found", 404);
  } catch (caught) {
    return repositoryError(caught);
  }
};

export const handleWorkspaceProjectExportRequest = async (
  request: Request,
  projectId: string,
  services: WorkspaceServices,
): Promise<Response> => {
  const invalidId = requireWorkspaceId(projectId);
  if (invalidId) return invalidId;
  try {
    const auth = await authenticate(request, services);
    if (!auth.ok) return auth.response;
    const repo = createWorkspaceRepository(services.DB);
    if (!await repo.getProject(projectId, auth.userId)) return error("workspace-not-found", 404);
    const payload = await repo.buildProjectExport(projectId, auth.userId);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...noStoreHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="found-calc-project.json"',
      },
    });
  } catch (caught) {
    return repositoryError(caught);
  }
};
