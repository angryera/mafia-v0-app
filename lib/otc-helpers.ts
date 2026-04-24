// OTC helpers: types, text-only label formatting, and request matching logic.
// No backend calls. No images/icons. Pure data transformations.

import { ItemCategory, City, CitySimple, MARKETPLACE_ITEM_NAMES, getCrateCategory } from "@/lib/contract";

// ── Types (as specified in prompt) ──────────────────────────────
export interface OTCRequestItem {
  itemType: number; // 0: normal, 1: business, 2: land
  categoryId: number;
  typeId: number;
  cityId: number;
  x: number;
  y: number;
}

export interface InventoryItem {
  categoryId: number;
  typeId: number;
  owner: `0x${string}`;
}

export interface OfferedItemDetail extends InventoryItem {
  itemId: number; // from offerItemIds
}

export interface OTCOffer {
  offerId: number;
  offerItemIds: number[];
  offeredItems: OfferedItemDetail[];
  requestItems: OTCRequestItem[];
  creator: `0x${string}`;
  createdAt: number;
  expireAt: number;
  status: number; // 0: open, 1: accepted, 2: canceled
}

export type OTCStatus = 0 | 1 | 2;
export const OTC_STATUS_OPEN = 0 as const;
export const OTC_STATUS_ACCEPTED = 1 as const;
export const OTC_STATUS_CANCELED = 2 as const;

// ── Constants ───────────────────────────────────────────────────
// Crate item category IDs (the "crate rewards" block: 0..17) that should be
// prefixed with "Crate Item: " in labels.
export const CRATE_ITEM_CATEGORY_IDS: number[] = [
  ItemCategory.CASH,
  ItemCategory.BULLET,
  ItemCategory.HEALTH,
  ItemCategory.SHOPITEM,
  ItemCategory.BUSINESS,
  ItemCategory.BODYGUARD,
  ItemCategory.CREDIT,
  ItemCategory.MAFIA,
  ItemCategory.OGNFT,
  ItemCategory.NOTICREDIT,
];

export const BUSINESS_CATEGORY_ID = ItemCategory.BUSINESS;
export const BUSINESS_EXTRA_CATEGORY_ID = ItemCategory.BUSINESS_EXTRA;
export const LANDSLOT_CATEGORY_ID = ItemCategory.LANDSLOT;

// Perk categories with timed boost semantics.
export const PERK_SUCCESS_MIN = 18; // CRIME_SUCCESS
export const PERK_SUCCESS_MAX = 40; // REWARDS_BOOST
export const PERK_BOOST_MIN = 41; // PURCHASE_BOOST
export const PERK_BOOST_MAX = 47; // CREDIT_SPEND_BOOST

// ── Time helpers ────────────────────────────────────────────────
export function formatDateTime(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds <= 0) return "-";
  try {
    return new Date(unixSeconds * 1000).toLocaleString();
  } catch {
    return "-";
  }
}

export function formatRemaining(unixSeconds: number, now: number = Math.floor(Date.now() / 1000)): string {
  const diff = unixSeconds - now;
  if (diff <= 0) return "Expired";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${diff}s`;
}

export function shortAddress(addr: string | undefined | null): string {
  if (!addr) return "0x…";
  const a = addr.toLowerCase();
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

// ── City label ──────────────────────────────────────────────────
export function getCityName(cityId: number): string {
  if (cityId < 0) return "";
  return City[cityId] ?? `City #${cityId}`;
}

export function getCitySimpleName(cityId: number): string {
  if (cityId < 0) return "";
  return CitySimple[cityId] ?? getCityName(cityId);
}

// ── Text-only item label ────────────────────────────────────────
/**
 * Returns a purely textual label for an item, mirroring the semantics
 * documented in the OTC prompt.
 *
 * Rules:
 * - If categoryId is in 18..47 (perk categories), format as tier-ish text.
 *   - 18..40: `${name} (Tier ${typeId+1})` since the on-chain values array
 *     is empty for these; we can't recover "%-hrs" without external metadata.
 *   - 41..47: `${name} (Tier ${typeId+1})` — same reasoning.
 *   (Fallback if category metadata missing: `Category #<id> / Type #<id>`)
 *
 * - If category.values[typeId] is number: `${name} - <formatted> [currency]`
 * - If category is BUSINESS/BUSINESS_EXTRA: business value + optional city
 * - Default: category.values[typeId] string, or fallback placeholder
 */
