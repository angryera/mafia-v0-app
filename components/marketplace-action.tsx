"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import {
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
  useBalance,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  INVENTORY_MARKETPLACE_ABI,
  MARKETPLACE_CATEGORY_NAMES,
  MARKETPLACE_ITEM_NAMES,
  ERC20_ABI,
  INGAME_CURRENCY_ABI,
} from "@/lib/contract";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import {
  Loader2,
  Store,
  AlertCircle,
  RefreshCw,
  Clock,
  Tag,
  Gavel,
  User,
  Filter,
  ArrowUpDown,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Coins,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Timer,
  Plus,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEther, parseEther, formatUnits, parseUnits, maxUint256 } from "viem";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// ── Types ───────────────────────────────────────────────────────
interface InventoryMarketplaceBid {
  buyer: `0x${string}`;
  price: bigint;
  amount: bigint;
  timestamp: bigint;
}

interface InventoryMarketplaceItem {
  categoryId: number;
  typeId: number;
  owner: `0x${string}`;
}

interface InventoryMarketplaceListing {
  listingId: number;
  itemId: number;
  listingType: number; // 0: fixed, 1: auction
  startingPrice: bigint;
  currentPrice: bigint;
  timestamp: bigint;
  expiresAt: bigint;
  token: `0x${string}`;
  seller: `0x${string}`;
  buyer: `0x${string}`;
  status: number; // 0: open, 1: sold, 2: canceled
  bids: InventoryMarketplaceBid[];
  item: InventoryMarketplaceItem;
}

interface SwapToken {
  name: string;
  decimal: number;
  tokenAddress: `0x${string}`;
  isStable: boolean;
  isEnabled: boolean;
  price: bigint;
  tokenId: number;
}

// Inventory item from MafiaInventory SDK
interface SDKInventoryItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId?: number;
  [key: string]: any; // Allow additional properties
}

// Categories that cannot be listed
const NON_LISTABLE_CATEGORIES = new Set([0]); // Category 0 is often cash/special

// ── Constants ───────────────────────────────────────────────────
const GAME_CASH_ADDRESS = "0x0000000000000000000000000000000000000001" as `0x${string}`;
/** `purchaseFixedItem` / `bidOnAuctionItem` swap index for Game Cash (not listed in swap tokens). */
const GAME_CASH_MARKETPLACE_SWAP_TOKEN_ID = 0;
const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

const LISTING_TYPE_LABELS: Record<number, string> = {
  0: "Fixed Price",
  1: "Auction",
};

/** Listing duration choices (days); contract expects seconds. */
const DURATION_OPTIONS = [
  { label: "0.5 days", value: "0.5" },
  { label: "3 days", value: "3" },
  { label: "12 days", value: "12" },
  { label: "72 days", value: "72" },
] as const;

function durationDaysToSeconds(days: string): bigint {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return BigInt(0);
  return BigInt(Math.round(n * 86400));
}

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Sold",
  2: "Canceled",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "ending_soon", label: "Ending Soon" },
];

const LISTINGS_PER_PAGE = 10;

/** Page numbers plus ellipsis gaps, e.g. 1, 2, …, 27, 28 */
type MarketplacePaginationItem = number | "ellipsis";

function getMarketplacePaginationItems(
  current: number,
  total: number
): MarketplacePaginationItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(2);
  pages.add(total - 1);
  pages.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: MarketplacePaginationItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      out.push("ellipsis");
    }
    out.push(sorted[i]!);
  }
  return out;
}

// ── Helpers ─────────────────────────────────────────────────────
/** 10^decimals as bigint — avoids `BigInt(10 ** 18)` (unsafe JS Number) and `10n **` (older TS targets). */
function pow10BigInt(decimals: number): bigint {
  let r = BigInt(1);
  const ten = BigInt(10);
  for (let i = 0; i < decimals; i++) r *= ten;
  return r;
}

