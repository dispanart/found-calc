"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { WidgetDefaultConfiguration } from "@/lib/widgets/defaults";

export type CalculatorSurface = "public" | "widget";
export type CalculatorLifecycleEvent = "calculator_started" | "calculation_completed" | "cta_clicked";

export interface CalculatorSurfacePolicy {
  readonly surface: CalculatorSurface;
  readonly recordId?: string;
  readonly initialDefaults?: WidgetDefaultConfiguration;
  readonly onLifecycleEvent?: (event: CalculatorLifecycleEvent) => void;
}

export const FOUND_CALC_WIDGET_LIFECYCLE_EVENT = "foundcalc:calculator-lifecycle";

const PUBLIC_CALCULATOR_SURFACE: CalculatorSurfacePolicy = { surface: "public" };
const CalculatorSurfaceContext = createContext<CalculatorSurfacePolicy>(PUBLIC_CALCULATOR_SURFACE);

export function CalculatorSurfaceProvider({
  policy,
  children,
}: {
  readonly policy: CalculatorSurfacePolicy;
  readonly children: ReactNode;
}) {
  const effectivePolicy = useMemo<CalculatorSurfacePolicy>(() => {
    if (policy.surface !== "widget" || policy.onLifecycleEvent !== undefined) return policy;
    return {
      ...policy,
      onLifecycleEvent: (event) => {
        window.dispatchEvent(new CustomEvent(FOUND_CALC_WIDGET_LIFECYCLE_EVENT, { detail: event }));
      },
    };
  }, [policy]);
  return <CalculatorSurfaceContext.Provider value={effectivePolicy}>{children}</CalculatorSurfaceContext.Provider>;
}

export const useCalculatorSurface = (): CalculatorSurfacePolicy => useContext(CalculatorSurfaceContext);
