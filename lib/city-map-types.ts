export interface ParsedSlotInfo {
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
  /** Staked MAFIA in wei (18 decimals). May be a string when too large for JS number. */
  stakingAmount: number | string;
  yieldPayout: number;
  owner: `0x${string}`;
}

const ZERO = "0x0000000000000000000000000000000000000000";

/** True when the plot has a non-zero owner. Prefer this over `isOwned` for occupancy (chain flag can disagree). */
export function slotHasOwner(slot: Pick<ParsedSlotInfo, "owner">): boolean {
  const o = slot.owner;
  if (typeof o !== "string" || !o) return false;
  return o.toLowerCase() !== ZERO.toLowerCase();
}