export function getItemLabel(categoryId: number, typeId: number, cityId?: number): string {
  const cat = getCrateCategory(categoryId);
  const marketplaceName = MARKETPLACE_ITEM_NAMES?.[categoryId]?.[typeId];

  // A) Perk categories (18..47)
  if (categoryId >= PERK_SUCCESS_MIN && categoryId <= PERK_BOOST_MAX) {
    if (marketplaceName) return marketplaceName;
    if (!cat) return `Category #${categoryId} / Type #${typeId}`;
    return `${cat.name} (Tier ${typeId + 1})`;
  }

  if (!cat) return `Category #${categoryId} / Type #${typeId}`;

  const val = cat.values[typeId];

  // B) Numeric value
  if (typeof val === "number") {
    const formatted = val.toLocaleString();
    return cat.currency ? `${cat.name} - ${cat.currency}${formatted}` : `${cat.name} - ${formatted}`;
  }

  // C) Business category
  if (categoryId === BUSINESS_CATEGORY_ID || categoryId === BUSINESS_EXTRA_CATEGORY_ID) {
    const bizName =
      marketplaceName ??
      (typeof val === "string" ? val : `Business #${typeId}`);
    if (cityId !== undefined && cityId >= 0) {
      return `${bizName} - ${getCityName(cityId)}`;
    }
    return bizName;
  }

  // D) Marketplace name map has highest priority for known category/type pairs.
  if (marketplaceName) return marketplaceName;

  // E) Default: string value or placeholder
  if (typeof val === "string") return val;
  return `Category #${categoryId} / Type #${typeId}`;
}

// Add the "Crate Item: " prefix for categories in the crate-reward group.
export function withCratePrefix(label: string, categoryId: number): string {
  if (CRATE_ITEM_CATEGORY_IDS.includes(categoryId)) {
    return `Shop Item: ${label}`;
  }
  return label;
}

// Full label used for offered inventory items (includes itemId suffix).
export function getOfferedItemText(item: OfferedItemDetail): string {
  const base = getItemLabel(item.categoryId, item.typeId);
  return `${withCratePrefix(base, item.categoryId)} (ID: ${item.itemId})`;
}

// Full label used for requested items. Land slots get a special format.
export function getRequestItemText(req: OTCRequestItem): string {
  // itemType == 2 means LAND slot
  if (Number(req.itemType) === 2) {
    const cityLabel = getCitySimpleName(req.cityId);
    const base = `Land Slot #${cityLabel}-${req.x}-${req.y}`;
    return withCratePrefix(base, req.categoryId);
  }
  const base = getItemLabel(req.categoryId, req.typeId, req.cityId);
  return withCratePrefix(base, req.categoryId);
}

// ── Normalized raw-offer → OTCOffer shaping ─────────────────────
export interface MafiaExchangeRawOffer {
  offerItemIds: Array<number | bigint>;
  offeredItems?: Array<{
    itemId: number | bigint;
    categoryId: number | bigint;
    typeId: number | bigint;
    owner: `0x${string}`;
  }>;
  requestItems: Array<{
    itemType: number | bigint;
    categoryId: number | bigint;
    typeId: number | bigint;
    cityId: number | bigint;
    x: number | bigint;
    y: number | bigint;
  }>;
  creator: `0x${string}`;
  createdAt: number | bigint;
  expireAt: number | bigint;
  status: number | bigint;
}

function n(v: number | bigint): number {
  return Number(v);
}

export function normalizeOffer(raw: MafiaExchangeRawOffer, offerId: number): OTCOffer {
  const offerItemIds = (raw.offerItemIds ?? []).map(n);
  const offeredItems: OfferedItemDetail[] = (raw.offeredItems ?? []).map((it) => ({
    itemId: n(it.itemId),
    categoryId: n(it.categoryId),
    typeId: n(it.typeId),
    owner: it.owner,
  }));
  const requestItems: OTCRequestItem[] = (raw.requestItems ?? []).map((r) => ({
    itemType: n(r.itemType),
    categoryId: n(r.categoryId),
    typeId: n(r.typeId),
    cityId: n(r.cityId),
    x: n(r.x),
    y: n(r.y),
  }));

  return {
    offerId,
    offerItemIds,
    offeredItems,
    requestItems,
    creator: raw.creator,
    createdAt: n(raw.createdAt),
    expireAt: n(raw.expireAt),
    status: n(raw.status),
  };
}

