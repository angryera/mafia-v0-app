/**
 * On-chain MafiaMap slot kinds (see `MafiaMap` slot structs).
 *
 * `slotType`: 1 user, 2 protocol, 3 business, 4 family HQ, 5 raid.
 * `slotSubType` when `slotType === 1` (user): 0 empty grass … 7 large hotel.
 * When `slotType === 2` (protocol): 0 roads, 1 water, 2 plantation, 3 mountain/terrain.
 * When `slotType === 3` (business): 0 car crusher … 9 bullet factory (see `SlotBusinessLevel`).
 * When `slotType === 4`: 0 family HQ. When `slotType === 5`: 0 airport.
 */

export enum SlotLevel {
  EMPTY_GRASS = 0,
  SHED = 1,
  HOUSE = 2,
  VILLA = 3,
  OFFICE_BUILDING = 4,
  APARTMENT_BLOCK = 5,
  MANSION = 6,
  LARGE_HOTEL = 7,
}

/** Protocol tile (`slotType === 2`) subtypes. */
export enum SlotProtocolSubType {
  ROADS = 0,
  WATER = 1,
  PLANTATION = 2,
  MOUNTAIN_TERRAIN = 3,
}

/**
 * Business building (`slotType === 3`) subtypes — order matches contract.
 */
export enum SlotBusinessLevel {
  CAR_CRUSHER = 0,
  SHOP_OWNER = 1,
  BANK = 2,
  HOSPITAL = 3,
  DETECTIVE_AGENCY = 4,
  BOOZE_WAREHOUSE = 5,
  NARCOTICS_WAREHOUSE = 6,
  SLOT_MACHINE = 7,
  ROULETTE = 8,
  BULLET_FACTORY = 9,
}

/** Highest valid `slotSubType` for business (`slotType === 3`). */
export const SLOT_BUSINESS_SUBTYPE_MAX = SlotBusinessLevel.BULLET_FACTORY;

export const SLOT_TYPE_NAMES: Record<number, string> = {
  1: "User slot",
  2: "Protocol",
  3: "Business",
  4: "Family HQ",
  5: "Raid spot",
};

export function getSlotTypeName(slotType: number): string {
  return SLOT_TYPE_NAMES[slotType] ?? `Slot type ${slotType}`;
}

export const PROTOCOL_SUBTYPE_NAMES: Record<SlotProtocolSubType, string> = {
  [SlotProtocolSubType.ROADS]: "Roads",
  [SlotProtocolSubType.WATER]: "Water",
  [SlotProtocolSubType.PLANTATION]: "Plantation",
  [SlotProtocolSubType.MOUNTAIN_TERRAIN]: "Mountain / terrain",
};

/** Residential tiers: MAFIA required to start operating (matches game config). */
export const RESIDENTIAL_OPERATING_MAFIA: Record<SlotLevel, number> = {
  [SlotLevel.EMPTY_GRASS]: 0,
  [SlotLevel.SHED]: 10_000,
  [SlotLevel.HOUSE]: 25_000,
  [SlotLevel.VILLA]: 50_000,
  [SlotLevel.OFFICE_BUILDING]: 100_000,
  [SlotLevel.APARTMENT_BLOCK]: 125_000,
  [SlotLevel.MANSION]: 250_000,
  [SlotLevel.LARGE_HOTEL]: 500_000,
};

export const RESIDENTIAL_LEVEL_NAMES: Record<SlotLevel, string> = {
  [SlotLevel.EMPTY_GRASS]: "Empty tile",
  [SlotLevel.SHED]: "Shed",
  [SlotLevel.HOUSE]: "House",
  [SlotLevel.VILLA]: "Villa",
  [SlotLevel.OFFICE_BUILDING]: "Office Building",
  [SlotLevel.APARTMENT_BLOCK]: "Apartment Block",
  [SlotLevel.MANSION]: "Mansion",
  [SlotLevel.LARGE_HOTEL]: "Large Hotel",
};

