"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { authClient } from "@/lib/auth/client";
import {
  createWorkspaceGoal,
  createWorkspaceProject,
  deleteWorkspaceGoal,
  fetchWorkspaceGoals,
  fetchWorkspaceProfile,
  fetchWorkspaceProjects,
  patchWorkspaceGoal,
  redeemWorkspaceInvite,
  updateWorkspaceProfile,
  type WorkspaceGoalClient,
  type WorkspaceProfileClient,
  type WorkspaceProjectCollection,
} from "@/lib/workspace/client";
import { PersistenceSummary } from "./persistence-summary";

const copy = {
  id: {
    pending: "Memuat ruang kerja…",
    signedOutTitle: "Workspace bersifat opsional",
    signedOut: "Kalkulator publik tetap dapat dipakai tanpa akun. Masuk hanya saat Anda ingin menyimpan Goal, Project, dan riwayat perhitungan bernama.",
    signIn: "Masuk ke akun",
    profile: "Profil",
    displayName: "Nama tampilan",
    locale: "Bahasa pilihan",
    saveProfile: "Simpan profil",
    goals: "Goals",
    goalIntro: "Goal bersifat privat. Anggota Project tidak dapat melihat Goal yang terhubung.",
    goalTitle: "Nama Goal",
    goalNote: "Catatan opsional",
    goalDate: "Tanggal target opsional",
    addGoal: "Tambah Goal",
    complete: "Selesai",
    archive: "Arsipkan",
    remove: "Hapus",
    emptyGoals: "Belum ada Goal. Tambahkan satu jika Anda ingin memberi konteks privat pada Project.",
    projects: "Projects",
    projectName: "Nama Project",
    projectDescription: "Deskripsi opsional",
    projectGoal: "Goal privat opsional",
    noGoal: "Tanpa Goal",
    addProject: "Buat Project",
    owned: "Milik saya",
    shared: "Dibagikan kepada saya",
    emptyOwned: "Belum ada Project milik Anda.",
    emptyShared: "Belum ada Project yang dibagikan kepada Anda.",
    open: "Buka Project",
    invite: "Gabung dengan kode undangan",
    inviteCode: "Kode undangan",
    redeem: "Gabung Project",
    latestDrafts: "Latest drafts",
    latestDraftsIntro: "Draft terbaru Phase 04 tetap terpisah dari Project dan riwayat bernama.",
    saved: "Perubahan tersimpan.",
    failed: "Perubahan belum dapat disimpan. Coba lagi tanpa mengubah data lokal Anda.",
    joined: "Undangan diterima. Project kini tersedia di bagian dibagikan.",
  },
  en: {
    pending: "Loading workspace…",
    signedOutTitle: "Workspace is optional",
    signedOut: "Public calculators remain account-free. Sign in only when you want Goals, Projects, and named calculation history.",
    signIn: "Sign in to your account",
    profile: "Profile",
    displayName: "Display name",
    locale: "Preferred language",
    saveProfile: "Save profile",
    goals: "Goals",
    goalIntro: "Goals are private. Project members cannot see a connected Goal.",
    goalTitle: "Goal name",
    goalNote: "Optional note",
    goalDate: "Optional target date",
    addGoal: "Add Goal",
    complete: "Complete",
    archive: "Archive",
    remove: "Delete",
    emptyGoals: "No Goals yet. Add one only when you want private context for a Project.",
    projects: "Projects",
    projectName: "Project name",
    projectDescription: "Optional description",
    projectGoal: "Optional private Goal",
    noGoal: "No Goal",
    addProject: "Create Project",
    owned: "Owned by me",
    shared: "Shared with me",
    emptyOwned: "You do not own any Projects yet.",
    emptyShared: "No Projects have been shared with you yet.",
    open: "Open Project",
    invite: "Join with invite code",
    inviteCode: "Invite code",
    redeem: "Join Project",
    latestDrafts: "Latest drafts",
    latestDraftsIntro: "Phase 04 latest drafts remain separate from Projects and named history.",
    saved: "Changes saved.",
    failed: "Changes could not be saved. Try again; your local data was not changed.",
    joined: "Invite accepted. The Project is now available under shared Projects.",
  },
} as const;

