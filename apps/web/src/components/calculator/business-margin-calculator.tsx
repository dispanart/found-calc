"use client";

import type { ReferenceCatalogEntry } from "@found-calc/catalog";
import type { BusinessMarginInput, CalculationResult } from "@found-calc/engine";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { runBusinessMargin, runBusinessMarginScenario } from "@/lib/calculators/runtime";
import { formatCanonicalDecimal, parseLocaleDecimal } from "@/lib/presentation/decimal";
import { CalculatorField } from "./field";
import { ResultPanel } from "./result-panel";
import { TrustPanel } from "./trust-panel";
import { ValidationSummary } from "./validation-summary";

interface BusinessMarginCalculatorProps {
  locale: Locale;
  entry: ReferenceCatalogEntry;
}

const textByLocale = {
  id: {
    summary: "Periksa input berikut.",
    invalid: "Masukkan angka yang valid.",
    required: "Kolom ini wajib diisi.",
    range: "Nilai berada di luar rentang yang diizinkan.",
    result: "Hasil margin",
    scenarioField: "Skenario biaya variabel per pesanan",
    scenarioRequired: "Masukkan biaya variabel untuk skenario.",
  },
  en: {
    summary: "Check the following inputs.",
    invalid: "Enter a valid number.",
    required: "This field is required.",
    range: "The value is outside the allowed range.",
    result: "Margin result",
    scenarioField: "Scenario variable selling cost per order",
    scenarioRequired: "Enter a variable selling cost for the scenario.",
  },
} as const;

function resultValues(result: CalculationResult) {
  const seen = new Set<string>();
  return [result.primaryAnswer, ...result.sections.flatMap((section) => section.values)].filter((value) => {
    if (seen.has(value.id)) return false;
    seen.add(value.id);
    return true;
  });
}

