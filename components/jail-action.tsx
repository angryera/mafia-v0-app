"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { COOLDOWN_READ_QUERY } from "@/hooks/use-cooldown-remaining";
import { formatWalletAddress, getErrorMessage } from "@/lib/format";
import {
  JAIL_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
  USER_PROFILE_CONTRACT_ABI,
} from "@/lib/contract";
import { useAuth } from "@/components/auth-provider";
import { useChainAddresses } from "@/components/chain-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JailedPlayersList } from "@/components/jailed-players-list";
import {
  Lock,
  Timer,
  DollarSign,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const CASH_PER_MINUTE = 1500;

function formatSentence(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return "Released";

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function calculateBuyOutCost(remainingSeconds: number): number {
  if (remainingSeconds <= 0) return 0;
  return Math.ceil(remainingSeconds / 60) * CASH_PER_MINUTE;
}

export function JailAction() {
  const { address, isConnected } = useAccount();
  const { authData } = useAuth();
  const addresses = useChainAddresses();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [localApproved, setLocalApproved] = useState(false);

  const { data: jailedUntilRaw, isFetched: sentenceFetched, isError: sentenceError, refetch: refetchSentence } = useReadContract({
    address: addresses.jail,
    abi: JAIL_CONTRACT_ABI,
    functionName: "jailedUntil",
    args: address ? [address] : undefined,
    query: { enabled: !!address, ...COOLDOWN_READ_QUERY },
  });

  const { data: inJailFlag, isFetched: inJailFetched, isError: inJailError } = useReadContract({
    address: addresses.jail,
    abi: JAIL_CONTRACT_ABI,
    functionName: "isUserinJail",
    args: address ? [address] : undefined,
    query: { enabled: !!address, ...COOLDOWN_READ_QUERY },
  });

  const { data: profileData } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const { data: cashBalanceRaw } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowances",
    args: address ? [address, addresses.jail] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const jailedUntil = jailedUntilRaw !== undefined ? Number(jailedUntilRaw) : null;
  const remainingSeconds = jailedUntil === null ? null : Math.max(0, jailedUntil - now);
  const sentenceActive = remainingSeconds !== null && remainingSeconds > 0;
  const isInJail = inJailFlag === true || sentenceActive;
  const sentencePending = !sentenceFetched && !sentenceError && !inJailFetched && !inJailError;
  const username = (profileData as { username?: string } | undefined)?.username?.trim() || null;
  const buyOutCost = remainingSeconds === null ? 0 : calculateBuyOutCost(remainingSeconds);
  const cashBalance =
    cashBalanceRaw !== undefined ? Number(formatEther(cashBalanceRaw as bigint)) : null;
  const allowance = allowanceRaw !== undefined ? Number(formatEther(allowanceRaw as bigint)) : 0;
  const isApproved = localApproved || (buyOutCost > 0 && allowance >= buyOutCost);
  const canAfford = cashBalance === null || cashBalance >= buyOutCost;

  const approveTx = useContractTransaction({
    onSuccess: () => {
      setLocalApproved(true);
      toast.success("Cash spending approved for jail");
      refetchAllowance();
    },
  });

  const buyOutTx = useContractTransaction({
    onSuccess: () => {
      toast.success("You bought yourself out of jail");
      refetchSentence();
    },
  });

  const handleApprove = () => {
    approveTx.reset();
    approveTx.write({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.jail, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const handleBuyOut = async () => {
    if (!address) return;
    buyOutTx.reset();
    try {
      await buyOutTx.writeAsync({
        address: addresses.jail,
        abi: JAIL_CONTRACT_ABI,
        functionName: "buyOut",
        args: [address],
      });
    } catch (error) {
      console.error("buyOut error:", error);
    }
  };

  const activeError = approveTx.error ?? buyOutTx.error;

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Connect Your Wallet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your wallet to buy out other players, or to see your own sentence.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isInJail) {
    return <JailedPlayersList sentencePending={sentencePending} />;
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
          <Lock className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground">You are in jail</h3>
          {username && (
            <p className="mt-1 text-sm font-medium text-foreground">{username}</p>
          )}
          {address && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {formatWalletAddress(address)}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Buy yourself out with cash, or wait for the sentence to end.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-background/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">Time left</p>
          <Badge
            variant="outline"
            className="mt-1.5 border-red-500/50 bg-red-500/10 text-red-400"
          >
            <Timer className="mr-1 h-3 w-3" />
            {formatSentence(remainingSeconds ?? 0)}
          </Badge>
        </div>
        <div className="rounded-lg bg-background/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">Buy out cost</p>
          <p className="mt-1 font-mono text-sm font-semibold text-amber-400">
            ${buyOutCost.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">Your cash</p>
          <p className="mt-1 font-mono text-sm font-semibold text-foreground">
            {cashBalance === null
              ? "—"
              : `$${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          </p>
        </div>
      </div>

      {activeError && (
        <div className="mt-4 rounded-lg bg-red-400/10 px-4 py-3">
          <p className="text-xs text-red-400">
            {activeError.message.includes("User rejected")
              ? "Transaction rejected by user"
              : getErrorMessage(activeError)}
          </p>
        </div>
      )}

      {!canAfford && (
        <p className="mt-4 text-xs text-red-400">
          You need ${buyOutCost.toLocaleString()} cash to buy yourself out.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {!isApproved && (
          <Button onClick={handleApprove} disabled={approveTx.isLoading} className="flex-1">
            {approveTx.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {approveTx.isPending ? "Confirm in wallet..." : "Approving..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Cash
              </>
            )}
          </Button>
        )}
        <Button
          onClick={handleBuyOut}
          disabled={!isApproved || !canAfford || buyOutTx.isLoading || buyOutCost <= 0}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {buyOutTx.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {buyOutTx.isPending ? "Confirm in wallet..." : "Buying out..."}
            </>
          ) : (
            <>
              <DollarSign className="mr-2 h-4 w-4" />
              Buy yourself out for ${buyOutCost.toLocaleString()}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
