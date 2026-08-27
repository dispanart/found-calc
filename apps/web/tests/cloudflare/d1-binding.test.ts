import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

declare module "cloudflare:workers" {
  interface ProvidedEnv {
    DB: D1Database;
  }
}

describe("D1 binding", () => {
  it("executes SQL in the local Workers runtime", async () => {
    const row = await env.DB.prepare("SELECT 1 AS value").first<{ value: number }>();

    expect(row?.value).toBe(1);
  });
});
