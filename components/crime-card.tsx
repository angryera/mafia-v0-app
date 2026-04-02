"use client";

import { useMemo, useEffect, useRef } from "react";
import { useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { decodeEventLog, formatEther } from "viem";
import { toast } from "sonner";
import { CONTRACT_ABI, RANK_ABI, type CRIME_TYPES } from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { Loader2, Crosshair, CheckCircle2, XCircle, Coins, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const RISK_COLORS = {
  Low: "text-green-400 bg-green-400/10 border-green-400/20",
  Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  High: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Extreme: "text-red-400 bg-red-400/10 border-red-400/20",
} as const;

type CrimeType = (typeof CRIME_TYPES)[number];

export function CrimeCard({ crime, disabled = false }: { crime: CrimeType; disabled?: boolean }) {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

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

  const { writeContract, data: hash, isPending, error, reset } = useChainWriteContract();

  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

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
          const args = decoded.args as {
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
            cashAmount: Number(formatEther(args.cashAmount)),
          };
        }
      } catch {
        // Not our event, skip
      }
    }
    return null;
  }, [receipt]);

  const toastShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!crimeResult || !hash || toastShownRef.current === hash) return;
    toastShownRef.current = hash;

    if (crimeResult.jailed) {
      toast.error("You were jailed");
    } else if (!crimeResult.success) {
      toast.warning("You failed, but got away");
    } else {
      toast.success(`Success - You earned ${crimeResult.cashAmount.toLocaleString()} cash`);
    }
  }, [crimeResult, hash]);

  const handleExecute = () => {
    reset();
    writeContract({
      address: addresses.crime,
      abi: CONTRACT_ABI,
      functionName: "makeCrime",
      args: [crime.id],
    });
  };

  const isLoading = isPending || isConfirming;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300",
        disabled
          ? "opacity-50 pointer-events-none"
          : "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        crimeResult?.success === true && "border-green-400/30",
        (crimeResult?.success === false || error) && "border-red-400/30"
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

      {/* Crime Result */}
      {isSuccess && hash && crimeResult && (
        <div
          className={cn(
            "mb-3 rounded-lg px-3 py-3 space-y-2",
            crimeResult.success ? "bg-green-400/10" : "bg-red-400/10"
          )}
        >
          <div className="flex items-center gap-2">
            {crimeResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                crimeResult.success ? "text-green-400" : "text-red-400"
              )}
            >
              {crimeResult.success ? "Crime Successful!" : "Crime Failed!"}
            </span>
          </div>
          {crimeResult.success && crimeResult.cashAmount > 0 && (
            <div className="flex items-center gap-2 pl-6">
              <Coins className="h-3.5 w-3.5 text-yellow-400" />
              <span className="font-mono text-sm font-semibold text-yellow-400">
                +{crimeResult.cashAmount.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">Cash</span>
            </div>
          )}
          <div className="pl-6">
            <a
              href={`${explorer}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "font-mono text-[10px] underline decoration-current/30 hover:decoration-current",
                crimeResult.success ? "text-green-400/70" : "text-red-400/70"
              )}
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
          </div>
        </div>
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
              : error.message.split("\n")[0]}
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
    </div>
  );
}
