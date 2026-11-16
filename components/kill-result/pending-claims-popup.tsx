"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import { zeroAddress, type PublicClient } from "viem";
import { ChevronLeft, ChevronRight, Gift, Loader2, RefreshCw, X } from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import { formatWalletAddress } from "@/lib/format";
import { getUserAttackCounts, getUserAttacks, type KillAttackEntry } from "@/lib/killHistoryService";
import { getKillRegistryRecord } from "@/lib/killContract";
import type { ChainId } from "@/lib/constants/address";
import { formatExactUnits, killTargets } from "./kill-result-logic";
import "@/types/mafia-globals";

interface ClaimRow {
  attackId: bigint;
  killId: bigint;
  attacker: `0x${string}`;
  victim: `0x${string}`;
  bullets: bigint;
  healthLost: bigint;
  inherited: boolean;
}

const PAGE_SIZE = 5;
const ATTACK_PAGE_SIZE = 50n;

async function mapLimited<T, U>(items: readonly T[], limit: number, fn: (item: T) => Promise<U>): Promise<U[]> {
  const results = new Array<U>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }));
  return results;
}

async function userHistory(publicClient: PublicClient, chainId: ChainId, user: `0x${string}`): Promise<KillAttackEntry[]> {
  const counts = await getUserAttackCounts({ publicClient, chainId, user });
  const entries: KillAttackEntry[] = [];
  const seen = new Set<string>();
  for (const [asVictim, count] of [[false, counts.asAttacker], [true, counts.asVictim]] as const) {
    const roleSeen = new Set<string>();
    for (let start = 0n; start < count; start += ATTACK_PAGE_SIZE) {
      const page = await getUserAttacks({ publicClient, chainId, user, asVictim, start, length: ATTACK_PAGE_SIZE, totalCount: count });
      for (const entry of page) {
        const key = entry.id.toString();
        if (roleSeen.has(key)) throw new Error(`Attack id ${key} repeats across user history pages`);
        roleSeen.add(key);
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push(entry);
      }
    }
  }
  return entries;
}

async function loadClaims(publicClient: PublicClient, chainId: ChainId, account: `0x${string}`): Promise<ClaimRow[]> {
  const own = await userHistory(publicClient, chainId, account);
  const killedPlayers = new Map<string, `0x${string}`>();
  for (const entry of own) {
    const attack = entry.attack;
    if (attack.status !== 1) continue;
    if (attack.victimKilled && attack.attacker.toLowerCase() === account.toLowerCase()) {
      killedPlayers.set(attack.victim.toLowerCase(), attack.victim);
    }
    if (attack.attackerKilled && attack.victim.toLowerCase() === account.toLowerCase()) {
      killedPlayers.set(attack.attacker.toLowerCase(), attack.attacker);
    }
  }
  killedPlayers.delete(account.toLowerCase());

  const inheritedHistories = await mapLimited([...killedPlayers.values()], 4, (user) => userHistory(publicClient, chainId, user));
  const entries = new Map<string, KillAttackEntry>();
  for (const entry of [...own, ...inheritedHistories.flat()]) entries.set(entry.id.toString(), entry);

  const candidates = [...entries.values()].flatMap((entry) =>
    entry.attack.status === 1 ? killTargets(entry.attack).map((target) => ({ entry, ...target })) : []);
  const seenKills = new Set<string>();
  const uniqueCandidates = candidates.filter((candidate) => {
    const key = candidate.killId.toString();
    if (seenKills.has(key)) return false;
    seenKills.add(key);
    return true;
  });
  const checked = await mapLimited(uniqueCandidates, 8, async (candidate): Promise<ClaimRow | null> => {
    const registry = await getKillRegistryRecord({ publicClient, chainId, killId: candidate.killId });
    if (!registry || registry.finished || registry.drainer.toLowerCase() !== account.toLowerCase()) return null;
    const { entry, fighter, killId } = candidate;
    return {
      attackId: entry.id,
      killId,
      attacker: entry.attack.attacker,
      victim: entry.attack.victim,
      bullets: fighter === "victim" ? entry.attack.bullets : entry.attack.backfireBullets,
      healthLost: fighter === "victim" ? entry.attack.healthLost : entry.attack.backfireHealthLost,
      inherited: registry.killer.toLowerCase() !== account.toLowerCase(),
    };
  });
  return checked.filter((row): row is ClaimRow => row !== null)
    .sort((a, b) => a.attackId === b.attackId ? 0 : a.attackId > b.attackId ? -1 : 1);
}

