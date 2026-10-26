"use client";

import { useEffect, useRef, useState } from "react";

import { RewardGlyph } from "@/components/profile-unbox/reward-glyph";
import {
  formatReward,
  markerPositionAt,
  REVEAL_INTERVAL_MS,
  REWARD_KEYS,
  REWARD_LABELS,
  valueAtMarker,
  type ProfileTier,
  type ProfileUnboxResult,
} from "@/lib/profile-unbox";
import { cn } from "@/lib/utils";

export function ProfileRewardReveal({
  result,
  tier,
  onRevealComplete,
}: {
  result: ProfileUnboxResult;
  tier: ProfileTier;
  onRevealComplete: () => void;
}) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [activeElapsedMs, setActiveElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const finished = revealedCount === REWARD_KEYS.length;

  useEffect(() => {
    setRevealedCount(0);
    setActiveElapsedMs(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealedCount(REWARD_KEYS.length);
      return;
    }

    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const count = Math.min(REWARD_KEYS.length, Math.floor(elapsed / REVEAL_INTERVAL_MS));
      setRevealedCount(count);
      setActiveElapsedMs(elapsed - count * REVEAL_INTERVAL_MS);
      if (count === REWARD_KEYS.length) {
        window.clearInterval(timer);
        timerRef.current = null;
      }
    }, 32);
    timerRef.current = timer;
    return () => {
      window.clearInterval(timer);
      if (timerRef.current === timer) timerRef.current = null;
    };
  }, [result.transactionHash, result.tierId]);

  useEffect(() => {
    if (finished) onRevealComplete();
  }, [finished, onRevealComplete]);

  const skipReveal = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRevealedCount(REWARD_KEYS.length);
  };

  return (
    <section aria-label="Profile rewards" className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {finished ? "Your profile is revealed." : `Your ${tier.label} rewards are being revealed.`}
      </p>
      <div
        className="h-1 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Rewards revealed"
        aria-valuenow={revealedCount}
        aria-valuemin={0}
        aria-valuemax={REWARD_KEYS.length}
      >
        <span
          className="block h-full"
          style={{ width: `${(revealedCount / REWARD_KEYS.length) * 100}%`, background: "var(--unbox-accent)" }}
        />
      </div>
      <div className="space-y-3">
        {REWARD_KEYS.map((key, index) => {
          const settled = index < revealedCount;
          const rolling = index === revealedCount && !finished;
          const { min, max } = tier.rewards[key];
          const fixed = min === max;
          const markerPosition = fixed ? 50 : ((result.rewards[key] - min) / (max - min)) * 100;
          const currentPosition = rolling && !fixed ? markerPositionAt(activeElapsedMs, markerPosition) : markerPosition;
          const currentValue = valueAtMarker(min, max, currentPosition);
          const shown = settled
            ? formatReward(key, result.rewards[key])
            : rolling
              ? formatReward(key, currentValue)
              : "Sealed";

          return (
            <div
              key={key}
              className={cn("rounded-lg border border-white/10 px-3 py-2", settled && "border-[var(--unbox-accent)]")}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="w-6 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <RewardGlyph rewardKey={key} />
                <span className="flex-1">{REWARD_LABELS[key]}</span>
                <strong aria-live={settled && index === revealedCount - 1 ? "polite" : "off"}>{shown}</strong>
              </div>
              <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[10px] text-muted-foreground">
                <span>{formatReward(key, min)}</span>
                <div className="relative h-1.5 rounded-full bg-white/10">
                  <span
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                    style={{ left: `${currentPosition}%`, background: "var(--unbox-accent)" }}
                  />
                </div>
                <span>{fixed ? "Fixed" : formatReward(key, max)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{finished ? "All rewards revealed." : `Revealing ${Math.min(revealedCount + 1, REWARD_KEYS.length)} of ${REWARD_KEYS.length}`}</span>
        {!finished && (
          <button type="button" className="underline underline-offset-2" onClick={skipReveal}>
            Skip to the end
          </button>
        )}
      </div>
    </section>
  );
}
