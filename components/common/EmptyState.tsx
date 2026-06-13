import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded border border-[var(--border)] bg-white p-8 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded bg-[var(--surface-muted)] text-[var(--text-subtle)]">
        —
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
