"use client";

import { CreateListingModal } from "@/features/marketplace/components/create-listing-modal";
import { ListingDetailModal } from "@/features/marketplace/components/listing-detail-modal";
import {
  LISTINGS_PER_PAGE,
  LISTING_TYPE_LABELS,
  SORT_OPTIONS,
  TIME_FILTER_OPTIONS,
  addressEquals,
  formatPrice,
  formatTimeRemaining,
  getItemName,
  getMarketplacePaginationItems,
  isExpired,
  isGameCashToken,
  matchesTimeFilter,
  parseMarketplaceListings,
  type InventoryMarketplaceListing,
  type ListingTimeFilter,
  type SwapToken,
} from "@/features/marketplace/lib/marketplace";
import { INVENTORY_MARKETPLACE_ABI, MARKETPLACE_CATEGORY_NAMES } from "@/lib/contract";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";

export function MarketplaceAction() {
  const { chainConfig } = useChain();
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // ── Listings State ────────────────────────────────────────────
  const [listings, setListings] = useState<InventoryMarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Swap Tokens ───────────────────────────────────────────────
  const [swapTokens, setSwapTokens] = useState<SwapToken[]>([]);

  // ── Filters ───────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterListingType, setFilterListingType] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<ListingTimeFilter>("active");
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

        const mapped = parseMarketplaceListings(result);
        if (mapped) {
          setListings(mapped);
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

    result = result.filter((l) => l.status === 0 && matchesTimeFilter(l.expiresAt, timeFilter));

    // "Ending soon" ranks live listings by time left. Expired clocks sort first otherwise.
    if (sortBy === "ending_soon" && timeFilter !== "expired") {
      result = result.filter((l) => !isExpired(l.expiresAt));
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
        case "ending_soon": {
          const aExpired = isExpired(a.expiresAt) ? 1 : 0;
          const bExpired = isExpired(b.expiresAt) ? 1 : 0;
          if (aExpired !== bExpired) return aExpired - bExpired;
          return Number(a.expiresAt - b.expiresAt);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [listings, filterCategory, filterListingType, timeFilter, sortBy, showMyListings, address]);

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
  }, [filterCategory, filterListingType, timeFilter, sortBy, showMyListings, address]);

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

  const emptyListingsMessage = showMyListings
    ? "You have no listings in this view"
    : {
        active: "No active listings",
        expired: "No expired listings",
        all: "No listings match your filters",
      }[timeFilter];

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

        <div className="flex items-center rounded-lg border border-border bg-background/50 p-0.5">
          {TIME_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTimeFilter(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                timeFilter === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

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
          <p className="mt-1 text-sm text-muted-foreground">{emptyListingsMessage}</p>
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
