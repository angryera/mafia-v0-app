"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { COOLDOWN_READ_QUERY } from "@/hooks/use-cooldown-remaining";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import { formatDuration, getErrorMessage } from "@/lib/format";
import {
  EQUIPMENT_ABI,
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_LABELS,
  SHOP_ITEM_STATS,
  BUILDING_STATS,
  RARITY_AMPLIFIERS,
  RARITY_NAMES,
  BODYGUARD_CATEGORIES,
  resolveBodyguard,
  City,
  ItemCategory,
  MAX_EQUIPMENT_MAFIA_STAKE,
  ERC20_ABI,
  MAFIA_MAP_ABI,
} from "@/lib/contract";
import {
  CITY_DEVELOPER_BOOST_PERCENT,
  cityDeveloperBadgeTooltip,
  cityDeveloperCrownTooltip,
  cityDeveloperItemBoost,
  cityDeveloperPowerTooltip,
  developerAddressFromResult,
  formatCityDeveloperItemBoost,
  formatGroupedPower,
  formatLoadoutEstimate,
  isCityDeveloperAddress,
  loadoutEstimateTooltip,
  projectLoadoutPower,
  readDevelopedCityIds,
  splitCityDeveloperPower,
  type CityDeveloperPower,
} from "@/lib/city-developer";
import { parseEther, formatEther, maxUint256, type Abi } from "viem";
import {
  Shield,
  Swords,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  X,
  Coins,
  MapPin,
  Building,
  User,
  Package,
  Check,
  Plus,
  Minus,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const EQUIPMENT_SCREEN_CITY_IDS = Object.keys(City)
  .map(Number)
  .sort((a, b) => a - b);

// ── Types ───────────────────────────────────────────────────────
interface InventoryItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId: number;
}

interface SlotInfo {
  cityId: number;
  x: number;
  y: number;
  slotType: number;
  slotSubType: number;
  variant: number;
  rarity: number;
  isOwned: boolean;
  isOperating: boolean;
  originalDefensePower: number;
  defensePower: number;
  boostPercentage: number;
  nextUpgradeAvailableAt: number;
  lastOperatingTimestamp: number;
  inventoryItemId: number;
  familyId: number;
  stakingAmount: number;
  yieldPayout: number;
  owner: string;
}

interface EquipmentInfoData {
  itemIds: number[];
  mafiaAmount: number;
  equippedAt: number;
}

// 3 hours in seconds
const EQUIP_COOLDOWN_SECONDS = 3 * 60 * 60;

// ── Helpers ─────────────────────────────────────────────────────
function getBodyguardStats(categoryId: number, typeId: number) {
  const resolved = resolveBodyguard(categoryId, typeId);
  if (!resolved) {
    return { offense: 0, defense: 0, name: "Bodyguard", level: typeId + 1 };
  }
  return {
    offense: resolved.offense,
    defense: resolved.defense,
    name: resolved.name,
    level: resolved.level,
  };
}

function getBuildingStats(slotSubType: number, rarity: number) {
  const base = BUILDING_STATS[slotSubType] || { offense: 0, defense: 0 };
  const amp = RARITY_AMPLIFIERS[rarity] || 1;
  return {
    offense: Math.floor(base.offense * amp),
    defense: Math.floor(base.defense * amp),
  };
}

function getSlotAcceptableItems(slotIndex: number): string {
  switch (slotIndex) {
    case EQUIPMENT_SLOTS.WEAPON:
      return "Colt, Remington, Thompson";
    case EQUIPMENT_SLOTS.AMMUNITION_1:
    case EQUIPMENT_SLOTS.AMMUNITION_2:
    case EQUIPMENT_SLOTS.AMMUNITION_3:
      return "Molotov, Grenade";
    case EQUIPMENT_SLOTS.ARMOR:
      return "Vest, Suit";
    case EQUIPMENT_SLOTS.TRANSPORT:
      return "Armored Car, Douglas M-3, Motorcycle";
    case EQUIPMENT_SLOTS.BUILDING_1:
    case EQUIPMENT_SLOTS.BUILDING_2:
      return "Operating Building";
    case EQUIPMENT_SLOTS.BODYGUARD_1:
    case EQUIPMENT_SLOTS.BODYGUARD_2:
      return "Any Bodyguard";
    default:
      return "";
  }
}

