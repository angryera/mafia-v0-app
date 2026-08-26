"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { FAMILY_SHARE_STAKE_ABI } from "@/lib/contract";
import { cn } from "@/lib/utils";
import {
  ArrowUpFromLine,
  Loader2,
  PieChart,
  RefreshCw,
  Timer,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatUnits, zeroAddress } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";

type FamilyStakeEntry = {
  id: bigint;
  user: `0x${string}`;
  familyId: bigint;
  amount: bigint;
  startedAt: bigint;
  endedAt: bigint;
  isActive: boolean;
};

function formatMafiaWei(wei: bigint, digits = 2): string {
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

function parseFamilyStake(id: bigint, raw: unknown): FamilyStakeEntry | null {
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

interface MyFamilyShareStakesButtonProps {
  /** Optional map of familyId → name from the list page. */
  familyNames?: Record<number, string>;
}

export function MyFamilyShareStakesButton({
  familyNames = {},
}: MyFamilyShareStakesButtonProps) {
  const addresses = useChainAddresses();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const shareStake = addresses.familyShareStake;
  const configured = shareStake !== zeroAddress;

  const [open, setOpen] = useState(false);
  const [stakes, setStakes] = useState<FamilyStakeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [withdrawingId, setWithdrawingId] = useState<bigint | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, [open]);

  const { data: cooldownRaw } = useReadContract({
    address: shareStake,
    abi: FAMILY_SHARE_STAKE_ABI,
    functionName: "withdrawCooldown",
    query: { enabled: configured },
  });

  const withdrawCooldownSec =
    cooldownRaw != null ? Number(cooldownRaw as bigint) : 0;

  const fetchStakes = useCallback(async () => {
    if (!publicClient || !address || !configured) {
      setStakes([]);
      return;
    }
    setLoading(true);
    try {
      const count = (await publicClient.readContract({
        address: shareStake,
        abi: FAMILY_SHARE_STAKE_ABI,
        functionName: "getUserActiveStakesCount",
        args: [address],
      })) as bigint;

      if (count === BigInt(0)) {
        setStakes([]);
        return;
      }

      const ids = (await publicClient.readContract({
        address: shareStake,
        abi: FAMILY_SHARE_STAKE_ABI,
        functionName: "getUserActiveStakes",
        args: [address, BigInt(0), count],
      })) as readonly bigint[];

      if (!ids.length) {
        setStakes([]);
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

      const parsed: FamilyStakeEntry[] = [];
      for (let i = 0; i < ids.length; i++) {
        const r = results[i];
        if (r.status !== "success") continue;
        const entry = parseFamilyStake(ids[i], r.result);
        if (entry?.isActive) parsed.push(entry);
      }
      parsed.sort((a, b) => {
        const fam = Number(a.familyId - b.familyId);
        if (fam !== 0) return fam;
        return Number(b.startedAt - a.startedAt);
      });
      setStakes(parsed);
    } catch (e) {
      console.error("All family share stakes fetch failed", e);
      toast.error("Could not load your family share stakes");
      setStakes([]);
    } finally {
      setLoading(false);
    }
  }, [publicClient, address, configured, shareStake]);

  // Light count prefetch for badge while on list page
  useEffect(() => {
    if (isConnected && address && configured) {
      void fetchStakes();
    } else {
      setStakes([]);
    }
  }, [isConnected, address, configured, fetchStakes]);

  useEffect(() => {
    if (open && isConnected && address && configured) {
      void fetchStakes();
    }
  }, [open, isConnected, address, configured, fetchStakes]);

  const {
    writeContract: writeWithdraw,
    data: withdrawHash,
    isPending: withdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useChainWriteContract();
  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  const withdrawLoading = withdrawPending || withdrawConfirming;

  useEffect(() => {
    if (!withdrawSuccess || !withdrawHash) return;
    toast.success("Withdrew family share stake");
    setWithdrawingId(null);
    void fetchStakes();
  }, [withdrawSuccess, withdrawHash, fetchStakes]);

  useEffect(() => {
    if (withdrawError) {
      toast.error(withdrawError.message.split("\n")[0] || "Withdraw failed");
      setWithdrawingId(null);
      resetWithdraw();
    }
  }, [withdrawError, resetWithdraw]);

  const totalWei = useMemo(
    () => stakes.reduce((sum, s) => sum + s.amount, BigInt(0)),
    [stakes],
  );

  const familyLabel = (familyId: bigint) => {
    const id = Number(familyId);
    const name = familyNames[id];
    return name ? `${name} (#${id})` : `Family #${id}`;
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

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={!isConnected}
        onClick={() => setOpen(true)}
        title={
          isConnected
            ? "View and withdraw your family share stakes across all families"
            : "Connect wallet to manage family share stakes"
        }
      >
        <PieChart className="h-3.5 w-3.5" />
        My share stakes
        {isConnected && stakes.length > 0 && (
          <Badge
            variant="secondary"
            className="ml-0.5 h-5 min-w-5 justify-center px-1.5 font-mono text-[10px]"
          >
            {stakes.length}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>My family share stakes</DialogTitle>
            <DialogDescription>
              All active MAFIA stakes across every family. You can withdraw
              here even if you left or were kicked — no need to open each
              family page.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {stakes.length === 0
                ? "No active stakes"
                : `${stakes.length} stake${stakes.length === 1 ? "" : "s"} · ${formatMafiaWei(totalWei)} MAFIA`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              disabled={loading || !isConnected}
              onClick={() => void fetchStakes()}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/60">
            {!isConnected ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Connect your wallet to view stakes.
              </p>
            ) : loading && stakes.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : stakes.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                You have no active family share stakes.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase">Family</TableHead>
                    <TableHead className="text-[10px] uppercase">Amount</TableHead>
                    <TableHead className="text-[10px] uppercase">Staked</TableHead>
                    <TableHead className="text-[10px] uppercase">Cooldown</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stakes.map((stake) => {
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
                        <TableCell className="max-w-[10rem] py-2 text-sm">
                          <span className="font-medium text-foreground">
                            {familyLabel(stake.familyId)}
                          </span>
                        </TableCell>
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

          {withdrawCooldownSec > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Each stake has a{" "}
              <span className="font-medium text-foreground">
                {formatLongCooldown(withdrawCooldownSec)}
              </span>{" "}
              withdraw cooldown from its stake time.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
