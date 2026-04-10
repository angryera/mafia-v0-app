"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { INGAME_CURRENCY_ABI } from "@/lib/contract";
import { useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { DollarSign, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AssetCash() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { authData, isSigning, signError, requestSignature } = useAuth();

  const {
    data: balanceRaw,
    isLoading,
    isError,
    refetch,
  } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const balance =
    balanceRaw !== undefined ? Number(formatEther(balanceRaw as bigint)).toLocaleString() : null;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <DollarSign className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Cash Balance</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to view your cash balance.
        </p>
      </div>
    );
  }

  if (isSigning) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">
          Sign to Verify
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please sign the message in your wallet to view your balance.
        </p>
      </div>
    );
  }

  if (signError || (!authData && !isSigning)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">
          Signature Required
        </p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          A wallet signature is needed to verify your identity.
        </p>
        <button
          onClick={requestSignature}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign Message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Cash Balance
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              {addresses.ingameCurrency.slice(0, 6)}...
              {addresses.ingameCurrency.slice(-4)}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          )}
          title="Refresh balance"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </button>
      </div>

      <div className="rounded-lg bg-background/50 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Loading balance...
            </span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-red-400">Failed to load balance.</p>
            <button
              onClick={() => refetch()}
              className="text-xs text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-4xl font-bold tracking-tight text-foreground">
              {balance}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">In-game Cash</p>
          </div>
        )}
      </div>
    </div>
  );
}
