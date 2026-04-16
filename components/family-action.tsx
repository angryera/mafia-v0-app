"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  Users,
  RefreshCw,
  Crown,
  Shield,
  User,
  Skull,
  Lock,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { cn } from "@/lib/utils";

// Data structures from the prompt
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

interface Family {
  familyId: number;
  leaders: Leader[];
  successor: Successor;
  leaveFee: number;
  memberCount: number;
  isDead: boolean;
  name: string;
  players: Player[];
}

// Role hierarchy for sorting
const ROLE_ORDER: Record<string, number> = {
  Don: 0,
  Consigliere: 1,
  Capodecina: 2,
  Capo: 3,
};

function getRoleIcon(role: string) {
  switch (role) {
    case "Don":
      return <Crown className="h-3.5 w-3.5 text-yellow-500" />;
    case "Consigliere":
      return <Shield className="h-3.5 w-3.5 text-purple-500" />;
    case "Capodecina":
      return <Shield className="h-3.5 w-3.5 text-blue-500" />;
    case "Capo":
      return <Shield className="h-3.5 w-3.5 text-cyan-500" />;
    default:
      return <User className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getRoleBadgeClass(role: string) {
  switch (role) {
    case "Don":
      return "border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
    case "Consigliere":
      return "border-purple-500/50 bg-purple-500/10 text-purple-400";
    case "Capodecina":
      return "border-blue-500/50 bg-blue-500/10 text-blue-400";
    case "Capo":
      return "border-cyan-500/50 bg-cyan-500/10 text-cyan-400";
    default:
      return "border-muted-foreground/50 text-muted-foreground";
  }
}

// Status indicators
function StatusIndicators({ isJailed, isDead }: { isJailed: boolean; isDead: boolean }) {
  if (!isJailed && !isDead) return null;
  return (
    <span className="inline-flex gap-1 ml-1">
      {isJailed && <Lock className="h-3 w-3 text-amber-500" title="Jailed" />}
      {isDead && <Skull className="h-3 w-3 text-red-500" title="Dead" />}
    </span>
  );
}

// Format address helper
function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Member row component
function MemberRow({
  member,
  role,
  copiedAddress,
  onCopy,
}: {
  member: { address: string; name: string; isJailed: boolean; isDead: boolean; level: number };
  role?: string;
  copiedAddress: string | null;
  onCopy: (address: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/30">
      <div className="flex items-center gap-2 min-w-0">
        {role ? getRoleIcon(role) : <User className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="font-medium truncate">{member.name || "Unknown"}</span>
        <StatusIndicators isJailed={member.isJailed} isDead={member.isDead} />
        {role && (
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getRoleBadgeClass(role))}>
            {role}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">Lvl {member.level}</span>
        <button
          onClick={() => onCopy(member.address)}
          className="group flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title={member.address}
        >
          {formatAddress(member.address)}
          {copiedAddress === member.address ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      </div>
    </div>
  );
}

// Family card component
function FamilyCard({
  family,
  copiedAddress,
  onCopy,
}: {
  family: Family;
  copiedAddress: string | null;
  onCopy: (address: string) => void;
}) {
  const sortedLeaders = useMemo(() => {
    return [...family.leaders].sort((a, b) => {
      const orderA = ROLE_ORDER[a.role] ?? 99;
      const orderB = ROLE_ORDER[b.role] ?? 99;
      return orderA - orderB;
    });
  }, [family.leaders]);

  const regularMembers = useMemo(() => {
    const leaderAddresses = new Set(family.leaders.map((l) => l.address.toLowerCase()));
    const successorAddress = family.successor?.address?.toLowerCase();
    return family.players.filter(
      (p) =>
        !leaderAddresses.has(p.address.toLowerCase()) &&
        p.address.toLowerCase() !== successorAddress
    );
  }, [family.players, family.leaders, family.successor]);

  const don = sortedLeaders.find((l) => l.role === "Don");

  return (
    <Card className={cn(
      "border-border/50 bg-card/50 backdrop-blur overflow-hidden",
      family.isDead && "opacity-60"
    )}>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="details" className="border-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/30 [&[data-state=open]]:bg-secondary/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{family.name}</span>
                    {family.isDead && (
                      <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-[10px]">
                        <Skull className="mr-1 h-3 w-3" />
                        Disbanded
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>ID: {family.familyId}</span>
                    <span className="text-border">|</span>
                    <span>{family.memberCount} members</span>
                    {don && (
                      <>
                        <span className="text-border">|</span>
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3 text-yellow-500" />
                          {don.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              {/* Leadership Section */}
              {sortedLeaders.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Leadership
                  </h4>
                  <div className="space-y-0.5">
                    {sortedLeaders.map((leader) => (
                      <MemberRow
                        key={leader.address}
                        member={leader}
                        role={leader.role}
                        copiedAddress={copiedAddress}
                        onCopy={onCopy}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Successor Section */}
              {family.successor && family.successor.address && family.successor.address !== "0x0000000000000000000000000000000000000000" && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Successor
                  </h4>
                  <MemberRow
                    member={family.successor}
                    role="Heir"
                    copiedAddress={copiedAddress}
                    onCopy={onCopy}
                  />
                </div>
              )}

              {/* Members Section */}
              {regularMembers.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Members ({regularMembers.length})
                  </h4>
                  <div className="space-y-0.5 max-h-60 overflow-y-auto">
                    {regularMembers.map((member) => (
                      <MemberRow
                        key={member.address}
                        member={member}
                        copiedAddress={copiedAddress}
                        onCopy={onCopy}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Leave Fee */}
              {family.leaveFee > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    Leave Fee: <span className="font-mono text-foreground">{(family.leaveFee / 1e18).toLocaleString()} MAFIA</span>
                  </span>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

export function FamilyAction() {
  const { chainConfig } = useChain();
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
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

  // Copy address handler
  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Families grid */}
      {!isLoading && families.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredFamilies.map((family) => (
            <FamilyCard
              key={family.familyId}
              family={family}
              copiedAddress={copiedAddress}
              onCopy={handleCopyAddress}
            />
          ))}
        </div>
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
