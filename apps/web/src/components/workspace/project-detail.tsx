"use client";

import { getReferenceCalculatorById } from "@found-calc/catalog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { authClient } from "@/lib/auth/client";
import {
  createWorkspaceProjectInvite,
  deleteWorkspaceNamedCalculation,
  deleteWorkspaceProject,
  fetchWorkspaceGoals,
  fetchWorkspaceProjectDetail,
  patchWorkspaceProject,
  removeWorkspaceProjectMember,
  type WorkspaceGoalClient,
  type WorkspaceProjectDetailClient,
} from "@/lib/workspace/client";

const copy = {
  id: {
    loading: "Memuat Project…",
    failed: "Project tidak tersedia atau Anda tidak memiliki akses.",
    back: "Kembali ke Workspace",
    role: "Akses Anda",
    details: "Detail Project",
    name: "Nama Project",
    description: "Deskripsi",
    goal: "Goal privat",
    noGoal: "Tanpa Goal",
    status: "Status",
    save: "Simpan perubahan",
    deleteProject: "Hapus Project",
    members: "Anggota",
    owner: "Owner",
    invite: "Buat undangan",
    inviteRole: "Peran anggota baru",
    editor: "Editor",
    viewer: "Viewer",
    createInvite: "Buat kode",
    inviteCode: "Kode ini hanya ditampilkan di sini. Bagikan melalui kanal yang Anda percaya.",
    expires: "Berlaku sampai",
    removeMember: "Keluarkan",
    privacy: "Anggota Project dapat melihat input kanonik dari perhitungan bernama yang disimpan ke Project ini. Goal privat pemilik tidak dibagikan.",
    history: "Riwayat perhitungan bernama",
    emptyHistory: "Belum ada perhitungan bernama di Project ini.",
    openCalculation: "Buka di kalkulator",
    deleteCalculation: "Hapus riwayat",
    savedBy: "Disimpan oleh",
    ruleVersion: "Versi aturan",
    export: "Export JSON",
    exportNote: "Export berisi detail Project, nama tampilan anggota, dan input perhitungan tersimpan—tanpa email, auth ID, invite, atau Goal privat.",
    actionFailed: "Tindakan belum berhasil. Muat ulang lalu coba lagi.",
    actionSaved: "Perubahan tersimpan.",
    signIn: "Masuk untuk membuka Project ini.",
  },
  en: {
    loading: "Loading Project…",
    failed: "This Project is unavailable or you do not have access.",
    back: "Back to Workspace",
    role: "Your access",
    details: "Project details",
    name: "Project name",
    description: "Description",
    goal: "Private Goal",
    noGoal: "No Goal",
    status: "Status",
    save: "Save changes",
    deleteProject: "Delete Project",
    members: "Members",
    owner: "Owner",
    invite: "Create invite",
    inviteRole: "New member role",
    editor: "Editor",
    viewer: "Viewer",
    createInvite: "Create code",
    inviteCode: "This code is shown only here. Share it through a channel you trust.",
    expires: "Expires",
    removeMember: "Remove",
    privacy: "Project members can view canonical inputs from named calculations saved to this Project. The owner's private Goal is not shared.",
    history: "Named calculation history",
    emptyHistory: "No named calculations have been saved to this Project yet.",
    openCalculation: "Open in calculator",
    deleteCalculation: "Delete history",
    savedBy: "Saved by",
    ruleVersion: "Rule version",
    export: "Export JSON",
    exportNote: "Export includes Project details, member display names, and saved calculation inputs—never email, auth IDs, invites, or the private Goal.",
    actionFailed: "The action did not complete. Reload and try again.",
    actionSaved: "Changes saved.",
    signIn: "Sign in to open this Project.",
  },
} as const;

