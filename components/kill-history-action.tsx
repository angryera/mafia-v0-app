"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicClient } from "wagmi";
import { Crosshair, Loader2, RefreshCw, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useChain } from "@/components/chain-provider";
import { formatAttackDate, formatCombatAmount, PlayerRecordLink, ProfileNamesWarning, useKillRecordNames } from "@/components/kill-record-parts";
import { isConfirmedKill, loadLatestAttacks, type KillAttackEntry } from "@/lib/killHistoryService";
import { cn } from "@/lib/utils";

function killResult(entry: KillAttackEntry) {
  const { victimKilled, attackerKilled } = entry.attack;
  if (victimKilled && attackerKilled) return "Double kill";
  if (attackerKilled) return "Backfire kill";
  return "Single kill";
}

export function KillHistoryAction({ embedded = false, searchQuery = "", refreshKey = 0 }: { embedded?: boolean; searchQuery?: string; refreshKey?: number }) {
  const router = useRouter();
  const { activeChain, chainConfig } = useChain();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const names = useKillRecordNames();
  const [kills, setKills] = useState<KillAttackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadKills = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!publicClient) { setIsLoading(false); setError("Chain RPC is unavailable."); setHasLoaded(true); return; }
    setIsLoading(true);
    setError(null);
    try {
      const entries = await loadLatestAttacks({ publicClient, chainId: activeChain, length: 50 });
      if (currentRequest === requestId.current) setKills(entries.filter((entry) => isConfirmedKill(entry, activeChain)));
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : "Unable to load kill records.");
        setKills([]);
      }
    } finally {
      if (currentRequest === requestId.current) { setIsLoading(false); setHasLoaded(true); }
    }
  }, [publicClient, activeChain]);

  useEffect(() => { void loadKills(); }, [loadKills, refreshKey]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return kills;
    return kills.filter((entry) => {
      const attack = entry.attack;
      return [names.label(attack.attacker), names.label(attack.victim), attack.attacker, attack.victim, `attack #${entry.id}`, killResult(entry), formatAttackDate(attack.resolvedAt)]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [kills, names, searchQuery]);

  return (
    <div className={cn("space-y-4", !embedded && "mx-auto max-w-3xl space-y-6")}>
      {!embedded && <header className="space-y-2 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Combat / records</p><h1 className="text-2xl font-bold tracking-tight">Player kill records</h1><p className="text-sm text-muted-foreground">Recent confirmed kills in the latest 50 attacks.</p></header>}
      {!embedded && <div className="flex justify-end"><Button variant="outline" onClick={() => void loadKills()} disabled={isLoading} className="gap-2"><RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />Refresh records</Button></div>}
      <ProfileNamesWarning error={names.error} />
      {isLoading || (!hasLoaded && !error) ? (
        <Card className="border-border/50 bg-card/50"><CardContent className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading kill records...</CardContent></Card>
      ) : error ? (
        <Card className="border-red-500/30 bg-red-500/5"><CardContent className="space-y-3 py-8 text-center"><p className="text-sm text-red-400">{error}</p><Button variant="outline" size="sm" onClick={() => void loadKills()}>Try again</Button></CardContent></Card>
      ) : hasLoaded && filtered.length === 0 ? (
        <Card className="border-border/50 bg-card/50"><CardContent className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground"><Crosshair className="h-8 w-8 opacity-40" />{searchQuery.trim() ? "No kill records match your search." : "No successful kills in the latest 50 attacks."}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "record" : "records"}{searchQuery.trim() ? ` of ${kills.length}` : ""}</p>
          {filtered.map((entry) => {
            const attack = entry.attack;
            const result = killResult(entry);
            const href = `/kill-result/attack/${entry.id}`;
            return (
              <Card key={entry.id.toString()} role="link" tabIndex={0} aria-label={`Open attack #${entry.id} result`} onClick={() => router.push(href)} onKeyDown={(event) => { if (event.key === "Enter" && event.target === event.currentTarget) router.push(href); }} className="cursor-pointer border-border/50 bg-card/50 transition-colors hover:border-red-500/40 hover:bg-secondary/30">
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="font-semibold uppercase tracking-wide">Attack #{entry.id.toString()}</span><time>{formatAttackDate(attack.resolvedAt)}</time></div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <PlayerRecordLink address={attack.attacker} name={names.label(attack.attacker)} dead={attack.attackerKilled} />
                    <span className="text-muted-foreground">→</span>
                    <PlayerRecordLink address={attack.victim} name={names.label(attack.victim)} dead={attack.victimKilled} />
                    <span className={cn("ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", result === "Double kill" ? "border-red-500/40 bg-red-500/10 text-red-400" : result === "Backfire kill" ? "border-purple-500/40 bg-purple-500/10 text-purple-400" : "border-amber-500/40 bg-amber-500/10 text-amber-400")}><Skull className="h-3 w-3" />{result}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                    <span>Attacker bullets <strong className="ml-1 font-mono text-foreground">{formatCombatAmount(attack.bullets)}</strong></span>
                    {(result === "Backfire kill" || result === "Double kill") && <span>Backfire bullets <strong className="ml-1 font-mono text-foreground">{formatCombatAmount(attack.backfireBullets)}</strong></span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
