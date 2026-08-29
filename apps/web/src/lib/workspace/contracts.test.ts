import { describe, expect, it } from "vitest";

import {
  MAX_WORKSPACE_BODY_BYTES,
  parseGoalInput,
  parseGoalPatch,
  parseInviteInput,
  parseNamedCalculationInput,
  parseProfileInput,
  parseProjectInput,
  parseProjectPatch,
} from "./contracts";

const discountState = {
  calculatorId: "reference.discount",
  calculatorVersion: "1.0.0",
  input: { baseAmount: "100.00", discountPercentages: ["10"] },
} as const;

describe("workspace contracts", () => {
  it("normalizes profile input and rejects unknown fields", () => {
    expect(parseProfileInput({ displayName: "  Disa  ", preferredLocale: "id" })).toEqual({
      ok: true,
      value: { displayName: "Disa", preferredLocale: "id" },
    });
    expect(parseProfileInput({ displayName: "Disa", preferredLocale: "id", role: "admin" })).toEqual({
      ok: false,
      code: "invalid-workspace-input",
    });
  });

  it("requires strict goal dates and bounded text", () => {
    expect(parseGoalInput({ title: "Launch", targetDate: "2026-02-29" }).ok).toBe(false);
    expect(parseGoalInput({ title: "Launch", targetDate: "2028-02-29", note: "  keep it focused  " })).toEqual({
      ok: true,
      value: { title: "Launch", note: "keep it focused", targetDate: "2028-02-29", status: "active" },
    });
    expect(parseGoalInput({ title: "x".repeat(121) }).ok).toBe(false);
  });

  it("accepts only non-empty goal and project patches", () => {
    expect(parseGoalPatch({})).toEqual({ ok: false, code: "invalid-workspace-input" });
    expect(parseGoalPatch({ status: "completed" })).toEqual({ ok: true, value: { status: "completed" } });
    expect(parseProjectPatch({})).toEqual({ ok: false, code: "invalid-workspace-input" });
    expect(parseProjectPatch({ status: "archived", goalId: null })).toEqual({
      ok: true,
      value: { status: "archived", goalId: null },
    });
  });

  it("validates project goal ids and invite roles", () => {
    expect(parseProjectInput({ name: "Pricing", goalId: "not-a-uuid" }).ok).toBe(false);
    expect(parseProjectInput({ name: " Pricing ", description: "  Scenario workspace  " })).toEqual({
      ok: true,
      value: { name: "Pricing", description: "Scenario workspace", status: "active" },
    });
    expect(parseInviteInput({ role: "viewer" })).toEqual({ ok: true, value: { role: "viewer" } });
    expect(parseInviteInput({ role: "owner" }).ok).toBe(false);
  });

  it("validates named calculation state and synthetic rule provenance", () => {
    const projectId = "0f4dce8d-f184-4f73-90bb-ec76bc92a9aa";
    expect(parseNamedCalculationInput({ projectId, title: " Offer A ", state: discountState })).toEqual({
      ok: true,
      value: { projectId, title: "Offer A", state: discountState },
    });
    expect(parseNamedCalculationInput({
      projectId,
      title: "Offer A",
      state: discountState,
      ruleContext: { ruleId: "reference.synthetic-rate", versionId: "2026-a" },
    }).ok).toBe(false);
  });

  it("rejects bodies over the workspace byte limit", () => {
    expect(parseProfileInput({ displayName: "x".repeat(MAX_WORKSPACE_BODY_BYTES), preferredLocale: "en" })).toEqual({
      ok: false,
      code: "payload-too-large",
    });
  });
});
