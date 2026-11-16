"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { Crown, Loader2, RefreshCw, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useChain } from "@/components/chain-provider";
import { PlayerRecordLink, ProfileNamesWarning, useKillRecordNames } from "@/components/kill-record-parts";
import { buildKillLeaderboard, loadAllAttacks, type KillLeaderboardEntry } from "@/lib/killHistoryService";
import { cn } from "@/lib/utils";

export function KillLeaderboardAction() {
  const { address } = useAccount();
  const { activeChain, chainConfig } = useChain();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const names = useKillRecordNames();
  const [leaders, setLeaders] = useState<KillLeaderboardEntry[]>([]);
  const [visibleCount, setVisibleCount] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!publicClient) { setIsLoading(false); setError("Chain RPC is unavailable."); setHasLoaded(true); return; }
    setIsLoading(true);
    setError(null);
    try {
      const entries = await loadAllAttacks({ publicClient, chainId: activeChain, pageSize: 50 });
      if (currentRequest === requestId.current) {
        setLeaders(buildKillLeaderboard(entries, activeChain));
        setVisibleCount(25);
      }
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : "Unable to load the kill leaderboard.");
        setLeaders([]);
      }
    } finally {
      if (currentRequest === requestId.current) { setIsLoading(false); setHasLoaded(true); }
    }
  }, [activeChain, publicClient]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><Skull className="h-6 w-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Combat / rankings</p>
        <h1 className="text-3xl font-bold tracking-tight">Kill leaderboard</h1>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground">The players with the most confirmed kills. Each successful kill counts once; backfire and double kills credit the defender.</p>
      </header>
      <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{leaders.length} {leaders.length === 1 ? "player" : "players"}</p><Button variant="outline" onClick={() => void load()} disabled={isLoading} className="gap-2"><RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />Refresh</Button></div>
      <ProfileNamesWarning error={names.error} />
      {isLoading || (!hasLoaded && !error) ? (
        <Card className="border-border/50 bg-card/50"><CardContent className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Scanning all attack records...</CardContent></Card>
      ) : error ? (
        <Card className="border-red-500/30 bg-red-500/5"><CardContent className="space-y-3 py-8 text-center"><p className="text-sm text-red-400">{error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Try again</Button></CardContent></Card>
      ) : hasLoaded && leaders.length === 0 ? (
        <Card className="border-border/50 bg-card/50"><CardContent className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground"><Skull className="h-8 w-8 opacity-40" />No confirmed kills have been recorded yet.</CardContent></Card>
      ) : (
        <Card className="overflow-hidden border-border/50 bg-card/50">
          <div className="grid grid-cols-[5rem_1fr_6rem] border-b border-border/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[7rem_1fr_8rem] sm:px-5"><span>Rank</span><span>Player</span><span className="text-right">Kills</span></div>
          <div>{leaders.slice(0, visibleCount).map((leader) => {
            const isYou = Boolean(address && address.toLowerCase() === leader.address.toLowerCase());
            return <div key={leader.address.toLowerCase()} className={cn("grid grid-cols-[5rem_1fr_6rem] items-center border-b border-border/30 px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[7rem_1fr_8rem] sm:px-5", leader.rank === 1 && "bg-amber-500/5")}>
              <div className="flex items-center gap-1.5 font-mono font-semibold"><span className={leader.rank === 1 ? "text-amber-400" : "text-muted-foreground"}>#{String(leader.rank).padStart(2, "0")}</span>{leader.rank === 1 && <Crown className="h-4 w-4 text-amber-400" />}</div>
              <div className="flex min-w-0 flex-wrap items-center gap-2"><PlayerRecordLink address={leader.address} name={isYou ? "You" : names.label(leader.address)} />{leader.rank <= 5 && <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">Top 5</span>}</div>
              <div className="flex items-center justify-end gap-1 font-mono font-semibold"><Skull className="h-4 w-4 text-red-400" />{leader.kills.toLocaleString()}</div>
            </div>;
          })}</div>
          {visibleCount < leaders.length && <div className="border-t border-border/50 p-3 text-center"><Button variant="outline" size="sm" onClick={() => setVisibleCount((count) => count + 25)}>Show more players</Button></div>}
        </Card>
      )}
    </div>
  );
}
