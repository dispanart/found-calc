import {
  parsePersistedCalculatorState,
  type PersistedCalculatorState,
  type SupportedCalculatorId,
} from "@/lib/persistence/state";
import {
  isWorkspaceId,
  type NamedCalculationInput,
  type SyntheticRuleContext,
  type WorkspaceAccess,
} from "./contracts";

export interface WorkspaceProjectClientSummary {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly status: "active" | "archived";
  readonly access: WorkspaceAccess;
  readonly goalId?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface WorkspaceProjectCollection {
  readonly owned: readonly WorkspaceProjectClientSummary[];
  readonly shared: readonly WorkspaceProjectClientSummary[];
}

export interface WorkspaceCalculationRecord {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly calculatorId: SupportedCalculatorId;
  readonly calculatorVersion: string;
  readonly state: PersistedCalculatorState;
  readonly creatorDisplayName: string;
  readonly ruleContext?: SyntheticRuleContext;
  readonly createdAt: number;
  readonly canDelete?: boolean;
}

export class WorkspaceClientError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = "WorkspaceClientError";
    this.code = code;
    this.status = status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (record: Record<string, unknown>, keys: readonly string[]) => {
  const allowed = new Set(keys);
  return Object.keys(record).every((key) => allowed.has(key));
};

const isTimestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isNonEmptyText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;

const parseAccess = (value: unknown): WorkspaceAccess | null =>
  value === "owner" || value === "editor" || value === "viewer" ? value : null;

const parseProject = (value: unknown): WorkspaceProjectClientSummary | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "id", "name", "description", "status", "access", "goalId", "createdAt", "updatedAt",
  ])) return null;
  if (!isWorkspaceId(value.id) || !isNonEmptyText(value.name, 120)) return null;
  if (value.description !== undefined && !isNonEmptyText(value.description, 2000)) return null;
  if (value.status !== "active" && value.status !== "archived") return null;
  const access = parseAccess(value.access);
  if (access === null) return null;
  if (value.goalId !== undefined && (!isWorkspaceId(value.goalId) || access !== "owner")) return null;
  if (!isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)) return null;
  return {
    id: value.id,
    name: value.name.trim(),
    ...(value.description === undefined ? {} : { description: value.description.trim() }),
    status: value.status,
    access,
    ...(value.goalId === undefined ? {} : { goalId: value.goalId }),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

const parseProjectArray = (value: unknown): WorkspaceProjectClientSummary[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed: WorkspaceProjectClientSummary[] = [];
  for (const item of value) {
    const project = parseProject(item);
    if (project === null) return null;
    parsed.push(project);
  }
  return parsed;
};

export const parseWorkspaceProjectsPayload = (value: unknown): WorkspaceProjectCollection | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["projects"]) || !isRecord(value.projects) || !hasOnlyKeys(value.projects, ["owned", "shared"])) return null;
  const owned = parseProjectArray(value.projects.owned);
  const shared = parseProjectArray(value.projects.shared);
  if (owned === null || shared === null) return null;
  if (owned.some((project) => project.access !== "owner") || shared.some((project) => project.access === "owner")) return null;
  return { owned, shared };
};

export const writableWorkspaceProjects = (
  projects: WorkspaceProjectCollection,
): readonly WorkspaceProjectClientSummary[] => [
  ...projects.owned,
  ...projects.shared.filter((project) => project.access === "editor"),
];

const parseRuleContext = (value: unknown): SyntheticRuleContext | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["ruleId", "versionId"])) return null;
  if (value.ruleId !== "reference.synthetic-rate" || !isNonEmptyText(value.versionId, 80)) return null;
  return { ruleId: value.ruleId, versionId: value.versionId.trim() };
};

