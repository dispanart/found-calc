import { handleBillingCheckoutRequest } from "@/lib/billing/http";
import { billingRouteFailure, getBillingCheckoutRouteServices } from "@/lib/billing/route-services";

export async function POST(request: Request) {
  try { return await handleBillingCheckoutRequest(request, getBillingCheckoutRouteServices()); }
  catch { return billingRouteFailure(); }
}
