import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-sm font-medium text-[var(--text-muted)]">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
