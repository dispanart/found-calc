"use client";

import type { CalculatorCatalogEntry, ReferenceCatalogEntry } from "@found-calc/catalog";
import type { ComponentType } from "react";

import type { Locale } from "@/i18n/locales";
import type { SupportedCalculatorId } from "@/lib/widgets/defaults";
import { BusinessMarginCalculator } from "./business-margin-calculator";
import { CalculatorSurfaceProvider, type CalculatorSurfacePolicy } from "./calculator-surface";
import { DateDifferenceCalculator } from "./date-difference-calculator";
import { DiscountCalculator } from "./discount-calculator";
import { LengthConversionCalculator } from "./length-conversion-calculator";
import { PercentageCalculator } from "./percentage-calculator";
import { SyntheticRuleCalculator } from "./synthetic-rule-calculator";

type RendererProps = {
  readonly locale: Locale;
  readonly entry: CalculatorCatalogEntry;
  readonly recordId?: string | undefined;
};

const referenceRenderer = (
  Renderer: ComponentType<{
    readonly locale: Locale;
    readonly entry: ReferenceCatalogEntry;
    readonly recordId?: string | undefined;
  }>,
): ComponentType<RendererProps> => function ReferenceRenderer({ locale, entry, recordId }: RendererProps) {
  return <Renderer locale={locale} entry={entry as ReferenceCatalogEntry} recordId={recordId} />;
};

const CALCULATOR_RENDERERS: Readonly<Record<SupportedCalculatorId, ComponentType<RendererProps>>> = {
  "reference.discount": referenceRenderer(DiscountCalculator),
  "reference.business-margin": referenceRenderer(BusinessMarginCalculator),
  "reference.synthetic-rule": referenceRenderer(SyntheticRuleCalculator),
  "quick.percentage": PercentageCalculator,
  "quick.date-difference": DateDifferenceCalculator,
  "quick.length-conversion": LengthConversionCalculator,
};

export const calculatorRendererIds = Object.freeze(Object.keys(CALCULATOR_RENDERERS) as SupportedCalculatorId[]);

export function CalculatorRenderer({
  locale,
  entry,
  policy,
}: {
  readonly locale: Locale;
  readonly entry: CalculatorCatalogEntry;
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
