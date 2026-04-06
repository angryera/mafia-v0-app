"use client";

import { useAuth } from "@/components/auth-provider";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { useToast } from "@/hooks/use-toast";
import {
  HEALTH_ABI,
  INGAME_CURRENCY_ABI,
  OC_ASSET_EXPECTATION_LABELS,
  OC_JOIN_ABI,
  OC_LOBBY_ABI,
  OC_LOBBY_STATUS,
  OC_LOBBY_STATUS_LABELS,
  OC_MAX_CASH,
  OC_MIN_HEALTH,
  parseOcRewardAmount,
  RANK_NAMES,
  TRAVEL_DESTINATIONS
} from "@/lib/contract";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronRight,
  Crown,
  DollarSign,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Shield,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPublicClient, formatEther, http, maxUint256, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";

// ── Types ───────────────────────────────────────────────────────
interface Member {
  user: string;
  itemIds: number[];
  impactScore: number;
  deductedScore: number;
  assetAddresses: string[];
  assetAmounts: number[];
}

interface Reward {
  typeId: number;
  amount: number;
}

interface CrimeLobby {
  id: number;
  leader: string;
  members: Member[];
  isSuccess: boolean;
  city: number;
  failureType: number;
  assetExpectation: number;
  minRank: number;
  impactScore: number;
  deductedScore: number;
  status: number;
  createdAt: number;
  startBlock: number;
  isRewardClaimed: boolean;
  currentRewardIndex: number;
  rewards: Reward[];
}

// ── Helpers ─────────────────────────────────────────────────────
function parseCrimeLobby(data: unknown): CrimeLobby {
  const d = data as Record<string, unknown>;
  return {
    id: Number(d.id),
    leader: d.leader as string,
    members: ((d.members as unknown[]) || []).map((m: unknown) => {
      const member = m as Record<string, unknown>;
      return {
        user: member.user as string,
        itemIds: ((member.itemIds as unknown[]) || []).map((id) => Number(id)),
        impactScore: Number(member.impactScore),
        deductedScore: Number(member.deductedScore),
        assetAddresses: (member.assetAddresses as string[]) || [],
        assetAmounts: ((member.assetAmounts as unknown[]) || []).map((amt) =>
          Number(formatEther(amt as bigint))
        ),
      };
    }),
    isSuccess: Boolean(d.isSuccess),
    city: Number(d.city),
    failureType: Number(d.failureType),
    assetExpectation: Number(d.assetExpectation),
    minRank: Number(d.minRank),
    impactScore: Number(d.impactScore),
    deductedScore: Number(d.deductedScore),
    status: Number(d.status),
    createdAt: Number(d.createdAt),
    startBlock: Number(d.startBlock),
    isRewardClaimed: Boolean(d.isRewardClaimed),
    currentRewardIndex: Number(d.currentRewardIndex),
    rewards: ((d.rewards as unknown[]) || []).map((r: unknown) => {
      const reward = r as Record<string, unknown>;
      const typeId = Number(reward.typeId);
      return {
        typeId,
        amount: parseOcRewardAmount(typeId, reward.amount as bigint),
      };
    }),
  };
}

function getCityName(cityId: number): string {
  if (cityId >= 0 && cityId < TRAVEL_DESTINATIONS.length) {
    return TRAVEL_DESTINATIONS[cityId].label;
  }
  return `City #${cityId}`;
}

function getRankName(rankIndex: number): string {
  return RANK_NAMES[rankIndex] || `Rank ${rankIndex}`;
}

