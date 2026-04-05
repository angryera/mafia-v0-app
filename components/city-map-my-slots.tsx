"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, RefreshCw, X } from "lucide-react";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ParsedSlotInfo } from "@/lib/city-map-types";
import {
  getResidentialGameCashYieldPer24h,
  getSlotBuildingLabel,
  getSlotTypeName,
  isResidentialGameCashYieldTier,
} from "@/lib/city-slot-config";
import { MAFIA_MAP_ABI } from "@/lib/city-map-contract-abis";
import {
  estimateGameCashYieldWeiLive,
  formatWeiWholeUnits,
} from "@/lib/city-map-yield-accrual";
import { formatMafiaStakingFromWei } from "@/lib/city-map-staking-format";
import { useChainAddresses } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";

/** Same minimum claimable units as legacy client (human Game Cash, 18-decimal token). */
const BULK_CLAIM_MIN_GAME_CASH = parseEther("100");

const MAX_BULK_CLAIM_SLOTS = 80;

export type MySlotRow = {
  cityId: number;
  x: number;
  y: number;
  slot: ParsedSlotInfo;
};

function rowKey(cityId: number, x: number, y: number) {
  return `${cityId}-${x}-${y}`;
}

export function CityMapMySlotsPanel({
  open,
  onClose,
  requestFocusSlot,
  cityLabel,
  rows,
  slotsLoading,
  slotsError,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  requestFocusSlot: (cityId: number, x: number, y: number) => void;
  cityLabel: string;
  rows: MySlotRow[];
  slotsLoading: boolean;
  slotsError: string | null;
  onRefresh: () => void;
}) {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const mapAddress = addresses.map;

  const yieldRows = useMemo(() => {
    return rows.filter((r) =>
      isResidentialGameCashYieldTier(r.slot.slotType, r.slot.slotSubType)
    );
  }, [rows]);

  const cityIds = useMemo(
    () => yieldRows.map((r) => r.cityId) as readonly number[],
    [yieldRows]
  );
  const slotXs = useMemo(
    () => yieldRows.map((r) => r.x) as readonly number[],
    [yieldRows]
  );
  const slotYs = useMemo(
    () => yieldRows.map((r) => r.y) as readonly number[],
    [yieldRows]
  );

  const bulkReadEnabled =
    open &&
    !!mapAddress &&
    yieldRows.length > 0 &&
    !slotsLoading &&
    !!isConnected &&
    !!address;

  const {
    data: bulkYieldRaw,
    refetch: refetchBulkYield,
    isFetching: bulkYieldFetching,
    error: bulkYieldError,
  } = useReadContract({
    address: mapAddress,
    abi: MAFIA_MAP_ABI,
    functionName: "calculateBulkCurrentYieldPayout",
    args:
      bulkReadEnabled && yieldRows.length > 0
        ? [cityIds as readonly number[], slotXs as readonly number[], slotYs as readonly number[]]
        : undefined,
    query: {
      enabled: bulkReadEnabled,
    },
  });

  const { amounts, lastDayTimestamps } = useMemo(() => {
    if (!bulkYieldRaw || yieldRows.length === 0) {
      return {
        amounts: [] as bigint[],
        lastDayTimestamps: [] as bigint[],
      };
    }
    const raw = bulkYieldRaw as {
      amounts?: readonly bigint[];
      lastDayTimestamps?: readonly bigint[];
    };
    const list = raw.amounts ? [...raw.amounts] : [];
    const tsList = raw.lastDayTimestamps ? [...raw.lastDayTimestamps] : [];
    return { amounts: list, lastDayTimestamps: tsList };
  }, [bulkYieldRaw, yieldRows]);

  const [nowSecLive, setNowSecLive] = useState(() =>
    Math.floor(Date.now() / 1000)
  );
  useEffect(() => {
    if (!open) return;
    setNowSecLive(Math.floor(Date.now() / 1000));
    const id = window.setInterval(() => {
      setNowSecLive(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const estimatedClaimableByKey = useMemo(() => {
    const m = new Map<string, bigint>();
    if (yieldRows.length === 0) return m;
    for (let i = 0; i < yieldRows.length; i++) {
      const r = yieldRows[i];
      const base = amounts[i] ?? BigInt(0);
      const lastTs = Number(lastDayTimestamps[i] ?? 0);
      const est = estimateGameCashYieldWeiLive({
        baseWeiFromContract: base,
        lastDayTimestampSec: lastTs,
        slotType: r.slot.slotType,
        slotSubType: r.slot.slotSubType,
        isOperating: r.slot.isOperating,
        nowSec: nowSecLive,
      });
      m.set(rowKey(r.cityId, r.x, r.y), est);
    }
    return m;
  }, [
    yieldRows,
    amounts,
    lastDayTimestamps,
    nowSecLive,
  ]);

  const claimBatch = useMemo(() => {
    const eligible: { row: MySlotRow; wei: bigint }[] = [];
    for (let i = 0; i < yieldRows.length; i++) {
      const row = yieldRows[i];
      const wei = estimatedClaimableByKey.get(
        rowKey(row.cityId, row.x, row.y)
      );
      if (wei === undefined) continue;
      if (!row.slot.isOperating) continue;
      if (wei <= BULK_CLAIM_MIN_GAME_CASH) continue;
      eligible.push({ row, wei });
      if (eligible.length >= MAX_BULK_CLAIM_SLOTS) break;
    }
    return eligible;
  }, [yieldRows, estimatedClaimableByKey]);

  const batchTotalWei = useMemo(() => {
    return claimBatch.reduce((s, e) => s + e.wei, BigInt(0));
  }, [claimBatch]);

  const {
    writeContractAsync: writeBulkClaim,
    isPending: bulkWritePending,
    data: bulkHash,
    reset: resetBulkWrite,
  } = useChainWriteContract();

  const { isLoading: bulkConfirming, isSuccess: bulkSuccess } =
    useWaitForTransactionReceipt({ hash: bulkHash });

  const bulkToastFired = useRef(false);
  useEffect(() => {
    if (bulkSuccess && bulkHash && !bulkToastFired.current) {
      bulkToastFired.current = true;
      toast.success("Claimed Game Cash yield (bulk).");
      resetBulkWrite();
      void refetchBulkYield();
      onRefresh();
    }
    if (!bulkHash) bulkToastFired.current = false;
  }, [
    bulkSuccess,
    bulkHash,
    resetBulkWrite,
    refetchBulkYield,
    onRefresh,
  ]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleBulkClaim = async () => {
    if (!mapAddress || claimBatch.length === 0) {
      toast.error("No yield to claim, please try again later.");
      return;
    }
    try {
      await writeBulkClaim({
        address: mapAddress,
        abi: MAFIA_MAP_ABI,
        functionName: "bulkClaimYieldPayout",
        args: [
          claimBatch.map((e) => e.row.cityId),
          claimBatch.map((e) => e.row.x),
          claimBatch.map((e) => e.row.y),
        ],
      });
    } catch (e) {
      console.error(e);
      toast.error("Error claiming yield payout.");
    }
  };

  if (!open) return null;

  const bulkBusy = bulkWritePending || bulkConfirming;
  /** Show bulk strip whenever the user has any owned slots in this city (not only yield-tier rows). */
  const showBulkClaimBar =
    isConnected && !!address && !slotsLoading && rows.length > 0;
  const hasYieldTierSlots = yieldRows.length > 0;

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[95] bg-background/80 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[96] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto flex max-h-[min(85vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
                <h2 className="text-sm font-semibold text-foreground">My slots</h2>
              </div>
              <p className="mt-0.5 truncate pl-6 text-xs text-muted-foreground">
                {cityLabel}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => onRefresh()}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                aria-label="Refresh list"
                title="Refresh list"
                disabled={slotsLoading}
              >
                <RefreshCw
                  className={cn("h-4 w-4", slotsLoading && "animate-spin")}
                />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showBulkClaimBar && (
            <div className="border-b border-border px-4 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Game Cash yield (on-chain, office / apartment / mansion / hotel)
                </p>
                {hasYieldTierSlots && bulkYieldFetching && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              {!hasYieldTierSlots ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled
                    title="No qualifying residential tiers in this city"
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-60"
                  >
                    Bulk claim Game Cash
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    No office / apartment / mansion / hotel slots here — bulk
                    claim does not apply.
                  </span>
                </div>
              ) : (
                <>
                  {bulkYieldError && (
                    <p className="text-[11px] text-amber-500">
                      Could not load yield amounts. Refresh or check the map
                      contract ABI.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleBulkClaim()}
                      disabled={
                        bulkBusy || bulkYieldFetching || !bulkYieldRaw
                      }
                      className="rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-40"
                    >
                      {bulkBusy ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Claiming…
                        </span>
                      ) : (
                        "Bulk claim Game Cash"
                      )}
                    </button>
                    <span className="text-[11px] text-muted-foreground">
                      {claimBatch.length > 0 ? (
                        <>
                          Up to {claimBatch.length} slot
                          {claimBatch.length !== 1 ? "s" : ""} ·{" "}
                          <span className="font-mono text-foreground">
                            {formatWeiWholeUnits(batchTotalWei)}
                          </span>{" "}
                          GC
                        </>
                      ) : (
                        "No slot over 100 GC (or not operating)."
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {!isConnected || !address ? (
              <p className="text-sm text-muted-foreground">
                Connect your wallet to see slots you own.
              </p>
            ) : slotsLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading map…
              </div>
            ) : slotsError ? (
              <p className="text-sm text-amber-500">{slotsError}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You don&apos;t own any slots in this city yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[800px] border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky left-0 top-0 z-[4] bg-muted/95 px-2 py-2 pl-3 text-left font-medium text-foreground shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                        Building
                      </th>
                      <th className="sticky top-0 z-[3] bg-muted/95 px-2 py-2 text-left font-medium text-muted-foreground backdrop-blur-sm">
                        Type
                      </th>
                      <th className="sticky top-0 z-[3] bg-muted/95 px-2 py-2 text-left font-medium text-muted-foreground backdrop-blur-sm">
                        Position
                      </th>
                      <th className="sticky top-0 z-[3] bg-muted/95 px-2 py-2 text-left font-medium text-muted-foreground backdrop-blur-sm">
                        Active
                      </th>
                      <th className="sticky top-0 z-[3] bg-muted/95 px-2 py-2 text-right font-medium text-muted-foreground backdrop-blur-sm">
                        Staked MAFIA
                      </th>
                      <th className="sticky top-0 z-[3] bg-muted/95 px-2 py-2 text-right font-medium text-muted-foreground backdrop-blur-sm">
                        Yield (cached)
                      </th>
                      <th className="sticky top-0 z-[3] bg-muted/95 px-2 py-2 text-left font-medium text-muted-foreground backdrop-blur-sm">
                        Family
                      </th>
                      <th className="sticky top-0 z-[3] bg-muted/95 px-2 py-2 text-right font-medium text-muted-foreground backdrop-blur-sm">
                        GC / 24h
                      </th>
                      <th className="sticky top-0 z-[3] bg-muted/95 px-2 py-2 text-right font-medium text-muted-foreground backdrop-blur-sm">
                        Claimable (est.)
                      </th>
                      <th className="sticky top-0 z-[3] bg-muted/95 px-2 py-2 pr-3 text-right font-medium text-muted-foreground backdrop-blur-sm">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const s = row.slot;
                      const label =
                        getSlotBuildingLabel(s) || `Type ${s.slotType}`;
                      const isYieldTier = isResidentialGameCashYieldTier(
                        s.slotType,
                        s.slotSubType
                      );
                      const wei = isYieldTier
                        ? estimatedClaimableByKey.get(
                          rowKey(row.cityId, row.x, row.y)
                        )
                        : undefined;
                      const gcPer24h = getResidentialGameCashYieldPer24h(
                        s.slotType,
                        s.slotSubType
                      );
                      const slotKind = getSlotTypeName(s.slotType);

                      return (
                        <tr
                          key={`${row.cityId}-${row.x}-${row.y}`}
                          className="border-b border-border/80 hover:bg-muted/25"
                        >
                          <td className="sticky left-0 z-[1] max-w-[180px] bg-card px-2 py-1.5 pl-3 align-middle shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.25)]">
                            <span className="line-clamp-2 font-medium text-foreground">
                              {label}
                            </span>
                            <span className="block font-mono text-[10px] text-muted-foreground">
                              v{s.variant}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 align-middle text-muted-foreground">
                            {slotKind}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 align-middle font-mono text-foreground">
                            ({row.x}, {row.y})
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                            <span
                              className={
                                s.isOperating
                                  ? "text-emerald-400"
                                  : "text-muted-foreground"
                              }
                            >
                              {s.isOperating ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right align-middle font-mono tabular-nums text-foreground">
                            {formatMafiaStakingFromWei(s.stakingAmount)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right align-middle font-mono tabular-nums text-foreground">
                            {s.yieldPayout}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 align-middle font-mono text-foreground">
                            {s.familyId > 0 ? `#${s.familyId}` : "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right align-middle tabular-nums text-emerald-400/95">
                            {gcPer24h != null
                              ? gcPer24h.toLocaleString()
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right align-middle font-mono tabular-nums text-foreground">
                            {isYieldTier ? (
                              bulkYieldFetching && wei === undefined ? (
                                <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              ) : wei !== undefined ? (
                                formatWeiWholeUnits(wei)
                              ) : (
                                "—"
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 pr-3 text-right align-middle">
                            <button
                              type="button"
                              onClick={() => {
                                requestFocusSlot(row.cityId, row.x, row.y);
                                onClose();
                              }}
                              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
