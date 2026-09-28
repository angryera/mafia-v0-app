"use client";

import { useReadContract, useAccount } from "wagmi";
import { CONTRACT_ABI, CRIME_TYPES } from "@/lib/contract";
import { useChainAddresses } from "@/components/chain-provider";
import { COOLDOWN_READ_QUERY, cooldownSecondsLeft, formatCooldownClock, useCooldownRemaining } from "@/hooks/use-cooldown-remaining";
import { CrimeCard } from "./crime-card";
import { Timer } from "lucide-react";

function useCrimeCooldown() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();

  const { data: nextCrimeTimestamp, refetch } = useReadContract({
    address: addresses.crime,
    abi: CONTRACT_ABI,
    functionName: "nextCrimeTime",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
      ...COOLDOWN_READ_QUERY,
    },
  });

  const remaining = useCooldownRemaining(
    nextCrimeTimestamp === undefined ? undefined : Number(nextCrimeTimestamp),
  );

  const totalSeconds = cooldownSecondsLeft(remaining);
  const isReady = totalSeconds === 0;
  const onCooldown = isConnected && totalSeconds !== 0;

  return { isConnected, totalSeconds, isReady, onCooldown, refetchCooldown: refetch };
}

export function CrimeGrid() {
  const { isConnected, totalSeconds, isReady, onCooldown, refetchCooldown } =
    useCrimeCooldown();

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Available Crimes
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Select a crime type to call{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
              makeCrime(uint8)
            </code>
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {CRIME_TYPES.length} types
        </span>
      </div>

      {isConnected && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Timer
            className={`h-5 w-5 shrink-0 ${isReady ? "text-green-400" : "text-primary"}`}
          />
          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm text-muted-foreground">Next Crime</span>
            {totalSeconds === null ? (
              <span className="font-mono text-sm text-muted-foreground">...</span>
            ) : isReady ? (
              <span className="font-mono text-sm font-semibold text-green-400">
                Now
              </span>
            ) : (
              <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                {formatCooldownClock(totalSeconds)}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {CRIME_TYPES.map((crime) => (
          <CrimeCard
            key={crime.id}
            crime={crime}
            disabled={onCooldown}
            onCommitted={() => { void refetchCooldown(); }}
          />
        ))}
      </div>
    </div>
  );
}