function getStatusColor(status: number): string {
  switch (status) {
    case OC_LOBBY_STATUS.WAITING:
      return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    case OC_LOBBY_STATUS.STARTED:
      return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    case OC_LOBBY_STATUS.FINISHED:
      return "bg-green-500/10 text-green-500 border-green-500/30";
    case OC_LOBBY_STATUS.CANCELLED:
      return "bg-red-500/10 text-red-500 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Create Lobby Dialog ─────────────────────────────────────────
function CreateLobbyDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { address } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData } = useAuth();
  const { toast } = useToast();

  const [cashAmount, setCashAmount] = useState("1000000");
  const [assetExpectation, setAssetExpectation] = useState("0");
  const [minRank, setMinRank] = useState("0");
  const [needsApproval, setNeedsApproval] = useState(false);

  // Write hooks
  const { writeContract, data: hash, isPending, reset } = useChainWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Approval hooks
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    reset: resetApprove,
  } = useChainWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Check allowance
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.cash,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowance",
    args: address && addresses.ocJoin ? [address, addresses.ocJoin] : undefined,
    query: { enabled: !!address && !!addresses.ocJoin },
  });

  useEffect(() => {
    if (allowanceRaw !== undefined) {
      const allowance = Number(formatEther(allowanceRaw as bigint));
      const amount = Number(cashAmount) || 0;
      setNeedsApproval(allowance < amount);
    }
  }, [allowanceRaw, cashAmount]);

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess) {
      toast({
        title: "Approval Successful",
        description: "You can now create the lobby.",
      });
      refetchAllowance();
      resetApprove();
    }
  }, [isApproveSuccess, toast, refetchAllowance, resetApprove]);

  // Handle create success
  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Lobby Created",
        description: (
          <a
            href={`${explorer}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline"
          >
            View transaction <ExternalLink className="h-3 w-3" />
          </a>
        ),
      });
      reset();
      onOpenChange(false);
      onSuccess();
    }
  }, [isSuccess, hash, explorer, toast, reset, onOpenChange, onSuccess]);

  const handleApprove = () => {
    if (!address || !addresses.ocJoin) return;
    writeApprove({
      address: addresses.cash,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approve",
      args: [addresses.ocJoin, maxUint256],
    });
  };

  const handleCreate = () => {
    if (!authData || !address) return;
    const amount = parseEther(cashAmount);
    writeContract({
      address: addresses.ocJoin,
      abi: OC_JOIN_ABI,
      functionName: "createLobby",
      args: [
        amount,
        Number(assetExpectation),
        Number(minRank),
        authData.message,
        authData.signature,
      ],
    });
  };

  const isWorking = isPending || isConfirming || isApprovePending || isApproveConfirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create Organized Crime Lobby
          </DialogTitle>
          <DialogDescription>
            Set up a new organized crime operation. You will be the leader.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cash Amount */}
          <div className="space-y-2">
            <Label htmlFor="cashAmount">Cash Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cashAmount"
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="pl-9"
                min={1}
                max={OC_MAX_CASH}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Max: {OC_MAX_CASH.toLocaleString()} cash
            </p>
          </div>

          {/* Asset Expectation */}
          <div className="space-y-2">
            <Label htmlFor="assetExpectation">Asset Requirement</Label>
            <Select value={assetExpectation} onValueChange={setAssetExpectation}>
              <SelectTrigger>
                <SelectValue placeholder="Select requirement" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OC_ASSET_EXPECTATION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Minimum Rank */}
          <div className="space-y-2">
            <Label htmlFor="minRank">Minimum Rank</Label>
            <Select value={minRank} onValueChange={setMinRank}>
              <SelectTrigger>
                <SelectValue placeholder="Select minimum rank" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RANK_NAMES).map(([rankId, rankName]) => (
                  <SelectItem key={rankId} value={rankId}>
                    {rankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsApproval && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-200">
                  You need to approve cash spending first.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isWorking}>
            Cancel
          </Button>
          {needsApproval ? (
            <Button onClick={handleApprove} disabled={isWorking}>
              {isApprovePending || isApproveConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Cash"
              )}
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isWorking || !authData}>
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Lobby"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lobby Card ──────────────────────────────────────────────────
function LobbyCard({
  lobby,
  onClick,
}: {
  lobby: CrimeLobby;
  onClick: () => void;
}) {
  const filledSlots = lobby.members.filter((m) => m.user !== "0x0000000000000000000000000000000000000000").length;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-card/80 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-sm font-bold text-primary">#{lobby.id}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-sm font-medium text-foreground">
                  {formatAddress(lobby.leader)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Created {formatTimeAgo(lobby.createdAt)}
              </p>
            </div>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{getCityName(lobby.city)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{filledSlots}/5</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{getRankName(lobby.minRank)}+</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge className={cn("border", getStatusColor(lobby.status))}>
            {OC_LOBBY_STATUS_LABELS[lobby.status] || "Unknown"}
          </Badge>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function OrganizedCrimeAction() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { chainConfig } = useChain();
  const { authData } = useAuth();
  const { toast } = useToast();

  const [lobbies, setLobbies] = useState<CrimeLobby[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "members">("newest");

  // Check if user can create lobby
  const { data: isInLobbyRaw } = useReadContract({
    address: addresses.ocLobby,
    abi: OC_LOBBY_ABI,
    functionName: "isInLobby",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });
  const isInLobby = Boolean(isInLobbyRaw);

  const { data: nextLobbyTimeRaw } = useReadContract({
    address: addresses.ocLobby,
    abi: OC_LOBBY_ABI,
    functionName: "nextLobbyTime",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });
  const nextLobbyTime = nextLobbyTimeRaw !== undefined ? Number(nextLobbyTimeRaw) : 0;

  const { data: healthBalanceRaw } = useReadContract({
    address: addresses.health,
    abi: HEALTH_ABI,
    functionName: "balanceOf",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address && isConnected },
  });
  const healthBalance = healthBalanceRaw !== undefined
    ? Number(formatEther(healthBalanceRaw as bigint))
    : null;

  const now = Math.floor(Date.now() / 1000);
  const isOnCooldown = nextLobbyTime > now;
  const hasEnoughHealth = healthBalance !== null && healthBalance >= OC_MIN_HEALTH;
  const canCreateLobby = !isInLobby && !isOnCooldown && hasEnoughHealth;

  // Load lobbies using getLobbyCount to get the total count
  const loadLobbies = useCallback(async () => {
    if (!addresses.ocLobby) return;
    setIsLoading(true);

    try {
      const client = createPublicClient({
        transport: http(chainConfig.rpc),
      });

      // Get the total lobby count from the contract
      const lobbyCount = await client.readContract({
        address: addresses.ocLobby as `0x${string}`,
        abi: OC_LOBBY_ABI,
        functionName: "getLobbyCount",
        args: [],
      }) as bigint;

      const totalLobbies = Number(lobbyCount);
      const maxLobbiesToFetch = 50;

      // Fetch the most recent lobbies (working backwards from totalLobbies)
      // Lobby IDs are 1-indexed, so we start from totalLobbies and go down
      const promises: Promise<CrimeLobby | null>[] = [];
      for (let id = totalLobbies; id >= Math.max(1, totalLobbies - maxLobbiesToFetch + 1); id--) {
        promises.push(fetchLobby(id, addresses.ocLobby as `0x${string}`, chainConfig.rpc));
      }

      const results = await Promise.all(promises);
      const validLobbies = results.filter((l): l is CrimeLobby => l !== null);

      setLobbies(validLobbies);
    } catch (error) {
      console.error("Error loading lobbies:", error);
      toast({
        title: "Error",
        description: "Failed to load lobbies.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addresses.ocLobby, chainConfig.rpc, toast]);

  useEffect(() => {
    if (isConnected && addresses.ocLobby) {
      loadLobbies();
    }
  }, [isConnected, addresses.ocLobby, loadLobbies]);

  // Filter and sort lobbies
  const filteredLobbies = lobbies
    .filter((lobby) => {
      if (statusFilter !== "all" && lobby.status !== Number(statusFilter)) return false;
      if (cityFilter !== "all" && lobby.city !== Number(cityFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return b.createdAt - a.createdAt;
      const aMembers = a.members.filter((m) => m.user !== "0x0000000000000000000000000000000000000000").length;
      const bMembers = b.members.filter((m) => m.user !== "0x0000000000000000000000000000000000000000").length;
      return bMembers - aMembers;
    });

  const handleLobbyClick = (lobbyId: number) => {
    router.push(`/organized-crime/${lobbyId}`);
  };

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Connect Wallet</h3>
        <p className="mt-2 text-muted-foreground">
          Connect your wallet to view and join organized crime lobbies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Organized Crime Lobbies</h2>
          <p className="text-sm text-muted-foreground">
            Join or create a crew to pull off the big heist
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadLobbies}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            disabled={!canCreateLobby || !authData}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Lobby
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(OC_LOBBY_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {TRAVEL_DESTINATIONS.map((dest, index) => (
              <SelectItem key={index} value={String(index)}>
                {dest.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "members")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="members">Most Members</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lobby List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredLobbies.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Lobbies Found</h3>
          <p className="mt-2 text-muted-foreground">
            {statusFilter !== "all" || cityFilter !== "all"
              ? "Try adjusting your filters."
              : "Be the first to create a lobby!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLobbies.map((lobby) => (
            <LobbyCard
              key={lobby.id}
              lobby={lobby}
              onClick={() => handleLobbyClick(lobby.id)}
            />
          ))}
        </div>
      )}

      {/* Create Lobby Dialog */}
      <CreateLobbyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadLobbies}
      />
    </div>
  );
}

// Helper function to fetch a single lobby using viem
async function fetchLobby(
  lobbyId: number,
  contractAddress: `0x${string}`,
  rpcUrl: string
): Promise<CrimeLobby | null> {
  try {
    const client = createPublicClient({
      transport: http(rpcUrl),
    });

    const result = await client.readContract({
      address: contractAddress,
      abi: OC_LOBBY_ABI,
      functionName: "getLobby",
      args: [BigInt(lobbyId)],
    }) as {
      id: bigint;
      leader: `0x${string}`;
      members: Array<{
        user: `0x${string}`;
        itemIds: bigint[];
        impactScore: number;
        deductedScore: number;
        assetAddresses: `0x${string}`[];
        assetAmounts: bigint[];
      }>;
      isSuccess: boolean;
      city: number;
      failureType: number;
      assetExpectation: number;
      minRank: number;
      impactScore: number;
      deductedScore: number;
      status: number;
      createdAt: bigint;
      startBlock: bigint;
      isRewardClaimed: boolean;
      currentRewardIndex: number;
      rewards: Array<{ typeId: number; amount: bigint }>;
    };

    // If the lobby doesn't exist (id is 0), return null
    if (Number(result.id) === 0 && result.leader === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    return {
      id: Number(result.id),
      leader: result.leader,
      members: result.members.map((m) => ({
        user: m.user,
        itemIds: m.itemIds.map((id) => Number(id)),
        impactScore: Number(m.impactScore),
        deductedScore: Number(m.deductedScore),
        assetAddresses: m.assetAddresses,
        assetAmounts: m.assetAmounts.map((a) => Number(formatEther(a))),
      })),
      isSuccess: result.isSuccess,
      city: result.city,
      failureType: result.failureType,
      assetExpectation: result.assetExpectation,
      minRank: result.minRank,
      impactScore: Number(result.impactScore),
      deductedScore: Number(result.deductedScore),
      status: result.status,
      createdAt: Number(result.createdAt),
      startBlock: Number(result.startBlock),
      isRewardClaimed: result.isRewardClaimed,
      currentRewardIndex: result.currentRewardIndex,
      rewards: result.rewards.map((r) => ({
        typeId: r.typeId,
        amount: parseOcRewardAmount(r.typeId, r.amount),
      })),
    };
  } catch (error) {
    console.error(`Error fetching lobby ${lobbyId}:`, error);
    return null;
  }
}
