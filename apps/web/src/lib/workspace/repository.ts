import type { D1Database } from "@cloudflare/workers-types";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import {
  userProfiles,
  workspaceCalculations,
  workspaceGoals,
  workspaceProjectInvites,
  workspaceProjectMembers,
  workspaceProjects,
} from "@/lib/persistence/schema";
import { parsePersistedCalculatorState, type PersistedCalculatorState } from "@/lib/persistence/state";
import {
  WORKSPACE_INVITE_TTL_MS,
  parseNamedCalculationInput,
  type GoalInput,
  type GoalPatch,
  type NamedCalculationInput,
  type ProfileInput,
  type ProjectInput,
  type ProjectMemberRole,
  type ProjectPatch,
  type SyntheticRuleContext,
  type WorkspaceAccess,
} from "./contracts";

export type WorkspaceRepositoryErrorCode =
  | "invalid-workspace-input"
  | "workspace-not-found"
  | "workspace-forbidden"
  | "workspace-conflict"
  | "invite-invalid"
  | "invite-expired"
  | "invite-used"
  | "project-read-only"
  | "stored-workspace-invalid";

export class WorkspaceRepositoryError extends Error {
  readonly code: WorkspaceRepositoryErrorCode;
  constructor(code: WorkspaceRepositoryErrorCode) {
    super(code);
    this.name = "WorkspaceRepositoryError";
    this.code = code;
  }
}

