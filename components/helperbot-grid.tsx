"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { Coins, Loader2, RefreshCw } from "lucide-react";
import {
  HELPER_BOTS,
  CREDITS_ABI,
  HELPERBOT_CONTRACT_ABI,
  parseHelperBotInfo,
  type HelperBotInfo,
} from "@/lib/contract";
import { useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { HelperBotDetail, type HelperBotDialogMode } from "@/components/helperbot-detail";
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
  const [botInfoById, setBotInfoById] = useState<Record<number, HelperBotInfo>>({});
  const [botsLoading, setBotsLoading] = useState(false);
  const [dialogNow, setDialogNow] = useState(() => Math.floor(Date.now() / 1000));
  const botRequestId = useRef(0);

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

  const fetchBots = useCallback(async () => {
    const requestId = ++botRequestId.current;
    if (!address || !publicClient) {
      setBotInfoById({});
      setBotsLoading(false);
      return;
    }

    setBotsLoading(true);
    const requestedAddress = address;
    const results = await Promise.allSettled(
      HELPER_BOTS.map(async (bot) => {
        const result = await publicClient.readContract({
          address: addresses.helperbot,
          abi: HELPERBOT_CONTRACT_ABI,
          functionName: bot.infoFn,
          args: [requestedAddress],
        });
        return [bot.id, parseHelperBotInfo(result)] as const;
      })
    );

    if (requestId !== botRequestId.current) return;

    setBotInfoById((previous) => {
      const next = { ...previous };
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const [botId, info] = result.value;
          next[botId] = info;
        }
      });
      return next;
    });
    setBotsLoading(false);
  }, [address, publicClient, addresses.helperbot]);

  useEffect(() => {
    setBotInfoById({});
    fetchBots();
    const interval = setInterval(fetchBots, 15000);
    return () => clearInterval(interval);
  }, [fetchBots]);

  useEffect(() => {
    if (selectedBotId === null) return;
    setDialogNow(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => setDialogNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, [selectedBotId]);

  const creditBalanceNum = creditBalance !== null ? Math.floor(Number(formatEther(creditBalance))) : null;
  const selectedBot = HELPER_BOTS.find((bot) => bot.id === selectedBotId) ?? null;
  const selectedBotInfo = selectedBot ? botInfoById[selectedBot.id] ?? null : null;
  const selectedBotMode: HelperBotDialogMode = selectedBotInfo?.isRunning
    ? selectedBotInfo.endTimestamp <= dialogNow
      ? "finished"
      : "running"
    : "start";
  const displayedBots = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const priority = (botId: number) => {
      const info = botInfoById[botId];
      if (!info?.isRunning) return 2;
      return info.endTimestamp <= now ? 0 : 1;
    };

    return [...HELPER_BOTS].sort((a, b) => priority(a.id) - priority(b.id) || a.id - b.id);
  }, [botInfoById]);
  const activeBotCount = Object.values(botInfoById).filter((info) => info.isRunning).length;

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
          {activeBotCount > 0 ? `${activeBotCount} active` : `${HELPER_BOTS.length} bots`}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {displayedBots.map((bot) => (
          <HelperBotListRow
            key={bot.id}
            bot={bot}
            botInfo={botInfoById[bot.id] ?? null}
            isLoading={botsLoading}
            onOpenHire={() => setSelectedBotId(bot.id)}
          />
        ))}
      </div>

      <Dialog open={selectedBot !== null} onOpenChange={(open) => !open && setSelectedBotId(null)}>
        <DialogContent
          key={selectedBot ? `${selectedBot.id}-${selectedBotMode}` : "closed"}
          className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]"
        >
          {selectedBot && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedBotMode === "finished"
                    ? `${selectedBot.label} Results`
                    : selectedBotMode === "running"
                      ? `${selectedBot.label} In Progress`
                      : `Hire ${selectedBot.label}`}
                </DialogTitle>
                <DialogDescription>
                  {selectedBotMode === "finished"
                    ? "Review the completed run and withdraw its results."
                    : selectedBotMode === "running"
                      ? "Monitor the current run, attempts, and remaining time."
                      : "Choose the attempt count and optional perks before starting this bot."}
                </DialogDescription>
              </DialogHeader>
              <HelperBotDetail
                bot={selectedBot}
                mode={selectedBotMode}
                initialBotInfo={selectedBotInfo}
                creditBalance={creditBalanceNum}
                onCreditChange={() => {
                  fetchCredits();
                  fetchBots();
                }}
                onFinished={() => setSelectedBotId(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
