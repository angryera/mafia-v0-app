"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DURATION_OPTIONS,
  GAME_CASH_ADDRESS,
  NATIVE_ADDRESS,
  NON_LISTABLE_CATEGORIES,
  durationDaysToSeconds,
  getItemName,
  isGameCashToken,
  type SDKInventoryItem,
} from "@/features/marketplace/lib/marketplace";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { useToast } from "@/hooks/use-toast";
import { INVENTORY_MARKETPLACE_ABI, MARKETPLACE_CATEGORY_NAMES } from "@/lib/contract";
import { getErrorMessage } from "@/lib/format";
import { Coins, DollarSign, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";

export function CreateListingModal({
  open,
  onOpenChange,
  onSuccess,
  chainId,
  addresses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  chainId: string;
  addresses: any;
}) {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  // State for items
  const [inventoryItems, setInventoryItems] = useState<SDKInventoryItem[]>([]);
  const [landSlots, setLandSlots] = useState<SDKInventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Form state
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedItemType, setSelectedItemType] = useState<"inventory" | "land">("inventory");
  const [listingType, setListingType] = useState<string>("0"); // 0 = Fixed, 1 = Auction
  const [paymentToken, setPaymentToken] = useState<string>(GAME_CASH_ADDRESS);
  const [price, setPrice] = useState<string>("");
  const [duration, setDuration] = useState<string>("3"); // days (see DURATION_OPTIONS)

  const createListing = useContractTransaction({
    onSuccess: () => {
      toast({
        title: "Listing Created",
        description: "Your item has been listed on the marketplace.",
      });
      onSuccess();
    },
  });
  const resetCreateListing = createListing.reset;

  // Fetch user items when modal opens
  const fetchUserItems = useCallback(async () => {
    if (!address || !isConnected) return;
    setLoadingItems(true);

    try {
      const sdkChain = chainId === "bnb" ? "bnb" : "pls";

      // Fetch inventory items
      if (typeof window !== "undefined" && (window as any).MafiaInventory?.getAllItemsByOwner) {
        const items = await (window as any).MafiaInventory.getAllItemsByOwner({
          chain: sdkChain,
          contractAddress: addresses.inventory,
          owner: address,
          maxItems: Number.MAX_SAFE_INTEGER,
        });
        // Filter out non-listable categories
        const listable = (items || []).filter(
          (item: SDKInventoryItem) => !NON_LISTABLE_CATEGORIES.has(item.categoryId)
        );
        setInventoryItems(listable);
      }

      // Fetch land slots
      if (typeof window !== "undefined" && (window as any).MafiaMap?.getLandSlotsByOwner) {
        const slots = await (window as any).MafiaMap.getLandSlotsByOwner({
          chain: sdkChain,
          contractAddress: addresses.landSlots,
          owner: address,
        });
        setLandSlots(slots || []);
      }
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoadingItems(false);
    }
  }, [address, isConnected, chainId, addresses]);

  // Fetch items when modal opens
  useEffect(() => {
    if (open) {
      fetchUserItems();
      resetCreateListing();
      setSelectedItemId("");
      setPrice("");
      setListingType("0");
      setPaymentToken(GAME_CASH_ADDRESS);
      setDuration("3");
    }
  }, [open, fetchUserItems, resetCreateListing]);

  const handleCreateListing = () => {
    if (!isConnected || !address || !selectedItemId || !price) return;

    const priceWei = parseEther(price);
    const durationSeconds = durationDaysToSeconds(duration);

    createListing.write({
      address: addresses.inventoryMarketplace,
      abi: INVENTORY_MARKETPLACE_ABI,
      functionName: "createListing",
      args: [
        BigInt(selectedItemId),
        priceWei,
        BigInt(listingType),
        paymentToken as `0x${string}`,
        durationSeconds,
      ],
    });
  };

  const createLoading = createListing.isLoading;

  const allItems = useMemo(() => {
    const inv = inventoryItems.map((item) => {
      const itemName = getItemName(item.categoryId, item.typeId);
      const categoryName = MARKETPLACE_CATEGORY_NAMES[item.categoryId] ?? `Category ${item.categoryId}`;
      return {
        ...item,
        type: "inventory" as const,
        label: `${itemName}`,
        categoryLabel: categoryName,
      };
    });
    const land = landSlots.map((item) => ({
      ...item,
      type: "land" as const,
      label: `Land Slot #${item.itemId}`,
      categoryLabel: "Land",
    }));
    return [...inv, ...land];
  }, [inventoryItems, landSlots]);

  const canSubmit =
    isConnected &&
    !!selectedItemId &&
    !!price &&
    Number(price) > 0 &&
    !createLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Listing</DialogTitle>
          <DialogDescription>
            List your item on the marketplace for sale or auction.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Item Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Select Item
            </label>
            {loadingItems ? (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading items...</span>
              </div>
            ) : allItems.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                <p className="text-sm text-yellow-400">
                  No items available to list. Acquire items first.
                </p>
              </div>
            ) : (
              <Select
                value={selectedItemId}
                onValueChange={(val) => {
                  setSelectedItemId(val);
                  const item = allItems.find((i) => String(i.itemId) === val);
                  if (item) {
                    setSelectedItemType(item.type);
                  }
                }}
                disabled={createLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {allItems.map((item) => (
                    <SelectItem key={`${item.type}-${item.itemId}`} value={String(item.itemId)}>
                      <div className="flex items-center gap-2">
                        <span>{item.label}</span>
                        <span className="text-[10px] text-muted-foreground">#{item.itemId}</span>
                        <span className="text-[10px] text-primary/70">({item.categoryLabel})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Listing Type */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Listing Type
            </label>
            <Select value={listingType} onValueChange={setListingType} disabled={createLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Fixed Price</SelectItem>
                <SelectItem value="1">Auction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Token */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Payment Token
            </label>
            <Select value={paymentToken} onValueChange={setPaymentToken} disabled={createLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GAME_CASH_ADDRESS}>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Game Cash</span>
                  </div>
                </SelectItem>
                <SelectItem value={NATIVE_ADDRESS}>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <span>{chainId === "bnb" ? "BNB" : "PLS"} (USD Price)</span>
                  </div>
                </SelectItem>
                <SelectItem value={addresses.mafia}>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <span>MAFIA (USD Price)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              {isGameCashToken(paymentToken as `0x${string}`) ? "Price (Game Cash)" : "Price (USD)"}
            </label>
            <Input
              type="number"
              placeholder={isGameCashToken(paymentToken as `0x${string}`) ? "Enter amount" : "Enter USD price"}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              disabled={createLoading}
            />
            <p className="text-xs text-muted-foreground">
              {isGameCashToken(paymentToken as `0x${string}`)
                ? "Amount of Game Cash for this item"
                : paymentToken.toLowerCase() === addresses.mafia?.toLowerCase()
                  ? "USD price - buyer pays in MAFIA token at current rate"
                  : `USD price - buyer pays in ${chainId === "bnb" ? "BNB" : "PLS"} at current rate`}
            </p>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Duration
            </label>
            <Select value={duration} onValueChange={setDuration} disabled={createLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error display */}
          {createListing.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-sm text-red-400">
                {createListing.error.message.includes("User rejected")
                  ? "Transaction rejected"
                  : getErrorMessage(createListing.error)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateListing}
            disabled={!canSubmit}
            className="gap-1.5"
          >
            {createLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {createListing.isPending ? "Confirm in wallet..." : "Creating..."}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Listing
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