export interface WorkspaceProfile {
  readonly userId: string;
  readonly displayName: string;
  readonly preferredLocale: "id" | "en";
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface WorkspaceGoal {
  readonly id: string;
  readonly title: string;
  readonly note?: string;
  readonly targetDate?: string;
  readonly status: "active" | "completed" | "archived";
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface WorkspaceProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly status: "active" | "archived";
  readonly access: WorkspaceAccess;
  readonly goalId?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface WorkspaceProjectList {
  readonly owned: readonly WorkspaceProjectSummary[];
  readonly shared: readonly WorkspaceProjectSummary[];
}

export interface WorkspaceParticipant {
  readonly userId: string;
  readonly displayName: string;
  readonly role: "owner" | ProjectMemberRole;
}

export interface StoredWorkspaceCalculation {
  readonly id: string;
  readonly projectId: string;
  readonly createdByUserId: string;
  readonly creatorDisplayName: string;
  readonly title: string;
  readonly calculatorId: PersistedCalculatorState["calculatorId"];
  readonly calculatorVersion: string;
  readonly state: PersistedCalculatorState;
  readonly ruleContext?: SyntheticRuleContext;
  readonly createdAt: number;
}

export interface ProjectExport {
  readonly schema: "found-calc.project-export.v1";
  readonly exportedAt: string;
  readonly project: {
    readonly name: string;
    readonly description?: string;
    readonly status: "active" | "archived";
  };
  readonly participants: readonly {
    readonly displayName: string;
    readonly role: "owner" | ProjectMemberRole;
  }[];
  readonly calculations: readonly {
    readonly title: string;
    readonly calculatorId: PersistedCalculatorState["calculatorId"];
    readonly calculatorVersion: string;
    readonly state: PersistedCalculatorState;
    readonly creatorDisplayName: string;
    readonly ruleContext?: SyntheticRuleContext;
    readonly createdAt: string;
  }[];
}

const profileFromRow = (row: typeof userProfiles.$inferSelect): WorkspaceProfile => ({
  userId: row.userId,
  displayName: row.displayName,
  preferredLocale: row.preferredLocale,
  createdAt: row.createdAt.getTime(),
  updatedAt: row.updatedAt.getTime(),
});

const goalFromRow = (row: typeof workspaceGoals.$inferSelect): WorkspaceGoal => ({
  id: row.id,
  title: row.title,
  ...(row.note === null ? {} : { note: row.note }),
  ...(row.targetDate === null ? {} : { targetDate: row.targetDate }),
  status: row.status,
  createdAt: row.createdAt.getTime(),
  updatedAt: row.updatedAt.getTime(),
});

const projectFromRow = (
  row: typeof workspaceProjects.$inferSelect,
  access: WorkspaceAccess,
): WorkspaceProjectSummary => ({
  id: row.id,
  name: row.name,
  ...(row.description === null ? {} : { description: row.description }),
  status: row.status,
  access,
  ...(access === "owner" && row.goalId !== null ? { goalId: row.goalId } : {}),
  createdAt: row.createdAt.getTime(),
  updatedAt: row.updatedAt.getTime(),
});

const decodeRuleContext = (json: string | null, calculatorId: string): SyntheticRuleContext | undefined => {
  if (json === null) return undefined;
  try {
    const value = JSON.parse(json) as unknown;
    if (
      calculatorId === "reference.synthetic-rule" &&
      typeof value === "object" && value !== null && !Array.isArray(value) &&
      (value as Record<string, unknown>).ruleId === "reference.synthetic-rate" &&
      typeof (value as Record<string, unknown>).versionId === "string"
    ) {
      return {
        ruleId: "reference.synthetic-rate",
        versionId: (value as Record<string, unknown>).versionId as string,
      };
    }
  } catch {
    // normalized below
  }
  throw new WorkspaceRepositoryError("stored-workspace-invalid");
};

const decodeCalculationRow = (row: {
  id: string;
  projectId: string;
  createdByUserId: string;
  creatorDisplayName: string;
  title: string;
  calculatorId: string;
  calculatorVersion: string;
  stateJson: string;
  ruleContextJson: string | null;
  createdAt: number;
}): StoredWorkspaceCalculation => {
  let stateUnknown: unknown;
  try {
    stateUnknown = JSON.parse(row.stateJson);
  } catch {
    throw new WorkspaceRepositoryError("stored-workspace-invalid");
  }
  const parsed = parsePersistedCalculatorState(stateUnknown);
  if (!parsed.ok || parsed.value.calculatorId !== row.calculatorId || parsed.value.calculatorVersion !== row.calculatorVersion) {
    throw new WorkspaceRepositoryError("stored-workspace-invalid");
  }
  const ruleContext = decodeRuleContext(row.ruleContextJson, row.calculatorId);
  return {
    id: row.id,
    projectId: row.projectId,
    createdByUserId: row.createdByUserId,
    creatorDisplayName: row.creatorDisplayName,
    title: row.title,
    calculatorId: parsed.value.calculatorId,
    calculatorVersion: row.calculatorVersion,
    state: parsed.value,
    ...(ruleContext === undefined ? {} : { ruleContext }),
    createdAt: row.createdAt,
  };
};

const randomInviteCode = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
};

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const isInviteCode = (value: string): boolean => /^[0-9a-f]{64}$/i.test(value);

export const createWorkspaceRepository = (binding: D1Database) => {
  const db = drizzle(binding);

  const getProfile = async (userId: string): Promise<WorkspaceProfile | null> => {
    const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    return rows[0] ? profileFromRow(rows[0]) : null;
  };

  const upsertProfile = async (userId: string, input: ProfileInput): Promise<WorkspaceProfile> => {
    const now = new Date();
    await db.insert(userProfiles).values({
      userId,
      displayName: input.displayName,
      preferredLocale: input.preferredLocale,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: userProfiles.userId,
      set: { displayName: input.displayName, preferredLocale: input.preferredLocale, updatedAt: now },
    });
    const stored = await getProfile(userId);
    if (!stored) throw new WorkspaceRepositoryError("stored-workspace-invalid");
    return stored;
  };

  const listGoals = async (userId: string): Promise<WorkspaceGoal[]> =>
    (await db.select().from(workspaceGoals).where(eq(workspaceGoals.ownerUserId, userId)).orderBy(desc(workspaceGoals.updatedAt)))
      .map(goalFromRow);

  const createGoal = async (userId: string, input: GoalInput): Promise<WorkspaceGoal> => {
    const id = crypto.randomUUID();
    await db.insert(workspaceGoals).values({
      id,
      ownerUserId: userId,
      title: input.title,
      note: input.note ?? null,
      targetDate: input.targetDate ?? null,
      status: input.status,
    });
    const rows = await db.select().from(workspaceGoals).where(and(eq(workspaceGoals.id, id), eq(workspaceGoals.ownerUserId, userId))).limit(1);
    if (!rows[0]) throw new WorkspaceRepositoryError("stored-workspace-invalid");
    return goalFromRow(rows[0]);
  };

  const updateGoal = async (userId: string, goalId: string, patch: GoalPatch): Promise<WorkspaceGoal | null> => {
    const now = new Date();
    const result = await db.update(workspaceGoals).set({
      ...(patch.title === undefined ? {} : { title: patch.title }),
      ...(patch.note === undefined ? {} : { note: patch.note }),
      ...(patch.targetDate === undefined ? {} : { targetDate: patch.targetDate }),
      ...(patch.status === undefined ? {} : { status: patch.status }),
      updatedAt: now,
    }).where(and(eq(workspaceGoals.id, goalId), eq(workspaceGoals.ownerUserId, userId)));
    if (!result.meta.changes) return null;
    const rows = await db.select().from(workspaceGoals).where(and(eq(workspaceGoals.id, goalId), eq(workspaceGoals.ownerUserId, userId))).limit(1);
    return rows[0] ? goalFromRow(rows[0]) : null;
  };

  const deleteGoal = async (userId: string, goalId: string): Promise<boolean> => {
    const result = await db.delete(workspaceGoals).where(and(eq(workspaceGoals.id, goalId), eq(workspaceGoals.ownerUserId, userId)));
    return Boolean(result.meta.changes);
  };

  const getProjectRow = async (projectId: string) => {
    const rows = await db.select().from(workspaceProjects).where(eq(workspaceProjects.id, projectId)).limit(1);
    return rows[0] ?? null;
  };

  const getProjectAccess = async (projectId: string, userId: string): Promise<WorkspaceAccess | null> => {
    const project = await getProjectRow(projectId);
    if (!project) return null;
    if (project.ownerUserId === userId) return "owner";
    const rows = await db.select({ role: workspaceProjectMembers.role })
      .from(workspaceProjectMembers)
      .where(and(eq(workspaceProjectMembers.projectId, projectId), eq(workspaceProjectMembers.userId, userId)))
      .limit(1);
    return rows[0]?.role ?? null;
  };

  const requireOwnedGoal = async (userId: string, goalId: string): Promise<void> => {
    const rows = await db.select({ id: workspaceGoals.id }).from(workspaceGoals)
      .where(and(eq(workspaceGoals.id, goalId), eq(workspaceGoals.ownerUserId, userId))).limit(1);
    if (!rows[0]) throw new WorkspaceRepositoryError("workspace-not-found");
  };

  const createProject = async (userId: string, input: ProjectInput): Promise<WorkspaceProjectSummary> => {
    if (input.goalId !== undefined) await requireOwnedGoal(userId, input.goalId);
    const id = crypto.randomUUID();
    await db.insert(workspaceProjects).values({
      id,
      ownerUserId: userId,
      goalId: input.goalId ?? null,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
    });
    const row = await getProjectRow(id);
    if (!row) throw new WorkspaceRepositoryError("stored-workspace-invalid");
    return projectFromRow(row, "owner");
  };

  const listWorkspaceProjects = async (userId: string): Promise<WorkspaceProjectList> => {
    const ownedRows = await db.select().from(workspaceProjects)
      .where(eq(workspaceProjects.ownerUserId, userId))
      .orderBy(desc(workspaceProjects.updatedAt));
    const sharedRows = await db.select({ project: workspaceProjects, role: workspaceProjectMembers.role })
      .from(workspaceProjectMembers)
      .innerJoin(workspaceProjects, eq(workspaceProjectMembers.projectId, workspaceProjects.id))
      .where(eq(workspaceProjectMembers.userId, userId))
      .orderBy(desc(workspaceProjects.updatedAt));
    return {
      owned: ownedRows.map((row) => projectFromRow(row, "owner")),
      shared: sharedRows.map(({ project, role }) => projectFromRow(project, role)),
    };
  };

  const updateProject = async (userId: string, projectId: string, patch: ProjectPatch): Promise<WorkspaceProjectSummary | null> => {
    const project = await getProjectRow(projectId);
    if (!project || project.ownerUserId !== userId) return null;
    if (patch.goalId !== undefined && patch.goalId !== null) await requireOwnedGoal(userId, patch.goalId);
    const now = new Date();
    await db.update(workspaceProjects).set({
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(patch.description === undefined ? {} : { description: patch.description }),
      ...(patch.goalId === undefined ? {} : { goalId: patch.goalId }),
      ...(patch.status === undefined ? {} : { status: patch.status }),
      updatedAt: now,
    }).where(and(eq(workspaceProjects.id, projectId), eq(workspaceProjects.ownerUserId, userId)));
    const stored = await getProjectRow(projectId);
    return stored ? projectFromRow(stored, "owner") : null;
  };

  const deleteProject = async (userId: string, projectId: string): Promise<boolean> => {
    const result = await db.delete(workspaceProjects)
      .where(and(eq(workspaceProjects.id, projectId), eq(workspaceProjects.ownerUserId, userId)));
    return Boolean(result.meta.changes);
  };

  const createInvite = async (
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
    now = Date.now(),
  ): Promise<{ readonly id: string; readonly code: string; readonly role: ProjectMemberRole; readonly expiresAt: number }> => {
    if (await getProjectAccess(projectId, userId) !== "owner") throw new WorkspaceRepositoryError("workspace-forbidden");
    const code = randomInviteCode();
    const tokenHash = await sha256Hex(code);
    const id = crypto.randomUUID();
    const expiresAt = now + WORKSPACE_INVITE_TTL_MS;
    await db.insert(workspaceProjectInvites).values({
      id,
      projectId,
      tokenHash,
      role,
      createdByUserId: userId,
      createdAt: new Date(now),
      expiresAt: new Date(expiresAt),
    });
    return { id, code, role, expiresAt };
  };

  const redeemInvite = async (
    code: string,
    userId: string,
    now = Date.now(),
  ): Promise<{ readonly projectId: string; readonly access: ProjectMemberRole }> => {
    if (!isInviteCode(code)) throw new WorkspaceRepositoryError("invite-invalid");
    const tokenHash = await sha256Hex(code);
    const claimed = await binding.prepare(`
      UPDATE workspace_project_invite
      SET redeemed_by_user_id = ?, redeemed_at = ?
      WHERE token_hash = ?
        AND redeemed_by_user_id IS NULL
        AND expires_at > ?
        AND EXISTS (
          SELECT 1 FROM workspace_project AS p
          WHERE p.id = workspace_project_invite.project_id
            AND p.owner_user_id <> ?
        )
      RETURNING project_id AS projectId, role
    `).bind(userId, now, tokenHash, now, userId).first<{ projectId: string; role: ProjectMemberRole }>();

    if (claimed) return { projectId: claimed.projectId, access: claimed.role };

    const existing = await binding.prepare(`
      SELECT i.redeemed_by_user_id AS redeemedByUserId, i.expires_at AS expiresAt,
             p.owner_user_id AS ownerUserId
      FROM workspace_project_invite AS i
      JOIN workspace_project AS p ON p.id = i.project_id
      WHERE i.token_hash = ?
      LIMIT 1
    `).bind(tokenHash).first<{ redeemedByUserId: string | null; expiresAt: number; ownerUserId: string }>();
    if (!existing) throw new WorkspaceRepositoryError("invite-invalid");
    if (existing.redeemedByUserId !== null) throw new WorkspaceRepositoryError("invite-used");
    if (existing.expiresAt <= now) throw new WorkspaceRepositoryError("invite-expired");
    if (existing.ownerUserId === userId) throw new WorkspaceRepositoryError("workspace-conflict");
    throw new WorkspaceRepositoryError("invite-invalid");
  };

  const removeProjectMember = async (projectId: string, ownerUserId: string, memberUserId: string): Promise<boolean> => {
    if (await getProjectAccess(projectId, ownerUserId) !== "owner") throw new WorkspaceRepositoryError("workspace-forbidden");
    const result = await db.delete(workspaceProjectMembers)
      .where(and(eq(workspaceProjectMembers.projectId, projectId), eq(workspaceProjectMembers.userId, memberUserId)));
    return Boolean(result.meta.changes);
  };

  const displayNameFor = async (userId: string): Promise<string> => {
    const row = await binding.prepare(`
      SELECT COALESCE(p.display_name, u.name) AS displayName
      FROM user AS u
      LEFT JOIN user_profile AS p ON p.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `).bind(userId).first<{ displayName: string }>();
    return row?.displayName ?? "Found Calc user";
  };

  const createCalculation = async (userId: string, unknownInput: NamedCalculationInput | unknown): Promise<StoredWorkspaceCalculation> => {
    const parsed = parseNamedCalculationInput(unknownInput);
    if (!parsed.ok) throw new WorkspaceRepositoryError("invalid-workspace-input");
    const input = parsed.value;
    const access = await getProjectAccess(input.projectId, userId);
    if (access === null) throw new WorkspaceRepositoryError("workspace-not-found");
    if (access === "viewer") throw new WorkspaceRepositoryError("project-read-only");

    const id = crypto.randomUUID();
    await db.insert(workspaceCalculations).values({
      id,
      projectId: input.projectId,
      createdByUserId: userId,
      title: input.title,
      calculatorId: input.state.calculatorId,
      calculatorVersion: input.state.calculatorVersion,
      stateJson: JSON.stringify(input.state),
      ruleContextJson: input.ruleContext === undefined ? null : JSON.stringify(input.ruleContext),
    });
    const stored = await getCalculation(id, userId);
    if (!stored) throw new WorkspaceRepositoryError("stored-workspace-invalid");
    return stored;
  };

  const selectCalculationRow = async (id: string) => binding.prepare(`
    SELECT c.id, c.project_id AS projectId, c.created_by_user_id AS createdByUserId,
           COALESCE(p.display_name, u.name) AS creatorDisplayName,
           c.title, c.calculator_id AS calculatorId, c.calculator_version AS calculatorVersion,
           c.state_json AS stateJson, c.rule_context_json AS ruleContextJson, c.created_at AS createdAt
    FROM workspace_calculation AS c
    JOIN user AS u ON u.id = c.created_by_user_id
    LEFT JOIN user_profile AS p ON p.user_id = u.id
    WHERE c.id = ?
    LIMIT 1
  `).bind(id).first<{
    id: string; projectId: string; createdByUserId: string; creatorDisplayName: string; title: string;
    calculatorId: string; calculatorVersion: string; stateJson: string; ruleContextJson: string | null; createdAt: number;
  }>();

  async function getCalculation(id: string, userId: string): Promise<StoredWorkspaceCalculation | null> {
    const row = await selectCalculationRow(id);
    if (!row || await getProjectAccess(row.projectId, userId) === null) return null;
    return decodeCalculationRow(row);
  }

  const listProjectCalculations = async (projectId: string, userId: string): Promise<StoredWorkspaceCalculation[]> => {
    if (await getProjectAccess(projectId, userId) === null) throw new WorkspaceRepositoryError("workspace-forbidden");
    const result = await binding.prepare(`
      SELECT c.id, c.project_id AS projectId, c.created_by_user_id AS createdByUserId,
             COALESCE(p.display_name, u.name) AS creatorDisplayName,
             c.title, c.calculator_id AS calculatorId, c.calculator_version AS calculatorVersion,
             c.state_json AS stateJson, c.rule_context_json AS ruleContextJson, c.created_at AS createdAt
      FROM workspace_calculation AS c
      JOIN user AS u ON u.id = c.created_by_user_id
      LEFT JOIN user_profile AS p ON p.user_id = u.id
      WHERE c.project_id = ?
      ORDER BY c.created_at DESC
      LIMIT 100
    `).bind(projectId).all<{
      id: string; projectId: string; createdByUserId: string; creatorDisplayName: string; title: string;
      calculatorId: string; calculatorVersion: string; stateJson: string; ruleContextJson: string | null; createdAt: number;
    }>();
    return result.results.map(decodeCalculationRow);
  };

  const deleteCalculation = async (userId: string, calculationId: string): Promise<boolean> => {
    const row = await selectCalculationRow(calculationId);
    if (!row) return false;
    const access = await getProjectAccess(row.projectId, userId);
    if (access === null || access === "viewer" || (access === "editor" && row.createdByUserId !== userId)) {
      throw new WorkspaceRepositoryError("workspace-forbidden");
    }
    const result = await db.delete(workspaceCalculations).where(eq(workspaceCalculations.id, calculationId));
    return Boolean(result.meta.changes);
  };

  const listProjectParticipants = async (projectId: string, userId: string): Promise<WorkspaceParticipant[]> => {
    if (await getProjectAccess(projectId, userId) === null) throw new WorkspaceRepositoryError("workspace-forbidden");
    const project = await getProjectRow(projectId);
    if (!project) throw new WorkspaceRepositoryError("workspace-not-found");
    const ownerDisplayName = await displayNameFor(project.ownerUserId);
    const result = await binding.prepare(`
      SELECT m.user_id AS userId, COALESCE(p.display_name, u.name) AS displayName, m.role
      FROM workspace_project_member AS m
      JOIN user AS u ON u.id = m.user_id
      LEFT JOIN user_profile AS p ON p.user_id = u.id
      WHERE m.project_id = ?
      ORDER BY m.joined_at ASC
    `).bind(projectId).all<{ userId: string; displayName: string; role: ProjectMemberRole }>();
    return [
      { userId: project.ownerUserId, displayName: ownerDisplayName, role: "owner" },
      ...result.results.map((row) => ({ userId: row.userId, displayName: row.displayName, role: row.role } as const)),
    ];
  };

  const getProject = async (projectId: string, userId: string): Promise<WorkspaceProjectSummary | null> => {
    const row = await getProjectRow(projectId);
    if (!row) return null;
    const access = await getProjectAccess(projectId, userId);
    return access === null ? null : projectFromRow(row, access);
  };

  const buildProjectExport = async (projectId: string, userId: string, now = Date.now()): Promise<ProjectExport> => {
    const project = await getProject(projectId, userId);
    if (!project) throw new WorkspaceRepositoryError("workspace-forbidden");
    const participants = await listProjectParticipants(projectId, userId);
    const calculations = await listProjectCalculations(projectId, userId);
    return {
      schema: "found-calc.project-export.v1",
      exportedAt: new Date(now).toISOString(),
      project: {
        name: project.name,
        ...(project.description === undefined ? {} : { description: project.description }),
        status: project.status,
      },
      participants: participants.map(({ displayName, role }) => ({ displayName, role })),
      calculations: calculations.map((calculation) => ({
        title: calculation.title,
        calculatorId: calculation.calculatorId,
        calculatorVersion: calculation.calculatorVersion,
        state: calculation.state,
        creatorDisplayName: calculation.creatorDisplayName,
        ...(calculation.ruleContext === undefined ? {} : { ruleContext: calculation.ruleContext }),
        createdAt: new Date(calculation.createdAt).toISOString(),
      })),
    };
  };

  return {
    getProfile,
    upsertProfile,
    listGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    getProjectAccess,
    getProject,
    createProject,
    listWorkspaceProjects,
    updateProject,
    deleteProject,
    createInvite,
    redeemInvite,
    removeProjectMember,
    createCalculation,
    getCalculation,
    listProjectCalculations,
    deleteCalculation,
    listProjectParticipants,
    buildProjectExport,
  } as const;
};
