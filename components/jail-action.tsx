"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  JAIL_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
} from "@/lib/contract";
import { useAuth } from "@/components/auth-provider";
import {
  useChainAddresses,
  useChainExplorer,
  useChain,
} from "@/components/chain-provider";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  User,
  Loader2,
  Lock,
  Unlock,
  Timer,
  DollarSign,
  Hammer,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Player data structure from contract
interface JailedPlayer {
  user: string;
  name: string;
  isJailed: boolean;
  gender: number;
  country: string;
  jailedUntil: number;
}

// Declare global MafiaProfile
declare global {
  interface Window {
    MafiaProfile?: {
      getUsersInfo: (options: {
        chain: string;
        onProgress?: (info: { fetched: number; batchIndex: number }) => void;
      }) => Promise<JailedPlayer[]>;
    };
  }
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const CASH_PER_MINUTE = 1500;

function formatTimeRemaining(jailedUntilTs: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = jailedUntilTs - now;
  if (remaining <= 0) return "Released";

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(" ") || "<1m";
}

function calculateBuyOutCost(jailedUntilTs: number): number {
  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = jailedUntilTs - now;
  if (remainingSeconds <= 0) return 0;
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  return remainingMinutes * CASH_PER_MINUTE;
}

export function JailAction() {
  const { address, isConnected } = useAccount();
  const { authData } = useAuth();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  const [players, setPlayers] = useState<JailedPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Action dialog state
  const [selectedPlayer, setSelectedPlayer] = useState<JailedPlayer | null>(
    null
  );
  const [actionType, setActionType] = useState<"buyOut" | "bustOut" | null>(
    null
  );
  const [localApproved, setLocalApproved] = useState(false);

  // Read cash balance
  const { data: cashBalanceRaw } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });
  const cashBalance =
    cashBalanceRaw !== undefined
      ? Number(formatEther(cashBalanceRaw as bigint))
      : null;

  // Read current allowance for the jail contract
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowance",
    args: address ? [address, addresses.jail] : undefined,
    query: { enabled: !!address },
  });
  const allowance =
    allowanceRaw !== undefined
      ? Number(formatEther(allowanceRaw as bigint))
      : 0;
  const isApproved = localApproved || allowance > 1000;

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
          setLoadProgress(
            `Fetching players: ${info.fetched} (batch ${info.batchIndex})...`
          );
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

  // Filter players who are in jail
  const jailedPlayers = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return players.filter(
      (player) => player.isJailed && player.jailedUntil > now
    );
  }, [players]);

  // Filter jailed players based on search query
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return jailedPlayers;

    const query = searchQuery.toLowerCase();
    return jailedPlayers.filter(
      (player) =>
        player.name.toLowerCase().includes(query) ||
        player.user.toLowerCase().includes(query) ||
        player.country.toLowerCase().includes(query)
    );
  }, [jailedPlayers, searchQuery]);

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
  const handleCopyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // ---------- Approve cash spending ----------
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const handleApprove = () => {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.jail, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const approveLoading = approvePending || approveConfirming;

  const approveToastFired = useRef(false);
  useEffect(() => {
    if (approveSuccess && approveHash && !approveToastFired.current) {
      approveToastFired.current = true;
      setLocalApproved(true);
      toast.success("Cash spending approved for Jail contract");
      refetchAllowance();
    }
    if (!approveHash) {
      approveToastFired.current = false;
    }
  }, [approveSuccess, approveHash, refetchAllowance]);

  // ---------- Buy Out ----------
  const {
    writeContract: writeBuyOut,
    data: buyOutHash,
    isPending: buyOutPending,
    error: buyOutError,
    reset: resetBuyOut,
  } = useChainWriteContract();

  const { isLoading: buyOutConfirming, isSuccess: buyOutSuccess } =
    useWaitForTransactionReceipt({ hash: buyOutHash });

  const handleBuyOut = (playerAddress: string) => {
    resetBuyOut();
    writeBuyOut({
      address: addresses.jail,
      abi: JAIL_CONTRACT_ABI,
      functionName: "buyOut",
      args: [playerAddress as `0x${string}`],
    });
  };

  const buyOutLoading = buyOutPending || buyOutConfirming;

  useEffect(() => {
    if (buyOutSuccess && buyOutHash) {
      toast.success("Player bought out successfully!");
      setSelectedPlayer(null);
      setActionType(null);
      // Refresh the player list
      fetchPlayers();
    }
  }, [buyOutSuccess, buyOutHash, fetchPlayers]);

  // ---------- Bust Out ----------
  const {
    writeContract: writeBustOut,
    data: bustOutHash,
    isPending: bustOutPending,
    error: bustOutError,
    reset: resetBustOut,
  } = useChainWriteContract();

  const { isLoading: bustOutConfirming, isSuccess: bustOutSuccess } =
    useWaitForTransactionReceipt({ hash: bustOutHash });

  const handleBustOut = (playerAddress: string) => {
    resetBustOut();
    writeBustOut({
      address: addresses.jail,
      abi: JAIL_CONTRACT_ABI,
      functionName: "bustOut",
      args: [playerAddress as `0x${string}`],
    });
  };

  const bustOutLoading = bustOutPending || bustOutConfirming;

  useEffect(() => {
    if (bustOutSuccess && bustOutHash) {
      toast.success("Bust out attempt completed!");
      setSelectedPlayer(null);
      setActionType(null);
      // Refresh the player list
      fetchPlayers();
    }
  }, [bustOutSuccess, bustOutHash, fetchPlayers]);

  // Open action dialog
  const openActionDialog = (
    player: JailedPlayer,
    action: "buyOut" | "bustOut"
  ) => {
    setSelectedPlayer(player);
    setActionType(action);
    resetBuyOut();
    resetBustOut();
  };

  // Close action dialog
  const closeActionDialog = () => {
    setSelectedPlayer(null);
    setActionType(null);
  };

  // Not connected
  if (!isConnected) {
    return (
      <div>
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Lock className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Connect Your Wallet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your wallet to view jailed players.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <RefreshCw
                  className={cn("h-4 w-4", isLoading && "animate-spin")}
                />
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>
                {filteredPlayers.length.toLocaleString()} jailed player
                {filteredPlayers.length !== 1 && "s"}
                {searchQuery && ` found`}
              </span>
            </div>
            {cashBalance !== null && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                <span>
                  Your Cash: $
                  {cashBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
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

      {/* Jailed players table */}
      {!isLoading && players.length > 0 && filteredPlayers.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-center">Time Left</TableHead>
                  <TableHead className="text-center">Buy Out Cost</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPlayers.map((player, index) => {
                  const buyOutCost = calculateBuyOutCost(player.jailedUntil);
                  return (
                    <TableRow
                      key={player.user}
                      className="border-border/30 hover:bg-secondary/30"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10">
                            <User className="h-4 w-4 text-red-400" />
                          </div>
                          <span className="font-medium">
                            {player.name || "Unknown"}
                          </span>
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
                      <TableCell>
                        <span className="text-sm">
                          {player.country || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="border-red-500/50 bg-red-500/10 text-red-400"
                        >
                          <Timer className="mr-1 h-3 w-3" />
                          {formatTimeRemaining(player.jailedUntil)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm text-amber-400">
                          ${buyOutCost.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                            onClick={() => openActionDialog(player, "buyOut")}
                          >
                            <DollarSign className="mr-1 h-3 w-3" />
                            Buy Out
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => openActionDialog(player, "bustOut")}
                          >
                            <Hammer className="mr-1 h-3 w-3" />
                            Bust Out
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredPlayers.length)} of{" "}
                {filteredPlayers.length.toLocaleString()} jailed players
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
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

      {/* Empty state - no jailed players */}
      {!isLoading && !error && players.length > 0 && jailedPlayers.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Unlock className="mb-4 h-12 w-12 text-green-400/50" />
            <h3 className="text-lg font-medium text-green-400">
              No Players In Jail
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              All players are currently free. Check back later!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state - waiting for data */}
      {!isLoading && !error && players.length === 0 && scriptLoaded && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No Players Loaded</h3>
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
      {!isLoading &&
        players.length > 0 &&
        jailedPlayers.length > 0 &&
        filteredPlayers.length === 0 && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No Results Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No jailed players match your search for &quot;{searchQuery}&quot;
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

      {/* Action Dialog */}
      <Dialog open={!!selectedPlayer && !!actionType} onOpenChange={() => closeActionDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "buyOut" ? (
                <>
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Buy Out Player
                </>
              ) : (
                <>
                  <Hammer className="h-5 w-5 text-amber-400" />
                  Bust Out Player
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === "buyOut"
                ? "Pay cash to release this player from jail."
                : "Attempt to break this player out of jail. This may fail!"}
            </DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-4">
              {/* Player info */}
              <div className="rounded-lg bg-secondary/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                    <User className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {selectedPlayer.name || "Unknown"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatAddress(selectedPlayer.user)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time Remaining</span>
                  <Badge
                    variant="outline"
                    className="border-red-500/50 text-red-400"
                  >
                    <Timer className="mr-1 h-3 w-3" />
                    {formatTimeRemaining(selectedPlayer.jailedUntil)}
                  </Badge>
                </div>

                {actionType === "buyOut" && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Buy Out Cost</span>
                    <span className="font-mono font-medium text-amber-400">
                      ${calculateBuyOutCost(selectedPlayer.jailedUntil).toLocaleString()}
                    </span>
                  </div>
                )}

                {cashBalance !== null && actionType === "buyOut" && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Your Cash</span>
                    <span className="font-mono text-foreground">
                      ${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Errors */}
              {(approveError || buyOutError || bustOutError) && (
                <div className="rounded-lg bg-red-400/10 px-4 py-3">
                  <p className="text-xs text-red-400">
                    {(() => {
                      const err = approveError || buyOutError || bustOutError;
                      if (!err) return "";
                      return err.message.includes("User rejected")
                        ? "Transaction rejected by user"
                        : err.message.split("\n")[0];
                    })()}
                  </p>
                </div>
              )}

              {/* Buy Out flow */}
              {actionType === "buyOut" && (
                <div className="space-y-3">
                  {!isApproved && (
                    <Button
                      onClick={handleApprove}
                      disabled={approveLoading}
                      className="w-full"
                    >
                      {approveLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {approvePending
                            ? "Confirm in wallet..."
                            : "Approving..."}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Step 1: Approve Cash
                        </>
                      )}
                    </Button>
                  )}

                  {isApproved && (
                    <Button
                      onClick={() => handleBuyOut(selectedPlayer.user)}
                      disabled={buyOutLoading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {buyOutLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {buyOutPending
                            ? "Confirm in wallet..."
                            : "Processing..."}
                        </>
                      ) : (
                        <>
                          <DollarSign className="mr-2 h-4 w-4" />
                          Buy Out for ${calculateBuyOutCost(selectedPlayer.jailedUntil).toLocaleString()}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Bust Out flow */}
              {actionType === "bustOut" && (
                <Button
                  onClick={() => handleBustOut(selectedPlayer.user)}
                  disabled={bustOutLoading}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {bustOutLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {bustOutPending ? "Confirm in wallet..." : "Processing..."}
                    </>
                  ) : (
                    <>
                      <Hammer className="mr-2 h-4 w-4" />
                      Attempt Bust Out
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
