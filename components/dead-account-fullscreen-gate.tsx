"use client";

import { MinimalHeader } from "@/components/minimal-header";
import { DeadAccountScreen } from "@/components/dead-account-screen";
import { usePlayerDeadState } from "@/hooks/use-player-dead-state";

export function DeadAccountFullscreenGate() {
  const { address, profileName } = usePlayerDeadState();

  return (
    <div className="fixed inset-0 z-[1300] flex flex-col bg-black">
      <MinimalHeader />
      <DeadAccountScreen
        variant="fullscreen"
        showActions
        victimAddress={address}
        victimName={profileName}
      />
    </div>
  );
}
