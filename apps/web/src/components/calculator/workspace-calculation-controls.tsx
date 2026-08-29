"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { authClient } from "@/lib/auth/client";
import type { PersistedCalculatorState, SupportedCalculatorId } from "@/lib/persistence/state";
import type { SyntheticRuleContext } from "@/lib/workspace/contracts";
import {
  fetchWorkspaceCalculation,
  fetchWorkspaceProjects,
  saveWorkspaceCalculation,
  writableWorkspaceProjects,
  WorkspaceClientError,
  type WorkspaceCalculationRecord,
  type WorkspaceProjectCollection,
} from "@/lib/workspace/client";

const copy = {
  id: {
    heading: "Simpan ke Project",
    signedOut: "Project bersifat opsional dan memerlukan akun. Kalkulator publik tetap dapat digunakan tanpa masuk.",
    signIn: "Masuk untuk menggunakan Project",
    loading: "Memuat Project…",
    unavailable: "Project belum dapat dimuat. Draft lokal Anda tidak terpengaruh.",
    noWritable: "Belum ada Project yang dapat Anda edit. Buat Project di Workspace terlebih dahulu.",
    openWorkspace: "Buka Workspace",
    project: "Project",
    title: "Nama perhitungan",
    titlePlaceholder: "Contoh: Penawaran Agustus",
    save: "Simpan perhitungan",
    saving: "Menyimpan…",
    calculateFirst: "Hitung dengan sukses terlebih dahulu sebelum menyimpan ke Project.",
    saved: "Perhitungan bernama tersimpan ke Project.",
    saveFailure: "Perhitungan belum dapat disimpan. Form dan draft lokal tetap tidak berubah.",
    privacy: "Hanya simpan jika Anda memang ingin anggota Project dapat melihat input kanonik perhitungan ini.",
    recordLoading: "Memuat preview perhitungan tersimpan…",
    recordUnavailable: "Perhitungan tersimpan tidak tersedia atau tidak dapat diakses.",
    recordMismatch: "Perhitungan tersimpan berasal dari kalkulator lain. Form saat ini tidak diubah.",
    recordHeading: "Perhitungan tersimpan",
    createdBy: "Disimpan oleh",
    loadRecord: "Muat perhitungan tersimpan",
    loadedRecord: "Input tersimpan dimuat ke form. Tekan Hitung untuk menghasilkan hasil lokal terbaru.",
  },
  en: {
    heading: "Save to Project",
    signedOut: "Projects are optional and require an account. Public calculators still work without signing in.",
    signIn: "Sign in to use Projects",
    loading: "Loading Projects…",
    unavailable: "Projects are not available right now. Your local draft is unaffected.",
    noWritable: "You do not have an editable Project yet. Create one in Workspace first.",
    openWorkspace: "Open Workspace",
    project: "Project",
    title: "Calculation name",
    titlePlaceholder: "Example: August offer",
    save: "Save calculation",
    saving: "Saving…",
    calculateFirst: "Complete a successful calculation before saving it to a Project.",
    saved: "Named calculation saved to the Project.",
    saveFailure: "The calculation could not be saved. Your form and local draft were not changed.",
    privacy: "Save only when you intend Project members to see this calculation's canonical inputs.",
    recordLoading: "Loading saved calculation preview…",
    recordUnavailable: "The saved calculation is unavailable or you do not have access.",
    recordMismatch: "The saved calculation belongs to a different calculator. Your current form was not changed.",
    recordHeading: "Saved calculation",
    createdBy: "Saved by",
    loadRecord: "Load saved calculation",
    loadedRecord: "Saved inputs loaded into the form. Press Calculate to produce a fresh local result.",
  },
} as const;

type ProjectStatus = "idle" | "loading" | "ready" | "error";
type RecordStatus = "idle" | "loading" | "ready" | "error" | "mismatch";

interface WorkspaceCalculationControlsProps {
  readonly locale: Locale;
  readonly calculatorId: SupportedCalculatorId;
  readonly state: PersistedCalculatorState | null;
  readonly onLoad: (state: PersistedCalculatorState) => void;
  readonly recordId?: string;
  readonly ruleContext?: SyntheticRuleContext;
}