/**
 * Fixed Game Cash earned per 24h when the slot is activated (MAFIA deposited, `isOperating`).
 * Applies to office / apartment / mansion / large hotel tiers only.
 */
export const RESIDENTIAL_GAME_CASH_PER_24H: Partial<Record<SlotLevel, number>> = {
  [SlotLevel.OFFICE_BUILDING]: 7_000,
  [SlotLevel.APARTMENT_BLOCK]: 12_250,
  [SlotLevel.MANSION]: 17_500,
  [SlotLevel.LARGE_HOTEL]: 35_000,
};

/** Claim rules for yield-tier residential (matches in-game schedule). */
export const YIELD_TIER_MIN_CLAIM_HOURS = 24;
export const YIELD_TIER_MAX_ACCRUAL_DAYS = 7;

export function getResidentialGameCashYieldPer24h(
  slotType: number,
  slotSubType: number
): number | null {
  if (slotType !== 1) return null;
  const level = slotSubType as SlotLevel;
  const v = RESIDENTIAL_GAME_CASH_PER_24H[level];
  return v !== undefined && v > 0 ? v : null;
}

/** Office, apartment block, mansion, large hotel — Game Cash yield + claim (not MAFIA). */
export function isResidentialGameCashYieldTier(
  slotType: number,
  slotSubType: number
): boolean {
  return getResidentialGameCashYieldPer24h(slotType, slotSubType) != null;
}

/** Business: default operating stake when activating (tune to match live game balance). */
export const BUSINESS_OPERATING_MAFIA: Record<SlotBusinessLevel, number> = {
  [SlotBusinessLevel.CAR_CRUSHER]: 75_000,
  [SlotBusinessLevel.SHOP_OWNER]: 25_000,
  [SlotBusinessLevel.BANK]: 150_000,
  [SlotBusinessLevel.HOSPITAL]: 100_000,
  [SlotBusinessLevel.DETECTIVE_AGENCY]: 75_000,
  [SlotBusinessLevel.BOOZE_WAREHOUSE]: 50_000,
  [SlotBusinessLevel.NARCOTICS_WAREHOUSE]: 50_000,
  [SlotBusinessLevel.SLOT_MACHINE]: 25_000,
  [SlotBusinessLevel.ROULETTE]: 25_000,
  [SlotBusinessLevel.BULLET_FACTORY]: 25_000,
};

export const BUSINESS_LEVEL_NAMES: Record<SlotBusinessLevel, string> = {
  [SlotBusinessLevel.CAR_CRUSHER]: "Car Crusher",
  [SlotBusinessLevel.SHOP_OWNER]: "Shop owner",
  [SlotBusinessLevel.BANK]: "Bank",
  [SlotBusinessLevel.HOSPITAL]: "Hospital",
  [SlotBusinessLevel.DETECTIVE_AGENCY]: "Detective Agency",
  [SlotBusinessLevel.BOOZE_WAREHOUSE]: "Booze Warehouse",
  [SlotBusinessLevel.NARCOTICS_WAREHOUSE]: "Narcotics Warehouse",
  [SlotBusinessLevel.SLOT_MACHINE]: "Slot Machine",
  [SlotBusinessLevel.ROULETTE]: "Roulette",
  [SlotBusinessLevel.BULLET_FACTORY]: "Bullet Factory",
};

export function getActivateDepositMafiaHuman(slot: {
  slotType: number;
  slotSubType: number;
}): number | null {
  if (slot.slotType === 1) {
    const level = slot.slotSubType as SlotLevel;
    if (level === SlotLevel.EMPTY_GRASS) return null;
    const v = RESIDENTIAL_OPERATING_MAFIA[level];
    return v > 0 ? v : null;
  }
  if (slot.slotType === 3) {
    const sub = Math.min(
      slot.slotSubType,
      SLOT_BUSINESS_SUBTYPE_MAX
    ) as SlotBusinessLevel;
    return BUSINESS_OPERATING_MAFIA[sub] ?? 25_000;
  }
  return null;
}