/** Visible to connected players only when the registry assigns them unfinished kills. */
export function PendingClaimsPopup() {
  const { chainConfig } = useChain();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const profileStatus = useMafiaUtilsScript("MafiaProfile");
  const configured = chainConfig.addresses.killInitiator.toLowerCase() !== zeroAddress &&
    chainConfig.addresses.killRegistry.toLowerCase() !== zeroAddress;
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [claimsKey, setClaimsKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [names, setNames] = useState<Record<string, string>>({});
  const openedOnce = useRef(false);
  const currentKey = address ? `${chainConfig.id}:${address.toLowerCase()}` : "";

  const refresh = useCallback(() => { setLoading(true); setRefreshKey((value) => value + 1); }, []);
  useEffect(() => {
    if (!address || !publicClient || !configured) {
      return;
    }
    let active = true;
    void loadClaims(publicClient, chainConfig.id, address).then((claims) => {
      if (!active) return;
      setRows(claims);
      setClaimsKey(currentKey);
      setError(null);
      setPage(0);
      if (claims.length > 0 && !openedOnce.current) {
        setOpen(true);
        openedOnce.current = true;
      }
    }).catch((cause) => {
      if (!active) return;
      setRows([]);
      setClaimsKey(currentKey);
      setError(cause instanceof Error ? cause.message.split("\n")[0] : "Claims check failed.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [address, publicClient, configured, chainConfig.id, currentKey, refreshKey]);

  useEffect(() => {
    if (!address || !configured) return;
    const timer = setInterval(refresh, 90_000);
    window.addEventListener("kill-claims-changed", refresh);
    return () => { clearInterval(timer); window.removeEventListener("kill-claims-changed", refresh); };
  }, [address, configured, refresh]);

  useEffect(() => {
    if (profileStatus !== "ready" || !window.MafiaProfile || rows.length === 0) return;
    let active = true;
    void window.MafiaProfile.getUsersInfo({ chain: chainConfig.id }).then((users) => {
      if (!active) return;
      const labels: Record<string, string> = {};
      for (const user of users as Array<{ user?: string; address?: string; name?: string; username?: string }>) {
        const wallet = user.user ?? user.address;
        const label = user.name ?? user.username;
        if (wallet && label) labels[wallet.toLowerCase()] = label;
      }
      setNames(labels);
    }).catch(() => {});
    return () => { active = false; };
  }, [profileStatus, rows.length, chainConfig.id]);

  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const visible = useMemo(() => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [rows, page]);
  const label = (wallet: string) => names[wallet.toLowerCase()] || formatWalletAddress(wallet);

  if (!address || !configured || claimsKey !== currentKey || (!error && rows.length === 0)) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(420px,calc(100vw-2rem))] text-white">
      {open && (
        <section id="pending-kill-claims" className="mb-3 overflow-hidden rounded-2xl border border-amber-400/25 bg-[#17191e] shadow-[0_24px_80px_rgba(0,0,0,.6)]" aria-label="Pending kill claims">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-amber-500/[.08] px-5 py-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-amber-300">Combat / assets</p><h2 className="mt-1 text-base font-semibold">Pending claims</h2><p className="mt-1 text-xs text-white/45">{rows.length} unfinished {rows.length === 1 ? "claim" : "claims"} assigned to your wallet</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close pending claims" className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          {error && <p role="alert" className="px-5 py-3 text-xs text-red-300">{error}</p>}
          <div className="max-h-72 divide-y divide-white/5 overflow-y-auto">
            {visible.map((row) => (
              <Link key={`${row.attackId}:${row.killId}`} href={`/kill-result/attack/${row.attackId.toString()}`} onClick={() => setOpen(false)} className="block px-5 py-3 hover:bg-white/5">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-white/80">Kill #{row.killId.toString()} · Attack #{row.attackId.toString()}</span>{row.inherited && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-200">Inherited kill</span>}</div>
                <p className="mt-1 truncate text-sm text-white/60">{label(row.attacker)} → {label(row.victim)}</p>
                <p className="mt-1 font-mono text-[11px] text-white/40">{formatExactUnits(row.bullets)} bullets · {formatExactUnits(row.healthLost)} HP lost</p>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
            <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
            {pageCount > 1 && <div className="flex items-center gap-2 text-xs text-white/50"><button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label="Previous claims page" className="disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>{page + 1} / {pageCount}<button type="button" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={page + 1 >= pageCount} aria-label="Next claims page" className="disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div>}
          </div>
        </section>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-controls="pending-kill-claims" aria-expanded={open} className="ml-auto flex items-center gap-2 rounded-xl border border-amber-400/30 bg-[#272119] px-4 py-3 text-sm font-semibold text-amber-100 shadow-xl hover:bg-[#37291a]">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
        {error && rows.length === 0 ? "Claims check failed" : `${rows.length} pending ${rows.length === 1 ? "claim" : "claims"}`}
      </button>
    </div>
  );
}
