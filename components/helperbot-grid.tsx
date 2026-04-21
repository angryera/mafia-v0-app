"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { Coins, Loader2, RefreshCw } from "lucide-react";
import { HELPER_BOTS, CREDITS_ABI } from "@/lib/contract";
import { useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { HelperBotDetail } from "@/components/helperbot-detail";
import { HelperBotListRow } from "@/components/helperbot-list-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function HelperBotGrid() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const publicClient = usePublicClient();
  const { authData } = useAuth();

  const [creditBalance, setCreditBalance] = useState<bigint | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!address || !publicClient || !authData) return;
    setCreditLoading(true);
    try {
      const result = await publicClient.readContract({
        address: addresses.buyCredit,
        abi: CREDITS_ABI,
        functionName: "balanceOf",
        args: [address, authData.message, authData.signature],
      });
      setCreditBalance(result as bigint);
    } catch {
      // silently fail
    } finally {
      setCreditLoading(false);
    }
  }, [address, publicClient, authData, addresses.buyCredit]);

  useEffect(() => {
    fetchCredits();
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [fetchCredits]);

  const creditBalanceNum = creditBalance !== null ? Math.floor(Number(formatEther(creditBalance))) : null;
  const selectedBot = HELPER_BOTS.find((bot) => bot.id === selectedBotId) ?? null;

  return (
    <div>
      {/* Credit balance header */}
      {isConnected && (
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chain-accent/10 text-chain-accent">
                <Coins className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Helper Bot Credits</p>
                {creditLoading && creditBalance === null ? (
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : creditBalanceNum !== null ? (
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {creditBalanceNum.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {authData ? "Unable to load" : "Sign in to view"}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={fetchCredits}
              disabled={creditLoading}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Refresh credits"
            >
              <RefreshCw className={cn("h-4 w-4", creditLoading && "animate-spin")} />
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 flex items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Your Helper Bots
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hire bots to automate tasks or withdraw them when done
          </p>
        </div>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {HELPER_BOTS.length} bots
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {HELPER_BOTS.map((bot) => (
          <HelperBotListRow
            key={bot.id}
            bot={bot}
            onOpenHire={() => setSelectedBotId(bot.id)}
          />
        ))}
      </div>

      <Dialog open={selectedBot !== null} onOpenChange={(open) => !open && setSelectedBotId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
          {selectedBot && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBot.label} Details</DialogTitle>
                <DialogDescription>
                  Review helper bot details and continue with hiring from this popup.
                </DialogDescription>
              </DialogHeader>
              <HelperBotDetail
                bot={selectedBot}
                creditBalance={creditBalanceNum}
                onCreditChange={fetchCredits}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
