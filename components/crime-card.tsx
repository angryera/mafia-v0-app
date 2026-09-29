"use client";

import { formatWeiDisplay, getErrorMessage } from "@/lib/format";
import { useMemo, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReadContract, useAccount } from "wagmi";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { formatCooldownClock, useCooldownRemaining } from "@/hooks/use-cooldown-remaining";
import { decodeEventLog } from "viem";
import { CONTRACT_ABI, RANK_ABI, type CRIME_TYPES } from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Crosshair,
  CheckCircle2,
  XCircle,
  Coins,
  Lock,
  Footprints,
  Timer,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RISK_COLORS = {
  Low: "text-green-400 bg-green-400/10 border-green-400/20",
  Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  High: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Extreme: "text-red-400 bg-red-400/10 border-red-400/20",
} as const;

type CrimeType = (typeof CRIME_TYPES)[number];

type CrimeOutcomeKind = "success" | "escaped" | "jailed";

interface CrimeResult {
  success: boolean;
  jailed: boolean;
  cashAmount: bigint;
  xpPoint: bigint;
  nextCrimeTime: number;
}

function crimeOutcomeKind(result: CrimeResult): CrimeOutcomeKind {
  if (result.jailed) return "jailed";
  if (result.success) return "success";
  return "escaped";
}

const OUTCOME_COPY: Record<
  CrimeOutcomeKind,
  { title: string; detail: (label: string) => string }
> = {
  success: {
    title: "Crime successful",
    detail: (label) => `${label} paid off.`,
  },
  escaped: {
    title: "Failed, but you got away",
    detail: (label) => `${label} fell apart. You slipped away before anyone could grab you.`,
  },
  jailed: {
    title: "Caught and jailed",
    detail: (label) => `${label} went wrong. You were caught and sent to jail.`,
  },
};

