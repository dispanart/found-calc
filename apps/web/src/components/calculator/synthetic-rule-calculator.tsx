"use client";

import type { ReferenceCatalogEntry } from "@found-calc/catalog";
import { syntheticRuleCalculatorDefinition } from "@found-calc/engine";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { runSyntheticRule } from "@/lib/calculators/runtime";
import { readLocalDraft, writeLocalDraft, type LocalCalculatorDraft } from "@/lib/persistence/local-draft";
import type { PersistedCalculatorState } from "@/lib/persistence/state";
import { formatCanonicalDecimal, parseLocaleDecimal } from "@/lib/presentation/decimal";
import { CalculatorField } from "./field";
import { PersistenceControls } from "./persistence-controls";
import { ResultPanel } from "./result-panel";
import { TrustPanel } from "./trust-panel";
import { ValidationSummary } from "./validation-summary";

interface SyntheticRuleCalculatorProps { locale: Locale; entry: ReferenceCatalogEntry; }
type SyntheticDraft = Extract<LocalCalculatorDraft, { calculatorId: "reference.synthetic-rule" }>;
const textByLocale = {
  id: { summary: "Periksa input berikut.", required: "Kolom ini wajib diisi.", invalidNumber: "Masukkan angka yang valid.", range: "Nilai berada di luar rentang yang diizinkan.", invalidDate: "Masukkan tanggal efektif yang valid.", unavailable: "Tidak ada fixture sintetis untuk tanggal efektif ini.", ambiguous: "Tanggal efektif ini cocok dengan lebih dari satu fixture sintetis.", result: "Hasil referensi aturan", ongoing: "dan setelahnya" },
  en: { summary: "Check the following inputs.", required: "This field is required.", invalidNumber: "Enter a valid number.", range: "The value is outside the allowed range.", invalidDate: "Enter a valid effective date.", unavailable: "No synthetic fixture is available for this effective date.", ambiguous: "This effective date matches more than one synthetic fixture.", result: "Rule reference result", ongoing: "and later" },
} as const;
const localize = (value: string, from: Locale, to: Locale) => {
  if (from === to) return value;
  const parsed = parseLocaleDecimal(value, from, 2);
  return parsed.ok ? formatCanonicalDecimal(parsed.value, to) : value;
};

const SERVER_DRAFT_SNAPSHOT = "server";
const subscribeLocalDraft = () => () => {};
const getServerDraftSnapshot = () => SERVER_DRAFT_SNAPSHOT;

function useLocalDraftSeed(calculatorId: "reference.synthetic-rule") {
  const getSnapshot = useCallback(() => {
    const draft = readLocalDraft(calculatorId);
    return draft === null ? "client:null" : `client:${JSON.stringify(draft)}`;
  }, [calculatorId]);
  const snapshot = useSyncExternalStore(subscribeLocalDraft, getSnapshot, getServerDraftSnapshot);
  if (snapshot === SERVER_DRAFT_SNAPSHOT) return { ready: false, draft: null as SyntheticDraft | null };
  if (snapshot === "client:null") return { ready: true, draft: null as SyntheticDraft | null };
  const parsed = JSON.parse(snapshot.slice("client:".length)) as LocalCalculatorDraft;
  return { ready: true, draft: parsed.calculatorId === calculatorId ? parsed as SyntheticDraft : null };
}

export function SyntheticRuleCalculator({ locale, entry }: SyntheticRuleCalculatorProps) {
  const seed = useLocalDraftSeed("reference.synthetic-rule");
  return <SyntheticRuleCalculatorStateful key={`${entry.id}:${locale}:${seed.ready ? "client" : "server"}`} locale={locale} entry={entry} initialDraft={seed.draft} localDraftReady={seed.ready} />;
}

