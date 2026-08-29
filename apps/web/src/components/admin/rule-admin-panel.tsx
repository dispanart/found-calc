"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { authClient } from "@/lib/auth/client";

const RULE_ID = "reference.synthetic-rate";

type AdminRuleVersion = {
  readonly id: string;
  readonly ruleId: string;
  readonly versionId: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil?: string;
  readonly payload: { readonly ratePercent: string };
  readonly provenance: { readonly sourceId: string; readonly sourceUrl?: string };
  readonly status: "draft" | "published";
  readonly createdAt: number;
  readonly publishedAt?: number;
};

const copy = {
  id: {
    title: "Platform aturan berversi",
    description: "Kelola hanya fixture sintetis referensi pada Phase 05. Data ini bukan aturan produksi atau panduan resmi.",
    warning: "Data sintetis saja — jangan masukkan tarif/regulasi produksi pada fase ini.",
    signedOut: "Masuk dengan akun admin untuk melihat dan mengubah draft aturan.",
    forbidden: "Akun ini tidak memiliki akses admin.",
    unavailable: "Layanan admin aturan sedang tidak tersedia.",
    loading: "Memuat versi aturan…",
    versionId: "ID versi",
    effectiveFrom: "Efektif mulai",
    effectiveUntil: "Efektif sampai (opsional)",
    ratePercent: "Tarif persen sintetis",
    sourceId: "ID sumber",
    sourceUrl: "URL sumber (opsional)",
    create: "Buat draft",
    creating: "Membuat…",
    publish: "Publikasikan",
    publishing: "Mempublikasikan…",
    draftCreated: "Draft aturan dibuat.",
    published: "Versi aturan dipublikasikan.",
    duplicate: "ID versi tersebut sudah ada.",
    overlap: "Periode versi ini bertumpang tindih dengan versi yang sudah dipublikasikan.",
    invalid: "Periksa kembali data draft aturan.",
    status: "Status",
    period: "Periode",
    rate: "Tarif",
    source: "Sumber",
    empty: "Belum ada versi aturan.",
    ongoing: "dan setelahnya",
  },
  en: {
    title: "Versioned rule platform",
    description: "Manage only the synthetic reference fixture in Phase 05. This is not production rule data or official guidance.",
    warning: "Synthetic data only — do not enter production rates/regulations in this phase.",
    signedOut: "Sign in with an admin account to view and change rule drafts.",
    forbidden: "This account does not have admin access.",
    unavailable: "The rule admin service is currently unavailable.",
    loading: "Loading rule versions…",
    versionId: "Version ID",
    effectiveFrom: "Effective from",
    effectiveUntil: "Effective until (optional)",
    ratePercent: "Synthetic rate percent",
    sourceId: "Source ID",
    sourceUrl: "Source URL (optional)",
    create: "Create draft",
    creating: "Creating…",
    publish: "Publish",
    publishing: "Publishing…",
    draftCreated: "Rule draft created.",
    published: "Rule version published.",
    duplicate: "That version ID already exists.",
    overlap: "This version period overlaps an already published version.",
    invalid: "Check the rule draft fields.",
    status: "Status",
    period: "Period",
    rate: "Rate",
    source: "Source",
    empty: "No rule versions yet.",
    ongoing: "and later",
  },
} as const;

const inputClass = "min-h-11 min-w-0 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring";

const errorCode = async (response: Response): Promise<string | undefined> => {
  try {
    const body = await response.json() as { error?: { code?: string } };
    return body.error?.code;
  } catch {
    return undefined;
  }
};

