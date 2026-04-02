"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  BODYGUARD_TRAINING_ABI,
  BODYGUARD_INFO,
  BODYGUARD_CATEGORIES,
  INGAME_CURRENCY_ABI,
  getBodyguardTrainingCost,
  ItemCategory,
  type TrainingSlotType,
} from "@/lib/contract";
import { parseEther, formatEther, maxUint256 } from "viem";
import {
  Shield,
  Swords,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ── Types ───────────────────────────────────────────────────────
interface BodyguardItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId: number;
}

declare global {
  interface Window {
    MafiaInventory?: {
      getItemsByCategory: (opts: {
        chain: string;
        contractAddress: string;
        categoryId: number;
        maxItems: number;
        onProgress?: (info: { fetched: number; batchIndex: number }) => void;
      }) => Promise<BodyguardItem[]>;
    };
  }
}

// ── Script loader ───────────────────────────────────────────────
function useInventoryScript() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.MafiaInventory) {
      setReady(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="/js/mafia-utils.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setError("Failed to load inventory script");
    document.head.appendChild(script);
  }, []);

  return { ready, error };
}

// ── Helpers ─────────────────────────────────────────────────────
function getBodyguardName(categoryId: number): string {
  return BODYGUARD_INFO[categoryId]?.name ?? `Bodyguard #${categoryId}`;
}

function getBodyguardLevel(typeId: number): number {
  return typeId + 1;
}

function formatTimeRemaining(endTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = endTime - now;
  if (remaining <= 0) return "Ready!";

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

// ── Level Progress Indicator ────────────────────────────────────
function LevelProgress({
  currentLevel,
  targetLevel,
  maxLevel = 10,
  isTraining,
}: {
  currentLevel: number;
  targetLevel?: number;
  maxLevel?: number;
  isTraining: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxLevel }).map((_, i) => {
        const lvl = i + 1;
        const isActive = lvl <= currentLevel;
        const isTarget = targetLevel !== undefined && lvl === targetLevel;
        return (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-all duration-300",
              isTarget && isTraining
                ? "bg-primary animate-pulse"
                : isActive
                  ? "bg-primary"
                  : "bg-secondary"
            )}
            title={`Level ${lvl}`}
          />
        );
      })}
    </div>
  );
}

