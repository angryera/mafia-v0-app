"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  HELPERBOT_CONTRACT_ABI,
  parseHelperBotInfo,
  type HELPER_BOTS,
} from "@/lib/contract";
import { useChainAddresses } from "@/components/chain-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HelperBot = (typeof HELPER_BOTS)[number];

export function HelperBotListRow({
  bot,
  onOpenHire,
}: {
  bot: HelperBot;
  onOpenHire: () => void;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const addresses = useChainAddresses();

  const [isRunning, setIsRunning] = useState(false);
  const [endTimestamp, setEndTimestamp] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const fetchBotInfo = useCallback(async () => {
    if (!address || !publicClient) return;
    try {
      const result = await publicClient.readContract({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: bot.infoFn,
        args: [address],
      });
      const info = parseHelperBotInfo(result);
      setIsRunning(info.isRunning === true);
      setEndTimestamp(info.endTimestamp);
    } catch {
      // silently fail
    }
  }, [address, publicClient, addresses.helperbot, bot.infoFn]);

  useEffect(() => {
    fetchBotInfo();
    const infoInterval = setInterval(fetchBotInfo, 15000);
    return () => clearInterval(infoInterval);
  }, [fetchBotInfo]);

  useEffect(() => {
    const clockInterval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const timeLeft = endTimestamp > now ? endTimestamp - now : 0;
  const canFinish = isRunning && timeLeft === 0;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{bot.label}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              isRunning
                ? canFinish
                  ? "bg-green-400/10 text-green-400"
                  : "bg-chain-accent/10 text-chain-accent"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {isRunning ? (canFinish ? "Ready" : "Running") : "Idle"}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{bot.description}</p>
        {isRunning && !canFinish && (
          <p className="mt-1 text-[11px] text-chain-accent">Time left: {formatTime(timeLeft)}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canFinish && (
          <Button type="button" size="sm" variant="secondary" onClick={onOpenHire}>
            Finish
          </Button>
        )}

        {!canFinish && (
          <Button type="button" size="sm" onClick={onOpenHire}>
            Hire Now
          </Button>
        )}
      </div>
    </div>
  );
}