function canItemFitSlot(
  slotIndex: number,
  item: InventoryItem | SlotInfo
): boolean {
  // Check if it's a slot (building)
  if ("slotType" in item) {
    // Buildings can only go in building slots (now indices 6 and 7)
    if (
      slotIndex !== EQUIPMENT_SLOTS.BUILDING_1 &&
      slotIndex !== EQUIPMENT_SLOTS.BUILDING_2
    ) {
      return false;
    }
    // Must be operating and slotType 1 with subType > 0 (Shed or higher)
    return item.slotType === 1 && item.slotSubType > 0 && item.isOperating;
  }

  // Shop items
  if (item.categoryId === ItemCategory.SHOPITEM) {
    const typeId = item.typeId;
    // Weapons: 0, 1, 2
    if (slotIndex === EQUIPMENT_SLOTS.WEAPON) {
      return typeId >= 0 && typeId <= 2;
    }
    // Ammunition: 3, 4
    if (
      slotIndex === EQUIPMENT_SLOTS.AMMUNITION_1 ||
      slotIndex === EQUIPMENT_SLOTS.AMMUNITION_2 ||
      slotIndex === EQUIPMENT_SLOTS.AMMUNITION_3
    ) {
      return typeId === 3 || typeId === 4;
    }
    // Armor: 6, 7
    if (slotIndex === EQUIPMENT_SLOTS.ARMOR) {
      return typeId === 6 || typeId === 7;
    }
    // Transport: 5, 8, 9
    if (slotIndex === EQUIPMENT_SLOTS.TRANSPORT) {
      return typeId === 5 || typeId === 8 || typeId === 9;
    }
  }

  // Bodyguards (now indices 8 and 9)
  if (
    item.categoryId === ItemCategory.BODYGUARD ||
    BODYGUARD_CATEGORIES.includes(item.categoryId)
  ) {
    return (
      slotIndex === EQUIPMENT_SLOTS.BODYGUARD_1 ||
      slotIndex === EQUIPMENT_SLOTS.BODYGUARD_2
    );
  }

  return false;
}

function normalizeEquipmentIds(
  ids: readonly (number | bigint)[] | undefined,
): number[] {
  const nums = (ids ?? []).map((id) => Number(id));
  if (nums.length >= 10) return nums.slice(0, 10);
  return [...nums, ...Array(10 - nums.length).fill(0)];
}

function resolveEquippedDisplay(
  equippedItemId: number | bigint,
  allItemsGlobal: InventoryItem[],
  allSlots: SlotInfo[],
): { name: string; offense: number; defense: number } | null {
  const equippedIdNum =
    typeof equippedItemId === "bigint" ? Number(equippedItemId) : equippedItemId;
  if (!equippedIdNum || equippedIdNum <= 0) return null;

  const slot = allSlots.find((entry) => entry.inventoryItemId === equippedIdNum);
  if (slot && "slotSubType" in slot) {
    const buildingStats = getBuildingStats(slot.slotSubType, slot.rarity);
    return {
      name: `${BUILDING_STATS[slot.slotSubType]?.name || "Building"} (${RARITY_NAMES[slot.rarity] || "Common"})`,
      offense: buildingStats.offense,
      defense: buildingStats.defense,
    };
  }

  const item = allItemsGlobal.find((entry) => entry.itemId === equippedIdNum);
  if (!item) return null;

  if (item.categoryId === ItemCategory.SHOPITEM) {
    const shopStats = SHOP_ITEM_STATS[item.typeId];
    if (shopStats) {
      return {
        name: shopStats.name,
        offense: shopStats.offense,
        defense: shopStats.defense,
      };
    }
  } else if (
    item.categoryId === ItemCategory.BODYGUARD ||
    BODYGUARD_CATEGORIES.includes(item.categoryId)
  ) {
    const bgStats = getBodyguardStats(item.categoryId, item.typeId);
    return {
      name: `${bgStats.name} Lvl ${bgStats.level}`,
      offense: bgStats.offense,
      defense: bgStats.defense,
    };
  }

  return null;
}

function sumItemCombatStats(
  itemIds: readonly number[],
  allItemsGlobal: InventoryItem[],
  allSlots: SlotInfo[],
): { offense: number; defense: number } {
  return itemIds.reduce(
    (total, itemId) => {
      const resolved = resolveEquippedDisplay(itemId, allItemsGlobal, allSlots);
      return {
        offense: total.offense + (resolved?.offense ?? 0),
        defense: total.defense + (resolved?.defense ?? 0),
      };
    },
    { offense: 0, defense: 0 },
  );
}

