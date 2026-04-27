"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
  useSignMessage,
  usePublicClient,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  SHOP_CONTRACT_ABI,
  SHOP_ITEMS,
  SHOP_CATEGORIES,
  USER_PROFILE_CONTRACT_ABI,
  TRAVEL_DESTINATIONS,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
} from "@/lib/contract";
import type { ShopItemMeta } from "@/lib/contract";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Store,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  RefreshCw,
  Timer,
  Crosshair,
  Car,
  Shield,
  ShoppingCart,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEther, parseEther } from "viem";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProfileData {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
}

interface ShopItemData {
  categoryId: number;
  typeId: number;
  stockAmount: number;
  basePrice: number;
  ownerPrice: number;
  price: number;
  basePriceRaw: bigint;
  ownerPriceRaw: bigint;
  priceRaw: bigint;
}

interface CartEntry {
  typeId: number;
  amount: number;
}

interface BusinessInventoryItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  weapons: <Crosshair className="h-4 w-4" />,
  transport: <Car className="h-4 w-4" />,
  bodyguard: <Shield className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  weapons: "text-red-400",
  transport: "text-blue-400",
  bodyguard: "text-emerald-400",
};

const CATEGORY_BG: Record<string, string> = {
  weapons: "bg-red-400/10",
  transport: "bg-blue-400/10",
  bodyguard: "bg-emerald-400/10",
};

function toBigIntArray(value: unknown): bigint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "bigint") return entry;
      if (typeof entry === "number") return BigInt(entry);
      if (typeof entry === "string") {
        try {
          return BigInt(entry);
        } catch {
          return null;
        }
      }
      return null;
    })
    .filter((entry): entry is bigint => entry !== null);
}

function parseCityPrices(raw: unknown): { basePrices: bigint[]; ownerPrices: bigint[] } {
  const record = raw as Record<string, unknown> | undefined;
  const basePrices = toBigIntArray(record?.basePrices ?? (Array.isArray(raw) ? raw[0] : []));
  // Contract currently exposes `onwerPrices` (legacy typo), but support both keys.
  const ownerPrices = toBigIntArray(
    record?.ownerPrices ?? record?.onwerPrices ?? (Array.isArray(raw) ? raw[1] : [])
  );
  return { basePrices, ownerPrices };
}

function parseShopItems(raw: unknown): {
  categoryIds: bigint[];
  typeIds: bigint[];
  stockAmounts: bigint[];
  prices: bigint[];
} {
  const record = raw as Record<string, unknown> | undefined;
  return {
    categoryIds: toBigIntArray(record?.categoryIds ?? (Array.isArray(raw) ? raw[0] : [])),
    typeIds: toBigIntArray(record?.typeIds ?? (Array.isArray(raw) ? raw[1] : [])),
    stockAmounts: toBigIntArray(record?.stockAmounts ?? (Array.isArray(raw) ? raw[2] : [])),
    prices: toBigIntArray(record?.prices ?? (Array.isArray(raw) ? raw[3] : [])),
  };
}

function getOwnerPriceOrBase(item: ShopItemData): number {
  return item.ownerPrice > 0 ? item.ownerPrice : item.basePrice;
}

