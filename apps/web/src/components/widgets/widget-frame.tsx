import type { CalculatorCatalogEntry } from "@found-calc/catalog";

import { CalculatorRenderer } from "@/components/calculator/renderer-registry";
import type { ResolvedWidgetRuntime } from "@/lib/widgets/runtime";
import { WidgetLifecycle } from "./widget-lifecycle";

const publicAppOrigin = () => {
  const configured = process.env.PUBLIC_APP_ORIGIN?.trim();
  if (!configured) return "https://foundcalc.example";
  try { return new URL(configured).origin; } catch { return "https://foundcalc.example"; }
};

export function WidgetFrame({ runtime, entry, lifecycleEnabled = true }: {
  runtime: ResolvedWidgetRuntime;
  entry: CalculatorCatalogEntry;
  lifecycleEnabled?: boolean;
}) {
  const copy = entry.copy[runtime.locale];
  const titleClassName = runtime.theme.showTitle ? "text-2xl font-bold tracking-[-0.035em] text-foreground sm:text-3xl" : "sr-only";
  return <main className="foundcalc-widget min-h-dvh bg-background text-foreground" data-widget-appearance={runtime.theme.appearance} data-widget-accent={runtime.theme.accent} data-widget-density={runtime.theme.density} data-widget-radius={runtime.theme.radiusPreset} aria-labelledby="foundcalc-widget-title"><div className="foundcalc-widget__inner mx-auto w-full max-w-5xl"><header className="mb-5"><h1 id="foundcalc-widget-title" className={titleClassName}>{copy.title}</h1>{runtime.theme.showTitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.description}</p> : null}</header><CalculatorRenderer locale={runtime.locale} entry={entry} policy={{ surface: "widget", initialDefaults: runtime.defaults }} />{runtime.branding === "foundcalc" ? <footer className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground"><a href={publicAppOrigin()} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-border underline-offset-4 hover:text-foreground">Powered by Found Calc</a></footer> : null}</div>{lifecycleEnabled ? <WidgetLifecycle runtime={runtime} /> : null}</main>;
}
