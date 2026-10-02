import { formatUnits } from "viem";
import { getSlotBuildingLabel } from "@/lib/city-slot-config";
import { City, ItemCategory, MARKETPLACE_CATEGORY_NAMES, MARKETPLACE_ITEM_NAMES } from "@/lib/contract";

export interface InventoryMarketplaceBid {
  buyer: `0x${string}`;
  price: bigint;
  amount: bigint;
  timestamp: bigint;
}

export interface InventoryMarketplaceItem {
  categoryId: number;
  typeId: number;
  owner: `0x${string}`;
}

export interface InventoryMarketplaceListing {
  listingId: number;
  itemId: number;
  /** 0: fixed price, 1: auction. */
  listingType: number;
  startingPrice: bigint;
  currentPrice: bigint;
  timestamp: bigint;
  expiresAt: bigint;
  token: `0x${string}`;
  seller: `0x${string}`;
  buyer: `0x${string}`;
  /** 0: open, 1: sold, 2: canceled. */
  status: number;
  bids: InventoryMarketplaceBid[];
  item: InventoryMarketplaceItem;
}

export interface SwapToken {
  name: string;
  decimal: number;
  tokenAddress: `0x${string}`;
  isStable: boolean;
  isEnabled: boolean;
  price: bigint;
  tokenId: number;
}

/** Inventory item shape returned by the MafiaInventory script. */
export interface SDKInventoryItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId?: number;
  [key: string]: unknown;
}

/** Category 0 is cash or another non-listable special item. */
export const NON_LISTABLE_CATEGORIES: ReadonlySet<number> = new Set([0]);

export const GAME_CASH_ADDRESS = "0x0000000000000000000000000000000000000001" as `0x${string}`;
/** `purchaseFixedItem` / `bidOnAuctionItem` swap index for Game Cash (not listed in swap tokens). */
export const GAME_CASH_MARKETPLACE_SWAP_TOKEN_ID = 0;
export const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export const LISTING_TYPE_LABELS: Readonly<Record<number, string>> = {
  0: "Fixed Price",
  1: "Auction",
};

/** Listing duration choices (days); the contract expects seconds. */
export const DURATION_OPTIONS = [
  { label: "0.5 days", value: "0.5" },
  { label: "3 days", value: "3" },
  { label: "12 days", value: "12" },
  { label: "72 days", value: "72" },
] as const;

export function durationDaysToSeconds(days: string): bigint {
  const daysNumber = Number(days);
  if (!Number.isFinite(daysNumber) || daysNumber <= 0) return BigInt(0);
  return BigInt(Math.round(daysNumber * 86400));
}

export const STATUS_LABELS: Readonly<Record<number, string>> = {
  0: "Open",
  1: "Sold",
  2: "Canceled",
};

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "ending_soon", label: "Ending Soon" },
] as const;

/** Clock filter. Open listings stay status 0 after they expire. */
export const TIME_FILTER_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "all", label: "All" },
] as const;

export type ListingTimeFilter = (typeof TIME_FILTER_OPTIONS)[number]["value"];

export function secondsRemaining(expiresAt: bigint, nowSeconds = Math.floor(Date.now() / 1000)): number {
  return Number(expiresAt) - nowSeconds;
}

export const LISTINGS_PER_PAGE = 10;

export type MarketplacePaginationItem = number | "ellipsis";

/** Page numbers plus ellipsis gaps, for example 1, 2, …, 27, 28. */
export function getMarketplacePaginationItems(
  current: number,
  total: number,
): MarketplacePaginationItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, 2, total - 1, total]);
  for (let page = current - 1; page <= current + 1; page++) {
    if (page >= 1 && page <= total) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: MarketplacePaginationItem[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push("ellipsis");
    items.push(page);
  });
  return items;
}

/** 10^decimals as bigint, without `10 ** decimals` (unsafe for large decimals). */
export function pow10BigInt(decimals: number): bigint {
  let result = BigInt(1);
  for (let i = 0; i < decimals; i++) result *= BigInt(10);
  return result;
}