export const parseWorkspaceCalculationPayload = (value: unknown): WorkspaceCalculationRecord | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["calculation"]) || !isRecord(value.calculation)) return null;
  const record = value.calculation;
  if (!hasOnlyKeys(record, [
    "id", "projectId", "title", "calculatorId", "calculatorVersion", "state", "creatorDisplayName", "ruleContext", "createdAt", "canDelete",
  ])) return null;
  if (!isWorkspaceId(record.id) || !isWorkspaceId(record.projectId)) return null;
  if (!isNonEmptyText(record.title, 120) || !isNonEmptyText(record.creatorDisplayName, 80)) return null;
  if (!isNonEmptyText(record.calculatorVersion, 80) || !isTimestamp(record.createdAt)) return null;
  if (record.canDelete !== undefined && typeof record.canDelete !== "boolean") return null;
  const parsedState = parsePersistedCalculatorState(record.state);
  if (!parsedState.ok || parsedState.value.calculatorId !== record.calculatorId || parsedState.value.calculatorVersion !== record.calculatorVersion) return null;

  let ruleContext: SyntheticRuleContext | undefined;
  if (record.ruleContext !== undefined) {
    if (parsedState.value.calculatorId !== "reference.synthetic-rule") return null;
    const parsed = parseRuleContext(record.ruleContext);
    if (parsed === null) return null;
    ruleContext = parsed;
  }

  return {
    id: record.id,
    projectId: record.projectId,
    title: record.title.trim(),
    calculatorId: parsedState.value.calculatorId,
    calculatorVersion: record.calculatorVersion.trim(),
    state: parsedState.value,
    creatorDisplayName: record.creatorDisplayName.trim(),
    ...(ruleContext === undefined ? {} : { ruleContext }),
    createdAt: record.createdAt,
    ...(record.canDelete === undefined ? {} : { canDelete: record.canDelete }),
  };
};

const readErrorCode = async (response: Response): Promise<string> => {
  try {
    const payload = await response.clone().json() as unknown;
    if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === "string") return payload.error.code;
  } catch {
    // normalized below
  }
  return "workspace-request-failed";
};

const requireOk = async (response: Response) => {
  if (!response.ok) throw new WorkspaceClientError(await readErrorCode(response), response.status);
};

export const fetchWorkspaceProjects = async (signal?: AbortSignal): Promise<WorkspaceProjectCollection> => {
  const response = await fetch("/api/workspace/projects", { cache: "no-store", signal });
  await requireOk(response);
  const parsed = parseWorkspaceProjectsPayload(await response.json());
  if (parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const fetchWorkspaceCalculation = async (
  recordId: string,
  signal?: AbortSignal,
): Promise<WorkspaceCalculationRecord> => {
  if (!isWorkspaceId(recordId)) throw new WorkspaceClientError("workspace-not-found", 404);
  const response = await fetch(`/api/workspace/calculations/${encodeURIComponent(recordId)}`, { cache: "no-store", signal });
  await requireOk(response);
  const parsed = parseWorkspaceCalculationPayload(await response.json());
  if (parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const saveWorkspaceCalculation = async (input: NamedCalculationInput): Promise<WorkspaceCalculationRecord> => {
  const response = await fetch("/api/workspace/calculations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await requireOk(response);
  const parsed = parseWorkspaceCalculationPayload(await response.json());
  if (parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export interface WorkspaceProfileClient {
  readonly userId: string;
  readonly displayName: string;
  readonly preferredLocale: "id" | "en";
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface WorkspaceGoalClient {
  readonly id: string;
  readonly title: string;
  readonly note?: string;
  readonly targetDate?: string;
  readonly status: "active" | "completed" | "archived";
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface WorkspaceParticipantClient {
  readonly userId?: string;
  readonly displayName: string;
  readonly role: "owner" | "editor" | "viewer";
}

export interface WorkspaceProjectDetailClient {
  readonly project: WorkspaceProjectClientSummary;
  readonly participants: readonly WorkspaceParticipantClient[];
  readonly calculations: readonly WorkspaceCalculationRecord[];
}

const parseProfile = (value: unknown): WorkspaceProfileClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["userId", "displayName", "preferredLocale", "createdAt", "updatedAt"])) return null;
  if (typeof value.userId !== "string" || !isNonEmptyText(value.displayName, 80)) return null;
  if (value.preferredLocale !== "id" && value.preferredLocale !== "en") return null;
  if (!isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)) return null;
  return { userId: value.userId, displayName: value.displayName.trim(), preferredLocale: value.preferredLocale, createdAt: value.createdAt, updatedAt: value.updatedAt };
};

export const parseWorkspaceProfilePayload = (value: unknown): WorkspaceProfileClient | null | undefined => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["profile"])) return undefined;
  if (value.profile === null) return null;
  return parseProfile(value.profile) ?? undefined;
};

const parseGoal = (value: unknown): WorkspaceGoalClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["id", "title", "note", "targetDate", "status", "createdAt", "updatedAt"])) return null;
  if (!isWorkspaceId(value.id) || !isNonEmptyText(value.title, 120)) return null;
  if (value.note !== undefined && !isNonEmptyText(value.note, 1000)) return null;
  if (value.targetDate !== undefined && (typeof value.targetDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.targetDate))) return null;
  if (value.status !== "active" && value.status !== "completed" && value.status !== "archived") return null;
  if (!isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)) return null;
  return {
    id: value.id,
    title: value.title.trim(),
    ...(value.note === undefined ? {} : { note: value.note.trim() }),
    ...(value.targetDate === undefined ? {} : { targetDate: value.targetDate }),
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const parseWorkspaceGoalsPayload = (value: unknown): readonly WorkspaceGoalClient[] | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["goals"]) || !Array.isArray(value.goals)) return null;
  const goals: WorkspaceGoalClient[] = [];
  for (const item of value.goals) {
    const goal = parseGoal(item);
    if (goal === null) return null;
    goals.push(goal);
  }
  return goals;
};

