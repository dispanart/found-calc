"use client";

import { useEffect } from "react";

import {
  FOUND_CALC_WIDGET_LIFECYCLE_EVENT,
  type CalculatorLifecycleEvent,
} from "@/components/calculator/calculator-surface";
import type { WidgetEventType } from "@/lib/widgets/contracts";
import type { ResolvedWidgetRuntime } from "@/lib/widgets/runtime";

const clampHeight = (height: number) => Math.min(4000, Math.max(160, Math.ceil(height)));

const sendAnalytics = (runtime: ResolvedWidgetRuntime, eventType: WidgetEventType) => {
  const body = JSON.stringify({
    schemaVersion: 1,
    eventType,
    widgetKey: runtime.publicWidgetKey,
    parentOrigin: runtime.parentOrigin,
  });
  void fetch(`/api/embed/${encodeURIComponent(runtime.publicWidgetKey)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
};

export function WidgetLifecycle({ runtime }: { runtime: ResolvedWidgetRuntime }) {
  useEffect(() => {
    const target = window.parent;
    target.postMessage({
      type: "foundcalc:ready",
      protocolVersion: 1,
      widgetKey: runtime.publicWidgetKey,
    }, runtime.parentOrigin);
    sendAnalytics(runtime, "widget_viewed");

    const onCalculatorLifecycle = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const eventType = event.detail as CalculatorLifecycleEvent;
      if (eventType === "calculator_started" || eventType === "calculation_completed" || eventType === "cta_clicked") {
        sendAnalytics(runtime, eventType);
      }
    };
    window.addEventListener(FOUND_CALC_WIDGET_LIFECYCLE_EVENT, onCalculatorLifecycle);

    let frame = 0;
    let lastHeight = 0;
    const sendHeight = () => {
      frame = 0;
      const heightPx = clampHeight(document.documentElement.getBoundingClientRect().height);
      if (heightPx === lastHeight) return;
      lastHeight = heightPx;
      target.postMessage({
        type: "foundcalc:resize",
        protocolVersion: 1,
        widgetKey: runtime.publicWidgetKey,
        heightPx,
      }, runtime.parentOrigin);
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(sendHeight);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    schedule();
    return () => {
      window.removeEventListener(FOUND_CALC_WIDGET_LIFECYCLE_EVENT, onCalculatorLifecycle);
      observer.disconnect();
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [runtime]);

  return null;
}
