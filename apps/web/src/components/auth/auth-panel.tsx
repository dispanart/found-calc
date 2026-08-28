"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import { authClient } from "@/lib/auth/client";

const copy = {
  id: {
    signIn: "Masuk",
    signUp: "Buat akun",
    signOut: "Keluar",
    name: "Nama",
    email: "Email",
    password: "Kata sandi",
    passwordHint: "Minimal 8 karakter.",
    signedIn: "Anda masuk sebagai",
    signedOut: "Belum masuk.",
    working: "Memproses…",
    genericError: "Autentikasi belum berhasil. Periksa data Anda dan coba lagi.",
    claimSuccess: "Draft tersimpan dipertahankan pada akun Anda.",
    claimFailure: "Akun berhasil masuk, tetapi draft tamu belum dapat dipertahankan. Coba lagi.",
    retryClaim: "Coba pertahankan draft lagi",
  },
  en: {
    signIn: "Sign in",
    signUp: "Create account",
    signOut: "Sign out",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters.",
    signedIn: "You are signed in as",
    signedOut: "You are not signed in.",
    working: "Working…",
    genericError: "Authentication did not complete. Check your details and try again.",
    claimSuccess: "Saved drafts preserved with your account.",
    claimFailure: "Authentication succeeded, but guest drafts could not be preserved. Try again.",
    retryClaim: "Retry preserving drafts",
  },
} as const;

export function AuthPanel({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const router = useRouter();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimNeedsRetry, setClaimNeedsRetry] = useState(false);

  const claimGuestDrafts = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/guest/claim", { method: "POST" });
      return response.ok;
    } catch {
      return false;
    }
  };

  const finishAuthenticatedTransition = async () => {
    const claimed = await claimGuestDrafts();
    setClaimNeedsRetry(!claimed);
    setStatus(claimed ? text.claimSuccess : text.claimFailure);
    await refetch();
    router.refresh();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    setClaimNeedsRetry(false);
    const result = mode === "sign-up"
      ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
      : await authClient.signIn.email({ email: email.trim(), password });
    if (result.error) {
      setBusy(false);
      setStatus(text.genericError);
      return;
    }
    setPassword("");
    await finishAuthenticatedTransition();
    setBusy(false);
  };

  const retryClaim = async () => {
    setBusy(true);
    const claimed = await claimGuestDrafts();
    setClaimNeedsRetry(!claimed);
    setStatus(claimed ? text.claimSuccess : text.claimFailure);
    if (claimed) router.refresh();
    setBusy(false);
  };

  const signOut = async () => {
    setBusy(true);
    setStatus("");
    setClaimNeedsRetry(false);
    const result = await authClient.signOut();
    if (result.error) {
      setBusy(false);
      setStatus(text.genericError);
      return;
    }
    await refetch();
    router.refresh();
    setBusy(false);
  };

  if (isPending) {
    return <p className="text-sm text-muted-foreground" role="status">{text.working}</p>;
  }

  if (session?.user) {
    return (
      <section className="rounded-[var(--radius-card)] border border-border bg-card p-6 sm:p-8">
        <p className="text-sm text-muted-foreground">{text.signedIn}</p>
        <p className="mt-2 break-words text-lg font-bold">{session.user.email}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={signOut} disabled={busy}>
            {busy ? text.working : text.signOut}
          </Button>
          {claimNeedsRetry ? (
            <Button type="button" variant="ghost" onClick={retryClaim} disabled={busy}>
              {text.retryClaim}
            </Button>
          ) : null}
        </div>
        <p className={claimNeedsRetry ? "mt-4 text-sm text-destructive" : "mt-4 text-sm text-muted-foreground"} role="status" aria-live="polite">
          {status}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-6 sm:p-8">
      <p className="text-sm text-muted-foreground">{text.signedOut}</p>
      <div className="mt-5 flex flex-wrap gap-2" aria-label={locale === "id" ? "Pilihan autentikasi" : "Authentication options"}>
        <Button type="button" variant={mode === "sign-in" ? "default" : "outline"} onClick={() => setMode("sign-in")}>
          {text.signIn}
        </Button>
        <Button type="button" variant={mode === "sign-up" ? "default" : "outline"} onClick={() => setMode("sign-up")}>
          {text.signUp}
        </Button>
      </div>

      <form className="mt-7 space-y-5" onSubmit={submit}>
        {mode === "sign-up" ? (
          <label className="grid gap-2 text-sm font-semibold" htmlFor="auth-name">
            {text.name}
            <input id="auth-name" name="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-semibold" htmlFor="auth-email">
          {text.email}
          <input id="auth-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="auth-password">
          {text.password}
          <input id="auth-password" name="password" type="password" minLength={8} maxLength={128} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <span className="font-normal text-muted-foreground">{text.passwordHint}</span>
        </label>
        <Button type="submit" disabled={busy}>{busy ? text.working : mode === "sign-up" ? text.signUp : text.signIn}</Button>
        <p className="text-sm text-destructive" role="status" aria-live="polite">{status}</p>
      </form>
    </section>
  );
}
