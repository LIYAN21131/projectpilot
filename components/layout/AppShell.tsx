import type { ReactNode } from "react";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { TopBar } from "./TopBar";

export function AppShell({
  children,
  searchPlaceholder,
}: {
  children: ReactNode;
  searchPlaceholder?: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SidebarNav />
      <div className="md:pl-60">
        <TopBar context={searchPlaceholder} />
        <main className="mx-auto max-w-[1440px] px-4 py-6 pb-24 sm:px-6 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
