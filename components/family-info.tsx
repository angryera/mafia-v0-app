"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, Shield, User, Skull, Lock } from "lucide-react";

export function FamilyInfo() {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-4 w-4 text-primary" />
          Family Directory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Browse all mafia families in the game. View their leadership hierarchy, members, and status.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Crown className="mt-0.5 h-4 w-4 text-yellow-500" />
            <div>
              <p className="font-medium text-foreground">Leadership</p>
              <p className="text-xs">Don, Consigliere, Capodecina, and Capos</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 text-primary/70" />
            <div>
              <p className="font-medium text-foreground">Successor</p>
              <p className="text-xs">Next in line if the Don is removed</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 text-primary/70" />
            <div>
              <p className="font-medium text-foreground">Members</p>
              <p className="text-xs">Full list of family soldiers</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">Jailed</p>
              <p className="text-xs">Member is currently serving time</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Skull className="mt-0.5 h-4 w-4 text-red-500" />
            <div>
              <p className="font-medium text-foreground">Dead</p>
              <p className="text-xs">Member has been eliminated</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/50 bg-secondary/30 p-3">
          <p className="text-xs leading-relaxed">
            Family data is fetched directly from the MafiaFamily contract on-chain.
            Active families are shown by default (toggle to see all).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