const emptyProjects: WorkspaceProjectCollection = { owned: [], shared: [] };

export function WorkspaceDashboard({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [profile, setProfile] = useState<WorkspaceProfileClient | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [preferredLocale, setPreferredLocale] = useState<"id" | "en">(locale);
  const [goals, setGoals] = useState<readonly WorkspaceGoalClient[]>([]);
  const [projects, setProjects] = useState<WorkspaceProjectCollection>(emptyProjects);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalNote, setGoalNote] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectGoalId, setProjectGoalId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setGoals([]);
      setProjects(emptyProjects);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setStatus("");
    Promise.all([fetchWorkspaceProfile(), fetchWorkspaceGoals(), fetchWorkspaceProjects()])
      .then(([nextProfile, nextGoals, nextProjects]) => {
        if (!active) return;
        setProfile(nextProfile);
        setDisplayName(nextProfile?.displayName ?? session?.user.name ?? "");
        setPreferredLocale(nextProfile?.preferredLocale ?? locale);
        setGoals(nextGoals);
        setProjects(nextProjects);
      })
      .catch(() => { if (active) setStatus(text.failed); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [locale, refreshKey, session?.user.name, text.failed, userId]);

  const refresh = () => setRefreshKey((value) => value + 1);
  const runMutation = async (action: () => Promise<void>, success = text.saved) => {
    setBusy(true);
    setStatus("");
    try {
      await action();
      setStatus(success);
      refresh();
    } catch {
      setStatus(text.failed);
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    await runMutation(async () => {
      const next = await updateWorkspaceProfile({ displayName, preferredLocale });
      setProfile(next);
    });
  };

  const addGoal = async (event: FormEvent) => {
    event.preventDefault();
    await runMutation(async () => {
      await createWorkspaceGoal({
        title: goalTitle,
        ...(goalNote.trim() ? { note: goalNote } : {}),
        ...(goalDate ? { targetDate: goalDate } : {}),
      });
      setGoalTitle(""); setGoalNote(""); setGoalDate("");
    });
  };

  const addProject = async (event: FormEvent) => {
    event.preventDefault();
    await runMutation(async () => {
      await createWorkspaceProject({
        name: projectName,
        ...(projectDescription.trim() ? { description: projectDescription } : {}),
        ...(projectGoalId ? { goalId: projectGoalId } : {}),
      });
      setProjectName(""); setProjectDescription(""); setProjectGoalId("");
    });
  };

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    await runMutation(async () => {
      await redeemWorkspaceInvite(inviteCode.trim());
      setInviteCode("");
    }, text.joined);
  };

  if (isPending) return <p className="text-sm text-muted-foreground" role="status">{text.pending}</p>;

  if (!session?.user) {
    return (
      <div className="space-y-10">
        <section className="border-t border-border pt-7">
          <h2 className="text-2xl font-bold tracking-[-0.03em]">{text.signedOutTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{text.signedOut}</p>
          <Link href={`/${locale}/auth`} className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{text.signIn}</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {loading ? <p className="text-sm text-muted-foreground" role="status">{text.pending}</p> : null}
      <p className="text-sm" role="status" aria-live="polite">{status}</p>

      <section className="border-t border-border pt-7" data-testid="workspace-profile">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">01</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">{text.profile}</h2>
        </div>
        <form className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2" onSubmit={saveProfile}>
          <label className="grid gap-2 text-sm font-semibold">{text.displayName}<input required maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          <label className="grid gap-2 text-sm font-semibold">{text.locale}<select value={preferredLocale} onChange={(e) => setPreferredLocale(e.target.value as "id" | "en")} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></label>
          <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{text.saveProfile}</Button></div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">{session.user.email}</p>
      </section>

      <section className="border-t border-border pt-7" data-testid="workspace-goals">
        <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">02</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">{text.goals}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{text.goalIntro}</p>
        <form className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2" onSubmit={addGoal}>
          <label className="grid gap-2 text-sm font-semibold">{text.goalTitle}<input required maxLength={120} value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold">{text.goalDate}<input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">{text.goalNote}<textarea maxLength={1000} value={goalNote} onChange={(e) => setGoalNote(e.target.value)} rows={3} className="rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 font-normal" /></label>
          <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{text.addGoal}</Button></div>
        </form>
        <div className="mt-7 divide-y divide-border border-y border-border">
          {goals.length === 0 ? <p className="py-5 text-sm text-muted-foreground">{text.emptyGoals}</p> : goals.map((goal) => (
            <article key={goal.id} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0"><h3 className="break-words font-bold">{goal.title}</h3><p className="mt-1 text-xs text-muted-foreground">{goal.status}{goal.targetDate ? ` · ${goal.targetDate}` : ""}</p>{goal.note ? <p className="mt-2 break-words text-sm text-muted-foreground">{goal.note}</p> : null}</div>
              <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy || goal.status === "completed"} onClick={() => runMutation(() => patchWorkspaceGoal(goal.id, { status: "completed" }).then(() => undefined))}>{text.complete}</Button><Button type="button" variant="ghost" disabled={busy || goal.status === "archived"} onClick={() => runMutation(() => patchWorkspaceGoal(goal.id, { status: "archived" }).then(() => undefined))}>{text.archive}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => runMutation(() => deleteWorkspaceGoal(goal.id))}>{text.remove}</Button></div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-7">
        <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">03</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">{text.projects}</h2>
        <form className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2" onSubmit={addProject}>
          <label className="grid gap-2 text-sm font-semibold">{text.projectName}<input required maxLength={120} value={projectName} onChange={(e) => setProjectName(e.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold">{text.projectGoal}<select value={projectGoalId} onChange={(e) => setProjectGoalId(e.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal"><option value="">{text.noGoal}</option>{goals.filter((goal) => goal.status !== "archived").map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">{text.projectDescription}<textarea maxLength={2000} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} rows={3} className="rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 font-normal" /></label>
          <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{text.addProject}</Button></div>
        </form>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div data-testid="workspace-projects-owned"><h3 className="text-lg font-bold">{text.owned}</h3><div className="mt-3 divide-y divide-border border-y border-border">{projects.owned.length === 0 ? <p className="py-5 text-sm text-muted-foreground">{text.emptyOwned}</p> : projects.owned.map((project) => <div key={project.id} className="flex min-w-0 items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-semibold">{project.name}</p><p className="text-xs text-muted-foreground">{project.status}</p></div><Link href={`/${locale}/workspace/projects/${project.id}`} className="shrink-0 text-sm font-semibold text-primary hover:underline">{text.open}</Link></div>)}</div></div>
          <div data-testid="workspace-projects-shared"><h3 className="text-lg font-bold">{text.shared}</h3><div className="mt-3 divide-y divide-border border-y border-border">{projects.shared.length === 0 ? <p className="py-5 text-sm text-muted-foreground">{text.emptyShared}</p> : projects.shared.map((project) => <div key={project.id} className="flex min-w-0 items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-semibold">{project.name}</p><p className="text-xs text-muted-foreground">{project.access}</p></div><Link href={`/${locale}/workspace/projects/${project.id}`} className="shrink-0 text-sm font-semibold text-primary hover:underline">{text.open}</Link></div>)}</div></div>
        </div>
      </section>

      <section className="border-t border-border pt-7" data-testid="workspace-invite-redeem">
        <h2 className="text-xl font-bold tracking-[-0.025em]">{text.invite}</h2>
        <form className="mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end" onSubmit={redeem}>
          <label className="grid min-w-0 flex-1 gap-2 text-sm font-semibold">{text.inviteCode}<input required pattern="[0-9a-fA-F]{64}" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} autoComplete="off" className="min-h-11 min-w-0 rounded-[var(--radius-control)] border border-border bg-background px-3 font-mono text-xs font-normal" /></label>
          <Button type="submit" disabled={busy}>{text.redeem}</Button>
        </form>
      </section>

      <section className="border-t border-border pt-7">
        <h2 className="text-xl font-bold tracking-[-0.025em]">{text.latestDrafts}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{text.latestDraftsIntro}</p>
        <div className="mt-5"><PersistenceSummary locale={locale} /></div>
      </section>
    </div>
  );
}
