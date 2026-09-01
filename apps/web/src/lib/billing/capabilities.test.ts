import type { D1Database } from "@cloudflare/workers-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  getStatusForUser: vi.fn(),
  getTrialForUser: vi.fn(),
}));

vi.mock("./repository", () => ({
  createBillingRepository: () => repositoryMocks,
}));

import {
  createCommercialAccessAuthorizer,
  createCommercialCapabilityAuthorizer,
} from "./capabilities";

const database = {} as D1Database;
const NOW = 1_800_000_000_000;

const subscription = (overrides: Partial<{
  planId: string;
  status: "pending" | "active" | "past_due" | "inactive";
  paidThroughAt: number | null;
}> = {}) => ({
  id: "sub_fixture",
  userId: "user_fixture",
  planId: overrides.planId ?? "pro-monthly-2026a",
  providerPlanId: "provider_plan_fixture",
  referenceId: "reference_fixture",
  status: overrides.status ?? "active",
  latestCycleStatus: "SUCCEEDED",
  latestEventAt: NOW - 10_000,
  nextCycleAt: NOW + 86_400_000,
  paidThroughAt: overrides.paidThroughAt ?? null,
  cancellationRequestedAt: null,
  pendingPlanId: null,
  pendingPlanChangeRequestedAt: null,
});

describe("commercial access authorizer", () => {
  beforeEach(() => {
    repositoryMocks.getStatusForUser.mockReset();
    repositoryMocks.getTrialForUser.mockReset();
    repositoryMocks.getStatusForUser.mockResolvedValue({ subscription: null, checkoutPending: false });
    repositoryMocks.getTrialForUser.mockResolvedValue(null);
  });

  it("returns the full Besties trial widget limits", async () => {
    repositoryMocks.getTrialForUser.mockResolvedValue({
      userId: "user_trial",
      trialTier: "besties",
      startedAt: NOW - 1_000,
      endsAt: NOW + 1_000,
      convertedAt: null,
    });

    const access = await createCommercialAccessAuthorizer(database).getAccess(
      "user_trial",
      new Date(NOW),
    );

    expect(access).toMatchObject({ tier: "besties", source: "trial" });
    expect(access.limits.widgetDomains).toBe(3);
    expect(access.limits.removeWidgetBranding).toBe(true);
  });

  it("returns active Family paid access before any trial", async () => {
    repositoryMocks.getStatusForUser.mockResolvedValue({
      subscription: subscription({ planId: "business-monthly-2026a" }),
      checkoutPending: false,
    });
    repositoryMocks.getTrialForUser.mockResolvedValue({
      userId: "user_family",
      trialTier: "besties",
      startedAt: NOW - 1_000,
      endsAt: NOW + 1_000,
      convertedAt: null,
    });

    const access = await createCommercialAccessAuthorizer(database).getAccess(
      "user_family",
      new Date(NOW),
    );

    expect(access).toMatchObject({ tier: "family", source: "paid" });
    expect(access.limits.widgetDomains).toBe(10);
    expect(access.limits.whiteLabelWidgets).toBe(true);
  });

  it("preserves paid access through the cancellation paid-through boundary", async () => {
    repositoryMocks.getStatusForUser.mockResolvedValue({
      subscription: subscription({ status: "inactive", paidThroughAt: NOW + 60_000 }),
      checkoutPending: false,
    });

    const access = await createCommercialAccessAuthorizer(database).getAccess(
      "user_cancelled",
      new Date(NOW),
    );

    expect(access).toMatchObject({ tier: "besties", source: "paid", accessUntil: NOW + 60_000 });
  });

  it("falls back to Friends when no paid or trial access is effective", async () => {
    const access = await createCommercialAccessAuthorizer(database).getAccess(
      "user_friends",
      new Date(NOW),
    );

    expect(access).toMatchObject({ tier: "friends", source: "friends", accessUntil: null });
    expect(access.limits.widgetDomains).toBe(1);
  });

  it("keeps the existing persistence-limit authorizer behavior", async () => {
    const limits = await createCommercialCapabilityAuthorizer(database).getLimits(
      "user_friends",
      new Date(NOW),
    );

    expect(limits).toEqual({ savedCalculations: 5, activeGoals: 1, activeProjects: 1 });
  });
});
