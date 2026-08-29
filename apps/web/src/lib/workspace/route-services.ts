import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";

import { getFoundCalcAuth } from "@/lib/auth/server";

export const getWorkspaceRouteServices = () => ({
  DB: (env as unknown as { DB: D1Database }).DB,
  auth: getFoundCalcAuth(),
});

export const workspaceRouteFailure = () =>
  Response.json(
    { error: { code: "service-unavailable" } },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
