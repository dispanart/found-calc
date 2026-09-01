"use client";

import type { CalculatorCatalogEntry } from "@found-calc/catalog";
import { percentageCalculatorDefinition } from "@found-calc/engine";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { runPercentage } from "@/lib/calculators/runtime";
import { readLocalDraft, writeLocalDraft, type LocalCalculatorDraft } from "@/lib/persistence/local-draft";
import type { PersistedCalculatorState } from "@/lib/persistence/state";
import { formatCanonicalDecimal, parseLocaleDecimal } from "@/lib/presentation/decimal";
import { useCalculatorSurface } from "./calculator-surface";
import { CalculatorField } from "./field";
import { PersistenceControls } from "./persistence-controls";
import { ResultPanel } from "./result-panel";
import { ValidationSummary } from "./validation-summary";
import { WorkspaceCalculationControls } from "./workspace-calculation-controls";

interface PercentageCalculatorProps {
  readonly locale: Locale;
  readonly entry: CalculatorCatalogEntry;
  readonly recordId?: string | undefined;
}

type PercentageDraft = Extract<LocalCalculatorDraft, { calculatorId: "quick.percentage" }>;

const validationCopy = {
  id: {
    summary: "Periksa input berikut.",
    invalid: "Masukkan angka yang valid.",
    required: "Kolom ini wajib diisi.",
    range: "Persentase harus berada dalam rentang yang diizinkan.",
    result: "Hasil persentase",
    emptyResult: "Isi persentase dan nilai dasar untuk melihat hasil.",
  },
  en: {
    summary: "Check the following inputs.",
    invalid: "Enter a valid number.",
    required: "This field is required.",
    range: "The percentage is outside the allowed range.",
    result: "Percentage result",
    emptyResult: "Enter a percentage and base value to see the result.",
  },
} as const;

const subscribeClientReady = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const useClientReady = () => useSyncExternalStore(subscribeClientReady, getClientSnapshot, getServerSnapshot);

const localize = (value: string, from: Locale, to: Locale, scale: number) => {
  if (from === to || value.trim().length === 0) return value;
  const parsed = parseLocaleDecimal(value, from, scale);
  return parsed.ok ? formatCanonicalDecimal(parsed.value, to) : value;
};

const formatWidgetDefault = (
  value: string | readonly string[] | undefined,
  locale: Locale,
): string => typeof value === "string" ? formatCanonicalDecimal(value, locale) : "";

export function PercentageCalculator(props: PercentageCalculatorProps) {
  const clientReady = useClientReady();
  if (!clientReady) return null;
  return <PercentageCalculatorStateful key={`${props.entry.id}:${props.locale}`} {...props} />;
}

