"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  DollarSign,
  Hammer,
  Loader2,
  RefreshCw,
  Search,
  Timer,
  Unlock,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import {
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
  JAIL_CONTRACT_ABI,
} from "@/lib/contract";
import { formatWalletAddress, getErrorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";
import "@/types/mafia-globals";

interface JailedPlayer {
  user: string;
  name: string;
  isJailed: boolean;
  country: string;
  jailedUntil: number;
}

const CASH_PER_MINUTE = 1500;
const ITEMS_PER_PAGE = 25;

function formatTimeRemaining(jailedUntil: number, now: number): string {
  const remaining = jailedUntil - now;
  if (remaining <= 0) return "Released";

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function calculateBuyOutCost(jailedUntil: number, now: number): number {
  return Math.ceil(Math.max(0, jailedUntil - now) / 60) * CASH_PER_MINUTE;
}

export function JailedPlayersList({ sentencePending = false }: { sentencePending?: boolean }) {
  const { address } = useAccount();
  const { authData } = useAuth();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const profileScript = useMafiaUtilsScript("MafiaProfile");
  const [players, setPlayers] = useState<JailedPlayer[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<JailedPlayer | null>(null);
  const [actionType, setActionType] = useState<"buyOut" | "bustOut" | null>(null);
  const [localApproved, setLocalApproved] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const error =
    profileScript === "error" ? "Failed to load MafiaProfile script" : fetchError;

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

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowances",
    args: address ? [address, addresses.jail] : undefined,
    query: { enabled: !!address },
  });

  const cashBalance =
    cashBalanceRaw !== undefined ? Number(formatEther(cashBalanceRaw as bigint)) : null;
  const allowance =
    allowanceRaw !== undefined ? Number(formatEther(allowanceRaw as bigint)) : 0;
  const selectedBuyOutCost = selectedPlayer
    ? calculateBuyOutCost(selectedPlayer.jailedUntil, now)
    : 0;
  const isApproved =
    localApproved || (selectedBuyOutCost > 0 && allowance >= selectedBuyOutCost);
  const canAfford = cashBalance === null || cashBalance >= selectedBuyOutCost;

  const fetchPlayers = useCallback(async () => {
    if (!window.MafiaProfile) {
      setFetchError("MafiaProfile is not available");
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    setLoadProgress("Initializing...");
    try {
      const users = (await window.MafiaProfile.getUsersInfo({
        chain: chainConfig.id,
        onProgress: ({ fetched, batchIndex }) => {
          setLoadProgress(`Fetching players: ${fetched} (batch ${batchIndex})...`);
        },
      })) as JailedPlayer[];
      setPlayers(users);
      setCurrentPage(1);
      setHasLoaded(true);
    } catch (caught) {
      console.error("Error fetching jailed players:", caught);
      setFetchError(caught instanceof Error ? caught.message : "Failed to fetch players");
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
      setLoadProgress("");
    }
  }, [chainConfig.id]);

  useEffect(() => {
    if (profileScript !== "ready" || hasLoaded || isLoading) return;
    const timer = window.setTimeout(() => void fetchPlayers(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchPlayers, hasLoaded, isLoading, profileScript]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const jailedPlayers = useMemo(() => {
    const mine = address?.toLowerCase();
    return players.filter((player) => {
      const until = Number(player.jailedUntil);
      if (!player.isJailed || !Number.isFinite(until) || until <= now) return false;
      return player.user.toLowerCase() !== mine;
    });
  }, [address, now, players]);
  const filteredPlayers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return jailedPlayers;
    return jailedPlayers.filter(
      (player) =>
        player.name.toLowerCase().includes(query) ||
        player.user.toLowerCase().includes(query) ||
        player.country.toLowerCase().includes(query),
    );
  }, [jailedPlayers, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE));
  const visiblePage = Math.min(currentPage, totalPages);
  const startIndex = (visiblePage - 1) * ITEMS_PER_PAGE;
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const approveTx = useContractTransaction({
    onSuccess: () => {
      setLocalApproved(true);
      toast.success("Cash spending approved for jail");
      void refetchAllowance();
    },
  });
  const buyOutTx = useContractTransaction({
    onSuccess: () => {
      toast.success("Player bought out successfully");
      closeActionDialog();
      void fetchPlayers();
    },
  });
  const bustOutTx = useContractTransaction({
    onSuccess: () => {
      toast.success("Bust out attempt completed");
      closeActionDialog();
      void fetchPlayers();
    },
  });

  function closeActionDialog() {
    setSelectedPlayer(null);
    setActionType(null);
  }

  function openActionDialog(player: JailedPlayer, action: "buyOut" | "bustOut") {
    setSelectedPlayer(player);
    setActionType(action);
    approveTx.reset();
    buyOutTx.reset();
    bustOutTx.reset();
  }

  function handleApprove() {
    approveTx.reset();
    approveTx.write({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.jail, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  }

  async function handleBuyOut() {
    if (!selectedPlayer) return;
    buyOutTx.reset();
    try {
      await buyOutTx.writeAsync({
        address: addresses.jail,
        abi: JAIL_CONTRACT_ABI,
        functionName: "buyOut",
        args: [selectedPlayer.user as `0x${string}`],
      });
    } catch (caught) {
      console.error("buyOut error:", caught);
    }
  }

  async function handleBustOut() {
    if (!selectedPlayer) return;
    bustOutTx.reset();
    try {
      await bustOutTx.writeAsync({
        address: addresses.jail,
        abi: JAIL_CONTRACT_ABI,
        functionName: "bustOut",
        args: [selectedPlayer.user as `0x${string}`],
      });
    } catch (caught) {
      console.error("bustOut error:", caught);
    }
  }

  async function handleCopyAddress(playerAddress: string) {
    try {
      await navigator.clipboard.writeText(playerAddress);
      setCopiedAddress(playerAddress);
      window.setTimeout(() => setCopiedAddress(null), 2000);
    } catch (caught) {
      console.error("Failed to copy address:", caught);
    }
  }

  const activeError = approveTx.error ?? buyOutTx.error ?? bustOutTx.error;
  const listLoading = profileScript === "loading" || (isLoading && !hasLoaded);

  return (
    <div className="space-y-4">
      <Card className="border-green-500/30 bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-green-400" />
                <h3 className="font-semibold text-green-400">You are free</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {sentencePending
                  ? "Loading your sentence. Jailed players are listed below."
                  : "Help another jailed player by buying or attempting to bust them out."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPlayers} disabled={isLoading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search jailed players..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {listLoading
                  ? "Loading jailed players..."
                  : `${filteredPlayers.length} jailed player${filteredPlayers.length === 1 ? "" : "s"}`}
              </span>
              {cashBalance !== null && (
                <span>${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} cash</span>
              )}
            </div>
          </div>
          {isLoading && loadProgress && (
            <p className="mt-3 text-xs text-primary">{loadProgress}</p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-4 text-center text-red-400">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPlayers} className="mt-3">
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {listLoading && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && hasLoaded && jailedPlayers.length === 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Unlock className="mb-3 h-12 w-12 text-green-400/50" />
            <h3 className="text-lg font-medium text-green-400">No players in jail</h3>
            <p className="mt-1 text-sm text-muted-foreground">Everyone is currently free.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && jailedPlayers.length > 0 && filteredPlayers.length === 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Search className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No matching jailed players</h3>
            <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
              Clear search
            </Button>
          </CardContent>
        </Card>
      )}

      {filteredPlayers.length > 0 && (
        <Card className="overflow-hidden border-border/50 bg-card/50">
          <div className="divide-y divide-border/50">
            {paginatedPlayers.map((player) => (
              <div key={player.user} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 shrink-0 text-red-400" />
                    <span className="truncate">{player.name || "Unknown"}</span>
                  </p>
                  <button
                    onClick={() => handleCopyAddress(player.user)}
                    className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
                    title={player.user}
                  >
                    {formatWalletAddress(player.user)}
                    {copiedAddress === player.user ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{player.country || "Unknown"}</span>
                    <Badge variant="outline" className="border-red-500/50 text-red-400">
                      <Timer className="mr-1 h-3 w-3" />
                      {formatTimeRemaining(player.jailedUntil, now)}
                    </Badge>
                    <span className="font-mono text-amber-400">
                      ${calculateBuyOutCost(player.jailedUntil, now).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => openActionDialog(player, "buyOut")}>
                    <DollarSign className="mr-1 h-3 w-3" />
                    Buy out
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openActionDialog(player, "bustOut")}>
                    <Hammer className="mr-1 h-3 w-3" />
                    Bust out
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredPlayers.length)} of {filteredPlayers.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={visiblePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={visiblePage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Dialog open={!!selectedPlayer && !!actionType} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "buyOut" ? <DollarSign className="h-5 w-5 text-green-400" /> : <Hammer className="h-5 w-5 text-amber-400" />}
              {actionType === "buyOut" ? "Buy out player" : "Bust out player"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "buyOut"
                ? "Pay the remaining sentence cost to release this player."
                : "Attempt to break this player out. The attempt may fail."}
            </DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="font-medium">{selectedPlayer.name || "Unknown"}</p>
                <p className="font-mono text-xs text-muted-foreground">{formatWalletAddress(selectedPlayer.user)}</p>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Time remaining</span>
                  <span>{formatTimeRemaining(selectedPlayer.jailedUntil, now)}</span>
                </div>
                {actionType === "buyOut" && (
                  <>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Buyout cost</span>
                      <span className="font-mono text-amber-400">${selectedBuyOutCost.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Your cash</span>
                      <span className="font-mono">
                        {cashBalance === null ? "—" : `$${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {activeError && (
                <div className="rounded-lg bg-red-400/10 px-4 py-3 text-xs text-red-400">
                  {activeError.message.includes("User rejected")
                    ? "Transaction rejected by user"
                    : getErrorMessage(activeError)}
                </div>
              )}

              {actionType === "buyOut" && (
                <div className="space-y-3">
                  {!canAfford && (
                    <p className="text-xs text-red-400">You do not have enough cash for this buyout.</p>
                  )}
                  {!isApproved && (
                    <Button onClick={handleApprove} disabled={approveTx.isLoading} className="w-full">
                      {approveTx.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      {approveTx.isPending ? "Confirm in wallet..." : approveTx.isConfirming ? "Approving..." : "Approve cash"}
                    </Button>
                  )}
                  <Button
                    onClick={handleBuyOut}
                    disabled={!isApproved || !canAfford || buyOutTx.isLoading || selectedBuyOutCost <= 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {buyOutTx.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {buyOutTx.isPending ? "Confirm in wallet..." : buyOutTx.isConfirming ? "Buying out..." : `Buy out for $${selectedBuyOutCost.toLocaleString()}`}
                  </Button>
                </div>
              )}

              {actionType === "bustOut" && (
                <Button onClick={handleBustOut} disabled={bustOutTx.isLoading} className="w-full bg-amber-600 hover:bg-amber-700">
                  {bustOutTx.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {bustOutTx.isPending ? "Confirm in wallet..." : bustOutTx.isConfirming ? "Attempting..." : "Attempt bust out"}
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
