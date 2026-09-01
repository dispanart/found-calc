"use client";

import type { CalculatorCatalogEntry } from "@found-calc/catalog";
import {
  LENGTH_UNITS,
  isLengthUnit,
  lengthConversionCalculatorDefinition,
  type LengthUnit,
} from "@found-calc/engine";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { runLengthConversion } from "@/lib/calculators/runtime";
import { readLocalDraft, writeLocalDraft, type LocalCalculatorDraft } from "@/lib/persistence/local-draft";
import type { PersistedCalculatorState } from "@/lib/persistence/state";
import { formatCanonicalDecimal, parseLocaleDecimal } from "@/lib/presentation/decimal";
import { useCalculatorSurface } from "./calculator-surface";
import { CalculatorField } from "./field";
import { PersistenceControls } from "./persistence-controls";
import { ResultPanel } from "./result-panel";
import { ValidationSummary } from "./validation-summary";
import { WorkspaceCalculationControls } from "./workspace-calculation-controls";

interface LengthConversionCalculatorProps {
  readonly locale: Locale;
  readonly entry: CalculatorCatalogEntry;
  readonly recordId?: string | undefined;
}

type LengthConversionDraft = Extract<LocalCalculatorDraft, { calculatorId: "quick.length-conversion" }>;

const validationCopy = {
  id: {
    summary: "Periksa nilai dan unit berikut.",
    invalid: "Masukkan nilai yang valid.",
    range: "Nilai panjang tidak boleh negatif.",
    unit: "Pilih unit yang tersedia.",
    result: "Hasil konversi",
    emptyResult: "Masukkan panjang, pilih dua unit, lalu konversi.",
  },
  en: {
    summary: "Check the value and units below.",
    invalid: "Enter a valid value.",
    range: "Length cannot be negative.",
    unit: "Choose one of the available units.",
    result: "Conversion result",
    emptyResult: "Enter a length, choose two units, then convert.",
  },
} as const;

const unitLabels: Readonly<Record<Locale, Readonly<Record<LengthUnit, string>>>> = {
  id: {
    mm: "Milimeter (mm)",
    cm: "Sentimeter (cm)",
    m: "Meter (m)",
    km: "Kilometer (km)",
    in: "Inci (in)",
    ft: "Kaki (ft)",
    yd: "Yard (yd)",
    mi: "Mil (mi)",
  },
  en: {
    mm: "Millimetres (mm)",
    cm: "Centimetres (cm)",
    m: "Metres (m)",
    km: "Kilometres (km)",
    in: "Inches (in)",
    ft: "Feet (ft)",
    yd: "Yards (yd)",
    mi: "Miles (mi)",
  },
};

const subscribeClientReady = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const useClientReady = () => useSyncExternalStore(subscribeClientReady, getClientSnapshot, getServerSnapshot);

const localize = (value: string, from: Locale, to: Locale) => {
  if (from === to || value.trim().length === 0) return value;
  const parsed = parseLocaleDecimal(value, from, 6);
  return parsed.ok ? formatCanonicalDecimal(parsed.value, to) : value;
};

const widgetString = (value: string | readonly string[] | undefined): string | undefined =>
  typeof value === "string" ? value : undefined;

const initialUnit = (value: string | undefined, fallback: LengthUnit): LengthUnit =>
  isLengthUnit(value) ? value : fallback;

export function LengthConversionCalculator(props: LengthConversionCalculatorProps) {
  const clientReady = useClientReady();
  if (!clientReady) return null;
  return <LengthConversionCalculatorStateful key={`${props.entry.id}:${props.locale}`} {...props} />;
}

