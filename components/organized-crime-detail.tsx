"use client";

import { useAuth } from "@/components/auth-provider";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { OrganizedCrimeOutcome } from "@/components/organized-crime-outcome";
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
import { Progress } from "@/components/ui/progress";
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
  BULLET_ABI,
  OC_ASSET_EXPECTATION_LABELS,
  OC_EXECUTION_ABI,
  OC_JOIN_ABI,
  OC_LOBBY_ABI,
  OC_LOBBY_STATUS,
  OC_LOBBY_STATUS_LABELS,
  OC_MAX_BULLETS,
  OC_REWARD_CONFIG,
  OC_ROLE_NAMES,
  parseOcRewardAmount,
  RANK_ABI,
  RANK_NAMES,
  MARKETPLACE_ITEM_NAMES,
  SHOP_ITEM_STATS,
  TRAVEL_DESTINATIONS,
  USER_PROFILE_CONTRACT_ABI
} from "@/lib/contract";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  Bomb,
  Car,
  CheckCircle2,
  Clock,
  Crosshair,
  Crown,
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  Play,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { formatEther, maxUint256, parseEther } from "viem";
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

interface InventoryItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId: number;
  car?: {
    id: number;
    brand: string;
    carName: string;
    image: string;
    qualityLvl: number;
    basePrice: number;
    speed: number;
    seats: number;
  };
  /** Present when categoryId is 15 (cars); from getCarItemsByCategory */
  damagePercent?: number;
}

// ── Constants ───────────────────────────────────────────────────
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// TESTING ONLY:
// Allows joining Organized Crime lobbies with the same account even if the contract/UI
// would normally block it (e.g. `wasInLobby` or `isInLobby` checks).
// Flip this back to `false` for production.
const ALLOW_OC_REJOIN_FOR_TESTING = true;

const ROLE_ICONS: Record<number, React.ReactNode> = {
  0: <Crown className="h-5 w-5" />,
  1: <Car className="h-5 w-5" />,
  2: <Crosshair className="h-5 w-5" />,
  3: <Bomb className="h-5 w-5" />,
  4: <UserCheck className="h-5 w-5" />,
};

const ROLE_COLORS: Record<number, string> = {
  0: "text-amber-500 bg-amber-500/10",
  1: "text-blue-500 bg-blue-500/10",
  2: "text-red-500 bg-red-500/10",
  3: "text-orange-500 bg-orange-500/10",
  4: "text-green-500 bg-green-500/10",
};

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
  if (address === ZERO_ADDRESS) return "Empty";
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

