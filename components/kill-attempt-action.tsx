"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePublicClient } from "wagmi";
import { Heart, Loader2, RefreshCw, Search, Swords, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useChain } from "@/components/chain-provider";
import { formatAttackDate, formatCombatAmount, PlayerRecordLink, ProfileNamesWarning, useKillRecordNames } from "@/components/kill-record-parts";
import { loadAttemptedAttacks, type KillAttackEntry } from "@/lib/killHistoryService";
import { cn } from "@/lib/utils";

export function KillAttemptAction() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const currentInput = useRef(urlQuery);
  const lastWrittenQuery = useRef<string | null>(null);
  const { activeChain, chainConfig } = useChain();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const names = useKillRecordNames();
  const [entries, setEntries] = useState<KillAttackEntry[]>([]);
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
      const result = await loadAttemptedAttacks({ publicClient, chainId: activeChain, maxPages: 4, pageSize: 25, maxRows: 25 });
      if (currentRequest === requestId.current) setEntries(result);
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : "Unable to load attack reports.");
        setEntries([]);
      }
    } finally {
      if (currentRequest === requestId.current) { setIsLoading(false); setHasLoaded(true); }
    }
  }, [activeChain, publicClient]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (lastWrittenQuery.current === urlQuery) {
      lastWrittenQuery.current = null;
      return;
    }
    if (currentInput.current !== urlQuery) {
      currentInput.current = urlQuery;
      setSearch(urlQuery);
    }
  }, [urlQuery]);
  useEffect(() => {
    if (search === urlQuery) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (search) next.set("q", search);
      else next.delete("q");
      const suffix = next.toString();
      lastWrittenQuery.current = search;
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search, urlQuery, params, pathname, router]);

  const updateSearch = (value: string) => {
    currentInput.current = value;
    setSearch(value);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => {
      const attack = entry.attack;
      const date = formatAttackDate(attack.resolvedAt || attack.requestedAt);
      return [names.label(attack.attacker), names.label(attack.victim), attack.attacker, attack.victim, `attack #${entry.id}`, attack.attackerKilled ? "backfire kill" : "target survived", date]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [entries, names, search]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><Swords className="h-6 w-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Combat / records</p>
        <h1 className="text-3xl font-bold tracking-tight">Attempted kills</h1>
        <p className="text-sm text-muted-foreground">Recent on-chain attacks where the target survived.</p>
      </header>
      <section className="space-y-4">
        <ProfileNamesWarning error={names.error} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Attack reports</h2><p className="text-xs text-muted-foreground">{search.trim() ? `${filtered.length} of ${entries.length} reports match` : `${entries.length} recent reports`}</p></div><div className="flex flex-1 flex-col gap-2 sm:max-w-lg sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Player, address, result, or attack #" aria-label="Search attack reports" className="pl-9 pr-8" />{search && <button type="button" aria-label="Clear search" onClick={() => updateSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}</div><Button variant="outline" onClick={() => void load()} disabled={isLoading} className="gap-2"><RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />Refresh reports</Button></div></div>
        {isLoading || (!hasLoaded && !error) ? (
          <Card className="border-border/50 bg-card/50"><CardContent className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading attack reports...</CardContent></Card>
        ) : error ? (
          <Card className="border-red-500/30 bg-red-500/5"><CardContent className="space-y-3 py-8 text-center"><p className="text-sm text-red-400">{error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Try again</Button></CardContent></Card>
        ) : hasLoaded && filtered.length === 0 ? (
          <Card className="border-border/50 bg-card/50"><CardContent className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground"><Swords className="h-8 w-8 opacity-40" />{search.trim() ? "No reports match your search." : "There are no recent survived attacks."}</CardContent></Card>
        ) : (
          <div className="space-y-3">{filtered.map((entry) => {
            const attack = entry.attack;
            const href = `/kill-result/attack/${entry.id}`;
            return <Card key={entry.id.toString()} role="link" tabIndex={0} aria-label={`Open attack #${entry.id} result`} onClick={() => router.push(href)} onKeyDown={(event) => { if (event.key === "Enter" && event.target === event.currentTarget) router.push(href); }} className="cursor-pointer border-border/50 bg-card/50 transition-colors hover:border-amber-500/40 hover:bg-secondary/30">
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="font-semibold uppercase tracking-wide">Attack #{entry.id.toString()}</span><time>{formatAttackDate(attack.resolvedAt || attack.requestedAt)}</time></div>
                <div className="flex flex-wrap items-center gap-2 text-sm"><PlayerRecordLink address={attack.attacker} name={names.label(attack.attacker)} dead={attack.attackerKilled} /><span className="text-muted-foreground">→</span><PlayerRecordLink address={attack.victim} name={names.label(attack.victim)} /><span className={cn("ml-auto rounded-full border px-2 py-0.5 text-xs font-semibold", attack.attackerKilled ? "border-purple-500/40 bg-purple-500/10 text-purple-400" : "border-amber-500/40 bg-amber-500/10 text-amber-400")}>{attack.attackerKilled ? "Backfire kill" : "Target survived"}</span></div>
                <div className="grid gap-x-5 gap-y-2 border-t border-border/40 pt-3 text-xs sm:grid-cols-2"><div className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-400" /><span className="text-muted-foreground">Attacker bullets</span><strong className="ml-auto font-mono text-foreground">{formatCombatAmount(attack.bullets)}</strong></div>{attack.backfireBullets > 0n && <div className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-purple-400" /><span className="text-muted-foreground">Target bullets</span><strong className="ml-auto font-mono text-foreground">{formatCombatAmount(attack.backfireBullets)}</strong></div>}<div className="flex items-center gap-2"><Heart className="h-3.5 w-3.5 text-red-400" /><span className="text-muted-foreground">Target health lost</span><strong className="ml-auto font-mono text-foreground">{formatCombatAmount(attack.healthLost)}</strong></div>{attack.backfireHealthLost > 0n && <div className="flex items-center gap-2"><Heart className="h-3.5 w-3.5 text-red-400" /><span className="text-muted-foreground">Attacker health lost</span><strong className="ml-auto font-mono text-foreground">{formatCombatAmount(attack.backfireHealthLost)}</strong></div>}</div>
              </CardContent>
            </Card>;
          })}</div>
        )}
      </section>
    </div>
  );
}
