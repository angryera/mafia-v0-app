"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, Globe, ShieldCheck, ShieldX } from "lucide-react";

export function PlayersInfo() {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-4 w-4 text-primary" />
          Players Directory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Browse all registered players in the game. View their profiles, status, and country.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Search className="mt-0.5 h-4 w-4 text-primary/70" />
            <div>
              <p className="font-medium text-foreground">Search</p>
              <p className="text-xs">Find players by name or wallet address</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Globe className="mt-0.5 h-4 w-4 text-primary/70" />
            <div>
              <p className="font-medium text-foreground">Country</p>
              <p className="text-xs">See where players are from around the world</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-green-500" />
            <div>
              <p className="font-medium text-foreground">Free</p>
              <p className="text-xs">Player is not currently in jail</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <ShieldX className="mt-0.5 h-4 w-4 text-red-500" />
            <div>
              <p className="font-medium text-foreground">Jailed</p>
              <p className="text-xs">Player is currently serving time</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/50 bg-secondary/30 p-3">
          <p className="text-xs leading-relaxed">
            Player data is fetched directly from the MafiaProfile contract on-chain.
            The list may take a moment to load depending on the total number of registered players.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
