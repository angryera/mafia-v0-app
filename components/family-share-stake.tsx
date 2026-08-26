"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { ERC20_ABI, FAMILY_SHARE_STAKE_ABI } from "@/lib/contract";
import { cn } from "@/lib/utils";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Percent,
  PieChart,
  Timer,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  formatUnits,
  maxUint256,
  parseEther,
  zeroAddress,
} from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";

const STAKE_REFETCH_MS = 15_000;
/** Rank activation family-share reduction is linear with fill, capped at 40%. */
const FAMILY_SHARE_REDUCTION_CAP_PERCENT = 40;

type FamilyStakeEntry = {
  id: bigint;
  user: `0x${string}`;
  familyId: bigint;
  amount: bigint;
  startedAt: bigint;
  endedAt: bigint;
  isActive: boolean;
};

function parseStakeAmount(raw: string): bigint | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  try {
    const wei = parseEther(trimmed);
    return wei > BigInt(0) ? wei : null;
  } catch {
    return null;
  }
}

function formatMafiaWei(wei: bigint | undefined, digits = 2): string {
  if (wei === undefined) return "—";
  return Number(formatUnits(wei, 18)).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatLongCooldown(seconds: number): string {
  if (seconds <= 0) return "Ready";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${seconds}s`;
}

function computeRankReductionPercent(
  staked: bigint | undefined,
  maxStake: bigint | undefined,
): number {
  if (staked === undefined || maxStake === undefined || maxStake === BigInt(0)) {
    return 0;
  }
  const ratio = Number(staked) / Number(maxStake);
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return Math.min(FAMILY_SHARE_REDUCTION_CAP_PERCENT, ratio * FAMILY_SHARE_REDUCTION_CAP_PERCENT);
}

function parseFamilyStake(
  id: bigint,
  raw: unknown,
): FamilyStakeEntry | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return {
      id,
      user: (raw[0] ?? zeroAddress) as `0x${string}`,
      familyId: BigInt(raw[1] as bigint | string | number),
      amount: BigInt(raw[2] as bigint | string | number),
      startedAt: BigInt(raw[3] as bigint | string | number),
      endedAt: BigInt(raw[4] as bigint | string | number),
      isActive: Boolean(raw[5]),
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    id,
    user: (o.user ?? zeroAddress) as `0x${string}`,
    familyId: BigInt((o.familyId as bigint | string | number) ?? 0),
    amount: BigInt((o.amount as bigint | string | number) ?? 0),
    startedAt: BigInt((o.startedAt as bigint | string | number) ?? 0),
    endedAt: BigInt((o.endedAt as bigint | string | number) ?? 0),
    isActive: Boolean(o.isActive),
  };
}

interface FamilyShareStakeProps {
  familyId: number;
  isFamilyMember: boolean;
}

export function FamilyShareStake({
  familyId,
  isFamilyMember,
}: FamilyShareStakeProps) {
  const addresses = useChainAddresses();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const shareStake = addresses.familyShareStake;
  const configured = shareStake !== zeroAddress;

  const [stakeDialogOpen, setStakeDialogOpen] = useState(false);
  const [stakeInput, setStakeInput] = useState("");
  const [myStakes, setMyStakes] = useState<FamilyStakeEntry[]>([]);
  const [stakesLoading, setStakesLoading] = useState(false);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [withdrawingId, setWithdrawingId] = useState<bigint | null>(null);
  const stakeAfterApproveRef = useRef<bigint | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: familyStakedRaw, refetch: refetchFamilyStaked } = useReadContract({
    address: shareStake,
    abi: FAMILY_SHARE_STAKE_ABI,
    functionName: "familyStakedAmount",
    args: [BigInt(familyId)],
    query: {
      enabled: configured && familyId > 0,
      refetchInterval: STAKE_REFETCH_MS,
    },
  });

  const { data: maxStakeRaw, refetch: refetchMaxStake } = useReadContract({
    address: shareStake,
    abi: FAMILY_SHARE_STAKE_ABI,
    functionName: "maxStakePerFamily",
    query: { enabled: configured, refetchInterval: STAKE_REFETCH_MS },
  });

  const { data: cooldownRaw } = useReadContract({
    address: shareStake,
    abi: FAMILY_SHARE_STAKE_ABI,
    functionName: "withdrawCooldown",
    query: { enabled: configured },
  });

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.mafia,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && configured
        ? [address, shareStake]
        : undefined,
    query: {
      enabled: !!address && configured && isConnected,
      refetchInterval: STAKE_REFETCH_MS,
    },
  });

  const { data: mafiaBalanceRaw, refetch: refetchMafiaBalance } = useReadContract({
    address: addresses.mafia,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && configured && isConnected,
      refetchInterval: STAKE_REFETCH_MS,
    },
  });

  const familyStakedWei =
    familyStakedRaw != null ? BigInt(familyStakedRaw as bigint) : undefined;
  const maxStakeWei =
    maxStakeRaw != null ? BigInt(maxStakeRaw as bigint) : undefined;
  const withdrawCooldownSec =
    cooldownRaw != null ? Number(cooldownRaw as bigint) : 0;
  const allowance =
    allowanceRaw != null ? BigInt(allowanceRaw as bigint) : undefined;
  const mafiaBalanceWei =
    mafiaBalanceRaw != null ? BigInt(mafiaBalanceRaw as bigint) : undefined;

  const reductionPercent = useMemo(
    () => computeRankReductionPercent(familyStakedWei, maxStakeWei),
    [familyStakedWei, maxStakeWei],
  );

  const fillPercent = useMemo(() => {
    if (familyStakedWei === undefined || maxStakeWei === undefined || maxStakeWei === BigInt(0)) {
      return 0;
    }
    return Math.min(100, (Number(familyStakedWei) / Number(maxStakeWei)) * 100);
  }, [familyStakedWei, maxStakeWei]);

  const fetchMyStakes = useCallback(async () => {
    if (!publicClient || !address || !configured) {
      setMyStakes([]);
      return;
    }
    setStakesLoading(true);
    try {
      const count = (await publicClient.readContract({
        address: shareStake,
        abi: FAMILY_SHARE_STAKE_ABI,
        functionName: "getUserActiveStakesCount",
        args: [address],
      })) as bigint;

      if (count === BigInt(0)) {
        setMyStakes([]);
        return;
      }

      const ids = (await publicClient.readContract({
        address: shareStake,
        abi: FAMILY_SHARE_STAKE_ABI,
        functionName: "getUserActiveStakes",
        args: [address, BigInt(0), count],
      })) as readonly bigint[];

      if (!ids.length) {
        setMyStakes([]);
        return;
      }

      const results = await publicClient.multicall({
        contracts: ids.map((id) => ({
          address: shareStake,
          abi: FAMILY_SHARE_STAKE_ABI,
          functionName: "familyStakes",
          args: [id],
        })),
      });

      const familyIdBig = BigInt(familyId);
      const parsed: FamilyStakeEntry[] = [];
      for (let i = 0; i < ids.length; i++) {
        const r = results[i];
        if (r.status !== "success") continue;
        const entry = parseFamilyStake(ids[i], r.result);
        if (
          entry &&
          entry.isActive &&
          entry.familyId === familyIdBig
        ) {
          parsed.push(entry);
        }
      }
      parsed.sort((a, b) => Number(b.startedAt - a.startedAt));
      setMyStakes(parsed);
    } catch (e) {
      console.error("Family share stakes fetch failed", e);
      setMyStakes([]);
    } finally {
      setStakesLoading(false);
    }
  }, [publicClient, address, configured, shareStake, familyId]);

  useEffect(() => {
    if (isConnected && address && configured) {
      void fetchMyStakes();
    } else {
      setMyStakes([]);
    }
  }, [isConnected, address, configured, fetchMyStakes]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchFamilyStaked(),
      refetchMaxStake(),
      refetchAllowance(),
      refetchMafiaBalance(),
      fetchMyStakes(),
    ]);
  }, [
    refetchFamilyStaked,
    refetchMaxStake,
    refetchAllowance,
    refetchMafiaBalance,
    fetchMyStakes,
  ]);

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const {
    writeContract: writeStake,
    data: stakeHash,
    isPending: stakePending,
    error: stakeError,
    reset: resetStake,
  } = useChainWriteContract();
  const { isLoading: stakeConfirming, isSuccess: stakeSuccess } =
    useWaitForTransactionReceipt({ hash: stakeHash });

  const {
    writeContract: writeWithdraw,
    data: withdrawHash,
    isPending: withdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useChainWriteContract();
  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  const stakeLoading = approvePending || approveConfirming || stakePending || stakeConfirming;
  const withdrawLoading = withdrawPending || withdrawConfirming;

  useEffect(() => {
    if (approveError) stakeAfterApproveRef.current = null;
  }, [approveError]);

  useEffect(() => {
    if (!approveSuccess || !approveHash) return;
    const wei = stakeAfterApproveRef.current;
    if (wei === null) return;
    stakeAfterApproveRef.current = null;
    resetStake();
    writeStake({
      address: shareStake,
      abi: FAMILY_SHARE_STAKE_ABI,
      functionName: "stake",
      args: [BigInt(familyId), wei],
    });
  }, [
    approveSuccess,
    approveHash,
    writeStake,
    shareStake,
    familyId,
    resetStake,
  ]);

  useEffect(() => {
    if (!stakeSuccess || !stakeHash) return;
    toast.success("Staked MAFIA to family share");
    setStakeInput("");
    setStakeDialogOpen(false);
    void refetchAll();
  }, [stakeSuccess, stakeHash, refetchAll]);

  useEffect(() => {
    if (!withdrawSuccess || !withdrawHash) return;
    toast.success("Withdrew family share stake");
    setWithdrawingId(null);
    void refetchAll();
  }, [withdrawSuccess, withdrawHash, refetchAll]);

  useEffect(() => {
    if (withdrawError) {
      toast.error(withdrawError.message.split("\n")[0] || "Withdraw failed");
      setWithdrawingId(null);
      resetWithdraw();
    }
  }, [withdrawError, resetWithdraw]);

  const handleStake = () => {
    if (!configured || !isConnected) return;
    if (!isFamilyMember) {
      toast.error("Only members of this family can stake");
      return;
    }
    const wei = parseStakeAmount(stakeInput);
    if (wei === null) {
      toast.error("Enter a valid MAFIA amount");
      return;
    }
    if (allowance === undefined) {
      toast.error("Allowance not loaded yet");
      return;
    }
    if (mafiaBalanceWei !== undefined && wei > mafiaBalanceWei) {
      toast.error("Insufficient MAFIA balance");
      return;
    }
    resetApprove();
    resetStake();
    if (allowance < wei) {
      stakeAfterApproveRef.current = wei;
      writeApprove({
        address: addresses.mafia,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [shareStake, maxUint256],
      });
      return;
    }
    writeStake({
      address: shareStake,
      abi: FAMILY_SHARE_STAKE_ABI,
      functionName: "stake",
      args: [BigInt(familyId), wei],
    });
  };

  const handleWithdraw = (stakeId: bigint, startedAt: bigint) => {
    if (!configured || !isConnected) return;
    const unlockAt = Number(startedAt) + withdrawCooldownSec;
    if (nowSec < unlockAt) {
      toast.error("Withdraw cooldown not reached");
      return;
    }
    resetWithdraw();
    setWithdrawingId(stakeId);
    writeWithdraw({
      address: shareStake,
      abi: FAMILY_SHARE_STAKE_ABI,
      functionName: "withdraw",
      args: [stakeId],
    });
  };

  if (!configured) return null;

  const myStakedTotal = myStakes.reduce((sum, s) => sum + s.amount, BigInt(0));

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <PieChart className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Family share staking</p>
                <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                  {formatMafiaWei(familyStakedWei)}
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                    / {formatMafiaWei(maxStakeWei, 0)} MAFIA
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="outline"
                className="gap-1 border-violet-500/40 bg-violet-500/10 text-violet-300"
              >
                <Percent className="h-3 w-3" />
                Rank reduction {reductionPercent.toFixed(1)}%
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                Cap {FAMILY_SHARE_REDUCTION_CAP_PERCENT}% · based on pool fill
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Pool fill</span>
              <span className="font-mono tabular-nums">{fillPercent.toFixed(1)}%</span>
            </div>
            <Progress value={fillPercent} className="h-2" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Rank activation reduction</span>
              <span className="font-mono tabular-nums text-violet-300">
                {reductionPercent.toFixed(1)}% / {FAMILY_SHARE_REDUCTION_CAP_PERCENT}%
              </span>
            </div>
            <Progress
              value={(reductionPercent / FAMILY_SHARE_REDUCTION_CAP_PERCENT) * 100}
              className="h-1.5"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isConnected ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setStakeDialogOpen(true)}
                  disabled={!isFamilyMember}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Stake
                </Button>
                {!isFamilyMember && (
                  <p className="text-xs text-muted-foreground">
                    Only family members can stake to this share.
                  </p>
                )}
                {isFamilyMember && (
                  <span className="text-xs text-muted-foreground">
                    Your stake:{" "}
                    <span className="font-mono text-foreground">
                      {formatMafiaWei(myStakedTotal)} MAFIA
                    </span>
                  </span>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Connect wallet to stake or withdraw
              </p>
            )}
          </div>

          {isConnected && isFamilyMember && (
            <div className="rounded-md border border-border/60">
              {stakesLoading && myStakes.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your stakes…
                </div>
              ) : myStakes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You have no active stakes in this family share.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase">Amount</TableHead>
                      <TableHead className="text-[10px] uppercase">Staked</TableHead>
                      <TableHead className="text-[10px] uppercase">Cooldown</TableHead>
                      <TableHead className="text-right text-[10px] uppercase">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myStakes.map((stake) => {
                      const unlockAt =
                        Number(stake.startedAt) + withdrawCooldownSec;
                      const remaining = Math.max(0, unlockAt - nowSec);
                      const canWithdraw = remaining <= 0;
                      const isThisWithdrawing =
                        withdrawingId === stake.id && withdrawLoading;
                      return (
                        <TableRow
                          key={stake.id.toString()}
                          className="border-border/30"
                        >
                          <TableCell className="py-2 font-mono text-sm tabular-nums">
                            {formatMafiaWei(stake.amount)}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                            {Number(stake.startedAt)
                              ? new Date(
                                  Number(stake.startedAt) * 1000,
                                ).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell className="py-2">
                            {canWithdraw ? (
                              <Badge
                                variant="outline"
                                className="border-green-500/40 bg-green-500/10 text-[10px] text-green-400"
                              >
                                Ready
                              </Badge>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                                <Timer className="h-3 w-3" />
                                <span className="font-mono tabular-nums">
                                  {formatLongCooldown(remaining)}
                                </span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-7 gap-1 px-2 text-xs",
                                !canWithdraw && "opacity-50",
                              )}
                              disabled={!canWithdraw || withdrawLoading}
                              onClick={() =>
                                handleWithdraw(stake.id, stake.startedAt)
                              }
                            >
                              {isThisWithdrawing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ArrowUpFromLine className="h-3 w-3" />
                              )}
                              Withdraw
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {withdrawCooldownSec > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Each stake has a{" "}
              <span className="font-medium text-foreground">
                {formatLongCooldown(withdrawCooldownSec)}
              </span>{" "}
              withdraw cooldown from its stake time.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={stakeDialogOpen} onOpenChange={setStakeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stake to family share</DialogTitle>
            <DialogDescription>
              Stake MAFIA into this family&apos;s share pool. Rank activation
              reduction scales with pool fill up to{" "}
              {FAMILY_SHARE_REDUCTION_CAP_PERCENT}%.
              {isFamilyMember && (
                <>
                  {" "}
                  Your balance:{" "}
                  <span className="font-mono text-foreground">
                    {formatMafiaWei(mafiaBalanceWei)} MAFIA
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {!isFamilyMember ? (
            <p className="text-sm text-amber-400">
              You must be a member of this family to stake.
            </p>
          ) : (
            <div className="space-y-2">
              <label
                className="text-xs text-muted-foreground"
                htmlFor="family-share-stake-amount"
              >
                Amount (MAFIA)
              </label>
              <Input
                id="family-share-stake-amount"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                disabled={stakeLoading}
                className="font-mono"
              />
            </div>
          )}
          {(stakeError || approveError) && (
            <p className="text-xs text-red-400">
              {(stakeError ?? approveError)?.message.split("\n")[0]}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setStakeDialogOpen(false)}
              disabled={stakeLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStake}
              disabled={!isFamilyMember || stakeLoading}
              className="gap-1.5"
            >
              {stakeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              {approvePending || approveConfirming
                ? "Approving…"
                : stakePending || stakeConfirming
                  ? "Staking…"
                  : "Confirm stake"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
