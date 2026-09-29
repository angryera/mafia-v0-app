"use client";

import { usePathname } from "next/navigation";
import { ProfileGate } from "@/components/profile-gate";
import { MinimalHeader } from "@/components/minimal-header";
import { DeadAccountFullscreenGate } from "@/components/dead-account-fullscreen-gate";
import { useDeadAccountMinimalLayout } from "@/hooks/use-dead-account-minimal-layout";
import { usePlayerDeadState } from "@/hooks/use-player-dead-state";
import { shouldShowDeadAccountFullscreen } from "@/lib/deadAccount";
import { TopBar, Sidebar } from "@/components/header";
import { JailRedirect } from "@/components/jail-redirect";
import { getTabFromPath } from "@/lib/navigation";
import { useCooldowns } from "@/hooks/use-cooldowns";

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  const pathname = usePathname();
  const activeTab = getTabFromPath(pathname);
  const { isDead, profileLoaded } = usePlayerDeadState();
  const cooldowns = useCooldowns();

  const deadGateActive = profileLoaded && isDead;
  const showFullscreen =
    deadGateActive && shouldShowDeadAccountFullscreen(pathname, true);
  const useMinimalLayout = useDeadAccountMinimalLayout();

  if (showFullscreen) {
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
    <div className="flex h-screen bg-background">
      <JailRedirect />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_-20%,rgb(var(--chain-accent)/0.07),transparent_32%),linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:auto,64px_64px,64px_64px]" />

      <Sidebar activeTab={activeTab} cooldowns={cooldowns} />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar activeTab={activeTab} cooldowns={cooldowns} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <ProfileGate>{children}</ProfileGate>
        </main>
      </div>
    </div>
  );
}
