interface ValidationSummaryProps {
  title: string;
  errors: readonly string[];
}

export function ValidationSummary({ title, errors }: ValidationSummaryProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div role="alert" className="rounded-[var(--radius-control)] border border-red-700/35 bg-red-50 p-4 text-red-950">
      <p className="text-sm font-bold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
