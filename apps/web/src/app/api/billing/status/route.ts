import { handleBillingStatusRequest } from "@/lib/billing/http";
import { billingRouteFailure, getBillingStatusRouteServices } from "@/lib/billing/route-services";

export async function GET(request: Request) {
  try { return await handleBillingStatusRequest(request, getBillingStatusRouteServices()); }
  catch { return billingRouteFailure(); }
}
