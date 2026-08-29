import { handleBillingWebhookRequest } from "@/lib/billing/http";
import { billingRouteFailure, getBillingWebhookRouteServices } from "@/lib/billing/route-services";

export async function POST(request: Request) {
  try { return await handleBillingWebhookRequest(request, getBillingWebhookRouteServices()); }
  catch { return billingRouteFailure(); }
}