// ── Equipment Slot Card ─────────────────────────────────────────
function EquipmentSlotCard({
  slotIndex,
  equippedItemId,
  allItemsGlobal,
  allSlots,
  selectedItemId,
  onSelect,
  isCityDeveloper,
}: {
  slotIndex: number;
  equippedItemId: number;
  allItemsGlobal: InventoryItem[]; // ALL items (not filtered by owner) for equipped item info lookup
  allSlots: SlotInfo[];
  selectedItemId: number | null;
  onSelect: (slotIndex: number) => void;
  isCityDeveloper: boolean;
}) {
  const label = EQUIPMENT_SLOT_LABELS[slotIndex];
  const isEquipped = equippedItemId > 0;
  const display = isEquipped
    ? resolveEquippedDisplay(equippedItemId, allItemsGlobal, allSlots)
    : null;
  const stats = display ?? { offense: 0, defense: 0 };
  const itemName = display?.name ?? "Empty";
  const itemBoost =
    isCityDeveloper && isEquipped
      ? cityDeveloperItemBoost(stats.offense, stats.defense)
      : null;

  const isSelected = selectedItemId === slotIndex;

  const card = (
    <button
      onClick={() => onSelect(slotIndex)}
      className={cn(
        "flex items-center gap-4 rounded-lg border p-3 transition-all text-left w-full",
        isSelected
          ? "border-primary bg-primary/10"
          : isEquipped
            ? "border-green-500/30 bg-green-500/5 hover:border-green-500/50"
            : "border-dashed border-border bg-card/50 hover:border-primary/30"
      )}
    >
      {/* Slot index indicator */}
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
        isEquipped ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
      )}>
        {slotIndex + 1}
      </div>

      {/* Slot info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {label}
          </span>
          {isEquipped && (
            <span className="text-[10px] font-mono text-muted-foreground">
              ID #{equippedItemId}
            </span>
          )}
        </div>
        {isEquipped ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {itemName}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground/60 italic mt-0.5">
            Accepts: {getSlotAcceptableItems(slotIndex)}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-center">
          <span className="flex items-center gap-0.5 text-xs font-mono text-cyan-400">
            <Shield className="h-3.5 w-3.5" />
            {stats.defense}
          </span>
          <span className="text-[9px] text-muted-foreground">DEF</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="flex items-center gap-0.5 text-xs font-mono text-red-400">
            <Swords className="h-3.5 w-3.5" />
            {stats.offense}
          </span>
          <span className="text-[9px] text-muted-foreground">OFF</span>
        </div>
      </div>

      {/* Selection indicator */}
      <div className={cn(
        "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
      )} />
    </button>
  );

  if (!isEquipped) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent className="max-w-xs text-left">
        <p className="font-medium">{itemName}</p>
        <p className="text-xs text-muted-foreground">
          Offense {formatGroupedPower(stats.offense)} · Defense{" "}
          {formatGroupedPower(stats.defense)}
        </p>
        {itemBoost && (
          <p className="text-xs text-amber-300">
            {formatCityDeveloperItemBoost(itemBoost)}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ── City Power Card ─────────────────────────────────────────────
function CityPowerCard({
  cityId,
  defense,
  offense,
  isSelected,
  isDeveloper,
  onSelect,
}: {
  cityId: number;
  defense: number;
  offense: number;
  isSelected: boolean;
  isDeveloper: boolean;
  onSelect: () => void;
}) {
  const cityName = City[cityId] || `City #${cityId}`;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between rounded-lg border p-2.5 transition-all",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card/50 hover:border-primary/30"
      )}
    >
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{cityName}</span>
        {isDeveloper && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Crown
                  className="h-3.5 w-3.5 text-amber-400"
                  role="img"
                  aria-label="City Developer"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {cityDeveloperCrownTooltip(cityName)}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-cyan-400">
          <Shield className="h-3 w-3" />
          {defense.toLocaleString()}
        </span>
        <span className="flex items-center gap-1 text-red-400">
          <Swords className="h-3 w-3" />
          {offense.toLocaleString()}
        </span>
      </div>
    </button>
  );
}

