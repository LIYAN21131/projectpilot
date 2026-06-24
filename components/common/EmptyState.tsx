import type { ReactNode } from "react";
import { FolderOpen } from "lucide-react";

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
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-panel)] p-8 text-center">
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--text-subtle)]">
        <FolderOpen size={19} strokeWidth={1.8} />
      </div>
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
