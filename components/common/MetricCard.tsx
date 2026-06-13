import type { ReactNode } from "react";
import Link from "next/link";

export function MetricCard({
  title,
  value,
  helper,
  icon,
  href,
}: {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded border border-[var(--border)] bg-white p-5 transition hover:border-[var(--primary)] hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex size-11 items-center justify-center rounded bg-[var(--primary-soft)] text-[var(--primary)]">
          {icon}
        </div>
        <span className="text-sm font-medium text-[var(--text-muted)]">{title}</span>
      </div>
      <div className="mt-8 h-1.5 rounded-full bg-[var(--surface-muted)]">
        <div className="h-1.5 w-1/3 rounded-full bg-[var(--primary)] transition group-hover:w-2/3" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-xl font-semibold">{value}</span>
        <span className="text-xs text-[var(--text-muted)]">{helper}</span>
      </div>
    </Link>
  );
}
