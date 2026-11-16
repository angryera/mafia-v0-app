"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicClient } from "wagmi";
import { formatEther, zeroAddress } from "viem";
import { ChevronLeft, ChevronRight, Loader2, Skull, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useChain } from "@/components/chain-provider";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import { PlayerRecordLink, ProfileNamesWarning, useKillRecordNames } from "@/components/kill-record-parts";
import "@/types/mafia-globals";

const FAMILY_ABI = [
  { type: "function", name: "familyIds", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "getFamily", stateMutability: "view", inputs: [{ name: "familyId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [
    { name: "familyId", type: "uint256" },
    { name: "leaders", type: "address[]" },
    { name: "successor", type: "address" },
    { name: "leaveFee", type: "uint256" },
    { name: "memberCount", type: "uint256" },
    { name: "isDead", type: "bool" },
  ] }] },
] as const;

interface DeadFamily {
  familyId: bigint;
  leaders: readonly `0x${string}`[];
  leaveFee: bigint;
  memberCount: bigint;
  name: string;
}

interface FamilyNameRecord { familyId: number; name: string; }

async function getFamilyNames(chain: string, count: number): Promise<Map<number, string>> {
  const helper = window.MafiaFamily as (typeof window.MafiaFamily & {
    getFamilies?: (options: { chain: string; maxFamilies?: number }) => Promise<FamilyNameRecord[]>;
  }) | undefined;
  if (!helper?.getFamilies) return new Map();
  const list = await helper.getFamilies({ chain, maxFamilies: count });
  return new Map(list.map((family) => [family.familyId, family.name.trim()]));
}

export function GraveyardFamilyAction({ searchQuery = "", refreshKey = 0 }: { searchQuery?: string; refreshKey?: number }) {
  const router = useRouter();
  const { activeChain, chainConfig } = useChain();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const familyScript = useMafiaUtilsScript("MafiaFamily");
  const names = useKillRecordNames();
  const [families, setFamilies] = useState<DeadFamily[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadFamilies = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!publicClient) { setIsLoading(false); setError("Chain RPC is unavailable."); setHasLoaded(true); return; }
    if (familyScript === "error") { setIsLoading(false); setError("Family data helper is unavailable."); setHasLoaded(true); return; }
    if (familyScript !== "ready") { setIsLoading(false); setError(null); setHasLoaded(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const count = await publicClient.readContract({ address: chainConfig.addresses.mafiaFamily, abi: FAMILY_ABI, functionName: "familyIds" });
      if (count > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Family count exceeds the supported range.");
      const total = Number(count);
      const dead: DeadFamily[] = [];
      for (let start = 1; start <= total; start += 50) {
        const end = Math.min(start + 50, total + 1);
        const batch = await Promise.all(Array.from({ length: end - start }, (_, index) =>
          publicClient.readContract({ address: chainConfig.addresses.mafiaFamily, abi: FAMILY_ABI, functionName: "getFamily", args: [BigInt(start + index)] }),
        ));
        for (const family of batch) {
          if (!family.isDead) continue;
          dead.push({ familyId: family.familyId, leaders: family.leaders, leaveFee: family.leaveFee, memberCount: family.memberCount, name: "" });
        }
      }
      const labels = dead.length ? await getFamilyNames(activeChain, total) : new Map<number, string>();
      if (currentRequest === requestId.current) {
        setFamilies(dead.map((family) => ({ ...family, name: labels.get(Number(family.familyId)) || `Family #${family.familyId}` })).sort((a, b) => a.familyId < b.familyId ? 1 : a.familyId > b.familyId ? -1 : 0));
        setPage(1);
      }
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : "Unable to load dead families.");
        setFamilies([]);
      }
    } finally {
      if (currentRequest === requestId.current) { setIsLoading(false); setHasLoaded(true); }
    }
  }, [activeChain, chainConfig.addresses.mafiaFamily, familyScript, publicClient]);

  useEffect(() => { void loadFamilies(); }, [loadFamilies, refreshKey]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return families;
    return families.filter((family) => {
      const don = family.leaders[0];
      return [family.name, family.familyId.toString(), `family #${family.familyId}`, don ? names.label(don) : "", don || ""]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [families, names, searchQuery]);

  useEffect(() => { setPage(1); }, [searchQuery]);
  const pageCount = Math.ceil(filtered.length / 20);
  const currentPage = Math.min(page, Math.max(1, pageCount));
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-semibold">Fallen families</h2><p className="text-xs text-muted-foreground">{filtered.length} dead {filtered.length === 1 ? "family" : "families"}</p></div>
      <ProfileNamesWarning error={names.error} />
      {isLoading || (!hasLoaded && !error) ? (
        <Card className="border-border/50 bg-card/50"><CardContent className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading families...</CardContent></Card>
      ) : error ? (
        <Card className="border-red-500/30 bg-red-500/5"><CardContent className="space-y-3 py-8 text-center"><p className="text-sm text-red-400">{error}</p><Button variant="outline" size="sm" onClick={() => void loadFamilies()}>Try again</Button></CardContent></Card>
      ) : hasLoaded && filtered.length === 0 ? (
        <Card className="border-border/50 bg-card/50"><CardContent className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground"><Skull className="h-8 w-8 opacity-40" />{searchQuery.trim() ? "No dead families match your search." : "No dead families have been recorded yet."}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {visible.map((family) => {
            const don = family.leaders[0];
            const hasDon = Boolean(don && don.toLowerCase() !== zeroAddress);
            return <Card key={family.familyId.toString()} role="link" tabIndex={0} aria-label={`Open family #${family.familyId}`} onClick={() => router.push(`/families/${family.familyId}`)} onKeyDown={(event) => { if (event.key === "Enter" && event.target === event.currentTarget) router.push(`/families/${family.familyId}`); }} className="cursor-pointer border-border/50 bg-card/50 transition-colors hover:border-red-500/40 hover:bg-secondary/30">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400"><Skull className="h-6 w-6" /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{family.name}</h3><span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-400">Dead</span></div><p className="text-xs text-muted-foreground">Family #{family.familyId.toString()}</p></div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs sm:min-w-52"><span className="text-muted-foreground">Don</span><span>{hasDon ? <PlayerRecordLink address={don} name={names.label(don)} /> : "—"}</span><span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" />Members</span><span className="font-mono">{family.memberCount.toString()}</span><span className="text-muted-foreground">Leave fee</span><span className="font-mono">{Number(formatEther(family.leaveFee)).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></div>
              </CardContent>
            </Card>;
          })}
        </div>
      )}
      {pageCount > 1 && !isLoading && !error && <div className="flex items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button><span className="text-xs text-muted-foreground">Page {currentPage} of {pageCount}</span><Button variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Next<ChevronRight className="h-4 w-4" /></Button></div>}
    </div>
  );
}