export function ProjectDetail({ locale, projectId }: { locale: Locale; projectId: string }) {
  const text = copy[locale];
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [detail, setDetail] = useState<WorkspaceProjectDetailClient | null>(null);
  const [goals, setGoals] = useState<readonly WorkspaceGoalClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalId, setGoalId] = useState("");
  const [projectStatus, setProjectStatus] = useState<"active" | "archived">("active");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  const [invite, setInvite] = useState<{ code: string; expiresAt: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) { setDetail(null); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setStatusMessage("");
    fetchWorkspaceProjectDetail(projectId)
      .then(async (next) => {
        if (!active) return;
        setDetail(next);
        setName(next.project.name);
        setDescription(next.project.description ?? "");
        setGoalId(next.project.goalId ?? "");
        setProjectStatus(next.project.status);
        if (next.project.access === "owner") {
          try { const nextGoals = await fetchWorkspaceGoals(); if (active) setGoals(nextGoals); }
          catch { if (active) setGoals([]); }
        } else setGoals([]);
      })
      .catch(() => { if (active) { setDetail(null); setStatusMessage(text.failed); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, refreshKey, text.failed, userId]);

  const refresh = () => setRefreshKey((value) => value + 1);
  const mutate = async (action: () => Promise<void>) => {
    setBusy(true); setStatusMessage("");
    try { await action(); setStatusMessage(text.actionSaved); refresh(); }
    catch { setStatusMessage(text.actionFailed); }
    finally { setBusy(false); }
  };

  const saveDetails = async (event: FormEvent) => {
    event.preventDefault();
    await mutate(() => patchWorkspaceProject(projectId, {
      name,
      description: description.trim() || null,
      goalId: goalId || null,
      status: projectStatus,
    }).then(() => undefined));
  };

  const makeInvite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setInvite(null); setStatusMessage("");
    try {
      const created = await createWorkspaceProjectInvite(projectId, inviteRole);
      setInvite({ code: created.code, expiresAt: created.expiresAt });
    } catch { setStatusMessage(text.actionFailed); }
    finally { setBusy(false); }
  };

  if (isPending || loading) return <p className="text-sm text-muted-foreground" role="status">{text.loading}</p>;
  if (!session?.user) return <p className="text-sm text-muted-foreground"><Link href={`/${locale}/auth`} className="font-semibold text-primary underline-offset-4 hover:underline">{text.signIn}</Link></p>;
  if (!detail) return <p className="text-sm text-destructive" role="alert">{statusMessage || text.failed}</p>;

  const owner = detail.project.access === "owner";

  return (
    <div className="space-y-12">
      <div>
        <Link href={`/${locale}/workspace`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">← {text.back}</Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-7">
          <div className="min-w-0"><h1 className="break-words text-4xl font-bold tracking-[-0.05em] sm:text-5xl">{detail.project.name}</h1>{detail.project.description ? <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-muted-foreground">{detail.project.description}</p> : null}</div>
          <div className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]">{text.role}: {detail.project.access}</div>
        </div>
      </div>

      <p className="rounded-[var(--radius-control)] border border-amber-700/30 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">{text.privacy}</p>
      <p className="text-sm" role="status" aria-live="polite">{statusMessage}</p>

      {owner ? (
        <section className="border-t border-border pt-7">
          <h2 className="text-2xl font-bold tracking-[-0.03em]">{text.details}</h2>
          <form className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2" onSubmit={saveDetails}>
            <label className="grid gap-2 text-sm font-semibold">{text.name}<input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal" /></label>
            <label className="grid gap-2 text-sm font-semibold">{text.status}<select value={projectStatus} onChange={(e) => setProjectStatus(e.target.value as "active" | "archived")} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal"><option value="active">active</option><option value="archived">archived</option></select></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">{text.description}<textarea maxLength={2000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 font-normal" /></label>
            <label className="grid gap-2 text-sm font-semibold">{text.goal}<select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal"><option value="">{text.noGoal}</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
            <div className="flex flex-wrap items-end gap-2"><Button type="submit" disabled={busy}>{text.save}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => mutate(async () => { await deleteWorkspaceProject(projectId); router.push(`/${locale}/workspace`); router.refresh(); })}>{text.deleteProject}</Button></div>
          </form>
        </section>
      ) : null}

      <section className="border-t border-border pt-7" data-testid="project-members">
        <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-2xl font-bold tracking-[-0.03em]">{text.members}</h2><span className="text-xs text-muted-foreground">{detail.participants.length}</span></div>
        <div className="mt-5 divide-y divide-border border-y border-border">{detail.participants.map((participant, index) => <div key={`${participant.role}-${participant.userId ?? index}`} className="flex min-w-0 items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-semibold">{participant.displayName}</p><p className="text-xs text-muted-foreground">{participant.role === "owner" ? text.owner : participant.role}</p></div>{owner && participant.userId ? <Button type="button" variant="ghost" disabled={busy} onClick={() => mutate(() => removeWorkspaceProjectMember(projectId, participant.userId!))}>{text.removeMember}</Button> : null}</div>)}</div>

        {owner ? <form className="mt-7 max-w-2xl border-l-2 border-primary/30 pl-4" onSubmit={makeInvite}><h3 className="font-bold">{text.invite}</h3><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="grid gap-2 text-sm font-semibold">{text.inviteRole}<select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal"><option value="viewer">{text.viewer}</option><option value="editor">{text.editor}</option></select></label><Button type="submit" disabled={busy}>{text.createInvite}</Button></div>{invite ? <div className="mt-4 min-w-0"><p className="break-all rounded-[var(--radius-control)] bg-muted px-3 py-2 font-mono text-xs" data-testid="project-invite-code">{invite.code}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{text.inviteCode} {text.expires}: {new Date(invite.expiresAt).toLocaleString(locale === "id" ? "id-ID" : "en-US")}</p></div> : null}</form> : null}
      </section>

      <section className="border-t border-border pt-7" data-testid="project-calculation-history">
        <h2 className="text-2xl font-bold tracking-[-0.03em]">{text.history}</h2>
        <div className="mt-5 divide-y divide-border border-y border-border">
          {detail.calculations.length === 0 ? <p className="py-5 text-sm text-muted-foreground">{text.emptyHistory}</p> : detail.calculations.map((calculation) => {
            const calculator = getReferenceCalculatorById(calculation.calculatorId);
            return <article key={calculation.id} className="grid min-w-0 gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><h3 className="break-words font-bold">{calculation.title}</h3><p className="mt-1 text-xs text-muted-foreground">{calculator?.copy[locale].title ?? calculation.calculatorId} · {text.savedBy} {calculation.creatorDisplayName}</p>{calculation.ruleContext ? <p className="mt-1 break-words text-xs text-muted-foreground">{text.ruleVersion}: {calculation.ruleContext.versionId}</p> : null}</div><div className="flex flex-wrap gap-2 sm:justify-end">{calculator ? <Link href={`/${locale}/calculators/${calculator.slug}?record=${calculation.id}`} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border px-3 text-sm font-semibold hover:bg-muted">{text.openCalculation}</Link> : null}{calculation.canDelete ? <Button type="button" variant="ghost" disabled={busy} onClick={() => mutate(() => deleteWorkspaceNamedCalculation(calculation.id))}>{text.deleteCalculation}</Button> : null}</div></article>;
          })}
        </div>
      </section>

      <section className="border-t border-border pt-7">
        <h2 className="text-xl font-bold tracking-[-0.025em]">{text.export}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{text.exportNote}</p>
        <a href={`/api/workspace/projects/${encodeURIComponent(projectId)}/export`} download="found-calc-project.json" data-testid="project-export" className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{text.export}</a>
      </section>
    </div>
  );
}
