"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  ShieldCheck,
  ShieldX,
  Copy,
  Check,
  User,
} from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { cn } from "@/lib/utils";

// Player data structure from contract
interface Player {
  user: string;
  name: string;
  referrer: string;
  isJailed: boolean;
  gender: number; // 0 = male, 1 = female
  country: string;
  jailedUntil?: number;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function PlayersAction() {
  const { chainConfig } = useChain();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

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

  // Fetch players from contract
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
          setLoadProgress(`Fetching players: ${info.fetched} (batch ${info.batchIndex})...`);
        },
      });

      setPlayers(users);
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
    if (scriptLoaded && players.length === 0 && !isLoading) {
      fetchPlayers();
    }
  }, [scriptLoaded, players.length, isLoading, fetchPlayers]);

  // Filter players based on search query
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;

    const query = searchQuery.toLowerCase();
    return players.filter(
      (player) =>
        player.name.toLowerCase().includes(query) ||
        player.user.toLowerCase().includes(query) ||
        player.country.toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

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

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get gender label
  const getGenderLabel = (gender: number) => {
    return gender === 1 ? "Female" : "Male";
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
                placeholder="Search by name, address, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Controls */}
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
                title="Refresh players"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>
                {filteredPlayers.length.toLocaleString()} player{filteredPlayers.length !== 1 && "s"}
                {searchQuery && ` found`}
              </span>
            </div>
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
              onClick={fetchPlayers}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && players.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players table */}
      {!isLoading && players.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-center">Gender</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPlayers.map((player, index) => (
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
                    <TableCell className="text-center">
                      {player.isJailed ? (
                        <Badge
                          variant="outline"
                          className="border-red-500/50 bg-red-500/10 text-red-400"
                        >
                          <ShieldX className="mr-1 h-3 w-3" />
                          Jailed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-green-500/50 bg-green-500/10 text-green-400"
                        >
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Free
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPlayers.length)} of{" "}
                {filteredPlayers.length.toLocaleString()} players
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

                {/* Page numbers */}
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
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && players.length === 0 && scriptLoaded && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No Players Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click refresh to load players from the contract
            </p>
            <Button onClick={fetchPlayers} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Load Players
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No results for search */}
      {!isLoading && players.length > 0 && filteredPlayers.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No Results Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No players match your search for &quot;{searchQuery}&quot;
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
