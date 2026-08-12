"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Crosshair, Skull } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KillHistoryAction } from "@/components/kill-history-action";
import { GraveyardFamilyAction } from "@/components/graveyard-family-action";

export type GraveyardTab = "history" | "family";

function parseTab(value: string | null): GraveyardTab {
  return value === "history" ? "history" : "family";
}

export function GraveyardPageAction() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = useMemo(
    () => parseTab(searchParams.get("tab")),
    [searchParams],
  );

  const setTab = useCallback(
    (tab: string) => {
      const next = parseTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "family") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <Skull className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Graveyard
          </h2>
        </div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Kill history and fallen family members in one place.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setTab} className="w-full">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="family" className="gap-2">
              <Skull className="h-4 w-4" />
              Killed family
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Crosshair className="h-4 w-4" />
              Kill history
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="family" className="mt-6">
          <GraveyardFamilyAction />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <KillHistoryAction embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
