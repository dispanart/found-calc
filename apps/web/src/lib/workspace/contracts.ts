import {
  parsePersistedCalculatorState,
  type PersistedCalculatorState,
} from "@/lib/persistence/state";

export const MAX_WORKSPACE_BODY_BYTES = 16 * 1024;
export const WORKSPACE_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type WorkspaceLocale = "id" | "en";
export type GoalStatus = "active" | "completed" | "archived";
export type ProjectStatus = "active" | "archived";
export type ProjectMemberRole = "editor" | "viewer";
export type WorkspaceAccess = "owner" | ProjectMemberRole;

export interface ProfileInput {
  readonly displayName: string;
  readonly preferredLocale: WorkspaceLocale;
}

export interface GoalInput {
  readonly title: string;
  readonly note?: string;
  readonly targetDate?: string;
  readonly status: GoalStatus;
}

export interface GoalPatch {
  readonly title?: string;
  readonly note?: string | null;
  readonly targetDate?: string | null;
  readonly status?: GoalStatus;
}

export interface ProjectInput {
  readonly name: string;
  readonly description?: string;
  readonly goalId?: string;
  readonly status: ProjectStatus;
}

export interface ProjectPatch {
  readonly name?: string;
  readonly description?: string | null;
  readonly goalId?: string | null;
  readonly status?: ProjectStatus;
}

export interface InviteInput {
  readonly role: ProjectMemberRole;
}

export interface SyntheticRuleContext {
  readonly ruleId: "reference.synthetic-rate";
  readonly versionId: string;
}

export interface NamedCalculationInput {
  readonly projectId: string;
  readonly title: string;
  readonly state: PersistedCalculatorState;
  readonly ruleContext?: SyntheticRuleContext;
}

export type WorkspaceParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: "invalid-workspace-input" | "payload-too-large" };

const invalid = <T>(): WorkspaceParseResult<T> => ({ ok: false, code: "invalid-workspace-input" });
const tooLarge = <T>(): WorkspaceParseResult<T> => ({ ok: false, code: "payload-too-large" });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
};

const byteLength = (value: unknown): number | null => {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return null;
  }
};

const withinBodyLimit = (value: unknown): boolean => {
  const size = byteLength(value);
  return size !== null && size <= MAX_WORKSPACE_BODY_BYTES;
};

const trimmedText = (value: unknown, min: number, max: number): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) return null;
  return normalized;
};

const optionalTrimmedText = (value: unknown, max: number): string | undefined | null => {
  if (value === undefined) return undefined;
  const normalized = trimmedText(value, 1, max);
  return normalized;
};

const isStrictIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

const WORKSPACE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isWorkspaceId = (value: unknown): value is string =>
  typeof value === "string" && WORKSPACE_ID.test(value);

const isLocale = (value: unknown): value is WorkspaceLocale => value === "id" || value === "en";
const isGoalStatus = (value: unknown): value is GoalStatus =>
  value === "active" || value === "completed" || value === "archived";
const isProjectStatus = (value: unknown): value is ProjectStatus =>
  value === "active" || value === "archived";
const isMemberRole = (value: unknown): value is ProjectMemberRole =>
  value === "editor" || value === "viewer";

export const parseProfileInput = (value: unknown): WorkspaceParseResult<ProfileInput> => {
  if (!withinBodyLimit(value)) return tooLarge();
  if (!isRecord(value) || !hasOnlyKeys(value, ["displayName", "preferredLocale"])) return invalid();
  const displayName = trimmedText(value.displayName, 1, 80);
  if (displayName === null || !isLocale(value.preferredLocale)) return invalid();
  return { ok: true, value: { displayName, preferredLocale: value.preferredLocale } };
};

export const parseGoalInput = (value: unknown): WorkspaceParseResult<GoalInput> => {
  if (!withinBodyLimit(value)) return tooLarge();
  if (!isRecord(value) || !hasOnlyKeys(value, ["title", "note", "targetDate", "status"])) return invalid();
  const title = trimmedText(value.title, 1, 120);
  if (title === null) return invalid();
  const note = optionalTrimmedText(value.note, 1000);
  if (note === null) return invalid();
  if (value.targetDate !== undefined && !isStrictIsoDate(value.targetDate)) return invalid();
  const status = value.status === undefined ? "active" : value.status;
  if (!isGoalStatus(status)) return invalid();
  return {
    ok: true,
    value: {
      title,
      ...(note === undefined ? {} : { note }),
      ...(value.targetDate === undefined ? {} : { targetDate: value.targetDate }),
      status,
    },
  };
};