// ── Training Slot ───────────────────────────────────────────────
function TrainingSlot({
  slot,
  slotIndex,
  onSelectSlot,
  onFinishTraining,
  isFinishing,
}: {
  slot: TrainingSlotType;
  slotIndex: number;
  onSelectSlot: (slotId: number) => void;
  onFinishTraining: (slotId: number) => void;
  isFinishing: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!slot.isTraining) {
      setIsComplete(false);
      return;
    }

    function tick() {
      const now = Math.floor(Date.now() / 1000);
      const complete = slot.endTime <= now;
      setIsComplete(complete);
      setTimeLeft(formatTimeRemaining(slot.endTime));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [slot.isTraining, slot.endTime]);

  const bgName = getBodyguardName(slot.newCategoryId);
  // For training slot, the current level is newTypeId (since newTypeId is target)
  // So old level = newTypeId - 1... but newTypeId is the typeId AFTER training, so current = newTypeId, level = newTypeId + 1
  const targetLevel = slot.newTypeId + 1;
  const currentLevel = slot.newTypeId; // old typeId = newTypeId - 1, so old level = newTypeId

  if (!slot.isTraining) {
    // Empty slot
    return (
      <div className="flex items-center gap-4 rounded-lg border border-dashed border-border bg-card/50 p-4 transition-all hover:border-primary/30">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/50">
          <Shield className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            Empty Slot #{slotIndex + 1}
          </p>
          <LevelProgress
            currentLevel={0}
            maxLevel={10}
            isTraining={false}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectSlot(slotIndex)}
          className="gap-1.5 text-xs"
        >
          <Dumbbell className="h-3.5 w-3.5" />
          Train
        </Button>
      </div>
    );
  }

  // Active training
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4 transition-all",
        isComplete
          ? "border-green-500/30 bg-green-500/5"
          : "border-primary/30 bg-primary/5"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg",
          isComplete ? "bg-green-500/20" : "bg-primary/20"
        )}
      >
        {isComplete ? (
          <ShieldCheck className="h-5 w-5 text-green-400" />
        ) : (
          <Dumbbell className="h-5 w-5 text-primary animate-pulse" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {bgName}
          </p>
          <span className="text-xs text-muted-foreground">
            #{slot.oldItemId}
          </span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            Lvl {currentLevel} &rarr; Lvl {targetLevel}
          </span>
        </div>
        <LevelProgress
          currentLevel={currentLevel}
          targetLevel={targetLevel}
          maxLevel={10}
          isTraining={true}
        />
      </div>
      <div className="flex flex-col items-end gap-1">
        {isComplete ? (
          <Button
            variant="default"
            size="sm"
            onClick={() => onFinishTraining(slotIndex)}
            disabled={isFinishing}
            className="gap-1.5 text-xs bg-green-600 hover:bg-green-700"
          >
            {isFinishing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Finishing...
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                Finish Training
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {timeLeft}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Training Dialog ─────────────────────────────────────────────
function TrainingDialog({
  item,
  slotId,
  open,
  onOpenChange,
  onSuccess,
}: {
  item: BodyguardItem;
  slotId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { toast } = useToast();

  const bgInfo = BODYGUARD_INFO[item.categoryId];
  const bgName = bgInfo?.name ?? "Unknown";
  const currentLevel = item.typeId + 1;
  const nextLevel = currentLevel + 1;
  const cost = getBodyguardTrainingCost(item.categoryId, item.typeId);

  // Approve cash
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Train action
  const {
    writeContract,
    data: trainHash,
    isPending: trainPending,
    reset: resetTrain,
  } = useChainWriteContract();
  const { isLoading: trainConfirming, isSuccess: trainSuccess } =
    useWaitForTransactionReceipt({ hash: trainHash });

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      resetApprove();
      resetTrain();
    }
  }, [open, resetApprove, resetTrain]);

  // Success toast
  useEffect(() => {
    if (trainSuccess && trainHash) {
      toast({
        title: "Training Started",
        description: `${bgName} #${item.itemId} is now training to Level ${nextLevel}!`,
      });
      onOpenChange(false);
      onSuccess();
    }
  }, [trainSuccess, trainHash, bgName, item.itemId, nextLevel, toast, onOpenChange, onSuccess]);

  useEffect(() => {
    if (approveSuccess && approveHash) {
      toast({
        title: "Cash Spend Approved",
        description: "You can now start training your bodyguard.",
      });
    }
  }, [approveSuccess, approveHash, toast]);

  const approveLoading = approvePending || approveConfirming;
  const trainLoading = trainPending || trainConfirming;

  function handleApprove() {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.bodyguardTraining, maxUint256],
    });
  }

  function handleTrain() {
    writeContract({
      address: addresses.bodyguardTraining,
      abi: BODYGUARD_TRAINING_ABI,
      functionName: "trainBodyguard",
      args: [BigInt(slotId), BigInt(item.itemId)],
    });
  }

  const totalDefense = (bgInfo?.defensePerLevel ?? 0) * nextLevel;
  const totalOffense = (bgInfo?.offensePerLevel ?? 0) * nextLevel;
  const currentDefense = (bgInfo?.defensePerLevel ?? 0) * currentLevel;
  const currentOffense = (bgInfo?.offensePerLevel ?? 0) * currentLevel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Train {bgName}</DialogTitle>
          <DialogDescription>
            Train {bgName} #{item.itemId} from Level {currentLevel} to Level{" "}
            {nextLevel}. This requires a cash payment.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Bodyguard preview */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {bgName}
                </p>
                <span className="font-mono text-[10px] text-muted-foreground">
                  #{item.itemId}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                  Lvl {currentLevel} &rarr; Lvl {nextLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Stats change */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Stats After Training
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Shield className="h-3 w-3 text-cyan-400" />
                  Defense
                </span>
                <span className="text-foreground">
                  <span className="text-muted-foreground">{currentDefense}</span>
                  <ChevronRight className="inline h-3 w-3 text-muted-foreground/50" />
                  <span className="font-semibold text-cyan-400">{totalDefense}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Swords className="h-3 w-3 text-red-400" />
                  Offense
                </span>
                <span className="text-foreground">
                  <span className="text-muted-foreground">{currentOffense}</span>
                  <ChevronRight className="inline h-3 w-3 text-muted-foreground/50" />
                  <span className="font-semibold text-red-400">{totalOffense}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Training cost */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Training Cost
              </span>
              <span className="text-sm font-semibold text-foreground">
                {cost.toLocaleString()} cash
              </span>
            </div>
          </div>

          {/* Step 1: Approve */}
          <div
            className={cn(
              "rounded-lg border p-3",
              approveSuccess
                ? "border-green-500/30 bg-green-500/5"
                : approveError
                  ? "border-red-400/30 bg-red-400/5"
                  : "border-chain-accent/30 bg-chain-accent/5"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  approveSuccess
                    ? "bg-green-500/20 text-green-400"
                    : "bg-chain-accent/20 text-chain-accent"
                )}
              >
                {approveSuccess ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  "1"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    approveSuccess ? "text-green-400" : "text-foreground"
                  )}
                >
                  {approveSuccess ? "Cash Spend Approved" : "Approve Cash Spend"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {approveSuccess
                    ? "Approval confirmed. You can now train your bodyguard."
                    : "You must approve cash spend before training."}
                </p>

                {approveError && (
                  <p className="mt-1 text-[10px] text-red-400">
                    {(approveError as Error).message?.includes("User rejected")
                      ? "Transaction rejected by user"
                      : (approveError as Error).message?.split("\n")[0]}
                  </p>
                )}

                {approveHash && (
                  <a
                    href={`${explorer}/tx/${approveHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block font-mono text-[10px] text-primary hover:underline"
                  >
                    {approveHash.slice(0, 10)}...{approveHash.slice(-8)}
                  </a>
                )}

                {!approveSuccess && (
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={approveLoading}
                    className="mt-2 h-8 gap-1.5 text-xs"
                  >
                    {approveLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {approvePending
                          ? "Confirm in wallet..."
                          : "Approving..."}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Approve
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Train */}
          <div
            className={cn(
              "rounded-lg border p-3",
              approveSuccess
                ? "border-chain-accent/30 bg-chain-accent/5"
                : "border-border bg-background/30 opacity-50"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  approveSuccess
                    ? "bg-chain-accent/20 text-chain-accent"
                    : "bg-muted text-muted-foreground"
                )}
              >
                2
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    approveSuccess ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  Start Training
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {approveSuccess
                    ? "Click Train Bodyguard below to begin training."
                    : "Complete step 1 first to unlock training."}
                </p>
              </div>
            </div>
          </div>

          {/* Tx status */}
          {trainHash && (
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">
                {"Tx: "}
                <a
                  href={`${explorer}/tx/${trainHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  {trainHash.slice(0, 10)}...{trainHash.slice(-8)}
                </a>
              </p>
              {trainConfirming && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for confirmation...
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={trainLoading || approveLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTrain}
            disabled={!approveSuccess || trainLoading}
          >
            {trainLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {trainPending
              ? "Confirm in wallet..."
              : trainConfirming
                ? "Confirming..."
                : "Train Bodyguard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bodyguard Card ──────────────────────────────────────────────
function BodyguardCard({
  item,
  onSelect,
}: {
  item: BodyguardItem;
  onSelect: (item: BodyguardItem) => void;
}) {
  const bgInfo = BODYGUARD_INFO[item.categoryId];
  const bgName = bgInfo?.name ?? "Unknown";
  const level = item.typeId + 1;
  const isMaxLevel = level >= 10;
  const defense = (bgInfo?.defensePerLevel ?? 0) * level;
  const offense = (bgInfo?.offensePerLevel ?? 0) * level;

  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-lg border bg-card p-3 transition-all duration-150",
        isMaxLevel
          ? "border-primary/20 opacity-60"
          : "border-border hover:border-primary/30 hover:bg-card/80"
      )}
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Shield className="h-5 w-5 text-primary" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-shrink-0 flex-col sm:w-32">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {bgName}
            </h3>
            <span className="font-mono text-[10px] text-muted-foreground">
              #{item.itemId}
            </span>
          </div>
          <span
            className={cn(
              "inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              isMaxLevel
                ? "text-primary bg-primary/10"
                : "text-muted-foreground bg-muted-foreground/10"
            )}
          >
            {isMaxLevel ? "MAX LEVEL" : `Level ${level}`}
          </span>
        </div>

        {/* Stats */}
        <div className="flex flex-1 items-center gap-3 text-xs sm:gap-4">
          <div
            className="flex items-center gap-1 text-muted-foreground"
            title="Defense"
          >
            <Shield className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-medium text-foreground">{defense}</span>
          </div>
          <div
            className="flex items-center gap-1 text-muted-foreground"
            title="Offense"
          >
            <Swords className="h-3.5 w-3.5 text-red-400" />
            <span className="font-medium text-foreground">{offense}</span>
          </div>
        </div>

        {/* Level bar */}
        <div className="sm:w-32 sm:flex-shrink-0">
          <LevelProgress
            currentLevel={level}
            maxLevel={10}
            isTraining={false}
          />
        </div>
      </div>

      {!isMaxLevel && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelect(item)}
          className="gap-1.5 text-xs flex-shrink-0"
        >
          <Dumbbell className="h-3.5 w-3.5" />
          Train
        </Button>
      )}
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────
function BodyguardRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 animate-pulse">
      <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-secondary/50" />
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-col gap-1.5 sm:w-32">
          <div className="h-4 w-20 rounded bg-secondary/50" />
          <div className="h-3 w-14 rounded bg-secondary/30" />
        </div>
        <div className="flex flex-1 gap-4">
          <div className="h-3 w-10 rounded bg-secondary/30" />
          <div className="h-3 w-10 rounded bg-secondary/30" />
        </div>
        <div className="h-2 w-28 rounded-full bg-secondary/50" />
      </div>
      <div className="h-8 w-16 rounded bg-secondary/30" />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function BodyguardTrainingAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const { ready: scriptReady, error: scriptError } = useInventoryScript();

  const [bodyguards, setBodyguards] = useState<BodyguardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    fetched: number;
    batchIndex: number;
  } | null>(null);

  // Training slots from contract
  const {
    data: trainingSlotsRaw,
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = useReadContract({
    address: addresses.bodyguardTraining,
    abi: BODYGUARD_TRAINING_ABI,
    functionName: "getTrainingSlots",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  console.log("[v0] trainingSlotsRaw:", trainingSlotsRaw);
  console.log("[v0] trainingSlotsRaw type:", typeof trainingSlotsRaw);
  console.log("[v0] trainingSlotsRaw is array:", Array.isArray(trainingSlotsRaw));
  if (trainingSlotsRaw) {
    console.log("[v0] trainingSlotsRaw length:", (trainingSlotsRaw as any[]).length);
    (trainingSlotsRaw as any[]).forEach((slot: any, idx: number) => {
      console.log(`[v0] Slot ${idx}:`, JSON.stringify(slot, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    });
  }

  const trainingSlots: TrainingSlotType[] = trainingSlotsRaw
    ? (trainingSlotsRaw as any[]).map((slot: any) => ({
        endTime: Number(slot.endTime),
        isTraining: slot.isTraining,
        newCategoryId: Number(slot.newCategoryId),
        newTypeId: Number(slot.newTypeId),
        oldItemId: Number(slot.oldItemId),
        startTime: Number(slot.startTime),
        trainingCost: Number(formatEther(slot.trainingCost)),
      }))
    : [];

  console.log("[v0] Parsed trainingSlots:", trainingSlots);

  // Dialog state
  const [selectedItem, setSelectedItem] = useState<BodyguardItem | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Finish training state
  const [finishingSlotId, setFinishingSlotId] = useState<number | null>(null);
  const {
    writeContract: writeFinish,
    data: finishHash,
    isPending: finishPending,
    reset: resetFinish,
  } = useChainWriteContract();
  const { isLoading: finishConfirming, isSuccess: finishSuccess } =
    useWaitForTransactionReceipt({ hash: finishHash });
  const { toast } = useToast();

  const fetchBodyguards = useCallback(async () => {
    if (!window.MafiaInventory || !address) return;

    setLoading(true);
    setError(null);
    setProgress(null);
    setBodyguards([]);

    try {
      const allItems: BodyguardItem[] = [];

      for (const catId of BODYGUARD_CATEGORIES) {
        const items = await window.MafiaInventory.getItemsByCategory({
          chain: "bnb",
          contractAddress: chainConfig.addresses.inventory,
          categoryId: catId,
          maxItems: 100000,
          onProgress: (info) => {
            setProgress(info);
          },
        });

        const myItems = items.filter(
          (item) => item.owner.toLowerCase() === address.toLowerCase()
        );
        allItems.push(...myItems);
      }

      setBodyguards(allItems);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch bodyguards"
      );
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [address, chainConfig.addresses.inventory]);

  useEffect(() => {
    if (scriptReady && isConnected && address) {
      fetchBodyguards();
    }
  }, [scriptReady, isConnected, address, fetchBodyguards]);

  // Find first available slot
  function findAvailableSlot(): number {
    const idx = trainingSlots.findIndex((s) => !s.isTraining);
    return idx >= 0 ? idx : 0;
  }

  function handleSelectBodyguard(item: BodyguardItem) {
    const slotId = findAvailableSlot();
    setSelectedItem(item);
    setSelectedSlotId(slotId);
    setDialogOpen(true);
  }

  function handleSlotSelect(slotId: number) {
    // Only open dialog if we have bodyguards available
    const trainable = bodyguards.filter((bg) => bg.typeId < 9);
    if (trainable.length > 0) {
      setSelectedSlotId(slotId);
      // Select the first trainable bodyguard
      setSelectedItem(trainable[0]);
      setDialogOpen(true);
    }
  }

  function handleSuccess() {
    refetchSlots();
    fetchBodyguards();
  }

  // Handle finish training success
  useEffect(() => {
    if (finishSuccess && finishHash) {
      toast({
        title: "Training Complete!",
        description: "Your bodyguard has finished training and leveled up!",
      });
      setFinishingSlotId(null);
      resetFinish();
      refetchSlots();
      fetchBodyguards();
    }
  }, [finishSuccess, finishHash, toast, resetFinish, refetchSlots, fetchBodyguards]);

  function handleFinishTraining(slotId: number) {
    setFinishingSlotId(slotId);
    writeFinish({
      address: addresses.bodyguardTraining,
      abi: BODYGUARD_TRAINING_ABI,
      functionName: "finishTraining",
      args: [slotId],
    });
  }

  // ── Not connected ─────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-lg font-semibold text-foreground">Connect Wallet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to view your bodyguards.
        </p>
      </div>
    );
  }

  // ── Script error ──────────────────────────────────────────
  if (scriptError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-card py-16">
        <AlertCircle className="h-10 w-10 text-destructive/60 mb-3" />
        <p className="text-lg font-semibold text-foreground">Script Error</p>
        <p className="mt-1 text-sm text-muted-foreground">{scriptError}</p>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading || !scriptReady) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {!scriptReady
                ? "Loading inventory module..."
                : "Scanning blockchain for your bodyguards..."}
            </p>
            {progress && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Fetched {progress.fetched.toLocaleString()} items (batch{" "}
                {progress.batchIndex})
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <BodyguardRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──��──────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-card py-16">
        <AlertCircle className="h-10 w-10 text-destructive/60 mb-3" />
        <p className="text-lg font-semibold text-foreground">Error</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={fetchBodyguards}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const trainableBodyguards = bodyguards.filter((bg) => bg.typeId < 9);
  const maxLevelBodyguards = bodyguards.filter((bg) => bg.typeId >= 9);

  return (
    <div className="flex flex-col gap-6">
      {/* Training Slots */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Training Slots
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchSlots()}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
        {slotsLoading ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading training slots...
            </p>
          </div>
        ) : trainingSlots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No training slots found. Training slots will appear here once
              available.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {trainingSlots.map((slot, i) => (
              <TrainingSlot
                key={i}
                slot={slot}
                slotIndex={i}
                onSelectSlot={handleSlotSelect}
                onFinishTraining={handleFinishTraining}
                isFinishing={finishingSlotId === i && (finishPending || finishConfirming)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Available Bodyguards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Your Bodyguards
            <span className="ml-2 text-muted-foreground font-normal">
              ({bodyguards.length})
            </span>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchBodyguards}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {bodyguards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
            <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-lg font-semibold text-foreground">
              No Bodyguards Found
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {"You don't have any bodyguards yet. Buy one from the Shop!"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={fetchBodyguards}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {trainableBodyguards.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-1">
                  Trainable ({trainableBodyguards.length})
                </p>
                {trainableBodyguards.map((bg) => (
                  <BodyguardCard
                    key={bg.itemId}
                    item={bg}
                    onSelect={handleSelectBodyguard}
                  />
                ))}
              </>
            )}

            {maxLevelBodyguards.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-1 mt-3">
                  Max Level ({maxLevelBodyguards.length})
                </p>
                {maxLevelBodyguards.map((bg) => (
                  <BodyguardCard
                    key={bg.itemId}
                    item={bg}
                    onSelect={handleSelectBodyguard}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* Training dialog */}
      {selectedItem && (
        <TrainingDialog
          item={selectedItem}
          slotId={selectedSlotId}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedItem(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
