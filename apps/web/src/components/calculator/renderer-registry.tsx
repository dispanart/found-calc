"use client";

import type { ReferenceCatalogEntry } from "@found-calc/catalog";
import type { ComponentType } from "react";

import type { Locale } from "@/i18n/locales";
import type { SupportedCalculatorId } from "@/lib/widgets/defaults";
import { BusinessMarginCalculator } from "./business-margin-calculator";
import { CalculatorSurfaceProvider, type CalculatorSurfacePolicy } from "./calculator-surface";
import { DiscountCalculator } from "./discount-calculator";
import { SyntheticRuleCalculator } from "./synthetic-rule-calculator";

type RendererProps = {
  readonly locale: Locale;
  readonly entry: ReferenceCatalogEntry;
  readonly recordId?: string | undefined;
};

const CALCULATOR_RENDERERS: Readonly<Record<SupportedCalculatorId, ComponentType<RendererProps>>> = {
  "reference.discount": DiscountCalculator,
  "reference.business-margin": BusinessMarginCalculator,
  "reference.synthetic-rule": SyntheticRuleCalculator,
};

export const calculatorRendererIds = Object.freeze(Object.keys(CALCULATOR_RENDERERS) as SupportedCalculatorId[]);

export function CalculatorRenderer({
  locale,
  entry,
  policy,
}: {
  readonly locale: Locale;
  readonly entry: ReferenceCatalogEntry;
  readonly policy: CalculatorSurfacePolicy;
}) {
  const Renderer = CALCULATOR_RENDERERS[entry.id as SupportedCalculatorId];
  if (Renderer === undefined) return null;
  return (
    <CalculatorSurfaceProvider policy={policy}>
      <Renderer locale={locale} entry={entry} recordId={policy.recordId} />
    </CalculatorSurfaceProvider>
  );
}
