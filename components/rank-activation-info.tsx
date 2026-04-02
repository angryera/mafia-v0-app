"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import {
  RANK_STAKE_ABI,
  RANK_NAMES,
  RANK_ABI,
} from "@/lib/contract";
import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import {
  Shield,
  TrendingUp,
  Coins,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function RankActivationInfo() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();

  const { data: rankLevelRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankLevel",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: isActiveRaw } = useReadContract({
    address: addresses.rankStake,
    abi: RANK_STAKE_ABI,
    functionName: "isUserRankActive",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: stakingInfoRaw } = useReadContract({
    address: addresses.rankStake,
    abi: RANK_STAKE_ABI,
    functionName: "getUserStakingInfo",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const rankLevel = rankLevelRaw !== undefined ? Number(rankLevelRaw) : null;
  const isActive = isActiveRaw === true;
  const stakingInfo = stakingInfoRaw as
    | {
        stakes: readonly { rankLevel: number; amount: bigint; reductionPercent: bigint; timestamp: bigint }[];
        currentStakeLevel: number;
        totalAmount: bigint;
        lastUnstakeTime: bigint;
      }
    | undefined;

  const totalStaked = stakingInfo
    ? Number(formatEther(stakingInfo.totalAmount))
    : 0;
  // If contract returns 0 for currentStakeLevel, treat as 3 (first 3 ranks are free)
  const rawStakeLevel = stakingInfo
    ? Number(stakingInfo.currentStakeLevel)
    : 0;
  const currentStakeLevel = rawStakeLevel === 0 ? 3 : rawStakeLevel;

  return (
    <div className="flex flex-col gap-4">
      {/* Contract address */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Rank Stake Contract
        </h3>
        <CopyableAddress address={addresses.rankStake} />
      </div>

      {/* Current rank */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Current Rank
        </h3>
        {isConnected && rankLevel !== null ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Level</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {rankLevel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Name</span>
              <span className="text-sm font-semibold text-primary">
                {RANK_NAMES[rankLevel] ?? `Rank ${rankLevel}`}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Connect wallet to view rank.
          </p>
        )}
      </div>

      {/* Staking status */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Staking Status
        </h3>
        {isConnected ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Active</span>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-semibold",
                  isActive ? "text-green-500" : "text-red-400"
                )}
              >
                {isActive ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" /> No
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Stake Level</span>
              <span className="font-mono text-sm text-foreground">
                {currentStakeLevel} / {Object.keys(RANK_NAMES).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Staked Rank
              </span>
              <span className="text-sm font-semibold text-primary">
                {RANK_NAMES[currentStakeLevel] ?? "N/A"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Connect wallet to view status.
          </p>
        )}
      </div>

      {/* Total staked */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          Total Staked
        </h3>
        {isConnected ? (
          <p className="font-mono text-lg font-bold text-foreground">
            {totalStaked.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-xs text-muted-foreground">MAFIA</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Connect wallet to view.
          </p>
        )}
      </div>
    </div>
  );
}
