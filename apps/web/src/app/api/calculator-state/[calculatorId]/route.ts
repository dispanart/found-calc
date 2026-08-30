import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";

import { getFoundCalcAuth } from "@/lib/auth/server";
import { createCommercialCapabilityAuthorizer } from "@/lib/billing/capabilities";
import { handleCalculatorStateRequest } from "@/lib/persistence/http";

type RouteContext = { params: Promise<{ calculatorId: string }> };
const workerEnv = () => env as unknown as { DB: D1Database };

const handle = async (method: "GET" | "PUT" | "DELETE", request: Request, context: RouteContext) => {
  try {
    const { calculatorId } = await context.params;
    const DB = workerEnv().DB;
    return await handleCalculatorStateRequest(method, request, calculatorId, {
      DB,
      auth: getFoundCalcAuth(),
      capabilities: createCommercialCapabilityAuthorizer(DB),
    });
  } catch {
    return Response.json({ error: { code: "service-unavailable" } }, { status: 503 });
  }
};

export async function GET(request: Request, context: RouteContext) { return handle("GET", request, context); }
export async function PUT(request: Request, context: RouteContext) { return handle("PUT", request, context); }
export async function DELETE(request: Request, context: RouteContext) { return handle("DELETE", request, context); }