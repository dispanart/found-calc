import type { InputHTMLAttributes } from "react";

interface CalculatorFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  helper?: string | undefined;
  error?: string | undefined;
}

export function CalculatorField({ id, label, helper, error, className, ...inputProps }: CalculatorFieldProps) {
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {helper === undefined ? null : (
        <p id={helperId} className="mt-1 text-xs leading-5 text-muted-foreground">
          {helper}
        </p>
      )}
      <input
        {...inputProps}
        id={id}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy}
        className={`mt-2 min-h-11 w-full min-w-0 rounded-[var(--radius-control)] border bg-background px-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 ${error === undefined ? "border-border" : "border-red-700"} ${className ?? ""}`}
      />
      {error === undefined ? null : (
        <p id={errorId} className="mt-2 text-sm leading-5 text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
