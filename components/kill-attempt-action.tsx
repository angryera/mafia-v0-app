"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Swords, Loader2, RefreshCw, Zap, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────
// Data model
//
// A kill attempt is a non-fatal exchange: the attacker fires at the
// victim and the victim's backfire returns fire at the attacker, but
// neither player dies. Both bullets spent and health lost are tracked
// per player so every figure is clearly attributed.
// ────────────────────────────────────────────────────────────────
interface KillAttemptEntry {
  id: string;
  timestamp: number; // unix seconds
  attackerName: string;
  victimName: string;
  attackerBulletsSpent: number;
  victimBulletsSpent: number;
  attackerHealthLost: number;
  victimHealthLost: number;
}

// ────────────────────────────────────────────────────────────────
// Mock data source
//
// TODO: Replace this mock with on-chain data. Once the `MafiaKill`
// contract is deployed, this should read its kill-attempt events (the
// non-fatal counterpart to `KillSucceeded`) and map them into
// KillAttemptEntry objects. Names are already included in the event
// payload, so no address→name resolution is needed here. Map the
// event's per-side bullet and health-delta fields onto the attacker/
// victim fields below so each figure stays attributed to one player.
// ────────────────────────────────────────────────────────────────
const NOW = Math.floor(Date.now() / 1000);
const HOUR = 3600;

const MOCK_ATTEMPTS: KillAttemptEntry[] = [
  {
    id: "attempt-1",
    timestamp: NOW - 2 * HOUR,
    attackerName: "TonySoprano",
    victimName: "PaulieWalnuts",
    attackerBulletsSpent: 12500,
    victimBulletsSpent: 4000,
    attackerHealthLost: 6,
    victimHealthLost: 38,
  },
  {
    id: "attempt-2",
    timestamp: NOW - 8 * HOUR,
    attackerName: "VitoCorleone",
    victimName: "Salvatore",
    attackerBulletsSpent: 22000,
    victimBulletsSpent: 9500,
    attackerHealthLost: 12,
    victimHealthLost: 54,
  },
  {
    id: "attempt-3",
    timestamp: NOW - 14 * HOUR,
    attackerName: "Christopher",
    victimName: "Silvio",
    attackerBulletsSpent: 8500,
    victimBulletsSpent: 7000,
    attackerHealthLost: 21,
    victimHealthLost: 15,
  },
  {
    id: "attempt-4",
    timestamp: NOW - 26 * HOUR,
    attackerName: "Adriana",
    victimName: "Carmela",
    attackerBulletsSpent: 48000,
    victimBulletsSpent: 16000,
    attackerHealthLost: 9,
    victimHealthLost: 72,
  },
  {
    id: "attempt-5",
    timestamp: NOW - 36 * HOUR,
    attackerName: "Salvatore",
    victimName: "VitoCorleone",
    attackerBulletsSpent: 96000,
    victimBulletsSpent: 60000,
    attackerHealthLost: 43,
    victimHealthLost: 51,
  },
  {
    id: "attempt-6",
    timestamp: NOW - 52 * HOUR,
    attackerName: "PaulieWalnuts",
    victimName: "Christopher",
    attackerBulletsSpent: 150000,
    victimBulletsSpent: 31000,
    attackerHealthLost: 26,
    victimHealthLost: 89,
  },
];

// Simulates an async data source so the loading state can be exercised.
function fetchKillAttempts(): Promise<KillAttemptEntry[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_ATTEMPTS), 700);
  });
}

// ────────────────────────────────────────────────────────────────
// Per-player cell: name + bullets spent + health lost
// ────────────────────────────────────────────────────────────────
function PlayerCell({
  name,
  bulletsSpent,
  healthLost,
}: {
  name: string;
  bulletsSpent: number;
  healthLost: number;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-foreground">{name}</div>
      <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 shrink-0 text-amber-400" />
          <span className="font-mono tabular-nums font-medium text-foreground">
            {bulletsSpent.toLocaleString()}
          </span>
          <span className="text-muted-foreground/60">bullets spent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="h-3 w-3 shrink-0 text-red-400" />
          <span className="font-mono tabular-nums font-medium text-red-400">
            -{healthLost.toLocaleString()}
          </span>
          <span className="text-muted-foreground/60">health lost</span>
        </div>
      </div>
    </div>
  );
}

export function KillAttemptAction() {
  const [attempts, setAttempts] = useState<KillAttemptEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadAttempts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchKillAttempts();
      setAttempts(data);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  // Newest first.
  const sortedAttempts = useMemo(
    () => [...attempts].sort((a, b) => b.timestamp - a.timestamp),
    [attempts]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Swords className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Kill attempts
          </h2>
        </div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Preview data — on-chain kill attempts where both players survived will
          load here after the contract is deployed.
        </p>
      </div>

      {/* Refresh control */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={loadAttempts}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Content */}
      <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
        {isLoading ? (
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <span className="text-sm">Loading kill attempts...</span>
          </CardContent>
        ) : sortedAttempts.length === 0 && hasLoaded ? (
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Swords className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No kill attempts recorded yet.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Attacker</TableHead>
                  <TableHead>Victim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAttempts.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="border-border/30 hover:bg-secondary/30 align-top"
                  >
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(
                        new Date(entry.timestamp * 1000),
                        "MMM d, yyyy · HH:mm"
                      )}
                    </TableCell>
                    <TableCell>
                      <PlayerCell
                        name={entry.attackerName}
                        bulletsSpent={entry.attackerBulletsSpent}
                        healthLost={entry.attackerHealthLost}
                      />
                    </TableCell>
                    <TableCell>
                      <PlayerCell
                        name={entry.victimName}
                        bulletsSpent={entry.victimBulletsSpent}
                        healthLost={entry.victimHealthLost}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
