"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Search, Skull, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KillHistoryAction } from "@/components/kill-history-action";
import { GraveyardFamilyAction } from "@/components/graveyard-family-action";

type GraveyardTab = "players" | "families";

export function GraveyardPageAction() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: GraveyardTab = searchParams.get("tab") === "families" ? "families" : "players";
  const query = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(query);
  const [refreshKey, setRefreshKey] = useState(0);
  const currentInput = useRef(query);
  const lastWrittenQuery = useRef<string | null>(null);

  useEffect(() => {
    if (lastWrittenQuery.current === query) {
      lastWrittenQuery.current = null;
      return;
    }
    if (currentInput.current !== query) {
      currentInput.current = query;
      setSearch(query);
    }
  }, [query]);

  const writeQuery = useCallback((value: string) => {
    lastWrittenQuery.current = value;
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const updateSearch = (value: string) => {
    currentInput.current = value;
    setSearch(value);
  };

  useEffect(() => {
    if (search === query) return;
    const timer = window.setTimeout(() => writeQuery(search), 400);
    return () => window.clearTimeout(timer);
  }, [search, query, writeQuery]);

  const changeTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "families") params.set("tab", "families");
    else params.delete("tab");
    params.delete("q");
    currentInput.current = "";
    lastWrittenQuery.current = "";
    setSearch("");
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><Skull className="h-6 w-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Combat / records</p>
        <h1 className="text-3xl font-bold tracking-tight">Graveyard</h1>
        <p className="text-sm text-muted-foreground">{tab === "players" ? "Recent confirmed kills and the players involved." : "Families that have died during the protocol."}</p>
      </header>

      <Tabs value={tab} onValueChange={changeTab} className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 sm:mx-auto sm:max-w-sm">
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="families">Families</TabsTrigger>
        </TabsList>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder={tab === "players" ? "Player, address, result, or attack #" : "Family, ID, or Don"} aria-label={tab === "players" ? "Search player kill records" : "Search fallen families"} className="pl-9 pr-8" />
            {search && <button type="button" onClick={() => { updateSearch(""); writeQuery(""); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw className="h-4 w-4" />Refresh records</Button>
        </div>
        <TabsContent value="players" className="mt-0"><KillHistoryAction embedded searchQuery={search} refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="families" className="mt-0"><GraveyardFamilyAction searchQuery={search} refreshKey={refreshKey} /></TabsContent>
      </Tabs>
    </div>
  );
}