export function ShopAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData, isSigning: authSigning, signError, requestSignature } = useAuth();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();

  // ---------- Shop items data ----------
  const [shopItems, setShopItems] = useState<Map<number, ShopItemData>>(new Map());
  const [shopLoading, setShopLoading] = useState(false);
  const [shopFetching, setShopFetching] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [editableOwnerPrices, setEditableOwnerPrices] = useState<Record<number, string>>({});
  const [inventoryReady, setInventoryReady] = useState(false);
  const [cityShopBusinessItems, setCityShopBusinessItems] = useState<BusinessInventoryItem[]>([]);

  // ---------- Per-item quantity selector (before adding to cart) ----------
  const [selectedAmounts, setSelectedAmounts] = useState<Record<number, number>>({});

  const getSelectedAmount = (typeId: number) => selectedAmounts[typeId] ?? 1;

  const setSelectedAmount = (typeId: number, val: number) => {
    const stock = shopItems.get(typeId)?.stockAmount ?? 0;
    const inCart = cart.get(typeId) ?? 0;
    const maxCanAdd = Math.max(0, stock - inCart);
    const clamped = Math.max(1, Math.min(val, maxCanAdd));
    setSelectedAmounts((prev) => ({ ...prev, [typeId]: clamped }));
  };

  // ---------- Cart state ----------
  const [cart, setCart] = useState<Map<number, number>>(new Map());

  const addToCart = (typeId: number, amount: number) => {
    const stock = shopItems.get(typeId)?.stockAmount ?? 0;
    if (stock <= 0) return;
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(typeId) ?? 0;
      const clamped = Math.max(1, Math.min(current + amount, stock));
      next.set(typeId, clamped);
      return next;
    });
    // Reset selected amount for this item
    setSelectedAmounts((prev) => ({ ...prev, [typeId]: 1 }));
  };

  const setCartAmount = (typeId: number, amount: number) => {
    const stock = shopItems.get(typeId)?.stockAmount ?? 0;
    setCart((prev) => {
      const next = new Map(prev);
      if (amount <= 0) {
        next.delete(typeId);
      } else {
        next.set(typeId, Math.min(amount, stock));
      }
      return next;
    });
  };

  const removeFromCart = (typeId: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(typeId);
      return next;
    });
  };

  const clearCart = () => setCart(new Map());

  const cartEntries: CartEntry[] = Array.from(cart.entries())
    .map(([typeId, amount]) => ({ typeId, amount }))
    .sort((a, b) => a.typeId - b.typeId);

  const cartItemCount = cartEntries.reduce((sum, e) => sum + e.amount, 0);
  const cartTotalCost = cartEntries.reduce((sum, e) => {
    const data = shopItems?.get(e.typeId);
    return sum + (data && typeof data.price === "number" ? data.price * e.amount : 0);
  }, 0);

  const canManageShop =
    !!address &&
    cityShopBusinessItems.some(
      (item) => item.owner.toLowerCase() === address.toLowerCase()
    );

  console.log(cityShopBusinessItems);

  // ---------- Load Mafia inventory script ----------
  useEffect(() => {
    if (typeof window !== "undefined" && (window as { MafiaInventory?: unknown }).MafiaInventory) {
      setInventoryReady(true);
      return;
    }

    const existing = document.querySelector('script[src="/js/mafia-utils.js"]');
    if (existing) {
      existing.addEventListener("load", () => setInventoryReady(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setInventoryReady(true);
    document.head.appendChild(script);
  }, []);

  // ---------- Approve cash spend ----------
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
      args: [addresses.shop, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const approveLoading = approvePending || approveConfirming;

  const approveToastFired = useRef(false);
  useEffect(() => {
    if (approveSuccess && approveHash && !approveToastFired.current) {
      approveToastFired.current = true;
      toast.success("Cash spend approved for Shop contract");
    }
    if (!approveHash) {
      approveToastFired.current = false;
    }
  }, [approveSuccess, approveHash]);

  // ---------- Read user profile to get cityId ----------
  const { data: profileRaw, isLoading: profileLoading } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const profile = profileRaw as ProfileData | undefined;
  const cityId = profile?.cityId;
  const cityName =
    profile && profile.cityId < TRAVEL_DESTINATIONS.length
      ? TRAVEL_DESTINATIONS[profile.cityId].label
      : profile
        ? `City #${profile.cityId}`
        : null;

  // ---------- Read all 14 shop items (plus city base/owner prices) ----------
  const fetchShopItems = useCallback(async () => {
    if (cityId === undefined || !publicClient) return;
    setShopFetching(true);
    try {
      const [cityPricesRaw, shopItemsRaw] = await Promise.all([
        publicClient.readContract({
          address: addresses.shop,
          abi: SHOP_CONTRACT_ABI,
          functionName: "getCityPrices",
          args: [cityId],
        }),
        publicClient.readContract({
          address: addresses.shop,
          abi: SHOP_CONTRACT_ABI,
          functionName: "getShopItems",
          args: [cityId],
        }),
      ]);

      const { basePrices, ownerPrices } = parseCityPrices(cityPricesRaw);
      const { categoryIds, typeIds, stockAmounts, prices } = parseShopItems(shopItemsRaw);

      const items = new Map<number, ShopItemData>();
      for (let itemId = 0; itemId < 14; itemId++) {
        const categoryIdRaw = categoryIds[itemId] ?? BigInt(0);
        const typeIdRaw = typeIds[itemId] ?? BigInt(itemId);
        const stockAmountRaw = stockAmounts[itemId] ?? BigInt(0);
        const basePriceRaw = basePrices[itemId] ?? BigInt(0);
        const ownerPriceRaw = ownerPrices[itemId] ?? prices[itemId] ?? BigInt(0);
        const finalPriceRaw =
          prices[itemId] ?? (ownerPriceRaw > BigInt(0) ? ownerPriceRaw : basePriceRaw);

        const typeId = Number(typeIdRaw);
        items.set(itemId, {
          categoryId: Number(categoryIdRaw),
          typeId,
          stockAmount: Number(stockAmountRaw),
          basePrice: Number(formatEther(basePriceRaw)),
          ownerPrice: Number(formatEther(ownerPriceRaw)),
          price: Number(formatEther(finalPriceRaw)),
          basePriceRaw,
          ownerPriceRaw,
          priceRaw: finalPriceRaw,
        });
      }
      setShopItems(items);
    } catch (e) {
      console.error("Failed to fetch shop items", e);
    } finally {
      setShopFetching(false);
      setShopLoading(false);
    }
  }, [cityId, publicClient, addresses.shop]);

  useEffect(() => {
    if (cityId === undefined || !publicClient) return;
    setShopLoading(true);
    fetchShopItems();
    const id = setInterval(fetchShopItems, 30_000);
    return () => clearInterval(id);
  }, [cityId, publicClient, fetchShopItems]);

  // ---------- Fetch business items to identify shop owner ----------
  const fetchCityShopBusinessItems = useCallback(async () => {
    if (!inventoryReady || cityId === undefined || !addresses.inventory) {
      setCityShopBusinessItems([]);
      return;
    }

    const mafiaInventory = window.MafiaInventory;
    if (!mafiaInventory) return;

    try {
      const items = await mafiaInventory.getItemsByCategory({
        chain: chainConfig.id,
        contractAddress: addresses.inventory,
        categoryId: 4,
      });
      const filtered = items.filter(
        (item) => Number(item.typeId) === 1 && Number(item.cityId) === Number(cityId)
      );
      setCityShopBusinessItems(filtered);
    } catch (error) {
      console.error("Failed to fetch city business items:", error);
      setCityShopBusinessItems([]);
    }
  }, [inventoryReady, cityId, addresses.inventory, chainConfig.id]);

  useEffect(() => {
    void fetchCityShopBusinessItems();
  }, [fetchCityShopBusinessItems]);

  // ---------- Restock items ----------
  const {
    writeContract: writeRestock,
    data: restockHash,
    isPending: restockPending,
    error: restockError,
    reset: resetRestock,
  } = useChainWriteContract();

  const { isLoading: restockConfirming, isSuccess: restockSuccess } =
    useWaitForTransactionReceipt({ hash: restockHash });

  // ---------- Manage owner prices ----------
  const {
    writeContractAsync: writeUpdateCityCostPrice,
    data: updateCityPriceHash,
    isPending: updateCityPricePending,
  } = useChainWriteContract();
  const { isLoading: updateCityPriceConfirming } = useWaitForTransactionReceipt({
    hash: updateCityPriceHash,
  });
  const updateCityPriceLoading = updateCityPricePending || updateCityPriceConfirming;

  useEffect(() => {
    if (!manageDialogOpen) return;
    const nextEditable = SHOP_ITEMS.reduce<Record<number, string>>((acc, itemMeta) => {
      const data = shopItems.get(itemMeta.typeId);
      if (!data) return acc;
      acc[itemMeta.typeId] = String(getOwnerPriceOrBase(data));
      return acc;
    }, {});
    setEditableOwnerPrices(nextEditable);
  }, [manageDialogOpen, shopItems]);

  const handleOwnerPriceInputChange = (typeId: number, value: string) => {
    setEditableOwnerPrices((prev) => ({ ...prev, [typeId]: value }));
  };

  const handleSaveOwnerPrices = async () => {
    if (!address || cityId === undefined || !publicClient) return;

    const rawPrices: number[] = [];
    for (let itemId = 0; itemId < 14; itemId++) {
      const itemData = shopItems.get(itemId);
      if (!itemData) {
        rawPrices.push(0);
        continue;
      }

      const priceInput = editableOwnerPrices[itemId];
      const parsed = Number(priceInput);
      const normalized = Number.isFinite(parsed)
        ? Math.max(0, parsed)
        : getOwnerPriceOrBase(itemData);

      if (normalized < itemData.basePrice) {
        toast.error(`Price for typeId ${itemId} cannot be lower than base price.`);
        return;
      }
      rawPrices.push(normalized);
    }

    try {
      const parsedPrices = rawPrices.map((price) => parseEther(price.toString()));
      const txHash = await writeUpdateCityCostPrice({
        address: addresses.shop,
        abi: SHOP_CONTRACT_ABI,
        functionName: "updateCityCostPrice",
        args: [cityId, parsedPrices],
      });
      if (publicClient && txHash) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }
      toast.success("Shop owner prices updated.");
      setManageDialogOpen(false);
      await fetchShopItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update prices";
      if (!message.includes("User rejected")) {
        toast.error(message);
      }
    }
  };

  const handleRestock = () => {
    if (cityId === undefined) return;
    resetRestock();
    writeRestock({
      address: addresses.shop,
      abi: SHOP_CONTRACT_ABI,
      functionName: "restockItems",
      args: [cityId],
      gas: BigInt(500_000),
    });
  };

  const restockLoading = restockPending || restockConfirming;

  // ---------- Checkout (buyItems with arrays) ----------
  const [checkoutSigning, setCheckoutSigning] = useState(false);

  const {
    writeContract: writeBuy,
    data: buyHash,
    isPending: buyPending,
    error: buyError,
    reset: resetBuy,
  } = useChainWriteContract();

  const { isLoading: buyConfirming, isSuccess: buySuccess } =
    useWaitForTransactionReceipt({ hash: buyHash });

  const handleCheckout = async () => {
    if (!address || cartEntries.length === 0) return;
    resetBuy();
    setCheckoutSigning(true);
    try {
      const threeDaysInSeconds = 3 * 24 * 60 * 60;
      const utcTimestamp = Math.floor(Date.now() / 1000) + threeDaysInSeconds;
      const authMessage = `"Sign this message with ${address} - expire at ${utcTimestamp}"`;
      const signature = await signMessageAsync({ message: authMessage });
      setCheckoutSigning(false);

      const typeIds = cartEntries.map((e) => BigInt(e.typeId));
      const amounts = cartEntries.map((e) => BigInt(e.amount));

      writeBuy({
        address: addresses.shop,
        abi: SHOP_CONTRACT_ABI,
        functionName: "buyItems",
        args: [typeIds, amounts, authMessage, signature],
        gas: BigInt(1_000_000),
      });
    } catch {
      setCheckoutSigning(false);
    }
  };

  const checkoutLoading = checkoutSigning || buyPending || buyConfirming;

  // ---------- Cooldown: nextBuyTime ----------
  const { data: nextBuyTimeRaw } = useReadContract({
    address: addresses.shop,
    abi: SHOP_CONTRACT_ABI,
    functionName: "nextBuyTime",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 15_000,
    },
  });

  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    if (nextBuyTimeRaw === undefined) return;
    const cooldownEnd = Number(nextBuyTimeRaw) * 1000;
    const tick = () => {
      const diff = cooldownEnd - Date.now();
      setCooldownRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [nextBuyTimeRaw]);

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);
  const cooldownMinutes = Math.floor(cooldownSeconds / 60);
  const cooldownSecs = cooldownSeconds % 60;
  const cooldownReady = cooldownSeconds <= 0;
  const onCooldown = isConnected && !cooldownReady;

  // ---------- Toast notifications ----------
  const buyToastFired = useRef(false);
  useEffect(() => {
    if (buySuccess && buyHash && !buyToastFired.current) {
      buyToastFired.current = true;
      const itemNames = cartEntries
        .map((e) => {
          const meta = SHOP_ITEMS.find((i) => i.typeId === e.typeId);
          return `${e.amount}x ${meta?.name ?? `#${e.typeId}`}`;
        })
        .join(", ");
      toast.success(`Purchased ${itemNames}`);
      clearCart();
      fetchShopItems();
    }
    if (!buyHash) {
      buyToastFired.current = false;
    }
  }, [buySuccess, buyHash, cartEntries, fetchShopItems]);

  const restockToastFired = useRef(false);
  useEffect(() => {
    if (restockSuccess && restockHash && !restockToastFired.current) {
      restockToastFired.current = true;
      toast.success("Shop items restocked successfully");
      fetchShopItems();
    }
    if (!restockHash) {
      restockToastFired.current = false;
    }
  }, [restockSuccess, restockHash, fetchShopItems]);

  // ---------- Auth states ----------
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Store className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Shop</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to access the shop.
        </p>
      </div>
    );
  }

  if (authSigning) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Sign to Verify</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please sign the message in your wallet to load shop data.
        </p>
      </div>
    );
  }

  if (signError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">
          Signature Required
        </p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          A wallet signature is needed to verify your identity.
        </p>
        <button
          onClick={requestSignature}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign Message
        </button>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">
          Loading Profile...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span>Shop</span>
            <span className="rounded-md border border-border bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {cityName ?? "Loading city..."}
            </span>
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add items to your cart and buy them all in a single transaction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageShop && (
            <button
              type="button"
              onClick={() => setManageDialogOpen(true)}
              className="rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Manage Shop
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchShopItems()}
            disabled={shopFetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-50"
            aria-label="Refresh shop data"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", shopFetching && "animate-spin")}
            />
          </button>
        </div>
      </div>

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Shop Prices</DialogTitle>
            <DialogDescription>
              Only shop owners can update owner prices. Owner price cannot be lower
              than base price.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
            <div className="grid grid-cols-3 gap-2 border-b border-border bg-background/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Item</span>
              <span className="text-right">Base Price</span>
              <span className="text-right">Owner Price</span>
            </div>
            <div className="divide-y divide-border">
              {SHOP_ITEMS.map((itemMeta) => {
                const data = shopItems.get(itemMeta.typeId);
                if (!data) return null;

                const ownerInput =
                  editableOwnerPrices[itemMeta.typeId] ??
                  String(getOwnerPriceOrBase(data));

                return (
                  <div
                    key={itemMeta.typeId}
                    className="grid grid-cols-3 items-center gap-2 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {itemMeta.name}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        typeId: {itemMeta.typeId}
                      </p>
                    </div>
                    <p className="text-right font-mono text-xs tabular-nums text-foreground">
                      {data.basePrice.toLocaleString()}
                    </p>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={ownerInput}
                      onChange={(e) =>
                        handleOwnerPriceInputChange(itemMeta.typeId, e.target.value)
                      }
                      className="ml-auto h-8 w-28 rounded border border-border bg-background/60 px-2 text-right font-mono text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setManageDialogOpen(false)}
              disabled={updateCityPriceLoading}
              className="rounded-lg border border-border bg-background/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveOwnerPrices()}
              disabled={updateCityPriceLoading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {updateCityPriceLoading ? "Saving..." : "Save Prices"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* City & Cooldown */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <MapPin className="h-5 w-5 shrink-0 text-primary" />
          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm text-muted-foreground">Current City</span>
            <span className="text-sm font-semibold text-foreground">
              {cityName ?? "Loading..."}
              {cityId !== undefined && (
                <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                  (id: {cityId})
                </span>
              )}
            </span>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <Timer
              className={`h-5 w-5 shrink-0 ${cooldownReady ? "text-green-400" : "text-primary"}`}
            />
            <div className="flex flex-1 items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Next Purchase
              </span>
              {cooldownReady ? (
                <span className="font-mono text-sm font-semibold text-green-400">
                  Now
                </span>
              ) : (
                <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                  {cooldownMinutes}:{cooldownSecs.toString().padStart(2, "0")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== Shopping Cart ===== */}
      {cartEntries.length > 0 && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Cart ({cartItemCount} {cartItemCount === 1 ? "item" : "items"})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{cartTotalCost.toLocaleString()}</span> cash
                </p>
              </div>
            </div>
            <button
              onClick={clearCart}
              disabled={checkoutLoading}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-red-400 disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>

          {/* Cart items list */}
          <div className="mb-4 flex flex-col gap-2">
            {cartEntries.map((entry) => {
              const meta = SHOP_ITEMS.find((i) => i.typeId === entry.typeId);
              const data = shopItems.get(entry.typeId);
              const maxStock = data?.stockAmount ?? 0;
              const lineCost = data ? data.price * entry.amount : 0;

              return (
                <div
                  key={entry.typeId}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5"
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      CATEGORY_BG[meta?.category ?? "weapons"],
                      CATEGORY_COLORS[meta?.category ?? "weapons"]
                    )}
                  >
                    {CATEGORY_ICONS[meta?.category ?? "weapons"]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {meta?.name ?? `Item #${entry.typeId}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {data?.price.toLocaleString()} each
                    </p>
                  </div>

                  {/* Inline amount controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCartAmount(entry.typeId, entry.amount - 1)}
                      disabled={checkoutLoading}
                      className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background/50 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={maxStock}
                      value={entry.amount}
                      onChange={(e) =>
                        setCartAmount(entry.typeId, Number(e.target.value) || 0)
                      }
                      disabled={checkoutLoading}
                      className="h-6 w-10 rounded border border-border bg-background/50 text-center font-mono text-[10px] text-foreground outline-none focus:border-primary disabled:opacity-40"
                    />
                    <button
                      type="button"
                      onClick={() => setCartAmount(entry.typeId, entry.amount + 1)}
                      disabled={checkoutLoading || entry.amount >= maxStock}
                      className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background/50 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  <span className="w-16 text-right font-mono text-[10px] font-semibold text-foreground tabular-nums">
                    {lineCost.toLocaleString()}
                  </span>

                  <button
                    onClick={() => removeFromCart(entry.typeId)}
                    disabled={checkoutLoading}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-red-400 disabled:opacity-40"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Checkout transaction feedback */}
          {buySuccess && buyHash && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
              <span className="text-xs text-green-400">Purchase successful -</span>
              <a
                href={`${explorer}/tx/${buyHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
              >
                {buyHash.slice(0, 10)}...{buyHash.slice(-8)}
              </a>
            </div>
          )}

          {buyError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="line-clamp-2 text-[10px] text-red-400">
                {buyError.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : buyError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={onCooldown || checkoutLoading || cartEntries.length === 0}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200",
              !onCooldown && cartEntries.length > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {checkoutSigning
                  ? "Sign message..."
                  : buyPending
                    ? "Confirm in wallet..."
                    : "Confirming tx..."}
              </>
            ) : onCooldown ? (
              <>
                <Timer className="h-4 w-4" />
                Cooldown: {cooldownMinutes}:{cooldownSecs.toString().padStart(2, "0")}
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Checkout - {cartTotalCost.toLocaleString()} cash
              </>
            )}
          </button>
        </div>
      )}

      {/* ===== Approve Cash Spend Card ===== */}
      <div
        className={cn(
          "mb-5 rounded-xl border border-border bg-card p-6 transition-all duration-300",
          approveSuccess && "border-green-400/30",
          approveError && "border-red-400/30"
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
            <ShieldCheck className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Approve Cash Spend
            </h3>
            <p className="text-xs text-muted-foreground">
              Allow the Shop contract to spend your in-game cash
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-md bg-background/50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Function</span>
            <span className="font-mono text-[10px] text-primary">
              approveInGameCurrency(address, uint256)
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Spender</span>
            <span className="font-mono text-[10px] text-foreground">
              {addresses.shop.slice(0, 6)}...{addresses.shop.slice(-4)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Amount</span>
            <span className="font-mono text-[10px] text-foreground">
              100,000,000
            </span>
          </div>
        </div>

        {approveSuccess && approveHash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-400" />
            <span className="shrink-0 text-[10px] text-green-400 mr-1">
              Approved:
            </span>
            <a
              href={`${explorer}/tx/${approveHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
            >
              {approveHash.slice(0, 10)}...{approveHash.slice(-8)}
            </a>
          </div>
        )}

        {approveError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <p className="line-clamp-2 text-[10px] text-red-400">
              {approveError.message.includes("User rejected")
                ? "Approval rejected by user"
                : approveError.message.split("\n")[0]}
            </p>
          </div>
        )}

        <button
          onClick={handleApprove}
          disabled={!isConnected || approveLoading}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            isConnected
              ? "bg-yellow-500/90 text-white hover:bg-yellow-500 active:scale-[0.98] disabled:opacity-50"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {approveLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {approvePending ? "Confirm in wallet..." : "Confirming..."}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Approve Cash Spend
            </>
          )}
        </button>
      </div>

      {/* ===== Restock Card ===== */}
      <div
        className={cn(
          "mb-5 rounded-xl border border-border bg-card p-6 transition-all duration-300",
          restockSuccess && "border-green-400/30",
          restockError && "border-red-400/30"
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chain-accent/10">
            <RefreshCw className="h-5 w-5 text-chain-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Restock Items
            </h3>
            <p className="text-xs text-muted-foreground">
              Restock the shop using your current city location
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-md bg-background/50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Function</span>
            <span className="font-mono text-[10px] text-primary">
              restockItems(uint8)
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">City</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <MapPin className="h-3 w-3 text-primary" />
              {cityName ?? "Loading..."}
              {cityId !== undefined && (
                <span className="text-muted-foreground font-mono">
                  (id: {cityId})
                </span>
              )}
            </span>
          </div>
        </div>

        {restockSuccess && restockHash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
            <a
              href={`${explorer}/tx/${restockHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
            >
              {restockHash.slice(0, 10)}...{restockHash.slice(-8)}
            </a>
          </div>
        )}

        {restockError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <p className="line-clamp-2 text-[10px] text-red-400">
              {restockError.message.includes("User rejected")
                ? "Transaction rejected by user"
                : restockError.message.split("\n")[0]}
            </p>
          </div>
        )}

        <button
          onClick={handleRestock}
          disabled={!isConnected || restockLoading || cityId === undefined}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            isConnected && cityId !== undefined
              ? "bg-primary/90 text-primary-foreground hover:bg-primary active:scale-[0.98] disabled:opacity-50"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {restockLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {restockPending ? "Confirm in wallet..." : "Confirming..."}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Restock Items
            </>
          )}
        </button>
      </div>

      {/* Loading state */}
      {shopLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading shop items...
          </span>
        </div>
      )}

      {/* Category sections */}
      {!shopLoading && (
        <div className="flex flex-col gap-6">
          {SHOP_CATEGORIES.map((cat) => {
            const items = SHOP_ITEMS.filter((i) => i.category === cat.key);
            return (
              <div key={cat.key}>
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg",
                      CATEGORY_BG[cat.key],
                      CATEGORY_COLORS[cat.key]
                    )}
                  >
                    {CATEGORY_ICONS[cat.key]}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {cat.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({items.length} items)
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="hidden grid-cols-7 gap-3 border-b border-border bg-background/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                    <span className="col-span-2">Item</span>
                    <span className="text-right">Stock</span>
                    <span className="text-right">Base</span>
                    <span className="text-right">Final</span>
                    <span className="text-right">Counter</span>
                    <span className="text-right">Buy</span>
                  </div>

                  <div className="flex flex-col">
                    {items.map((meta, index) => {
                      const data = shopItems.get(meta.typeId);
                      const inCart = cart.get(meta.typeId) ?? 0;
                      const outOfStock = data !== undefined && data.stockAmount === 0;
                      const maxStock = data?.stockAmount ?? 0;
                      const canAdd = !outOfStock && !!data && inCart < maxStock;
                      const maxCanAdd = Math.max(0, maxStock - inCart);
                      const selAmount = getSelectedAmount(meta.typeId);

                      return (
                        <div
                          key={meta.typeId}
                          className={cn(
                            "grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-7 sm:items-center",
                            index !== items.length - 1 && "border-b border-border",
                            outOfStock && "opacity-55",
                            inCart > 0 && "bg-primary/5"
                          )}
                        >
                          <div className="sm:col-span-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md",
                                  CATEGORY_BG[meta.category],
                                  CATEGORY_COLORS[meta.category]
                                )}
                              >
                                {CATEGORY_ICONS[meta.category]}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {meta.name}
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  typeId: {meta.typeId}
                                </p>
                              </div>
                            </div>
                          </div>

                          {data ? (
                            <>
                              <p className="text-right font-mono text-xs tabular-nums text-foreground">
                                {data.stockAmount.toLocaleString()}
                              </p>
                              <p className="text-right font-mono text-xs tabular-nums text-foreground">
                                {data.basePrice.toLocaleString()}
                              </p>
                              <p className="text-right font-mono text-xs font-semibold tabular-nums text-primary">
                                {data.price.toLocaleString()}
                              </p>
                            </>
                          ) : (
                            <div className="sm:col-span-4 flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading pricing...
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 sm:col-span-2">
                            {canAdd ? (
                              <>
                                <input
                                  type="number"
                                  min="1"
                                  max={maxCanAdd}
                                  value={selAmount}
                                  onChange={(e) =>
                                    setSelectedAmount(
                                      meta.typeId,
                                      Number(e.target.value) || 1
                                    )
                                  }
                                  className="h-7 w-12 rounded border border-border bg-background/50 text-center font-mono text-xs text-foreground outline-none focus:border-primary"
                                />
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {outOfStock ? "Out of stock" : "Max in cart"}
                              </span>
                            )}

                            <button
                              onClick={() => addToCart(meta.typeId, canAdd ? selAmount : 1)}
                              disabled={!canAdd}
                              className={cn(
                                "ml-1 flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200",
                                canAdd
                                  ? "bg-primary/90 text-primary-foreground hover:bg-primary active:scale-[0.98]"
                                  : "bg-secondary text-muted-foreground cursor-not-allowed"
                              )}
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
