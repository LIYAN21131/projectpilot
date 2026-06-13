"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BriefcaseBusiness,
  FileText,
  FolderOpen,
  Grid2X2,
  HelpCircle,
  Plus,
  Settings,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/common/Button";

const navItems = [
  { href: "/dashboard", label: "控制台", icon: Grid2X2 },
  { href: "/projects", label: "项目档案", icon: Archive },
  { href: "/resume", label: "简历优化", icon: FileText },
  { href: "/interview", label: "面试准备", icon: Users },
  { href: "/assets", label: "项目资产库", icon: FolderOpen },
  { href: "/profile", label: "个人中心", icon: User },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--surface-panel)] md:flex">
        <div className="px-6 py-7">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded bg-[var(--primary)] text-white">
              <BriefcaseBusiness size={20} />
            </div>
            <span className="text-2xl font-semibold tracking-tight">ProjectPilot</span>
          </Link>
        </div>

        <div className="px-4 pb-5">
          <Link href="/projects">
            <Button className="w-full">
              <Plus size={18} />
              新建项目
            </Button>
          </Link>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 border-l-2 px-5 py-3 text-sm font-medium transition ${
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <div className="space-y-1">
            <button className="flex w-full items-center gap-3 rounded px-2 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]">
              <Settings size={19} />
              设置
            </button>
            <button className="flex w-full items-center gap-3 rounded px-2 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]">
              <HelpCircle size={19} />
              帮助中心
            </button>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-[var(--border)] bg-white md:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium transition ${
                active
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              <Icon size={18} />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
