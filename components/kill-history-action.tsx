"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { usePublicClient } from "wagmi";
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
import { useChain } from "@/components/chain-provider";
import {
  fetchKillHistory,
  type KillHistoryEntry,
} from "@/lib/killHistoryService";

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
  timestamp: number;
  attackerName: string;
  victimName: string;
  attackerIsDead?: boolean;
  victimIsDead?: boolean;
  resultType: KillResultType;
  attackerBullets?: number;
  backfireBullets?: number;
}

const RESULT_LABELS: Record<KillResultType, string> = {
  [KillResultType.SingleKill]: "Single kill",
  [KillResultType.DoubleKill]: "Double kill",
  [KillResultType.BackfireKill]: "Backfire kill",
};

const RESULT_COLORS: Record<KillResultType, string> = {
  [KillResultType.SingleKill]: "text-amber-400",
  [KillResultType.DoubleKill]: "text-red-400",
  [KillResultType.BackfireKill]: "text-purple-400",
};

function mapHistoryEntry(entry: KillHistoryEntry): KillEntry {
  const resultType = entry.resultType as KillResultType;
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    attackerName: entry.attackerName,
    victimName: entry.victimName,
    attackerIsDead:
      resultType === KillResultType.DoubleKill ||
      resultType === KillResultType.BackfireKill,
    victimIsDead:
      resultType === KillResultType.SingleKill ||
      resultType === KillResultType.DoubleKill,
    resultType,
    attackerBullets: entry.attackerBullets,
    backfireBullets: entry.backfireBullets,
  };
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

// Builds an explicit, directional breakdown of bullets so no figure is
// ambiguous: each amount is attributed to who fired it and at whom.
interface BulletFigure {
  key: string;
  label: string;
  amount: number;
  tone: string;
}

function getBulletFigures(entry: KillEntry): BulletFigure[] {
  const figures: BulletFigure[] = [];
  if (entry.attackerBullets !== undefined) {
    figures.push({
      key: "attacker",
      label: `${entry.attackerName} → ${entry.victimName}`,
      amount: entry.attackerBullets,
      tone: "text-foreground",
    });
  }
  if (entry.backfireBullets !== undefined) {
    figures.push({
      key: "backfire",
      label: `Backfire → ${entry.attackerName}`,
      amount: entry.backfireBullets,
      tone: "text-red-400",
    });
  }
  return figures;
}

function BulletBreakdown({ entry }: { entry: KillEntry }) {
  const figures = getBulletFigures(entry);
  if (figures.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-0.5">
      {figures.map((figure) => (
        <div
          key={figure.key}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span className="shrink-0">{figure.label}</span>
          <span
            className={cn(
              "font-mono tabular-nums font-medium",
              figure.tone
            )}
          >
            {figure.amount.toLocaleString()}
          </span>
          <span className="text-muted-foreground/60">bullets</span>
        </div>
      ))}
    </div>
  );
}

export function KillHistoryAction() {
  const publicClient = usePublicClient();
  const { activeChain } = useChain();
  const [kills, setKills] = useState<KillEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadKills = useCallback(async () => {
    if (!publicClient) return;
    setIsLoading(true);
    try {
      const data = await fetchKillHistory({
        publicClient,
        chainId: activeChain,
      });
      setKills(data.map(mapHistoryEntry));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [publicClient, activeChain]);

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
                      <BulletBreakdown entry={entry} />
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
