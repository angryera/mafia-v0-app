"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  RefreshCw,
  Skull,
  Loader2,
  Crown,
  Shield,
  User,
} from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { cn } from "@/lib/utils";
import "@/types/mafia-globals";

type FamilyMemberRole = "Don" | "Consigliere" | "Capodecina" | "Capo" | "Successor" | "Member";

interface GraveyardMember {
  address: string;
  name: string;
  familyId: number;
  familyName: string;
  level: number;
  role: FamilyMemberRole;
}

interface FamilyPayload {
  familyId: number;
  name: string;
  leaders?: Array<{
    address: string;
    name: string;
    level: number;
    isDead: boolean;
    role: string;
  }>;
  successor?: {
    address: string;
    name: string;
    level: number;
    isDead: boolean;
  } | null;
  players?: Array<{
    address: string;
    name: string;
    level: number;
    isDead: boolean;
  }>;
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function roleIcon(role: FamilyMemberRole) {
  switch (role) {
    case "Don":
      return <Crown className="h-3.5 w-3.5 text-yellow-500" />;
    case "Consigliere":
      return <Shield className="h-3.5 w-3.5 text-purple-500" />;
    case "Capodecina":
      return <Shield className="h-3.5 w-3.5 text-blue-500" />;
    case "Capo":
      return <Shield className="h-3.5 w-3.5 text-cyan-500" />;
    case "Successor":
      return <User className="h-3.5 w-3.5 text-amber-400" />;
    default:
      return <User className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function collectDeadMembers(families: FamilyPayload[]): GraveyardMember[] {
  const byAddress = new Map<string, GraveyardMember>();

  for (const family of families) {
    const familyName = family.name?.trim() || `Family #${family.familyId}`;

    for (const leader of family.leaders ?? []) {
      if (!leader?.isDead || !leader.address) continue;
      const key = leader.address.toLowerCase();
      byAddress.set(key, {
        address: leader.address,
        name: leader.name || shortAddress(leader.address),
        familyId: family.familyId,
        familyName,
        level: Number(leader.level) || 0,
        role: (leader.role as FamilyMemberRole) || "Member",
      });
    }

    const successor = family.successor;
    if (successor?.isDead && successor.address) {
      const key = successor.address.toLowerCase();
      if (!byAddress.has(key)) {
        byAddress.set(key, {
          address: successor.address,
          name: successor.name || shortAddress(successor.address),
          familyId: family.familyId,
          familyName,
          level: Number(successor.level) || 0,
          role: "Successor",
        });
      }
    }

    for (const player of family.players ?? []) {
      if (!player?.isDead || !player.address) continue;
      const key = player.address.toLowerCase();
      if (byAddress.has(key)) continue;
      byAddress.set(key, {
        address: player.address,
        name: player.name || shortAddress(player.address),
        familyId: family.familyId,
        familyName,
        level: Number(player.level) || 0,
        role: "Member",
      });
    }
  }

  return Array.from(byAddress.values()).sort((a, b) => {
    if (a.familyId !== b.familyId) return a.familyId - b.familyId;
    return a.name.localeCompare(b.name);
  });
}

export function GraveyardFamilyAction() {
  const { chainConfig } = useChain();
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof window !== "undefined" && !!window.MafiaFamily,
  );
  const [members, setMembers] = useState<GraveyardMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (scriptLoaded) return;
    const existing = document.querySelector('script[src="/js/mafia-utils.js"]');
    if (existing) {
      existing.addEventListener("load", () => setScriptLoaded(true));
      if (window.MafiaFamily) setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Failed to load family data script");
    document.body.appendChild(script);
  }, [scriptLoaded]);

  const loadDeadMembers = useCallback(async () => {
    if (!window.MafiaFamily) {
      setError("MafiaFamily not available");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadProgress("Loading families...");

    try {
      const families = (await window.MafiaFamily.getFamiliesWithPlayers({
        chain: chainConfig.id,
        onProgress: (info) => {
          if (info.step === "families") {
            setLoadProgress(`Loading families... ${info.fetched}`);
          } else {
            setLoadProgress(`Loading player info... ${info.fetched}`);
          }
        },
      })) as FamilyPayload[];

      setMembers(collectDeadMembers(families));
      setLoadProgress("");
    } catch (err) {
      console.error("Failed to load graveyard:", err);
      setError(err instanceof Error ? err.message : "Failed to load killed family");
      setMembers([]);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [chainConfig.id]);

  useEffect(() => {
    if (scriptLoaded) {
      loadDeadMembers();
    }
  }, [scriptLoaded, loadDeadMembers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.familyName.toLowerCase().includes(q) ||
        m.familyId.toString().includes(q) ||
        m.address.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  const familyCount = useMemo(
    () => new Set(members.map((m) => m.familyId)).size,
    [members],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, family, role, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {members.length} dead · {familyCount}{" "}
            {familyCount === 1 ? "family" : "families"}
          </p>
          <Button
            variant="outline"
            onClick={loadDeadMembers}
            disabled={isLoading || !scriptLoaded}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
        {isLoading ? (
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-red-400" />
            <span className="text-sm">{loadProgress || "Loading killed family..."}</span>
          </CardContent>
        ) : error ? (
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Skull className="h-10 w-10 text-red-400/60" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={loadDeadMembers}>
              Try again
            </Button>
          </CardContent>
        ) : filtered.length === 0 && hasLoaded ? (
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Skull className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "No killed family members match your search."
                : "No killed family members found."}
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => (
                  <TableRow
                    key={`${member.familyId}-${member.address}`}
                    className="border-border/30 hover:bg-secondary/30"
                  >
                    <TableCell>
                      <span className="text-sm font-medium text-muted-foreground line-through decoration-red-500/70 decoration-2">
                        {member.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/families/${member.familyId}`}
                        className="text-sm text-foreground hover:text-primary hover:underline"
                      >
                        {member.familyName}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          #{member.familyId}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        {roleIcon(member.role)}
                        {member.role}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                      {member.level}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {shortAddress(member.address)}
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