export function isResidentialFullyUpgraded(slotSubType: number): boolean {
  return slotSubType === SlotLevel.LARGE_HOTEL;
}

/** Empty grass — cannot deposit/activate until upgraded to at least Shed. */
export function isResidentialEmptyTile(slotSubType: number): boolean {
  return slotSubType === SlotLevel.EMPTY_GRASS;
}

/** Shed and above: eligible for MAFIA deposit / activation (see RESIDENTIAL_OPERATING_MAFIA). */
export function canDepositActivateResidential(slotSubType: number): boolean {
  return slotSubType >= SlotLevel.SHED;
}

/**
 * Game Cash ($) required to upgrade **into** this tier (whole dollars, 18 decimals on-chain).
 * Table: Empty→Shed $75k, Shed→House $300k, … Large hotel $3.75M.
 */
export const RESIDENTIAL_UPGRADE_CASH_TO_TIER: Record<SlotLevel, number> = {
  [SlotLevel.EMPTY_GRASS]: 0,
  [SlotLevel.SHED]: 75_000,
  [SlotLevel.HOUSE]: 300_000,
  [SlotLevel.VILLA]: 750_000,
  [SlotLevel.OFFICE_BUILDING]: 1_500_000,
  [SlotLevel.APARTMENT_BLOCK]: 2_250_000,
  [SlotLevel.MANSION]: 3_000_000,
  [SlotLevel.LARGE_HOTEL]: 3_750_000,
};

/** OG Crate keys (ERC1155 id 0) required to upgrade **into** this tier. */
export const RESIDENTIAL_UPGRADE_CRATE_KEYS_TO_TIER: Partial<
  Record<SlotLevel, bigint>
> = {
  [SlotLevel.OFFICE_BUILDING]: BigInt(1),
};

export function getNextResidentialTier(slotSubType: number): SlotLevel | null {
  if (slotSubType >= SlotLevel.LARGE_HOTEL) return null;
  return (slotSubType + 1) as SlotLevel;
}

/** Cost for the next `upgradeSlot` from current residential `slotSubType`. */
export function getResidentialUpgradeCost(slotSubType: number): {
  nextTier: SlotLevel;
  /** Whole dollars (pass to parseEther). */
  cash: number;
  /** ERC1155 id 0 balance required. */
  ogCrateKeys: bigint;
} | null {
  const next = getNextResidentialTier(slotSubType);
  if (next === null) return null;
  return {
    nextTier: next,
    cash: RESIDENTIAL_UPGRADE_CASH_TO_TIER[next],
    ogCrateKeys: RESIDENTIAL_UPGRADE_CRATE_KEYS_TO_TIER[next] ?? BigInt(0),
  };
}

export function getSlotBuildingLabel(slot: {
  slotType: number;
  slotSubType: number;
}): string {
  if (slot.slotType === 1) {
    return (
      RESIDENTIAL_LEVEL_NAMES[slot.slotSubType as SlotLevel] ??
      `User slot (${slot.slotSubType})`
    );
  }
  if (slot.slotType === 2) {
    return (
      PROTOCOL_SUBTYPE_NAMES[slot.slotSubType as SlotProtocolSubType] ??
      `Protocol (${slot.slotSubType})`
    );
  }
  if (slot.slotType === 3) {
    const sub = Math.min(
      slot.slotSubType,
      SLOT_BUSINESS_SUBTYPE_MAX
    ) as SlotBusinessLevel;
    return (
      BUSINESS_LEVEL_NAMES[sub] ?? `Business (${slot.slotSubType})`
    );
  }
  if (slot.slotType === 4) {
    return slot.slotSubType === 0 ? "Family HQ" : `Family HQ (${slot.slotSubType})`;
  }
  if (slot.slotType === 5) {
    return slot.slotSubType === 0 ? "Airport" : `Raid spot (${slot.slotSubType})`;
  }
  return "";
}
