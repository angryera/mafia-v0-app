import { ItemCategory } from "./items";

// Maximum MAFIA stake for equipment
export const MAX_EQUIPMENT_MAFIA_STAKE = 1000000;

// Building stats by slot subtype
export const BUILDING_STATS: Record<number, { offense: number; defense: number; name: string }> = {
    0: { offense: 0, defense: 0, name: "Empty Tile" },
    1: { offense: 3, defense: 5, name: "Shed" },
    2: { offense: 15, defense: 15, name: "House" },
    3: { offense: 30, defense: 30, name: "Villa" },
    4: { offense: 50, defense: 75, name: "Office" },
    5: { offense: 60, defense: 90, name: "Apartment" },
    6: { offense: 75, defense: 110, name: "Mansion" },
    7: { offense: 75, defense: 150, name: "Hotel" },
};

export const EQUIPMENT_SLOT_LABELS: Record<number, string> = {
    0: "Weapon",
    1: "Ammo 1",
    2: "Ammo 2",
    3: "Ammo 3",
    4: "Armor",
    5: "Transport",
    6: "Building 1",
    7: "Building 2",
    8: "Bodyguard 1",
    9: "Bodyguard 2",
};

// Shop item stats for defense/offense
export const SHOP_ITEM_STATS: Record<number, { offense: number; defense: number; name: string }> = {
    0: { offense: 10, defense: 10, name: "Hand Gun Colt" },
    1: { offense: 25, defense: 30, name: "Remington" },
    2: { offense: 75, defense: 25, name: "Thompson" },
    3: { offense: 10, defense: 8, name: "Molotov Cocktail" },
    4: { offense: 15, defense: 5, name: "Grenade" },
    5: { offense: 90, defense: 30, name: "Motorcycle" },
    6: { offense: 15, defense: 45, name: "Bullet Proof Vest" },
    7: { offense: 2, defense: 95, name: "Bullet Proof Suit" },
    8: { offense: 30, defense: 100, name: "Armored Car" },
    9: { offense: 75, defense: 75, name: "Douglas M-3" },
};

// Rarity amplifiers for buildings
export const RARITY_AMPLIFIERS: Record<number, number> = {
    0: 1.0,   // Common
    1: 1.15,  // Upper
    2: 1.3,   // Strategic
    3: 1.4,   // Elite
};

export const RARITY_NAMES: Record<number, string> = {
    0: "Common",
    1: "Upper",
    2: "Strategic",
    3: "Elite",
};

export const BODYGUARD_CATEGORIES = [
    ItemCategory.BODYGUARD,
    ItemCategory.BODYGUARD_JOHNNY,
    ItemCategory.BODYGUARD_JIM,
    ItemCategory.BODYGUARD_SAM,
    ItemCategory.BODYGUARD_FRANK,
];

// Equipment slot types
export const EQUIPMENT_SLOTS = {
    WEAPON: 0,          // Colt, Remington, Tommygun
    AMMUNITION_1: 1,    // Molotov, Grenade
    AMMUNITION_2: 2,    // Molotov, Grenade
    AMMUNITION_3: 3,    // Molotov, Grenade
    ARMOR: 4,           // Bullet proof vest, Bullet proof suit
    TRANSPORT: 5,       // Armored Car, Douglas M-3
    BUILDING_1: 6,
    BUILDING_2: 7,
    BODYGUARD_1: 8,
    BODYGUARD_2: 9,
} as const;

/** Category 5 type ids are fixed name + level pairs. They are not a 1–10 level index. */
export const LEGACY_BODYGUARD_TYPES: ReadonlyArray<{
    categoryId: number;
    level: number;
}> = [
        { categoryId: ItemCategory.BODYGUARD_JOHNNY, level: 3 },
        { categoryId: ItemCategory.BODYGUARD_JIM, level: 3 },
        { categoryId: ItemCategory.BODYGUARD_SAM, level: 3 },
        { categoryId: ItemCategory.BODYGUARD_JOHNNY, level: 5 },
        { categoryId: ItemCategory.BODYGUARD_JIM, level: 6 },
        { categoryId: ItemCategory.BODYGUARD_SAM, level: 6 },
        { categoryId: ItemCategory.BODYGUARD_FRANK, level: 7 },
        { categoryId: ItemCategory.BODYGUARD_JOHNNY, level: 8 },
        { categoryId: ItemCategory.BODYGUARD_SAM, level: 10 },
        { categoryId: ItemCategory.BODYGUARD_FRANK, level: 10 },
    ];

export const BODYGUARD_INFO: Record<
    number,
    {
        name: string;
        basePrice: number;
        pricePerTraining: number;
        img: string;
        defensePerLevel: number;
        offensePerLevel: number;
    }
> = {
    [ItemCategory.BODYGUARD_JOHNNY]: {
        name: "Johnny",
        basePrice: 250000,
        pricePerTraining: 50000,
        img: "johnny-bgsmall.png",
        defensePerLevel: 3,
        offensePerLevel: 4,
    },
    [ItemCategory.BODYGUARD_JIM]: {
        name: "Jim",
        basePrice: 500000,
        pricePerTraining: 110000,
        img: "jim-bgsmall.png",
        defensePerLevel: 6,
        offensePerLevel: 6,
    },
    [ItemCategory.BODYGUARD_SAM]: {
        name: "Sam",
        basePrice: 1000000,
        pricePerTraining: 250000,
        img: "sam-bgsmall.png",
        defensePerLevel: 17,
        offensePerLevel: 7,
    },
    [ItemCategory.BODYGUARD_FRANK]: {
        name: "Frank",
        basePrice: 1300000,
        pricePerTraining: 375000,
        img: "frank-bgsmall.png",
        defensePerLevel: 10,
        offensePerLevel: 25,
    },
};