function PercentageCalculatorStateful({ locale, entry, recordId }: PercentageCalculatorProps) {
  const surface = useCalculatorSurface();
  const started = useRef(false);
  const copy = entry.copy[locale];
  const text = validationCopy[locale];
  const [initialDraft] = useState<PercentageDraft | null>(() => {
    if (surface.surface !== "public") return null;
    const draft = readLocalDraft("quick.percentage");
    return draft?.calculatorId === "quick.percentage" ? draft : null;
  });
  const widgetDefaults = surface.surface === "widget" ? surface.initialDefaults : undefined;
  const [percentage, setPercentage] = useState(() =>
    initialDraft === null
      ? formatWidgetDefault(widgetDefaults?.percentage, locale)
      : localize(initialDraft.fields.percentage, initialDraft.locale, locale, 4),
  );
  const [baseValue, setBaseValue] = useState(() =>
    initialDraft === null
      ? formatWidgetDefault(widgetDefaults?.baseValue, locale)
      : localize(initialDraft.fields.baseValue, initialDraft.locale, locale, 6),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<ReturnType<typeof runPercentage> | null>(null);
  const [persistableState, setPersistableState] = useState<PersistedCalculatorState | null>(null);

  useEffect(() => {
    if (surface.surface !== "public") return;
    writeLocalDraft({
      calculatorId: "quick.percentage",
      locale,
      fields: { baseValue, percentage },
    });
  }, [baseValue, percentage, locale, surface.surface]);

  const signalStarted = () => {
    if (surface.surface !== "widget" || started.current) return;
    started.current = true;
    surface.onLifecycleEvent?.("calculator_started");
  };

  const dirty = () => {
    signalStarted();
    setPersistableState(null);
  };

  const calculate = () => {
    const nextErrors: Record<string, string> = {};
    const parsedPercentage = parseLocaleDecimal(percentage, locale, 4);
    const parsedBase = parseLocaleDecimal(baseValue, locale, 6);
    if (!parsedPercentage.ok) {
      nextErrors.percentage = parsedPercentage.code === "empty" ? text.required : text.invalid;
    }
    if (!parsedBase.ok) {
      nextErrors.baseValue = parsedBase.code === "empty" ? text.required : text.invalid;
    }
    if (!parsedPercentage.ok || !parsedBase.ok) {
      setFieldErrors(nextErrors);
      setOutcome(null);
      setPersistableState(null);
      return;
    }

    const nextOutcome = runPercentage({
      baseValue: parsedBase.value,
      percentage: parsedPercentage.value,
    });
    if (!nextOutcome.ok) {
      for (const issue of nextOutcome.issues) {
        nextErrors[issue.path] = issue.code === "out-of-range" ? text.range : text.invalid;
      }
      setFieldErrors(nextErrors);
      setOutcome(null);
      setPersistableState(null);
      return;
    }

    setFieldErrors({});
    setOutcome(nextOutcome);
    setPersistableState({
      calculatorId: "quick.percentage",
      calculatorVersion: percentageCalculatorDefinition.version.version,
      input: {
        baseValue: parsedBase.value,
        percentage: parsedPercentage.value,
      },
    });
    if (surface.surface === "widget") surface.onLifecycleEvent?.("calculation_completed");
  };

  const loadPersisted = (state: PersistedCalculatorState) => {
    if (state.calculatorId !== "quick.percentage") return;
    setPercentage(formatCanonicalDecimal(state.input.percentage, locale));
    setBaseValue(formatCanonicalDecimal(state.input.baseValue, locale));
    setFieldErrors({});
    setOutcome(null);
    setPersistableState(null);
  };

  const sectionValues = outcome?.ok ? outcome.result.sections.flatMap((section) => section.values) : [];

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
        <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,0.7fr)_auto_minmax(0,1fr)] sm:items-end">
          <CalculatorField
            id="percentage-value"
            label={copy.fields.percentage ?? ""}
            value={percentage}
            onChange={(event) => { dirty(); setPercentage(event.target.value); }}
            inputMode="decimal"
            autoComplete="off"
            error={fieldErrors.percentage}
          />
          <p className="pb-3 text-center text-sm font-semibold text-muted-foreground" aria-hidden="true">
            {copy.ui.sentenceJoiner}
          </p>
          <CalculatorField
            id="percentage-base-value"
            label={copy.fields.baseValue ?? ""}
            value={baseValue}
            onChange={(event) => { dirty(); setBaseValue(event.target.value); }}
            inputMode="decimal"
            autoComplete="off"
            error={fieldErrors.baseValue}
          />
        </div>
        <div className="mt-6">
          <Button type="button" onClick={calculate}>{copy.ui.calculate}</Button>
        </div>
        <ValidationSummary title={text.summary} errors={Object.values(fieldErrors)} />
        {surface.surface === "public" ? (
          <PersistenceControls
            locale={locale}
            calculatorId="quick.percentage"
            state={persistableState}
            onLoad={loadPersisted}
          />
        ) : null}
        {surface.surface === "public" ? (
          <WorkspaceCalculationControls
            locale={locale}
            calculatorId="quick.percentage"
            state={persistableState}
            onLoad={loadPersisted}
            recordId={surface.recordId ?? recordId}
          />
        ) : null}
      </section>

      <div className="min-w-0">
        {outcome?.ok ? (
          <ResultPanel title={text.result}>
            <p className="text-xs font-semibold tracking-[0.1em] text-trust-foreground/75 uppercase">
              {copy.results[outcome.result.primaryAnswer.id] ?? outcome.result.primaryAnswer.id}
            </p>
            <p className="mt-2 break-words text-4xl font-bold tracking-[-0.05em] text-trust-foreground sm:text-5xl">
              {formatCanonicalDecimal(outcome.result.primaryAnswer.value, locale)}
            </p>
            <dl className="mt-6 grid min-w-0 gap-4 border-t border-primary/15 pt-5 sm:grid-cols-2">
              {sectionValues.map((value) => (
                <div key={value.id} className="min-w-0">
                  <dt className="text-xs font-semibold text-trust-foreground/70">
                    {copy.results[value.id] ?? value.id}
                  </dt>
                  <dd className="mt-1 break-words text-lg font-bold text-trust-foreground">
                    {formatCanonicalDecimal(value.value, locale)}
                  </dd>
                </div>
              ))}
            </dl>
          </ResultPanel>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-card/50 p-6 text-sm leading-6 text-muted-foreground">
            {text.emptyResult}
          </div>
        )}
      </div>
    </div>
  );
}
