import { describe, expect, it } from "vitest";

import {
  parseWorkspaceCalculationPayload,
  parseWorkspaceProjectsPayload,
  writableWorkspaceProjects,
} from "./client";

const ownerId = "11111111-1111-4111-8111-111111111111";
const editorId = "22222222-2222-4222-8222-222222222222";
const viewerId = "33333333-3333-4333-8333-333333333333";
const recordId = "44444444-4444-4444-8444-444444444444";

const project = (id: string, name: string, access: "owner" | "editor" | "viewer") => ({
  id,
  name,
  status: "active",
  access,
  createdAt: 1_800_000_000_000,
  updatedAt: 1_800_000_000_000,
});

describe("workspace client parsing", () => {
  it("parses owned/shared projects and excludes viewer-only projects from save targets", () => {
    const parsed = parseWorkspaceProjectsPayload({
      projects: {
        owned: [project(ownerId, "Owned", "owner")],
        shared: [project(editorId, "Editable", "editor"), project(viewerId, "Read only", "viewer")],
      },
    });

    expect(parsed?.owned.map((item) => item.name)).toEqual(["Owned"]);
    expect(parsed?.shared.map((item) => item.name)).toEqual(["Editable", "Read only"]);
    expect(writableWorkspaceProjects(parsed!).map((item) => item.name)).toEqual(["Owned", "Editable"]);
  });

  it("validates calculation records before they can be restored", () => {
    const state = {
      calculatorId: "reference.discount",
      calculatorVersion: "1.0.0",
      input: { baseAmount: "100.00", discountPercentages: ["10"] },
    };
    const payload = {
      calculation: {
        id: recordId,
        projectId: ownerId,
        title: "Launch offer",
        calculatorId: "reference.discount",
        calculatorVersion: "1.0.0",
        state,
        creatorDisplayName: "Disa",
        createdAt: 1_800_000_000_000,
      },
    };

    expect(parseWorkspaceCalculationPayload(payload)?.state).toEqual(state);
    expect(parseWorkspaceCalculationPayload({ calculation: { ...payload.calculation, calculatorId: "reference.business-margin" } })).toBeNull();
    expect(parseWorkspaceCalculationPayload({ calculation: { ...payload.calculation, state: { ...state, calculatorVersion: "9.9.9" } } })).toBeNull();
    expect(parseWorkspaceCalculationPayload({ calculation: { ...payload.calculation, createdByUserId: "secret" } })).toBeNull();
  });

  it("accepts synthetic provenance only for the synthetic calculator", () => {
    const synthetic = {
      calculation: {
        id: recordId,
        projectId: ownerId,
        title: "Reference rate",
        calculatorId: "reference.synthetic-rule",
        calculatorVersion: "1.0.0",
        state: {
          calculatorId: "reference.synthetic-rule",
          calculatorVersion: "1.0.0",
          input: { baseAmount: "100.00", effectiveDate: "2026-01-01" },
        },
        creatorDisplayName: "Disa",
        ruleContext: { ruleId: "reference.synthetic-rate", versionId: "2026-a" },
        createdAt: 1_800_000_000_000,
      },
    };

    expect(parseWorkspaceCalculationPayload(synthetic)?.ruleContext?.versionId).toBe("2026-a");
    expect(parseWorkspaceCalculationPayload({
      calculation: {
        ...synthetic.calculation,
        calculatorId: "reference.discount",
        state: { calculatorId: "reference.discount", calculatorVersion: "1.0.0", input: { baseAmount: "100.00", discountPercentages: ["10"] } },
      },
    })).toBeNull();
  });
});
