import type { ReactNode } from "react";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { TopBar } from "./TopBar";

export function AppShell({
  children,
  searchPlaceholder,
  hideSidebar = false,
  currentProjectId,
}: {
  children: ReactNode;
  searchPlaceholder?: string;
  hideSidebar?: boolean;
  currentProjectId?: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {hideSidebar ? null : <SidebarNav />}
      <div className={hideSidebar ? "" : "md:pl-60"}>
        <TopBar context={searchPlaceholder} currentProjectId={currentProjectId} />
        <main className="mx-auto max-w-[1280px] px-4 py-6 pb-24 sm:px-6 md:px-8 md:py-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