function formatTimeRemaining(expiresAt: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(expiresAt) - now;
  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function isExpired(expiresAt: bigint): boolean {
  return Number(expiresAt) <= Math.floor(Date.now() / 1000);
}

function addressEquals(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

function getItemName(categoryId: number, typeId: number): string {
  const categoryItems = MARKETPLACE_ITEM_NAMES[categoryId];
  const categoryName = MARKETPLACE_CATEGORY_NAMES[categoryId] ?? `Category ${categoryId}`;

  if (categoryItems && categoryItems[typeId] !== undefined) {
    return categoryItems[typeId];
  }

  return `${categoryName} #${typeId}`;
}

// Integer-safe next bid calculation: +5% minimum
function calculateNextBid(currentPrice: bigint): bigint {
  return (currentPrice * BigInt(105)) / BigInt(100);
}

// Format price: USD for Native/MAFIA, actual amount for Game Cash
function formatPrice(
  price: bigint,
  token: `0x${string}`,
  tokenInfo: { name: string; decimal: number; isNative: boolean }
): string {
  const isGameCash = token.toLowerCase() === GAME_CASH_ADDRESS.toLowerCase();
  const amount = Number(formatUnits(price, tokenInfo.decimal));

  if (isGameCash) {
    // Game Cash: show actual amount
    return `${amount.toLocaleString()} Cash`;
  } else {
    // Native/MAFIA: price is in USD (18 decimals = $1)
    return `$${amount.toFixed(2)}`;
  }
}

function isGameCashToken(token: `0x${string}`): boolean {
  return token.toLowerCase() === GAME_CASH_ADDRESS.toLowerCase();
}

// ── Main Component ──────────────────────────────────────────────
export function MarketplaceAction() {
  const { chainConfig } = useChain();
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // ── Listings State ────────────────────────────────────────────
  const [listings, setListings] = useState<InventoryMarketplaceListing[]>([]);
  const [listingIds, setListingIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Swap Tokens ───────────────────────────────────────────────
  const [swapTokens, setSwapTokens] = useState<SwapToken[]>([]);

  // ── Filters ───────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterListingType, setFilterListingType] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<number>(0); // Default to open
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showMyListings, setShowMyListings] = useState(false);
  const [listingsPage, setListingsPage] = useState(1);

  // ── Selected Listing (Detail Modal) ───────────────────────────
  const [selectedListing, setSelectedListing] = useState<InventoryMarketplaceListing | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Create Listing Modal ──────────────────────────────────────
  const [createListingOpen, setCreateListingOpen] = useState(false);

  // ── Fetch Listings ────────────────────────────────────────────
  const fetchListings = useCallback(async () => {
    setRefreshing(true);
    try {
      if (
        typeof window !== "undefined" &&
        (window as any).MafiaInventoryMarketplace?.getActiveListings
      ) {
        const result = await (window as any).MafiaInventoryMarketplace.getActiveListings({
          chain: chainConfig.id,
          pageSize: 100,
        });

        // result is an array of listings directly
        if (result && Array.isArray(result)) {
          const mapped: InventoryMarketplaceListing[] = result.map(
            (item: any) => ({
              listingId: Number(item.listingId),
              itemId: Number(item.itemId),
              listingType: Number(item.listingType),
              startingPrice: BigInt(item.startingPrice ?? 0),
              currentPrice: BigInt(item.currentPrice ?? item.startingPrice ?? 0),
              timestamp: BigInt(item.timestamp ?? 0),
              expiresAt: BigInt(item.expiresAt ?? 0),
              token: item.token as `0x${string}`,
              seller: item.seller as `0x${string}`,
              buyer: (item.buyer ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
              status: Number(item.status ?? 0),
              bids: (item.bids || []).map((bid: any) => ({
                buyer: bid.buyer as `0x${string}`,
                price: BigInt(bid.price ?? 0),
                amount: BigInt(bid.amount ?? 0),
                timestamp: BigInt(bid.timestamp ?? 0),
              })),
              item: {
                categoryId: Number(item.item?.categoryId ?? item.categoryId ?? 0),
                typeId: Number(item.item?.typeId ?? item.typeId ?? 0),
                owner: (item.item?.owner ?? item.seller) as `0x${string}`,
              },
            })
          );
          setListings(mapped);
          setListingIds(mapped.map((l) => Number(l.listingId)));
          setError(null);
        }
      } else {
        setError("Marketplace SDK not available");
      }
    } catch (err) {
      console.error("Failed to fetch listings:", err);
      setError("Failed to load listings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chainConfig.id]);

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 30_000);
    return () => clearInterval(interval);
  }, [fetchListings]);

  // ── Fetch Swap Tokens ─────────────────────────────────────────
  const { data: swapTokensRaw } = useReadContract({
    address: addresses.inventoryMarketplace,
    abi: INVENTORY_MARKETPLACE_ABI,
    functionName: "getSwapTokens",
    chainId: chainConfig.wagmiChainId,
  });

  useEffect(() => {
    if (swapTokensRaw) {
      const result = swapTokensRaw as unknown as readonly [
        readonly {
          name: string;
          decimal: number;
          tokenAddress: `0x${string}`;
          price: bigint;
          isStable: boolean;
          isEnabled: boolean;
        }[],
        readonly bigint[],
      ];
      if (!result[0] || !result[1]) return;
      const mapped: SwapToken[] = result[0].map((t, index) => ({
        name: t.name,
        tokenAddress: t.tokenAddress,
        isStable: t.isStable,
        isEnabled: t.isEnabled,
        price: result[1][index],
        decimal: Number(t.decimal),
        tokenId: index,
      }));
      setSwapTokens(mapped.filter((t) => t.isEnabled));
    }
  }, [swapTokensRaw]);

  // ── Filtered & Sorted Listings ────────────────────────────────
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Filter by status
    if (filterStatus !== null) {
      result = result.filter((l) => l.status === filterStatus);
    }

    // Filter by category
    if (filterCategory !== null) {
      result = result.filter((l) => l.item.categoryId === filterCategory);
    }

    // Filter by listing type
    if (filterListingType !== null) {
      result = result.filter((l) => l.listingType === filterListingType);
    }

    // Filter by my listings
    if (showMyListings && address) {
      result = result.filter((l) => addressEquals(l.seller, address));
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return Number(b.timestamp - a.timestamp);
        case "oldest":
          return Number(a.timestamp - b.timestamp);
        case "price_asc":
          return Number(a.currentPrice - b.currentPrice);
        case "price_desc":
          return Number(b.currentPrice - a.currentPrice);
        case "ending_soon":
          return Number(a.expiresAt - b.expiresAt);
        default:
          return 0;
      }
    });

    return result;
  }, [listings, filterCategory, filterListingType, filterStatus, sortBy, showMyListings, address]);

  const listingsTotalPages = Math.max(
    1,
    Math.ceil(filteredListings.length / LISTINGS_PER_PAGE)
  );

  const paginatedListings = useMemo(() => {
    const start = (listingsPage - 1) * LISTINGS_PER_PAGE;
    return filteredListings.slice(start, start + LISTINGS_PER_PAGE);
  }, [filteredListings, listingsPage]);

  const marketplacePaginationItems = useMemo(
    () => getMarketplacePaginationItems(listingsPage, listingsTotalPages),
    [listingsPage, listingsTotalPages]
  );

  useEffect(() => {
    setListingsPage(1);
  }, [filterCategory, filterListingType, filterStatus, sortBy, showMyListings, address]);

  useEffect(() => {
    if (listingsPage > listingsTotalPages) {
      setListingsPage(listingsTotalPages);
    }
  }, [listingsPage, listingsTotalPages]);

  // ── Refresh Selected Listing ──────────────────────────────────
  const refreshSelectedListing = useCallback(() => {
    if (selectedListing) {
      const updated = listings.find((l) => l.listingId === selectedListing.listingId);
      if (updated) {
        setSelectedListing(updated);
      }
    }
  }, [listings, selectedListing]);

  useEffect(() => {
    refreshSelectedListing();
  }, [listings, refreshSelectedListing]);

  // ── Token Info Helper ─────────────────────────────────────────
  const getTokenInfo = useCallback(
    (tokenAddress: `0x${string}`) => {
      if (isGameCashToken(tokenAddress)) {
        return { name: "Game Cash", decimal: 18, isNative: false };
      }
      const isNative =
        tokenAddress === "0x0000000000000000000000000000000000000000"
      if (isNative) {
        return { name: chainConfig.id === "bnb" ? "BNB" : "PLS", decimal: 18, isNative: true };
      }
      const token = swapTokens.find(
        (t) => t.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
      );
      return token
        ? { name: token.name, decimal: token.decimal, isNative: false }
        : { name: "Token", decimal: 18, isNative: false };
    },
    [swapTokens, chainConfig.id]
  );

  // ── Loading State ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Loading Marketplace</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Fetching active listings...
        </p>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">Error</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{error}</p>
        <button
          onClick={fetchListings}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Marketplace</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Browse and trade inventory items
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Button
              size="sm"
              onClick={() => setCreateListingOpen(true)}
              className="h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create Listing
            </Button>
          )}
          <button
            type="button"
            onClick={fetchListings}
            disabled={refreshing}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-50"
            aria-label="Refresh listings"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* My Listings Toggle */}
        {isConnected && (
          <button
            onClick={() => setShowMyListings(!showMyListings)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              showMyListings
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-3.5 w-3.5" />
            My Listings
          </button>
        )}

        {/* Category Filter */}
        <div className="relative">
          <select
            value={filterCategory ?? ""}
            onChange={(e) =>
              setFilterCategory(e.target.value ? Number(e.target.value) : null)
            }
            className="h-9 appearance-none rounded-lg border border-border bg-background/50 pl-3 pr-8 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">All Categories</option>
            {Object.entries(MARKETPLACE_CATEGORY_NAMES).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Listing Type Filter */}
        <div className="relative">
          <select
            value={filterListingType ?? ""}
            onChange={(e) =>
              setFilterListingType(e.target.value ? Number(e.target.value) : null)
            }
            className="h-9 appearance-none rounded-lg border border-border bg-background/50 pl-3 pr-8 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="0">Fixed Price</option>
            <option value="1">Auction</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-border bg-background/50 pl-3 pr-8 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Result Count */}
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Listings List */}
      {filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <Package className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">No Listings</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {showMyListings
              ? "You have no active listings"
              : "No listings match your filters"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* List Header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2.5 bg-secondary/30 text-xs font-medium text-muted-foreground border-b border-border">
            <div className="col-span-4">Item</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Time</div>
            <div className="col-span-2 text-right">Seller</div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-border">
            {paginatedListings.map((listing) => {
              const tokenInfo = getTokenInfo(listing.token);
              const itemName = getItemName(listing.item.categoryId, listing.item.typeId);
              const categoryName = MARKETPLACE_CATEGORY_NAMES[listing.item.categoryId] ?? "Item";
              const expired = isExpired(listing.expiresAt);
              const isSeller = addressEquals(listing.seller, address);

              return (
                <button
                  key={listing.listingId}
                  onClick={() => {
                    setSelectedListing(listing);
                    setDetailOpen(true);
                  }}
                  className="w-full flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/20"
                >
                  {/* Item Info */}
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <Package className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{itemName}</p>
                      <p className="text-[10px] text-muted-foreground">{categoryName}</p>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div className="col-span-2 flex items-center">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        listing.listingType === 1
                          ? "bg-amber-400/10 text-amber-400"
                          : "bg-blue-400/10 text-blue-400"
                      )}
                    >
                      {LISTING_TYPE_LABELS[listing.listingType]}
                    </span>
                    {listing.listingType === 1 && listing.bids.length > 0 && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">
                        ({listing.bids.length})
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="col-span-2 flex items-center justify-between sm:justify-end">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      {listing.listingType === 1 ? "Bid:" : "Price:"}
                    </span>
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {formatPrice(listing.currentPrice, listing.token, tokenInfo)}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="col-span-2 flex items-center justify-between sm:justify-end">
                    <span className="text-xs text-muted-foreground sm:hidden">Time:</span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        expired ? "text-red-400" : "text-green-400"
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {expired ? "Expired" : formatTimeRemaining(listing.expiresAt)}
                    </span>
                  </div>

                  {/* Seller */}
                  <div className="col-span-2 flex items-center justify-between sm:justify-end">
                    <span className="text-xs text-muted-foreground sm:hidden">Seller:</span>
                    <span className={cn(
                      "text-xs",
                      isSeller ? "text-primary font-medium" : "text-muted-foreground"
                    )}>
                      {isSeller ? "You" : `${listing.seller.slice(0, 6)}...`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {listingsTotalPages > 1 && (
            <nav
              className="flex flex-col gap-3 border-t border-border bg-secondary/20 px-3 py-3 sm:px-4"
              aria-label="Listing pagination"
            >
              <p className="text-center text-xs tabular-nums text-muted-foreground">
                Page {listingsPage} of {listingsTotalPages}
                <span className="hidden sm:inline">
                  {" "}
                  · {(listingsPage - 1) * LISTINGS_PER_PAGE + 1}–
                  {Math.min(listingsPage * LISTINGS_PER_PAGE, filteredListings.length)} of{" "}
                  {filteredListings.length}
                </span>
              </p>
              <div className="flex w-full items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setListingsPage((p) => Math.max(1, p - 1))}
                  disabled={listingsPage === 1}
                  aria-label="Go to previous page"
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-background/80 px-2 text-sm font-medium transition-colors sm:px-3",
                    listingsPage === 1
                      ? "pointer-events-none opacity-40"
                      : "hover:bg-secondary"
                  )}
                >
                  <ChevronLeft className="h-4 w-4 sm:-ml-0.5" />
                  <span className="hidden sm:inline sm:ml-1">Previous</span>
                </button>
                <div
                  className={cn(
                    "min-h-9 min-w-0 flex-1 overflow-x-auto overflow-y-hidden py-0.5",
                    "[scrollbar-width:thin] [scrollbar-color:hsl(220_14%_28%/0.5)_transparent]"
                  )}
                >
                  <div className="mx-auto flex w-max max-w-none flex-nowrap items-center justify-center gap-0.5 sm:gap-1">
                    {marketplacePaginationItems.map((item, idx) =>
                      item === "ellipsis" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center text-sm text-muted-foreground select-none"
                          aria-hidden
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setListingsPage(item)}
                          aria-label={`Page ${item}`}
                          aria-current={item === listingsPage ? "page" : undefined}
                          className={cn(
                            "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md px-2 text-sm font-medium tabular-nums transition-colors",
                            item === listingsPage
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setListingsPage((p) => Math.min(listingsTotalPages, p + 1))}
                  disabled={listingsPage === listingsTotalPages}
                  aria-label="Go to next page"
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-background/80 px-2 text-sm font-medium transition-colors sm:px-3",
                    listingsPage === listingsTotalPages
                      ? "pointer-events-none opacity-40"
                      : "hover:bg-secondary"
                  )}
                >
                  <span className="hidden sm:inline sm:mr-1">Next</span>
                  <ChevronRight className="h-4 w-4 sm:-mr-0.5" />
                </button>
              </div>
            </nav>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <ListingDetailModal
        listing={selectedListing}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSuccess={() => {
          fetchListings();
          setDetailOpen(false);
        }}
        getTokenInfo={getTokenInfo}
        swapTokens={swapTokens}
      />

      {/* Create Listing Modal */}
      <CreateListingModal
        open={createListingOpen}
        onOpenChange={setCreateListingOpen}
        onSuccess={() => {
          fetchListings();
          setCreateListingOpen(false);
        }}
        chainId={chainConfig.id}
        addresses={addresses}
      />
    </div>
  );
}

// ── Listing Detail Modal ────────────────────────────────────────
interface ListingDetailModalProps {
  listing: InventoryMarketplaceListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  getTokenInfo: (token: `0x${string}`) => { name: string; decimal: number; isNative: boolean };
  swapTokens: SwapToken[];
}

function ListingDetailModal({
  listing,
  open,
  onOpenChange,
  onSuccess,
  getTokenInfo,
  swapTokens,
}: ListingDetailModalProps) {
  const { address, isConnected } = useAccount();
  const { authData } = useAuth();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // ── Action States ─────────────────────────────────────────────
  const [bidAmount, setBidAmount] = useState("");
  const [selectedSwapTokenId, setSelectedSwapTokenId] = useState<number>(0);
  const [isApproved, setIsApproved] = useState(false);

  // Find native, mafia, and stablecoin tokens for payment selection
  const nativeToken = swapTokens.find((t) => t.tokenAddress === NATIVE_ADDRESS);
  const mafiaToken = swapTokens.find(
    (t) => t.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase()
  );
  // Find stablecoin tokens (USDT, USDC) for purchase payments
  const stableTokens = swapTokens.filter((t) => t.isStable);
  const selectedPaymentToken = swapTokens.find((t) => t.tokenId === selectedSwapTokenId);
  const listingPricedInGameCash = Boolean(listing && isGameCashToken(listing.token));

  // Calculate token amount from USD price (18-dec) and swap oracle price (same as contract convention).
  const calculateTokenAmountFloor = useCallback(
    (usdPrice: bigint, paymentToken: SwapToken | undefined): bigint => {
      if (!paymentToken || paymentToken.price === BigInt(0)) return BigInt(0);
      const scale = pow10BigInt(Number(paymentToken.decimal));
      return (usdPrice * scale) / paymentToken.price;
    },
    []
  );

  /** Ceil division so allowance ≥ amount the market may pull (floor + mismatch → BEP20 #1002). */
  const calculateTokenAmountCeil = useCallback(
    (usdPrice: bigint, paymentToken: SwapToken | undefined): bigint => {
      if (!paymentToken || paymentToken.price === BigInt(0)) return BigInt(0);
      const scale = pow10BigInt(Number(paymentToken.decimal));
      const num = usdPrice * scale;
      const den = paymentToken.price;
      return (num + den - BigInt(1)) / den;
    },
    []
  );

  // Calculate the token amount needed for purchase (game cash listings: price is already in cash units)
  const requiredTokenAmount = useMemo(() => {
    if (!listing) return BigInt(0);
    if (isGameCashToken(listing.token)) return listing.currentPrice;
    if (!selectedPaymentToken) return BigInt(0);
    // Native value: floor matches typical “exact” listing math; ERC20/stables: ceil prevents under-approve.
    if (selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) {
      return calculateTokenAmountFloor(listing.currentPrice, selectedPaymentToken);
    }
    return calculateTokenAmountCeil(listing.currentPrice, selectedPaymentToken) * BigInt(105) / BigInt(100);
  }, [
    listing,
    selectedPaymentToken,
    calculateTokenAmountFloor,
    calculateTokenAmountCeil,
  ]);

  // For MAFIA token, add 5% extra for buy/sell fee (ERC20 path only)
  const requiredApprovalAmount = useMemo(() => {
    if (listingPricedInGameCash || !selectedPaymentToken) return BigInt(0);
    const isMafia =
      selectedPaymentToken.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase();
    if (isMafia) {
      return (requiredTokenAmount * BigInt(105)) / BigInt(100);
    }
    return requiredTokenAmount;
  }, [listingPricedInGameCash, requiredTokenAmount, selectedPaymentToken, addresses.mafia]);

  /** Minimum balance needed to complete a fixed-price buy (native: exact send; ERC20: includes MAFIA fee buffer). */
  const buyBalanceRequired = useMemo(() => {
    if (listingPricedInGameCash) {
      if (!listing) return BigInt(0);
      return listing.currentPrice;
    }
    if (!selectedPaymentToken) return BigInt(0);
    if (selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) return requiredTokenAmount;
    return requiredApprovalAmount;
  }, [
    listing,
    listingPricedInGameCash,
    selectedPaymentToken,
    requiredTokenAmount,
    requiredApprovalAmount,
  ]);

  const payWithNative =
    !listingPricedInGameCash && selectedPaymentToken?.tokenAddress === NATIVE_ADDRESS;
  const payWithErc20 =
    !listingPricedInGameCash &&
    !!selectedPaymentToken &&
    selectedPaymentToken.tokenAddress !== NATIVE_ADDRESS;

  const { data: nativeWalletBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: chainConfig.wagmiChainId,
    query: {
      enabled: !!open && !!address && payWithNative,
    },
  });

  const { data: erc20BalanceRaw, refetch: refetchErc20Balance } = useReadContract({
    address: selectedPaymentToken?.tokenAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!open && !!address && payWithErc20,
    },
  });

  const { data: gameCashBalanceRaw, refetch: refetchGameCashBalance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: {
      enabled:
        !!open &&
        !!address &&
        !!authData &&
        listingPricedInGameCash,
    },
  });

  const buyBalanceSufficient = useMemo(() => {
    if (buyBalanceRequired <= BigInt(0)) return true;
    if (listingPricedInGameCash) {
      if (!authData) return false;
      if (gameCashBalanceRaw === undefined) return false;
      return (gameCashBalanceRaw as bigint) >= buyBalanceRequired;
    }
    if (!selectedPaymentToken) return false;
    if (selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) {
      if (nativeWalletBalance === undefined) return false;
      return nativeWalletBalance.value >= buyBalanceRequired;
    }
    if (erc20BalanceRaw === undefined) return false;
    return (erc20BalanceRaw as bigint) >= buyBalanceRequired;
  }, [
    buyBalanceRequired,
    listingPricedInGameCash,
    authData,
    gameCashBalanceRaw,
    selectedPaymentToken,
    nativeWalletBalance,
    erc20BalanceRaw,
  ]);

  // ── ERC20 Allowance Check ─────────────────────────────────────
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: selectedPaymentToken?.tokenAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && selectedPaymentToken?.tokenAddress
      ? [address, addresses.inventoryMarketplace]
      : undefined,
    query: {
      enabled:
        !!address &&
        !listingPricedInGameCash &&
        !!selectedPaymentToken &&
        selectedPaymentToken.tokenAddress !== NATIVE_ADDRESS,
    },
  });

  // ERC20 / native readiness (Game Cash uses InGameCurrency approve instead)
  useEffect(() => {
    if (listingPricedInGameCash) return;
    if (!selectedPaymentToken || selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) {
      setIsApproved(true);
      return;
    }
    const allowance = allowanceRaw as bigint | undefined;
    setIsApproved(!!allowance && allowance >= requiredApprovalAmount);
  }, [listingPricedInGameCash, allowanceRaw, requiredApprovalAmount, selectedPaymentToken]);

  // ── Write Contracts ───────────────────────────────────────────
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const {
    writeContract: writeApproveCashSpend,
    data: cashSpendApproveHash,
    isPending: cashSpendApprovePending,
    reset: resetApproveCashSpend,
  } = useChainWriteContract();

  const { isLoading: cashSpendApproveConfirming, isSuccess: cashSpendApproveSuccess } =
    useWaitForTransactionReceipt({ hash: cashSpendApproveHash });

  const {
    writeContract: writeBuy,
    data: buyHash,
    isPending: buyPending,
    error: buyError,
    reset: resetBuy,
  } = useChainWriteContract();

  const { isLoading: buyConfirming, isSuccess: buySuccess } =
    useWaitForTransactionReceipt({ hash: buyHash });

  const {
    writeContract: writeBid,
    data: bidHash,
    isPending: bidPending,
    error: bidError,
    reset: resetBid,
  } = useChainWriteContract();

  const { isLoading: bidConfirming, isSuccess: bidSuccess } =
    useWaitForTransactionReceipt({ hash: bidHash });

  const {
    writeContract: writeCancel,
    data: cancelHash,
    isPending: cancelPending,
    error: cancelError,
    reset: resetCancel,
  } = useChainWriteContract();

  const { isLoading: cancelConfirming, isSuccess: cancelSuccess } =
    useWaitForTransactionReceipt({ hash: cancelHash });

  const {
    writeContract: writeFinish,
    data: finishHash,
    isPending: finishPending,
    error: finishError,
    reset: resetFinish,
  } = useChainWriteContract();

  const { isLoading: finishConfirming, isSuccess: finishSuccess } =
    useWaitForTransactionReceipt({ hash: finishHash });

  // ── Success Handlers ──────────────────────────────���───────────
  const approveToastFired = useRef(false);
  useEffect(() => {
    if (approveSuccess && approveHash && !approveToastFired.current) {
      approveToastFired.current = true;
      toast.success("Token approved successfully!");
      refetchAllowance();
    }
    if (!approveHash) approveToastFired.current = false;
  }, [approveSuccess, approveHash, refetchAllowance]);

  const cashSpendToastFired = useRef(false);
  useEffect(() => {
    if (
      cashSpendApproveSuccess &&
      cashSpendApproveHash &&
      !cashSpendToastFired.current
    ) {
      cashSpendToastFired.current = true;
      toast.success("Game Cash spend approved for marketplace");
    }
    if (!cashSpendApproveHash) cashSpendToastFired.current = false;
  }, [cashSpendApproveSuccess, cashSpendApproveHash]);

  const buyToastFired = useRef(false);
  useEffect(() => {
    if (buySuccess && buyHash && !buyToastFired.current) {
      buyToastFired.current = true;
      toast.success("Item purchased successfully!");
      void refetchErc20Balance();
      void refetchGameCashBalance();
      void refetchNativeBalance();
      onSuccess();
    }
    if (!buyHash) buyToastFired.current = false;
  }, [
    buySuccess,
    buyHash,
    onSuccess,
    refetchErc20Balance,
    refetchGameCashBalance,
    refetchNativeBalance,
  ]);

  const bidToastFired = useRef(false);
  useEffect(() => {
    if (bidSuccess && bidHash && !bidToastFired.current) {
      bidToastFired.current = true;
      toast.success("Bid placed successfully!");
      onSuccess();
    }
    if (!bidHash) bidToastFired.current = false;
  }, [bidSuccess, bidHash, onSuccess]);

  const cancelToastFired = useRef(false);
  useEffect(() => {
    if (cancelSuccess && cancelHash && !cancelToastFired.current) {
      cancelToastFired.current = true;
      toast.success("Listing canceled successfully!");
      onSuccess();
    }
    if (!cancelHash) cancelToastFired.current = false;
  }, [cancelSuccess, cancelHash, onSuccess]);

  const finishToastFired = useRef(false);
  useEffect(() => {
    if (finishSuccess && finishHash && !finishToastFired.current) {
      finishToastFired.current = true;
      toast.success("Auction completed successfully!");
      onSuccess();
    }
    if (!finishHash) finishToastFired.current = false;
  }, [finishSuccess, finishHash, onSuccess]);

  // ── Reset on close ────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setBidAmount("");
      setSelectedSwapTokenId(0);
      resetApprove();
      resetApproveCashSpend();
      resetBuy();
      resetBid();
      resetCancel();
      resetFinish();
    }
  }, [open, resetApprove, resetApproveCashSpend, resetBuy, resetBid, resetCancel, resetFinish]);

  // Default payment token for USD listings (Game Cash listings do not use swap token picker)
  useEffect(() => {
    if (!open || !listing || isGameCashToken(listing.token)) return;
    const native = swapTokens.find((t) => t.tokenAddress === NATIVE_ADDRESS);
    setSelectedSwapTokenId(native?.tokenId ?? swapTokens[0]?.tokenId ?? 0);
  }, [open, listing?.listingId, listing?.token, swapTokens]);

  if (!listing) return null;

  const tokenInfo = getTokenInfo(listing.token);
  const itemName = getItemName(listing.item.categoryId, listing.item.typeId);
  const categoryName = MARKETPLACE_CATEGORY_NAMES[listing.item.categoryId] ?? "Item";
  const expired = isExpired(listing.expiresAt);
  const isSeller = addressEquals(listing.seller, address);
  const isOpen = listing.status === 0;
  const isAuction = listing.listingType === 1;

  // Next bid: `currentPrice` is Game Cash wei, or USD (18-dec) for native/MAFIA/stables — convert to pay-token units.
  const nextBidWei = calculateNextBid(listing.currentPrice);
  const bidPayIsErc20 =
    !listingPricedInGameCash &&
    !!selectedPaymentToken &&
    selectedPaymentToken.tokenAddress !== NATIVE_ADDRESS;

  const minBidAsPayTokenWei = listingPricedInGameCash
    ? nextBidWei
    : !selectedPaymentToken
      ? BigInt(0)
      : selectedPaymentToken.tokenAddress === NATIVE_ADDRESS
        ? calculateTokenAmountFloor(nextBidWei, selectedPaymentToken)
        : (calculateTokenAmountCeil(nextBidWei, selectedPaymentToken) * BigInt(105)) /
        BigInt(100);

  const bidParseDecimals = listingPricedInGameCash
    ? 18
    : (selectedPaymentToken?.decimal ?? 18);

  let parsedBidWeiForAllowance = BigInt(0);
  if (bidAmount?.trim()) {
    try {
      parsedBidWeiForAllowance = parseUnits(bidAmount, bidParseDecimals);
    } catch {
      parsedBidWeiForAllowance = BigInt(0);
    }
  }

  const bidApprovalThreshold = !bidPayIsErc20
    ? BigInt(0)
    : parsedBidWeiForAllowance > BigInt(0)
      ? (parsedBidWeiForAllowance >= minBidAsPayTokenWei
        ? parsedBidWeiForAllowance
        : minBidAsPayTokenWei)
      : minBidAsPayTokenWei;

  const allowanceBn = (allowanceRaw as bigint | undefined) ?? BigInt(0);

  const bidAllowanceRequired =
    !bidPayIsErc20 || bidApprovalThreshold <= BigInt(0)
      ? BigInt(0)
      : selectedPaymentToken?.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase()
        ? (bidApprovalThreshold * BigInt(105)) / BigInt(100)
        : bidApprovalThreshold;

  const bidErc20AllowanceOk = !bidPayIsErc20 || allowanceBn >= bidAllowanceRequired;

  const bidDisplayDecimals = bidParseDecimals;
  const bidDisplaySymbol = listingPricedInGameCash
    ? "Game Cash"
    : (selectedPaymentToken?.name ?? tokenInfo.name);
  const minBidAmountDisplay = formatUnits(minBidAsPayTokenWei, bidDisplayDecimals);

  // ── Action Handlers ───────────────────────────────────────────
  const handleApproveErc20 = () => {
    if (!selectedPaymentToken || !isConnected) return;
    if (selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) return;
    resetApprove();

    const isAuctionErc20Bid =
      listing.listingType === 1 && bidPayIsErc20;
    let amount = isAuctionErc20Bid ? bidApprovalThreshold : requiredApprovalAmount;

    if (
      isAuctionErc20Bid &&
      selectedPaymentToken.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase()
    ) {
      amount = (amount * BigInt(105)) / BigInt(100);
    }

    if (amount <= BigInt(0)) {
      toast.error("Nothing to approve for the current action");
      return;
    }

    writeApprove({
      address: selectedPaymentToken.tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addresses.inventoryMarketplace, amount],
    });
  };

  const handleApproveGameCashSpend = () => {
    if (!isConnected) return;
    resetApproveCashSpend();
    writeApproveCashSpend({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.inventoryMarketplace, maxUint256],
    });
  };

  const handleBuy = () => {
    if (!listing || !isConnected) return;
    if (!buyBalanceSufficient) {
      toast.error("Insufficient balance for this purchase");
      return;
    }
    resetBuy();

    if (listingPricedInGameCash) {
      writeBuy({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "purchaseFixedItem",
        args: [
          BigInt(listing.listingId),
          BigInt(GAME_CASH_MARKETPLACE_SWAP_TOKEN_ID),
        ],
      });
      return;
    }

    if (!selectedPaymentToken) return;
    const isNativePayment = selectedPaymentToken.tokenAddress === NATIVE_ADDRESS;

    if (isNativePayment) {
      writeBuy({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "purchaseFixedItem",
        args: [BigInt(listing.listingId), BigInt(selectedPaymentToken.tokenId)],
        value: requiredTokenAmount,
      } as unknown as Parameters<typeof writeBuy>[0]);
    } else {
      writeBuy({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "purchaseFixedItem",
        args: [BigInt(listing.listingId), BigInt(selectedPaymentToken.tokenId)],
      });
    }
  };

  const handleBid = () => {
    if (!listing || !isConnected || !bidAmount?.trim()) return;
    if (!listingPricedInGameCash && !selectedPaymentToken) return;
    resetBid();

    let bidWei: bigint;
    try {
      bidWei = parseUnits(bidAmount, bidParseDecimals);
    } catch {
      toast.error("Invalid bid amount");
      return;
    }

    const minBidPay = minBidAsPayTokenWei;
    if (bidWei < minBidPay) {
      toast.error(
        `Minimum bid is ${Number(formatUnits(minBidPay, bidDisplayDecimals)).toFixed(6)} ${bidDisplaySymbol}`
      );
      return;
    }

    const payIsNative =
      !listingPricedInGameCash &&
      selectedPaymentToken!.tokenAddress === NATIVE_ADDRESS;
    const erc20AllowanceNeeded =
      !listingPricedInGameCash &&
        !payIsNative &&
        selectedPaymentToken!.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase()
        ? (bidWei * BigInt(110)) / BigInt(100)
        : bidWei;
    if (!listingPricedInGameCash && !payIsNative && allowanceBn < erc20AllowanceNeeded) {
      toast.error("Approve the token for the marketplace before bidding");
      return;
    }

    const bidSwapTokenId = isGameCashToken(listing.token)
      ? GAME_CASH_MARKETPLACE_SWAP_TOKEN_ID
      : selectedSwapTokenId;

    if (payIsNative) {
      writeBid({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "bidOnAuctionItem",
        args: [BigInt(listing.listingId), BigInt(bidSwapTokenId), bidWei],
        value: bidWei,
      } as unknown as Parameters<typeof writeBid>[0]);
    } else {
      writeBid({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "bidOnAuctionItem",
        args: [BigInt(listing.listingId), BigInt(bidSwapTokenId), bidWei],
      });
    }
  };

  const handleCancel = () => {
    if (!listing || !isConnected) return;
    resetCancel();

    writeCancel({
      address: addresses.inventoryMarketplace,
      abi: INVENTORY_MARKETPLACE_ABI,
      functionName: "cancelListing",
      args: [BigInt(listing.listingId)],
    });
  };

  const handleFinish = () => {
    if (!listing || !isConnected) return;
    resetFinish();

    writeFinish({
      address: addresses.inventoryMarketplace,
      abi: INVENTORY_MARKETPLACE_ABI,
      functionName: "finishAuctionItem",
      args: [BigInt(listing.listingId)],
    });
  };

  const approveLoading = approvePending || approveConfirming;
  const cashSpendApproveLoading =
    cashSpendApprovePending || cashSpendApproveConfirming;
  const buyLoading = buyPending || buyConfirming;
  const bidLoading = bidPending || bidConfirming;
  const cancelLoading = cancelPending || cancelConfirming;
  const finishLoading = finishPending || finishConfirming;
  const anyLoading =
    approveLoading ||
    cashSpendApproveLoading ||
    buyLoading ||
    bidLoading ||
    cancelLoading ||
    finishLoading;

  const purchaseReady =
    (listingPricedInGameCash ? cashSpendApproveSuccess : isApproved) &&
    buyBalanceSufficient;

  // ── Action Availability ────────────────────────────────────��──
  const hasBids = listing.bids.length > 0;
  const canBuy = isOpen && !isAuction && !isSeller && !expired && isConnected;
  const canBid = isOpen && isAuction && !isSeller && !expired && isConnected;
  // Open listings with no bids can be canceled.
  // - If not expired: only the seller can cancel.
  // - If expired: anyone can cancel.
  const canCancel =
    isOpen && !hasBids && isConnected && (expired || isSeller);
  // Expired auctions with at least one bid can be finished.
  const canFinish = isOpen && isAuction && expired && hasBids && isConnected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{itemName}</p>
              <p className="text-xs text-muted-foreground">{categoryName}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Listing Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Listing Type</p>
              <p className="font-medium text-foreground">
                {LISTING_TYPE_LABELS[listing.listingType]}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p
                className={cn(
                  "font-medium",
                  isOpen ? "text-green-400" : listing.status === 1 ? "text-blue-400" : "text-red-400"
                )}
              >
                {STATUS_LABELS[listing.status]}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                {isAuction ? "Current Bid" : "Price"}
              </p>
              <p className="font-mono font-semibold text-foreground">
                {formatPrice(listing.currentPrice, listing.token, tokenInfo)}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Time Left</p>
              <p
                className={cn(
                  "font-medium",
                  expired ? "text-red-400" : "text-green-400"
                )}
              >
                {formatTimeRemaining(listing.expiresAt)}
              </p>
            </div>
          </div>

          {/* Seller */}
          <div className="rounded-lg bg-background/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Seller</p>
            <a
              href={`${explorer}/address/${listing.seller}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-sm text-primary hover:underline"
            >
              {listing.seller}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Bid History (for auctions) */}
          {isAuction && listing.bids.length > 0 && (
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Bid History ({listing.bids.length})
              </p>
              <div className="max-h-32 space-y-2 overflow-y-auto">
                {listing.bids
                  .slice()
                  .reverse()
                  .map((bid, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">
                        {bid.buyer.slice(0, 6)}...{bid.buyer.slice(-4)}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {Number(formatUnits(bid.price, tokenInfo.decimal)).toFixed(4)}{" "}
                        {tokenInfo.name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 border-t border-border pt-4">
            {/* Buy (Fixed Price) */}
            {canBuy && (
              <div className="space-y-3">
                {/* Payment Token Selection - Only show for BNB/MAFIA listings */}
                {!isGameCashToken(listing.token) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Pay with:</p>
                    <div className="flex flex-wrap gap-2">
                      {nativeToken && (
                        <button
                          onClick={() => setSelectedSwapTokenId(nativeToken.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === nativeToken.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {chainConfig.id === "bnb" ? "BNB" : "PLS"}
                        </button>
                      )}
                      {mafiaToken && (
                        <button
                          onClick={() => setSelectedSwapTokenId(mafiaToken.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === mafiaToken.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          MAFIA
                        </button>
                      )}
                      {stableTokens.map((token) => (
                        <button
                          key={token.tokenId}
                          onClick={() => setSelectedSwapTokenId(token.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === token.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {token.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isGameCashToken(listing.token) && (
                  <div className="rounded-lg border border-border bg-background/50 p-3">
                    <p className="text-xs font-medium text-foreground">Payment: Game Cash</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Approve Game Cash spend on the InGameCurrency contract for the inventory marketplace,
                      then buy. The price is deducted from your in-game cash balance.
                    </p>
                  </div>
                )}

                {/* Price display */}
                {requiredTokenAmount > BigInt(0) &&
                  (listingPricedInGameCash || selectedPaymentToken) && (
                    <div className="rounded-lg bg-background/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Amount to pay:</span>
                        <span className="font-mono font-semibold text-foreground">
                          {Number(
                            formatUnits(
                              requiredTokenAmount,
                              listingPricedInGameCash
                                ? 18
                                : (selectedPaymentToken?.decimal ?? 18)
                            )
                          ).toFixed(6)}{" "}
                          {listingPricedInGameCash ? "Game Cash" : selectedPaymentToken!.name}
                        </span>
                      </div>
                      {!listingPricedInGameCash &&
                        selectedPaymentToken?.tokenAddress.toLowerCase() ===
                        addresses.mafia?.toLowerCase() && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            +5% fee buffer for MAFIA token
                          </p>
                        )}
                    </div>
                  )}

                {buyBalanceRequired > BigInt(0) && !buyBalanceSufficient && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                    {listingPricedInGameCash && !authData
                      ? "Sign in with your wallet (signature) to load your Game Cash balance."
                      : "Insufficient balance for this purchase."}
                  </p>
                )}

                {/* Approve Game Cash spend (InGameCurrency → marketplace) */}
                {listingPricedInGameCash && !cashSpendApproveSuccess && (
                  <button
                    type="button"
                    onClick={handleApproveGameCashSpend}
                    disabled={anyLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {cashSpendApproveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Approve Game Cash for marketplace
                  </button>
                )}

                {/* Approve ERC20 (MAFIA / stables) */}
                {!listingPricedInGameCash &&
                  !isApproved &&
                  selectedPaymentToken &&
                  selectedPaymentToken.tokenAddress !== NATIVE_ADDRESS && (
                    <button
                      type="button"
                      onClick={handleApproveErc20}
                      disabled={anyLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                    >
                      {approveLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      Approve {selectedPaymentToken.name}
                    </button>
                  )}

                {/* Buy Button */}
                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={
                    anyLoading ||
                    !purchaseReady ||
                    (!listingPricedInGameCash && !selectedPaymentToken)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {buyLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Coins className="h-4 w-4" />
                  )}
                  {requiredTokenAmount > BigInt(0) &&
                    (listingPricedInGameCash || selectedPaymentToken)
                    ? `Buy for ${Number(
                      formatUnits(
                        requiredTokenAmount,
                        listingPricedInGameCash
                          ? 18
                          : (selectedPaymentToken?.decimal ?? 18)
                      )
                    ).toFixed(4)} ${listingPricedInGameCash ? "Game Cash" : selectedPaymentToken!.name}`
                    : `Buy for ${formatPrice(listing.currentPrice, listing.token, tokenInfo)}`}
                </button>
              </div>
            )}

            {/* Bid (Auction) */}
            {canBid && (
              <div className="space-y-2">
                {isGameCashToken(listing.token) && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Bids use Game Cash. Approve spend once, then place your bid.
                  </p>
                )}
                {!isGameCashToken(listing.token) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Bid with:</p>
                    <div className="flex flex-wrap gap-2">
                      {nativeToken && (
                        <button
                          type="button"
                          onClick={() => setSelectedSwapTokenId(nativeToken.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === nativeToken.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {chainConfig.id === "bnb" ? "BNB" : "PLS"}
                        </button>
                      )}
                      {mafiaToken && (
                        <button
                          type="button"
                          onClick={() => setSelectedSwapTokenId(mafiaToken.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === mafiaToken.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          MAFIA
                        </button>
                      )}
                      {stableTokens.map((token) => (
                        <button
                          key={token.tokenId}
                          type="button"
                          onClick={() => setSelectedSwapTokenId(token.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === token.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {token.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      ERC20 / stable bids require approving the marketplace for that token first (native
                      excluded).
                    </p>
                  </div>
                )}
                {isGameCashToken(listing.token) && !cashSpendApproveSuccess && (
                  <button
                    type="button"
                    onClick={handleApproveGameCashSpend}
                    disabled={anyLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {cashSpendApproveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Approve Game Cash for marketplace
                  </button>
                )}
                {bidPayIsErc20 && !bidErc20AllowanceOk && (
                  <button
                    type="button"
                    onClick={handleApproveErc20}
                    disabled={anyLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {approveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Approve {selectedPaymentToken?.name} for marketplace
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Min: ${Number(minBidAmountDisplay).toFixed(4)} ${bidDisplaySymbol}`}
                    className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    step="0.0001"
                    min={Number(minBidAmountDisplay)}
                  />
                  <button
                    type="button"
                    onClick={() => setBidAmount(minBidAmountDisplay)}
                    className="rounded-lg border border-border bg-background/50 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Min
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleBid}
                  disabled={
                    anyLoading ||
                    !bidAmount?.trim() ||
                    (!listingPricedInGameCash && !selectedPaymentToken) ||
                    (isGameCashToken(listing.token) && !cashSpendApproveSuccess) ||
                    (bidPayIsErc20 && !bidErc20AllowanceOk)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  {bidLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Gavel className="h-4 w-4" />
                  )}
                  Place Bid
                </button>
              </div>
            )}

            {/* Cancel (Seller) */}
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={anyLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-400/20 disabled:opacity-50"
              >
                {cancelLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Cancel Listing
              </button>
            )}

            {/* Finish Auction */}
            {canFinish && (
              <button
                onClick={handleFinish}
                disabled={anyLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
              >
                {finishLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Complete Auction
              </button>
            )}

            {/* Not Connected */}
            {!isConnected && isOpen && (
              <p className="text-center text-sm text-muted-foreground">
                Connect your wallet to interact with this listing
              </p>
            )}

            {/* Closed Listing */}
            {!isOpen && (
              <p className="text-center text-sm text-muted-foreground">
                This listing is no longer active
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Listing Modal ────────────────────────────────────────
function CreateListingModal({
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

  // Create listing tx
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useChainWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

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
      reset();
      setSelectedItemId("");
      setPrice("");
      setListingType("0");
      setPaymentToken(GAME_CASH_ADDRESS);
      setDuration("3");
    }
  }, [open, fetchUserItems, reset]);

  // Handle listing success
  useEffect(() => {
    if (isSuccess && hash) {
      toast({
        title: "Listing Created",
        description: "Your item has been listed on the marketplace.",
      });
      onSuccess();
    }
  }, [isSuccess, hash, toast, onSuccess]);

  const handleCreateListing = () => {
    if (!isConnected || !address || !selectedItemId || !price) return;

    const priceWei = parseEther(price);
    const durationSeconds = durationDaysToSeconds(duration);

    writeContract({
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

  const createLoading = isPending || isConfirming;

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
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-sm text-red-400">
                {error?.message.includes("User rejected")
                  ? "Transaction rejected"
                  : error?.message.split("\n")[0]}
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
                {isPending ? "Confirm in wallet..." : "Creating..."}
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
