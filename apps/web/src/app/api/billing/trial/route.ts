import { handleBestiesTrialRequest } from "@/lib/billing/trial-http";
import { billingRouteFailure, getBillingTrialRouteServices } from "@/lib/billing/route-services";

export async function POST(request: Request) {
  try { return await handleBestiesTrialRequest(request, getBillingTrialRouteServices()); }
  catch { return billingRouteFailure(); }
}
