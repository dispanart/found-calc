import { getReferenceCalculatorById } from "@found-calc/catalog";
import { notFound } from "next/navigation";

import { WidgetFrame } from "@/components/widgets/widget-frame";
import { getWidgetRouteServices } from "@/lib/widgets/route-services";
import { resolvePublicWidgetRuntime } from "@/lib/widgets/runtime";

export const dynamic = "force-dynamic";

export default async function EmbedWidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicWidgetKey: string }>;
  searchParams: Promise<{ parentOrigin?: string | string[] }>;
}) {
  const { publicWidgetKey } = await params;
  const query = await searchParams;
  const parentOrigin = Array.isArray(query.parentOrigin) ? query.parentOrigin[0] : query.parentOrigin;
  if (parentOrigin === undefined) notFound();

  const services = getWidgetRouteServices();
  const resolved = await resolvePublicWidgetRuntime({ publicWidgetKey, parentOrigin }, {
    widgets: services.widgets,
    domains: services.domains,
    access: services.access,
    mode: services.mode,
    localPorts: services.localPorts,
  });
  if (!resolved.ok) notFound();

  const entry = getReferenceCalculatorById(resolved.value.calculatorId);
  if (entry === undefined) notFound();

  return <WidgetFrame runtime={resolved.value} entry={entry} />;
}
