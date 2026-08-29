import { describe, expect, it } from "vitest";
import type { BillingTrialRecord } from "./repository";
import { handleBestiesTrialRequest, type BillingTrialHttpServices } from "./trial-http";

const nowMs = 1_800_000_000_000;
const trial: BillingTrialRecord = {
  userId: "user-1",
  trialTier: "besties",
  startedAt: nowMs,
  endsAt: nowMs + 14 * 24 * 60 * 60 * 1000,
  convertedAt: null,
};

const request = (body: string | object = {}) => new Request("https://found.example/api/billing/trial", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

const services = (overrides: Partial<BillingTrialHttpServices> = {}): BillingTrialHttpServices => ({
  auth: { api: { getSession: async () => ({ user: { id: "user-1", name: "Dina", email: "dina@example.test", emailVerified: true } }) } } as BillingTrialHttpServices["auth"],
  repository: {
    getTrialForUser: async () => null,
    hasHistoricalPaidSubscription: async () => false,
    startBestiesTrial: async () => ({ started: true, trial }),
  },
  now: () => new Date(nowMs),
  ...overrides,
});

describe("Besties trial HTTP boundary", () => {
  it("requires authentication", async () => {
    const response = await handleBestiesTrialRequest(request(), services({
      auth: { api: { getSession: async () => null } } as BillingTrialHttpServices["auth"],
    }));
    expect(response.status).toBe(401);
  });

  it("rejects malformed or non-empty request bodies", async () => {
    expect((await handleBestiesTrialRequest(request("{"), services())).status).toBe(400);
    expect((await handleBestiesTrialRequest(request({ tier: "besties" }), services())).status).toBe(400);
  });

  it("starts an eligible verified account from the injected server clock", async () => {
    let starts = 0;
    const response = await handleBestiesTrialRequest(request(), services({
      repository: {
        getTrialForUser: async () => null,
        hasHistoricalPaidSubscription: async () => false,
        startBestiesTrial: async (_userId, receivedNow) => {
          starts += 1;
          expect(receivedNow).toBe(nowMs);
          return { started: true, trial };
        },
      },
    }));
    expect(response.status).toBe(201);
    expect(starts).toBe(1);
    expect(await response.json()).toMatchObject({
      trial: { startedAt: nowMs, endsAt: trial.endsAt, eligible: false },
      commercial: { tier: "besties", source: "trial", accessUntil: trial.endsAt },
    });
  });

  it("never extends an already-consumed trial and reports its current effective state", async () => {
    let starts = 0;
    const expired = { ...trial, startedAt: nowMs - 20_000, endsAt: nowMs - 10_000 };
    const response = await handleBestiesTrialRequest(request(), services({
      repository: {
        getTrialForUser: async () => expired,
        hasHistoricalPaidSubscription: async () => false,
        startBestiesTrial: async () => { starts += 1; return { started: false, trial: expired }; },
      },
    }));
    expect(response.status).toBe(409);
    expect(starts).toBe(0);
    expect(await response.json()).toMatchObject({
      error: { code: "trial-already-consumed" },
      trial: { startedAt: expired.startedAt, endsAt: expired.endsAt },
      commercial: { tier: "friends", source: "friends" },
    });
  });

  it("rejects historical paid and unverified accounts before creating a trial", async () => {
    expect((await handleBestiesTrialRequest(request(), services({
      repository: {
        getTrialForUser: async () => null,
        hasHistoricalPaidSubscription: async () => true,
        startBestiesTrial: async () => { throw new Error("must not start"); },
      },
    }))).status).toBe(409);

    expect((await handleBestiesTrialRequest(request(), services({
      auth: { api: { getSession: async () => ({ user: { id: "user-1", name: "Dina", email: "dina@example.test", emailVerified: false } }) } } as BillingTrialHttpServices["auth"],
    }))).status).toBe(409);
  });
});
