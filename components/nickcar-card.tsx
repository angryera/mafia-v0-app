"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import {
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
  useSignMessage,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { decodeEventLog, formatEther } from "viem";
import { toast } from "sonner";
import {
  NICKCAR_CONTRACT_ABI,
  RANK_ABI,
  TRAVEL_DESTINATIONS,
  type NICKCAR_TYPES,
} from "@/lib/contract";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { Loader2, Car, CheckCircle2, XCircle, MapPin, AlertTriangle, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

function getCityName(cityId: number): string {
  if (cityId >= 0 && cityId < TRAVEL_DESTINATIONS.length) {
    return TRAVEL_DESTINATIONS[cityId].label;
  }
  return `City #${cityId}`;
}

interface NickResult {
  success: boolean;
  jailed: boolean;
  inventoryItemId: number;
  cityId: number;
  carType: number;
  damagePercent: number;
  xpPoint: number;
}

type NickCarType = (typeof NICKCAR_TYPES)[number];

export function NickCarCard({ carCrime, disabled = false }: { carCrime: NickCarType; disabled?: boolean }) {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const [signing, setSigning] = useState(false);
  const { signMessageAsync } = useSignMessage();

  const { data: rankRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankLevel",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const rankLevel = rankRaw !== undefined ? Number(rankRaw) : null;

  const { data: successRateData } = useReadContract({
    address: addresses.nickcar,
    abi: NICKCAR_CONTRACT_ABI,
    functionName: "getSuccessRate",
    args: rankLevel !== null ? [rankLevel, carCrime.id] : undefined,
    query: { enabled: rankLevel !== null },
  });

  const successRate = successRateData !== undefined ? Math.min(Number(successRateData) / 100, 100) : null;
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useChainWriteContract();

  const { data: receipt, isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const nickResult = useMemo<NickResult | null>(() => {
    if (!receipt?.logs) return null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: NICKCAR_CONTRACT_ABI,
          data: log.data,
          topics: log.topics,
          strict: false,
        });
        if (decoded.eventName === "NewCarNick") {
          const args = decoded.args as {
            criminal: `0x${string}`;
            crimeType: number;
            isSuccess: boolean;
            isJailed: boolean;
            xpPoint: bigint;
            nextNickTime: bigint;
            inventoryItemId: bigint;
            cityId: number;
            carType: number;
            damagePercent: number;
            timestamp: bigint;
            successNonce: bigint;
          };
          return {
            success: args.isSuccess,
            jailed: args.isJailed,
            inventoryItemId: Number(args.inventoryItemId),
            cityId: Number(args.cityId),
            carType: Number(args.carType),
            damagePercent: Number(args.damagePercent),
            xpPoint: Number(args.xpPoint),
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
    if (!nickResult || toastShownRef.current === hash) return;
    toastShownRef.current = hash ?? null;

    if (nickResult.jailed) {
      toast.error("You were jailed! No car this time.");
    } else if (!nickResult.success) {
      toast.warning(`Failed but escaped. +${nickResult.xpPoint} XP`);
    } else {
      toast.success(
        `Stole a car! Item #${nickResult.inventoryItemId} in ${getCityName(nickResult.cityId)} (${nickResult.damagePercent}% damage). +${nickResult.xpPoint} XP`,
      );
    }
  }, [nickResult, hash]);

  const handleExecute = async () => {
    reset();
    setSigning(true);
    try {
      const threeDaysInSeconds = 3 * 24 * 60 * 60;
      const utcTimestamp = Math.floor(Date.now() / 1000) + threeDaysInSeconds;
      const authMessage = `"Sign this message with ${address} - expire at ${utcTimestamp}"`;
      const signature = await signMessageAsync({ message: authMessage });
      setSigning(false);
      writeContract({
        address: addresses.nickcar,
        abi: NICKCAR_CONTRACT_ABI,
        functionName: "nickCar",
        args: [carCrime.id, authMessage, signature],
      });
    } catch {
      setSigning(false);
    }
  };

  const isLoading = signing || isPending || isConfirming;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300",
        disabled
          ? "opacity-50 pointer-events-none"
          : "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        isSuccess && "border-green-400/30",
        error && "border-red-400/30"
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {carCrime.label}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {carCrime.description}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Car className="h-4 w-4" />
        </div>
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

      {/* Info */}
      <div className="mb-4 rounded-md bg-background/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">crimeType</span>
          <span className="font-mono text-xs text-foreground">
            {carCrime.id}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Function</span>
          <span className="font-mono text-[10px] text-primary">
            nickCar(uint8,string,bytes)
          </span>
        </div>
      </div>

      {/* Result */}
      {isSuccess && hash && nickResult && (
        <div
          className={cn(
            "mb-3 rounded-lg px-3 py-2.5",
            nickResult.jailed
              ? "bg-red-400/10"
              : nickResult.success
                ? "bg-green-400/10"
                : "bg-yellow-400/10",
          )}
        >
          {/* Outcome header */}
          <div className="flex items-center gap-2 mb-1.5">
            {nickResult.jailed ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <span className="text-xs font-semibold text-red-400">Jailed!</span>
              </>
            ) : nickResult.success ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
                <span className="text-xs font-semibold text-green-400">Car Stolen!</span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400">Failed, but escaped</span>
              </>
            )}
          </div>

          {/* Car details on success */}
          {nickResult.success && (
            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Item ID</span>
                <span className="font-mono font-semibold text-foreground">#{nickResult.inventoryItemId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </span>
                <span className="font-semibold text-foreground">{getCityName(nickResult.cityId)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Damage</span>
                <span className={cn(
                  "font-mono font-semibold",
                  nickResult.damagePercent === 0 ? "text-green-400" :
                  nickResult.damagePercent <= 50 ? "text-yellow-400" : "text-red-400"
                )}>
                  {nickResult.damagePercent}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Crosshair className="h-3 w-3" /> XP Earned
                </span>
                <span className="font-mono font-semibold text-primary">+{nickResult.xpPoint}</span>
              </div>
            </div>
          )}

          {/* XP on failure */}
          {!nickResult.success && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">XP Earned</span>
              <span className="font-mono font-semibold text-primary">+{nickResult.xpPoint}</span>
            </div>
          )}

          {/* Tx link */}
          <a
            href={`${explorer}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block font-mono text-[10px] text-muted-foreground hover:text-primary hover:underline"
          >
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </a>
        </div>
      )}

      {/* Tx hash only (before result parsed) */}
      {isSuccess && hash && !nickResult && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
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
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="line-clamp-2 text-[10px] text-red-400">
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
            {signing ? "Sign message..." : isPending ? "Confirm in wallet..." : "Confirming..."}
          </>
        ) : (
          <>
            <Car className="h-4 w-4" />
            {isConnected ? "Nick It" : "Connect Wallet"}
          </>
        )}
      </button>
    </div>
  );
}
