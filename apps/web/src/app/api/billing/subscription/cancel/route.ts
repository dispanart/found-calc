import { handleBillingCancelRequest } from "@/lib/billing/http";
import { billingRouteFailure, getBillingCancelRouteServices } from "@/lib/billing/route-services";

export async function POST(request: Request) {
  try { return await handleBillingCancelRequest(request, getBillingCancelRouteServices()); }
  catch { return billingRouteFailure(); }
}
