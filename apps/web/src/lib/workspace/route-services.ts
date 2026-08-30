import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";

import { getFoundCalcAuth } from "@/lib/auth/server";
import { createCommercialCapabilityAuthorizer } from "@/lib/billing/capabilities";

const database = () => (env as unknown as { DB: D1Database }).DB;

export const getWorkspaceRouteServices = () => {
  const DB = database();
  return {
    DB,
    auth: getFoundCalcAuth(),
    capabilities: createCommercialCapabilityAuthorizer(DB),
  };
};

export const workspaceRouteFailure = () =>
  Response.json(
    { error: { code: "service-unavailable" } },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );