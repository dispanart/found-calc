import type { D1Database } from "@cloudflare/workers-types";

import {
  createCalculatorStateRepository,
  type StoredCalculatorState,
} from "./repository";
import type { PersistedCalculatorState } from "./state";

export class CalculatorStateLimitError extends Error {
  constructor() {
    super("Saved Calculations limit reached");
    this.name = "CalculatorStateLimitError";
  }
}

export const upsertUserStateWithinLimit = async (
  binding: D1Database,
  userId: string,
  state: PersistedCalculatorState,
  limit: number | null,
  updatedAt = Date.now(),
): Promise<StoredCalculatorState> => {
  const repository = createCalculatorStateRepository(binding);
  if (limit === null) {
    return repository.upsertState({ ownerType: "user", ownerId: userId, state, updatedAt });
  }
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError("Saved Calculations limit must be a non-negative integer or null");
  }

  const result = await binding.prepare(`
    INSERT INTO calculator_state (
      id, owner_type, owner_id, calculator_id, calculator_version, state_json, updated_at
    )
    SELECT ?, 'user', ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1
      FROM calculator_state
      WHERE owner_type = 'user' AND owner_id = ? AND calculator_id = ?
    ) OR (
      SELECT COUNT(*)
      FROM calculator_state
      WHERE owner_type = 'user' AND owner_id = ?
    ) < ?
    ON CONFLICT(owner_type, owner_id, calculator_id) DO UPDATE SET
      calculator_version = excluded.calculator_version,
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `).bind(
    crypto.randomUUID(),
    userId,
    state.calculatorId,
    state.calculatorVersion,
    JSON.stringify(state),
    updatedAt,
    userId,
    state.calculatorId,
    userId,
    limit,
  ).run();

  if (!result.meta.changes) throw new CalculatorStateLimitError();
  const stored = await repository.getState("user", userId, state.calculatorId);
  if (!stored) throw new Error("calculator state limited upsert invariant failed");
  return stored;
};