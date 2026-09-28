"use client";

import { useEffect, useState } from "react";

/**
 * Milliseconds left until a unix-second deadline.
 * An unknown deadline leaves the timer at 0, matching the page countdowns
 * this replaced. Navigation badges stay on `useCooldowns`.
 */
export function useCooldownRemaining(endUnixSeconds: number | undefined): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (endUnixSeconds === undefined) return;

    const cooldownEnd = endUnixSeconds * 1000;
    const tick = () => {
      const diff = cooldownEnd - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };

    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [endUnixSeconds]);

  return remaining;
}