export function RuleAdminPanel({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [versions, setVersions] = useState<readonly AdminRuleVersion[]>([]);
  const [access, setAccess] = useState<"loading" | "ready" | "signed-out" | "forbidden" | "error">("loading");
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [versionId, setVersionId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [ratePercent, setRatePercent] = useState("");
  const [sourceId, setSourceId] = useState("synthetic-admin-reference");
  const [sourceUrl, setSourceUrl] = useState("");

  const load = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/rule-versions?ruleId=${encodeURIComponent(RULE_ID)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (response.status === 401) {
        setVersions([]);
        setAccess("signed-out");
        setLoadedUserId(userId);
        return;
      }
      if (response.status === 403) {
        setVersions([]);
        setAccess("forbidden");
        setLoadedUserId(userId);
        return;
      }
      if (!response.ok) {
        setVersions([]);
        setAccess("error");
        setLoadedUserId(userId);
        return;
      }
      const body = await response.json() as { versions?: AdminRuleVersion[] };
      if (!Array.isArray(body.versions)) {
        setVersions([]);
        setAccess("error");
        setLoadedUserId(userId);
        return;
      }
      setVersions(body.versions);
      setAccess("ready");
      setLoadedUserId(userId);
    } catch {
      setVersions([]);
      setAccess("error");
      setLoadedUserId(userId);
    }
  }, []);

  useEffect(() => {
    if (sessionPending || !session?.user) return;
    void load(session.user.id);
  }, [load, session?.user, sessionPending]);

  const createDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyId("create");
    setStatus("");
    try {
      const response = await fetch("/api/admin/rule-versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ruleId: RULE_ID,
          versionId: versionId.trim(),
          effectiveFrom,
          ...(effectiveUntil ? { effectiveUntil } : {}),
          payload: { ratePercent: ratePercent.trim() },
          provenance: {
            sourceId: sourceId.trim(),
            ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
          },
        }),
      });
      if (!response.ok) {
        const code = await errorCode(response);
        setStatus(code === "duplicate-version" ? text.duplicate : code === "invalid-rule-draft" ? text.invalid : response.status === 403 ? text.forbidden : text.unavailable);
        return;
      }
      setStatus(text.draftCreated);
      setVersionId(""); setEffectiveFrom(""); setEffectiveUntil(""); setRatePercent(""); setSourceUrl("");
      if (session?.user) await load(session.user.id);
    } catch {
      setStatus(text.unavailable);
    } finally {
      setBusyId(null);
    }
  };

  const publish = async (id: string) => {
    setBusyId(id);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/rule-versions/${encodeURIComponent(id)}/publish`, { method: "POST" });
      if (!response.ok) {
        const code = await errorCode(response);
        setStatus(code === "publication-overlap" ? text.overlap : response.status === 403 ? text.forbidden : text.unavailable);
        return;
      }
      setStatus(text.published);
      if (session?.user) await load(session.user.id);
    } catch {
      setStatus(text.unavailable);
    } finally {
      setBusyId(null);
    }
  };

  const effectiveAccess = sessionPending
    ? "loading"
    : !session?.user
      ? "signed-out"
      : loadedUserId !== session.user.id
        ? "loading"
        : access;
  const accessMessage = effectiveAccess === "signed-out" ? text.signedOut : effectiveAccess === "forbidden" ? text.forbidden : effectiveAccess === "error" ? text.unavailable : text.loading;

  return (
    <section className="mt-10 min-w-0 space-y-6" aria-labelledby="rule-admin-title">
      <div className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
        <h2 id="rule-admin-title" className="text-2xl font-bold tracking-[-0.03em]">{text.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{text.description}</p>
        <p className="mt-4 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm font-semibold" role="note">{text.warning}</p>
      </div>

      {effectiveAccess !== "ready" ? (
        <p className="rounded-[var(--radius-card)] border border-border bg-card p-5 text-sm text-muted-foreground" role="status">{accessMessage}</p>
      ) : (
        <>
          <form className="grid min-w-0 gap-5 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:grid-cols-2 sm:p-7" onSubmit={createDraft}>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">{text.versionId}<input className={inputClass} required value={versionId} onChange={(event) => setVersionId(event.target.value)} /></label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">{text.ratePercent}<input className={inputClass} required inputMode="decimal" value={ratePercent} onChange={(event) => setRatePercent(event.target.value)} /></label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">{text.effectiveFrom}<input className={inputClass} required type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">{text.effectiveUntil}<input className={inputClass} type="date" value={effectiveUntil} onChange={(event) => setEffectiveUntil(event.target.value)} /></label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">{text.sourceId}<input className={inputClass} required value={sourceId} onChange={(event) => setSourceId(event.target.value)} /></label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">{text.sourceUrl}<input className={inputClass} type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></label>
            <div className="sm:col-span-2"><Button type="submit" disabled={busyId !== null}>{busyId === "create" ? text.creating : text.create}</Button></div>
          </form>

          <div className="grid min-w-0 gap-4">
            {versions.length === 0 ? <p className="text-sm text-muted-foreground">{text.empty}</p> : versions.map((version) => (
              <article key={version.id} className="min-w-0 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0"><p className="break-words text-lg font-bold">{version.versionId}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{text.status}: {version.status}</p></div>
                  {version.status === "draft" ? <Button type="button" size="sm" onClick={() => void publish(version.id)} disabled={busyId !== null}>{busyId === version.id ? text.publishing : text.publish}</Button> : null}
                </div>
                <dl className="mt-5 grid min-w-0 gap-4 text-sm sm:grid-cols-3">
                  <div><dt className="font-semibold text-muted-foreground">{text.period}</dt><dd className="mt-1 break-words">{version.effectiveFrom} — {version.effectiveUntil ?? text.ongoing}</dd></div>
                  <div><dt className="font-semibold text-muted-foreground">{text.rate}</dt><dd className="mt-1 break-words">{version.payload.ratePercent}%</dd></div>
                  <div><dt className="font-semibold text-muted-foreground">{text.source}</dt><dd className="mt-1 break-words">{version.provenance.sourceId}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{status}</p>
    </section>
  );
}
