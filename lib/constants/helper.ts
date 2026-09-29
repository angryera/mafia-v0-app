import { formatEther } from "viem";
import { EQUIPMENT_SLOTS, JAIL_BUYOUT_CASH_PER_MINUTE, OC_REWARD_CASH_TYPE_ID, RANK_NAMES, TravelCities } from "./const";
import { BODYGUARD_INFO, CRATE_ITEM_CATEGORIES, CrateItemCategory, ItemCategory, LEGACY_BODYGUARD_TYPES } from "./const";
import { BulletBotPlusInfo, HelperBotInfo } from "./type";

// Fast lookup by categoryId
const _categoryMap = new Map<number, CrateItemCategory>();
CRATE_ITEM_CATEGORIES.forEach((c) => _categoryMap.set(c.id, c));

/** Get the category info for an on-chain categoryId, or undefined */
export function getCrateCategory(categoryId: number): CrateItemCategory | undefined {
    return _categoryMap.get(categoryId);
}

/** Get the human-readable item value for an on-chain categoryId + typeId */
export function getCrateItemLabel(categoryId: number, typeId: number): string {
    const cat = _categoryMap.get(categoryId);
    if (!cat) return `Category #${categoryId} / Type #${typeId}`;
    // Perk / boost categories with empty values array — show name + typeId as level
    if (cat.values.length === 0) {
        return `${cat.name} (Tier ${typeId + 1})`;
    }
    const val = cat.values[typeId];
    if (val === undefined) return `${cat.name} #${typeId}`;
    if (typeof val === "number") {
        const formatted = val.toLocaleString();
        return cat.currency ? `${cat.currency}${formatted}` : `${formatted} ${cat.name}`;
    }
    return String(val);
}


export const parseHelperBotInfo = (data: any): HelperBotInfo => {
    return {
        successRate: Number(data.successRate),
        startTimestamp: Number(data.startTimestamp),
        endTimestamp: Number(data.endTimestamp),
        attemptCount: Number(data.attemptCount),
        isRunning: Boolean(data.isRunning),
    };
};

export const parseBulletBotPlusInfo = (data: any): BulletBotPlusInfo => {
    return {
        amountModifiedPercent: BigInt(data.amountModifiedPercent),
        priceModifiedPercent: BigInt(data.priceModifiedPercent),
    };
};

export interface ResolvedBodyguard {
    name: string;
    level: number;
    characterCategoryId: number;
    defense: number;
    offense: number;
    defensePerLevel: number;
    offensePerLevel: number;
    isMaxLevel: boolean;
}

/** Resolve a bodyguard item to its character, level, and combat stats.
 *  Individual categories (48–51) store level as typeId + 1.
 *  Legacy category 5 stores a fixed name + level in each type id. */
export function resolveBodyguard(
    categoryId: number,
    typeId: number,
): ResolvedBodyguard | null {
    let characterCategoryId = categoryId;
    let level = typeId + 1;

    if (categoryId === ItemCategory.BODYGUARD) {
        const legacy = LEGACY_BODYGUARD_TYPES[typeId];
        if (!legacy) return null;
        characterCategoryId = legacy.categoryId;
        level = legacy.level;
    }

    const info = BODYGUARD_INFO[characterCategoryId];
    if (!info) return null;

    return {
        name: info.name,
        level,
        characterCategoryId,
        defense: info.defensePerLevel * level,
        offense: info.offensePerLevel * level,
        defensePerLevel: info.defensePerLevel,
        offensePerLevel: info.offensePerLevel,
        isMaxLevel: level >= 10,
    };
}

// Get shop item slot category
export function getShopItemSlotType(typeId: number): number {
    if (typeId >= 0 && typeId <= 2) return EQUIPMENT_SLOTS.WEAPON;
    if (typeId === 3 || typeId === 4) return EQUIPMENT_SLOTS.AMMUNITION_1; // Can also use AMMUNITION_2, AMMUNITION_3
    if (typeId === 6 || typeId === 7) return EQUIPMENT_SLOTS.ARMOR;
    if (typeId === 5 || typeId === 8 || typeId === 9) return EQUIPMENT_SLOTS.TRANSPORT;
    return -1;
}

export function parseOcRewardAmount(typeId: number, amountRaw: bigint): number {
    if (typeId === OC_REWARD_CASH_TYPE_ID) {
        return Number(formatEther(amountRaw));
    }
    return Number(amountRaw);
}

export function getRankName(rank: number): string {
    return RANK_NAMES[rank] || `Rank ${rank}`;
}

/** Profile `gender` field: 1 = female, anything else = male. */
export function getGenderLabel(gender: number): string {
    return gender === 1 ? "Female" : "Male";
}

export function calculateJailBuyOutCost(remainingSeconds: number): number {
    return Math.ceil(Math.max(0, remainingSeconds) / 60) * JAIL_BUYOUT_CASH_PER_MINUTE;
}

// Helper to get region for a city
export function getCityRegion(cityId: number): string {
    for (const region of TravelCities) {
        if (region.cities.some((c) => c.cityId === cityId)) {
            return region.region;
        }
    }
    return "Unknown";
}