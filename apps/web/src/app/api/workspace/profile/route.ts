import { handleWorkspaceProfileRequest } from "@/lib/workspace/http";
import { getWorkspaceRouteServices, workspaceRouteFailure } from "@/lib/workspace/route-services";

const handle = async (method: "GET" | "PUT", request: Request) => {
  try { return await handleWorkspaceProfileRequest(method, request, getWorkspaceRouteServices()); }
  catch { return workspaceRouteFailure(); }
};
export async function GET(request: Request) { return handle("GET", request); }
export async function PUT(request: Request) { return handle("PUT", request); }
