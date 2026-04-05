"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { useAuth } from "@/components/auth-provider";
import {
  EXCHANGE_ADDRESSES,
  DEPOSIT_ADDRESSES,
  MAFIA_PAIR_ADDRESSES,
  EXCHANGE_CONTRACT_ABI,
  DEPOSIT_CONTRACT_ABI,
  CASH_VALUES,
  SHOPITEM_VALUES,
  CREDIT_USD_VALUES,
  LANDSLOT_USD_VALUES,
  CONVERT_CATEGORY_NAMES,
  MAFIA_BUY_FEE,
  ItemCategory,
  CRATE_ITEM_CATEGORIES,
  City,
  type ChainId,
} from "@/lib/contract";
import { parseEther, formatEther } from "viem";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowRightLeft,
  Package,
  Coins,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// ── Types ───────────────────────────────────────────────────────
interface ConvertItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId?: number;
  rarity?: string; // For land slots
}

interface ParsedSlotInfo {
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
  stakingAmount: number | string;
  yieldPayout: number;
  owner: string;
}

declare global {
  interface Window {
    MafiaInventory?: {
      getItemsByCategory: (opts: {
        chain: string;
        contractAddress: string;
        categoryId: number;
        maxItems: number;
        onProgress?: (info: { fetched: number; batchIndex: number }) => void;
      }) => Promise<ConvertItem[]>;
    };
    MafiaMap?: {
      getSlots: (opts: {
        chain: string;
        cityId: number;
      }) => Promise<ParsedSlotInfo[]>;
    };
  }
}

// Rarity number to name mapping
const RARITY_NAMES: Record<number, string> = {
  0: "Strategic",
  1: "Common",
  2: "Upper",
  3: "Elite",
};

// ── Script loader ───────────────────────────────────────────────
function useInventoryScript() {
  const [ready, setReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load MafiaInventory script (required)
    if (typeof window !== "undefined" && window.MafiaInventory) {
      setReady(true);
    } else {
      const existingInv = document.querySelector('script[src="/js/mafia-inventory.js"]');
      if (existingInv) {
        existingInv.addEventListener("load", () => setReady(true));
      } else {
        const script = document.createElement("script");
        script.src = "/js/mafia-inventory.js";
        script.async = true;
        script.onload = () => setReady(true);
        script.onerror = () => setError("Failed to load inventory script");
        document.head.appendChild(script);
      }
    }

    // Load MafiaMap script (optional - for land slots)
    if (typeof window !== "undefined" && window.MafiaMap) {
      setMapReady(true);
    } else {
      const existingMap = document.querySelector('script[src="/js/mafia-map.js"]');
      if (existingMap) {
        existingMap.addEventListener("load", () => setMapReady(true));
      } else {
        const script = document.createElement("script");
        script.src = "/js/mafia-map.js";
        script.async = true;
        script.onload = () => setMapReady(true);
        // Don't set error for map - it's optional
        script.onerror = () => console.log("MafiaMap script not available - land slots disabled");
        document.head.appendChild(script);
      }
    }
  }, []);

  return { ready, mapReady, error };
}

// ── Helper functions ────────────────────────────────────────────
function getCashLabel(typeId: number): string {
  const cashCategory = CRATE_ITEM_CATEGORIES.find(c => c.id === ItemCategory.CASH);
  if (cashCategory && cashCategory.values[typeId] !== undefined) {
    const val = cashCategory.values[typeId];
    return typeof val === "number" ? `$${val.toLocaleString()}` : String(val);
  }
  return `Cash #${typeId}`;
}

function getShopItemLabel(typeId: number): string {
  const shopCategory = CRATE_ITEM_CATEGORIES.find(c => c.id === ItemCategory.SHOPITEM);
  if (shopCategory && shopCategory.values[typeId] !== undefined) {
    return String(shopCategory.values[typeId]);
  }
  return `Shop Item #${typeId}`;
}

function getCreditLabel(typeId: number): string {
  const creditCategory = CRATE_ITEM_CATEGORIES.find(c => c.id === ItemCategory.CREDIT);
  if (creditCategory && creditCategory.values[typeId] !== undefined) {
    return `${creditCategory.values[typeId]} Credits`;
  }
  return `Credit #${typeId}`;
}

