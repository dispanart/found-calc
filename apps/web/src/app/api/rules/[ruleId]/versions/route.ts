import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { handlePublishedRuleVersionsRequest } from "@/lib/rules/http";

type RouteContext = { params: Promise<{ ruleId: string }> };
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { ruleId } = await context.params;
    return await handlePublishedRuleVersionsRequest(ruleId, { DB: (env as unknown as { DB: D1Database }).DB });
  } catch {
    return Response.json({ error: { code: "service-unavailable" } }, { status: 503 });
  }
}
