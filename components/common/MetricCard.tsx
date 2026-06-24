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
      className="group block rounded-lg border border-[var(--border)] bg-white p-5 transition-colors duration-200 hover:border-[#b7bcc6] hover:bg-[var(--surface-panel)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600/15"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex size-10 items-center justify-center rounded-lg border border-blue-100 bg-[var(--primary-soft)] text-[var(--primary)]">
          {icon}
        </div>
        <span className="text-sm font-medium text-[var(--text-muted)]">{title}</span>
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        <span className="text-xs text-[var(--text-muted)]">{helper}</span>
      </div>
    </Link>
  );
}