function getMemberSubmissionSummary(roleIndex: number, member: Member | null): string[] {
  if (!member || member.user === ZERO_ADDRESS) return [];
  const itemIds = member.itemIds || [];
  const assetParts: string[] = [];
  // `assetAmounts` meaning depends on role:
  // - roleIndex 0 (Leader): in-game cash
  // - roleIndex 2 (Weapon Expert): bullets
  // For other roles, treat as generic numeric amounts.
  if (member.assetAmounts?.length) {
    const a0 = member.assetAmounts[0];
    if (roleIndex === 0) {
      assetParts.push(`Cash submitted: $${a0.toLocaleString()}`);
    } else if (roleIndex === 2) {
      assetParts.push(`Bullets submitted: ${a0.toLocaleString()}`);
    } else {
      assetParts.push(`Assets: ${member.assetAmounts.map((a) => a.toLocaleString()).join(", ")}`);
    }
  }

  switch (roleIndex) {
    case 0:
      return [...assetParts];
    case 1: {
      const carId = itemIds[0];
      return [
        ...(carId ? [`Car: #${carId}`] : []),
        ...assetParts,
      ];
    }
    case 2: {
      const weaponId = itemIds[0];
      return [
        ...(weaponId ? [`Weapon: #${weaponId}`] : []),
        ...assetParts,
      ];
    }
    case 3: {
      // Expected: grenadeIds + molotovIds + armorId (order depends on on-chain packing)
      const armorId = itemIds[itemIds.length - 1];
      const explosives = itemIds.slice(0, Math.max(0, itemIds.length - 1));
      return [
        ...(armorId ? [`Armor: #${armorId}`] : []),
        ...(explosives.length ? [`Explosives: ${explosives.map((id) => `#${id}`).join(", ")}`] : []),
        ...assetParts,
      ];
    }
    case 4: {
      const bodyguardId = itemIds[0];
      return [
        ...(bodyguardId ? [`Bodyguard: #${bodyguardId}`] : []),
        ...assetParts,
      ];
    }
    default:
      return [...assetParts, ...(itemIds.length ? [`Items: ${itemIds.join(", ")}`] : [])];
  }
}

function getInventoryItemDisplayLabel(item: InventoryItem): string {
  // Cars (category 15)
  if (item.categoryId === 15) {
    const name = item.car ? `${item.car.brand} ${item.car.carName}` : `Type ${item.typeId}`;
    const seats = item.car?.seats ? ` • ${item.car.seats} seats` : "";
    const dmg = typeof item.damagePercent === "number" ? ` • ${item.damagePercent}% dmg` : "";
    return `${name}${seats}${dmg} (#${item.itemId})`;
  }

  // Shop items (category 3): weapons, armor, explosives
  if (item.categoryId === 3) {
    const stat = SHOP_ITEM_STATS[item.typeId];
    return stat ? `${stat.name} (#${item.itemId})` : `Shop item type ${item.typeId} (#${item.itemId})`;
  }

  // Bodyguards: use marketplace names map if available (category 48-51,5, etc)
  const marketplaceName = (MARKETPLACE_ITEM_NAMES as any)?.[item.categoryId]?.[item.typeId] as
    | string
    | undefined;
  if (marketplaceName) return `${marketplaceName} (#${item.itemId})`;

  return `Item #${item.itemId} (Cat ${item.categoryId}, Type ${item.typeId})`;
}

// ── Inventory Script Loader ─────────────────────────────────────
function useInventoryScript() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).MafiaInventory) {
      setReady(true);
      return;
    }

    const existing = document.querySelector('script[src="/js/mafia-utils.js"]');
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setError("Failed to load inventory script");
    document.head.appendChild(script);
  }, []);

  return { ready, error };
}

