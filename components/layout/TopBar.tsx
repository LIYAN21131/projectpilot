"use client";

import { Bell, Grid3X3, Search, UserCircle } from "lucide-react";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";

export function TopBar({ context }: { context?: string }) {
  const { projects } = useProjectPilotStore();
  const currentProject = projects[0]?.name ?? "未整理";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-4 sm:px-6 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-7">
        <div className="relative min-w-0 flex-1 sm:max-w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" size={18} />
          <input
            className="focus-ring w-full rounded border border-transparent bg-[var(--surface-muted)] py-2 pl-10 pr-3 text-sm"
            placeholder={context ?? "搜索项目..."}
          />
        </div>
        <div className="hidden max-w-xs items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-panel)] px-4 py-1.5 text-sm lg:flex">
          <span className="size-2 rounded-full bg-[var(--success)]" />
          <span className="text-[var(--text-muted)]">当前项目：</span>
          <span className="max-w-48 truncate font-medium">{currentProject}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[var(--text-muted)] sm:gap-5">
        <Bell size={21} />
        <Grid3X3 size={21} className="hidden sm:block" />
        <div className="flex size-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--primary)] text-xs font-bold text-white">
          <UserCircle size={20} />
        </div>
      </div>
    </header>
  );
}