// ── Ownership / request matching (mirrors hasAllItems semantics) ─
// A normalized key used for matching non-land requirements.
function normalizeTypeId(categoryId: number, typeId: number): number {
  // Special normalization: if categoryId is 11 or 12 and typeId in 0..5,
  // collapse them to typeId 0 (contracts treat these as the same equipable).
  if ((categoryId === 11 || categoryId === 12) && typeId >= 0 && typeId <= 5) {
    return 0;
  }
  return typeId;
}

// Owned inventory entry shape — compatible with MafiaInventory.getAllItemsByOwner.
export interface OwnedInventoryEntry {
  itemId: number;
  categoryId: number;
  typeId: number;
  cityId: number;
  owner: string;
}

export interface OwnedSlotEntry {
  cityId: number;
  slotX: number;
  slotY: number;
  inventoryItemId: number;
}

export interface MatchResult {
  acceptable: boolean;
  myItemIds: number[];
  missing: OTCRequestItem[];
}

/**
 * Decide whether `owner` holds every requested item in `offer`, and if so,
 * return the inventory itemIds (in request order) to send to
 * `acceptOTCOffer(offerId, myItemIds)`.
 *
 * Consume-on-match: each inventory item can only satisfy one requirement.
 */
export function matchRequestAgainstInventory(
  requestItems: OTCRequestItem[],
  inventory: OwnedInventoryEntry[],
  slots: OwnedSlotEntry[],
): MatchResult {
  // Build a mutable copy we can consume from.
  const pool = inventory.slice();
  const slotPool = slots.slice();

  const myItemIds: number[] = [];
  const missing: OTCRequestItem[] = [];

  for (const req of requestItems) {
    const isLand = Number(req.itemType) === 2 || req.categoryId === LANDSLOT_CATEGORY_ID;

    let matchIdx = -1;

    if (isLand) {
      const reqKey = `${req.cityId}-${req.x}-${req.y}`;
      for (let i = 0; i < slotPool.length; i++) {
        const slot = slotPool[i];
        const slotKey = `${slot.cityId}-${slot.slotX}-${slot.slotY}`;
        if (slotKey === reqKey) {
          matchIdx = i;
          break;
        }
      }
    } else {
      // For non-land items, city is only relevant for business categories.
      const reqCity =
        req.categoryId === BUSINESS_CATEGORY_ID || req.categoryId === BUSINESS_EXTRA_CATEGORY_ID
          ? Number(req.cityId)
          : -1;
      const reqTypeId = normalizeTypeId(req.categoryId, Number(req.typeId));
      const reqKey = `${req.categoryId}-${reqTypeId}-${reqCity}`;

      for (let i = 0; i < pool.length; i++) {
        const inv = pool[i];
        if (inv.categoryId !== req.categoryId) continue;
        const invTypeId = normalizeTypeId(inv.categoryId, Number(inv.typeId));
        const invCity =
          inv.categoryId === BUSINESS_CATEGORY_ID || inv.categoryId === BUSINESS_EXTRA_CATEGORY_ID
            ? Number(inv.cityId)
            : -1;
        const invKey = `${inv.categoryId}-${invTypeId}-${invCity}`;
        if (invKey === reqKey) {
          matchIdx = i;
          break;
        }
      }
    }

    if (matchIdx < 0) {
      missing.push(req);
    } else if (isLand) {
      const matchedSlot = slotPool.splice(matchIdx, 1)[0];
      myItemIds.push(Number(matchedSlot.inventoryItemId));
    } else {
      const matched = pool.splice(matchIdx, 1)[0];
      myItemIds.push(Number(matched.itemId));
    }
  }

  if (missing.length > 0) {
    return { acceptable: false, myItemIds: [], missing };
  }
  return { acceptable: true, myItemIds, missing: [] };
}

// ── Status helpers ──────────────────────────────────────────────
export function otcStatusLabel(status: number): "Open" | "Completed" | "Cancelled" {
  if (status === OTC_STATUS_OPEN) return "Open";
  if (status === OTC_STATUS_ACCEPTED) return "Completed";
  return "Cancelled";
}
