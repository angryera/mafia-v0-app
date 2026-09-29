// ========== Safehouse Contract ==========
export const SAFEHOUSE_COST_PER_HOUR = 100_000;

export const SAFEHOUSE_MIN_HOURS = 1;

export const SAFEHOUSE_MAX_HOURS = 100;

export const SAFEHOUSE_BASE_COOLDOWN = 6 * 60 * 60; // 6 hours

// ========== Detective Agency Contract ==========
export const DETECTIVE_HIRING_TIME = 40 * 60; // 40 minutes in seconds

export const DETECTIVE_TARGET_FOUND_DURATION = 2 * 60 * 60; // 2 hours

/** In-game cash per started minute of remaining jail time when buying out. */
export const JAIL_BUYOUT_CASH_PER_MINUTE = 1500;

// USD requirement per rank (1-indexed, matching RANK_NAMES keys; first 3 ranks are free)
export const RANK_USD_REQUIREMENTS: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 5, 5: 10, 6: 15, 7: 20, 8: 25, 9: 30, 10: 35,
    11: 40, 12: 45, 13: 50, 14: 55, 15: 60, 16: 65, 17: 70, 18: 75, 19: 80,
    20: 85, 21: 90, 22: 95, 23: 100, 24: 105, 25: 110, 26: 115, 27: 120,
    28: 125, 29: 130, 30: 135,
};

// Rank level names (static, not on-chain)
export const RANK_NAMES: Record<number, string> = {
    1: "Nobody",
    2: "Apprentice",
    3: "Pickpocket",
    4: "Cloak",
    5: "Thief",
    6: "Locksmith",
    7: "Runner",
    8: "Associate",
    9: "Dealer",
    10: "Fixer",
    11: "Collector",
    12: "Enforcer",
    13: "Prospect",
    14: "Lieutenant",
    15: "Soldier",
    16: "Mobster",
    17: "Swindler",
    18: "Whisperer",
    19: "Architect",
    20: "Hitman",
    21: "Assassin",
    22: "Commander",
    23: "Executioner",
    24: "Widowmaker",
    25: "Bone Collector",
    26: "Tactician",
    27: "Chief",
    28: "Warlord",
    29: "Capo Bastone",
    30: "Godfather",
};

// XP required to reach each rank level (static, not on-chain)
// Array indexed by rank level (0-29), where index 0 = rank 1, index 29 = rank 30
export const RANK_XP: number[] = [
    0, 10000, 20000, 40000, 80000, 160000, 196800, 242100, 297700, 366200, 450400,
    554100, 681500, 838200, 1081300, 1394900, 1799400, 2321200, 2994400, 3862800,
    5407900, 7571000, 10599400, 14839200, 20774900, 29084900, 40718800, 57006400,
    79808900, 111732500,
];