function LengthConversionCalculatorStateful({ locale, entry, recordId }: LengthConversionCalculatorProps) {
  const surface = useCalculatorSurface();
  const started = useRef(false);
  const copy = entry.copy[locale];
  const text = validationCopy[locale];
  const [initialDraft] = useState<LengthConversionDraft | null>(() => {
    if (surface.surface !== "public") return null;
    const draft = readLocalDraft("quick.length-conversion");
    return draft?.calculatorId === "quick.length-conversion" ? draft : null;
  });
  const widgetDefaults = surface.surface === "widget" ? surface.initialDefaults : undefined;
  const [value, setValue] = useState(() => {
    if (initialDraft !== null) return localize(initialDraft.fields.value, initialDraft.locale, locale);
    const canonical = widgetString(widgetDefaults?.value);
    return canonical === undefined ? "" : formatCanonicalDecimal(canonical, locale);
  });
  const [fromUnit, setFromUnit] = useState<LengthUnit>(() =>
    initialUnit(initialDraft?.fields.fromUnit ?? widgetString(widgetDefaults?.fromUnit), "m"),
  );
  const [toUnit, setToUnit] = useState<LengthUnit>(() =>
    initialUnit(initialDraft?.fields.toUnit ?? widgetString(widgetDefaults?.toUnit), "cm"),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<ReturnType<typeof runLengthConversion> | null>(null);
  const [persistableState, setPersistableState] = useState<PersistedCalculatorState | null>(null);

  useEffect(() => {
    if (surface.surface !== "public") return;
    writeLocalDraft({
      calculatorId: "quick.length-conversion",
      locale,
      fields: { value, fromUnit, toUnit },
    });
  }, [fromUnit, locale, surface.surface, toUnit, value]);

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
    const parsed = parseLocaleDecimal(value, locale, 6);
    if (!parsed.ok) {
      setFieldErrors({ value: text.invalid });
      setOutcome(null);
      setPersistableState(null);
      return;
    }

    const nextOutcome = runLengthConversion({ value: parsed.value, fromUnit, toUnit });
    if (!nextOutcome.ok) {
      const nextErrors: Record<string, string> = {};
      for (const issue of nextOutcome.issues) {
        nextErrors[issue.path] = issue.path === "value"
          ? (issue.code === "out-of-range" ? text.range : text.invalid)
          : text.unit;
      }
      setFieldErrors(nextErrors);
      setOutcome(null);
      setPersistableState(null);
      return;
    }

    setFieldErrors({});
    setOutcome(nextOutcome);
    setPersistableState({
      calculatorId: "quick.length-conversion",
      calculatorVersion: lengthConversionCalculatorDefinition.version.version,
      input: { value: parsed.value, fromUnit, toUnit },
    });
    if (surface.surface === "widget") surface.onLifecycleEvent?.("calculation_completed");
  };

  const swapUnits = () => {
    dirty();
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setOutcome(null);
  };

  const loadPersisted = (state: PersistedCalculatorState) => {
    if (
      state.calculatorId !== "quick.length-conversion" ||
      !isLengthUnit(state.input.fromUnit) ||
      !isLengthUnit(state.input.toUnit)
    ) return;
    setValue(formatCanonicalDecimal(state.input.value, locale));
    setFromUnit(state.input.fromUnit);
    setToUnit(state.input.toUnit);
    setFieldErrors({});
    setOutcome(null);
    setPersistableState(null);
  };

  const selectClass = "mt-2 min-h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25";

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
      <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
        <CalculatorField
          id="length-value"
          label={copy.fields.value ?? ""}
          value={value}
          onChange={(event) => { dirty(); setValue(event.target.value); }}
          inputMode="decimal"
          autoComplete="off"
          error={fieldErrors.value}
        />

        <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
          <div className="min-w-0">
            <label htmlFor="length-from-unit" className="block text-sm font-semibold text-foreground">
              {copy.fields.fromUnit}
            </label>
            <select
              id="length-from-unit"
              className={selectClass}
              value={fromUnit}
              onChange={(event) => {
                if (!isLengthUnit(event.target.value)) return;
                dirty();
                setFromUnit(event.target.value);
              }}
            >
              {LENGTH_UNITS.map((unit) => <option key={unit} value={unit}>{unitLabels[locale][unit]}</option>)}
            </select>
          </div>

          <Button type="button" variant="outline" onClick={swapUnits} className="mb-0.5" aria-label={copy.ui.swap}>
            ↔ <span className="sr-only">{copy.ui.swap}</span>
          </Button>

          <div className="min-w-0">
            <label htmlFor="length-to-unit" className="block text-sm font-semibold text-foreground">
              {copy.fields.toUnit}
            </label>
            <select
              id="length-to-unit"
              className={selectClass}
              value={toUnit}
              onChange={(event) => {
                if (!isLengthUnit(event.target.value)) return;
                dirty();
                setToUnit(event.target.value);
              }}
            >
              {LENGTH_UNITS.map((unit) => <option key={unit} value={unit}>{unitLabels[locale][unit]}</option>)}
            </select>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy.ui.exactBasis}</p>
        <div className="mt-6">
          <Button type="button" onClick={calculate}>{copy.ui.calculate}</Button>
        </div>
        <ValidationSummary title={text.summary} errors={Object.values(fieldErrors)} />
        {surface.surface === "public" ? (
          <PersistenceControls
            locale={locale}
            calculatorId="quick.length-conversion"
            state={persistableState}
            onLoad={loadPersisted}
          />
        ) : null}
        {surface.surface === "public" ? (
          <WorkspaceCalculationControls
            locale={locale}
            calculatorId="quick.length-conversion"
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
              {copy.results.convertedValue}
            </p>
            <p className="mt-2 break-words text-4xl font-bold tracking-[-0.05em] text-trust-foreground sm:text-5xl">
              {formatCanonicalDecimal(outcome.result.primaryAnswer.value, locale)} {toUnit}
            </p>
            <p className="mt-4 text-sm leading-6 text-trust-foreground/75">
              {formatCanonicalDecimal(outcome.result.normalizedInputs.value as string, locale)} {fromUnit} → {toUnit}
            </p>
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
