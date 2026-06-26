"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import { Coins, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";
import { useChainAddresses } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { usePlayerDeadState } from "@/hooks/use-player-dead-state";
import { EQUIPMENT_ABI } from "@/lib/contract";
import {
  buildUnstakeEquipArgs,
  formatCooldownDuration,
  formatMafiaAmount,
  formatMafiaAmountFromNumber,
  getAllCityEquipmentInfo,
  getCooldownRemainingSeconds,
  isCityOnCooldown,
  type CityStakeInfo,
} from "@/lib/equipmentContract";

export function UnstakeMafiaAction() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const addresses = useChainAddresses();
  const { authData, requestSignature } = useAuth();
  const { isDead } = usePlayerDeadState();

  const [cityStakes, setCityStakes] = useState<CityStakeInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [unstakingCityId, setUnstakingCityId] = useState<number | null>(null);
  const [pendingUnstake, setPendingUnstake] = useState<CityStakeInfo | null>(
    null,
  );
  const [currentTime, setCurrentTime] = useState(() =>
    Math.floor(Date.now() / 1000),
  );

  const {
    writeContract,
    data: unstakeHash,
    isPending: unstakePending,
    error: unstakeError,
    reset: resetUnstake,
  } = useChainWriteContract();

  const { isLoading: unstakeConfirming, isSuccess: unstakeSuccess } =
    useWaitForTransactionReceipt({ hash: unstakeHash });

  const fetchStakes = useCallback(async () => {
    if (!publicClient || !address || !authData) return;

    setLoading(true);
    try {
      const stakes = await getAllCityEquipmentInfo({
        publicClient,
        equipmentAddress: addresses.equipment,
        account: address,
        signMsg: authData.message,
        signature: authData.signature as `0x${string}`,
      });
      setCityStakes(stakes);
      setHasLoadedOnce(true);
    } catch (e) {
      console.error("Failed to load equipment stakes:", e);
      setCityStakes([]);
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, [publicClient, address, authData, addresses.equipment]);

  useEffect(() => {
    if (isConnected && address && authData) {
      void fetchStakes();
    }
  }, [isConnected, address, authData, fetchStakes]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (unstakeSuccess && unstakeHash && pendingUnstake) {
      toast.success(
        `Unstaked ${formatMafiaAmountFromNumber(pendingUnstake.mafiaAmount)} $MAFIA from ${pendingUnstake.cityName}`,
      );
      setUnstakingCityId(null);
      setPendingUnstake(null);
      resetUnstake();
      void fetchStakes();
    }
  }, [unstakeSuccess, unstakeHash, pendingUnstake, fetchStakes, resetUnstake]);

  useEffect(() => {
    if (unstakeError) {
      toast.error(unstakeError.message || "Failed to unstake MAFIA");
      setUnstakingCityId(null);
      setPendingUnstake(null);
      resetUnstake();
    }
  }, [unstakeError, resetUnstake]);

  const activeStakes = useMemo(
    () => (cityStakes ?? []).filter((s) => s.mafiaAmountWei > BigInt(0)),
    [cityStakes],
  );

  const totalStakedWei = useMemo(
    () =>
      activeStakes.reduce((sum, s) => sum + s.mafiaAmountWei, BigInt(0)),
    [activeStakes],
  );

  const handleUnstake = useCallback(
    (stake: CityStakeInfo) => {
      if (!isConnected || !address) {
        toast.error("Connect your wallet to unstake MAFIA.");
        return;
      }

      if (!authData) {
        toast.error(
          "Please sign the message in your wallet to verify your identity.",
        );
        requestSignature();
        return;
      }

      if (stake.mafiaAmountWei <= BigInt(0)) return;

      if (
        isCityOnCooldown(stake.equippedAt, currentTime, isDead)
      ) {
        toast.error("Cannot unstake within the 3 hour cooldown");
        return;
      }

      if (unstakingCityId !== null || unstakePending || unstakeConfirming) {
        return;
      }

      resetUnstake();
      setUnstakingCityId(stake.cityId);
      setPendingUnstake(stake);

      const args = buildUnstakeEquipArgs(stake);
      writeContract({
        address: addresses.equipment,
        abi: EQUIPMENT_ABI,
        functionName: "equipItems",
        args: [args.cityId, args.itemIds, args.delta],
      });
    },
    [
      isConnected,
      address,
      authData,
      requestSignature,
      currentTime,
      isDead,
      unstakingCityId,
      unstakePending,
      unstakeConfirming,
      resetUnstake,
      writeContract,
      addresses.equipment,
    ],
  );

  const showInitialLoading =
    loading && !hasLoadedOnce && cityStakes === null;

  const showEmpty =
    hasLoadedOnce && !loading && totalStakedWei === BigInt(0);

  const showTable = hasLoadedOnce && activeStakes.length > 0;

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Coins className="mx-auto h-10 w-10 text-amber-400/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          Connect your wallet to view staked $MAFIA.
        </p>
      </div>
    );
  }

  if (!authData && !hasLoadedOnce) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-400" />
        <p className="mt-4 text-sm text-muted-foreground">
          Waiting for wallet signature...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/25">
          <Coins className="h-6 w-6 text-amber-400" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Unstake $MAFIA
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your equipped $MAFIA staked across cities. Unstake to withdraw it back
          to your wallet.
        </p>
      </div>

      {/* Total staked summary */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/60 to-card/40">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-400/80">
              Total staked
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-300">
              {hasLoadedOnce
                ? `${formatMafiaAmount(totalStakedWei)} $MAFIA`
                : "—"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/30 hover:bg-amber-500/10"
            onClick={() => void fetchStakes()}
            disabled={loading || !authData}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {showInitialLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <span className="text-sm">Loading staked $MAFIA...</span>
        </div>
      )}

      {showEmpty && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          You have no $MAFIA staked in any city.
        </p>
      )}

      {showTable && !isDead && (
        <p className="rounded-lg border border-border/50 bg-card/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Each city has its own independent 3-hour cooldown that starts when you
          last equipped there. The cooldowns run in parallel — not back to back —
          so you can unstake every city that&apos;s ready right now. Any city
          still cooling down shows its remaining time.
        </p>
      )}

      {showTable && (
        <div className="overflow-hidden rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>City</TableHead>
                <TableHead>Staked $MAFIA</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStakes.map((stake) => {
                const onCooldown = isCityOnCooldown(
                  stake.equippedAt,
                  currentTime,
                  isDead,
                );
                const cooldownSecs = getCooldownRemainingSeconds(
                  stake.equippedAt,
                  currentTime,
                );
                const isRowUnstaking =
                  unstakingCityId === stake.cityId &&
                  (unstakePending || unstakeConfirming);

                return (
                  <TableRow key={stake.cityId}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-secondary px-1.5 text-xs font-bold text-foreground">
                          {stake.abbreviation}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {stake.cityName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 shrink-0 text-amber-400" />
                        <span className="font-mono tabular-nums text-sm">
                          {formatMafiaAmountFromNumber(stake.mafiaAmount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isRowUnstaking || onCooldown}
                          onClick={() => handleUnstake(stake)}
                        >
                          {isRowUnstaking ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Unstaking...
                            </>
                          ) : (
                            "Unstake"
                          )}
                        </Button>
                        {onCooldown && !isDead && (
                          <span className="text-xs text-muted-foreground">
                            Wait {formatCooldownDuration(cooldownSecs)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
