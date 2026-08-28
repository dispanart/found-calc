"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const result = mode === "sign-up"
      ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
      : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setStatus(text.genericError);
      return;
    }
    setPassword("");
    await refetch();
    router.refresh();
  };

  const signOut = async () => {
    setBusy(true);
    setStatus("");
    const result = await authClient.signOut();
    setBusy(false);
    if (result.error) {
      setStatus(text.genericError);
      return;
    }
    await refetch();
    router.refresh();
  };

  if (isPending) {
    return <p className="text-sm text-muted-foreground" role="status">{text.working}</p>;
  }

  if (session?.user) {
    return (
      <section className="rounded-[var(--radius-card)] border border-border bg-card p-6 sm:p-8">
        <p className="text-sm text-muted-foreground">{text.signedIn}</p>
        <p className="mt-2 break-words text-lg font-bold">{session.user.email}</p>
        <div className="mt-6">
          <Button type="button" variant="outline" onClick={signOut} disabled={busy}>
            {busy ? text.working : text.signOut}
          </Button>
        </div>
        <p className="mt-4 text-sm text-destructive" aria-live="polite">{status}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap gap-2" aria-label={locale === "id" ? "Pilihan autentikasi" : "Authentication options"}>
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
