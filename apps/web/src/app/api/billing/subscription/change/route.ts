import { handleBillingChangeRequest } from "@/lib/billing/http";
import { billingRouteFailure, getBillingChangeRouteServices } from "@/lib/billing/route-services";

export async function POST(request: Request) {
  try { return await handleBillingChangeRequest(request, getBillingChangeRouteServices()); }
  catch { return billingRouteFailure(); }
}
