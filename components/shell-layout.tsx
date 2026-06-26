"use client";

import { usePathname } from "next/navigation";
import { TopBar, Sidebar, getTabFromPath } from "@/components/header";
import { ProfileGate } from "@/components/profile-gate";
import { MinimalHeader } from "@/components/minimal-header";
import { DeadAccountFullscreenGate } from "@/components/dead-account-fullscreen-gate";
import { usePlayerDeadState } from "@/hooks/use-player-dead-state";
import {
  shouldShowDeadAccountFullscreen,
  shouldUseDeadAccountMinimalLayout,
} from "@/lib/deadAccount";

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  const pathname = usePathname();
  const activeTab = getTabFromPath(pathname);
  const { isDead, profileLoaded } = usePlayerDeadState();

  const deadGateActive = profileLoaded && isDead;
  const showFullscreen =
    deadGateActive && shouldShowDeadAccountFullscreen(pathname, true);
  const useMinimalLayout =
    deadGateActive && shouldUseDeadAccountMinimalLayout(pathname, true);

  if (!showFullscreen) {
    return <DeadAccountFullscreenGate />;
  }

  if (useMinimalLayout) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <MinimalHeader />
        <main className="flex-1 overflow-y-auto">
          <ProfileGate>{children}</ProfileGate>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar activeTab={activeTab} />

      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(240,185,11,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(240,185,11,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} />

        <main className="flex-1 overflow-y-auto">
          <ProfileGate>{children}</ProfileGate>
        </main>
      </div>
    </div>
  );
}
