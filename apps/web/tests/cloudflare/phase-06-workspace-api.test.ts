import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createFoundCalcAuth } from "../../src/lib/auth/server";
import {
  handleWorkspaceCalculationRequest,
  handleWorkspaceCalculationsRequest,
  handleWorkspaceGoalRequest,
  handleWorkspaceGoalsRequest,
  handleWorkspaceInviteRedeemRequest,
  handleWorkspaceProfileRequest,
  handleWorkspaceProjectExportRequest,
  handleWorkspaceProjectInviteRequest,
  handleWorkspaceProjectMemberRequest,
  handleWorkspaceProjectRequest,
  handleWorkspaceProjectsRequest,
} from "../../src/lib/workspace/http";
import { resetCurrentDatabase } from "./test-database";

declare module "cloudflare:workers" { interface ProvidedEnv { DB: D1Database; } }

const secret = "phase-06-workspace-api-test-secret-that-is-long-enough";
const baseURL = "http://localhost:3000";
const calculatorState = {
  calculatorId: "reference.discount",
  calculatorVersion: "1.0.0",
  input: { baseAmount: "100.00", discountPercentages: ["10"] },
} as const;

const signUp = async (auth: ReturnType<typeof createFoundCalcAuth>, email: string, name = "Workspace User") => {
  const response = await auth.handler(new Request(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, email, password: "phase-six-password-123" }),
  }));
  expect(response.status).toBe(200);
  const payload = await response.clone().json() as { user: { id: string } };
  return { id: payload.user.id, cookie: (response.headers.get("set-cookie") ?? "").split(";")[0]! };
};

