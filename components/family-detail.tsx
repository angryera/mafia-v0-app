"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Crown,
  Shield,
  User,
  Skull,
  Lock,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { cn } from "@/lib/utils";
import type { Family } from "@/components/family-table";
import "@/types/mafia-globals";

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
    case "Heir":
      return <Shield className="h-3.5 w-3.5 text-amber-500" />;
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
    case "Heir":
      return "border-amber-500/50 bg-amber-500/10 text-amber-400";
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

interface FamilyDetailProps {
  familyId: number;
}

export function FamilyDetail({ familyId }: FamilyDetailProps) {
  const { chainConfig } = useChain();
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
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

  // Fetch family data
  const fetchFamily = useCallback(async () => {
    if (!window.MafiaFamily) {
      setError("MafiaFamily not available");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadProgress("Loading family data...");

    try {
      const allFamilies = await window.MafiaFamily.getFamiliesWithPlayers({
        chain: chainConfig.id,
        onProgress: (info) => {
          if (info.step === "families") {
            setLoadProgress(`Loading families... ${info.fetched}`);
          } else {
            setLoadProgress(`Loading player info... ${info.fetched}`);
          }
        },
      });

      const foundFamily = allFamilies.find((f) => f.familyId === familyId);
      if (foundFamily) {
        setFamily(foundFamily);
      } else {
        setError(`Family #${familyId} not found`);
      }
      setLoadProgress("");
    } catch (err) {
      console.error("Error fetching family:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch family data");
    } finally {
      setIsLoading(false);
    }
  }, [chainConfig.id, familyId]);

  // Auto-fetch on mount when script is loaded
  useEffect(() => {
    if (scriptLoaded && !family && !isLoading) {
      fetchFamily();
    }
  }, [scriptLoaded, family, isLoading, fetchFamily]);

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

  // Sorted leaders
  const sortedLeaders = useMemo(() => {
    if (!family) return [];
    return [...family.leaders].sort((a, b) => {
      const orderA = ROLE_ORDER[a.role] ?? 99;
      const orderB = ROLE_ORDER[b.role] ?? 99;
      return orderA - orderB;
    });
  }, [family]);

  // Regular members (excluding leaders and successor)
  const regularMembers = useMemo(() => {
    if (!family) return [];
    const leaderAddresses = new Set(family.leaders.map((l) => l.address.toLowerCase()));
    const successorAddress = family.successor?.address?.toLowerCase();
    return family.players.filter(
      (p) =>
        !leaderAddresses.has(p.address.toLowerCase()) &&
        p.address.toLowerCase() !== successorAddress
    );
  }, [family]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/50 bg-red-500/10">
        <CardContent className="p-6 text-center">
          <Skull className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h3 className="text-lg font-semibold text-red-400">{error}</h3>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/families">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Families
              </Link>
            </Button>
            <Button variant="outline" onClick={fetchFamily}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!family) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/families">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{family.name}</h1>
            {family.isDead ? (
              <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400">
                <Skull className="mr-1 h-3 w-3" />
                Disbanded
              </Badge>
            ) : (
              <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400">
                Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Family ID: #{family.familyId} | {family.memberCount} members
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchFamily}
          className="ml-auto"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Family Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Crown className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Leadership</p>
                <p className="text-lg font-semibold">{sortedLeaders.length} leaders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="text-lg font-semibold">{regularMembers.length} soldiers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Leave Fee</p>
                <p className="text-lg font-semibold font-mono">
                  {family.leaveFee > 0 ? `${(family.leaveFee / 1e18).toLocaleString()} MAFIA` : "Free"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leadership Table */}
      {sortedLeaders.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Crown className="h-4 w-4 text-yellow-500" />
              Leadership
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Role</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeaders.map((leader) => (
                <TableRow key={leader.address}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(leader.role)}
                      <Badge variant="outline" className={cn("text-[10px]", getRoleBadgeClass(leader.role))}>
                        {leader.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {leader.name || "Unknown"}
                    <StatusIndicators isJailed={leader.isJailed} isDead={leader.isDead} />
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">{leader.level}</TableCell>
                  <TableCell>
                    {leader.isDead ? (
                      <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-[10px]">
                        Dead
                      </Badge>
                    ) : leader.isJailed ? (
                      <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px]">
                        Jailed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleCopyAddress(leader.address)}
                      className="group flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                      title={leader.address}
                    >
                      {formatAddress(leader.address)}
                      {copiedAddress === leader.address ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Successor */}
      {family.successor && family.successor.address && family.successor.address !== "0x0000000000000000000000000000000000000000" && (
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Shield className="h-4 w-4 text-amber-500" />
              Successor
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Role</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getRoleIcon("Heir")}
                    <Badge variant="outline" className={cn("text-[10px]", getRoleBadgeClass("Heir"))}>
                      Heir
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {family.successor.name || "Unknown"}
                  <StatusIndicators isJailed={family.successor.isJailed} isDead={family.successor.isDead} />
                </TableCell>
                <TableCell className="text-center font-mono text-sm">{family.successor.level}</TableCell>
                <TableCell>
                  {family.successor.isDead ? (
                    <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-[10px]">
                      Dead
                    </Badge>
                  ) : family.successor.isJailed ? (
                    <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px]">
                      Jailed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-[10px]">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => handleCopyAddress(family.successor.address)}
                    className="group flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title={family.successor.address}
                  >
                    {formatAddress(family.successor.address)}
                    {copiedAddress === family.successor.address ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Members Table */}
      {regularMembers.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <User className="h-4 w-4 text-primary" />
              Members ({regularMembers.length})
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regularMembers.map((member) => (
                <TableRow key={member.address}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {member.name || "Unknown"}
                      <StatusIndicators isJailed={member.isJailed} isDead={member.isDead} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">{member.level}</TableCell>
                  <TableCell>
                    {member.isDead ? (
                      <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-[10px]">
                        Dead
                      </Badge>
                    ) : member.isJailed ? (
                      <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px]">
                        Jailed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{member.country || "—"}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleCopyAddress(member.address)}
                      className="group flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                      title={member.address}
                    >
                      {formatAddress(member.address)}
                      {copiedAddress === member.address ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
