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
import { Crosshair, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────
// Data model
// ────────────────────────────────────────────────────────────────
enum KillResultType {
  SingleKill = 0,
  DoubleKill = 1,
  BackfireKill = 2,
}

interface KillEntry {
  id: string;
  timestamp: number; // unix seconds
  attackerName: string;
  victimName: string;
  attackerIsDead?: boolean;
  victimIsDead?: boolean;
  resultType: KillResultType;
  bullets?: number;
}

const RESULT_LABELS: Record<KillResultType, string> = {
  [KillResultType.SingleKill]: "Single kill",
  [KillResultType.DoubleKill]: "Double kill",
  [KillResultType.BackfireKill]: "Backfire kill",
};

// Distinct accent color per result type.
const RESULT_COLORS: Record<KillResultType, string> = {
  [KillResultType.SingleKill]: "text-amber-400",
  [KillResultType.DoubleKill]: "text-red-400",
  [KillResultType.BackfireKill]: "text-purple-400",
};

// ────────────────────────────────────────────────────────────────
// Mock data source
//
// TODO: Replace this mock with on-chain data. Once the `MafiaKill`
// contract is deployed, this should read its `KillSucceeded` events
// and map them into KillEntry objects (names are already included in
// the event payload, so no address→name resolution is needed here).
// ────────────────────────────────────────────────────────────────
const NOW = Math.floor(Date.now() / 1000);
const HOUR = 3600;

const MOCK_KILLS: KillEntry[] = [
  {
    id: "kill-1",
    timestamp: NOW - 2 * HOUR,
    attackerName: "TonySoprano",
    victimName: "PaulieWalnuts",
    victimIsDead: true,
    resultType: KillResultType.SingleKill,
    bullets: 12500,
  },
  {
    id: "kill-2",
    timestamp: NOW - 8 * HOUR,
    attackerName: "VitoCorleone",
    victimName: "Salvatore",
    attackerIsDead: true,
    victimIsDead: true,
    resultType: KillResultType.DoubleKill,
    bullets: 48000,
  },
  {
    id: "kill-3",
    timestamp: NOW - 14 * HOUR,
    attackerName: "Christopher",
    victimName: "TonySoprano",
    attackerIsDead: true,
    resultType: KillResultType.BackfireKill,
    bullets: 22000,
  },
  {
    id: "kill-4",
    timestamp: NOW - 26 * HOUR,
    attackerName: "Silvio",
    victimName: "Adriana",
    victimIsDead: true,
    resultType: KillResultType.SingleKill,
    bullets: 8500,
  },
  {
    id: "kill-5",
    timestamp: NOW - 36 * HOUR,
    attackerName: "Salvatore",
    victimName: "VitoCorleone",
    attackerIsDead: true,
    resultType: KillResultType.BackfireKill,
    bullets: 150000,
  },
  {
    id: "kill-6",
    timestamp: NOW - 52 * HOUR,
    attackerName: "PaulieWalnuts",
    victimName: "Christopher",
    attackerIsDead: true,
    victimIsDead: true,
    resultType: KillResultType.DoubleKill,
    bullets: 96000,
  },
];

// Simulates an async data source so the loading state can be exercised.
function fetchKillHistory(): Promise<KillEntry[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_KILLS), 700);
  });
}

// ────────────────────────────────────────────────────────────────
// Strikethrough rules
// ────────────────────────────────────────────────────────────────
function isAttackerCrossed(entry: KillEntry): boolean {
  if (entry.attackerIsDead) return true;
  return (
    entry.resultType === KillResultType.DoubleKill ||
    entry.resultType === KillResultType.BackfireKill
  );
}

function isVictimCrossed(entry: KillEntry): boolean {
  if (entry.victimIsDead) return true;
  return (
    entry.resultType === KillResultType.SingleKill ||
    entry.resultType === KillResultType.DoubleKill
  );
}

function PlayerName({ name, crossed }: { name: string; crossed: boolean }) {
  return (
    <span
      className={cn(
        "text-sm font-medium",
        crossed
          ? "text-muted-foreground line-through decoration-red-500/70 decoration-2"
          : "text-foreground"
      )}
    >
      {name}
    </span>
  );
}

export function KillHistoryAction() {
  const [kills, setKills] = useState<KillEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadKills = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchKillHistory();
      setKills(data);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadKills();
  }, [loadKills]);

  // Newest first.
  const sortedKills = useMemo(
    () => [...kills].sort((a, b) => b.timestamp - a.timestamp),
    [kills]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <Crosshair className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Kill history
          </h2>
        </div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Preview data — on-chain kill history will load here after the contract
          is deployed.
        </p>
      </div>

      {/* Refresh control */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={loadKills}
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
            <Loader2 className="h-8 w-8 animate-spin text-red-400" />
            <span className="text-sm">Loading kill history...</span>
          </CardContent>
        ) : sortedKills.length === 0 && hasLoaded ? (
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Crosshair className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No successful kills recorded yet.
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
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedKills.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="border-border/30 hover:bg-secondary/30"
                  >
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(
                        new Date(entry.timestamp * 1000),
                        "MMM d, yyyy · HH:mm"
                      )}
                    </TableCell>
                    <TableCell>
                      <PlayerName
                        name={entry.attackerName}
                        crossed={isAttackerCrossed(entry)}
                      />
                    </TableCell>
                    <TableCell>
                      <PlayerName
                        name={entry.victimName}
                        crossed={isVictimCrossed(entry)}
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          RESULT_COLORS[entry.resultType]
                        )}
                      >
                        {RESULT_LABELS[entry.resultType]}
                      </span>
                      {entry.bullets !== undefined && (
                        <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">
                          {entry.bullets.toLocaleString()} bullets
                        </span>
                      )}
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
