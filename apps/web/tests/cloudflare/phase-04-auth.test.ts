import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../../migrations/0001_phase04_auth_and_calculator_state.sql?raw";

import { createFoundCalcAuth } from "../../src/lib/auth/server";

declare module "cloudflare:workers" {
  interface ProvidedEnv {
    DB: D1Database;
  }
}

beforeEach(async () => {
  await env.DB.exec("DROP TABLE IF EXISTS calculator_state; DROP TABLE IF EXISTS verification; DROP TABLE IF EXISTS account; DROP TABLE IF EXISTS session; DROP TABLE IF EXISTS user;");
  await env.DB.exec(migrationSql);
});

describe("Better Auth D1 integration", () => {
  it("creates and signs in an email/password user without storing the plaintext password", async () => {
    const auth = createFoundCalcAuth(env.DB, {
      secret: "phase-04-test-secret-that-is-long-enough-12345",
      baseURL: "http://localhost:3000",
    });

    const signedUp = await auth.api.signUpEmail({
      body: { name: "Phase Four", email: "phase4@example.com", password: "correct-horse-123" },
    });
    expect(signedUp.user.email).toBe("phase4@example.com");

    const account = await env.DB.prepare("SELECT provider_id, password FROM account WHERE user_id = ?")
      .bind(signedUp.user.id)
      .first<{ provider_id: string; password: string }>();
    expect(account?.provider_id).toBe("credential");
    expect(account?.password).not.toBe("correct-horse-123");

    const signedIn = await auth.api.signInEmail({
      body: { email: "phase4@example.com", password: "correct-horse-123" },
    });
    expect(signedIn.user.id).toBe(signedUp.user.id);
  });
});
