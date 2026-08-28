import type { ReactNode } from "react";

interface ResultPanelProps {
  title: string;
  children: ReactNode;
}

export function ResultPanel({ title, children }: ResultPanelProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="min-w-0 rounded-[var(--radius-card)] border border-primary/20 bg-trust/45 p-5 sm:p-6"
    >
      <h2 className="text-lg font-bold tracking-[-0.025em] text-trust-foreground">{title}</h2>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
