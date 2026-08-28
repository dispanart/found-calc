"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locales";
import {
  parsePersistedCalculatorState,
  type PersistedCalculatorState,
  type SupportedCalculatorId,
} from "@/lib/persistence/state";

const copy = {
  id: {
    save: "Simpan draft",
    load: "Muat draft tersimpan",
    remove: "Hapus draft tersimpan",
    saving: "Menyimpan…",
    loading: "Memuat…",
    deleting: "Menghapus…",
    saved: "Draft tersimpan di penyimpanan Found Calc.",
    loaded: "Draft tersimpan dimuat ke formulir. Hitung kembali untuk memperbarui hasil.",
    deleted: "Draft tersimpan dihapus.",
    missing: "Belum ada draft tersimpan untuk kalkulator ini.",
    invalid: "Draft tersimpan tidak dapat digunakan dan formulir saat ini tidak diubah.",
    failure: "Penyimpanan belum tersedia. Draft lokal Anda tetap dipertahankan.",
    calculateFirst: "Hitung dengan sukses terlebih dahulu sebelum menyimpan draft ke server.",
    privacy: "Perhitungan tetap dilakukan secara lokal; hanya draft yang Anda simpan secara eksplisit yang dikirim ke penyimpanan Found Calc.",
  },
  en: {
    save: "Save draft",
    load: "Load saved draft",
    remove: "Delete saved draft",
    saving: "Saving…",
    loading: "Loading…",
    deleting: "Deleting…",
    saved: "Draft saved to Found Calc storage.",
    loaded: "Saved draft loaded into the form. Calculate again to refresh the result.",
    deleted: "Saved draft deleted.",
    missing: "There is no saved draft for this calculator yet.",
    invalid: "The saved draft could not be used and your current form was not changed.",
    failure: "Storage is not available right now. Your local draft is still preserved.",
    calculateFirst: "Complete a successful calculation before saving a draft to the server.",
    privacy: "Calculation still happens locally; only a draft you explicitly save is sent to Found Calc storage.",
  },
} as const;

interface PersistenceControlsProps {
  readonly locale: Locale;
  readonly calculatorId: SupportedCalculatorId;
  readonly state: PersistedCalculatorState | null;
  readonly onLoad: (state: PersistedCalculatorState) => void;
}

export function PersistenceControls({ locale, calculatorId, state, onLoad }: PersistenceControlsProps) {
  const text = copy[locale];
  const [busy, setBusy] = useState<"save" | "load" | "delete" | null>(null);
  const [status, setStatus] = useState("");
  const endpoint = `/api/calculator-state/${encodeURIComponent(calculatorId)}`;

  const save = async () => {
    if (!state) {
      setStatus(text.calculateFirst);
      return;
    }
    setBusy("save");
    setStatus("");
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      setStatus(response.ok ? text.saved : text.failure);
    } catch {
      setStatus(text.failure);
    } finally {
      setBusy(null);
    }
  };

  const load = async () => {
    setBusy("load");
    setStatus("");
    try {
      const response = await fetch(endpoint, { method: "GET", cache: "no-store" });
      if (response.status === 404) {
        setStatus(text.missing);
        return;
      }
      if (!response.ok) {
        setStatus(text.failure);
        return;
      }
      const payload = await response.json() as { state?: unknown };
      const parsed = parsePersistedCalculatorState(payload.state);
      if (!parsed.ok || parsed.value.calculatorId !== calculatorId) {
        setStatus(text.invalid);
        return;
      }
      onLoad(parsed.value);
      setStatus(text.loaded);
    } catch {
      setStatus(text.failure);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    setStatus("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      setStatus(response.ok ? text.deleted : text.failure);
    } catch {
      setStatus(text.failure);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-7 border-t border-border pt-6">
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={save} disabled={busy !== null || state === null} data-testid="save-draft">
          {busy === "save" ? text.saving : text.save}
        </Button>
        <Button type="button" variant="outline" onClick={load} disabled={busy !== null} data-testid="load-draft">
          {busy === "load" ? text.loading : text.load}
        </Button>
        <Button type="button" variant="ghost" onClick={remove} disabled={busy !== null} data-testid="delete-draft">
          {busy === "delete" ? text.deleting : text.remove}
        </Button>
      </div>
      {state === null ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{text.calculateFirst}</p> : null}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{text.privacy}</p>
      <p className="mt-3 text-sm" aria-live="polite" aria-atomic="true" data-testid="persistence-status">{status}</p>
    </div>
  );
}