export function WorkspaceCalculationControls({
  locale,
  calculatorId,
  state,
  onLoad,
  recordId,
  ruleContext,
}: WorkspaceCalculationControlsProps) {
  const text = copy[locale];
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [projects, setProjects] = useState<WorkspaceProjectCollection>({ owned: [], shared: [] });
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("idle");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [record, setRecord] = useState<WorkspaceCalculationRecord | null>(null);
  const [recordStatus, setRecordStatus] = useState<RecordStatus>("idle");
  const [recordMessage, setRecordMessage] = useState("");
  const writableProjects = useMemo(() => writableWorkspaceProjects(projects), [projects]);

  const loadRecord = () => {
    if (record === null || record.calculatorId !== calculatorId) return;
    onLoad(record.state);
    setRecordMessage(text.loadedRecord);
  };

  useEffect(() => {
    if (!userId) {
      setProjects({ owned: [], shared: [] });
      setSelectedProjectId("");
      setProjectStatus("idle");
      return;
    }
    const controller = new AbortController();
    setProjectStatus("loading");
    fetchWorkspaceProjects(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setProjects(next);
        const writable = writableWorkspaceProjects(next);
        setSelectedProjectId((current) => writable.some((project) => project.id === current) ? current : (writable[0]?.id ?? ""));
        setProjectStatus("ready");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setProjects({ owned: [], shared: [] });
        setSelectedProjectId("");
        setProjectStatus("error");
      });
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!recordId || !userId) {
      setRecord(null);
      setRecordStatus("idle");
      setRecordMessage("");
      return;
    }
    const controller = new AbortController();
    setRecord(null);
    setRecordMessage("");
    setRecordStatus("loading");
    fetchWorkspaceCalculation(recordId, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setRecord(next);
        setRecordStatus(next.calculatorId === calculatorId ? "ready" : "mismatch");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setRecord(null);
        setRecordStatus("error");
      });
    return () => controller.abort();
  }, [calculatorId, recordId, userId]);

  const save = async () => {
    if (!state) {
      setSaveStatus(text.calculateFirst);
      return;
    }
    if (!selectedProjectId || title.trim().length === 0) return;
    setSaveBusy(true);
    setSaveStatus("");
    try {
      await saveWorkspaceCalculation({
        projectId: selectedProjectId,
        title: title.trim(),
        state,
        ...(state.calculatorId === "reference.synthetic-rule" && ruleContext !== undefined ? { ruleContext } : {}),
      });
      setTitle("");
      setSaveStatus(text.saved);
    } catch (caught) {
      setSaveStatus(caught instanceof WorkspaceClientError && caught.code === "project-read-only" ? text.noWritable : text.saveFailure);
    } finally {
      setSaveBusy(false);
    }
  };

  if (isPending) {
    return <p className="mt-7 border-t border-border pt-6 text-sm text-muted-foreground" role="status">{text.loading}</p>;
  }

  if (!session?.user) {
    return (
      <section className="mt-7 border-t border-border pt-6" aria-labelledby={`workspace-save-${calculatorId}`}>
        <h2 id={`workspace-save-${calculatorId}`} className="text-sm font-bold">{text.heading}</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{text.signedOut}</p>
        <Link href={`/${locale}/auth`} className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {text.signIn}
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-7 border-t border-border pt-6" aria-labelledby={`workspace-save-${calculatorId}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`workspace-save-${calculatorId}`} className="text-sm font-bold">{text.heading}</h2>
        <Link href={`/${locale}/workspace`} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">{text.openWorkspace}</Link>
      </div>

      {recordId ? (
        <div className="mt-5 border-l-2 border-primary/30 pl-4">
          {recordStatus === "loading" ? <p className="text-sm text-muted-foreground" role="status">{text.recordLoading}</p> : null}
          {recordStatus === "error" ? <p className="text-sm text-destructive" role="alert">{text.recordUnavailable}</p> : null}
          {recordStatus === "mismatch" ? <p className="text-sm text-destructive" role="alert">{text.recordMismatch}</p> : null}
          {recordStatus === "ready" && record ? (
            <div>
              <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{text.recordHeading}</p>
              <p className="mt-1 break-words font-bold">{record.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{text.createdBy} {record.creatorDisplayName}</p>
              <Button className="mt-3" type="button" variant="outline" onClick={loadRecord} data-testid="load-workspace-calculation">
                {text.loadRecord}
              </Button>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{recordMessage}</p>
        </div>
      ) : null}

      {projectStatus === "loading" ? <p className="mt-5 text-sm text-muted-foreground" role="status">{text.loading}</p> : null}
      {projectStatus === "error" ? <p className="mt-5 text-sm text-destructive" role="alert">{text.unavailable}</p> : null}
      {projectStatus === "ready" && writableProjects.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-muted-foreground">{text.noWritable}</p>
      ) : null}
      {projectStatus === "ready" && writableProjects.length > 0 ? (
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold" htmlFor={`workspace-project-${calculatorId}`}>
            {text.project}
            <select
              id={`workspace-project-${calculatorId}`}
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="min-h-11 min-w-0 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {writableProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold" htmlFor={`workspace-title-${calculatorId}`}>
            {text.title}
            <input
              id={`workspace-title-${calculatorId}`}
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={text.titlePlaceholder}
              autoComplete="off"
              className="min-h-11 min-w-0 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="button" onClick={save} disabled={saveBusy || state === null || title.trim().length === 0 || selectedProjectId.length === 0}>
            {saveBusy ? text.saving : text.save}
          </Button>
        </div>
      ) : null}
      {state === null ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{text.calculateFirst}</p> : null}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{text.privacy}</p>
      <p className="mt-3 text-sm" aria-live="polite" aria-atomic="true">{saveStatus}</p>
    </section>
  );
}
