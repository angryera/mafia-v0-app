"use client";

import { usePathname } from "next/navigation";
import { shouldUseDeadAccountMinimalLayout } from "@/lib/deadAccount";
import { usePlayerDeadState } from "@/hooks/use-player-dead-state";

/** True when the dead-account minimal shell should be used (no nav sidebar). */
export function useDeadAccountMinimalLayout(): boolean {
  const pathname = usePathname();
  const { isDead, profileLoaded } = usePlayerDeadState();
  return profileLoaded && isDead && shouldUseDeadAccountMinimalLayout(pathname, true);
}