function getItemLabel(item: ConvertItem): string {
  switch (item.categoryId) {
    case 0: return getCashLabel(item.typeId);
    case 3: return getShopItemLabel(item.typeId);
    case 6: return getCreditLabel(item.typeId);
    case 13: {
      const cityName = item.cityId !== undefined ? City[item.cityId] || `City ${item.cityId}` : "";
      return `${item.rarity || "Unknown"} Slot${cityName ? ` - ${cityName}` : ""}`;
    }
    default: return `Item #${item.itemId}`;
  }
}

function getCategoryColor(categoryId: number): string {
  switch (categoryId) {
    case 0: return "text-green-400 bg-green-400/10";
    case 3: return "text-blue-400 bg-blue-400/10";
    case 6: return "text-amber-400 bg-amber-400/10";
    case 13: return "text-purple-400 bg-purple-400/10";
    default: return "text-muted-foreground bg-muted-foreground/10";
  }
}

function getCategoryIcon(categoryId: number) {
  switch (categoryId) {
    case 0: return <Coins className="h-4 w-4" />;
    case 3: return <Package className="h-4 w-4" />;
    case 6: return <Sparkles className="h-4 w-4" />;
    case 13: return <MapPin className="h-4 w-4" />;
    default: return <Package className="h-4 w-4" />;
  }
}

