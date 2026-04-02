"use client";

import {
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
} from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TravelApprove() {
  const { isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useChainWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const handleApprove = () => {
    reset();
    writeContract({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const isLoading = isPending || isConfirming;

  if (isSuccess && hash) {
    return (
      <div className="mb-6 rounded-xl border border-green-400/30 bg-green-400/5 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-400">
              InGameCurrency Approved
            </p>
            <p className="mt-0.5 text-xs text-green-400/70">
              Unlimited spend approved. You can now travel to any destination.
            </p>
            <a
              href={`${explorer}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 font-mono text-[10px] text-green-400/60 underline decoration-green-400/20 hover:decoration-green-400/60"
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-6 rounded-xl border p-4",
        error ? "border-red-400/30 bg-red-400/5" : "border-chain-accent/30 bg-chain-accent/5"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              error ? "text-red-400" : "text-chain-accent"
            )}
          />
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                error ? "text-red-400" : "text-chain-accent"
              )}
            >
              Approval Required
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs",
                error ? "text-red-400/70" : "text-chain-accent/70"
              )}
            >
              You must approve InGameCurrency spend before traveling.
            </p>
            {error && (
              <p className="mt-1 text-[10px] text-red-400/70 line-clamp-1">
                {error.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : error.message.split("\n")[0]}
              </p>
            )}
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Contract: {addresses.ingameCurrency.slice(0, 6)}...{addresses.ingameCurrency.slice(-4)}
            </p>
          </div>
        </div>

        <button
          onClick={handleApprove}
          disabled={!isConnected || isLoading}
          className={cn(
            "flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            isConnected
              ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isPending ? "Confirm..." : "Approving..."}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              {isConnected ? "Approve" : "Connect Wallet"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
