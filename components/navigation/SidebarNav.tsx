"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BriefcaseBusiness, FileText, LayoutDashboard, MessageSquareText } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/projects", label: "项目档案", icon: Archive },
  { href: "/resume", label: "简历优化", icon: FileText },
  { href: "/interview", label: "面试准备", icon: MessageSquareText },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-[var(--border)] bg-white md:flex">
        <div className="border-b border-[var(--border-soft)] px-5 py-5">
          <Link href="/projects" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
              <BriefcaseBusiness size={20} />
            </div>
            <div>
              <span className="block text-lg font-semibold tracking-tight">ProjectPilot</span>
              <span className="block text-xs text-[var(--text-subtle)]">项目表达工作台</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href === "/projects" && pathname.startsWith("/projects/"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--border)] bg-white md:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href === "/projects" && pathname.startsWith("/projects/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors ${
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