function CrimeOutcomeDialog({
  crime,
  result,
  hash,
  open,
  onOpenChange,
}: {
  crime: CrimeType;
  result: CrimeResult;
  hash?: `0x${string}`;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const explorer = useChainExplorer();
  const kind = crimeOutcomeKind(result);
  const copy = OUTCOME_COPY[kind];
  const xp = Number(result.xpPoint);
  const cashLabel = formatWeiDisplay(result.cashAmount, 0, "0");
  const cooldownRemaining = useCooldownRemaining(
    result.nextCrimeTime > 0 ? result.nextCrimeTime : undefined,
  );
  const cooldownSeconds =
    cooldownRemaining === null ? null : Math.ceil(cooldownRemaining / 1000);

  const icon =
    kind === "success" ? (
      <CheckCircle2 className="h-6 w-6 text-green-400" />
    ) : kind === "escaped" ? (
      <Footprints className="h-6 w-6 text-yellow-400" />
    ) : (
      <Lock className="h-6 w-6 text-red-400" />
    );

  const iconWrap =
    kind === "success"
      ? "bg-green-400/10"
      : kind === "escaped"
        ? "bg-yellow-400/10"
        : "bg-red-400/10";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconWrap)}>
              {icon}
            </div>
            <div className="min-w-0 space-y-1.5 text-left">
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.detail(crime.label)}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Crime</span>
            <span className="font-medium text-foreground">{crime.label}</span>
          </div>
          {kind === "success" && result.cashAmount > BigInt(0) && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Coins className="h-3.5 w-3.5 text-yellow-400" />
                Cash
              </span>
              <span className="font-mono font-semibold text-yellow-400">+{cashLabel}</span>
            </div>
          )}
          {xp > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">XP</span>
              <span className="font-mono font-semibold text-primary">+{xp.toLocaleString()}</span>
            </div>
          )}
          {kind === "jailed" && (
            <div className="flex items-center gap-2 rounded-md bg-red-400/10 px-3 py-2 text-xs text-red-300">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              You are in jail until the sentence ends or someone buys you out.
            </div>
          )}
          {cooldownSeconds !== null && cooldownSeconds > 0 && kind !== "jailed" && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                Next crime
              </span>
              <span className="font-mono font-semibold text-primary tabular-nums">
                {formatCooldownClock(cooldownSeconds)}
              </span>
            </div>
          )}
          {hash && (
            <a
              href={`${explorer}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary hover:underline"
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <DialogFooter>
          {kind === "jailed" ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                onOpenChange(false);
                router.push("/jail");
              }}
            >
              <Lock className="h-4 w-4" />
              Go to jail
            </Button>
          ) : (
            <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CrimeCard({
  crime,
  disabled = false,
  onCommitted,
}: {
  crime: CrimeType;
  disabled?: boolean;
  onCommitted?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const [outcomeOpen, setOutcomeOpen] = useState(false);

  const { data: rankRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankLevel",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const rankLevel = rankRaw !== undefined ? Number(rankRaw) : null;

  const { data: successRateData } = useReadContract({
    address: addresses.crime,
    abi: CONTRACT_ABI,
    functionName: "getSuccessRate",
    args: rankLevel !== null ? [rankLevel, crime.id] : undefined,
    query: { enabled: rankLevel !== null },
  });

  const successRate = successRateData !== undefined ? Math.min(Number(successRateData) / 100, 100) : null;

  const crimeTx = useContractTransaction();
  const writeContract = crimeTx.writeAsync;
  const hash = crimeTx.hash;
  const isPending = crimeTx.isPending;
  const error = crimeTx.error;
  const reset = crimeTx.reset;
  const receipt = crimeTx.receipt.data;
  const isConfirming = crimeTx.isConfirming;
  const isSuccess = crimeTx.isSuccess;

  const crimeResult = useMemo(() => {
    if (!receipt?.logs) return null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: CONTRACT_ABI,
          data: log.data,
          topics: log.topics,
          strict: false,
        });
        if (decoded.eventName === "NewCrime") {
          const args = decoded.args as unknown as {
            criminal: `0x${string}`;
            crimeType: number;
            isSuccess: boolean;
            isJailed: boolean;
            cashAmount: bigint;
            xpPoint: bigint;
            nextCrimeTime: bigint;
            timestamp: bigint;
          };
          return {
            success: args.isSuccess,
            jailed: args.isJailed,
            cashAmount: args.cashAmount,
            xpPoint: args.xpPoint,
            nextCrimeTime: Number(args.nextCrimeTime),
          };
        }
      } catch {
        // Not our event, skip
      }
    }
    return null;
  }, [receipt]);

  const outcomeShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!crimeResult || !hash || outcomeShownRef.current === hash) return;
    outcomeShownRef.current = hash;
    onCommitted?.();
    setOutcomeOpen(true);
  }, [crimeResult, hash, onCommitted]);

  const handleExecute = async () => {
    reset();
    setOutcomeOpen(false);
    try {
      await writeContract({
        address: addresses.crime,
        abi: CONTRACT_ABI,
        functionName: "makeCrime",
        args: [crime.id],
      });
    } catch (e) {
      console.error("makeCrime error:", e);
    }
  };

  const isLoading = isPending || isConfirming;
  const outcomeKind = crimeResult ? crimeOutcomeKind(crimeResult) : null;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300",
        disabled
          ? "opacity-60"
          : "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        outcomeKind === "success" && "border-green-400/30",
        outcomeKind === "escaped" && "border-yellow-400/30",
        (outcomeKind === "jailed" || error) && "border-red-400/30"
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {crime.label}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {crime.description}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            RISK_COLORS[crime.risk]
          )}
        >
          {crime.risk}
        </span>
      </div>

      {/* Success Rate */}
      {successRate !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Success Rate</span>
            <span className={cn(
              "font-mono text-xs font-semibold",
              successRate >= 70 ? "text-green-400" :
                successRate >= 40 ? "text-yellow-400" :
                  "text-red-400"
            )}>
              {successRate}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                successRate >= 70 ? "bg-green-400" :
                  successRate >= 40 ? "bg-yellow-400" :
                    "bg-red-400"
              )}
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      )}

      {/* ID */}
      <div className="mb-4 rounded-md bg-background/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Crime ID</span>
          <span className="font-mono text-xs text-foreground">{crime.id}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Function</span>
          <span className="font-mono text-[10px] text-primary">
            makeCrime(uint8)
          </span>
        </div>
      </div>

      {isSuccess && hash && crimeResult && outcomeKind && (
        <button
          type="button"
          onClick={() => setOutcomeOpen(true)}
          className={cn(
            "mb-3 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left",
            outcomeKind === "success" && "bg-green-400/10",
            outcomeKind === "escaped" && "bg-yellow-400/10",
            outcomeKind === "jailed" && "bg-red-400/10",
          )}
        >
          <span className="flex items-center gap-2">
            {outcomeKind === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
            ) : outcomeKind === "escaped" ? (
              <Footprints className="h-4 w-4 shrink-0 text-yellow-400" />
            ) : (
              <Lock className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                outcomeKind === "success" && "text-green-400",
                outcomeKind === "escaped" && "text-yellow-400",
                outcomeKind === "jailed" && "text-red-400",
              )}
            >
              {OUTCOME_COPY[outcomeKind].title}
            </span>
          </span>
          <span className="text-[10px] font-medium text-muted-foreground underline">
            View
          </span>
        </button>
      )}
      {isSuccess && hash && !crimeResult && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
          <a
            href={`${explorer}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
          >
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </a>
        </div>
      )}
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
          <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-400 line-clamp-2">
            {error.message.includes("User rejected")
              ? "Transaction rejected by user"
              : getErrorMessage(error)}
          </p>
        </div>
      )}

      {/* Button */}
      <button
        onClick={handleExecute}
        disabled={!isConnected || isLoading || disabled}
        className={cn(
          "mt-auto flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
          isConnected
            ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            : "bg-secondary text-muted-foreground cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isPending ? "Confirm in wallet..." : "Confirming..."}
          </>
        ) : (
          <>
            <Crosshair className="h-4 w-4" />
            {isConnected ? "Execute" : "Connect Wallet"}
          </>
        )}
      </button>

      {crimeResult && (
        <CrimeOutcomeDialog
          crime={crime}
          result={crimeResult}
          hash={hash}
          open={outcomeOpen}
          onOpenChange={setOutcomeOpen}
        />
      )}
    </div>
  );
}
