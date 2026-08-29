import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";
import { getConfiguredAdminUserIds, getFoundCalcAuth } from "@/lib/auth/server";
import { handleAdminRuleVersionsRequest } from "@/lib/rules/http";

const services = () => ({
  DB: (env as unknown as { DB: D1Database }).DB,
  auth: getFoundCalcAuth(),
  adminUserIds: getConfiguredAdminUserIds(),
});
export async function GET(request: Request) { return handleAdminRuleVersionsRequest("GET", request, services()); }
export async function POST(request: Request) { return handleAdminRuleVersionsRequest("POST", request, services()); }
