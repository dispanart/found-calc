"use client";

import type { CalculatorCatalogEntry } from "@found-calc/catalog";
import { dateDifferenceCalculatorDefinition } from "@found-calc/engine";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { runDateDifference } from "@/lib/calculators/runtime";
import { readLocalDraft, writeLocalDraft, type LocalCalculatorDraft } from "@/lib/persistence/local-draft";
import type { PersistedCalculatorState } from "@/lib/persistence/state";
import { formatCanonicalDecimal } from "@/lib/presentation/decimal";
import { useCalculatorSurface } from "./calculator-surface";
import { CalculatorField } from "./field";
import { PersistenceControls } from "./persistence-controls";
import { ResultPanel } from "./result-panel";
import { ValidationSummary } from "./validation-summary";
import { WorkspaceCalculationControls } from "./workspace-calculation-controls";

interface DateDifferenceCalculatorProps {
  readonly locale: Locale;
  readonly entry: CalculatorCatalogEntry;
  readonly recordId?: string | undefined;
}

type DateDifferenceDraft = Extract<LocalCalculatorDraft, { calculatorId: "quick.date-difference" }>;

const validationCopy = {
  id: {
    summary: "Periksa tanggal berikut.",
    invalid: "Masukkan tanggal kalender yang valid.",
    result: "Jarak kalender",
    emptyResult: "Pilih tanggal mulai dan tanggal akhir untuk melihat jarak hari kalender.",
    daysSuffix: "hari",
    weeksSuffix: "minggu",
  },
  en: {
    summary: "Check the following dates.",
    invalid: "Enter a valid calendar date.",
    result: "Calendar distance",
    emptyResult: "Choose a start date and end date to see the calendar-day distance.",
    daysSuffix: "days",
    weeksSuffix: "weeks",
  },
} as const;

const subscribeClientReady = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const useClientReady = () => useSyncExternalStore(subscribeClientReady, getClientSnapshot, getServerSnapshot);

const widgetString = (value: string | readonly string[] | undefined): string =>
  typeof value === "string" ? value : "";

export function DateDifferenceCalculator(props: DateDifferenceCalculatorProps) {
  const clientReady = useClientReady();
  if (!clientReady) return null;
  return <DateDifferenceCalculatorStateful key={`${props.entry.id}:${props.locale}`} {...props} />;
}

function DateDifferenceCalculatorStateful({ locale, entry, recordId }: DateDifferenceCalculatorProps) {
  const surface = useCalculatorSurface();
  const started = useRef(false);
  const copy = entry.copy[locale];
  const text = validationCopy[locale];
  const [initialDraft] = useState<DateDifferenceDraft | null>(() => {
    if (surface.surface !== "public") return null;
    const draft = readLocalDraft("quick.date-difference");
    return draft?.calculatorId === "quick.date-difference" ? draft : null;
  });
  const widgetDefaults = surface.surface === "widget" ? surface.initialDefaults : undefined;
  const [startDate, setStartDate] = useState(() =>
    initialDraft?.fields.startDate ?? widgetString(widgetDefaults?.startDate),
  );
  const [endDate, setEndDate] = useState(() =>
    initialDraft?.fields.endDate ?? widgetString(widgetDefaults?.endDate),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<ReturnType<typeof runDateDifference> | null>(null);
  const [persistableState, setPersistableState] = useState<PersistedCalculatorState | null>(null);

  useEffect(() => {
    if (surface.surface !== "public") return;
    writeLocalDraft({
      calculatorId: "quick.date-difference",
      locale,
      fields: { startDate, endDate },
    });
  }, [endDate, locale, startDate, surface.surface]);

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
    const nextOutcome = runDateDifference({ startDate, endDate });
    if (!nextOutcome.ok) {
      const nextErrors: Record<string, string> = {};
      for (const issue of nextOutcome.issues) {
        nextErrors[issue.path] = issue.code === "invalid-date-order"
          ? (copy.ui.orderError ?? text.invalid)
          : text.invalid;
      }
      setFieldErrors(nextErrors);
      setOutcome(null);
      setPersistableState(null);
      return;
    }

    setFieldErrors({});
    setOutcome(nextOutcome);
    setPersistableState({
      calculatorId: "quick.date-difference",
      calculatorVersion: dateDifferenceCalculatorDefinition.version.version,
      input: { startDate, endDate },
    });
    if (surface.surface === "widget") surface.onLifecycleEvent?.("calculation_completed");
  };

  const loadPersisted = (state: PersistedCalculatorState) => {
    if (state.calculatorId !== "quick.date-difference") return;
    setStartDate(state.input.startDate);
    setEndDate(state.input.endDate);
    setFieldErrors({});
    setOutcome(null);
    setPersistableState(null);
  };

  const breakdown = outcome?.ok ? outcome.result.sections[0]?.values ?? [] : [];
  const weeks = breakdown.find((value) => value.id === "wholeWeeks");
  const remaining = breakdown.find((value) => value.id === "remainingDays");

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <CalculatorField
            id="date-difference-start"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            label={copy.fields.startDate ?? ""}
            value={startDate}
            onChange={(event) => { dirty(); setStartDate(event.target.value); }}
            error={fieldErrors.startDate}
          />
          <CalculatorField
            id="date-difference-end"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            label={copy.fields.endDate ?? ""}
            value={endDate}
            onChange={(event) => { dirty(); setEndDate(event.target.value); }}
            error={fieldErrors.endDate}
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy.trustBody}</p>
        <div className="mt-6">
          <Button type="button" onClick={calculate}>{copy.ui.calculate}</Button>
        </div>
        <ValidationSummary title={text.summary} errors={Object.values(fieldErrors)} />
        {surface.surface === "public" ? (
          <PersistenceControls
            locale={locale}
            calculatorId="quick.date-difference"
            state={persistableState}
            onLoad={loadPersisted}
          />
        ) : null}
        {surface.surface === "public" ? (
          <WorkspaceCalculationControls
            locale={locale}
            calculatorId="quick.date-difference"
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
              {copy.results.totalDays}
            </p>
            <p className="mt-2 break-words text-4xl font-bold tracking-[-0.05em] text-trust-foreground sm:text-5xl">
              {formatCanonicalDecimal(outcome.result.primaryAnswer.value, locale)} {text.daysSuffix}
            </p>
            {weeks !== undefined && remaining !== undefined ? (
              <div className="mt-6 border-t border-primary/15 pt-5">
                <p className="text-xs font-semibold tracking-[0.08em] text-trust-foreground/70 uppercase">
                  {copy.ui.decomposition}
                </p>
                <p className="mt-2 text-lg font-bold text-trust-foreground">
                  {formatCanonicalDecimal(weeks.value, locale)} {text.weeksSuffix} + {formatCanonicalDecimal(remaining.value, locale)} {text.daysSuffix}
                </p>
              </div>
            ) : null}
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
