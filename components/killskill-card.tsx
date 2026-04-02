"use client";

import { useState, useMemo } from "react";
import {
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { decodeEventLog, parseEther } from "viem";
import {
  KILLSKILL_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
  type TRAIN_TYPES,
} from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  Loader2,
  Swords,
  CheckCircle2,
  XCircle,
  Trophy,
  Skull,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<number, string> = {
  0: "\u{1F4AA}",
  1: "\u{1F977}",
  2: "\u{1F3AF}",
};

const APPROVE_AMOUNT = parseEther("100000000");

type TrainType = (typeof TRAIN_TYPES)[number];

export function KillSkillCard({ trainType }: { trainType: TrainType }) {
  const { isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const [approved, setApproved] = useState(false);

  // Approve transaction
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Mark approved once confirmed
  if (isApproveConfirmed && !approved) {
    setApproved(true);
  }

  // Train transaction
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useChainWriteContract();

  const { isLoading: isConfirming, isSuccess: isTxConfirmed, data: receipt } =
    useWaitForTransactionReceipt({ hash });

  // Parse the TrainedSkill event from the receipt logs
  const trainResult = useMemo(() => {
    if (!receipt?.logs) return null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: KILLSKILL_CONTRACT_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "TrainedSkill") {
          return {
            isSuccess: (decoded.args as { isSuccess: boolean }).isSuccess,
          };
        }
      } catch {
        // Not our event, skip
      }
    }
    return null;
  }, [receipt]);

  const handleApprove = () => {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.killskill, APPROVE_AMOUNT],
    });
  };

  const handleExecute = () => {
    reset();
    writeContract({
      address: addresses.killskill,
      abi: KILLSKILL_CONTRACT_ABI,
      functionName: "trainSkill",
      args: [trainType.id],
      gas: BigInt(500_000),
    });
  };

  const isApproveLoading = isApprovePending || isApproveConfirming;
  const isTrainLoading = isPending || isConfirming;
  const isLoading = isApproveLoading || isTrainLoading;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        isTxConfirmed && trainResult?.isSuccess && "border-green-400/30",
        isTxConfirmed && trainResult && !trainResult.isSuccess && "border-chain-accent/30",
        error && "border-red-400/30"
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {trainType.label}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {trainType.description}
          </p>
        </div>
        <span className="text-2xl" role="img" aria-label={trainType.label}>
          {TYPE_ICONS[trainType.id]}
        </span>
      </div>

      {/* Info */}
      <div className="mb-4 rounded-md bg-background/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">trainType</span>
          <span className="font-mono text-xs text-foreground">
            {trainType.id}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Function</span>
          <span className="font-mono text-[10px] text-primary">
            trainSkill(int256)
          </span>
        </div>
      </div>

      {/* Training Result Feedback */}
      {isTxConfirmed && trainResult && (
        <div
          className={cn(
            "mb-3 rounded-lg px-3 py-3",
            trainResult.isSuccess ? "bg-green-400/10" : "bg-chain-accent/10"
          )}
        >
          <div className="flex items-center gap-2 mb-1.5">
            {trainResult.isSuccess ? (
              <Trophy className="h-4 w-4 text-green-400" />
            ) : (
              <Skull className="h-4 w-4 text-chain-accent" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                trainResult.isSuccess ? "text-green-400" : "text-chain-accent"
              )}
            >
              {trainResult.isSuccess
                ? "Training Successful!"
                : "Training Failed"}
            </span>
          </div>
          <p
            className={cn(
              "text-[11px] leading-relaxed",
              trainResult.isSuccess
                ? "text-green-400/70"
                : "text-chain-accent/70"
            )}
          >
            {trainResult.isSuccess
              ? `Your ${trainType.label.toLowerCase()} skill has improved.`
              : "Better luck next time. Try training again."}
          </p>
          {hash && (
            <a
              href={`${explorer}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-1.5 font-mono text-[10px] underline decoration-current/30 hover:decoration-current",
                trainResult.isSuccess ? "text-green-400/60" : "text-chain-accent/60"
              )}
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
          )}
        </div>
      )}

      {/* TX confirmed but no event found (fallback) */}
      {isTxConfirmed && !trainResult && hash && (
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

      {/* Approve Error */}
      {approveError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="line-clamp-2 text-[10px] text-red-400">
            {approveError.message.includes("User rejected")
              ? "Approval rejected by user"
              : approveError.message.split("\n")[0]}
          </p>
        </div>
      )}

      {/* Buttons */}
      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={handleApprove}
          disabled={!isConnected || isLoading || approved}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200",
            approved
              ? "bg-green-400/10 text-green-400 cursor-default"
              : isConnected
                ? "bg-secondary text-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {isApproveLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isApprovePending ? "Approve..." : "Confirming..."}
            </>
          ) : approved ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              Approved
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              Approve Cash
            </>
          )}
        </button>
        <button
          onClick={handleExecute}
          disabled={!isConnected || isLoading || !approved}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200",
            isConnected && approved
              ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {isTrainLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isPending ? "Confirm..." : "Confirming..."}
            </>
          ) : (
            <>
              <Swords className="h-4 w-4" />
              Train
            </>
          )}
        </button>
      </div>
    </div>
  );
}