function CombatPowerStat({
  stat,
  power,
  isCityDeveloper,
  projection,
}: {
  stat: "offense" | "defense";
  power: CityDeveloperPower;
  isCityDeveloper: boolean;
  projection: number | null;
}) {
  const label = stat === "offense" ? "Offense" : "Defense";
  const Icon = stat === "offense" ? Swords : Shield;
  const delta = projection === null ? 0 : projection - power.total;
  const figure = (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={cn(
            "font-mono text-2xl font-bold leading-none",
            isCityDeveloper ? "city-developer-shimmer" : "text-foreground",
          )}
        >
          {formatGroupedPower(power.total)}
        </span>
        {isCityDeveloper && (
          <span className="rounded-full border border-amber-400/50 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-200">
            +{CITY_DEVELOPER_BOOST_PERCENT}%
          </span>
        )}
      </div>
      {isCityDeveloper && (
        <p className="mt-1 text-xs text-muted-foreground">
          {formatGroupedPower(power.base)}{" "}
          <span className="font-medium text-amber-300">
            +{formatGroupedPower(power.bonus)}
          </span>
        </p>
      )}
    </div>
  );

  return (
    <div className="min-w-0">
      {isCityDeveloper ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help text-left">{figure}</div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {cityDeveloperPowerTooltip(stat, power)}
          </TooltipContent>
        </Tooltip>
      ) : (
        figure
      )}
      {projection !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <p
              className={cn(
                "mt-1 w-fit cursor-help font-mono text-xs",
                delta > 0
                  ? "text-green-400"
                  : delta < 0
                    ? "text-red-400"
                    : "text-muted-foreground",
              )}
            >
              {formatLoadoutEstimate(projection, power.total)}
            </p>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {loadoutEstimateTooltip(stat)}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ── Item Selection Dialog ───────────────────────────────────────
function ItemSelectionDialog({
  open,
  onOpenChange,
  slotIndex,
  allItems,
  allSlots,
  selectedCityId,
  currentEquippedIds,
  onSelectItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotIndex: number;
  allItems: InventoryItem[];
  allSlots: SlotInfo[];
  selectedCityId: number;
  currentEquippedIds: number[];
  onSelectItem: (itemId: number) => void;
}) {
  const label = EQUIPMENT_SLOT_LABELS[slotIndex];

  // Filter items that can fit this slot
  const validItems = allItems.filter((item) => {
    if (!canItemFitSlot(slotIndex, item)) return false;
    // Don't show items already equipped in other slots
    if (currentEquippedIds.includes(item.itemId)) return false;
    return true;
  });

  const validSlots = allSlots.filter((slot) => {
    if (!canItemFitSlot(slotIndex, slot)) return false;
    // Must be same city
    if (slot.cityId !== selectedCityId) return false;
    // Don't show slots already equipped
    if (currentEquippedIds.includes(slot.inventoryItemId)) return false;
    return true;
  });

  const isBuilding =
    slotIndex === EQUIPMENT_SLOTS.BUILDING_1 ||
    slotIndex === EQUIPMENT_SLOTS.BUILDING_2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select {label}</DialogTitle>
          <DialogDescription>
            Choose an item to equip in the {label} slot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {/* Clear option */}
          <button
            onClick={() => {
              onSelectItem(0);
              onOpenChange(false);
            }}
            className="flex items-center justify-between rounded-lg border border-dashed border-border p-3 transition-all hover:border-red-400/50 hover:bg-red-400/5"
          >
            <span className="text-sm text-muted-foreground">Clear slot</span>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {isBuilding ? (
            // Show buildings
            validSlots.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No operating buildings available in this city.
              </p>
            ) : (
              validSlots.map((slot) => {
                const stats = getBuildingStats(slot.slotSubType, slot.rarity);
                const name = `${BUILDING_STATS[slot.slotSubType]?.name || "Building"} (${RARITY_NAMES[slot.rarity] || "Common"})`;
                return (
                  <button
                    key={slot.inventoryItemId}
                    onClick={() => {
                      onSelectItem(slot.inventoryItemId);
                      onOpenChange(false);
                    }}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">
                          {name}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          #{slot.inventoryItemId} @ ({slot.x}, {slot.y})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-0.5 text-cyan-400">
                        <Shield className="h-3 w-3" />
                        {stats.defense}
                      </span>
                      <span className="flex items-center gap-0.5 text-red-400">
                        <Swords className="h-3 w-3" />
                        {stats.offense}
                      </span>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            // Show inventory items
            validItems.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No items available for this slot.
              </p>
            ) : (
              validItems.map((item) => {
                let stats = { offense: 0, defense: 0 };
                let name = `Item #${item.itemId}`;
                let icon = <Package className="h-4 w-4 text-primary" />;

                if (item.categoryId === ItemCategory.SHOPITEM) {
                  const shopStats = SHOP_ITEM_STATS[item.typeId];
                  if (shopStats) {
                    stats = {
                      offense: shopStats.offense,
                      defense: shopStats.defense,
                    };
                    name = shopStats.name;
                  }
                } else if (
                  item.categoryId === ItemCategory.BODYGUARD ||
                  BODYGUARD_CATEGORIES.includes(item.categoryId)
                ) {
                  const bgStats = getBodyguardStats(item.categoryId, item.typeId);
                  stats = { offense: bgStats.offense, defense: bgStats.defense };
                  name = `${bgStats.name} Lvl ${bgStats.level}`;
                  icon = <User className="h-4 w-4 text-primary" />;
                }

                return (
                  <button
                    key={item.itemId}
                    onClick={() => {
                      onSelectItem(item.itemId);
                      onOpenChange(false);
                    }}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-2">
                      {icon}
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">
                          {name}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          #{item.itemId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-0.5 text-cyan-400">
                        <Shield className="h-3 w-3" />
                        {stats.defense}
                      </span>
                      <span className="flex items-center gap-0.5 text-red-400">
                        <Swords className="h-3 w-3" />
                        {stats.offense}
                      </span>
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function EquipmentAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData } = useAuth();
  const { toast } = useToast();
  const inventoryScript = useMafiaUtilsScript("MafiaInventory");
  const scriptReady = inventoryScript === "ready";
  const scriptError =
    inventoryScript === "error" ? "Failed to load inventory script" : null;
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });

  // State
  const [selectedCityId, setSelectedCityId] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Inventory data - items owned by user (for selection)
  const [shopItems, setShopItems] = useState<InventoryItem[]>([]);
  const [bodyguards, setBodyguards] = useState<InventoryItem[]>([]);
  const [citySlots, setCitySlots] = useState<SlotInfo[]>([]); // User's slots for selection
  const [allCitySlotsGlobal, setAllCitySlotsGlobal] = useState<SlotInfo[]>([]); // ALL slots for equipped item lookup

  // ALL items (not filtered by owner) - needed to display equipped items info
  // since equipped items are transferred to the MafiaEquipment contract
  const [allShopItemsGlobal, setAllShopItemsGlobal] = useState<InventoryItem[]>([]);
  const [allBodyguardsGlobal, setAllBodyguardsGlobal] = useState<InventoryItem[]>([]);

  // Equipment state
  const [editedItemIds, setEditedItemIds] = useState<number[]>(
    Array(10).fill(0)
  );
  const [editedMafiaAmount, setEditedMafiaAmount] = useState(0);
  const [mafiaInputValue, setMafiaInputValue] = useState("0");

  // Current time for cooldown calculation (updated every second)
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000));

  // Dialog state
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(
    null
  );

  // Read MAFIA token address from equipment contract
  const { data: mafiaTokenAddr } = useReadContract({
    address: addresses.equipment,
    abi: EQUIPMENT_ABI,
    functionName: "mafia",
    query: { enabled: isConnected },
  });

  // Read current equipment info
  const { data: equipmentInfoRaw, refetch: refetchEquipment } = useReadContract(
    {
      address: addresses.equipment,
      abi: EQUIPMENT_ABI,
      functionName: "getEquipmentInfo",
      args:
        authData && address
          ? [address, selectedCityId, authData.message, authData.signature]
          : undefined,
      query: { enabled: !!authData && !!address && isConnected, ...COOLDOWN_READ_QUERY },
    }
  );

  // Read city power for all cities
  const { data: citiesPowerRaw, refetch: refetchCitiesPower } = useReadContract(
    {
      address: addresses.equipment,
      abi: EQUIPMENT_ABI,
      functionName: "getCitiesTotalPower",
      args:
        authData && address
          ? [address, authData.message, authData.signature]
          : undefined,
      query: { enabled: !!authData && !!address && isConnected },
    }
  );

  // Read MAFIA token allowance
  const { data: mafiaAllowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: mafiaTokenAddr as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && mafiaTokenAddr ? [address, addresses.equipment] : undefined,
    query: { enabled: !!address && !!mafiaTokenAddr },
  });

  // Read MAFIA token balance
  const { data: mafiaBalanceRaw, refetch: refetchBalance } = useReadContract({
    address: mafiaTokenAddr as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address && mafiaTokenAddr ? [address] : undefined,
    query: { enabled: !!address && !!mafiaTokenAddr },
  });

  // Selected-city total already includes the City Developer boost.
  const { data: totalPowerRaw, refetch: refetchTotalPower } = useReadContract({
    address: addresses.equipment,
    abi: EQUIPMENT_ABI,
    functionName: "getTotalPower",
    args:
      authData && address
        ? [address, selectedCityId, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address && isConnected },
  });

  const developedCitiesQuery = useQuery({
    queryKey: [
      "equipment-city-developers",
      chainConfig.wagmiChainId,
      addresses.map,
      address ?? "",
    ],
    enabled: !!address && !!publicClient,
    retry: false,
    queryFn: () => {
      if (!address || !publicClient) {
        return readDevelopedCityIds({
          wallet: null,
          cityIds: EQUIPMENT_SCREEN_CITY_IDS,
          multicall: async () => {
            throw new Error("City developer multicall was called without a wallet");
          },
        });
      }
      return readDevelopedCityIds({
        wallet: address,
        cityIds: EQUIPMENT_SCREEN_CITY_IDS,
        multicall: async (cityIds) => {
          const results = await publicClient.multicall({
            allowFailure: true,
            contracts: cityIds.map((cityId) => ({
              address: addresses.map,
              abi: MAFIA_MAP_ABI as Abi,
              functionName: "cityDevelopers" as const,
              args: [cityId],
            })),
          });
          return results.map((row) => ({
            status: row.status,
            result: row.status === "success" ? row.result : undefined,
          }));
        },
      });
    },
  });

  const cityDeveloperQuery = useQuery({
    queryKey: [
      "equipment-city-developer",
      chainConfig.wagmiChainId,
      addresses.map,
      address ?? "",
      selectedCityId,
    ],
    enabled: !!address && !!publicClient,
    retry: false,
    queryFn: async () => {
      if (!address || !publicClient) return false;
      const result = await publicClient.readContract({
        address: addresses.map,
        abi: MAFIA_MAP_ABI,
        functionName: "cityDevelopers",
        args: [selectedCityId],
      });
      return isCityDeveloperAddress(
        developerAddressFromResult(result),
        address,
      );
    },
  });

  const equipmentInfo = equipmentInfoRaw as EquipmentInfoData | undefined;
  const citiesPower = citiesPowerRaw as [bigint[], bigint[]] | undefined;
  const totalPower = totalPowerRaw as [bigint, bigint] | undefined;
  const developedCityIds =
    address && developedCitiesQuery.isSuccess
      ? (developedCitiesQuery.data ?? [])
      : [];
  // Pending and failed reads stay false so the previous city cannot leave the badge up.
  const isCityDeveloper =
    !!address && cityDeveloperQuery.isSuccess && cityDeveloperQuery.data === true;

  // Sync edited state when equipment info changes
  useEffect(() => {
    if (equipmentInfo) {
      setEditedItemIds(
        equipmentInfo.itemIds.length >= 10
          ? equipmentInfo.itemIds.slice(0, 10)
          : [
            ...equipmentInfo.itemIds,
            ...Array(10 - equipmentInfo.itemIds.length).fill(0),
          ]
      );
      const mafiaAmt = Number(formatEther(BigInt(equipmentInfo.mafiaAmount)));
      setEditedMafiaAmount(mafiaAmt);
      setMafiaInputValue(mafiaAmt.toString());
    }
  }, [equipmentInfo]);

  // Update current time every second for cooldown countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load inventory data
  const loadInventory = useCallback(async () => {
    if (
      !scriptReady ||
      !window.MafiaInventory ||
      !window.MafiaMap ||
      !address
    ) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      // Load shop items (categoryId 3) - ALL items, not just owner's
      // We need ALL items to display info for equipped items (which are owned by the contract)
      const shopItemsData = await window.MafiaInventory.getItemsByCategory({
        chain: chainConfig.id,
        contractAddress: addresses.inventory,
        categoryId: ItemCategory.SHOPITEM,
      });
      // Store all items globally for equipped item info lookup
      setAllShopItemsGlobal(shopItemsData);
      // Filter for user's items (for selection)
      const myShopItems = shopItemsData.filter(
        (i) => i.owner.toLowerCase() === address.toLowerCase()
      );
      setShopItems(myShopItems);

      // Load all bodyguards (categories 5, 48, 49, 50, 51)
      const bgCategories = [
        ItemCategory.BODYGUARD,
        ...BODYGUARD_CATEGORIES,
      ];
      const allBodyguardsData: InventoryItem[] = [];
      const myBodyguards: InventoryItem[] = [];
      for (const catId of bgCategories) {
        const bgData = await window.MafiaInventory.getItemsByCategory({
          chain: chainConfig.id,
          contractAddress: addresses.inventory,
          categoryId: catId,
        });
        // Store all bodyguards globally for equipped item info lookup
        allBodyguardsData.push(...bgData);
        // Filter for user's bodyguards (for selection)
        const myBgs = bgData.filter(
          (i) => i.owner.toLowerCase() === address.toLowerCase()
        );
        myBodyguards.push(...myBgs);
      }
      setAllBodyguardsGlobal(allBodyguardsData);
      setBodyguards(myBodyguards);

      // Load city slots
      const slots = await window.MafiaMap.getSlots({
        chain: chainConfig.id,
        cityId: selectedCityId,
      });
      // Store ALL slots globally (for looking up equipped item info)
      setAllCitySlotsGlobal(slots);
      // Filter for user's slots (for selection when equipping)
      const mySlots = slots.filter(
        (s) =>
          s.isOwned &&
          s.owner.toLowerCase() === address.toLowerCase() &&
          s.isOperating
      );
      setCitySlots(mySlots);
    } catch (err) {
      console.error("[v0] Error loading inventory:", err);
      setLoadError("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  }, [scriptReady, address, chainConfig.id, addresses.inventory, selectedCityId]);

  // Load inventory when ready
  useEffect(() => {
    if (scriptReady && address && isConnected) {
      loadInventory();
    }
  }, [scriptReady, address, isConnected, loadInventory]);

  // Handle slot selection
  const handleSlotSelect = (slotIndex: number) => {
    setSelectedSlotIndex(slotIndex);
  };

  // Handle item selection
  const handleItemSelect = (itemId: number) => {
    if (selectedSlotIndex === null) return;
    const newIds = [...editedItemIds];
    newIds[selectedSlotIndex] = itemId;
    setEditedItemIds(newIds);
  };

  // Handle MAFIA amount change
  const handleMafiaChange = (value: string) => {
    setMafiaInputValue(value);
    const num = parseFloat(value) || 0;
    const clamped = Math.min(Math.max(0, num), MAX_EQUIPMENT_MAFIA_STAKE);
    setEditedMafiaAmount(clamped);
  };

  const handleDiscardChanges = () => {
    if (!equipmentInfo) return;
    setEditedItemIds(
      equipmentInfo.itemIds.length >= 10
        ? equipmentInfo.itemIds.slice(0, 10)
        : [
            ...equipmentInfo.itemIds,
            ...Array(10 - equipmentInfo.itemIds.length).fill(0),
          ],
    );
    const mafiaAmt = Number(formatEther(BigInt(equipmentInfo.mafiaAmount)));
    setEditedMafiaAmount(mafiaAmt);
    setMafiaInputValue(mafiaAmt.toString());
    setSelectedSlotIndex(null);
  };

  // Calculate delta for MAFIA staking
  const mafiaCurrentAmount = equipmentInfo
    ? Number(formatEther(BigInt(equipmentInfo.mafiaAmount)))
    : 0;
  const mafiaDelta = editedMafiaAmount - mafiaCurrentAmount;

  // Calculate cooldown - can only equip after 3 hours from last equip
  // Note: equippedAt comes from the contract as BigInt, so we convert to Number
  const equipLoaded = !authData || equipmentInfoRaw !== undefined;
  const lastEquippedAt = equipLoaded && equipmentInfo?.equippedAt ? Number(equipmentInfo.equippedAt) : 0;
  const nextEquipTime = lastEquippedAt + EQUIP_COOLDOWN_SECONDS;
  const canEquipNow = equipLoaded && currentTime >= nextEquipTime;
  const cooldownRemaining = canEquipNow ? 0 : nextEquipTime - currentTime;
  // Check if there are changes
  const hasChanges = (() => {
    if (!equipmentInfo) return false;
    const currentIds =
      equipmentInfo.itemIds.length >= 10
        ? equipmentInfo.itemIds.slice(0, 10)
        : [
          ...equipmentInfo.itemIds,
          ...Array(10 - equipmentInfo.itemIds.length).fill(0),
        ];
    for (let i = 0; i < 10; i++) {
      if (editedItemIds[i] !== currentIds[i]) return true;
    }
    return mafiaDelta !== 0;
  })();

  // Equip transaction
  const equipTx = useContractTransaction({
    onSuccess: () => {
      toast({
        title: "Equipment Updated",
        description: "Your equipment has been successfully updated!",
      });
      refetchEquipment();
      refetchCitiesPower();
      refetchTotalPower();
      refetchBalance();
      refetchAllowance();
    },
  });
  const writeContract = equipTx.write;
  const equipHash = equipTx.hash;
  const equipError = equipTx.error;
  const resetEquip = equipTx.reset;

  // Approve MAFIA if needed
  const approveTx = useContractTransaction();
  const writeApprove = approveTx.write;
  const resetApprove = approveTx.reset;
  const approveSuccess = approveTx.isSuccess;

  const needsApproval = mafiaDelta > 0;

  // Handle equip
  const handleEquip = () => {
    resetEquip();
    const deltaWei = parseEther(mafiaDelta.toFixed(18));
    writeContract({
      address: addresses.equipment,
      abi: EQUIPMENT_ABI,
      functionName: "equipItems",
      args: [
        selectedCityId,
        editedItemIds.map((id) => BigInt(id)),
        deltaWei,
      ],
    });
  };

  // Handle approve - approve the exact delta amount needed
  const handleApprove = () => {
    if (!mafiaTokenAddr || mafiaDelta <= 0) return;
    resetApprove();
    const deltaWei = parseEther(mafiaDelta.toFixed(18));
    writeApprove({
      address: mafiaTokenAddr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addresses.equipment, deltaWei],
    });
  };

  // Check if already has allowance for the delta
  const mafiaAllowance = mafiaAllowanceRaw ? Number(formatEther(mafiaAllowanceRaw as bigint)) : 0;
  const hasAllowance = mafiaDelta <= 0 || mafiaAllowance >= mafiaDelta;

  // MAFIA wallet balance
  const mafiaBalance = mafiaBalanceRaw ? Number(formatEther(mafiaBalanceRaw as bigint)) : 0;

  const isLoadingEquip = equipTx.isLoading;
  const isLoadingApprove = approveTx.isLoading;

  // Items available for selection (owned by user)
  const selectableItems = [...shopItems, ...bodyguards];
  // ALL items (for looking up equipped item info - these may be owned by the contract)
  const allItemsGlobal = [...allShopItemsGlobal, ...allBodyguardsGlobal];

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Connect your wallet to manage equipment
        </p>
      </div>
    );
  }

  if (!authData) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Please sign the authentication message to access equipment
        </p>
      </div>
    );
  }

  const savedItemIds = normalizeEquipmentIds(equipmentInfo?.itemIds);
  const draftItemIds = normalizeEquipmentIds(editedItemIds);
  const draftItemsDiffer =
    !!equipmentInfo &&
    !isLoading &&
    !loadError &&
    savedItemIds.some((id, index) => id !== draftItemIds[index]);
  const savedItemStats = sumItemCombatStats(
    savedItemIds,
    allItemsGlobal,
    allCitySlotsGlobal,
  );
  const draftItemStats = sumItemCombatStats(
    draftItemIds,
    allItemsGlobal,
    allCitySlotsGlobal,
  );
  const onChainDefense = totalPower
    ? Number(totalPower[0])
    : citiesPower
      ? Number(citiesPower[0]?.[selectedCityId] ?? 0)
      : 0;
  const onChainOffense = totalPower
    ? Number(totalPower[1])
    : citiesPower
      ? Number(citiesPower[1]?.[selectedCityId] ?? 0)
      : 0;
  const defensePower = splitCityDeveloperPower(onChainDefense, isCityDeveloper);
  const offensePower = splitCityDeveloperPower(onChainOffense, isCityDeveloper);
  const offenseProjection = draftItemsDiffer
    ? projectLoadoutPower({
        onChainTotal: onChainOffense,
        savedItemStat: savedItemStats.offense,
        draftItemStat: draftItemStats.offense,
        isCityDeveloper,
      })
    : null;
  const defenseProjection = draftItemsDiffer
    ? projectLoadoutPower({
        onChainTotal: onChainDefense,
        savedItemStat: savedItemStats.defense,
        draftItemStat: draftItemStats.defense,
        isCityDeveloper,
      })
    : null;
  const selectedCityName = City[selectedCityId] || `City #${selectedCityId}`;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex flex-col gap-6">
      {/* City Power Overview */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            City Power Overview
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchEquipment();
              refetchCitiesPower();
              refetchTotalPower();
              void developedCitiesQuery.refetch();
              void cityDeveloperQuery.refetch();
              loadInventory();
            }}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.keys(City).map((cityIdStr) => {
            const cityId = Number(cityIdStr);
            const defense = citiesPower
              ? Number(citiesPower[0][cityId] || 0)
              : 0;
            const offense = citiesPower
              ? Number(citiesPower[1][cityId] || 0)
              : 0;
            return (
              <CityPowerCard
                key={cityId}
                cityId={cityId}
                defense={defense}
                offense={offense}
                isSelected={selectedCityId === cityId}
                isDeveloper={developedCityIds.includes(cityId)}
                onSelect={() => setSelectedCityId(cityId)}
              />
            );
          })}
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Equipment for {selectedCityName}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select slots to equip items
            </p>
            {isCityDeveloper && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    className="mt-2 inline-flex max-w-full cursor-help items-center gap-2 rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-amber-200"
                  >
                    <Crown className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span className="text-[10px] font-bold tracking-[0.14em] text-amber-300">
                      CITY DEVELOPER
                    </span>
                    <span className="text-[10px] font-medium">
                      +{CITY_DEVELOPER_BOOST_PERCENT}% Offense & Defense
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {cityDeveloperBadgeTooltip(selectedCityName)}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div
          className={cn(
            "mb-4 grid grid-cols-2 gap-3 rounded-xl p-3",
            isCityDeveloper
              ? "border border-amber-400/80 bg-amber-400/[0.07] shadow-[0_0_28px_rgba(245,196,64,0.32)]"
              : "border border-border bg-background/40",
          )}
        >
          <CombatPowerStat
            stat="offense"
            power={offensePower}
            isCityDeveloper={isCityDeveloper}
            projection={offenseProjection}
          />
          <CombatPowerStat
            stat="defense"
            power={defensePower}
            isCityDeveloper={isCityDeveloper}
            projection={defenseProjection}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <p className="text-sm text-red-400">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadInventory}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <EquipmentSlotCard
                  key={i}
                  slotIndex={i}
                  equippedItemId={editedItemIds[i]}
                  allItemsGlobal={allItemsGlobal}
                  allSlots={allCitySlotsGlobal}
                  selectedItemId={selectedSlotIndex}
                  isCityDeveloper={isCityDeveloper}
                  onSelect={handleSlotSelect}
                />
              ))}
            </div>

            {/* MAFIA Stake */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    MAFIA Stake
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    Balance: <span className="font-mono text-foreground">{mafiaBalance.toLocaleString()}</span> MAFIA
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Max stake: {MAX_EQUIPMENT_MAFIA_STAKE.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={mafiaInputValue}
                  onChange={(e) => handleMafiaChange(e.target.value)}
                  min={0}
                  max={MAX_EQUIPMENT_MAFIA_STAKE}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleMafiaChange(MAX_EQUIPMENT_MAFIA_STAKE.toString())
                  }
                >
                  Max
                </Button>
              </div>
              {mafiaDelta !== 0 && (
                <p
                  className={cn(
                    "text-xs mt-2",
                    mafiaDelta > 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {mafiaDelta > 0 ? "+" : ""}
                  {mafiaDelta.toLocaleString()} MAFIA{" "}
                  {mafiaDelta > 0 ? "to stake" : "to unstake"}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-4">
              {/* Cooldown warning */}
              {!canEquipNow && lastEquippedAt > 0 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">
                      Equipment Cooldown
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can equip again in{" "}
                    <span className="font-mono text-yellow-400">
                      {formatDuration(cooldownRemaining)}
                    </span>
                  </p>
                </div>
              )}

              {needsApproval && !hasAllowance && !approveSuccess && (
                <Button
                  onClick={handleApprove}
                  disabled={isLoadingApprove || !mafiaTokenAddr || !canEquipNow}
                  className="gap-1.5"
                >
                  {isLoadingApprove ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Approve {mafiaDelta.toLocaleString()} MAFIA
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleDiscardChanges}
                disabled={!hasChanges || isLoadingEquip}
                className="gap-1.5"
              >
                <X className="h-4 w-4" />
                Discard Changes
              </Button>

              <Button
                onClick={handleEquip}
                disabled={
                  !hasChanges ||
                  isLoadingEquip ||
                  !canEquipNow ||
                  (needsApproval && !hasAllowance && !approveSuccess)
                }
                className="gap-1.5"
              >
                {isLoadingEquip ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Equipping...
                  </>
                ) : !equipLoaded ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking cooldown...
                  </>
                ) : !canEquipNow ? (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Cooldown Active
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Save Equipment
                  </>
                )}
              </Button>

              {equipError && (
                <p className="text-xs text-red-400">
                  {getErrorMessage(equipError as Error)}
                </p>
              )}

              {equipHash && (
                <a
                  href={`${explorer}/tx/${equipHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-primary hover:underline"
                >
                  Tx: {equipHash.slice(0, 10)}...{equipHash.slice(-8)}
                </a>
              )}
            </div>
          </>
        )}
      </div>

      {/* Item Selection Dialog */}
      {selectedSlotIndex !== null && (
        <ItemSelectionDialog
          open={selectedSlotIndex !== null}
          onOpenChange={(open) => !open && setSelectedSlotIndex(null)}
          slotIndex={selectedSlotIndex}
          allItems={selectableItems}
          allSlots={citySlots}
          selectedCityId={selectedCityId}
          currentEquippedIds={editedItemIds}
          onSelectItem={handleItemSelect}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