function SyntheticRuleCalculatorStateful({ locale, entry, initialDraft, localDraftReady }: SyntheticRuleCalculatorProps & { initialDraft: SyntheticDraft | null; localDraftReady: boolean }) {
  const copy = entry.copy[locale]; const text = textByLocale[locale];
  const [baseAmount, setBaseAmount] = useState(() => initialDraft === null ? "" : localize(initialDraft.fields.baseAmount, initialDraft.locale, locale));
  const [effectiveDate, setEffectiveDate] = useState(() => initialDraft?.fields.effectiveDate ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}); const [outcome, setOutcome] = useState<ReturnType<typeof runSyntheticRule> | null>(null);
  const [persistableState, setPersistableState] = useState<PersistedCalculatorState | null>(null);

  useEffect(() => { if (localDraftReady) writeLocalDraft({ calculatorId: "reference.synthetic-rule", locale, fields: { baseAmount, effectiveDate } }); }, [baseAmount, effectiveDate, localDraftReady, locale]);
  const dirty = () => setPersistableState(null);
  const calculate = () => {
    const errors: Record<string, string> = {}; const parsedBase = parseLocaleDecimal(baseAmount, locale, 2);
    if (!parsedBase.ok) errors.baseAmount = parsedBase.code === "empty" ? text.required : text.invalidNumber;
    if (effectiveDate.trim().length === 0) errors.effectiveDate = text.required;
    if (!parsedBase.ok || effectiveDate.trim().length === 0) { setFieldErrors(errors); setOutcome(null); setPersistableState(null); return; }
    const nextOutcome = runSyntheticRule({ baseAmount: parsedBase.value, effectiveDate });
    if (!nextOutcome.ok) {
      for (const issue of nextOutcome.issues) {
        if (issue.path === "baseAmount") { errors.baseAmount = issue.code === "out-of-range" ? text.range : text.invalidNumber; continue; }
        if (issue.path === "effectiveDate") { errors.effectiveDate = issue.code === "invalid-effective-date" ? text.invalidDate : issue.code === "rule-unavailable" ? text.unavailable : issue.code === "rule-ambiguous" ? text.ambiguous : text.invalidDate; continue; }
        errors.effectiveDate = text.unavailable;
      }
      setFieldErrors(errors); setOutcome(null); setPersistableState(null); return;
    }
    setFieldErrors({}); setOutcome(nextOutcome); setPersistableState({ calculatorId: "reference.synthetic-rule", calculatorVersion: syntheticRuleCalculatorDefinition.version.version, input: { baseAmount: parsedBase.value, effectiveDate } });
  };
  const loadPersisted = (state: PersistedCalculatorState) => {
    if (state.calculatorId !== "reference.synthetic-rule") return;
    setBaseAmount(formatCanonicalDecimal(state.input.baseAmount, locale)); setEffectiveDate(state.input.effectiveDate); setFieldErrors({}); setOutcome(null); setPersistableState(null);
  };
  const dependency = outcome?.ok ? outcome.result.ruleDependencies?.[0] : undefined; const errorList = Object.values(fieldErrors);
  return <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
    <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7"><TrustPanel title={copy.trustTitle} tone="warning"><p>{copy.ui.warning}</p></TrustPanel><div className="mt-6 space-y-5">
      <CalculatorField id="synthetic-base-amount" label={copy.fields.baseAmount ?? ""} value={baseAmount} onChange={(event) => { dirty(); setBaseAmount(event.target.value); }} inputMode="decimal" autoComplete="off" error={fieldErrors.baseAmount} />
      <CalculatorField id="synthetic-effective-date" label={copy.fields.effectiveDate ?? ""} type="date" value={effectiveDate} onChange={(event) => { dirty(); setEffectiveDate(event.target.value); }} autoComplete="off" error={fieldErrors.effectiveDate} />
      <Button type="button" onClick={calculate}>{copy.ui.calculate}</Button><ValidationSummary title={text.summary} errors={errorList} />
    </div><PersistenceControls locale={locale} calculatorId="reference.synthetic-rule" state={persistableState} onLoad={loadPersisted} /></section>
    <div className="min-w-0 space-y-5">{outcome?.ok && dependency !== undefined ? <ResultPanel title={text.result}><div className="min-w-0"><p className="text-xs font-semibold tracking-[0.1em] text-trust-foreground/75 uppercase">{copy.results[outcome.result.primaryAnswer.id] ?? outcome.result.primaryAnswer.id}</p><p className="mt-2 break-words text-4xl font-bold tracking-[-0.05em] text-trust-foreground sm:text-5xl">{formatCanonicalDecimal(outcome.result.primaryAnswer.value, locale)}</p></div><div className="mt-7 border-t border-primary/15 pt-5"><h2 className="text-sm font-bold text-trust-foreground">{copy.ui.provenanceTitle}</h2><dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2"><div><dt className="text-xs font-semibold text-trust-foreground/70">{copy.results.versionId}</dt><dd className="mt-1 break-words font-bold text-trust-foreground">{dependency.versionId}</dd></div><div><dt className="text-xs font-semibold text-trust-foreground/70">{copy.results.effectivePeriod}</dt><dd className="mt-1 break-words font-bold text-trust-foreground">{dependency.effectiveFrom} {dependency.effectiveUntil === undefined ? text.ongoing : `to ${dependency.effectiveUntil}`}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold text-trust-foreground/70">{copy.results.sourceId}</dt><dd className="mt-1 break-words font-bold text-trust-foreground">{dependency.provenance.sourceId}</dd></div></dl></div></ResultPanel> : <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-card/50 p-6 text-sm leading-6 text-muted-foreground">{locale === "id" ? "Masukkan nilai dasar dan tanggal efektif untuk memilih fixture aturan secara eksplisit." : "Enter a base amount and effective date to select the rule fixture explicitly."}</div>}</div>
  </div>;
}