// ── Join Role Dialog ─────────────���──────────────────────────────
function JoinRoleDialog({
  open,
  onOpenChange,
  lobbyId,
  roleIndex,
  lobbyCity,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lobbyId: number;
  roleIndex: number;
  lobbyCity: number;
  onSuccess: () => void;
}) {
  const { address } = useAccount();
  const addresses = useChainAddresses();
  const { chainConfig } = useChain();
  const explorer = useChainExplorer();
  const { authData } = useAuth();
  const { toast } = useToast();
  const { ready: inventoryReady } = useInventoryScript();

  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [bulletAmount, setBulletAmount] = useState("1000");
  const [selectedGrenades, setSelectedGrenades] = useState<number[]>([]);
  const [selectedMolotovs, setSelectedMolotovs] = useState<number[]>([]);
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

  // Check bullet allowance for weapon expert
  const { data: bulletAllowanceRaw, refetch: refetchBulletAllowance } = useReadContract({
    address: addresses.bullets,
    abi: BULLET_ABI,
    functionName: "allowances",
    args: address && addresses.ocJoin ? [address, addresses.ocJoin] : undefined,
    query: { enabled: !!address && !!addresses.ocJoin && roleIndex === 2 },
  });

  console.log("bulletAllowanceRaw", bulletAllowanceRaw);

  useEffect(() => {
    if (roleIndex === 2 && bulletAllowanceRaw !== undefined) {
      const allowance = Number(formatEther(bulletAllowanceRaw as bigint));
      const amount = Number(bulletAmount) || 0;
      setNeedsApproval(allowance < amount);
    }
  }, [bulletAllowanceRaw, bulletAmount, roleIndex]);

  // Load items when dialog opens
  useEffect(() => {
    if (open && inventoryReady && address) {
      loadItemsForRole();
    }
  }, [open, inventoryReady, address, roleIndex]);

  const loadItemsForRole = async () => {
    if (!address || !inventoryReady) return;
    setIsLoadingItems(true);

    try {
      const MafiaInventory = (window as unknown as Record<string, unknown>).MafiaInventory as {
        getItemsByCategory: (opts: {
          chain: string;
          contractAddress: string;
          categoryId: number;
          maxItems: number;
          onProgress?: (info: { fetched: number; batchIndex: number }) => void;
        }) => Promise<InventoryItem[]>;
      };

      let categoryIds: number[] = [];
      let filterTypeIds: number[] | null = null;

      switch (roleIndex) {
        case 1: // Driver - cars
          categoryIds = [15];
          break;
        case 2: // Weapon Expert - weapons
          categoryIds = [3];
          filterTypeIds = [0, 1, 2]; // Colt, Remington, Thompson
          break;
        case 3: // Explosive Expert - armor, grenades, molotovs
          categoryIds = [3];
          filterTypeIds = [3, 4, 6, 7, 8]; // Molotov, Grenade, Vests, Armor
          break;
        case 4: // Team Expert - bodyguards
          categoryIds = [48, 49, 50, 51, 5];
          break;
      }

      const allItems: InventoryItem[] = [];
      for (const categoryId of categoryIds) {
        const categoryItems = await MafiaInventory.getItemsByCategory({
          chain: chainConfig.id === "bnb" ? "bnb" : "pls",
          contractAddress: addresses.inventory,
          categoryId,
          maxItems: 100000,
        });
        allItems.push(...categoryItems);
      }

      // Filter by owner
      let filteredItems = allItems.filter(
        (item) => item.owner.toLowerCase() === address.toLowerCase()
      );


      console.log(filteredItems);
      // Filter by city for cars
      if (roleIndex === 1) {
        filteredItems = filteredItems
          .filter((item) => item.cityId === lobbyCity)
          // If car metadata is present, enforce the "5+ seats" requirement.
          .filter((item) => (item.car?.seats ? item.car.seats >= 5 : true));
      }

      // Filter by type IDs if specified
      if (filterTypeIds) {
        filteredItems = filteredItems.filter((item) => filterTypeIds!.includes(item.typeId));
      }

      setItems(filteredItems);
    } catch (error) {
      console.error("Error loading items:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory items",
        variant: "destructive",
      });
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess) {
      toast({ title: "Approval Successful" });
      refetchBulletAllowance();
      resetApprove();
    }
  }, [isApproveSuccess, toast, refetchBulletAllowance, resetApprove]);

  // Handle join success
  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Joined Lobby",
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
      address: addresses.bullets,
      abi: BULLET_ABI,
      functionName: "approve",
      args: [addresses.ocJoin, maxUint256],
    });
  };

  const handleJoin = () => {
    if (!authData || !address) return;

    switch (roleIndex) {
      case 1: // Driver
        if (!selectedItemId) return;
        writeContract({
          address: addresses.ocJoin,
          abi: OC_JOIN_ABI,
          functionName: "joinAsDriver",
          args: [
            BigInt(lobbyId),
            BigInt(selectedItemId),
            authData.message,
            authData.signature,
          ],
        });
        break;

      case 2: // Weapon Expert
        if (!selectedItemId) return;
        writeContract({
          address: addresses.ocJoin,
          abi: OC_JOIN_ABI,
          functionName: "joinAsWeaponExpert",
          args: [
            BigInt(lobbyId),
            BigInt(selectedItemId),
            parseEther(bulletAmount),
            authData.message,
            authData.signature,
          ],
        });
        break;

      case 3: // Explosive Expert
        if (!selectedItemId) return;
        writeContract({
          address: addresses.ocJoin,
          abi: OC_JOIN_ABI,
          functionName: "joinAsExplosiveExpert",
          args: [
            BigInt(lobbyId),
            selectedGrenades.map(BigInt),
            selectedMolotovs.map(BigInt),
            BigInt(selectedItemId),
            authData.message,
            authData.signature,
          ],
        });
        break;

      case 4: // Team Expert
        if (!selectedItemId) return;
        writeContract({
          address: addresses.ocJoin,
          abi: OC_JOIN_ABI,
          functionName: "joinAsTeamExpert",
          args: [
            BigInt(lobbyId),
            BigInt(selectedItemId),
            authData.message,
            authData.signature,
          ],
        });
        break;
    }
  };

  const isWorking = isPending || isConfirming || isApprovePending || isApproveConfirming;

  const getItemLabel = (item: InventoryItem): string => {
    if (roleIndex === 1) {
      const carName = item.car ? `${item.car.brand} ${item.car.carName}` : `Type ${item.typeId}`;
      const seats = item.car?.seats ? ` • ${item.car.seats} seats` : "";
      const dmg = typeof item.damagePercent === "number" ? ` • ${item.damagePercent}% dmg` : "";
      return `Car #${item.itemId} (${carName}${seats}${dmg})`;
    }
    if (roleIndex === 2 || roleIndex === 3) {
      const stat = SHOP_ITEM_STATS[item.typeId];
      return stat ? `${stat.name} #${item.itemId}` : `Item #${item.itemId}`;
    }
    if (roleIndex === 4) {
      const bgNames: Record<number, string> = {
        48: "Johnny",
        49: "Jim",
        50: "Sam",
        51: "Frank",
        5: "Classic",
      };
      return `${bgNames[item.categoryId] || "Bodyguard"} Lvl ${item.typeId + 1} #${item.itemId}`;
    }
    return `Item #${item.itemId}`;
  };

  // Filter items for explosives
  const armorItems = items.filter((i) => [6, 7, 8].includes(i.typeId));
  const grenadeItems = items.filter((i) => i.typeId === 4 && !selectedGrenades.includes(i.itemId));
  const molotovItems = items.filter((i) => i.typeId === 3 && !selectedMolotovs.includes(i.itemId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", ROLE_COLORS[roleIndex])}>
              {ROLE_ICONS[roleIndex]}
            </div>
            Join as {OC_ROLE_NAMES[roleIndex]}
          </DialogTitle>
          <DialogDescription>
            Select your equipment to join the organized crime operation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoadingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Role-specific UI */}
              {roleIndex === 1 && (
                <div className="space-y-2">
                  <Label>Select Car (5+ seats, in {getCityName(lobbyCity)})</Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a car" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.length === 0 ? (
                        <SelectItem value="" disabled>
                          No cars available
                        </SelectItem>
                      ) : (
                        items.map((item) => (
                          <SelectItem key={item.itemId} value={String(item.itemId)}>
                            {getItemLabel(item)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {roleIndex === 2 && (
                <>
                  <div className="space-y-2">
                    <Label>Select Weapon</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a weapon" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.length === 0 ? (
                          <SelectItem value="" disabled>
                            No weapons available
                          </SelectItem>
                        ) : (
                          items.map((item) => (
                            <SelectItem key={item.itemId} value={String(item.itemId)}>
                              {getItemLabel(item)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bullet Amount</Label>
                    <Input
                      type="number"
                      value={bulletAmount}
                      onChange={(e) => setBulletAmount(e.target.value)}
                      min={1}
                      max={OC_MAX_BULLETS}
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: {OC_MAX_BULLETS.toLocaleString()} bullets
                    </p>
                  </div>
                </>
              )}

              {roleIndex === 3 && (
                <>
                  <div className="space-y-2">
                    <Label>Select Armor (Required)</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose armor" />
                      </SelectTrigger>
                      <SelectContent>
                        {armorItems.length === 0 ? (
                          <SelectItem value="" disabled>
                            No armor available
                          </SelectItem>
                        ) : (
                          armorItems.map((item) => (
                            <SelectItem key={item.itemId} value={String(item.itemId)}>
                              {getItemLabel(item)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grenades (Max 3, Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedGrenades.map((id) => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          Grenade #{id}
                          <button
                            onClick={() => setSelectedGrenades((prev) => prev.filter((g) => g !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {selectedGrenades.length < 3 && grenadeItems.length > 0 && (
                      <Select
                        value=""
                        onValueChange={(v) => setSelectedGrenades((prev) => [...prev, Number(v)])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Add grenade" />
                        </SelectTrigger>
                        <SelectContent>
                          {grenadeItems.map((item) => (
                            <SelectItem key={item.itemId} value={String(item.itemId)}>
                              Grenade #{item.itemId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Molotovs (Max 3, Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedMolotovs.map((id) => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          Molotov #{id}
                          <button
                            onClick={() => setSelectedMolotovs((prev) => prev.filter((m) => m !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {selectedMolotovs.length < 3 && molotovItems.length > 0 && (
                      <Select
                        value=""
                        onValueChange={(v) => setSelectedMolotovs((prev) => [...prev, Number(v)])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Add molotov" />
                        </SelectTrigger>
                        <SelectContent>
                          {molotovItems.map((item) => (
                            <SelectItem key={item.itemId} value={String(item.itemId)}>
                              Molotov #{item.itemId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </>
              )}

              {roleIndex === 4 && (
                <div className="space-y-2">
                  <Label>Select Bodyguard</Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a bodyguard" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.length === 0 ? (
                        <SelectItem value="" disabled>
                          No bodyguards available
                        </SelectItem>
                      ) : (
                        items.map((item) => (
                          <SelectItem key={item.itemId} value={String(item.itemId)}>
                            {getItemLabel(item)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsApproval && roleIndex === 2 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <p className="text-sm text-amber-200">
                      You need to approve bullet spending first.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isWorking}>
            Cancel
          </Button>
          {needsApproval && roleIndex === 2 ? (
            <Button onClick={handleApprove} disabled={isWorking}>
              {isApprovePending || isApproveConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Bullets"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleJoin}
              disabled={isWorking || !authData || !selectedItemId || isLoadingItems}
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Lobby"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Member Slot Card ────────────────────────────────────────────
function MemberSlotCard({
  roleIndex,
  member,
  isLeader,
  canJoin,
  canKick,
  canLeave,
  onJoin,
  onKick,
  onLeave,
  isCurrentUser,
}: {
  roleIndex: number;
  member: Member | null;
  isLeader: boolean;
  canJoin: boolean;
  canKick: boolean;
  canLeave: boolean;
  onJoin: () => void;
  onKick: () => void;
  onLeave: () => void;
  isCurrentUser: boolean;
}) {
  const isEmpty = !member || member.user === ZERO_ADDRESS;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        isEmpty
          ? "border-dashed border-border bg-card/50"
          : "border-border bg-card",
        isCurrentUser && !isEmpty && "ring-2 ring-primary/50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              ROLE_COLORS[roleIndex]
            )}
          >
            {ROLE_ICONS[roleIndex]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {OC_ROLE_NAMES[roleIndex]}
              </span>
              {isLeader && roleIndex === 0 && (
                <Crown className="h-4 w-4 text-amber-500" />
              )}
            </div>
            {isEmpty ? (
              <p className="text-sm text-muted-foreground">Empty slot</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {formatAddress(member.user)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEmpty && canJoin && roleIndex > 0 && (
            <Button size="sm" onClick={onJoin}>
              Join
            </Button>
          )}
          {!isEmpty && canKick && !isCurrentUser && roleIndex > 0 && (
            <Button size="sm" variant="destructive" onClick={onKick}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {!isEmpty && canLeave && isCurrentUser && roleIndex > 0 && (
            <Button size="sm" variant="outline" onClick={onLeave}>
              <LogOut className="h-4 w-4 mr-1" />
              Leave
            </Button>
          )}
        </div>
      </div>

      {!isEmpty && member.impactScore > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Impact Score</span>
            <span className="font-medium text-primary">{member.impactScore}</span>
          </div>
          {member.itemIds.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              Items: {member.itemIds.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function OrganizedCrimeDetail({ lobbyId }: { lobbyId: number }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { chainConfig } = useChain();
  const explorer = useChainExplorer();
  const { authData } = useAuth();
  const { toast } = useToast();
  const { ready: inventoryReady } = useInventoryScript();

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<number>(1);
  const [submissionItemMap, setSubmissionItemMap] = useState<Map<number, InventoryItem>>(new Map());
  const [submissionDetailsLoading, setSubmissionDetailsLoading] = useState(false);

  // Fetch lobby data
  const {
    data: lobbyDataRaw,
    isLoading,
    refetch: refetchLobby,
  } = useReadContract({
    address: addresses.ocLobby,
    abi: OC_LOBBY_ABI,
    functionName: "getLobby",
    args: [BigInt(lobbyId)],
    query: { enabled: isConnected && lobbyId >= 0 },
  });

  const lobby: CrimeLobby | null = lobbyDataRaw ? parseCrimeLobby(lobbyDataRaw) : null;

  // Load submitted items (cars/weapons/armor/explosives/bodyguards) for filled roles.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!lobby) {
        setSubmissionItemMap(new Map());
        setSubmissionDetailsLoading(false);
        return;
      }

      const neededItemIds = new Set<number>();
      for (const m of lobby.members || []) {
        for (const id of m?.itemIds || []) neededItemIds.add(Number(id));
      }
      if (neededItemIds.size === 0) {
        setSubmissionItemMap(new Map());
        setSubmissionDetailsLoading(false);
        return;
      }

      if (!addresses.inventory) {
        setSubmissionItemMap(new Map());
        setSubmissionDetailsLoading(false);
        return;
      }

      if (!inventoryReady) {
        setSubmissionDetailsLoading(true);
        return;
      }

      setSubmissionDetailsLoading(true);
      try {
        const MafiaInventory = (window as unknown as Record<string, unknown>).MafiaInventory as {
          getItemsByCategory: (opts: {
            chain: string;
            contractAddress: string;
            categoryId: number;
            maxItems: number;
            onProgress?: (info: { fetched: number; batchIndex: number }) => void;
          }) => Promise<InventoryItem[]>;
        };

        const neededCategories = new Set<number>();
        lobby.members.forEach((m, idx) => {
          if (!m || m.user === ZERO_ADDRESS) return;
          if (idx === 1) neededCategories.add(15);
          if (idx === 2 || idx === 3) neededCategories.add(3);
          if (idx === 4) {
            [48, 49, 50, 51, 5].forEach((c) => neededCategories.add(c));
          }
        });

        const all: InventoryItem[] = [];
        for (const categoryId of neededCategories) {
          const items = await MafiaInventory.getItemsByCategory({
            chain: chainConfig.id === "bnb" ? "bnb" : "pls",
            contractAddress: addresses.inventory,
            categoryId,
            maxItems: 20000,
          });
          all.push(...items);
        }

        if (cancelled) return;

        const map = new Map<number, InventoryItem>();
        for (const it of all) {
          const id = Number(it.itemId);
          if (neededItemIds.has(id)) map.set(id, it);
        }
        setSubmissionItemMap(map);
      } catch (e) {
        console.error("Failed to load submission items", e);
        if (!cancelled) setSubmissionItemMap(new Map());
      } finally {
        if (!cancelled) setSubmissionDetailsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [lobby?.id, lobby?.status, inventoryReady, addresses.inventory, chainConfig.id]);

  // Check if user was previously in this lobby
  const { data: wasInLobbyRaw } = useReadContract({
    address: addresses.ocLobby,
    abi: OC_LOBBY_ABI,
    functionName: "wasInLobby",
    args: address ? [address, BigInt(lobbyId)] : undefined,
    query: { enabled: !!address && isConnected },
  });
  const wasInLobby = Boolean(wasInLobbyRaw);

  // Check if user is in any lobby
  const { data: isInLobbyRaw } = useReadContract({
    address: addresses.ocLobby,
    abi: OC_LOBBY_ABI,
    functionName: "isInLobby",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });
  const isInLobby = Boolean(isInLobbyRaw);

  // Get user's city
  const { data: profileData } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address && isConnected },
  });
  const userCity = (profileData as { cityId: number } | undefined)?.cityId;

  // Get user's rank
  const { data: userRankRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankLevel",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });
  const userRank = userRankRaw !== undefined ? Number(userRankRaw) : 0;

  // Check nonce status for finishing
  const { data: nonceStatusRaw, refetch: refetchNonceStatus } = useReadContract({
    address: addresses.ocExecution,
    abi: OC_EXECUTION_ABI,
    functionName: "getLobbyNonceStatus",
    args: [BigInt(lobbyId)],
    query: { enabled: lobby?.status === OC_LOBBY_STATUS.STARTED },
  });
  const canFinish = Boolean(nonceStatusRaw);

  // Action hooks
  const { writeContract, data: actionHash, isPending, reset: resetAction } = useChainWriteContract();
  const { isLoading: isActionConfirming, isSuccess: isActionSuccess } = useWaitForTransactionReceipt({
    hash: actionHash,
  });

  // Handle action success
  useEffect(() => {
    if (isActionSuccess) {
      toast({
        title: "Action Successful",
        description: (
          <a
            href={`${explorer}/tx/${actionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline"
          >
            View transaction <ExternalLink className="h-3 w-3" />
          </a>
        ),
      });
      resetAction();
      refetchLobby();
    }
  }, [isActionSuccess, actionHash, explorer, toast, resetAction, refetchLobby]);

  // Poll nonce status when lobby is started
  useEffect(() => {
    if (lobby?.status === OC_LOBBY_STATUS.STARTED && !canFinish) {
      const interval = setInterval(() => {
        refetchNonceStatus();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [lobby?.status, canFinish, refetchNonceStatus]);

  // Computed values
  const isLeader = Boolean(
    lobby &&
    address &&
    lobby.leader.toLowerCase() === address.toLowerCase()
  );
  const isWaiting = lobby?.status === OC_LOBBY_STATUS.WAITING;
  const isStarted = lobby?.status === OC_LOBBY_STATUS.STARTED;
  const isFinished = lobby?.status === OC_LOBBY_STATUS.FINISHED;
  const isCancelled = lobby?.status === OC_LOBBY_STATUS.CANCELLED;

  const currentUserMemberIndex = lobby?.members.findIndex(
    (m) => m.user.toLowerCase() === address?.toLowerCase()
  ) ?? -1;
  const isCurrentUserInLobby = currentUserMemberIndex >= 0;

  const canJoinLobby =
    isWaiting &&
    (ALLOW_OC_REJOIN_FOR_TESTING ? true : !isInLobby) &&
    (ALLOW_OC_REJOIN_FOR_TESTING ? true : !wasInLobby) &&
    userCity === lobby?.city &&
    userRank >= (lobby?.minRank ?? 0);

  const filledSlots = lobby?.members.filter((m) => m.user !== ZERO_ADDRESS).length ?? 0;
  const allSlotsFilled = filledSlots === 5;

  // Actions
  const handleStartLobby = () => {
    if (!lobby) return;
    writeContract({
      address: addresses.ocExecution,
      abi: OC_EXECUTION_ABI,
      functionName: "startLobby",
      args: [BigInt(lobbyId)],
    });
  };

  const handleFinishLobby = () => {
    writeContract({
      address: addresses.ocExecution,
      abi: OC_EXECUTION_ABI,
      functionName: "finishLobby",
      args: [BigInt(lobbyId)],
    });
  };

  const handleCancelLobby = () => {
    writeContract({
      address: addresses.ocJoin,
      abi: OC_JOIN_ABI,
      functionName: "cancelLobby",
      args: [BigInt(lobbyId)],
    });
  };

  const handleLeaveLobby = () => {
    writeContract({
      address: addresses.ocJoin,
      abi: OC_JOIN_ABI,
      functionName: "leaveLobby",
      args: [BigInt(lobbyId)],
    });
  };

  const handleKickMember = (memberIndex: number) => {
    writeContract({
      address: addresses.ocJoin,
      abi: OC_JOIN_ABI,
      functionName: "kickMember",
      args: [BigInt(lobbyId), memberIndex],
    });
  };

  const openJoinDialog = (roleIndex: number) => {
    setSelectedRole(roleIndex);
    setJoinDialogOpen(true);
  };

  const isActionPending = isPending || isActionConfirming;

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Connect Wallet</h3>
        <p className="mt-2 text-muted-foreground">
          Connect your wallet to view lobby details.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">Lobby Not Found</h3>
        <p className="mt-2 text-muted-foreground">
          This lobby does not exist or has been removed.
        </p>
        <Button asChild className="mt-4">
          <Link href="/organized-crime">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lobbies
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/organized-crime">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Lobby #{lobby.id}</h1>
              <Badge className={cn("border", getStatusColor(lobby.status))}>
                {OC_LOBBY_STATUS_LABELS[lobby.status] || "Unknown"}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {getCityName(lobby.city)}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                {getRankName(lobby.minRank)}+
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTimeAgo(lobby.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetchLobby()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Leader actions */}
          {isLeader && isWaiting && allSlotsFilled && (
            <Button onClick={handleStartLobby} disabled={isActionPending}>
              {isActionPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start Operation
            </Button>
          )}

          {isLeader && isStarted && canFinish && (
            <Button onClick={handleFinishLobby} disabled={isActionPending}>
              {isActionPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Finish Operation
            </Button>
          )}

          {isLeader && isStarted && !canFinish && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Waiting for blocks...
            </Button>
          )}

          {isLeader && isWaiting && (
            <Button variant="destructive" onClick={handleCancelLobby} disabled={isActionPending}>
              {isActionPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Validation warnings */}
      {!canJoinLobby && isWaiting && !isCurrentUserInLobby && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="space-y-1">
              {isInLobby && (
                <p className="text-sm text-amber-200">
                  You are already in another lobby.
                </p>
              )}
              {wasInLobby && (
                <p className="text-sm text-amber-200">
                  You were previously in this lobby and cannot rejoin.
                </p>
              )}
              {userCity !== undefined && userCity !== lobby.city && (
                <p className="text-sm text-amber-200">
                  You need to be in {getCityName(lobby.city)} to join this lobby.
                </p>
              )}
              {userRank < lobby.minRank && (
                <p className="text-sm text-amber-200">
                  You need to be at least {getRankName(lobby.minRank)} to join this lobby.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Team Progress</span>
          <span className="text-sm font-medium text-foreground">{filledSlots}/5 members</span>
        </div>
        <Progress value={(filledSlots / 5) * 100} className="h-2" />
      </div>

      {/* Possible reward ranges (matches on-chain Reward typeId roll bounds) */}
      {!isFinished && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-medium text-foreground mb-1">Possible reward amounts</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Each success reward entry uses a type id and an amount within these min–max bounds.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Reward type</th>
                  <th className="py-2 pr-4 font-medium">Min</th>
                  <th className="py-2 font-medium">Max</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const
                ).map((typeId) => {
                  const row = OC_REWARD_CONFIG[typeId];
                  if (!row) return null;
                  const isCash = typeId === 0;
                  const fmt = (n: number) =>
                    isCash ? `$${n.toLocaleString()}` : n.toLocaleString();
                  return (
                    <tr key={typeId} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 text-foreground">{row.name}</td>
                      <td className="py-2 pr-4 tabular-nums">{fmt(row.min)}</td>
                      <td className="py-2 tabular-nums">{fmt(row.max)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member slots */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4].map((roleIndex) => {
          const member = lobby.members[roleIndex] || null;
          const isMemberCurrentUser = member && member.user.toLowerCase() === address?.toLowerCase();

          return (
            <MemberSlotCard
              key={roleIndex}
              roleIndex={roleIndex}
              member={member}
              isLeader={isLeader}
              canJoin={canJoinLobby}
              canKick={isLeader && isWaiting}
              canLeave={isWaiting && isCurrentUserInLobby}
              onJoin={() => openJoinDialog(roleIndex)}
              onKick={() => handleKickMember(roleIndex)}
              onLeave={handleLeaveLobby}
              isCurrentUser={isMemberCurrentUser ?? false}
            />
          );
        })}
      </div>

      {/* Member submissions */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-medium text-foreground">Member Submissions</h3>
          {submissionDetailsLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Loading item details…</span>
            </div>
          )}
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((roleIndex) => {
            const member = lobby.members[roleIndex] || null;
            const baseLines = getMemberSubmissionSummary(roleIndex, member);
            const submittedItemLines =
              member && member.user !== ZERO_ADDRESS && member.itemIds?.length
                ? member.itemIds.map((id) => {
                  const item = submissionItemMap.get(Number(id));
                  return item ? getInventoryItemDisplayLabel(item) : `Item #${id}`;
                })
                : [];

            const assetLines = baseLines.filter((l) =>
              l.includes("submitted:") || l.startsWith("Assets:")
            );
            // Prefer detailed submitted item labels if we have them, but keep any submitted-asset lines.
            const lines = submittedItemLines.length ? [...assetLines, ...submittedItemLines] : baseLines;
            const showRowLoading =
              submissionDetailsLoading &&
              member &&
              member.user !== ZERO_ADDRESS &&
              (member.itemIds?.length ?? 0) > 0 &&
              roleIndex >= 1;

            return (
              <div key={roleIndex} className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground">{OC_ROLE_NAMES[roleIndex]}</div>
                  <div className="text-xs text-muted-foreground">
                    {member && member.user !== ZERO_ADDRESS ? formatAddress(member.user) : "Empty"}
                  </div>
                </div>
                {showRowLoading ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    <span>Resolving submitted items…</span>
                  </div>
                ) : lines.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {lines.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">No submission</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Outcome Display (when finished) */}
      {isFinished && (
        <OrganizedCrimeOutcome lobby={lobby} onRefresh={() => refetchLobby()} />
      )}

      {/* Lobby Info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-medium text-foreground mb-3">Lobby Details</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Asset Requirement</p>
            <p className="font-medium text-foreground">
              {OC_ASSET_EXPECTATION_LABELS[lobby.assetExpectation]}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Impact Score</p>
            <p className="font-medium text-foreground">{lobby.impactScore}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Leader</p>
            <p className="font-medium text-foreground">{formatAddress(lobby.leader)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium text-foreground">{formatTimeAgo(lobby.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Join Dialog */}
      <JoinRoleDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        lobbyId={lobbyId}
        roleIndex={selectedRole}
        lobbyCity={lobby.city}
        onSuccess={() => refetchLobby()}
      />
    </div>
  );
}
