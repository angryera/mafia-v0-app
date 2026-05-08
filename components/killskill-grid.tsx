"use client";

import { useEffect, useMemo, useState } from "react";
import { Swords } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { TRAIN_TYPES, KILLSKILL_CONTRACT_ABI } from "@/lib/contract";
import { KillSkillCard } from "@/components/killskill-card";
import { useChainAddresses } from "@/components/chain-provider";

export function KillSkillGrid() {
  const { isConnected, address } = useAccount();
  const addresses = useChainAddresses();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: nextTrainTimeRaw } = useReadContract({
    address: addresses.killskill,
    abi: KILLSKILL_CONTRACT_ABI,
    functionName: "nextTrainTime",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address, refetchInterval: 15_000 },
  });

  const nextTrainTime =
    nextTrainTimeRaw !== undefined ? Number(nextTrainTimeRaw) : 0;
  const cooldownSeconds = Math.max(0, nextTrainTime - now);

  const cooldown = useMemo(() => {
    if (!isConnected || cooldownSeconds <= 0) return null;
    const m = Math.floor(cooldownSeconds / 60);
    const s = cooldownSeconds % 60;
    return { seconds: cooldownSeconds, label: `${m}:${String(s).padStart(2, "0")}` };
  }, [cooldownSeconds, isConnected]);

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
          <KillSkillCard key={t.id} trainType={t} cooldown={cooldown} />
        ))}
      </div>
    </div>
  );
}
