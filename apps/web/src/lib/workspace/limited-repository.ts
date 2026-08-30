import type { D1Database } from "@cloudflare/workers-types";

import type { GoalInput, GoalPatch, ProjectInput, ProjectPatch } from "./contracts";
import {
  createWorkspaceRepository,
  WorkspaceRepositoryError,
  type WorkspaceGoal,
  type WorkspaceProjectSummary,
} from "./repository";

export class WorkspaceCommercialLimitError extends Error {
  constructor() {
    super("Commercial workspace limit reached");
    this.name = "WorkspaceCommercialLimitError";
  }
}

const assertLimit = (limit: number | null) => {
  if (limit !== null && (!Number.isSafeInteger(limit) || limit < 0)) {
    throw new RangeError("Workspace limit must be a non-negative integer or null");
  }
};

const requireOwnedGoal = async (binding: D1Database, userId: string, goalId: string) => {
  const row = await binding.prepare(`
    SELECT id FROM workspace_goal WHERE id = ? AND owner_user_id = ? LIMIT 1
  `).bind(goalId, userId).first<{ id: string }>();
  if (!row) throw new WorkspaceRepositoryError("workspace-not-found");
};

export const createGoalWithinLimit = async (
  binding: D1Database,
  userId: string,
  input: GoalInput,
  limit: number | null,
): Promise<WorkspaceGoal> => {
  const repository = createWorkspaceRepository(binding);
  assertLimit(limit);
  if (input.status !== "active" || limit === null) return repository.createGoal(userId, input);

  const id = crypto.randomUUID();
  const now = Date.now();
  const result = await binding.prepare(`
    INSERT INTO workspace_goal (
      id, owner_user_id, title, note, target_date, status, created_at, updated_at
    )
    SELECT ?, ?, ?, ?, ?, 'active', ?, ?
    WHERE (
      SELECT COUNT(*) FROM workspace_goal
      WHERE owner_user_id = ? AND status = 'active'
    ) < ?
  `).bind(
    id,
    userId,
    input.title,
    input.note ?? null,
    input.targetDate ?? null,
    now,
    now,
    userId,
    limit,
  ).run();
  if (!result.meta.changes) throw new WorkspaceCommercialLimitError();
  const stored = (await repository.listGoals(userId)).find((goal) => goal.id === id);
  if (!stored) throw new WorkspaceRepositoryError("stored-workspace-invalid");
  return stored;
};

export const updateGoalWithinLimit = async (
  binding: D1Database,
  userId: string,
  goalId: string,
  patch: GoalPatch,
  limit: number | null,
): Promise<WorkspaceGoal | null> => {
  const repository = createWorkspaceRepository(binding);
  assertLimit(limit);
  if (patch.status !== "active" || limit === null) return repository.updateGoal(userId, goalId, patch);

  const current = await binding.prepare(`
    SELECT status FROM workspace_goal WHERE id = ? AND owner_user_id = ? LIMIT 1
  `).bind(goalId, userId).first<{ status: WorkspaceGoal["status"] }>();
  if (!current) return null;
  if (current.status === "active") return repository.updateGoal(userId, goalId, patch);

  const now = Date.now();
  const result = await binding.prepare(`
    UPDATE workspace_goal
    SET title = CASE WHEN ? = 1 THEN ? ELSE title END,
        note = CASE WHEN ? = 1 THEN ? ELSE note END,
        target_date = CASE WHEN ? = 1 THEN ? ELSE target_date END,
        status = 'active',
        updated_at = ?
    WHERE id = ? AND owner_user_id = ?
      AND (
        SELECT COUNT(*) FROM workspace_goal AS active_goal
        WHERE active_goal.owner_user_id = ? AND active_goal.status = 'active'
      ) < ?
  `).bind(
    patch.title === undefined ? 0 : 1,
    patch.title ?? null,
    patch.note === undefined ? 0 : 1,
    patch.note ?? null,
    patch.targetDate === undefined ? 0 : 1,
    patch.targetDate ?? null,
    now,
    goalId,
    userId,
    userId,
    limit,
  ).run();
  if (!result.meta.changes) throw new WorkspaceCommercialLimitError();
  const stored = (await repository.listGoals(userId)).find((goal) => goal.id === goalId);
  if (!stored) throw new WorkspaceRepositoryError("stored-workspace-invalid");
  return stored;
};

export const createProjectWithinLimit = async (
  binding: D1Database,
  userId: string,
  input: ProjectInput,
  limit: number | null,
): Promise<WorkspaceProjectSummary> => {
  const repository = createWorkspaceRepository(binding);
  assertLimit(limit);
  if (input.goalId !== undefined) await requireOwnedGoal(binding, userId, input.goalId);
  if (input.status !== "active" || limit === null) return repository.createProject(userId, input);

  const id = crypto.randomUUID();
  const now = Date.now();
  const result = await binding.prepare(`
    INSERT INTO workspace_project (
      id, owner_user_id, goal_id, name, description, status, created_at, updated_at
    )
    SELECT ?, ?, ?, ?, ?, 'active', ?, ?
    WHERE (
      SELECT COUNT(*) FROM workspace_project
      WHERE owner_user_id = ? AND status = 'active'
    ) < ?
  `).bind(
    id,
    userId,
    input.goalId ?? null,
    input.name,
    input.description ?? null,
    now,
    now,
    userId,
    limit,
  ).run();
  if (!result.meta.changes) throw new WorkspaceCommercialLimitError();
  const stored = await repository.getProject(id, userId);
  if (!stored) throw new WorkspaceRepositoryError("stored-workspace-invalid");
  return stored;
};

export const updateProjectWithinLimit = async (
  binding: D1Database,
  userId: string,
  projectId: string,
  patch: ProjectPatch,
  limit: number | null,
): Promise<WorkspaceProjectSummary | null> => {
  const repository = createWorkspaceRepository(binding);
  assertLimit(limit);
  if (patch.goalId !== undefined && patch.goalId !== null) await requireOwnedGoal(binding, userId, patch.goalId);
  if (patch.status !== "active" || limit === null) return repository.updateProject(userId, projectId, patch);

  const current = await binding.prepare(`
    SELECT status FROM workspace_project WHERE id = ? AND owner_user_id = ? LIMIT 1
  `).bind(projectId, userId).first<{ status: WorkspaceProjectSummary["status"] }>();
  if (!current) return null;
  if (current.status === "active") return repository.updateProject(userId, projectId, patch);

  const now = Date.now();
  const result = await binding.prepare(`
    UPDATE workspace_project
    SET name = CASE WHEN ? = 1 THEN ? ELSE name END,
        description = CASE WHEN ? = 1 THEN ? ELSE description END,
        goal_id = CASE WHEN ? = 1 THEN ? ELSE goal_id END,
        status = 'active',
        updated_at = ?
    WHERE id = ? AND owner_user_id = ?
      AND (
        SELECT COUNT(*) FROM workspace_project AS active_project
        WHERE active_project.owner_user_id = ? AND active_project.status = 'active'
      ) < ?
  `).bind(
    patch.name === undefined ? 0 : 1,
    patch.name ?? null,
    patch.description === undefined ? 0 : 1,
    patch.description ?? null,
    patch.goalId === undefined ? 0 : 1,
    patch.goalId ?? null,
    now,
    projectId,
    userId,
    userId,
    limit,
  ).run();
  if (!result.meta.changes) throw new WorkspaceCommercialLimitError();
  const stored = await repository.getProject(projectId, userId);
  if (!stored) throw new WorkspaceRepositoryError("stored-workspace-invalid");
  return stored;
};