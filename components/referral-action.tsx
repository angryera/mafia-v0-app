"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  User,
  Trophy,
  UserPlus,
  Crown,
  Medal,
  Award,
} from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import "@/types/mafia-globals";
import { useAccount } from "wagmi";

// Player data structure from contract (with referrer field)
interface Player {
  user: string;
  name: string;
  referrer: string;
  isJailed: boolean;
  gender: number; // 0 = male, 1 = female
  country: string;
  jailedUntil?: number;
}

// Leaderboard entry
interface LeaderboardEntry {
  user: string;
  name: string;
  referralCount: number;
  rank: number;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function ReferralAction() {
  const { chainConfig } = useChain();
  const { address } = useAccount();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-referrals" | "leaderboard">("my-referrals");

  // Load the MafiaProfile script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.MafiaProfile) {
      const script = document.createElement("script");
      script.src = "/js/mafia-utils.js";
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      script.onerror = () => {
        setError("Failed to load MafiaProfile script");
      };
      document.body.appendChild(script);
    } else if (window.MafiaProfile) {
      setScriptLoaded(true);
    }
  }, []);

  // Fetch all players from contract
  const fetchPlayers = useCallback(async () => {
    if (!window.MafiaProfile) {
      setError("MafiaProfile not available");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadProgress("Initializing...");

    try {
      const users = await window.MafiaProfile.getUsersInfo({
        chain: chainConfig.id,
        onProgress: (info) => {
          setLoadProgress(`Fetching profiles: ${info.fetched} (batch ${info.batchIndex})...`);
        },
      });

      setAllPlayers(users);
      setLoadProgress("");
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching players:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch players");
    } finally {
      setIsLoading(false);
    }
  }, [chainConfig.id]);

  // Auto-fetch on mount when script is loaded
  useEffect(() => {
    if (scriptLoaded && allPlayers.length === 0 && !isLoading) {
      fetchPlayers();
    }
  }, [scriptLoaded, allPlayers.length, isLoading, fetchPlayers]);

  // Filter players who used my address as referrer
  const myReferrals = useMemo(() => {
    if (!address) return [];
    return allPlayers.filter(
      (player) => player.referrer.toLowerCase() === address.toLowerCase()
    );
  }, [allPlayers, address]);

  // Build leaderboard: count referrals for each user
  const leaderboard = useMemo(() => {
    const referralCounts = new Map<string, number>();

    // Count referrals for each referrer
    allPlayers.forEach((player) => {
      if (player.referrer && player.referrer !== ZERO_ADDRESS) {
        const count = referralCounts.get(player.referrer.toLowerCase()) || 0;
        referralCounts.set(player.referrer.toLowerCase(), count + 1);
      }
    });

    // Build leaderboard entries with player names
    const entries: LeaderboardEntry[] = [];
    referralCounts.forEach((count, referrerAddress) => {
      const player = allPlayers.find(
        (p) => p.user.toLowerCase() === referrerAddress
      );
      entries.push({
        user: referrerAddress,
        name: player?.name || "Unknown",
        referralCount: count,
        rank: 0,
      });
    });

    // Sort by referral count descending
    entries.sort((a, b) => b.referralCount - a.referralCount);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  }, [allPlayers]);

  // Filter based on search query
  const filteredMyReferrals = useMemo(() => {
    if (!searchQuery.trim()) return myReferrals;
    const query = searchQuery.toLowerCase();
    return myReferrals.filter(
      (player) =>
        player.name.toLowerCase().includes(query) ||
        player.user.toLowerCase().includes(query) ||
        player.country.toLowerCase().includes(query)
    );
  }, [myReferrals, searchQuery]);

  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const query = searchQuery.toLowerCase();
    return leaderboard.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.user.toLowerCase().includes(query)
    );
  }, [leaderboard, searchQuery]);

  // Get current data based on active tab
  const currentData = activeTab === "my-referrals" ? filteredMyReferrals : filteredLeaderboard;

  // Pagination calculations
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  // Reset to page 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, activeTab]);

  // Copy address handler
  const handleCopyAddress = async (addressToCopy: string) => {
    try {
      await navigator.clipboard.writeText(addressToCopy);
      setCopiedAddress(addressToCopy);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Get gender label
  const getGenderLabel = (gender: number) => {
    return gender === 1 ? "Female" : "Male";
  };

  // Get rank icon
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  // My rank on leaderboard
  const myRank = useMemo(() => {
    if (!address) return null;
    const entry = leaderboard.find(
      (e) => e.user.toLowerCase() === address.toLowerCase()
    );
    return entry?.rank || null;
  }, [leaderboard, address]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">My Referrals</p>
                <p className="text-2xl font-bold">{myReferrals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">My Rank</p>
                <p className="text-2xl font-bold">
                  {myRank ? `#${myRank}` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Players</p>
                <p className="text-2xl font-bold">{allPlayers.length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="my-referrals" className="gap-2">
                <UserPlus className="h-4 w-4" />
                My Referrals
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-2">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-4">
          {/* Search and controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "my-referrals"
                    ? "Search referrals by name or address..."
                    : "Search leaderboard..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={String(itemsPerPage)}
                onValueChange={(val) => setItemsPerPage(Number(val))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} rows
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchPlayers}
                disabled={isLoading}
                title="Refresh data"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Loading progress */}
          {isLoading && loadProgress && (
            <div className="mb-4 text-sm text-primary">{loadProgress}</div>
          )}

          {/* Error state */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-center text-red-400">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPlayers}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && allPlayers.length === 0 && (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {/* My Referrals Tab Content */}
          {!isLoading && activeTab === "my-referrals" && (
            <>
              {!address ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <User className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">Connect Your Wallet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Connect your wallet to see your referrals
                  </p>
                </div>
              ) : myReferrals.length === 0 && allPlayers.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserPlus className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">No Referrals Yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share your referral address to invite new players
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleCopyAddress(address)}
                    className="mt-4 gap-2"
                  >
                    {copiedAddress === address ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy My Address
                      </>
                    )}
                  </Button>
                </div>
              ) : filteredMyReferrals.length === 0 && searchQuery ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">No Results Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No referrals match your search for &quot;{searchQuery}&quot;
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="text-center">Gender</TableHead>
                        <TableHead>Country</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(paginatedData as Player[]).map((player, index) => (
                        <TableRow
                          key={player.user}
                          className="border-border/30 hover:bg-secondary/30"
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {startIndex + index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium">{player.name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleCopyAddress(player.user)}
                              className="group flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                              title={player.user}
                            >
                              {formatAddress(player.user)}
                              {copiedAddress === player.user ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                player.gender === 1
                                  ? "border-pink-500/50 text-pink-400"
                                  : "border-blue-500/50 text-blue-400"
                              )}
                            >
                              {getGenderLabel(player.gender)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{player.country || "Unknown"}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}

          {/* Leaderboard Tab Content */}
          {!isLoading && activeTab === "leaderboard" && (
            <>
              {leaderboard.length === 0 && allPlayers.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Trophy className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">No Referrals Yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Be the first to refer players and top the leaderboard!
                  </p>
                </div>
              ) : filteredLeaderboard.length === 0 && searchQuery ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">No Results Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No entries match your search for &quot;{searchQuery}&quot;
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="w-16 text-center">Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="text-center">Referrals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(paginatedData as LeaderboardEntry[]).map((entry) => {
                        const isMe = address && entry.user.toLowerCase() === address.toLowerCase();
                        return (
                          <TableRow
                            key={entry.user}
                            className={cn(
                              "border-border/30",
                              isMe
                                ? "bg-primary/10 hover:bg-primary/15"
                                : "hover:bg-secondary/30"
                            )}
                          >
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getRankIcon(entry.rank)}
                                <span
                                  className={cn(
                                    "font-bold",
                                    entry.rank === 1 && "text-yellow-500",
                                    entry.rank === 2 && "text-gray-400",
                                    entry.rank === 3 && "text-amber-600"
                                  )}
                                >
                                  #{entry.rank}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full",
                                    entry.rank === 1
                                      ? "bg-yellow-500/20"
                                      : entry.rank === 2
                                        ? "bg-gray-400/20"
                                        : entry.rank === 3
                                          ? "bg-amber-600/20"
                                          : "bg-primary/10"
                                  )}
                                >
                                  <User
                                    className={cn(
                                      "h-4 w-4",
                                      entry.rank === 1
                                        ? "text-yellow-500"
                                        : entry.rank === 2
                                          ? "text-gray-400"
                                          : entry.rank === 3
                                            ? "text-amber-600"
                                            : "text-primary"
                                    )}
                                  />
                                </div>
                                <span className="font-medium">
                                  {entry.name || "Unknown"}
                                  {isMe && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      You
                                    </Badge>
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => handleCopyAddress(entry.user)}
                                className="group flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                                title={entry.user}
                              >
                                {formatAddress(entry.user)}
                                {copiedAddress === entry.user ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="secondary"
                                className="font-mono font-bold"
                              >
                                {entry.referralCount}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 mt-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, currentData.length)} of{" "}
                {currentData.length.toLocaleString()} entries
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="icon"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
