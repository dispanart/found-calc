import { handleWorkspaceGoalsRequest } from "@/lib/workspace/http";
import { getWorkspaceRouteServices, workspaceRouteFailure } from "@/lib/workspace/route-services";

const handle = async (method: "GET" | "POST", request: Request) => {
  try { return await handleWorkspaceGoalsRequest(method, request, getWorkspaceRouteServices()); }
  catch { return workspaceRouteFailure(); }
};
export async function GET(request: Request) { return handle("GET", request); }
export async function POST(request: Request) { return handle("POST", request); }