const request = (path: string, method: string, cookie?: string, body?: unknown, headers?: HeadersInit) =>
  new Request(`${baseURL}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...Object.fromEntries(new Headers(headers).entries()),
    },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });

beforeEach(async () => {
  await resetCurrentDatabase();
});

describe("workspace HTTP boundary", () => {
  it("requires authentication and rejects malformed or oversized mutations", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const services = { DB: env.DB, auth };

    const signedOut = await handleWorkspaceProfileRequest("GET", request("/api/workspace/profile", "GET"), services);
    expect(signedOut.status).toBe(401);
    expect(await signedOut.json()).toEqual({ error: { code: "authentication-required" } });

    const user = await signUp(auth, "boundary@example.com");
    const malformed = await handleWorkspaceProfileRequest("PUT", request("/api/workspace/profile", "PUT", user.cookie, "{not-json"), services);
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: { code: "invalid-json" } });

    const oversized = await handleWorkspaceProfileRequest("PUT", request("/api/workspace/profile", "PUT", user.cookie, {
      displayName: "x".repeat(17_000), preferredLocale: "id",
    }), services);
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({ error: { code: "payload-too-large" } });
  });

  it("supports scoped profile, goal, and project CRUD without exposing private goal metadata to collaborators", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const services = { DB: env.DB, auth };
    const owner = await signUp(auth, "owner@example.com", "Owner Auth Name");
    const editor = await signUp(auth, "editor@example.com", "Editor Auth Name");

    const profile = await handleWorkspaceProfileRequest("PUT", request("/api/workspace/profile", "PUT", owner.cookie, {
      displayName: "Owner Display", preferredLocale: "id",
    }), services);
    expect(profile.status).toBe(200);

    const goalResponse = await handleWorkspaceGoalsRequest("POST", request("/api/workspace/goals", "POST", owner.cookie, {
      title: "Private launch target", note: "Owner only", status: "active",
    }), services);
    expect(goalResponse.status).toBe(201);
    const goal = (await goalResponse.json() as { goal: { id: string } }).goal;

    const projectResponse = await handleWorkspaceProjectsRequest("POST", request("/api/workspace/projects", "POST", owner.cookie, {
      name: "Pricing launch", goalId: goal.id, status: "active",
    }), services);
    expect(projectResponse.status).toBe(201);
    const project = (await projectResponse.json() as { project: { id: string } }).project;

    const inviteResponse = await handleWorkspaceProjectInviteRequest(request(`/api/workspace/projects/${project.id}/invites`, "POST", owner.cookie, { role: "editor" }), project.id, services);
    const invite = (await inviteResponse.json() as { invite: { code: string } }).invite;
    const redeem = await handleWorkspaceInviteRedeemRequest(request("/api/workspace/invites/redeem", "POST", editor.cookie, { code: invite.code }), services);
    expect(redeem.status).toBe(200);

    const ownerDetail = await handleWorkspaceProjectRequest("GET", request(`/api/workspace/projects/${project.id}`, "GET", owner.cookie), project.id, services);
    const ownerBody = await ownerDetail.json() as { project: { goalId?: string }; participants: Array<{ userId?: string }> };
    expect(ownerBody.project.goalId).toBe(goal.id);
    expect(ownerBody.participants.some((participant) => participant.userId === editor.id)).toBe(true);

    const editorDetail = await handleWorkspaceProjectRequest("GET", request(`/api/workspace/projects/${project.id}`, "GET", editor.cookie), project.id, services);
    const editorText = JSON.stringify(await editorDetail.json());
    expect(editorDetail.status).toBe(200);
    expect(editorText).not.toContain(goal.id);
    expect(editorText).not.toContain("Private launch target");
    expect(editorText).not.toContain("Owner only");
    expect(editorText).not.toContain(owner.id);
    expect(editorText).not.toContain(editor.id);
    expect(editorText).not.toContain("@example.com");
  });

  it("enforces owner/editor/viewer permissions from D1 instead of browser-provided roles", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const services = { DB: env.DB, auth };
    const owner = await signUp(auth, "role-owner@example.com", "Owner");
    const editor = await signUp(auth, "role-editor@example.com", "Editor");
    const viewer = await signUp(auth, "role-viewer@example.com", "Viewer");
    const outsider = await signUp(auth, "role-outsider@example.com", "Outsider");

    const projectResponse = await handleWorkspaceProjectsRequest("POST", request("/api/workspace/projects", "POST", owner.cookie, {
      name: "Permission matrix", status: "active",
    }), services);
    const project = (await projectResponse.json() as { project: { id: string } }).project;

    for (const [member, role] of [[editor, "editor"], [viewer, "viewer"]] as const) {
      const inviteResponse = await handleWorkspaceProjectInviteRequest(request(`/api/workspace/projects/${project.id}/invites`, "POST", owner.cookie, { role }), project.id, services);
      const code = (await inviteResponse.json() as { invite: { code: string } }).invite.code;
      expect((await handleWorkspaceInviteRedeemRequest(request("/api/workspace/invites/redeem", "POST", member.cookie, { code }), services)).status).toBe(200);
    }

    const editorSave = await handleWorkspaceCalculationsRequest(request("/api/workspace/calculations", "POST", editor.cookie, {
      projectId: project.id, title: "Editor snapshot", state: calculatorState, role: "owner",
    }), services);
    expect(editorSave.status).toBe(400); // strict parser rejects forged authorization fields

    const validEditorSave = await handleWorkspaceCalculationsRequest(request("/api/workspace/calculations", "POST", editor.cookie, {
      projectId: project.id, title: "Editor snapshot", state: calculatorState,
    }), services);
    expect(validEditorSave.status).toBe(201);
    const calculation = (await validEditorSave.json() as { calculation: { id: string } }).calculation;

    expect((await handleWorkspaceCalculationsRequest(request("/api/workspace/calculations", "POST", viewer.cookie, {
      projectId: project.id, title: "Viewer cannot save", state: calculatorState,
    }), services)).status).toBe(403);
    expect((await handleWorkspaceProjectRequest("PATCH", request(`/api/workspace/projects/${project.id}`, "PATCH", editor.cookie, { name: "Hijack" }), project.id, services)).status).toBe(403);
    expect((await handleWorkspaceProjectRequest("GET", request(`/api/workspace/projects/${project.id}`, "GET", outsider.cookie), project.id, services)).status).toBe(404);
    expect((await handleWorkspaceCalculationRequest("DELETE", request(`/api/workspace/calculations/${calculation.id}`, "DELETE", viewer.cookie), calculation.id, services)).status).toBe(403);
    expect((await handleWorkspaceCalculationRequest("DELETE", request(`/api/workspace/calculations/${calculation.id}`, "DELETE", editor.cookie), calculation.id, services)).status).toBe(204);
  });

  it("maps invalid, expired, and reused invitations without leaking raw hashes", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const services = { DB: env.DB, auth };
    const owner = await signUp(auth, "invite-owner@example.com");
    const first = await signUp(auth, "invite-first@example.com");
    const second = await signUp(auth, "invite-second@example.com");

    const projectResponse = await handleWorkspaceProjectsRequest("POST", request("/api/workspace/projects", "POST", owner.cookie, { name: "Invites", status: "active" }), services);
    const project = (await projectResponse.json() as { project: { id: string } }).project;

    const invalid = await handleWorkspaceInviteRedeemRequest(request("/api/workspace/invites/redeem", "POST", first.cookie, { code: "nope" }), services);
    expect(invalid.status).toBe(400);

    const expiredResponse = await handleWorkspaceProjectInviteRequest(request(`/api/workspace/projects/${project.id}/invites`, "POST", owner.cookie, { role: "viewer" }), project.id, services);
    const expired = (await expiredResponse.json() as { invite: { code: string } }).invite;
    await env.DB.prepare("UPDATE workspace_project_invite SET expires_at = 0 WHERE project_id = ?").bind(project.id).run();
    expect((await handleWorkspaceInviteRedeemRequest(request("/api/workspace/invites/redeem", "POST", first.cookie, { code: expired.code }), services)).status).toBe(410);

    const freshResponse = await handleWorkspaceProjectInviteRequest(request(`/api/workspace/projects/${project.id}/invites`, "POST", owner.cookie, { role: "editor" }), project.id, services);
    const fresh = (await freshResponse.json() as { invite: { code: string } }).invite;
    expect((await handleWorkspaceInviteRedeemRequest(request("/api/workspace/invites/redeem", "POST", first.cookie, { code: fresh.code }), services)).status).toBe(200);
    expect((await handleWorkspaceInviteRedeemRequest(request("/api/workspace/invites/redeem", "POST", second.cookie, { code: fresh.code }), services)).status).toBe(410);

    const stored = await env.DB.prepare("SELECT token_hash AS tokenHash FROM workspace_project_invite WHERE project_id = ? ORDER BY created_at DESC LIMIT 1").bind(project.id).first<{ tokenHash: string }>();
    expect(stored?.tokenHash).not.toBe(fresh.code);
  });

  it("exports portable project JSON while omitting goals, emails, auth ids, and invite data", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const services = { DB: env.DB, auth };
    const owner = await signUp(auth, "export-owner@example.com", "Export Owner");
    const viewer = await signUp(auth, "export-viewer@example.com", "Export Viewer");

    await handleWorkspaceProfileRequest("PUT", request("/api/workspace/profile", "PUT", owner.cookie, { displayName: "Owner Display", preferredLocale: "en" }), services);
    const goalResponse = await handleWorkspaceGoalsRequest("POST", request("/api/workspace/goals", "POST", owner.cookie, { title: "Private target", note: "Never export", status: "active" }), services);
    const goal = (await goalResponse.json() as { goal: { id: string } }).goal;
    const projectResponse = await handleWorkspaceProjectsRequest("POST", request("/api/workspace/projects", "POST", owner.cookie, { name: "Portable", goalId: goal.id, status: "active" }), services);
    const project = (await projectResponse.json() as { project: { id: string } }).project;
    const inviteResponse = await handleWorkspaceProjectInviteRequest(request(`/api/workspace/projects/${project.id}/invites`, "POST", owner.cookie, { role: "viewer" }), project.id, services);
    const code = (await inviteResponse.json() as { invite: { code: string } }).invite.code;
    await handleWorkspaceInviteRedeemRequest(request("/api/workspace/invites/redeem", "POST", viewer.cookie, { code }), services);

    const exported = await handleWorkspaceProjectExportRequest(request(`/api/workspace/projects/${project.id}/export`, "GET", viewer.cookie), project.id, services);
    expect(exported.status).toBe(200);
    expect(exported.headers.get("cache-control")).toBe("no-store");
    expect(exported.headers.get("content-disposition")).toBe('attachment; filename="found-calc-project.json"');
    const text = await exported.text();
    expect(text).toContain("found-calc.project-export.v1");
    expect(text).toContain("Owner Display");
    for (const forbidden of ["Private target", "Never export", "@example.com", owner.id, viewer.id, code, "token_hash", "goalId"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("lets owners remove members and keeps goal updates owner-scoped", async () => {
    const auth = createFoundCalcAuth(env.DB, { secret, baseURL });
    const services = { DB: env.DB, auth };
    const owner = await signUp(auth, "remove-owner@example.com");
    const member = await signUp(auth, "remove-member@example.com");
    const goalResponse = await handleWorkspaceGoalsRequest("POST", request("/api/workspace/goals", "POST", owner.cookie, { title: "Goal", status: "active" }), services);
    const goal = (await goalResponse.json() as { goal: { id: string } }).goal;
    expect((await handleWorkspaceGoalRequest("PATCH", request(`/api/workspace/goals/${goal.id}`, "PATCH", member.cookie, { status: "completed" }), goal.id, services)).status).toBe(404);

    const projectResponse = await handleWorkspaceProjectsRequest("POST", request("/api/workspace/projects", "POST", owner.cookie, { name: "Member removal", status: "active" }), services);
    const project = (await projectResponse.json() as { project: { id: string } }).project;
    const inviteResponse = await handleWorkspaceProjectInviteRequest(request(`/api/workspace/projects/${project.id}/invites`, "POST", owner.cookie, { role: "viewer" }), project.id, services);
    const code = (await inviteResponse.json() as { invite: { code: string } }).invite.code;
    await handleWorkspaceInviteRedeemRequest(request("/api/workspace/invites/redeem", "POST", member.cookie, { code }), services);

    expect((await handleWorkspaceProjectMemberRequest(request(`/api/workspace/projects/${project.id}/members/${member.id}`, "DELETE", member.cookie), project.id, member.id, services)).status).toBe(403);
    expect((await handleWorkspaceProjectMemberRequest(request(`/api/workspace/projects/${project.id}/members/${member.id}`, "DELETE", owner.cookie), project.id, member.id, services)).status).toBe(204);
    expect((await handleWorkspaceProjectRequest("GET", request(`/api/workspace/projects/${project.id}`, "GET", member.cookie), project.id, services)).status).toBe(404);
  });
});
