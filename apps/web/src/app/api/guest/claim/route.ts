import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";

import { getFoundCalcAuth } from "@/lib/auth/server";
import { handleGuestClaimRequest } from "@/lib/persistence/http";

export async function POST(request: Request) {
  try {
    const workerEnv = env as unknown as { DB: D1Database };
    return await handleGuestClaimRequest(request, { DB: workerEnv.DB, auth: getFoundCalcAuth() });
  } catch {
    return Response.json({ error: { code: "service-unavailable" } }, { status: 503 });
  }
}
