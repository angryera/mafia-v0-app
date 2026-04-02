"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Users,
  RefreshCw,
  Crown,
  Skull,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { cn } from "@/lib/utils";

// Data structures
interface Leader {
  address: string;
  role: string;
  name: string;
  familyId: number;
  level: number;
  isDead: boolean;
  isJailed: boolean;
  gender: number;
  country: string;
  jailedUntil: number;
}

interface Successor {
  address: string;
  name: string;
  familyId: number;
  level: number;
  isDead: boolean;
  isJailed: boolean;
  gender: number;
  country: string;
  jailedUntil: number;
}

interface Player {
  address: string;
  name: string;
  familyId: number;
  level: number;
  isDead: boolean;
  isJailed: boolean;
  gender: number;
  country: string;
  jailedUntil: number;
}

export interface Family {
  familyId: number;
  leaders: Leader[];
  successor: Successor;
  leaveFee: number;
  memberCount: number;
  isDead: boolean;
  name: string;
  players: Player[];
}

// Declare global MafiaFamily
declare global {
  interface Window {
    MafiaFamily?: {
      getFamiliesWithPlayers: (options: {
        chain: string;
        onProgress?: (info: { step: string; fetched: number; batchIndex?: number }) => void;
      }) => Promise<Family[]>;
    };
  }
}

export function FamilyTable() {
  const router = useRouter();
  const { chainConfig } = useChain();
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load the MafiaFamily script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.MafiaFamily) {
      const script = document.createElement("script");
      script.src = "/js/mafia-utils.js";
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      script.onerror = () => {
        setError("Failed to load MafiaFamily script");
      };
      document.body.appendChild(script);
    } else if (window.MafiaFamily) {
      setScriptLoaded(true);
    }
  }, []);

  // Fetch families from contract
  const fetchFamilies = useCallback(async () => {
    if (!window.MafiaFamily) {
      setError("MafiaFamily not available");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadProgress("Initializing...");

    try {
      const enrichedFamilies = await window.MafiaFamily.getFamiliesWithPlayers({
        chain: chainConfig.id,
        onProgress: (info) => {
          if (info.step === "families") {
            setLoadProgress(`Loading families... ${info.fetched} families (batch ${info.batchIndex || 0})`);
          } else {
            setLoadProgress(`Loading player info... ${info.fetched} players`);
          }
        },
      });

      setFamilies(enrichedFamilies);
      setLoadProgress("");
    } catch (err) {
      console.error("Error fetching families:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch families");
    } finally {
      setIsLoading(false);
    }
  }, [chainConfig.id]);

  // Auto-fetch on mount when script is loaded
  useEffect(() => {
    if (scriptLoaded && families.length === 0 && !isLoading) {
      fetchFamilies();
    }
  }, [scriptLoaded, families.length, isLoading, fetchFamilies]);

  // Filter and sort families
  const filteredFamilies = useMemo(() => {
    let result = families;

    // Filter by active status
    if (showOnlyActive) {
      result = result.filter((f) => !f.isDead);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.familyId.toString().includes(query) ||
          f.leaders.some((l) => l.name.toLowerCase().includes(query)) ||
          f.players.some((p) => p.name.toLowerCase().includes(query))
      );
    }

    // Sort by member count descending
    return result.sort((a, b) => b.memberCount - a.memberCount);
  }, [families, showOnlyActive, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const active = families.filter((f) => !f.isDead);
    const totalMembers = active.reduce((sum, f) => sum + f.memberCount, 0);
    return {
      total: families.length,
      active: active.length,
      disbanded: families.length - active.length,
      totalMembers,
    };
  }, [families]);

  // Get don name for a family
  const getDonName = (family: Family): string => {
    const don = family.leaders.find((l) => l.role === "Don");
    return don?.name || "—";
  };

  // Navigate to family detail page
  const handleRowClick = (familyId: number) => {
    router.push(`/families/${familyId}`);
  };

  return (
    <div className="space-y-4">
      {/* Header with search and controls */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by family name, ID, or member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="active-only"
                  checked={showOnlyActive}
                  onCheckedChange={setShowOnlyActive}
                />
                <Label htmlFor="active-only" className="text-sm cursor-pointer">
                  Active only
                </Label>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchFamilies}
                disabled={isLoading}
                title="Refresh families"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>
                {filteredFamilies.length} {showOnlyActive ? "active " : ""}
                {filteredFamilies.length === 1 ? "family" : "families"}
              </span>
            </div>
            {stats.active > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span>
                  <span className="text-green-400">{stats.active}</span> active
                </span>
                <span>
                  <span className="text-red-400">{stats.disbanded}</span> disbanded
                </span>
                <span>
                  <span className="text-primary">{stats.totalMembers.toLocaleString()}</span> total members
                </span>
              </div>
            )}
            {isLoading && loadProgress && (
              <span className="text-primary">{loadProgress}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-4 text-center text-red-400">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFamilies}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && families.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Families Table */}
      {!isLoading && families.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Family Name</TableHead>
                <TableHead>Don</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFamilies.map((family) => (
                <TableRow
                  key={family.familyId}
                  onClick={() => handleRowClick(family.familyId)}
                  className={cn(
                    "cursor-pointer transition-colors",
                    family.isDead && "opacity-60"
                  )}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{family.familyId}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-semibold">{family.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-sm">{getDonName(family)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm">{family.memberCount}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {family.isDead ? (
                      <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-[10px]">
                        <Skull className="mr-1 h-3 w-3" />
                        Disbanded
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && families.length === 0 && scriptLoaded && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No Families Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click refresh to load families from the contract
            </p>
            <Button onClick={fetchFamilies} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Load Families
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No results for search */}
      {!isLoading && families.length > 0 && filteredFamilies.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No Results Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No families match your search for &quot;{searchQuery}&quot;
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="mt-4"
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
