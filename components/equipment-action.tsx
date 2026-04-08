"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  EQUIPMENT_ABI,
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_LABELS,
  SHOP_ITEM_STATS,
  BUILDING_STATS,
  RARITY_AMPLIFIERS,
  RARITY_NAMES,
  BODYGUARD_INFO,
  BODYGUARD_CATEGORIES,
  City,
  ItemCategory,
  MAX_EQUIPMENT_MAFIA_STAKE,
  ERC20_ABI,
} from "@/lib/contract";
import { parseEther, formatEther, maxUint256 } from "viem";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";

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

declare global {
  interface Window {
    MafiaInventory?: {
      getItemsByCategory: (opts: {
        chain: string;
        contractAddress: string;
        categoryId: number;
        maxItems?: number;
        onProgress?: (info: { fetched: number; batchIndex: number }) => void;
      }) => Promise<InventoryItem[]>;
    };
    MafiaMap?: {
      getSlots: (opts: {
        chain: string;
        cityId: number;
      }) => Promise<SlotInfo[]>;
    };
  }
}

// ── Script loader ───────────────────────────────────────────────
function useInventoryScript() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.MafiaInventory) {
      setReady(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="/js/mafia-utils.js"]'
    );
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

// ── Helpers ─────────────────────────────────────────────────────
function getBodyguardStats(categoryId: number, typeId: number) {
  const info = BODYGUARD_INFO[categoryId];
  if (!info) return { offense: 0, defense: 0 };
  const level = typeId + 1;
  return {
    offense: info.offensePerLevel * level,
    defense: info.defensePerLevel * level,
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

// ── Equipment Slot Card ─────────────────────────────────────────
function EquipmentSlotCard({
  slotIndex,
  equippedItemId,
  allItemsGlobal,
  allSlots,
  selectedItemId,
  onSelect,
}: {
  slotIndex: number;
  equippedItemId: number;
  allItemsGlobal: InventoryItem[]; // ALL items (not filtered by owner) for equipped item info lookup
  allSlots: SlotInfo[];
  selectedItemId: number | null;
  onSelect: (slotIndex: number) => void;
}) {
  const label = EQUIPMENT_SLOT_LABELS[slotIndex];
  const isEquipped = equippedItemId > 0;

  // Find the equipped item
  let equippedItem: InventoryItem | SlotInfo | undefined;
  let stats = { offense: 0, defense: 0 };
  let itemName = "Empty";

  if (isEquipped) {
    // Check if it's a building (slot)
    // Note: equippedItemId may be BigInt from contract, so convert to Number for comparison
    const equippedIdNum = typeof equippedItemId === 'bigint' ? Number(equippedItemId) : equippedItemId;
    equippedItem = allSlots.find(
      (s) => s.inventoryItemId === equippedIdNum
    );
    if (equippedItem && "slotSubType" in equippedItem) {
      const buildingStats = getBuildingStats(
        equippedItem.slotSubType,
        equippedItem.rarity
      );
      stats = buildingStats;
      itemName = `${BUILDING_STATS[equippedItem.slotSubType]?.name || "Building"} (${RARITY_NAMES[equippedItem.rarity] || "Common"})`;
    } else {
      // Check inventory items - use allItemsGlobal since equipped items are owned by the contract
      equippedItem = allItemsGlobal.find((i) => i.itemId === equippedIdNum);
      if (equippedItem) {
        if (equippedItem.categoryId === ItemCategory.SHOPITEM) {
          const shopStats = SHOP_ITEM_STATS[equippedItem.typeId];
          if (shopStats) {
            stats = { offense: shopStats.offense, defense: shopStats.defense };
            itemName = shopStats.name;
          }
        } else if (
          equippedItem.categoryId === ItemCategory.BODYGUARD ||
          BODYGUARD_CATEGORIES.includes(equippedItem.categoryId)
        ) {
          stats = getBodyguardStats(
            equippedItem.categoryId,
            equippedItem.typeId
          );
          const bgInfo = BODYGUARD_INFO[equippedItem.categoryId];
          itemName = bgInfo
            ? `${bgInfo.name} Lvl ${equippedItem.typeId + 1}`
            : `Bodyguard #${equippedItem.itemId}`;
        }
      }
    }
  }

  const isSelected = selectedItemId === slotIndex;

  return (
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
}

// ── City Power Card ─────────────────────────────────────────────
function CityPowerCard({
  cityId,
  defense,
  offense,
  isSelected,
  onSelect,
}: {
  cityId: number;
  defense: number;
  offense: number;
  isSelected: boolean;
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
                  stats = getBodyguardStats(item.categoryId, item.typeId);
                  const bgInfo = BODYGUARD_INFO[item.categoryId];
                  name = bgInfo
                    ? `${bgInfo.name} Lvl ${item.typeId + 1}`
                    : `Bodyguard`;
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
  const { ready: scriptReady, error: scriptError } = useInventoryScript();

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
      query: { enabled: !!authData && !!address && isConnected },
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

  const equipmentInfo = equipmentInfoRaw as EquipmentInfoData | undefined;
  const citiesPower = citiesPowerRaw as [bigint[], bigint[]] | undefined;

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

  // Calculate delta for MAFIA staking
  const mafiaCurrentAmount = equipmentInfo
    ? Number(formatEther(BigInt(equipmentInfo.mafiaAmount)))
    : 0;
  const mafiaDelta = editedMafiaAmount - mafiaCurrentAmount;

  // Calculate cooldown - can only equip after 3 hours from last equip
  // Note: equippedAt comes from the contract as BigInt, so we convert to Number
  const lastEquippedAt = equipmentInfo?.equippedAt ? Number(equipmentInfo.equippedAt) : 0;
  const nextEquipTime = lastEquippedAt + EQUIP_COOLDOWN_SECONDS;
  const canEquipNow = currentTime >= nextEquipTime;
  const cooldownRemaining = canEquipNow ? 0 : nextEquipTime - currentTime;

  // Format cooldown time
  const formatCooldown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

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
  const {
    writeContract,
    data: equipHash,
    isPending: equipPending,
    error: equipError,
    reset: resetEquip,
  } = useChainWriteContract();

  const { isLoading: equipConfirming, isSuccess: equipSuccess } =
    useWaitForTransactionReceipt({ hash: equipHash });

  // Approve MAFIA if needed
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

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

  // Success effect
  useEffect(() => {
    if (equipSuccess && equipHash) {
      toast({
        title: "Equipment Updated",
        description: "Your equipment has been successfully updated!",
      });
      refetchEquipment();
      refetchCitiesPower();
      refetchBalance();
      refetchAllowance();
    }
  }, [equipSuccess, equipHash, toast, refetchEquipment, refetchCitiesPower, refetchBalance, refetchAllowance]);

  // Items available for selection (owned by user)
  const selectableItems = [...shopItems, ...bodyguards];
  // ALL items (for looking up equipped item info - these may be owned by the contract)
  const allItemsGlobal = [...allShopItemsGlobal, ...allBodyguardsGlobal];
  const isLoadingEquip = equipPending || equipConfirming;
  const isLoadingApprove = approvePending || approveConfirming;

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

  return (
    <div className="flex flex-col gap-6">
      {/* City Power Overview */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            City Power Overview
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchEquipment();
              refetchCitiesPower();
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
              Equipment for {City[selectedCityId]}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select slots to equip items
            </p>
          </div>
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
                      {formatCooldown(cooldownRemaining)}
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
                  {(equipError as Error).message?.split("\n")[0]}
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
  );
}
