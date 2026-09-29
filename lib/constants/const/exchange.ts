// Exchange Cash values by typeId
export const CASH_VALUES: Record<number, number> = {
    0: 50000,
    1: 150000,
    2: 250000,
    3: 350000,
    4: 500000,
    5: 1000000,
    6: 2500000,
    7: 4000000,
    8: 5000000,
    9: 10000000,
};

// Exchange ShopItem values by typeId
export const SHOPITEM_VALUES: Record<number, number> = {
    0: 12500,
    1: 37500,
    2: 75000,
    3: 37500,
    4: 25000,
    5: 87500,
    6: 62500,
    7: 212500,
    8: 175000,
    9: 750000,
};

// Exchange Credit USD values by typeId
export const CREDIT_USD_VALUES: Record<number, number> = {
    0: 1,
    1: 2.5,
    2: 5,
    3: 10,
    4: 15,
    5: 20,
    6: 25,
    7: 30,
    8: 40,
    9: 75,
};

// Exchange LandSlot USD values by rarity
export const LANDSLOT_USD_VALUES: Record<string, number> = {
    Strategic: 15,
    Elite: 12,
    Upper: 8,
    Common: 4,
};

// Convert item category names
export const CONVERT_CATEGORY_NAMES: Record<number, string> = {
    0: "Cash",
    3: "Shop Item",
    6: "Credit",
    13: "Land Slot",
};
