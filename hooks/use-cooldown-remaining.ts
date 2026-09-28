"use client";

import { useEffect, useState } from "react";

/**
 * Contract cooldown reads must ignore the app-wide 60s query cache.
 * Navigating onto a page otherwise keeps the previous deadline and paints
 * "ready" until that cache expires.
 */
export const COOLDOWN_READ_QUERY = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchInterval: 10_000,
};

function remainingMs(endUnixSeconds: number | undefined): number | null {
  if (endUnixSeconds === undefined || !Number.isFinite(endUnixSeconds)) return null;
  const diff = endUnixSeconds * 1000 - Date.now();
  return diff > 0 ? diff : 0;
}

/**
 * Milliseconds left until a unix-second deadline.
 * `null` means the deadline is not known yet, so callers must not treat it as ready.
 */
export function useCooldownRemaining(endUnixSeconds: number | undefined): number | null {
  const [remaining, setRemaining] = useState<number | null>(() => remainingMs(endUnixSeconds));

  useEffect(() => {
    if (endUnixSeconds === undefined) {
      setRemaining(null);
      return;
    }

    const tick = () => setRemaining(remainingMs(endUnixSeconds));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [endUnixSeconds]);

  return remaining;
}

export function cooldownSecondsLeft(remainingMsValue: number | null): number | null {
  if (remainingMsValue === null) return null;
  return Math.ceil(remainingMsValue / 1000);
}

/** `mm:ss`, or `h:mm:ss` once an hour remains. */
export function formatCooldownClock(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${clock}` : clock;
}