export function formatTimeRemaining(expiresAt: bigint): string {
  const remainingSeconds = secondsRemaining(expiresAt);
  if (remainingSeconds <= 0) return "Expired";

  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function isExpired(expiresAt: bigint): boolean {
  return secondsRemaining(expiresAt) <= 0;
}

export function matchesTimeFilter(expiresAt: bigint, filter: ListingTimeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "expired") return isExpired(expiresAt);
  return !isExpired(expiresAt);
}

export function addressEquals(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function getItemName(categoryId: number, typeId: number): string {
  const categoryItems = MARKETPLACE_ITEM_NAMES[categoryId];
  const categoryName = MARKETPLACE_CATEGORY_NAMES[categoryId] ?? `Category ${categoryId}`;
  if (categoryItems && categoryItems[typeId] !== undefined) return categoryItems[typeId];
  return `${categoryName} #${typeId}`;
}

/** Minimum next bid: current price plus 5 percent. */
export function calculateNextBid(currentPrice: bigint): bigint {
  return (currentPrice * BigInt(105)) / BigInt(100);
}

/** USD for native and MAFIA prices. Game Cash is shown as the token amount. */
export function formatPrice(
  price: bigint,
  token: `0x${string}`,
  tokenInfo: { name: string; decimal: number; isNative: boolean },
): string {
  const amount = Number(formatUnits(price, tokenInfo.decimal));
  return isGameCashToken(token) ? `${amount.toLocaleString()} Cash` : `$${amount.toFixed(2)}`;
}

export function isGameCashToken(token: `0x${string}`): boolean {
  return token.toLowerCase() === GAME_CASH_ADDRESS.toLowerCase();
}

function asBigInt(value: unknown): bigint {
  return BigInt((value as bigint | string | number | null | undefined) ?? 0);
}

/** Maps the marketplace script's active-listing payload into UI listings. */
export function parseMarketplaceListings(raw: unknown): InventoryMarketplaceListing[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((entry) => {
    const item = entry as Record<string, unknown>;
    const nestedItem = (item.item ?? {}) as Record<string, unknown>;
    const bids = Array.isArray(item.bids) ? item.bids : [];
    return {
      listingId: Number(item.listingId),
      itemId: Number(item.itemId),
      listingType: Number(item.listingType),
      startingPrice: asBigInt(item.startingPrice),
      currentPrice: asBigInt(item.currentPrice ?? item.startingPrice),
      timestamp: asBigInt(item.timestamp),
      expiresAt: asBigInt(item.expiresAt),
      token: item.token as `0x${string}`,
      seller: item.seller as `0x${string}`,
      buyer: (item.buyer ?? NATIVE_ADDRESS) as `0x${string}`,
      status: Number(item.status ?? 0),
      bids: bids.map((bidEntry) => {
        const bid = bidEntry as Record<string, unknown>;
        return {
          buyer: bid.buyer as `0x${string}`,
          price: asBigInt(bid.price),
          amount: asBigInt(bid.amount),
          timestamp: asBigInt(bid.timestamp),
        };
      }),
      item: {
        categoryId: Number(nestedItem.categoryId ?? item.categoryId ?? 0),
        typeId: Number(nestedItem.typeId ?? item.typeId ?? 0),
        owner: (nestedItem.owner ?? item.seller) as `0x${string}`,
      },
    };
  });
}

/** Matches the city map plot labels. */
const LAND_SLOT_RARITY_LABELS: Record<number, string> = {
  0: "Normal",
  1: "Upper class",
  2: "Elite",
  3: "Strategic",
};

export interface LandSlotDetails {
  itemId: number;
  cityId: number;
  x: number;
  y: number;
  slotType: number;
  slotSubType: number;
  rarity: number;
  isOperating: boolean;
  defensePower: number;
  originalDefensePower: number;
  boostPercentage: number;
  familyId: number;
  stakingAmount: bigint;
  yieldPayout: number;
}

/** Inventory getters that store a land slot item's city and tile. */
export const ITEM_MAP_LOOKUP_ABI = [
  {
    type: "function",
    name: "itemCity",
    stateMutability: "view",
    inputs: [{ name: "itemId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "itemMapPosition",
    stateMutability: "view",
    inputs: [{ name: "itemId", type: "uint256" }],
    outputs: [
      { name: "x", type: "uint8" },
      { name: "y", type: "uint8" },
    ],
  },
] as const;

/** `MafiaMap.getSlots` — pass the city and coordinates for the plots you need. */
export const GET_SLOTS_ABI = [
  {
    type: "function",
    name: "getSlots",
    stateMutability: "view",
    inputs: [
      { name: "cityIds", type: "uint8[]" },
      { name: "xs", type: "uint8[]" },
      { name: "ys", type: "uint8[]" },
    ],
    outputs: [
      {
        name: "slots",
        type: "tuple[]",
        components: [
          { name: "slotType", type: "uint8" },
          { name: "slotSubType", type: "uint8" },
          { name: "variant", type: "uint8" },
          { name: "rarity", type: "uint8" },
          { name: "isOwned", type: "bool" },
          { name: "isOperating", type: "bool" },
          { name: "originalDefensePower", type: "uint16" },
          { name: "defensePower", type: "uint16" },
          { name: "boostPercentage", type: "uint16" },
          { name: "nextUpgradeAvailableAt", type: "uint48" },
          { name: "lastOperatingTimestamp", type: "uint48" },
          { name: "inventoryItemId", type: "uint256" },
          { name: "familyId", type: "uint256" },
          { name: "stakingAmount", type: "uint256" },
          { name: "yieldPayout", type: "uint256" },
        ],
      },
      { name: "owners", type: "address[]" },
    ],
  },
] as const;

export interface LocatedLandSlot {
  itemId: number;
  cityId: number;
  x: number;
  y: number;
}

export function isLandSlotCategory(categoryId: number): boolean {
  return categoryId === ItemCategory.LANDSLOT;
}

function asSlotRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/** Maps a `getSlots` result onto the plots that were requested, in the same order. */
export function parseGetSlotsForItems(
  located: readonly LocatedLandSlot[],
  raw: unknown,
): Map<number, LandSlotDetails> {
  const tuple = Array.isArray(raw) ? raw : null;
  const named = (!tuple && raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const slots = (tuple ? tuple[0] : named.slots) as unknown;
  const slotList = Array.isArray(slots) ? slots : [];

  const details = new Map<number, LandSlotDetails>();
  located.forEach((plot, index) => {
    const slot = asSlotRecord(slotList[index]);
    details.set(plot.itemId, {
      itemId: plot.itemId,
      cityId: plot.cityId,
      x: plot.x,
      y: plot.y,
      slotType: Number(slot.slotType ?? 0),
      slotSubType: Number(slot.slotSubType ?? 0),
      rarity: Number(slot.rarity ?? 0),
      isOperating: Boolean(slot.isOperating),
      defensePower: Number(slot.defensePower ?? 0),
      originalDefensePower: Number(slot.originalDefensePower ?? 0),
      boostPercentage: Number(slot.boostPercentage ?? 0),
      familyId: Number(slot.familyId ?? 0),
      stakingAmount: BigInt((slot.stakingAmount as bigint | number | string | undefined) ?? 0),
      yieldPayout: Number(slot.yieldPayout ?? 0),
    });
  });
  return details;
}

export function getLandSlotRarityLabel(rarity: number): string {
  return LAND_SLOT_RARITY_LABELS[rarity] ?? `Rarity ${rarity}`;
}

export function formatLandSlotTitle(slot: LandSlotDetails): string {
  return getSlotBuildingLabel(slot) || "Land Slot";
}

export function formatLandSlotLocation(slot: LandSlotDetails): string {
  const city = City[slot.cityId] ?? `City #${slot.cityId}`;
  return `${city} (${slot.x}, ${slot.y})`;
}

export function formatLandSlotSubtitle(slot: LandSlotDetails): string {
  return `${getLandSlotRarityLabel(slot.rarity)} · ${formatLandSlotLocation(slot)}`;
}
