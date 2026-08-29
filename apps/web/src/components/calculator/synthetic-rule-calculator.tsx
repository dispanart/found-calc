"use client";

import type { ReferenceCatalogEntry } from "@found-calc/catalog";
import { syntheticRuleCalculatorDefinition } from "@found-calc/engine";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { runSyntheticRule } from "@/lib/calculators/runtime";
import { readLocalDraft, writeLocalDraft, type LocalCalculatorDraft } from "@/lib/persistence/local-draft";
import type { PersistedCalculatorState } from "@/lib/persistence/state";
import { formatCanonicalDecimal, parseLocaleDecimal } from "@/lib/presentation/decimal";
import {
  fetchPublishedRuleVersions,
  type PublishedSyntheticRuleVersion,
} from "@/lib/rules/client";
import { SYNTHETIC_RATE_RULE_ID } from "@/lib/rules/payload";
import { CalculatorField } from "./field";
import { PersistenceControls } from "./persistence-controls";
import { ResultPanel } from "./result-panel";
import { TrustPanel } from "./trust-panel";
import { ValidationSummary } from "./validation-summary";

interface SyntheticRuleCalculatorProps { locale: Locale; entry: ReferenceCatalogEntry; }
type SyntheticDraft = Extract<LocalCalculatorDraft, { calculatorId: "reference.synthetic-rule" }>;
type RuleFeedStatus = "loading" | "ready" | "error";

const textByLocale = {
  id: {
    summary: "Periksa input berikut.",
    required: "Kolom ini wajib diisi.",
    invalidNumber: "Masukkan angka yang valid.",
    range: "Nilai berada di luar rentang yang diizinkan.",
    invalidDate: "Masukkan tanggal efektif yang valid.",
    unavailable: "Tidak ada versi aturan terpublikasi untuk tanggal efektif ini.",
    ambiguous: "Tanggal efektif ini cocok dengan lebih dari satu versi aturan terpublikasi.",
    result: "Hasil referensi aturan",
    ongoing: "dan setelahnya",
    ruleFeedLoading: "Memuat versi aturan terpublikasi…",
    ruleFeedUnavailable: "Versi aturan terpublikasi sedang tidak tersedia. Perhitungan referensi dinonaktifkan sampai data dapat dimuat.",
    readyHint: "Masukkan nilai dasar dan tanggal efektif untuk memilih versi aturan terpublikasi secara eksplisit.",
  },
  en: {
    summary: "Check the following inputs.",
    required: "This field is required.",
    invalidNumber: "Enter a valid number.",
    range: "The value is outside the allowed range.",
    invalidDate: "Enter a valid effective date.",
    unavailable: "No published rule version is available for this effective date.",
    ambiguous: "This effective date matches more than one published rule version.",
    result: "Rule reference result",
    ongoing: "and later",
    ruleFeedLoading: "Loading published rule versions…",
    ruleFeedUnavailable: "Published rule versions are currently unavailable. Reference calculation is disabled until the data can be loaded.",
    readyHint: "Enter a base amount and effective date to select a published rule version explicitly.",
  },
} as const;

const localize = (value: string, from: Locale, to: Locale) => {
  if (from === to) return value;
  const parsed = parseLocaleDecimal(value, from, 2);
  return parsed.ok ? formatCanonicalDecimal(parsed.value, to) : value;
};

const subscribeClientReady = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useClientReady() {
  return useSyncExternalStore(subscribeClientReady, getClientSnapshot, getServerSnapshot);
}

export function SyntheticRuleCalculator({ locale, entry }: SyntheticRuleCalculatorProps) {
  const clientReady = useClientReady();
  if (!clientReady) return null;
  return <SyntheticRuleCalculatorStateful key={`${entry.id}:${locale}`} locale={locale} entry={entry} />;
}

