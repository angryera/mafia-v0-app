// ─────────────────────────────────────────────────────────────────────────────
// Equipment — data service layer (reads / unstake writes)
//
// Single place where unstake-mafia reads and writes equipment stake data.
// Every function returns a promise so real smart-contract calls are drop-in
// replacements. If the contract is unavailable, reads resolve to empty data.
// ─────────────────────────────────────────────────────────────────────────────

import { formatEther, type Abi } from "viem";
import {
  City,
  CitySimple,
  EQUIPMENT_ABI,
  EQUIPMENT_SLOTS,
  ItemCategory,
  SHOP_ITEM_STATS,
} from "@/lib/contract";
import "@/types/mafia-globals";

type ReadClient = {
  readContract: (args: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
};

export const REEQUIP_COOLDOWN_SECONDS = 3 * 60 * 60;
export const EQUIPMENT_CITY_COUNT = 11;

export const EQUIPMENT_CITY_IDS = Array.from(
  { length: EQUIPMENT_CITY_COUNT },
  (_, i) => i,
);

type RawEquipmentInfo = {
  itemIds: readonly bigint[];
  mafiaAmount: bigint;
  equippedAt: bigint;
};

export interface EquipmentInfo {
  itemIds: number[];
  mafiaAmountWei: bigint;
  equippedAt: number;
}

export interface CityStakeInfo {
  cityId: number;
  cityName: string;
  abbreviation: string;
  mafiaAmountWei: bigint;
  /** Display units (ether) */
  mafiaAmount: number;
  equippedAt: number;
  itemIds: number[];
}

export interface EquippedWeaponInfo {
  itemId: number;
  typeId: number;
  name: string;
  offense: number;
  defense: number;
}

type InventoryShopItem = {
  itemId: number;
  typeId: number;
  categoryId: number;
};

function normalizeItemIds(itemIds: readonly bigint[]): number[] {
  const ids = itemIds.map((id) => Number(id));
  if (ids.length >= 10) return ids.slice(0, 10);
  return [...ids, ...Array(10 - ids.length).fill(0)];
}

function parseEquipmentInfo(raw: unknown): EquipmentInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as RawEquipmentInfo;
  if (!Array.isArray(data.itemIds)) return null;

  return {
    itemIds: normalizeItemIds(data.itemIds),
    mafiaAmountWei: BigInt(data.mafiaAmount ?? 0),
    equippedAt: Number(data.equippedAt ?? 0),
  };
}

export function formatMafiaAmount(wei: bigint): string {
  const whole = wei / BigInt(10 ** 18);
  return whole.toLocaleString("en-US");
}

export function formatMafiaAmountFromNumber(amount: number): string {
  return Math.floor(amount).toLocaleString("en-US");
}

/** Human-readable cooldown for wait labels (e.g. "2h 15m"). */
export function formatCooldownDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function getCooldownRemainingSeconds(
  equippedAt: number,
  nowSeconds: number,
): number {
  const readyAt = equippedAt + REEQUIP_COOLDOWN_SECONDS;
  return Math.max(0, readyAt - nowSeconds);
}

export function isCityOnCooldown(
  equippedAt: number,
  nowSeconds: number,
  bypassCooldown: boolean,
): boolean {
  if (bypassCooldown) return false;
  return getCooldownRemainingSeconds(equippedAt, nowSeconds) > 0;
}

export async function getEquipmentInfo(params: {
  publicClient: ReadClient;
  equipmentAddress: `0x${string}`;
  account: `0x${string}`;
  cityId: number;
  signMsg: string;
  signature: `0x${string}`;
}): Promise<EquipmentInfo | null> {
  const {
    publicClient,
    equipmentAddress,
    account,
    cityId,
    signMsg,
    signature,
  } = params;

  try {
    const raw = await publicClient.readContract({
      address: equipmentAddress,
      abi: EQUIPMENT_ABI as Abi,
      functionName: "getEquipmentInfo",
      args: [account, cityId, signMsg, signature],
    });
    return parseEquipmentInfo(raw);
  } catch {
    return null;
  }
}

