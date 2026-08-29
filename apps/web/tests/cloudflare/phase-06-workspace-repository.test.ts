import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createWorkspaceRepository } from "../../src/lib/workspace/repository";
import { resetCurrentDatabase } from "./test-database";

declare module "cloudflare:workers" {
  interface ProvidedEnv { DB: D1Database; }
}

const ownerId = "phase06-owner";
const editorId = "phase06-editor";
const viewerId = "phase06-viewer";
const outsiderId = "phase06-outsider";

const insertUser = async (id: string, name: string) => {
  await env.DB.prepare(
    "INSERT INTO user (id, name, email, email_verified, created_at, updated_at, role, banned) VALUES (?, ?, ?, 1, 0, 0, 'user', 0)",
  ).bind(id, name, `${id}@example.test`).run();
};

beforeEach(async () => {
  await resetCurrentDatabase();
  await insertUser(ownerId, "Owner");
  await insertUser(editorId, "Editor");
  await insertUser(viewerId, "Viewer");
  await insertUser(outsiderId, "Outsider");
});

describe("workspace repository", () => {
  it("keeps profiles and goals scoped to their user", async () => {
    const repo = createWorkspaceRepository(env.DB);
    await repo.upsertProfile(ownerId, { displayName: "Disa", preferredLocale: "id" });
    const goal = await repo.createGoal(ownerId, { title: "Launch", status: "active" });

    expect(await repo.getProfile(ownerId)).toMatchObject({ displayName: "Disa", preferredLocale: "id" });
    expect((await repo.listGoals(ownerId)).map((item) => item.id)).toContain(goal.id);
    expect(await repo.updateGoal(outsiderId, goal.id, { status: "completed" })).toBeNull();
  });

  it("separates owned and shared project access", async () => {
    const repo = createWorkspaceRepository(env.DB);
    const project = await repo.createProject(ownerId, { name: "Pricing", status: "active" });
    const editorInvite = await repo.createInvite(project.id, ownerId, "editor");
    const viewerInvite = await repo.createInvite(project.id, ownerId, "viewer");
    await repo.redeemInvite(editorInvite.code, editorId);
    await repo.redeemInvite(viewerInvite.code, viewerId);

    expect(await repo.getProjectAccess(project.id, ownerId)).toBe("owner");
    expect(await repo.getProjectAccess(project.id, editorId)).toBe("editor");
    expect(await repo.getProjectAccess(project.id, viewerId)).toBe("viewer");
    expect(await repo.getProjectAccess(project.id, outsiderId)).toBeNull();
    expect((await repo.listWorkspaceProjects(editorId)).shared[0]).toMatchObject({ id: project.id, access: "editor" });
  });

  it("stores only invite hashes and redeems an invite once", async () => {
    const repo = createWorkspaceRepository(env.DB);
    const project = await repo.createProject(ownerId, { name: "Shared", status: "active" });
    const invite = await repo.createInvite(project.id, ownerId, "editor", 1_800_000_000_000);

    const stored = await env.DB.prepare("SELECT token_hash FROM workspace_project_invite WHERE id = ?").bind(invite.id).first<{ token_hash: string }>();
    expect(stored?.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.token_hash).not.toBe(invite.code);

    expect(await repo.redeemInvite(invite.code, editorId, 1_799_999_000_000)).toMatchObject({ projectId: project.id, access: "editor" });
    await expect(repo.redeemInvite(invite.code, viewerId, 1_799_999_000_001)).rejects.toMatchObject({ code: "invite-used" });
    expect(await repo.getProjectAccess(project.id, editorId)).toBe("editor");
    expect(await repo.getProjectAccess(project.id, viewerId)).toBeNull();
  });

  it("enforces named calculation permissions and keeps snapshots immutable", async () => {
    const repo = createWorkspaceRepository(env.DB);
    const project = await repo.createProject(ownerId, { name: "History", status: "active" });
    const editorInvite = await repo.createInvite(project.id, ownerId, "editor");
    const viewerInvite = await repo.createInvite(project.id, ownerId, "viewer");
    await repo.redeemInvite(editorInvite.code, editorId);
    await repo.redeemInvite(viewerInvite.code, viewerId);

    const state = {
      calculatorId: "reference.discount",
      calculatorVersion: "1.0.0",
      input: { baseAmount: "100.00", discountPercentages: ["10"] },
    } as const;
    const calculation = await repo.createCalculation(editorId, { projectId: project.id, title: "Offer A", state });
    expect((await repo.getCalculation(calculation.id, viewerId))?.state).toEqual(state);
    await expect(repo.createCalculation(viewerId, { projectId: project.id, title: "No", state })).rejects.toMatchObject({ code: "project-read-only" });
    await expect(repo.deleteCalculation(viewerId, calculation.id)).rejects.toMatchObject({ code: "workspace-forbidden" });
    await repo.deleteCalculation(editorId, calculation.id);
    expect(await repo.getCalculation(calculation.id, ownerId)).toBeNull();
  });

  it("builds privacy-safe project exports", async () => {
    const repo = createWorkspaceRepository(env.DB);
    await repo.upsertProfile(ownerId, { displayName: "Owner Display", preferredLocale: "en" });
    await repo.upsertProfile(viewerId, { displayName: "Viewer Display", preferredLocale: "id" });
    const goal = await repo.createGoal(ownerId, { title: "Private target", note: "Do not export", status: "active" });
    const project = await repo.createProject(ownerId, { name: "Exportable", goalId: goal.id, status: "active" });
    const viewerInvite = await repo.createInvite(project.id, ownerId, "viewer");
    await repo.redeemInvite(viewerInvite.code, viewerId);

    const exported = await repo.buildProjectExport(project.id, viewerId, 1_800_000_000_000);
    expect(JSON.stringify(exported)).toContain("Viewer Display");
    expect(JSON.stringify(exported)).not.toContain("Private target");
    expect(JSON.stringify(exported)).not.toContain("Do not export");
    expect(JSON.stringify(exported)).not.toContain("@example.test");
    expect(JSON.stringify(exported)).not.toContain(ownerId);
  });
});
