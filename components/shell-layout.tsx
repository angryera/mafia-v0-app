"use client";

import { usePathname } from "next/navigation";
import { TopBar, Sidebar, getTabFromPath } from "@/components/header";
import type { Tab } from "@/components/header";
import { useChain } from "@/components/chain-provider";

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  const pathname = usePathname();
  const activeTab = getTabFromPath(pathname);
  const { chainConfig } = useChain();

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <TopBar activeTab={activeTab} />

      {/* Subtle grid pattern */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(240,185,11,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(240,185,11,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Main layout: sidebar + content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <Sidebar activeTab={activeTab} />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
