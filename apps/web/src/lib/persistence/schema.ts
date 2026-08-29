import { relations, sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export const authUsers = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: timestampMs("created_at"),
  updatedAt: timestampMs("updated_at"),
  role: text("role").default("user"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
});

export const authSessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const authAccounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
  ],
);

export const authVerifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const calculatorStates = sqliteTable(
  "calculator_state",
  {
    id: text("id").primaryKey(),
    ownerType: text("owner_type", { enum: ["guest", "user"] }).notNull(),
    ownerId: text("owner_id").notNull(),
    calculatorId: text("calculator_id").notNull(),
    calculatorVersion: text("calculator_version").notNull(),
    stateJson: text("state_json").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("calculator_state_owner_calculator_unique").on(
      table.ownerType,
      table.ownerId,
      table.calculatorId,
    ),
    index("calculator_state_owner_idx").on(table.ownerType, table.ownerId),
  ],
);

export const ruleVersions = sqliteTable(
  "rule_version",
  {
    id: text("id").primaryKey(),
    ruleId: text("rule_id").notNull(),
    versionId: text("version_id").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveUntil: text("effective_until"),
    payloadJson: text("payload_json").notNull(),
    sourceId: text("source_id").notNull(),
    sourceUrl: text("source_url"),
    status: text("status", { enum: ["draft", "published"] }).notNull(),
    createdByUserId: text("created_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestampMs("created_at"),
    publishedByUserId: text("published_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("rule_version_rule_version_unique").on(table.ruleId, table.versionId),
    index("rule_version_rule_status_idx").on(table.ruleId, table.status, table.effectiveFrom),
    index("rule_version_status_idx").on(table.status),
  ],
);


export const userProfiles = sqliteTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  preferredLocale: text("preferred_locale", { enum: ["id", "en"] }).notNull(),
  createdAt: timestampMs("created_at"),
  updatedAt: timestampMs("updated_at"),
});

export const workspaceGoals = sqliteTable(
  "workspace_goal",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    note: text("note"),
    targetDate: text("target_date"),
    status: text("status", { enum: ["active", "completed", "archived"] }).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("workspace_goal_owner_idx").on(table.ownerUserId, table.status, table.updatedAt)],
);

export const workspaceProjects = sqliteTable(
  "workspace_project",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    goalId: text("goal_id").references(() => workspaceGoals.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", { enum: ["active", "archived"] }).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [
    index("workspace_project_owner_idx").on(table.ownerUserId, table.status, table.updatedAt),
    index("workspace_project_goal_idx").on(table.goalId),
  ],
);

export const workspaceProjectMembers = sqliteTable(
  "workspace_project_member",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => workspaceProjects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["editor", "viewer"] }).notNull(),
    joinedAt: timestampMs("joined_at"),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index("workspace_project_member_project_idx").on(table.projectId),
    index("workspace_project_member_user_idx").on(table.userId),
  ],
);

export const workspaceProjectInvites = sqliteTable(
  "workspace_project_invite",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => workspaceProjects.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    role: text("role", { enum: ["editor", "viewer"] }).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    createdAt: timestampMs("created_at"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    redeemedByUserId: text("redeemed_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    redeemedAt: integer("redeemed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("workspace_project_invite_project_idx").on(table.projectId, table.expiresAt),
    uniqueIndex("workspace_project_invite_token_unique").on(table.tokenHash),
  ],
);

export const workspaceCalculations = sqliteTable(
  "workspace_calculation",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => workspaceProjects.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    calculatorId: text("calculator_id").notNull(),
    calculatorVersion: text("calculator_version").notNull(),
    stateJson: text("state_json").notNull(),
    ruleContextJson: text("rule_context_json"),
    createdAt: timestampMs("created_at"),
  },
  (table) => [
    index("workspace_calculation_project_idx").on(table.projectId, table.createdAt),
    index("workspace_calculation_creator_idx").on(table.createdByUserId, table.createdAt),
  ],
);


export const billingCustomers = sqliteTable("billing_customer", {
  userId: text("user_id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  xenditCustomerId: text("xendit_customer_id").unique(),
  createdAt: timestampMs("created_at"),
  updatedAt: timestampMs("updated_at"),
});

export const billingCheckouts = sqliteTable(
  "billing_checkout",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(),
    providerReferenceId: text("provider_reference_id").notNull().unique(),
    providerSessionId: text("provider_session_id").unique(),
    status: text("status", { enum: ["pending", "completed", "expired"] }).default("pending").notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [
    index("billing_checkout_user_idx").on(table.userId, table.createdAt),
    index("billing_checkout_plan_idx").on(table.planId, table.createdAt),
  ],
);

export const billingSubscriptions = sqliteTable(
  "billing_subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(),
    providerPlanId: text("provider_plan_id").notNull().unique(),
    referenceId: text("reference_id").notNull(),
    status: text("status", { enum: ["pending", "active", "past_due", "inactive"] }).notNull(),
    latestCycleStatus: text("latest_cycle_status"),
    latestEventAt: integer("latest_event_at").notNull(),
    latestEventRank: integer("latest_event_rank").default(0).notNull(),
    currentCycleStartedAt: integer("current_cycle_started_at"),
    nextCycleAt: integer("next_cycle_at"),
    cancellationRequestedAt: integer("cancellation_requested_at"),
    providerCreatedAt: integer("provider_created_at"),
    providerUpdatedAt: integer("provider_updated_at"),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [
    uniqueIndex("billing_subscription_user_provider_unique").on(table.userId, table.providerPlanId),
    index("billing_subscription_user_idx").on(table.userId, table.updatedAt),
    index("billing_subscription_reference_idx").on(table.referenceId),
  ],
);

export const billingWebhookInbox = sqliteTable(
  "billing_webhook_inbox",
  {
    dedupeKey: text("dedupe_key").primaryKey(),
    claimToken: text("claim_token").notNull(),
    eventName: text("event_name").notNull(),
    providerPlanId: text("provider_plan_id"),
    providerCycleId: text("provider_cycle_id"),
    providerEventAt: integer("provider_event_at").notNull(),
    receivedAt: integer("received_at").notNull(),
    processedAt: integer("processed_at").notNull(),
    result: text("result", { enum: ["applied", "ignored"] }).notNull(),
  },
  (table) => [index("billing_webhook_provider_idx").on(table.providerPlanId, table.providerEventAt)],
);

export const authUserRelations = relations(authUsers, ({ many }) => ({
  sessions: many(authSessions),
  accounts: many(authAccounts),
}));

export const authSessionRelations = relations(authSessions, ({ one }) => ({
  user: one(authUsers, { fields: [authSessions.userId], references: [authUsers.id] }),
}));

export const authAccountRelations = relations(authAccounts, ({ one }) => ({
  user: one(authUsers, { fields: [authAccounts.userId], references: [authUsers.id] }),
}));

export const authSchema = {
  user: authUsers,
  session: authSessions,
  account: authAccounts,
  verification: authVerifications,
};