const parseSingleGoalPayload = (value: unknown): WorkspaceGoalClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["goal"])) return null;
  return parseGoal(value.goal);
};

const parseSingleProjectPayload = (value: unknown): WorkspaceProjectClientSummary | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["project"])) return null;
  return parseProject(value.project);
};

const parseParticipant = (value: unknown): WorkspaceParticipantClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["userId", "displayName", "role"])) return null;
  if (value.userId !== undefined && typeof value.userId !== "string") return null;
  if (!isNonEmptyText(value.displayName, 80)) return null;
  if (value.role !== "owner" && value.role !== "editor" && value.role !== "viewer") return null;
  return {
    ...(value.userId === undefined ? {} : { userId: value.userId }),
    displayName: value.displayName.trim(),
    role: value.role,
  };
};

export const parseWorkspaceProjectDetailPayload = (value: unknown): WorkspaceProjectDetailClient | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["project", "participants", "calculations"])) return null;
  const project = parseProject(value.project);
  if (project === null || !Array.isArray(value.participants) || !Array.isArray(value.calculations)) return null;
  const participants: WorkspaceParticipantClient[] = [];
  for (const item of value.participants) {
    const participant = parseParticipant(item);
    if (participant === null) return null;
    if (project.access === "owner" && participant.role !== "owner" && participant.userId === undefined) return null;
    if (project.access !== "owner" && participant.userId !== undefined) return null;
    participants.push(participant);
  }
  const calculations: WorkspaceCalculationRecord[] = [];
  for (const item of value.calculations) {
    const calculation = parseWorkspaceCalculationPayload({ calculation: item });
    if (calculation === null) return null;
    calculations.push(calculation);
  }
  return { project, participants, calculations };
};

const requestWorkspaceJson = async (path: string, init?: RequestInit): Promise<unknown> => {
  const response = await fetch(path, { cache: "no-store", ...init });
  await requireOk(response);
  return response.status === 204 ? null : response.json();
};

