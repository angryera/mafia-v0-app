"use client";

import { Swords } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { TRAIN_TYPES, KILLSKILL_CONTRACT_ABI } from "@/lib/contract";
import { KillSkillCard } from "@/components/killskill-card";
import { useChainAddresses } from "@/components/chain-provider";
import { COOLDOWN_READ_QUERY, cooldownSecondsLeft, formatCooldownClock, useCooldownRemaining } from "@/hooks/use-cooldown-remaining";

export function KillSkillGrid() {
  const { isConnected, address } = useAccount();
  const addresses = useChainAddresses();
  const { data: nextTrainTimeRaw, refetch: refetchCooldown } = useReadContract({
    address: addresses.killskill,
    abi: KILLSKILL_CONTRACT_ABI,
    functionName: "nextTrainTime",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address, ...COOLDOWN_READ_QUERY },
  });

  const cooldownSeconds = cooldownSecondsLeft(
    useCooldownRemaining(nextTrainTimeRaw === undefined ? undefined : Number(nextTrainTimeRaw)),
  );
  const cooldown =
    isConnected && cooldownSeconds !== null && cooldownSeconds > 0
      ? { seconds: cooldownSeconds, label: formatCooldownClock(cooldownSeconds) }
      : isConnected && cooldownSeconds === null
        ? { seconds: 1, label: "..." }
        : null;

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Swords className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Training Options
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Call{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
              trainSkill(trainType)
            </code>{" "}
            to level up
          </p>
        </div>
      </div>

      {cooldown && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2">
          <span className="text-xs font-medium text-amber-400">
            Training cooldown
          </span>
          <span className="font-mono text-xs text-amber-400 tabular-nums">
            {cooldown.label}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {TRAIN_TYPES.map((t) => (
          <KillSkillCard
            key={t.id}
            trainType={t}
            cooldown={cooldown}
            onCommitted={() => { void refetchCooldown(); }}
          />
        ))}
      </div>
    </div>
  );
}
