"use client";

import { useReadContract, useAccount } from "wagmi";
import { NICKCAR_CONTRACT_ABI, NICKCAR_TYPES } from "@/lib/contract";
import { useChainAddresses } from "@/components/chain-provider";
import { COOLDOWN_READ_QUERY, cooldownSecondsLeft, formatCooldownClock, useCooldownRemaining } from "@/hooks/use-cooldown-remaining";
import { NickCarCard } from "./nickcar-card";
import { Timer } from "lucide-react";

function useNickCooldown() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();

  const { data: nextNickTimestamp, refetch } = useReadContract({
    address: addresses.nickcar,
    abi: NICKCAR_CONTRACT_ABI,
    functionName: "nextNickTime",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
      ...COOLDOWN_READ_QUERY,
    },
  });

  const remaining = useCooldownRemaining(
    nextNickTimestamp === undefined ? undefined : Number(nextNickTimestamp),
  );

  const totalSeconds = cooldownSecondsLeft(remaining);
  const isReady = totalSeconds === 0;
  const onCooldown = isConnected && totalSeconds !== 0;

  return { isConnected, totalSeconds, isReady, onCooldown, refetchCooldown: refetch };
}

export function NickCarAction() {
  const { isConnected, totalSeconds, isReady, onCooldown, refetchCooldown } =
    useNickCooldown();

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Choose Your Method
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Select a crime type to call{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
              nickCar(uint8,string,bytes)
            </code>
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {NICKCAR_TYPES.length} types
        </span>
      </div>

      {isConnected && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Timer
            className={`h-5 w-5 shrink-0 ${isReady ? "text-green-400" : "text-primary"}`}
          />
          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm text-muted-foreground">Next Nick</span>
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
        {NICKCAR_TYPES.map((carCrime) => (
          <NickCarCard
            key={carCrime.id}
            carCrime={carCrime}
            disabled={onCooldown}
            onCommitted={() => { void refetchCooldown(); }}
          />
        ))}
      </div>
    </div>
  );
}
