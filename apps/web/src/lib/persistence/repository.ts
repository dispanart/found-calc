import type { D1Database } from "@cloudflare/workers-types";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { calculatorStates } from "./schema";
import {
  parsePersistedCalculatorState,
  type PersistedCalculatorState,
  type SupportedCalculatorId,
} from "./state";

export type CalculatorStateOwnerType = "guest" | "user";

export interface StoredCalculatorState {
  readonly id: string;
  readonly ownerType: CalculatorStateOwnerType;
  readonly ownerId: string;
  readonly calculatorId: SupportedCalculatorId;
  readonly calculatorVersion: string;
  readonly state: PersistedCalculatorState;
  readonly updatedAt: number;
}

export interface UpsertCalculatorStateInput {
  readonly ownerType: CalculatorStateOwnerType;
  readonly ownerId: string;
  readonly state: PersistedCalculatorState;
  readonly updatedAt?: number;
}

const classifyRepositoryError = (value: unknown): "missing-table" | "sqlite-busy" | "constraint" | "unknown" => {
  let current: unknown = value;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const message = "message" in current && typeof current.message === "string" ? current.message : "";
    if (/no such table/i.test(message)) return "missing-table";
    if (/SQLITE_BUSY|database is locked/i.test(message)) return "sqlite-busy";
    if (/constraint failed|unique constraint/i.test(message)) return "constraint";
    current = "cause" in current ? current.cause : undefined;
  }
  return "unknown";
};

const decodeRow = (row: typeof calculatorStates.$inferSelect): StoredCalculatorState => {
  let decoded: unknown;
  try {
    decoded = JSON.parse(row.stateJson);
  } catch {
    throw new Error("stored calculator state is not valid JSON");
  }
  const parsed = parsePersistedCalculatorState(decoded);
  if (!parsed.ok) {
    throw new Error("stored calculator state violates the canonical contract");
  }
  return {
    id: row.id,
    ownerType: row.ownerType as CalculatorStateOwnerType,
    ownerId: row.ownerId,
    calculatorId: parsed.value.calculatorId,
    calculatorVersion: row.calculatorVersion,
    state: parsed.value,
    updatedAt: row.updatedAt,
  };
};

export const createCalculatorStateRepository = (binding: D1Database) => {
  const db = drizzle(binding);

  const getState = async (
    ownerType: CalculatorStateOwnerType,
    ownerId: string,
    calculatorId: SupportedCalculatorId,
  ): Promise<StoredCalculatorState | null> => {
    const rows = await db
      .select()
      .from(calculatorStates)
      .where(
        and(
          eq(calculatorStates.ownerType, ownerType),
          eq(calculatorStates.ownerId, ownerId),
          eq(calculatorStates.calculatorId, calculatorId),
        ),
      )
      .limit(1);
    return rows[0] ? decodeRow(rows[0]) : null;
  };

  const upsertState = async (input: UpsertCalculatorStateInput): Promise<StoredCalculatorState> => {
    const parsed = parsePersistedCalculatorState(input.state);
    if (!parsed.ok) {
      throw new Error(`invalid persisted calculator state: ${parsed.code}`);
    }
    const updatedAt = input.updatedAt ?? Date.now();
    const values = {
      id: crypto.randomUUID(),
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      calculatorId: parsed.value.calculatorId,
      calculatorVersion: parsed.value.calculatorVersion,
      stateJson: JSON.stringify(parsed.value),
      updatedAt,
    } as const;

    try {
      await binding.prepare("SELECT 1 FROM calculator_state LIMIT 1").first();
      console.error("[found-calc][repository-upsert] preflight:ok");
    } catch (cause) {
      console.error(`[found-calc][repository-upsert] preflight:${classifyRepositoryError(cause)}`);
      throw cause;
    }

    try {
      await db
        .insert(calculatorStates)
        .values(values)
        .onConflictDoUpdate({
          target: [calculatorStates.ownerType, calculatorStates.ownerId, calculatorStates.calculatorId],
          set: {
            calculatorVersion: values.calculatorVersion,
            stateJson: values.stateJson,
            updatedAt: values.updatedAt,
          },
        });
    } catch (cause) {
      console.error(`[found-calc][repository-upsert] insert:${classifyRepositoryError(cause)}`);
      throw cause;
    }

    let stored: StoredCalculatorState | null;
    try {
      stored = await getState(input.ownerType, input.ownerId, parsed.value.calculatorId);
    } catch (cause) {
      console.error(`[found-calc][repository-upsert] readback:${classifyRepositoryError(cause)}`);
      throw cause;
    }
    if (!stored) throw new Error("calculator state upsert invariant failed");
    return stored;
  };

  const deleteState = async (
    ownerType: CalculatorStateOwnerType,
    ownerId: string,
    calculatorId: SupportedCalculatorId,
  ): Promise<void> => {
    await db
      .delete(calculatorStates)
      .where(
        and(
          eq(calculatorStates.ownerType, ownerType),
          eq(calculatorStates.ownerId, ownerId),
          eq(calculatorStates.calculatorId, calculatorId),
        ),
      );
  };

  const listUserStates = async (userId: string): Promise<StoredCalculatorState[]> => {
    const rows = await db
      .select()
      .from(calculatorStates)
      .where(and(eq(calculatorStates.ownerType, "user"), eq(calculatorStates.ownerId, userId)))
      .orderBy(desc(calculatorStates.updatedAt));
    return rows.map(decodeRow);
  };

  const claimGuestStates = async (
    guestId: string,
    userId: string,
  ): Promise<{ readonly claimed: number; readonly keptUser: number }> => {
    const guestRows = await db
      .select()
      .from(calculatorStates)
      .where(and(eq(calculatorStates.ownerType, "guest"), eq(calculatorStates.ownerId, guestId)))
      .orderBy(desc(calculatorStates.updatedAt));

    let claimed = 0;
    let keptUser = 0;
    for (const row of guestRows) {
      const guest = decodeRow(row);
      const user = await getState("user", userId, guest.calculatorId);
      if (!user || guest.updatedAt > user.updatedAt) {
        await upsertState({
          ownerType: "user",
          ownerId: userId,
          state: guest.state,
          updatedAt: guest.updatedAt,
        });
        claimed += 1;
      } else {
        keptUser += 1;
      }
      await deleteState("guest", guestId, guest.calculatorId);
    }

    return { claimed, keptUser } as const;
  };

  return { getState, upsertState, deleteState, listUserStates, claimGuestStates } as const;
};