async function resolveShopItemById(
  itemId: number,
  chain: string,
  inventoryAddress: `0x${string}`,
): Promise<InventoryShopItem | null> {
  if (typeof window === "undefined" || !window.MafiaInventory) return null;
  try {
    const items = (await window.MafiaInventory.getItemsByCategory({
      chain,
      contractAddress: inventoryAddress,
      categoryId: ItemCategory.SHOPITEM,
    })) as InventoryShopItem[];
    return items.find((i) => Number(i.itemId) === itemId) ?? null;
  } catch {
    return null;
  }
}

function weaponStatsFromTypeId(typeId: number): {
  name: string;
  offense: number;
  defense: number;
} {
  const stats = SHOP_ITEM_STATS[typeId];
  if (!stats) {
    return { name: `Weapon (type ${typeId})`, offense: 0, defense: 0 };
  }
  return { name: stats.name, offense: stats.offense, defense: stats.defense };
}

/** Equipped weapon in the given city, with resolved name and combat stats. */
export async function getEquippedWeaponInCity(params: {
  publicClient: ReadClient;
  equipmentAddress: `0x${string}`;
  inventoryAddress: `0x${string}`;
  chain: string;
  account: `0x${string}`;
  cityId: number;
  signMsg: string;
  signature: `0x${string}`;
}): Promise<EquippedWeaponInfo | null> {
  const info = await getEquipmentInfo(params);
  if (!info) return null;

  const itemId = info.itemIds[EQUIPMENT_SLOTS.WEAPON];
  if (itemId <= 0) return null;

  const shopItem = await resolveShopItemById(
    itemId,
    params.chain,
    params.inventoryAddress,
  );

  if (!shopItem) {
    return {
      itemId,
      typeId: -1,
      name: `Weapon #${itemId}`,
      offense: 0,
      defense: 0,
    };
  }

  const { name, offense, defense } = weaponStatsFromTypeId(shopItem.typeId);
  return {
    itemId,
    typeId: shopItem.typeId,
    name,
    offense,
    defense,
  };
}

/** Whether the player has a weapon equipped in the given city (weapon slot index 0). */
export async function hasWeaponEquippedInCity(params: {
  publicClient: ReadClient;
  equipmentAddress: `0x${string}`;
  inventoryAddress: `0x${string}`;
  chain: string;
  account: `0x${string}`;
  cityId: number;
  signMsg: string;
  signature: `0x${string}`;
}): Promise<boolean> {
  const weapon = await getEquippedWeaponInCity(params);
  return weapon !== null;
}

export async function getAllCityEquipmentInfo(params: {
  publicClient: ReadClient;
  equipmentAddress: `0x${string}`;
  account: `0x${string}`;
  signMsg: string;
  signature: `0x${string}`;
}): Promise<CityStakeInfo[]> {
  const { publicClient, equipmentAddress, account, signMsg, signature } =
    params;

  const results = await Promise.all(
    EQUIPMENT_CITY_IDS.map((cityId) =>
      getEquipmentInfo({
        publicClient,
        equipmentAddress,
        account,
        cityId,
        signMsg,
        signature,
      }),
    ),
  );

  return EQUIPMENT_CITY_IDS.map((cityId, index) => {
    const info = results[index];
    const mafiaAmountWei = info?.mafiaAmountWei ?? BigInt(0);
    return {
      cityId,
      cityName: City[cityId] ?? `City ${cityId}`,
      abbreviation: CitySimple[cityId] ?? `C${cityId}`,
      mafiaAmountWei,
      mafiaAmount: Number(formatEther(mafiaAmountWei)),
      equippedAt: info?.equippedAt ?? 0,
      itemIds: info?.itemIds ?? Array(10).fill(0),
    };
  });
}

export interface UnstakeEquipArgs {
  cityId: number;
  itemIds: bigint[];
  delta: bigint;
}

/** Build `equipItems` args to unstake all MAFIA from a city without changing items. */
export function buildUnstakeEquipArgs(stake: CityStakeInfo): UnstakeEquipArgs {
  return {
    cityId: stake.cityId,
    itemIds: stake.itemIds.map((id) => BigInt(id)),
    delta: -stake.mafiaAmountWei,
  };
}
