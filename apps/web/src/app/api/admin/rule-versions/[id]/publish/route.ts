import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { getConfiguredAdminUserIds, getFoundCalcAuth } from "@/lib/auth/server";
import { handleAdminRulePublishRequest } from "@/lib/rules/http";

type RouteContext = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return await handleAdminRulePublishRequest(request, id, {
      DB: (env as unknown as { DB: D1Database }).DB,
      auth: getFoundCalcAuth(),
      adminUserIds: getConfiguredAdminUserIds(),
    });
  } catch {
    return Response.json({ error: { code: "service-unavailable" } }, { status: 503 });
  }
}
