"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { INGAME_CURRENCY_ABI } from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  DollarSign,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
} from "lucide-react";

export function CashPage() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData, isSigning: signing, signError, requestSignature } = useAuth();

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

  if (signing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Sign to Verify</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please sign the message in your wallet to load your balance.
        </p>
      </div>
    );
  }

  if (signError) {
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Cash Balance</h3>
            <p className="text-xs text-muted-foreground font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Refresh balance"
        >
          <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </button>
      </div>

      {/* Balance Display */}
      <div className="rounded-lg bg-background/50 p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            In-Game Cash
          </span>
        </div>
        {isLoading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        ) : isError ? (
          <div className="space-y-2">
            <p className="text-lg text-red-400">Failed to load balance</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <p className="text-5xl font-bold tabular-nums text-foreground">
            {balance ?? "0"}
          </p>
        )}
      </div>

      {/* Contract Info */}
      <div className="mt-6 flex items-center justify-between rounded-lg bg-background/50 px-4 py-3">
        <span className="text-xs text-muted-foreground">Contract</span>
        <a
          href={`${explorer}/address/${addresses.ingameCurrency}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-primary/70 hover:text-primary transition-colors"
        >
          {addresses.ingameCurrency.slice(0, 6)}...{addresses.ingameCurrency.slice(-4)}
        </a>
      </div>
    </div>
  );
}