const jsonMutation = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const fetchWorkspaceProfile = async (): Promise<WorkspaceProfileClient | null> => {
  const parsed = parseWorkspaceProfilePayload(await requestWorkspaceJson("/api/workspace/profile"));
  if (parsed === undefined) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const updateWorkspaceProfile = async (input: { displayName: string; preferredLocale: "id" | "en" }): Promise<WorkspaceProfileClient> => {
  const parsed = parseWorkspaceProfilePayload(await requestWorkspaceJson("/api/workspace/profile", jsonMutation("PUT", input)));
  if (parsed === undefined || parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const fetchWorkspaceGoals = async (): Promise<readonly WorkspaceGoalClient[]> => {
  const parsed = parseWorkspaceGoalsPayload(await requestWorkspaceJson("/api/workspace/goals"));
  if (parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const createWorkspaceGoal = async (input: { title: string; note?: string; targetDate?: string; status?: "active" | "completed" | "archived" }): Promise<WorkspaceGoalClient> => {
  const parsed = parseSingleGoalPayload(await requestWorkspaceJson("/api/workspace/goals", jsonMutation("POST", input)));
  if (parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const patchWorkspaceGoal = async (goalId: string, patch: Record<string, unknown>): Promise<WorkspaceGoalClient> => {
  const parsed = parseSingleGoalPayload(await requestWorkspaceJson(`/api/workspace/goals/${encodeURIComponent(goalId)}`, jsonMutation("PATCH", patch)));
  if (parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const deleteWorkspaceGoal = async (goalId: string): Promise<void> => {
  await requestWorkspaceJson(`/api/workspace/goals/${encodeURIComponent(goalId)}`, { method: "DELETE" });
};

export const createWorkspaceProject = async (input: { name: string; description?: string; goalId?: string; status?: "active" | "archived" }): Promise<WorkspaceProjectClientSummary> => {
  const parsed = parseSingleProjectPayload(await requestWorkspaceJson("/api/workspace/projects", jsonMutation("POST", input)));
  if (parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const patchWorkspaceProject = async (projectId: string, patch: Record<string, unknown>): Promise<WorkspaceProjectClientSummary> => {
  const parsed = parseSingleProjectPayload(await requestWorkspaceJson(`/api/workspace/projects/${encodeURIComponent(projectId)}`, jsonMutation("PATCH", patch)));
  if (parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const deleteWorkspaceProject = async (projectId: string): Promise<void> => {
  await requestWorkspaceJson(`/api/workspace/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
};

export const fetchWorkspaceProjectDetail = async (projectId: string): Promise<WorkspaceProjectDetailClient> => {
  const parsed = parseWorkspaceProjectDetailPayload(await requestWorkspaceJson(`/api/workspace/projects/${encodeURIComponent(projectId)}`));
  if (parsed === null) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return parsed;
};

export const createWorkspaceProjectInvite = async (projectId: string, role: "editor" | "viewer"): Promise<{ code: string; role: "editor" | "viewer"; expiresAt: number }> => {
  const value = await requestWorkspaceJson(`/api/workspace/projects/${encodeURIComponent(projectId)}/invites`, jsonMutation("POST", { role }));
  if (!isRecord(value) || !hasOnlyKeys(value, ["invite"]) || !isRecord(value.invite) || !hasOnlyKeys(value.invite, ["code", "role", "expiresAt"])) throw new WorkspaceClientError("invalid-workspace-response", 502);
  if (typeof value.invite.code !== "string" || !/^[0-9a-f]{64}$/i.test(value.invite.code)) throw new WorkspaceClientError("invalid-workspace-response", 502);
  if (value.invite.role !== "editor" && value.invite.role !== "viewer") throw new WorkspaceClientError("invalid-workspace-response", 502);
  if (!isTimestamp(value.invite.expiresAt)) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return { code: value.invite.code, role: value.invite.role, expiresAt: value.invite.expiresAt };
};

export const redeemWorkspaceInvite = async (code: string): Promise<{ projectId: string; access: "editor" | "viewer" }> => {
  const value = await requestWorkspaceJson("/api/workspace/invites/redeem", jsonMutation("POST", { code }));
  if (!isRecord(value) || !hasOnlyKeys(value, ["projectId", "access"]) || !isWorkspaceId(value.projectId) || (value.access !== "editor" && value.access !== "viewer")) throw new WorkspaceClientError("invalid-workspace-response", 502);
  return { projectId: value.projectId, access: value.access };
};

export const removeWorkspaceProjectMember = async (projectId: string, userId: string): Promise<void> => {
  await requestWorkspaceJson(`/api/workspace/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
};

export const deleteWorkspaceNamedCalculation = async (calculationId: string): Promise<void> => {
  await requestWorkspaceJson(`/api/workspace/calculations/${encodeURIComponent(calculationId)}`, { method: "DELETE" });
};
