"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  useWaitForTransactionReceipt,
  useReadContract,
  useReadContracts,
  useAccount,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { formatEther, parseEther } from "viem";
import {
  RANK_STAKE_ABI,
  RANK_NAMES,
  RANK_USD_REQUIREMENTS,
  RANK_ABI,
  ERC20_ABI,
  SWAP_ROUTER_ABI,
} from "@/lib/contract";
import {
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  TrendingUp,
  Shield,
  Percent,
  ArrowUp,
  ArrowDown,
  Timer,
  Coins,
  Building2,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
type StakeEntry = {
  rankLevel: number;
  amount: bigint;
  reductionPercent: bigint;
  timestamp: bigint;
};

type UserStakingInfo = {
  stakes: readonly StakeEntry[];
  currentStakeLevel: number;
  totalAmount: bigint;
  lastUnstakeTime: bigint;
};

type ReductionPercents = readonly [bigint, bigint, bigint, bigint];

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────
export function RankActivationAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData } = useAuth();

  // ── Contract reads ───────────────────────
  const { data: stakingInfoRaw, refetch: refetchStaking } = useReadContract({
    address: addresses.rankStake,
    abi: RANK_STAKE_ABI,
    functionName: "getUserStakingInfo",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address, refetchInterval: 15000 },
  });

  const { data: reductionRaw, refetch: refetchReduction } = useReadContract({
    address: addresses.rankStake,
    abi: RANK_STAKE_ABI,
    functionName: "getReductionPercents",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: isActiveRaw, refetch: refetchActive } = useReadContract({
    address: addresses.rankStake,
    abi: RANK_STAKE_ABI,
    functionName: "isUserRankActive",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: missingAmountRaw, refetch: refetchMissing } = useReadContract({
    address: addresses.rankStake,
    abi: RANK_STAKE_ABI,
    functionName: "getMissingAmount",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: mafiaTokenAddr } = useReadContract({
    address: addresses.rankStake,
    abi: RANK_STAKE_ABI,
    functionName: "mafia",
    query: { enabled: true },
  });

  const { data: unstakeCooldownRaw } = useReadContract({
    address: addresses.rankStake,
    abi: RANK_STAKE_ABI,
    functionName: "unstakeCooldown",
    query: { enabled: true },
  });

  const { data: rankLevelRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankLevel",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  // ERC20 allowance for MAFIA token -> rankStake contract
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: mafiaTokenAddr as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && mafiaTokenAddr ? [address, addresses.rankStake] : undefined,
    query: { enabled: !!address && !!mafiaTokenAddr },
  });

  const { data: mafiaBalanceRaw } = useReadContract({
    address: mafiaTokenAddr as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!mafiaTokenAddr },
  });

  // Fetch swap tokens from SwapRouter (same pattern as Premium)
  const { data: swapData } = useReadContract({
    address: addresses.swapRouter,
    abi: SWAP_ROUTER_ABI,
    functionName: "getSwapTokens",
    query: { refetchInterval: 30000 },
  });

  // ── Parsed values ─────────────────────────
  const stakingInfo = stakingInfoRaw as UserStakingInfo | undefined;
  // If contract returns 0 for currentStakeLevel, treat as 3 (first 3 ranks are free)
  const rawStakeLevel = stakingInfo ? Number(stakingInfo.currentStakeLevel) : 0;
  const currentStakeLevel = rawStakeLevel === 0 ? 3 : rawStakeLevel;
  const totalStaked = stakingInfo ? Number(formatEther(stakingInfo.totalAmount)) : 0;
  const lastUnstakeTime = stakingInfo ? Number(stakingInfo.lastUnstakeTime) : 0;
  const stakes = stakingInfo?.stakes ?? [];

  const reduction = reductionRaw as ReductionPercents | undefined;
  const totalReduction = reduction ? Number(reduction[0]) / 10 : 0;
  const familyReduction = reduction ? Number(reduction[1]) / 10 : 0;
  const equipmentReduction = reduction ? Number(reduction[2]) / 10 : 0;
  const buildingReduction = reduction ? Number(reduction[3]) / 10 : 0;

  // Parse MAFIA token price from SwapRouter getSwapTokens (same as Premium)
  const mafiaPriceUsd = useMemo(() => {
    if (!swapData || !mafiaTokenAddr) return 0;
    const result = swapData as unknown as readonly [
      readonly {
        name: string;
        decimal: number;
        tokenAddress: `0x${string}`;
        price: bigint;
        isStable: boolean;
        isEnabled: boolean;
      }[],
      readonly bigint[],
    ];
    if (!result[0] || !result[1]) return 0;
    const mafiaAddrLower = (mafiaTokenAddr as string).toLowerCase();
    const idx = result[0].findIndex(
      (t) => t.tokenAddress.toLowerCase() === mafiaAddrLower,
    );
    if (idx === -1) return 0;
    return Number(formatEther(result[1][idx]));
  }, [swapData, mafiaTokenAddr]);

  // Calculate next level and required MAFIA amount from USD / price
  const nextLevel = currentStakeLevel + 1;
  const nextUsdRequired = RANK_USD_REQUIREMENTS[nextLevel] ?? 0;
  const nextAmount = mafiaPriceUsd > 0 ? nextUsdRequired / mafiaPriceUsd : 0;

  const isActive = isActiveRaw === true;
  const missingAmount = missingAmountRaw !== undefined ? Number(formatEther(missingAmountRaw as bigint)) : 0;
  const allowance = allowanceRaw !== undefined ? Number(formatEther(allowanceRaw as bigint)) : 0;
  const mafiaBalance = mafiaBalanceRaw !== undefined ? Number(formatEther(mafiaBalanceRaw as bigint)) : 0;
  const rankLevel = rankLevelRaw !== undefined ? Number(rankLevelRaw) : null;
  const unstakeCooldown = unstakeCooldownRaw !== undefined ? Number(unstakeCooldownRaw) : 0;

  // ── Staked rank set (for rank list indicators) ──
  const stakedRanks = useMemo(() => {
    const set = new Set<number>();
    // First 3 ranks are always considered staked (1-indexed)
    set.add(1);
    set.add(2);
    set.add(3);
    for (const s of stakes) {
      set.add(Number(s.rankLevel));
    }
    return set;
  }, [stakes]);

  // ── Unstake cooldown check ──
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const iv = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  const canUnstakeAt = lastUnstakeTime + unstakeCooldown;
  const unstakeCooldownRemaining = canUnstakeAt > now ? canUnstakeAt - now : 0;

  // ── Write contract hooks ──────────────────
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const {
    writeContract: writeStake,
    data: stakeHash,
    isPending: stakePending,
    reset: resetStake,
  } = useChainWriteContract();

  const { isLoading: stakeConfirming, isSuccess: stakeConfirmed } =
    useWaitForTransactionReceipt({ hash: stakeHash });

  const {
    writeContract: writeUnstake,
    data: unstakeHash,
    isPending: unstakePending,
    reset: resetUnstake,
  } = useChainWriteContract();

  const { isLoading: unstakeConfirming, isSuccess: unstakeConfirmed } =
    useWaitForTransactionReceipt({ hash: unstakeHash });

  const {
    writeContract: writeAdjust,
    data: adjustHash,
    isPending: adjustPending,
    reset: resetAdjust,
  } = useChainWriteContract();

  const { isLoading: adjustConfirming, isSuccess: adjustConfirmed } =
    useWaitForTransactionReceipt({ hash: adjustHash });

  // Refetch on confirmed transactions
  useEffect(() => {
    if (approveConfirmed) {
      refetchAllowance();
      toast.success("MAFIA token approved!");
    }
  }, [approveConfirmed, refetchAllowance]);

  useEffect(() => {
    if (stakeConfirmed) {
      refetchStaking();
      refetchActive();
      refetchMissing();
      refetchReduction();
      refetchAllowance();
      toast.success("Staked successfully!");
      resetStake();
    }
  }, [stakeConfirmed, refetchStaking, refetchActive, refetchMissing, refetchReduction, refetchAllowance, resetStake]);

  useEffect(() => {
    if (unstakeConfirmed) {
      refetchStaking();
      refetchActive();
      refetchMissing();
      toast.success("Unstaked successfully!");
      resetUnstake();
    }
  }, [unstakeConfirmed, refetchStaking, refetchActive, refetchMissing, resetUnstake]);

  useEffect(() => {
    if (adjustConfirmed) {
      refetchStaking();
      refetchActive();
      refetchMissing();
      refetchAllowance();
      toast.success("Stake adjusted successfully!");
      resetAdjust();
    }
  }, [adjustConfirmed, refetchStaking, refetchActive, refetchMissing, refetchAllowance, resetAdjust]);

  // ── Handlers ──────────────────────────────
  const approveAmount = useMemo(() => {
    // Approve 1.1x the next required amount (or missing amount for adjust)
    const amt = nextAmount > 0 ? nextAmount : missingAmount;
    if (amt <= 0) return BigInt(0);
    return parseEther(String(Math.ceil(amt * 1.1)));
  }, [nextAmount, missingAmount]);

  function handleApproveAndStake() {
    if (!mafiaTokenAddr) return;
    if (allowance >= nextAmount * 1.1) {
      // Already approved enough, stake directly
      writeStake({
        address: addresses.rankStake,
        abi: RANK_STAKE_ABI,
        functionName: "stake",
        args: [],
      });
    } else {
      writeApprove({
        address: mafiaTokenAddr as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [addresses.rankStake, approveAmount],
      });
    }
  }

  function handleStakeAfterApproval() {
    writeStake({
      address: addresses.rankStake,
      abi: RANK_STAKE_ABI,
      functionName: "stake",
      args: [],
    });
  }

  function handleUnstake() {
    writeUnstake({
      address: addresses.rankStake,
      abi: RANK_STAKE_ABI,
      functionName: "unstake",
      args: [],
    });
  }

  function handleApproveAndAdjust() {
    if (!mafiaTokenAddr) return;
    const adjustApproveAmt = parseEther(String(Math.ceil(missingAmount * 1.1)));
    if (allowance >= missingAmount * 1.1) {
      writeAdjust({
        address: addresses.rankStake,
        abi: RANK_STAKE_ABI,
        functionName: "adjustStake",
        args: [],
      });
    } else {
      writeApprove({
        address: mafiaTokenAddr as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [addresses.rankStake, adjustApproveAmt],
      });
    }
  }

  function handleAdjustAfterApproval() {
    writeAdjust({
      address: addresses.rankStake,
      abi: RANK_STAKE_ABI,
      functionName: "adjustStake",
      args: [],
    });
  }

  const totalRanks = Object.keys(RANK_NAMES).length;
  const allMaxed = nextLevel > totalRanks;
  const isBusy =
    approvePending ||
    approveConfirming ||
    stakePending ||
    stakeConfirming ||
    unstakePending ||
    unstakeConfirming ||
    adjustPending ||
    adjustConfirming;

  // ── Format cooldown ──
  function fmtCooldown(secs: number) {
    if (secs <= 0) return "";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Connect your wallet to view rank activation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── Left: Rank List ── */}
      <div className="lg:w-72 shrink-0">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Rank Levels
            </h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {Object.entries(RANK_NAMES).map(([key, name]) => {
              const idx = Number(key);
              const isStaked = stakedRanks.has(idx);
              const isNextStake = idx === nextLevel && !allMaxed;
              const isCurrentRank = rankLevel !== null && idx === rankLevel;
              const isFreeRank = idx <= 3;
              const usd = RANK_USD_REQUIREMENTS[idx] ?? 0;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 border-b border-border/50 px-4 py-2.5 last:border-b-0 transition-colors",
                    isNextStake && "bg-primary/5",
                    isCurrentRank && "bg-primary/10"
                  )}
                >
                  {/* Indicator */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {isStaked ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : isNextStake ? (
                      <ArrowUp className="h-4 w-4 text-primary animate-pulse" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>

                  {/* Rank info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isStaked
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {name}
                      </span>
                      {isCurrentRank && (
                        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                          You
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="shrink-0 text-right">
                    {isFreeRank ? (
                      <span className="text-[10px] text-green-500 font-medium">
                        Free
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ${usd}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: Panels ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Total Rank Stake */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
            <Coins className="h-4 w-4 text-primary" />
            Total Rank Stake
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-foreground">
              {totalStaked.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-sm text-muted-foreground">MAFIA</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                isActive
                  ? "bg-green-500/15 text-green-500"
                  : "bg-red-400/15 text-red-400"
              )}
            >
              {isActive ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Active
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" /> Inactive
                </>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              Wallet MAFIA:{" "}
              <span className="font-mono text-foreground">
                {mafiaBalance.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </span>
          </div>
        </div>

        {/* Stake Reduction Info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
            <Percent className="h-4 w-4 text-primary" />
            Stake Reduction
          </h3>
          <div className="flex flex-col gap-3">
            <ReductionRow
              icon={<Users className="h-3.5 w-3.5" />}
              label="Family share"
              value={familyReduction}
              max={40}
            />
            <ReductionRow
              icon={<Building2 className="h-3.5 w-3.5" />}
              label="Equipped buildings"
              value={buildingReduction}
              max={25}
            />
            <ReductionRow
              icon={<Wrench className="h-3.5 w-3.5" />}
              label="Equipped $MAFIA"
              value={equipmentReduction}
              max={25}
            />
            <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs font-semibold text-foreground">
                Total reduction per stake
              </span>
              <span className="font-mono text-sm font-bold text-primary">
                {totalReduction.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Stake / Next Rank */}
        {!allMaxed && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
              <ArrowUp className="h-4 w-4 text-primary" />
              Stake Next Rank
            </h3>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/50 p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Next rank</span>
                <span className="text-sm font-semibold text-primary">
                  {RANK_NAMES[nextLevel] ?? `Rank ${nextLevel}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  USD requirement
                </span>
                <span className="font-mono text-sm text-foreground">
                  ${nextUsdRequired}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  MAFIA price
                </span>
                <span className="font-mono text-sm text-foreground">
                  {mafiaPriceUsd > 0
                    ? `$${mafiaPriceUsd.toFixed(6)}`
                    : "Loading..."}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-xs font-semibold text-foreground">
                  Required MAFIA
                </span>
                <span className="font-mono text-sm font-bold text-primary">
                  {nextAmount > 0
                    ? nextAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })
                    : "..."}
                </span>
              </div>
            </div>

            {/* Approve + Stake flow */}
            {approveConfirmed && !stakeConfirmed ? (
              <button
                onClick={handleStakeAfterApproval}
                disabled={isBusy}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all",
                  "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
                  isBusy && "cursor-not-allowed opacity-60"
                )}
              >
                {stakePending || stakeConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {stakeConfirming ? "Confirming..." : "Staking..."}
                  </>
                ) : (
                  <>
                    <ArrowUp className="h-4 w-4" />
                    Stake Now
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApproveAndStake}
                disabled={isBusy || nextAmount <= 0}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all",
                  "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
                  (isBusy || nextAmount <= 0) && "cursor-not-allowed opacity-60"
                )}
              >
                {approvePending || approveConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {approveConfirming ? "Confirming approval..." : "Approving..."}
                  </>
                ) : stakePending || stakeConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {stakeConfirming ? "Confirming stake..." : "Staking..."}
                  </>
                ) : allowance >= nextAmount * 1.1 ? (
                  <>
                    <ArrowUp className="h-4 w-4" />
                    Stake {RANK_NAMES[nextLevel]}
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Approve & Stake {RANK_NAMES[nextLevel]}
                  </>
                )}
              </button>
            )}

            {stakeHash && (
              <a
                href={`${explorer}/tx/${stakeHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-center text-xs text-primary hover:underline"
              >
                View transaction
              </a>
            )}
          </div>
        )}

        {/* Unstake */}
        {currentStakeLevel > 2 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
              <ArrowDown className="h-4 w-4 text-red-400" />
              Unstake
            </h3>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Unstake MAFIA from your latest staked rank (
              <span className="font-semibold text-foreground">
                {RANK_NAMES[currentStakeLevel]}
              </span>
              ). After unstaking, a cooldown applies before you can unstake
              again.
            </p>

            {unstakeCooldownRemaining > 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background/50 p-3">
                <Timer className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">
                  Cooldown:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {fmtCooldown(unstakeCooldownRemaining)}
                  </span>
                </span>
              </div>
            ) : (
              <button
                onClick={handleUnstake}
                disabled={isBusy}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.98]",
                  isBusy && "cursor-not-allowed opacity-60"
                )}
              >
                {unstakePending || unstakeConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {unstakeConfirming ? "Confirming..." : "Unstaking..."}
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4" />
                    Unstake {RANK_NAMES[currentStakeLevel]}
                  </>
                )}
              </button>
            )}

            {unstakeHash && (
              <a
                href={`${explorer}/tx/${unstakeHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-center text-xs text-primary hover:underline"
              >
                View transaction
              </a>
            )}
          </div>
        )}

        {/* Add to Rank Stakes (Adjust) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Add to Rank Stakes
          </h3>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            If any of your reduction mechanisms change, you will no longer be
            active. You can add to your stake here to become active again.
          </p>

          {missingAmount > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
                <span className="text-xs text-muted-foreground">
                  Missing MAFIA
                </span>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {missingAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {adjustConfirmed ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-semibold text-green-500">
                    Stakes adjusted successfully!
                  </span>
                </div>
              ) : approveConfirmed && !adjustConfirmed ? (
                <button
                  onClick={handleAdjustAfterApproval}
                  disabled={isBusy}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all",
                    "bg-amber-500 text-amber-950 hover:bg-amber-400 active:scale-[0.98]",
                    isBusy && "cursor-not-allowed opacity-60"
                  )}
                >
                  {adjustPending || adjustConfirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {adjustConfirming ? "Confirming..." : "Adjusting..."}
                    </>
                  ) : (
                    "Adjust Stake Now"
                  )}
                </button>
              ) : (
                <button
                  onClick={handleApproveAndAdjust}
                  disabled={isBusy}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all",
                    "bg-amber-500 text-amber-950 hover:bg-amber-400 active:scale-[0.98]",
                    isBusy && "cursor-not-allowed opacity-60"
                  )}
                >
                  {approvePending || approveConfirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {approveConfirming
                        ? "Confirming approval..."
                        : "Approving..."}
                    </>
                  ) : adjustPending || adjustConfirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {adjustConfirming ? "Confirming..." : "Adjusting..."}
                    </>
                  ) : allowance >= missingAmount * 1.1 ? (
                    "Adjust Stake"
                  ) : (
                    "Approve & Adjust Stake"
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs font-semibold text-green-500">
                Stakes in good standing
              </span>
            </div>
          )}
        </div>

        {/* Stake History */}
        {stakes.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              Stake History
            </h3>
            <div className="flex flex-col gap-2">
              {[...stakes].reverse().map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">
                      {RANK_NAMES[Number(s.rankLevel)] ?? `Rank ${Number(s.rankLevel)}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(Number(s.timestamp) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {Number(formatEther(s.amount)).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      MAFIA
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      -{(Number(s.reductionPercent) / 10).toFixed(1)}% reduction
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reduction row sub-component ─────────────
function ReductionRow({
  icon,
  label,
  value,
  max,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon} {label}
        </span>
        <span className="font-mono text-xs text-foreground">
          {value.toFixed(1)}% / {max}%
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
