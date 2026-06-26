"use client";

import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";
import { getProjectNameDisplay } from "@/lib/project/projectName";

export function TopBar({ context, currentProjectId }: { context?: string; currentProjectId?: string }) {
  const { projects } = useProjectPilotStore();
  const selectedProject = currentProjectId
    ? projects.find((project) => project.id === currentProjectId)
    : undefined;
  const fallbackProject = selectedProject ?? projects[0];
  const currentProject = fallbackProject ? getProjectNameDisplay(fallbackProject.name) : "未整理";

  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur sm:px-6 md:px-8">
      <Link href="/projects" className="flex items-center gap-2.5 md:hidden">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
          <BriefcaseBusiness size={17} />
        </span>
        <span className="font-semibold tracking-tight">ProjectPilot</span>
      </Link>
      <div className="hidden min-w-0 md:block">
        <p className="text-xs font-medium text-[var(--text-subtle)]">{context ?? "项目工作台"}</p>
        <p className="mt-0.5 max-w-lg truncate text-sm font-medium text-[var(--foreground)]">
          当前项目：{currentProject}
        </p>
      </div>
      <div className="hidden items-center gap-2 text-xs text-[var(--text-muted)] sm:flex">
        <span className="size-2 rounded-full bg-[var(--success)]" />
        数据保存在当前浏览器
      </div>
    </header>
  );
}