export const parseGoalPatch = (value: unknown): WorkspaceParseResult<GoalPatch> => {
  if (!withinBodyLimit(value)) return tooLarge();
  if (!isRecord(value) || !hasOnlyKeys(value, ["title", "note", "targetDate", "status"]) || Object.keys(value).length === 0) return invalid();
  const result: {
    title?: string;
    note?: string | null;
    targetDate?: string | null;
    status?: GoalStatus;
  } = {};

  if ("title" in value) {
    const title = trimmedText(value.title, 1, 120);
    if (title === null) return invalid();
    result.title = title;
  }
  if ("note" in value) {
    if (value.note === null) result.note = null;
    else {
      const note = trimmedText(value.note, 1, 1000);
      if (note === null) return invalid();
      result.note = note;
    }
  }
  if ("targetDate" in value) {
    if (value.targetDate === null) result.targetDate = null;
    else if (isStrictIsoDate(value.targetDate)) result.targetDate = value.targetDate;
    else return invalid();
  }
  if ("status" in value) {
    if (!isGoalStatus(value.status)) return invalid();
    result.status = value.status;
  }
  return { ok: true, value: result };
};

export const parseProjectInput = (value: unknown): WorkspaceParseResult<ProjectInput> => {
  if (!withinBodyLimit(value)) return tooLarge();
  if (!isRecord(value) || !hasOnlyKeys(value, ["name", "description", "goalId", "status"])) return invalid();
  const name = trimmedText(value.name, 1, 120);
  if (name === null) return invalid();
  const description = optionalTrimmedText(value.description, 2000);
  if (description === null) return invalid();
  if (value.goalId !== undefined && !isWorkspaceId(value.goalId)) return invalid();
  const status = value.status === undefined ? "active" : value.status;
  if (!isProjectStatus(status)) return invalid();
  return {
    ok: true,
    value: {
      name,
      ...(description === undefined ? {} : { description }),
      ...(value.goalId === undefined ? {} : { goalId: value.goalId }),
      status,
    },
  };
};

export const parseProjectPatch = (value: unknown): WorkspaceParseResult<ProjectPatch> => {
  if (!withinBodyLimit(value)) return tooLarge();
  if (!isRecord(value) || !hasOnlyKeys(value, ["name", "description", "goalId", "status"]) || Object.keys(value).length === 0) return invalid();
  const result: {
    name?: string;
    description?: string | null;
    goalId?: string | null;
    status?: ProjectStatus;
  } = {};

  if ("name" in value) {
    const name = trimmedText(value.name, 1, 120);
    if (name === null) return invalid();
    result.name = name;
  }
  if ("description" in value) {
    if (value.description === null) result.description = null;
    else {
      const description = trimmedText(value.description, 1, 2000);
      if (description === null) return invalid();
      result.description = description;
    }
  }
  if ("goalId" in value) {
    if (value.goalId === null) result.goalId = null;
    else if (isWorkspaceId(value.goalId)) result.goalId = value.goalId;
    else return invalid();
  }
  if ("status" in value) {
    if (!isProjectStatus(value.status)) return invalid();
    result.status = value.status;
  }
  return { ok: true, value: result };
};

export const parseInviteInput = (value: unknown): WorkspaceParseResult<InviteInput> => {
  if (!withinBodyLimit(value)) return tooLarge();
  if (!isRecord(value) || !hasOnlyKeys(value, ["role"]) || !isMemberRole(value.role)) return invalid();
  return { ok: true, value: { role: value.role } };
};

const parseRuleContext = (value: unknown): SyntheticRuleContext | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["ruleId", "versionId"])) return null;
  if (value.ruleId !== "reference.synthetic-rate") return null;
  const versionId = trimmedText(value.versionId, 1, 80);
  return versionId === null ? null : { ruleId: value.ruleId, versionId };
};

export const parseNamedCalculationInput = (value: unknown): WorkspaceParseResult<NamedCalculationInput> => {
  if (!withinBodyLimit(value)) return tooLarge();
  if (!isRecord(value) || !hasOnlyKeys(value, ["projectId", "title", "state", "ruleContext"])) return invalid();
  if (!isWorkspaceId(value.projectId)) return invalid();
  const title = trimmedText(value.title, 1, 120);
  if (title === null) return invalid();
  const parsedState = parsePersistedCalculatorState(value.state);
  if (!parsedState.ok) return parsedState.code === "payload-too-large" ? tooLarge() : invalid();

  if (value.ruleContext === undefined) {
    return { ok: true, value: { projectId: value.projectId, title, state: parsedState.value } };
  }
  if (parsedState.value.calculatorId !== "reference.synthetic-rule") return invalid();
  const ruleContext = parseRuleContext(value.ruleContext);
  if (ruleContext === null) return invalid();
  return { ok: true, value: { projectId: value.projectId, title, state: parsedState.value, ruleContext } };
};