// ── Main Component ──────────────────────────────────────────────
export function ExchangeConvertAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig, activeChain } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const publicClient = usePublicClient();
  const { authData, isSigning: authSigning, signError, requestSignature } = useAuth();
  const { ready: scriptReady, mapReady: mapScriptReady, error: scriptError } = useInventoryScript();

  // ── State ─────────────────────────────────────────────────────
  const [items, setItems] = useState<ConvertItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [mafiaPrice, setMafiaPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [hasConvertPerk, setHasConvertPerk] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    new Set([0, 3, 6, 13])
  );

  // ── Contract write ────────────────────────────────────────────
  const {
    writeContract,
    data: convertHash,
    isPending: convertPending,
    error: convertError,
    reset: resetConvert,
  } = useChainWriteContract();

  const { isLoading: convertConfirming, isSuccess: convertSuccess } =
    useWaitForTransactionReceipt({ hash: convertHash });

  const isWorking = convertPending || convertConfirming;

  // ── Fetch MAFIA price from Dexscreener ────────────────────────
  const fetchMafiaPrice = useCallback(async () => {
    setPriceLoading(true);
    try {
      const pairAddress = MAFIA_PAIR_ADDRESSES[activeChain as ChainId];
      const network = activeChain === "bnb" ? "bsc" : "pulsechain";
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/${network}/${pairAddress}`
      );
      const data = await res.json();
      if (data.pair?.priceUsd) {
        setMafiaPrice(parseFloat(data.pair.priceUsd));
      }
    } catch (e) {
      console.error("Failed to fetch MAFIA price:", e);
    } finally {
      setPriceLoading(false);
    }
  }, [activeChain]);

  // ── getCashWithEstimateSwap helper ────────────────────────────
  const getCashWithEstimateSwap = useCallback(
    async (mafiaAmount: number): Promise<number> => {
      if (!publicClient || mafiaAmount <= 0) return 0;
      try {
        const depositAddress = DEPOSIT_ADDRESSES[activeChain as ChainId];
        const amountWei = parseEther(mafiaAmount.toString());
        const result = await publicClient.readContract({
          address: depositAddress,
          abi: DEPOSIT_CONTRACT_ABI,
          functionName: "estimateSwap",
          args: [amountWei],
        });
        return Number(formatEther(result as bigint));
      } catch (e) {
        console.error("estimateSwap failed:", e);
        return 0;
      }
    },
    [publicClient, activeChain]
  );

  // ── Fetch inventory items ─────────────────────────────────────
  const fetchItems = useCallback(async () => {
    if (!window.MafiaInventory || !address) return;
    setFetching(true);
    try {
      const inventoryAddress = addresses.inventory;
      const chain = activeChain === "bnb" ? "bnb" : "pls";
      
      const categories = [0, 3, 6]; // CASH, SHOPITEM, CREDIT
      const allItems: ConvertItem[] = [];

      for (const categoryId of categories) {
        const categoryItems = await window.MafiaInventory.getItemsByCategory({
          chain,
          contractAddress: inventoryAddress,
          categoryId,
          maxItems: 100000,
        });
        
        // Filter by owner
        const ownedItems = categoryItems.filter(
          (item) => item.owner.toLowerCase() === address.toLowerCase()
        );
        allItems.push(...ownedItems);
      }

      // Fetch land slots from all cities (0-10)
      if (window.MafiaMap) {
        for (let cityId = 0; cityId <= 10; cityId++) {
          try {
            const slots = await window.MafiaMap.getSlots({
              chain: activeChain,
              cityId,
            });
            
            // Filter owned slots and convert to ConvertItem format
            const ownedSlots = slots.filter(
              (slot) => slot.owner.toLowerCase() === address.toLowerCase()
            );
            
            for (const slot of ownedSlots) {
              allItems.push({
                itemId: slot.inventoryItemId,
                categoryId: 13, // LANDSLOT
                typeId: slot.rarity,
                owner: slot.owner,
                cityId: slot.cityId,
                rarity: RARITY_NAMES[slot.rarity] || "Unknown",
              });
            }
          } catch (e) {
            console.error(`Failed to fetch slots for city ${cityId}:`, e);
          }
        }
      }

      // Check for conversion perk (categoryId = 46)
      try {
        const perkItems = await window.MafiaInventory.getItemsByCategory({
          chain,
          contractAddress: inventoryAddress,
          categoryId: 46, // CONVERSION_RATE_BOOST
          maxItems: 100,
        });
        const hasActivePerk = perkItems.some(
          (item) => item.owner.toLowerCase() === address.toLowerCase()
        );
        setHasConvertPerk(hasActivePerk);
      } catch {
        setHasConvertPerk(false);
      }

      setItems(allItems);
    } catch (e) {
      console.error("Failed to fetch inventory:", e);
      toast.error("Failed to load inventory");
    } finally {
      setFetching(false);
      setLoading(false);
    }
  }, [address, addresses.inventory, activeChain]);

  // ── Initialize ────────────────────────────────────────────────
  useEffect(() => {
    if (scriptReady && isConnected && address) {
      setLoading(true);
      fetchItems();
      fetchMafiaPrice();
    }
  }, [scriptReady, isConnected, address, fetchItems, fetchMafiaPrice]);

  // ── Calculate estimated cash ──────────────────────────────────
  const [estimatedCash, setEstimatedCash] = useState(0);
  const [estimatedUsdCash, setEstimatedUsdCash] = useState(0);
  const [volumeBonus, setVolumeBonus] = useState(0);

  useEffect(() => {
    const calculateEstimate = async () => {
      let totalCash = 0;
      let usd = 0;

      const selectedItems = items.filter((item) => selectedIds.has(item.itemId));

      for (const item of selectedItems) {
        // A) CASH (categoryId = 0)
        if (item.categoryId === 0) {
          totalCash += CASH_VALUES[item.typeId] ?? 0;
        }
        // B) SHOPITEM (categoryId = 3)
        else if (item.categoryId === 3) {
          totalCash += SHOPITEM_VALUES[item.typeId] ?? 0;
        }
        // C) CREDIT (categoryId = 6)
        else if (item.categoryId === 6) {
          usd += CREDIT_USD_VALUES[item.typeId] ?? 0;
        }
        // D) LANDSLOT (categoryId = 13)
        else if (item.categoryId === 13 && item.rarity) {
          usd += LANDSLOT_USD_VALUES[item.rarity] ?? 0;
        }
      }

      // USD -> cash conversion
      let estimatedCashFromUSD = 0;
      if (usd > 0 && mafiaPrice > 0) {
        const mafiaAmount = (500 / mafiaPrice) * (1 - MAFIA_BUY_FEE / 100);
        const estimatedCashFor500USD = await getCashWithEstimateSwap(mafiaAmount);
        estimatedCashFromUSD = (usd / 500) * estimatedCashFor500USD;
        totalCash += estimatedCashFromUSD;
      }

      setEstimatedUsdCash(estimatedCashFromUSD);

      // Apply perk multiplier
      if (hasConvertPerk) {
        totalCash = totalCash * 1.2;
      }

      // Calculate volume bonus
      let bonus = 0;
      if (totalCash >= 100_000_000) {
        bonus = totalCash * 0.08;
      } else if (totalCash >= 50_000_000) {
        bonus = totalCash * 0.05;
      } else if (totalCash >= 15_000_000) {
        bonus = totalCash * 0.03;
      }

      setEstimatedCash(totalCash);
      setVolumeBonus(bonus);
    };

    calculateEstimate();
  }, [selectedIds, items, mafiaPrice, hasConvertPerk, getCashWithEstimateSwap]);

  // ── Selection handlers ────────────────────────────────────────
  const toggleSelect = (itemId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((i) => i.itemId)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const selectAllInCategory = (categoryId: number) => {
    const categoryItemIds = items
      .filter((i) => i.categoryId === categoryId)
      .map((i) => i.itemId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      categoryItemIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const deselectAllInCategory = (categoryId: number) => {
    const categoryItemIds = new Set(
      items.filter((i) => i.categoryId === categoryId).map((i) => i.itemId)
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      categoryItemIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  // ── Convert handler ───────────────────────────────────────────
  const handleConvert = () => {
    if (selectedIds.size === 0) return;
    resetConvert();
    
    const itemIds = Array.from(selectedIds).map((id) => BigInt(id));
    const exchangeAddress = EXCHANGE_ADDRESSES[activeChain as ChainId];

    writeContract({
      address: exchangeAddress,
      abi: EXCHANGE_CONTRACT_ABI,
      functionName: "convertItem",
      args: [itemIds],
      gas: BigInt(500_000 + selectedIds.size * 50_000),
    });
  };

  // ── Success handler ───────────────────────────────────────────
  const convertToastFired = useRef(false);
  useEffect(() => {
    if (convertSuccess && convertHash && !convertToastFired.current) {
      convertToastFired.current = true;
      toast.success(`Converted ${selectedIds.size} items to cash!`);
      setSelectedIds(new Set());
      fetchItems();
    }
    if (!convertHash) {
      convertToastFired.current = false;
    }
  }, [convertSuccess, convertHash, selectedIds.size, fetchItems]);

  // ── Group items by category ───────────────────────────────────
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.categoryId]) {
      acc[item.categoryId] = [];
    }
    acc[item.categoryId].push(item);
    return acc;
  }, {} as Record<number, ConvertItem[]>);

  // ── Auth states ───────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <ArrowRightLeft className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Exchange Convert</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to convert items to cash.
        </p>
      </div>
    );
  }

  if (scriptError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">Script Error</p>
        <p className="mt-1 text-sm text-muted-foreground">{scriptError}</p>
      </div>
    );
  }

  if (!scriptReady || loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Loading Inventory...</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Fetching your convertible items from the blockchain.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Convert Items</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Select items to convert to in-game cash.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchItems()}
            disabled={fetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-50"
            aria-label="Refresh inventory"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* MAFIA Price Info */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <TrendingUp className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex flex-1 items-center justify-between">
          <span className="text-sm text-muted-foreground">MAFIA Price</span>
          <span className="text-sm font-semibold text-foreground">
            {priceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mafiaPrice > 0 ? (
              `$${mafiaPrice.toFixed(6)}`
            ) : (
              "N/A"
            )}
          </span>
        </div>
      </div>

      {/* Perk indicator */}
      {hasConvertPerk && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3">
          <Sparkles className="h-5 w-5 shrink-0 text-green-400" />
          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm text-green-400 font-medium">
              Conversion Rate Boost Active
            </span>
            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
              +20%
            </Badge>
          </div>
        </div>
      )}

      {/* Selection controls */}
      {items.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={isWorking}
          >
            Select All ({items.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={selectNone}
            disabled={isWorking || selectedIds.size === 0}
          >
            Clear Selection
          </Button>
          <span className="ml-auto text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
        </div>
      )}

      {/* Items list by category */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
          <Package className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No convertible items</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You don&apos;t have any Cash, Shop Items, Credits, or Land Slots to convert.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(groupedItems)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([categoryIdStr, categoryItems]) => {
              const categoryId = Number(categoryIdStr);
              const isExpanded = expandedCategories.has(categoryId);
              const selectedInCategory = categoryItems.filter((i) =>
                selectedIds.has(i.itemId)
              ).length;

              return (
                <div
                  key={categoryId}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Category header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(categoryId)}
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          getCategoryColor(categoryId)
                        )}
                      >
                        {getCategoryIcon(categoryId)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">
                          {CONVERT_CATEGORY_NAMES[categoryId] || `Category ${categoryId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {categoryItems.length} items ({selectedInCategory} selected)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedInCategory === categoryItems.length) {
                            deselectAllInCategory(categoryId);
                          } else {
                            selectAllInCategory(categoryId);
                          }
                        }}
                        disabled={isWorking}
                        className="h-7 px-2 text-xs"
                      >
                        {selectedInCategory === categoryItems.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Category items */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {categoryItems.map((item) => {
                          const isSelected = selectedIds.has(item.itemId);
                          return (
                            <button
                              key={item.itemId}
                              type="button"
                              onClick={() => toggleSelect(item.itemId)}
                              disabled={isWorking}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-background/50 hover:border-primary/30"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(item.itemId)}
                                disabled={isWorking}
                                className="pointer-events-none"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {getItemLabel(item)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  #{item.itemId}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Estimated output */}
      {selectedIds.size > 0 && (
        <div className="rounded-xl border border-primary/30 bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Estimated Output</h3>
              <p className="text-xs text-muted-foreground">
                Based on current MAFIA price and market conditions
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">Base Cash</span>
              <span className="text-sm font-semibold text-foreground">
                ${(estimatedCash - estimatedUsdCash * (hasConvertPerk ? 1.2 : 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            {estimatedUsdCash > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">From Credits/Slots</span>
                <span className="text-sm font-semibold text-foreground">
                  +${(estimatedUsdCash * (hasConvertPerk ? 1.2 : 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}

            {hasConvertPerk && (
              <div className="flex items-center justify-between rounded-lg bg-green-500/5 border border-green-500/20 px-3 py-2.5">
                <span className="text-sm text-green-400">Perk Bonus (+20%)</span>
                <span className="text-sm font-semibold text-green-400">Included</span>
              </div>
            )}

            {volumeBonus > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2.5">
                <span className="text-sm text-amber-400">
                  Volume Bonus
                  {estimatedCash >= 100_000_000
                    ? " (+8%)"
                    : estimatedCash >= 50_000_000
                    ? " (+5%)"
                    : " (+3%)"}
                </span>
                <span className="text-sm font-semibold text-amber-400">
                  +${volumeBonus.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <span className="text-base font-semibold text-foreground">Total Estimated</span>
              <span className="text-lg font-bold text-primary">
                ${(estimatedCash + volumeBonus).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Convert button */}
      <Button
        onClick={handleConvert}
        disabled={isWorking || selectedIds.size === 0}
        className="w-full h-12 text-base"
      >
        {isWorking ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {convertPending ? "Confirm in wallet..." : "Converting..."}
          </>
        ) : (
          <>
            <ArrowRightLeft className="mr-2 h-5 w-5" />
            Convert {selectedIds.size} Items
          </>
        )}
      </Button>

      {/* Error display */}
      {convertError && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 p-3">
          <p className="text-sm text-red-400">
            {convertError.message.includes("User rejected")
              ? "Transaction rejected by user"
              : convertError.message.split("\n")[0]}
          </p>
        </div>
      )}

      {/* Transaction hash link */}
      {convertHash && (
        <div className="text-center">
          <a
            href={`${explorer}/tx/${convertHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-sm text-primary hover:underline"
          >
            View transaction: {convertHash.slice(0, 10)}...{convertHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
