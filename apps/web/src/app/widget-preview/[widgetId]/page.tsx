import { getCalculatorById } from "@found-calc/catalog";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { WidgetFrame } from "@/components/widgets/widget-frame";
import { getWidgetRouteServices } from "@/lib/widgets/route-services";
import { resolveWidgetPreviewRuntime } from "@/lib/widgets/runtime";

export default async function WidgetPreviewPage({ params }: { params: Promise<{ widgetId: string }> }) {
  const { widgetId } = await params;
  const services = getWidgetRouteServices();
  const session = await services.auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) notFound();
  const runtime = await resolveWidgetPreviewRuntime({ widgetId, ownerUserId: session.user.id }, services);
  if (!runtime) notFound();
  const entry = getCalculatorById(runtime.calculatorId);
  if (!entry) notFound();
  return <WidgetFrame runtime={runtime} entry={entry} lifecycleEnabled={false} />;
}