function SyntheticRuleCalculatorStateful({ locale, entry }: SyntheticRuleCalculatorProps) {
  const copy = entry.copy[locale];
  const text = textByLocale[locale];
  const [initialDraft] = useState<SyntheticDraft | null>(() => {
    const draft = readLocalDraft("reference.synthetic-rule");
    return draft?.calculatorId === "reference.synthetic-rule" ? draft : null;
  });
  const [baseAmount, setBaseAmount] = useState(() =>
    initialDraft === null ? "" : localize(initialDraft.fields.baseAmount, initialDraft.locale, locale),
  );
  const [effectiveDate, setEffectiveDate] = useState(() => initialDraft?.fields.effectiveDate ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ruleVersions, setRuleVersions] = useState<readonly PublishedSyntheticRuleVersion[]>([]);
  const [ruleFeedStatus, setRuleFeedStatus] = useState<RuleFeedStatus>("loading");
  const [outcome, setOutcome] = useState<ReturnType<typeof runSyntheticRule> | null>(null);
  const [persistableState, setPersistableState] = useState<PersistedCalculatorState | null>(null);

  useEffect(() => {
    writeLocalDraft({ calculatorId: "reference.synthetic-rule", locale, fields: { baseAmount, effectiveDate } });
  }, [baseAmount, effectiveDate, locale]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPublishedRuleVersions(SYNTHETIC_RATE_RULE_ID, controller.signal)
      .then((versions) => {
        setRuleVersions(versions);
        setRuleFeedStatus("ready");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setRuleVersions([]);
        setRuleFeedStatus("error");
      });
    return () => controller.abort();
  }, []);

  const dirty = () => setPersistableState(null);
  const calculate = () => {
    const errors: Record<string, string> = {};
    const parsedBase = parseLocaleDecimal(baseAmount, locale, 2);
    if (!parsedBase.ok) errors.baseAmount = parsedBase.code === "empty" ? text.required : text.invalidNumber;
    if (effectiveDate.trim().length === 0) errors.effectiveDate = text.required;
    if (ruleFeedStatus !== "ready") errors.effectiveDate = text.ruleFeedUnavailable;
    if (!parsedBase.ok || effectiveDate.trim().length === 0 || ruleFeedStatus !== "ready") {
      setFieldErrors(errors);
      setOutcome(null);
      setPersistableState(null);
      return;
    }

    const nextOutcome = runSyntheticRule({ baseAmount: parsedBase.value, effectiveDate }, ruleVersions);
    if (!nextOutcome.ok) {
      for (const issue of nextOutcome.issues) {
        if (issue.path === "baseAmount") {
          errors.baseAmount = issue.code === "out-of-range" ? text.range : text.invalidNumber;
          continue;
        }
        if (issue.path === "effectiveDate") {
          errors.effectiveDate = issue.code === "invalid-effective-date"
            ? text.invalidDate
            : issue.code === "rule-unavailable"
              ? text.unavailable
              : issue.code === "rule-ambiguous"
                ? text.ambiguous
                : text.invalidDate;
          continue;
        }
        errors.effectiveDate = text.unavailable;
      }
      setFieldErrors(errors);
      setOutcome(null);
      setPersistableState(null);
      return;
    }

    setFieldErrors({});
    setOutcome(nextOutcome);
    setPersistableState({
      calculatorId: "reference.synthetic-rule",
      calculatorVersion: syntheticRuleCalculatorDefinition.version.version,
      input: { baseAmount: parsedBase.value, effectiveDate },
    });
  };

  const loadPersisted = (state: PersistedCalculatorState) => {
    if (state.calculatorId !== "reference.synthetic-rule") return;
    setBaseAmount(formatCanonicalDecimal(state.input.baseAmount, locale));
    setEffectiveDate(state.input.effectiveDate);
    setFieldErrors({});
    setOutcome(null);
    setPersistableState(null);
  };

  const dependency = outcome?.ok ? outcome.result.ruleDependencies?.[0] : undefined;
  const errorList = Object.values(fieldErrors);
  const emptyState = ruleFeedStatus === "loading"
    ? text.ruleFeedLoading
    : ruleFeedStatus === "error"
      ? text.ruleFeedUnavailable
      : text.readyHint;

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
        <TrustPanel title={copy.trustTitle} tone="warning"><p>{copy.ui.warning}</p></TrustPanel>
        <div className="mt-6 space-y-5">
          {ruleFeedStatus !== "ready" ? (
            <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground" role={ruleFeedStatus === "error" ? "alert" : "status"}>
              {ruleFeedStatus === "error" ? text.ruleFeedUnavailable : text.ruleFeedLoading}
            </p>
          ) : null}
          <CalculatorField id="synthetic-base-amount" label={copy.fields.baseAmount ?? ""} value={baseAmount} onChange={(event) => { dirty(); setBaseAmount(event.target.value); }} inputMode="decimal" autoComplete="off" error={fieldErrors.baseAmount} />
          <CalculatorField id="synthetic-effective-date" label={copy.fields.effectiveDate ?? ""} type="date" value={effectiveDate} onChange={(event) => { dirty(); setEffectiveDate(event.target.value); }} autoComplete="off" error={fieldErrors.effectiveDate} />
          <Button type="button" onClick={calculate} disabled={ruleFeedStatus !== "ready"}>{copy.ui.calculate}</Button>
          <ValidationSummary title={text.summary} errors={errorList} />
        </div>
        <PersistenceControls locale={locale} calculatorId="reference.synthetic-rule" state={persistableState} onLoad={loadPersisted} />
      </section>
      <div className="min-w-0 space-y-5">
        {outcome?.ok && dependency !== undefined ? (
          <ResultPanel title={text.result}>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.1em] text-trust-foreground/75 uppercase">{copy.results[outcome.result.primaryAnswer.id] ?? outcome.result.primaryAnswer.id}</p>
              <p className="mt-2 break-words text-4xl font-bold tracking-[-0.05em] text-trust-foreground sm:text-5xl">{formatCanonicalDecimal(outcome.result.primaryAnswer.value, locale)}</p>
            </div>
            <div className="mt-7 border-t border-primary/15 pt-5">
              <h2 className="text-sm font-bold text-trust-foreground">{copy.ui.provenanceTitle}</h2>
              <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                <div><dt className="text-xs font-semibold text-trust-foreground/70">{copy.results.versionId}</dt><dd className="mt-1 break-words font-bold text-trust-foreground">{dependency.versionId}</dd></div>
                <div><dt className="text-xs font-semibold text-trust-foreground/70">{copy.results.effectivePeriod}</dt><dd className="mt-1 break-words font-bold text-trust-foreground">{dependency.effectiveFrom} {dependency.effectiveUntil === undefined ? text.ongoing : `to ${dependency.effectiveUntil}`}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-semibold text-trust-foreground/70">{copy.results.sourceId}</dt><dd className="mt-1 break-words font-bold text-trust-foreground">{dependency.provenance.sourceId}</dd></div>
              </dl>
            </div>
          </ResultPanel>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-card/50 p-6 text-sm leading-6 text-muted-foreground">{emptyState}</div>
        )}
      </div>
    </div>
  );
}
