import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../../migrations/0001_phase04_auth_and_calculator_state.sql?raw";

import { createCalculatorStateRepository } from "../../src/lib/persistence/repository";

declare module "cloudflare:workers" {
  interface ProvidedEnv {
    DB: D1Database;
  }
}

const discount = (baseAmount: string) => ({
  calculatorId: "reference.discount" as const,
  calculatorVersion: "1.0.0",
  input: { baseAmount, discountPercentages: ["10.0000"] },
});

beforeEach(async () => {
  await env.DB.exec("DROP TABLE IF EXISTS calculator_state; DROP TABLE IF EXISTS verification; DROP TABLE IF EXISTS account; DROP TABLE IF EXISTS session; DROP TABLE IF EXISTS user;");
  await env.DB.exec(migrationSql);
});

describe("calculator state repository", () => {
  it("upserts one latest draft per owner and calculator and can delete it", async () => {
    const repo = createCalculatorStateRepository(env.DB);

    await repo.upsertState({ ownerType: "guest", ownerId: "guest-a", state: discount("100.00"), updatedAt: 10 });
    await repo.upsertState({ ownerType: "guest", ownerId: "guest-a", state: discount("200.00"), updatedAt: 20 });

    const found = await repo.getState("guest", "guest-a", "reference.discount");
    expect(found?.state).toEqual(discount("200.00"));
    expect(found?.updatedAt).toBe(20);

    await repo.deleteState("guest", "guest-a", "reference.discount");
    expect(await repo.getState("guest", "guest-a", "reference.discount")).toBeNull();
  });

  it("claims guest drafts idempotently and keeps the newer user draft on conflicts", async () => {
    const repo = createCalculatorStateRepository(env.DB);
    await repo.upsertState({ ownerType: "guest", ownerId: "guest-a", state: discount("100.00"), updatedAt: 20 });
    await repo.upsertState({ ownerType: "user", ownerId: "user-a", state: discount("300.00"), updatedAt: 30 });

    expect(await repo.claimGuestStates("guest-a", "user-a")).toEqual({ claimed: 0, keptUser: 1 });
    expect((await repo.getState("user", "user-a", "reference.discount"))?.state).toEqual(discount("300.00"));
    expect(await repo.getState("guest", "guest-a", "reference.discount")).toBeNull();

    expect(await repo.claimGuestStates("guest-a", "user-a")).toEqual({ claimed: 0, keptUser: 0 });
  });

  it("moves a newer guest draft to the user and lists user state summaries", async () => {
    const repo = createCalculatorStateRepository(env.DB);
    await repo.upsertState({ ownerType: "user", ownerId: "user-a", state: discount("50.00"), updatedAt: 10 });
    await repo.upsertState({ ownerType: "guest", ownerId: "guest-a", state: discount("90.00"), updatedAt: 40 });

    expect(await repo.claimGuestStates("guest-a", "user-a")).toEqual({ claimed: 1, keptUser: 0 });
    expect((await repo.getState("user", "user-a", "reference.discount"))?.state).toEqual(discount("90.00"));
    expect(await repo.listUserStates("user-a")).toEqual([
      expect.objectContaining({ calculatorId: "reference.discount", updatedAt: 40 }),
    ]);
  });
});
