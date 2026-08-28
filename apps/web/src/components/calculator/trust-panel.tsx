import type { ReactNode } from "react";

interface TrustPanelProps {
  title: string;
  children: ReactNode;
  tone?: "default" | "warning";
}

export function TrustPanel({ title, children, tone = "default" }: TrustPanelProps) {
  return (
    <aside
      className={`min-w-0 rounded-[var(--radius-card)] border p-5 sm:p-6 ${tone === "warning" ? "border-amber-700/35 bg-amber-50 text-amber-950" : "border-border bg-card"}`}
    >
      <h2 className="text-base font-bold tracking-[-0.02em]">{title}</h2>
      <div className="mt-2 text-sm leading-6 opacity-85">{children}</div>
    </aside>
  );
}