export function BusinessMarginCalculator({ locale, entry }: BusinessMarginCalculatorProps) {
  const copy = entry.copy[locale];
  const text = textByLocale[locale];
  const [sellingPrice, setSellingPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [variableCost, setVariableCost] = useState("");
  const [scenarioVariableCost, setScenarioVariableCost] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<ReturnType<typeof runBusinessMargin> | null>(null);
  const [scenarioOutcome, setScenarioOutcome] = useState<ReturnType<typeof runBusinessMarginScenario> | null>(null);

  const buildBaselineInput = (): { input: BusinessMarginInput; errors: Record<string, string> } | { errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const parsedSelling = parseLocaleDecimal(sellingPrice, locale, 2);
    const parsedProduct = parseLocaleDecimal(productCost, locale, 2);
    const parsedVariable = variableCost.trim().length === 0 ? undefined : parseLocaleDecimal(variableCost, locale, 2);

    if (!parsedSelling.ok) errors.sellingPrice = parsedSelling.code === "empty" ? text.required : text.invalid;
    if (!parsedProduct.ok) errors.productCost = parsedProduct.code === "empty" ? text.required : text.invalid;
    if (parsedVariable !== undefined && !parsedVariable.ok) errors.variableSellingCostPerOrder = text.invalid;

    if (!parsedSelling.ok || !parsedProduct.ok || (parsedVariable !== undefined && !parsedVariable.ok)) {
      return { errors };
    }

    return {
      errors,
      input: {
        sellingPrice: parsedSelling.value,
        productCost: parsedProduct.value,
        ...(parsedVariable === undefined ? {} : { variableSellingCostPerOrder: parsedVariable.value }),
      },
    };
  };

  const applyEngineIssues = (issues: readonly { path: string; code: string }[]) => {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
      const path = issue.path.startsWith("scenario.changes.")
        ? "scenarioVariableSellingCostPerOrder"
        : issue.path;
      errors[path] = issue.code === "out-of-range" ? text.range : text.invalid;
    }
    setFieldErrors(errors);
  };

  const calculate = () => {
    const built = buildBaselineInput();
    if (!("input" in built)) {
      setFieldErrors(built.errors);
      setOutcome(null);
      setScenarioOutcome(null);
      return;
    }

    const nextOutcome = runBusinessMargin(built.input);
    if (!nextOutcome.ok) {
      applyEngineIssues(nextOutcome.issues);
      setOutcome(null);
      setScenarioOutcome(null);
      return;
    }

    setFieldErrors({});
    setOutcome(nextOutcome);
    setScenarioOutcome(null);
  };

  const runScenario = () => {
    const built = buildBaselineInput();
    const parsedScenario = parseLocaleDecimal(scenarioVariableCost, locale, 2);
    const errors = { ...built.errors };
    if (!parsedScenario.ok) {
      errors.scenarioVariableSellingCostPerOrder = parsedScenario.code === "empty" ? text.scenarioRequired : text.invalid;
    }

    if (!("input" in built) || !parsedScenario.ok) {
      setFieldErrors(errors);
      setScenarioOutcome(null);
      return;
    }

    const nextScenario = runBusinessMarginScenario(built.input, {
      id: "phase-03-ui-scenario",
      changes: { variableSellingCostPerOrder: parsedScenario.value },
    });

    if (!nextScenario.ok) {
      applyEngineIssues(nextScenario.issues);
      setScenarioOutcome(null);
      return;
    }

    setFieldErrors({});
    setScenarioOutcome(nextScenario);
  };

  const errors = Object.values(fieldErrors);

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
        <div className="space-y-5">
          <CalculatorField
            id="margin-selling-price"
            label={copy.fields.sellingPrice ?? ""}
            value={sellingPrice}
            onChange={(event) => setSellingPrice(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            error={fieldErrors.sellingPrice}
          />
          <CalculatorField
            id="margin-product-cost"
            label={copy.fields.productCost ?? ""}
            value={productCost}
            onChange={(event) => setProductCost(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            error={fieldErrors.productCost}
          />
          <CalculatorField
            id="margin-variable-cost"
            label={copy.fields.variableSellingCostPerOrder ?? ""}
            helper={copy.ui.contextualHint}
            value={variableCost}
            onChange={(event) => setVariableCost(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            error={fieldErrors.variableSellingCostPerOrder}
          />
          <Button type="button" onClick={calculate}>{copy.ui.calculate}</Button>
          <ValidationSummary title={text.summary} errors={errors} />
        </div>

        {outcome?.ok ? (
          <div className="mt-8 border-t border-border pt-7">
            <h2 className="text-lg font-bold tracking-[-0.025em]">{copy.ui.recommendationTitle}</h2>
            <div className="mt-4 space-y-4">
              <CalculatorField
                id="margin-scenario-variable-cost"
                label={text.scenarioField}
                value={scenarioVariableCost}
                onChange={(event) => setScenarioVariableCost(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                error={fieldErrors.scenarioVariableSellingCostPerOrder}
              />
              <Button type="button" variant="outline" onClick={runScenario}>{copy.ui.runScenario}</Button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="min-w-0 space-y-5">
        {outcome?.ok ? (
          <ResultPanel title={text.result}>
            <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
              {resultValues(outcome.result).map((value) => (
                <div key={value.id} className="min-w-0">
                  <dt className="text-xs font-semibold text-trust-foreground/70">{copy.results[value.id] ?? value.id}</dt>
                  <dd className="mt-1 break-words text-xl font-bold text-trust-foreground">
                    {formatCanonicalDecimal(value.value, locale, { style: value.unit === "percent" ? "percent" : "decimal" })}
                  </dd>
                </div>
              ))}
            </dl>

            {scenarioOutcome?.ok ? (
              <div className="mt-7 grid min-w-0 gap-4 border-t border-primary/15 pt-5 sm:grid-cols-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-trust-foreground/70">{copy.ui.baseline}</p>
                  <p className="mt-1 break-words text-lg font-bold">{formatCanonicalDecimal(scenarioOutcome.result.baseline.primaryAnswer.value, locale)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-trust-foreground/70">{copy.ui.scenario}</p>
                  <p className="mt-1 break-words text-lg font-bold">{formatCanonicalDecimal(scenarioOutcome.result.scenario.primaryAnswer.value, locale)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-trust-foreground/70">{copy.ui.impact}</p>
                  <p data-testid="scenario-impact" className="mt-1 break-words text-lg font-bold">
                    {formatCanonicalDecimal(scenarioOutcome.result.impact.value, locale)}
                  </p>
                </div>
              </div>
            ) : null}
          </ResultPanel>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-card/50 p-6 text-sm leading-6 text-muted-foreground">
            {locale === "id" ? "Mulai dengan harga jual dan biaya produk. Tambahkan biaya variabel saat relevan." : "Start with selling price and product cost. Add variable selling cost when it is relevant."}
          </div>
        )}

        {outcome?.ok && outcome.result.recommendations !== undefined ? (
          <TrustPanel title={locale === "id" ? "Simulasi, bukan rekomendasi bisnis" : "Simulation, not business advice"} tone="warning">
            <p>{copy.ui.demoNote}</p>
          </TrustPanel>
        ) : null}
      </div>
    </div>
  );
}
