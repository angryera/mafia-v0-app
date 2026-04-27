
export const MAFIA_BUY_FEE = 4.7;

// 100 million approval amount in wei (18 decimals)
export const INGAME_CURRENCY_APPROVE_AMOUNT = BigInt("100000000000000000000000000");

export const HELPER_BOT_BULLET_PRICE = 200;

// ========== Safehouse Contract ==========
export const SAFEHOUSE_COST_PER_HOUR = 100_000;
export const SAFEHOUSE_MIN_HOURS = 1;
export const SAFEHOUSE_MAX_HOURS = 100;
export const SAFEHOUSE_BASE_COOLDOWN = 6 * 60 * 60; // 6 hours

// ========== Detective Agency Contract ==========
export const DETECTIVE_HIRING_TIME = 40 * 60; // 40 minutes in seconds
export const DETECTIVE_TARGET_FOUND_DURATION = 2 * 60 * 60; // 2 hours

// USD requirement per rank (1-indexed, matching RANK_NAMES keys; first 3 ranks are free)
export const RANK_USD_REQUIREMENTS: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 5, 5: 10, 6: 15, 7: 20, 8: 25, 9: 30, 10: 35,
    11: 40, 12: 45, 13: 50, 14: 55, 15: 60, 16: 65, 17: 70, 18: 75, 19: 80,
    20: 85, 21: 90, 22: 95, 23: 100, 24: 105, 25: 110, 26: 115, 27: 120,
    28: 125, 29: 130, 30: 135,
};

// Maximum MAFIA stake for equipment
export const MAX_EQUIPMENT_MAFIA_STAKE = 1000000;

/** `MafiaOCLobby.Reward`: amount is ether-denominated only for cash (typeId 0). */
export const OC_REWARD_CASH_TYPE_ID = 0;
export const OC_MIN_HEALTH = 300;
export const OC_MAX_CASH = 1_500_000;
export const OC_MAX_BULLETS = 5_000;
export const OC_JAIL_HOURS = 72; // 48 * 1.5
export const OC_HEALTH_LOSS = 300;

// Crime type labels for the uint8 parameter
export const CRIME_TYPES: { id: number; label: string; description: string; risk: "Low" | "Medium" | "High" | "Extreme" }[] = [
    { id: 0, label: "Rob a Hot Dog Vendor", description: "Swipe some cash from the street vendor", risk: "Low" },
    { id: 1, label: "Rob a Freight Train", description: "Intercept a cargo shipment on the rails", risk: "Medium" },
    { id: 2, label: "Rob the Bank", description: "Hit the vault for the big score", risk: "High" },
    { id: 3, label: "Bribe the Police Station", description: "Grease some palms to stay out of trouble", risk: "Extreme" },
];

export const TRAVEL_TYPES: {
    id: number;
    label: string;
    icon: string;
    cost: number;
    travelTime: number;
}[] = [
        { id: 0, label: "Train", icon: "train", cost: 250, travelTime: 240 * 60 },
        { id: 1, label: "Car/Motorcycle", icon: "car", cost: 750, travelTime: 120 * 60 },
        { id: 2, label: "Airplane", icon: "plane", cost: 1750, travelTime: 60 * 60 },
    ];

// City enum for reference
export const City: Record<number, string> = {
    0: "Chicago",
    1: "Detroit",
    2: "New York",
    3: "Miami",
    4: "Las Vegas",
    5: "Medellin",
    6: "Bogota",
    7: "Caracas",
    8: "Palermo",
    9: "Messina",
    10: "Napoli",
};

export const CitySimple = [
    "CHI",
    "DET",
    "NYC",
    "MIA",
    "LVG",
    "MED",
    "BOG",
    "CAR",
    "PAL",
    "MES",
    "NAP",
] as const;

export type TravelRegion = {
    region: string;
    cities: { name: string; cityId: number }[];
};

export const TravelCities: TravelRegion[] = [
    {
        region: "North America",
        cities: [
            { name: City[0], cityId: 0 },
            { name: City[1], cityId: 1 },
            { name: City[2], cityId: 2 },
            { name: City[3], cityId: 3 },
            { name: City[4], cityId: 4 },
        ],
    },
    {
        region: "South America",
        cities: [
            { name: City[5], cityId: 5 },
            { name: City[6], cityId: 6 },
            { name: City[7], cityId: 7 },
        ],
    },
    {
        region: "Europe",
        cities: [
            { name: City[8], cityId: 8 },
            { name: City[9], cityId: 9 },
            { name: City[10], cityId: 10 },
        ],
    },
];

// Travel destination cities for the destinationCity parameter
export const TRAVEL_DESTINATIONS: { id: number; label: string; country: string }[] = [
    { id: 0, label: "Chicago", country: "USA" },
    { id: 1, label: "Detroit", country: "USA" },
    { id: 2, label: "New York", country: "USA" },
    { id: 3, label: "Miami", country: "USA" },
    { id: 4, label: "Las Vegas", country: "USA" },
    { id: 5, label: "Medellin", country: "Colombia" },
    { id: 6, label: "Bogota", country: "Colombia" },
    { id: 7, label: "Caracas", country: "Venezuela" },
    { id: 8, label: "Palermo", country: "Italy" },
    { id: 9, label: "Messina", country: "Italy" },
    { id: 10, label: "Napoli", country: "Italy" },
];


// Nick a Car crime types for the crimeType parameter
export const NICKCAR_TYPES: { id: number; label: string; description: string }[] = [
    { id: 0, label: "On the Street Corner", description: "Hotwire a ride parked on the corner" },
    { id: 1, label: "At the Football Stadium", description: "Snag a car from the packed parking lot" },
    { id: 2, label: "From Private Residence", description: "Slip into a driveway and drive off" },
    { id: 3, label: "From the Dealership", description: "Walk into the showroom and never come back" },
];


// Kill skill training types for the trainType parameter
export const TRAIN_TYPES: { id: number; label: string; description: string }[] = [
    { id: 0, label: "Strength", description: "Build raw power for close-range encounters" },
    { id: 1, label: "Stealth", description: "Master the art of moving unseen" },
    { id: 2, label: "Accuracy", description: "Perfect your precision for ranged takedowns" },
];

export type HelperBotEndType = "none" | "signed" | "bulletSigned";

export const HELPER_BOTS: {
    id: number;
    label: string;
    description: string;
    startFn: string;
    endFn: string;
    infoFn: string;
    endType: HelperBotEndType;
    credits: number;
    rank: string;
    minAttempts: number;
    maxAttempts: number;
}[] = [
        { id: 0, label: "Crime Bot", description: "A stealthy robot executing street crimes with precision", startFn: "startCrimeBot", endFn: "endCrimeBot", infoFn: "userCrimeBotInfo", endType: "none", credits: 1, rank: "Low", minAttempts: 10, maxAttempts: 5000 },
        { id: 1, label: "Car Bot", description: "Bypasses security systems to steal cars with precision", startFn: "startCarBot", endFn: "endCarBot", infoFn: "userCarBotInfo", endType: "signed", credits: 4, rank: "Medium", minAttempts: 9, maxAttempts: 1249 },
        { id: 2, label: "Shooting Practice Bot", description: "Hones aiming skills to improve accuracy and reaction time", startFn: "startKSBot", endFn: "endKSBot", infoFn: "userKSBotInfo", endType: "none", credits: 8, rank: "Medium", minAttempts: 42, maxAttempts: 625 },
        { id: 3, label: "Booze Smuggling Bot", description: "Smuggles booze past authorities through stealth", startFn: "startBoozeBot", endFn: "endBoozeBot", infoFn: "userBoozeBotInfo", endType: "signed", credits: 7, rank: "High", minAttempts: 29, maxAttempts: 714 },
        { id: 4, label: "Narcotics Smuggling Bot", description: "Smuggles narcotics past authorities through stealth", startFn: "startNarcsBot", endFn: "endNarcsBot", infoFn: "userNarcsBotInfo", endType: "signed", credits: 10, rank: "High", minAttempts: 35, maxAttempts: 500 },
        { id: 5, label: "Bullet Dealer Bot", description: "Compares prices and assists in purchasing bullets", startFn: "startBulletBot", endFn: "endBulletBot", infoFn: "userBulletBotInfo", endType: "bulletSigned", credits: 12, rank: "Medium", minAttempts: 4, maxAttempts: 416 },
        { id: 6, label: "Race XP Bot", description: "Assists in earning race XP efficiently", startFn: "startRacingBot", endFn: "endRacingBot", infoFn: "userRacingBotInfo", endType: "none", credits: 5, rank: "Medium", minAttempts: 2, maxAttempts: 20 },
        { id: 7, label: "Bust Out Bot", description: "Assists in earning bust out XP efficiently", startFn: "startBustOutBot", endFn: "endBustOutBot", infoFn: "userBustOutBotInfo", endType: "none", credits: 2, rank: "Medium", minAttempts: 2, maxAttempts: 100 },
    ];


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

export type ShopItemMeta = {
    id: number;
    name: string;
    category: "weapons" | "transport" | "bodyguard";
    typeId: number;
};

export const SHOP_ITEMS: ShopItemMeta[] = [
    // Weapons
    { id: 1, name: "Colt", category: "weapons", typeId: 0 },
    { id: 2, name: "Remington", category: "weapons", typeId: 1 },
    { id: 3, name: "Tommy Gun", category: "weapons", typeId: 2 },
    { id: 5, name: "Molotov", category: "weapons", typeId: 3 },
    { id: 4, name: "Grenade", category: "weapons", typeId: 4 },
    // Transport & Armor
    { id: 6, name: "Motorcycle", category: "transport", typeId: 5 },
    { id: 9, name: "Bulletproof Vest", category: "transport", typeId: 6 },
    { id: 10, name: "Bulletproof Suit", category: "transport", typeId: 7 },
    { id: 7, name: "Armored Car", category: "transport", typeId: 8 },
    { id: 8, name: "Douglas M-3", category: "transport", typeId: 9 },
    // Bodyguards
    { id: 11, name: "Bodyguard Johnny", category: "bodyguard", typeId: 10 },
    { id: 12, name: "Bodyguard Jim", category: "bodyguard", typeId: 11 },
    { id: 13, name: "Bodyguard Sam", category: "bodyguard", typeId: 12 },
    { id: 14, name: "Bodyguard Frank", category: "bodyguard", typeId: 13 },
];

export const SHOP_CATEGORIES = [
    { key: "weapons" as const, label: "Weapons" },
    { key: "transport" as const, label: "Transport & Armor" },
    { key: "bodyguard" as const, label: "Bodyguards" },
];


// ========== Crate / Perk Box item category info (from on-chain ItemCategoryInfoList) ==========
export interface CrateItemCategory {
    id: number;
    name: string;
    values: (string | number)[];
    currency?: string;
}

// ItemCategory enum IDs from on-chain contract
export enum ItemCategory {
    CASH = 0,
    BULLET = 1,
    HEALTH = 2,
    SHOPITEM = 3,
    BUSINESS = 4,
    BODYGUARD = 5,
    CREDIT = 6,
    CAR = 7,
    KEY = 8,
    KEYITEMS = 9,
    MAFIA = 10,
    OGNFT = 11,
    NOTICREDIT = 12,
    LANDSLOT = 13,
    BUSINESS_EXTRA = 14,
    CAR_ITEM = 15,
    FBI_ASSETS = 16,
    PERK_BOX = 17,
    CRIME_SUCCESS = 18,
    NICK_CAR_SUCCESS = 19,
    BOOZE_SUCCESS = 20,
    NARCOTICS_SUCCESS = 21,
    KILL_SKILL_SUCCESS = 22,
    BUST_OUT_SUCCESS = 23,
    CRIME_COOLDOWN = 24,
    NICK_CAR_COOLDOWN = 25,
    BOOZE_COOLDOWN = 26,
    NARCOTICS_COOLDOWN = 27,
    KILL_SKILL_COOLDOWN = 28,
    TRAVEL_COOLDOWN = 29,
    BULLET_BUY_COOLDOWN = 30,
    HEALTH_BUY_COOLDOWN = 31,
    BUST_OUT_COOLDOWN = 32,
    MAP_YIELD_BOOST = 33,
    RACE_XP_BOOST = 34,
    KILL_SKILL_XP_BOOST = 35,
    BUST_OUT_XP_BOOST = 36,
    SALES_PRICE_NARCOTICS_BOOST = 37,
    SALES_PRICE_BOOZE_BOOST = 38,
    WORTH_BOOST = 39,
    REWARDS_BOOST = 40,
    PURCHASE_BOOST = 41,
    NO_JAIL_BOOST = 42,
    FREE_TRAVEL_BOOST = 43,
    BANK_FEE_BOOST = 44,
    CREDIT_COST_BOOST = 45,
    CONVERSION_RATE_BOOST = 46,
    CREDIT_SPEND_BOOST = 47,
    BODYGUARD_JOHNNY = 48,
    BODYGUARD_JIM = 49,
    BODYGUARD_SAM = 50,
    BODYGUARD_FRANK = 51,
    SUBSCRIPTION_ITEM = 52,
    GI_CREDIT = 53,
    MYSTERY_BOX = 54,
    BOOZE_PACK = 55,
    NARCS_PACK = 56,
}

export const CRATE_ITEM_CATEGORIES: CrateItemCategory[] = [
    // --- Crate rewards (0-17) ---
    {
        id: ItemCategory.CASH, name: "Cash", currency: "$",
        values: [50000, 150000, 250000, 350000, 500000, 1000000, 2500000, 4000000, 5000000, 10000000]
    },
    {
        id: ItemCategory.BULLET, name: "Bullet",
        values: [250, 500, 750, 1500, 3500, 5000, 7000, 15000, 20000, 30000]
    },
    {
        id: ItemCategory.HEALTH, name: "Health",
        values: [50, 100, 150, 200, 250, 300, 350, 500, 750, 1000]
    },
    {
        id: ItemCategory.SHOPITEM, name: "Shop Item",
        values: ["Hand Gun Colt", "Remington", "Thompson", "Molotov cocktail", "Grenade",
            "Motorcycle", "Bullet proof vest", "Bullet proof suit", "Armored car", "Douglas M-3"]
    },
    {
        id: ItemCategory.BUSINESS, name: "Business",
        values: ["Car crusher", "Gunstore", "Bank", "Hospital", "Detective Agency",
            "Booze warehouse", "Narcotics warehouse", "Slotmachine", "Roulette", "Bullet factory"]
    },
    {
        id: ItemCategory.BODYGUARD, name: "Bodyguard",
        values: ["Lvl 3 - Johnny", "Lvl 3 - Jim", "Lvl 3 - Sam", "Lvl 5 - Johnny",
            "Lvl 6 - Jim", "Lvl 6 - Sam", "Lvl 7 - Frank", "Lvl 8 - Johnny",
            "Lvl 10 - Sam", "Lvl 10 - Frank"]
    },
    {
        id: ItemCategory.CREDIT, name: "Helper Credits",
        values: [100, 250, 500, 1000, 1500, 2000, 2500, 3000, 3500, 5000]
    },
    {
        id: ItemCategory.CAR, name: "Car", currency: "$",
        values: [5000, 15000, 35000, 75000, 100000, 150000, 250000, 350000, 450000, 500000]
    },
    {
        id: ItemCategory.KEY, name: "Wrapped NFTs",
        values: ["Game Key", "Game OG"]
    },
    {
        id: ItemCategory.KEYITEMS, name: "Keys",
        values: ["1 Game Key", "3 Game Keys", "5 Game Keys", "7 Game Keys", "10 Game Keys",
            "15 Game Keys", "25 Game Keys", "50 Game Keys", "75 Game Keys", "100 Game Keys"]
    },
    {
        id: ItemCategory.MAFIA, name: "MAFIA",
        values: [10000, 15000, 20000, 30000, 50000, 100000, 250000, 500000, 1000000, 5000000]
    },
    {
        id: ItemCategory.OGNFT, name: "OG NFTs",
        values: ["1 OG NFT", "1 OG NFT", "1 OG NFT", "1 OG NFT", "1 OG NFT",
            "1 OG NFT", "3 OG NFTs", "3 OG NFTs", "7 OG NFTs", "10 OG NFTs"]
    },
    {
        id: ItemCategory.NOTICREDIT, name: "Noti Credits",
        values: ["1 Noti Credit", "1 Noti Credit", "1 Noti Credit", "1 Noti Credit",
            "1 Noti Credit", "1 Noti Credit", "3 Noti Credits", "3 Noti Credits",
            "7 Noti Credits", "10 Noti Credits"]
    },
    { id: ItemCategory.LANDSLOT, name: "Land Slot", values: ["Land Slot"] },
    {
        id: ItemCategory.BUSINESS_EXTRA, name: "Business",
        values: ["Jackpot hall", "Lottery hall", "Bank", "Hospital", "Detective Agency",
            "Booze warehouse", "Narcotics warehouse", "Slotmachine", "Roulette", "Bullet factory"]
    },
    { id: ItemCategory.CAR_ITEM, name: "Car", values: ["Car"] },
    {
        id: ItemCategory.FBI_ASSETS, name: "FBI Assets",
        values: ["FBI Training Pass", "Detective Badge", "Special Agent badge", "FBI Field office"]
    },
    {
        id: ItemCategory.PERK_BOX, name: "Perk Box",
        values: ["1 Perk Box", "3 Perk Boxes", "5 Perk Boxes", "7 Perk Boxes", "10 Perk Boxes",
            "15 Perk Boxes", "25 Perk Boxes", "50 Perk Boxes", "75 Perk Boxes", "100 Perk Boxes"]
    },

    // --- Perk Box rewards: success boosts (18-23) ---
    { id: ItemCategory.CRIME_SUCCESS, name: "Crime Success Boost", values: [] },
    { id: ItemCategory.NICK_CAR_SUCCESS, name: "Nick Car Success Boost", values: [] },
    { id: ItemCategory.BOOZE_SUCCESS, name: "Booze Success Boost", values: [] },
    { id: ItemCategory.NARCOTICS_SUCCESS, name: "Narcotics Success Boost", values: [] },
    { id: ItemCategory.KILL_SKILL_SUCCESS, name: "Kill Skill Success Boost", values: [] },
    { id: ItemCategory.BUST_OUT_SUCCESS, name: "Bust Out Success Boost", values: [] },

    // --- Perk Box rewards: cooldown boosts (24-32) ---
    { id: ItemCategory.CRIME_COOLDOWN, name: "Crime Cooldown Boost", values: [] },
    { id: ItemCategory.NICK_CAR_COOLDOWN, name: "Nick Car Cooldown Boost", values: [] },
    { id: ItemCategory.BOOZE_COOLDOWN, name: "Booze Cooldown Boost", values: [] },
    { id: ItemCategory.NARCOTICS_COOLDOWN, name: "Narcotics Cooldown Boost", values: [] },
    { id: ItemCategory.KILL_SKILL_COOLDOWN, name: "Kill Skill Cooldown Boost", values: [] },
    { id: ItemCategory.TRAVEL_COOLDOWN, name: "Travel Cooldown Boost", values: [] },
    { id: ItemCategory.BULLET_BUY_COOLDOWN, name: "Bullet Buy Cooldown Boost", values: [] },
    { id: ItemCategory.HEALTH_BUY_COOLDOWN, name: "Health Buy Cooldown Boost", values: [] },
    { id: ItemCategory.BUST_OUT_COOLDOWN, name: "Bust Out Cooldown Boost", values: [] },

    // --- Perk Box rewards: misc boosts (33-47) ---
    { id: ItemCategory.MAP_YIELD_BOOST, name: "Map Yield Boost", values: [] },
    { id: ItemCategory.RACE_XP_BOOST, name: "Race XP Boost", values: [] },
    { id: ItemCategory.KILL_SKILL_XP_BOOST, name: "Kill Skill XP Boost", values: [] },
    { id: ItemCategory.BUST_OUT_XP_BOOST, name: "Bust Out XP Boost", values: [] },
    { id: ItemCategory.SALES_PRICE_NARCOTICS_BOOST, name: "Narcotics Sale Price Boost", values: [] },
    { id: ItemCategory.SALES_PRICE_BOOZE_BOOST, name: "Booze Sale Price Boost", values: [] },
    { id: ItemCategory.WORTH_BOOST, name: "Worth Boost", values: [] },
    { id: ItemCategory.REWARDS_BOOST, name: "Rewards Boost", values: [] },
    { id: ItemCategory.PURCHASE_BOOST, name: "Purchase Boost", values: [] },
    { id: ItemCategory.NO_JAIL_BOOST, name: "No Jail Boost", values: [] },
    { id: ItemCategory.FREE_TRAVEL_BOOST, name: "Free Travel Boost", values: [] },
    { id: ItemCategory.BANK_FEE_BOOST, name: "Bank Fee Boost", values: [] },
    { id: ItemCategory.CREDIT_COST_BOOST, name: "Credit Cost Boost", values: [] },
    { id: ItemCategory.CONVERSION_RATE_BOOST, name: "Conversion Rate Boost", values: [] },
    { id: ItemCategory.CREDIT_SPEND_BOOST, name: "Credit Spend Boost", values: [] },

    // --- Bodyguards individual (48-51) ---
    {
        id: ItemCategory.BODYGUARD_JOHNNY, name: "Bodyguard Johnny",
        values: ["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4", "Lvl 5", "Lvl 6", "Lvl 7", "Lvl 8", "Lvl 9", "Lvl 10"]
    },
    {
        id: ItemCategory.BODYGUARD_JIM, name: "Bodyguard Jim",
        values: ["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4", "Lvl 5", "Lvl 6", "Lvl 7", "Lvl 8", "Lvl 9", "Lvl 10"]
    },
    {
        id: ItemCategory.BODYGUARD_SAM, name: "Bodyguard Sam",
        values: ["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4", "Lvl 5", "Lvl 6", "Lvl 7", "Lvl 8", "Lvl 9", "Lvl 10"]
    },
    {
        id: ItemCategory.BODYGUARD_FRANK, name: "Bodyguard Frank",
        values: ["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4", "Lvl 5", "Lvl 6", "Lvl 7", "Lvl 8", "Lvl 9", "Lvl 10"]
    },

    // --- Misc (52-56) ---
    {
        id: ItemCategory.SUBSCRIPTION_ITEM, name: "Subscription",
        values: ["1 Month Player+", "1 Month Unlimited", "1 Month Player+", "1 Month Unlimited",
            "2 Month Player+", "2 Month Unlimited", "3 Month Player+", "3 Month Unlimited",
            "6 Month Player+", "6 Month Unlimited"]
    },
    {
        id: ItemCategory.GI_CREDIT, name: "GI Credit",
        values: ["3 GI Credits", "4 GI Credits", "5 GI Credits", "7 GI Credits", "10 GI Credits",
            "15 GI Credits", "25 GI Credits", "50 GI Credits", "75 GI Credits", "100 GI Credits"]
    },
    { id: ItemCategory.MYSTERY_BOX, name: "Mystery Box", values: ["Mystery Box"] },
    { id: ItemCategory.BOOZE_PACK, name: "Booze Pack", values: [] },
    { id: ItemCategory.NARCS_PACK, name: "Narcs Pack", values: [] },
];

// Roulette bet types (betType field in the Bet struct)
// Bet type IDs matching the on-chain contract
// betType 0 = Red/Black, 1 = Column (R1/R2/R3), 2 = Dozen (S1/S2/S3),
// 3 = Half (H1/H2), 4 = Even/Odd, 5 = Straight number
export const ROULETTE_BET_TYPES = [
    {
        id: 0, label: "Red / Black", description: "18 numbers", payout: "1:1",
        options: [
            { value: 0, label: "Black" },
            { value: 1, label: "Red" },
        ]
    },
    {
        id: 1, label: "Column", description: "12 numbers (column)", payout: "2:1",
        options: [
            { value: 0, label: "1st Column" },
            { value: 1, label: "2nd Column" },
            { value: 2, label: "3rd Column" },
        ]
    },
    {
        id: 2, label: "Dozen", description: "12 numbers (section)", payout: "2:1",
        options: [
            { value: 0, label: "1st Dozen (1-12)" },
            { value: 1, label: "2nd Dozen (13-24)" },
            { value: 2, label: "3rd Dozen (25-36)" },
        ]
    },
    {
        id: 3, label: "Half", description: "18 numbers (high / low)", payout: "1:1",
        options: [
            { value: 0, label: "Low (1-18)" },
            { value: 1, label: "High (19-36)" },
        ]
    },
    {
        id: 4, label: "Even / Odd", description: "18 numbers", payout: "1:1",
        options: [
            { value: 0, label: "Even" },
            { value: 1, label: "Odd" },
        ]
    },
    {
        id: 5, label: "Straight", description: "Single number (0-37)", payout: "35:1",
        options: null
    },
] as const;

// Slot machine payout summary table (for display)
export const SLOT_PAYOUT_SUMMARY = [
    { name: "Health", twoX: 0.05, threeX: 0.5 },
    { name: "Bodyguard", twoX: 0.1, threeX: 1 },
    { name: "Helper Bot", twoX: 0.15, threeX: 1.5 },
    { name: "Cash", twoX: 0.3, threeX: 3 },
    { name: "Bullets", twoX: 0.5, threeX: 5 },
    { name: "Crate", twoX: 1, threeX: 10 },
    { name: "MAFIA Token", twoX: 1.5, threeX: 15 },
    { name: "Keys", twoX: 2.5, threeX: 25 },
    { name: "OG NFT", twoX: 5, threeX: 50 },
    { name: "Diamond", twoX: 10, threeX: 100 },
    { name: "Jackpot 7", twoX: 50, threeX: 500 },
] as const;

// ========== Inventory Marketplace Item Names ==========
export const MARKETPLACE_CATEGORY_NAMES: Record<number, string> = {
    0: "Cash",
    1: "Bullet",
    2: "Health",
    3: "ShopItem",
    4: "Business",
    5: "Bodyguards",
    6: "Helper Credits",
    7: "Car",
    8: "Wrapped NFTs",
    9: "Keys",
    10: "MAFIA",
    11: "OG NFTs",
    12: "Noti Credits",
    13: "Land Slot",
    14: "Business",
    15: "Car",
    16: "FBI Assets",
    17: "Perk Box",
    33: "Map Yield Boost",
    34: "Race XP Boost",
    35: "Kill Skill XP Boost",
    36: "Bust Out XP Boost",
    37: "Narcotics Sales Price Boost",
    38: "Booze Sales Price Boost",
    39: "Worth Boost",
    40: "Crime Rewards Boost",
    41: "Double Purchase",
    42: "No Jail Time",
    43: "Free Travel",
    44: "Bank Fee Reduction",
    45: "Credit Cost Reduction",
    46: "Increased Conversion Rate",
    47: "Credit Spend Reduction",
    48: "Bodyguard Johnny",
    49: "Bodyguard Jim",
    50: "Bodyguard Sam",
    51: "Bodyguard Frank",
    52: "Subscription Item",
    53: "GI Credit",
    54: "Mystery Box",
    55: "Booze Pack",
    56: "Narcotics Pack",
};

export const MARKETPLACE_ITEM_NAMES: Record<number, Record<number, string>> = {
    0: { // Cash
        0: "$50,000", 1: "$150,000", 2: "$250,000", 3: "$350,000", 4: "$500,000",
        5: "$1,000,000", 6: "$2,500,000", 7: "$4,000,000", 8: "$5,000,000", 9: "$10,000,000",
    },
    1: { // Bullet
        0: "250 Bullets", 1: "500 Bullets", 2: "750 Bullets", 3: "1,500 Bullets", 4: "3,500 Bullets",
        5: "5,000 Bullets", 6: "7,000 Bullets", 7: "15,000 Bullets", 8: "20,000 Bullets", 9: "30,000 Bullets",
    },
    2: { // Health
        0: "50 Health", 1: "100 Health", 2: "150 Health", 3: "200 Health", 4: "250 Health",
        5: "300 Health", 6: "350 Health", 7: "500 Health", 8: "750 Health", 9: "1,000 Health",
    },
    3: { // ShopItem
        0: "Hand Gun Colt", 1: "Remington", 2: "Thompson", 3: "Molotov cocktail", 4: "Grenade",
        5: "Motorcycle", 6: "Bullet proof vest", 7: "Bullet proof suit", 8: "Armored car", 9: "Douglas M-3",
    },
    4: { // Business
        0: "Car crusher", 1: "Gunstore", 2: "Bank", 3: "Hospital", 4: "Detective Agency",
        5: "Booze warehouse", 6: "Narcotics warehouse", 7: "Slotmachine", 8: "Roulette", 9: "Bullet factory",
    },
    5: { // Bodyguards (legacy)
        0: "Lvl 3 - Johnny", 1: "Lvl 3 - Jim", 2: "Lvl 3 - Sam", 3: "Lvl 5 - Johnny", 4: "Lvl 6 - Jim",
        5: "Lvl 6 - Sam", 6: "Lvl 7 - Frank", 7: "Lvl 8 - Johnny", 8: "Lvl 10 - Sam", 9: "Lvl 10 - Frank",
    },
    6: { // Helper Credits
        0: "100 Helper Credits", 1: "250 Helper Credits", 2: "500 Helper Credits", 3: "1,000 Helper Credits",
        4: "1,500 Helper Credits", 5: "2,000 Helper Credits", 6: "2,500 Helper Credits",
        7: "3,000 Helper Credits", 8: "3,500 Helper Credits", 9: "5,000 Helper Credits",
    },
    7: { // Car
        0: "$5,000 Car", 1: "$15,000 Car", 2: "$35,000 Car", 3: "$75,000 Car", 4: "$100,000 Car",
        5: "$150,000 Car", 6: "$250,000 Car", 7: "$350,000 Car", 8: "$450,000 Car", 9: "$500,000 Car",
    },
    8: { // Wrapped NFTs
        0: "Game Key", 1: "Game OG",
    },
    9: { // Keys
        0: "1 Game Key", 1: "3 Game Keys", 2: "5 Game Keys", 3: "7 Game Keys", 4: "10 Game Keys",
        5: "15 Game Keys", 6: "25 Game Keys", 7: "50 Game Keys", 8: "75 Game Keys", 9: "100 Game Keys",
    },
    10: { // MAFIA
        0: "10,000 MAFIA", 1: "15,000 MAFIA", 2: "20,000 MAFIA", 3: "30,000 MAFIA", 4: "50,000 MAFIA",
        5: "100,000 MAFIA", 6: "250,000 MAFIA", 7: "500,000 MAFIA", 8: "1,000,000 MAFIA", 9: "5,000,000 MAFIA",
    },
    11: { // OG NFTs
        0: "1 OG NFT", 1: "1 OG NFT", 2: "1 OG NFT", 3: "1 OG NFT", 4: "1 OG NFT",
        5: "1 OG NFT", 6: "3 OG NFTs", 7: "3 OG NFTs", 8: "7 OG NFTs", 9: "10 OG NFTs",
    },
    12: { // Noti Credits
        0: "1 Noti Credit", 1: "1 Noti Credit", 2: "1 Noti Credit", 3: "1 Noti Credit", 4: "1 Noti Credit",
        5: "1 Noti Credit", 6: "3 Noti Credits", 7: "3 Noti Credits", 8: "7 Noti Credits", 9: "10 Noti Credits",
    },
    13: { // Land Slot
        0: "Land Slot",
    },
    14: { // Business (v2)
        0: "Jackpot hall", 1: "Lottery hall", 2: "Bank", 3: "Hospital", 4: "Detective Agency",
        5: "Booze warehouse", 6: "Narcotics warehouse", 7: "Slotmachine", 8: "Roulette", 9: "Bullet factory",
    },
    15: {
        0: "Rolls-Royce 20/25 HP Standard Sedan - $125,000",
        1: "Rolls-Royce 20/25 HP Sports Saloon - $175,000",
        2: "Rolls-Royce Phantom II - $250,000",
        3: "Rolls-Royce Phantom II Continental Limousine - $500,000",
        4: "Bentley 4.5 Litre Standard Tourer  - $100,000",
        5: "Bentley 4.5 Litre Sports Saloon  - $150,000",
        6: "Bentley Speed Six Saloon  - $200,000",
        7: "Bentley 8 Litre Limousine by H.J. Mulliner  - $450,000",
        8: "Packard Standard Eight Model 726  - $75,000",
        9: "Packard Standard Eight Model 733  - $125,000",
        10: "Packard Deluxe Eight Model 740  - $175,000",
        11: "Packard Custom Eight Model 745 Convertible Sedan  - $350,000",
        12: "Cadillac Series 353 Standard Sedan  - $70,000",
        13: "Cadillac Series 353 Town Sedan  - $120,000",
        14: "Cadillac V-16 Imperial Sedan  - $180,000",
        15: "Cadillac V-16 Roadster  - $275,000",
        16: "Lincoln Model L  - $60,000",
        17: "Lincoln Model K sedan  - $100,000",
        18: "Lincoln Model L Town Car  - $155,000",
        19: "Lincoln Model L Limousine  - $250,000",
        20: "Chrysler Model 66 sedan  - $40,000",
        21: "Chrysler Series 70 sedan  - $75,000",
        22: "Chrysler Imperial Model 80 Roadster  - $90,000",
        23: "Chrysler Imperial Custom Series 8 Limousine  - $150,000",
        24: "Buick Series 40  - $15,000",
        25: "Buick Series 50 sedan  - $35,000",
        26: "Buick Series 60 sedan  - $50,000",
        27: "Buick Series 90 Limited  - $100,000",
        28: "DeSoto Model K  - $16,000",
        29: "DeSoto CF Eight sedan  - $25,000",
        30: "DeSoto Deluxe Eight sedan  - $40,000",
        31: "DeSoto Custom Imperial Limousine  - $75,000",
        32: "Dodge DC Series sedan  - $16,000",
        33: "Dodge Eight Series DH sedan  - $25,000",
        34: "Dodge Senior Six sedan  - $35,000",
        35: "Dodge Deluxe Eight Limousine  - $75,000",
        36: "Hudson Greater Eight  - $8,000",
        37: "Hudson Essex Super Six  - $16,000",
        38: "Hudson Custom Eight  - $27,000",
        39: "Hudson Greater Eight Custom Limousine  - $50,000",
        40: "Nash 400 Series sedan  - $8,000",
        41: "Nash Standard Six sedan  - $16,000",
        42: "Nash Advanced Eight sedan  - $27,000",
        43: "Nash Ambassador Eight Limousine  - $50,000",
        44: "Studebaker Six Standard Sedan  - $8,000",
        45: "Studebaker Commander Sedan  - $16,000",
        46: "Studebaker President Eight Sedan  - $27,000",
        47: "Studebaker President Convertible Coupe  - $50,000",
        48: "Ford Model A  - $5,000",
        49: "Ford Model A Deluxe Roadster  - $12,000",
        50: "Ford Model A Town Car  - $21,000",
        51: "Ford Model A Tudor Limousine  - $42,000",
        52: "Chevrolet Universal Series AD Coach  - $5,000",
        53: "Chevrolet Independence Series AE sedan  - $12,000",
        54: "Chevrolet Series AD Universal Phaeton  - $21,000",
        55: "Chevrolet Series AD Universal Landau  - $42,000",
        56: "Austin 7  - $5,000",
        57: "Austin 12/4  - $12,000",
        58: "Austin 16  - $15,000",
        59: "Austin 20/6 Mayfair Limousine  - $37,000",
        60: "Plymouth Model U  - $5,000",
        61: "Plymouth 30U sedan  - $12,000",
        62: "Plymouth PA Deluxe sedan  - $15,000",
        63: "Plymouth PA Deluxe Limousine  - $37,000"
    },
    // Category 15 = Car (Dynamic from CarsList - handled separately)
    16: { // FBI Assets
        0: "FBI Training Pass", 1: "Detective Badge", 2: "Special Agent badge", 3: "FBI Field office",
    },
    17: { // Perk Box
        0: "1 Perk Box", 1: "3 Perk Boxes", 2: "5 Perk Boxes", 3: "7 Perk Boxes", 4: "10 Perk Boxes",
        5: "15 Perk Boxes", 6: "25 Perk Boxes", 7: "50 Perk Boxes", 8: "75 Perk Boxes", 9: "100 Perk Boxes",
    },

    18: {
        0: "Crime Success +100% for 6 hours", 1: "Crime Success +100% for 12 hours", 2: "Crime Success +100% for 24 hours", 3: "Crime Success +100% for 48 hours", 4: "Crime Success +100% for 72 hours", 5: "Crime Success +100% for 96 hours",
        6: "Crime Success +75% for 6 hours", 7: "Crime Success +75% for 12 hours", 8: "Crime Success +75% for 24 hours", 9: "Crime Success +75% for 48 hours", 10: "Crime Success +75% for 72 hours", 11: "Crime Success +75% for 96 hours",
        12: "Crime Success +50% for 6 hours", 13: "Crime Success +50% for 12 hours", 14: "Crime Success +50% for 24 hours", 15: "Crime Success +50% for 48 hours", 16: "Crime Success +50% for 72 hours", 17: "Crime Success +50% for 96 hours",
    },
    19: {
        0: "Nick a car Success +100% for 6 hours", 1: "Nick a car Success +100% for 12 hours", 2: "Nick a car Success +100% for 24 hours", 3: "Nick a car Success +100% for 48 hours", 4: "Nick a car Success +100% for 72 hours", 5: "Nick a car Success +100% for 96 hours",
        6: "Nick a car Success +75% for 6 hours", 7: "Nick a car Success +75% for 12 hours", 8: "Nick a car Success +75% for 24 hours", 9: "Nick a car Success +75% for 48 hours", 10: "Nick a car Success +75% for 72 hours", 11: "Nick a car Success +75% for 96 hours",
        12: "Nick a car Success +50% for 6 hours", 13: "Nick a car Success +50% for 12 hours", 14: "Nick a car Success +50% for 24 hours", 15: "Nick a car Success +50% for 48 hours", 16: "Nick a car Success +50% for 72 hours", 17: "Nick a car Success +50% for 96 hours",
    },
    20: {
        0: "Booze Success +100% for 6 hours", 1: "Booze Success +100% for 12 hours", 2: "Booze Success +100% for 24 hours", 3: "Booze Success +100% for 48 hours", 4: "Booze Success +100% for 72 hours", 5: "Booze Success +100% for 96 hours",
        6: "Booze Success +75% for 6 hours", 7: "Booze Success +75% for 12 hours", 8: "Booze Success +75% for 24 hours", 9: "Booze Success +75% for 48 hours", 10: "Booze Success +75% for 72 hours", 11: "Booze Success +75% for 96 hours",
        12: "Booze Success +50% for 6 hours", 13: "Booze Success +50% for 12 hours", 14: "Booze Success +50% for 24 hours", 15: "Booze Success +50% for 48 hours", 16: "Booze Success +50% for 72 hours", 17: "Booze Success +50% for 96 hours",
    },
    21: {
        0: "Narcotics Success +100% for 6 hours", 1: "Narcotics Success +100% for 12 hours", 2: "Narcotics Success +100% for 24 hours", 3: "Narcotics Success +100% for 48 hours", 4: "Narcotics Success +100% for 72 hours", 5: "Narcotics Success +100% for 96 hours",
        6: "Narcotics Success +75% for 6 hours", 7: "Narcotics Success +75% for 12 hours", 8: "Narcotics Success +75% for 24 hours", 9: "Narcotics Success +75% for 48 hours", 10: "Narcotics Success +75% for 72 hours", 11: "Narcotics Success +75% for 96 hours",
        12: "Narcotics Success +50% for 6 hours", 13: "Narcotics Success +50% for 12 hours", 14: "Narcotics Success +50% for 24 hours", 15: "Narcotics Success +50% for 48 hours", 16: "Narcotics Success +50% for 72 hours", 17: "Narcotics Success +50% for 96 hours",
    },
    22: {
        0: "Kill skill Success +100% for 6 hours", 1: "Kill skill Success +100% for 12 hours", 2: "Kill skill Success +100% for 24 hours", 3: "Kill skill Success +100% for 48 hours", 4: "Kill skill Success +100% for 72 hours", 5: "Kill skill Success +100% for 96 hours",
        6: "Kill skill Success +75% for 6 hours", 7: "Kill skill Success +75% for 12 hours", 8: "Kill skill Success +75% for 24 hours", 9: "Kill skill Success +75% for 48 hours", 10: "Kill skill Success +75% for 72 hours", 11: "Kill skill Success +75% for 96 hours",
        12: "Kill skill Success +50% for 6 hours", 13: "Kill skill Success +50% for 12 hours", 14: "Kill skill Success +50% for 24 hours", 15: "Kill skill Success +50% for 48 hours", 16: "Kill skill Success +50% for 72 hours", 17: "Kill skill Success +50% for 96 hours",
    },
    23: {
        0: "Bust out Success +100% for 6 hours", 1: "Bust out Success +100% for 12 hours", 2: "Bust out Success +100% for 24 hours", 3: "Bust out Success +100% for 48 hours", 4: "Bust out Success +100% for 72 hours", 5: "Bust out Success +100% for 96 hours",
        6: "Bust out Success +75% for 6 hours", 7: "Bust out Success +75% for 12 hours", 8: "Bust out Success +75% for 24 hours", 9: "Bust out Success +75% for 48 hours", 10: "Bust out Success +75% for 72 hours", 11: "Bust out Success +75% for 96 hours",
        12: "Bust out Success +50% for 6 hours", 13: "Bust out Success +50% for 12 hours", 14: "Bust out Success +50% for 24 hours", 15: "Bust out Success +50% for 48 hours", 16: "Bust out Success +50% for 72 hours", 17: "Bust out Success +50% for 96 hours",
    },
    24: {
        0: "Crime Cooldown -90% for 6 hours", 1: "Crime Cooldown -90% for 12 hours", 2: "Crime Cooldown -90% for 24 hours", 3: "Crime Cooldown -90% for 48 hours", 4: "Crime Cooldown -90% for 72 hours", 5: "Crime Cooldown -90% for 96 hours",
        6: "Crime Cooldown -75% for 6 hours", 7: "Crime Cooldown -75% for 12 hours", 8: "Crime Cooldown -75% for 24 hours", 9: "Crime Cooldown -75% for 48 hours", 10: "Crime Cooldown -75% for 72 hours", 11: "Crime Cooldown -75% for 96 hours",
        12: "Crime Cooldown -50% for 6 hours", 13: "Crime Cooldown -50% for 12 hours", 14: "Crime Cooldown -50% for 24 hours", 15: "Crime Cooldown -50% for 48 hours", 16: "Crime Cooldown -50% for 72 hours", 17: "Crime Cooldown -50% for 96 hours",
    },
    25: {
        0: "Nick a car Cooldown -90% for 6 hours", 1: "Nick a car Cooldown -90% for 12 hours", 2: "Nick a car Cooldown -90% for 24 hours", 3: "Nick a car Cooldown -90% for 48 hours", 4: "Nick a car Cooldown -90% for 72 hours", 5: "Nick a car Cooldown -90% for 96 hours",
        6: "Nick a car Cooldown -75% for 6 hours", 7: "Nick a car Cooldown -75% for 12 hours", 8: "Nick a car Cooldown -75% for 24 hours", 9: "Nick a car Cooldown -75% for 48 hours", 10: "Nick a car Cooldown -75% for 72 hours", 11: "Nick a car Cooldown -75% for 96 hours",
        12: "Nick a car Cooldown -50% for 6 hours", 13: "Nick a car Cooldown -50% for 12 hours", 14: "Nick a car Cooldown -50% for 24 hours", 15: "Nick a car Cooldown -50% for 48 hours", 16: "Nick a car Cooldown -50% for 72 hours", 17: "Nick a car Cooldown -50% for 96 hours",
    },
    26: {
        0: "Booze Cooldown -90% for 6 hours", 1: "Booze Cooldown -90% for 12 hours", 2: "Booze Cooldown -90% for 24 hours", 3: "Booze Cooldown -90% for 48 hours", 4: "Booze Cooldown -90% for 72 hours", 5: "Booze Cooldown -90% for 96 hours",
        6: "Booze Cooldown -75% for 6 hours", 7: "Booze Cooldown -75% for 12 hours", 8: "Booze Cooldown -75% for 24 hours", 9: "Booze Cooldown -75% for 48 hours", 10: "Booze Cooldown -75% for 72 hours", 11: "Booze Cooldown -75% for 96 hours",
        12: "Booze Cooldown -50% for 6 hours", 13: "Booze Cooldown -50% for 12 hours", 14: "Booze Cooldown -50% for 24 hours", 15: "Booze Cooldown -50% for 48 hours", 16: "Booze Cooldown -50% for 72 hours", 17: "Booze Cooldown -50% for 96 hours",
    },
    27: {
        0: "Narcotics Cooldown -90% for 6 hours", 1: "Narcotics Cooldown -90% for 12 hours", 2: "Narcotics Cooldown -90% for 24 hours", 3: "Narcotics Cooldown -90% for 48 hours", 4: "Narcotics Cooldown -90% for 72 hours", 5: "Narcotics Cooldown -90% for 96 hours",
        6: "Narcotics Cooldown -75% for 6 hours", 7: "Narcotics Cooldown -75% for 12 hours", 8: "Narcotics Cooldown -75% for 24 hours", 9: "Narcotics Cooldown -75% for 48 hours", 10: "Narcotics Cooldown -75% for 72 hours", 11: "Narcotics Cooldown -75% for 96 hours",
        12: "Narcotics Cooldown -50% for 6 hours", 13: "Narcotics Cooldown -50% for 12 hours", 14: "Narcotics Cooldown -50% for 24 hours", 15: "Narcotics Cooldown -50% for 48 hours", 16: "Narcotics Cooldown -50% for 72 hours", 17: "Narcotics Cooldown -50% for 96 hours",
    },
    28: {
        0: "Kill skill Cooldown -90% for 6 hours", 1: "Kill skill Cooldown -90% for 12 hours", 2: "Kill skill Cooldown -90% for 24 hours", 3: "Kill skill Cooldown -90% for 48 hours", 4: "Kill skill Cooldown -90% for 72 hours", 5: "Kill skill Cooldown -90% for 96 hours",
        6: "Kill skill Cooldown -75% for 6 hours", 7: "Kill skill Cooldown -75% for 12 hours", 8: "Kill skill Cooldown -75% for 24 hours", 9: "Kill skill Cooldown -75% for 48 hours", 10: "Kill skill Cooldown -75% for 72 hours", 11: "Kill skill Cooldown -75% for 96 hours",
        12: "Kill skill Cooldown -50% for 6 hours", 13: "Kill skill Cooldown -50% for 12 hours", 14: "Kill skill Cooldown -50% for 24 hours", 15: "Kill skill Cooldown -50% for 48 hours", 16: "Kill skill Cooldown -50% for 72 hours", 17: "Kill skill Cooldown -50% for 96 hours",
    },
    29: {
        0: "Travel Cooldown -90% for 6 hours", 1: "Travel Cooldown -90% for 12 hours", 2: "Travel Cooldown -90% for 24 hours", 3: "Travel Cooldown -90% for 48 hours", 4: "Travel Cooldown -90% for 72 hours", 5: "Travel Cooldown -90% for 96 hours",
        6: "Travel Cooldown -75% for 6 hours", 7: "Travel Cooldown -75% for 12 hours", 8: "Travel Cooldown -75% for 24 hours", 9: "Travel Cooldown -75% for 48 hours", 10: "Travel Cooldown -75% for 72 hours", 11: "Travel Cooldown -75% for 96 hours",
        12: "Travel Cooldown -50% for 6 hours", 13: "Travel Cooldown -50% for 12 hours", 14: "Travel Cooldown -50% for 24 hours", 15: "Travel Cooldown -50% for 48 hours", 16: "Travel Cooldown -50% for 72 hours", 17: "Travel Cooldown -50% for 96 hours",
    },
    30: {
        0: "Bullet Buy Cooldown -90% for 6 hours", 1: "Bullet Buy Cooldown -90% for 12 hours", 2: "Bullet Buy Cooldown -90% for 24 hours", 3: "Bullet Buy Cooldown -90% for 48 hours", 4: "Bullet Buy Cooldown -90% for 72 hours", 5: "Bullet Buy Cooldown -90% for 96 hours",
        6: "Bullet Buy Cooldown -75% for 6 hours", 7: "Bullet Buy Cooldown -75% for 12 hours", 8: "Bullet Buy Cooldown -75% for 24 hours", 9: "Bullet Buy Cooldown -75% for 48 hours", 10: "Bullet Buy Cooldown -75% for 72 hours", 11: "Bullet Buy Cooldown -75% for 96 hours",
        12: "Bullet Buy Cooldown -50% for 6 hours", 13: "Bullet Buy Cooldown -50% for 12 hours", 14: "Bullet Buy Cooldown -50% for 24 hours", 15: "Bullet Buy Cooldown -50% for 48 hours", 16: "Bullet Buy Cooldown -50% for 72 hours", 17: "Bullet Buy Cooldown -50% for 96 hours",
    },
    31: {
        0: "Health Buy Cooldown -90% for 6 hours", 1: "Health Buy Cooldown -90% for 12 hours", 2: "Health Buy Cooldown -90% for 24 hours", 3: "Health Buy Cooldown -90% for 48 hours", 4: "Health Buy Cooldown -90% for 72 hours", 5: "Health Buy Cooldown -90% for 96 hours",
        6: "Health Buy Cooldown -75% for 6 hours", 7: "Health Buy Cooldown -75% for 12 hours", 8: "Health Buy Cooldown -75% for 24 hours", 9: "Health Buy Cooldown -75% for 48 hours", 10: "Health Buy Cooldown -75% for 72 hours", 11: "Health Buy Cooldown -75% for 96 hours",
        12: "Health Buy Cooldown -50% for 6 hours", 13: "Health Buy Cooldown -50% for 12 hours", 14: "Health Buy Cooldown -50% for 24 hours", 15: "Health Buy Cooldown -50% for 48 hours", 16: "Health Buy Cooldown -50% for 72 hours", 17: "Health Buy Cooldown -50% for 96 hours",
    },
    32: {
        0: "Bust out Cooldown -90% for 6 hours", 1: "Bust out Cooldown -90% for 12 hours", 2: "Bust out Cooldown -90% for 24 hours", 3: "Bust out Cooldown -90% for 48 hours", 4: "Bust out Cooldown -90% for 72 hours", 5: "Bust out Cooldown -90% for 96 hours",
        6: "Bust out Cooldown -75% for 6 hours", 7: "Bust out Cooldown -75% for 12 hours", 8: "Bust out Cooldown -75% for 24 hours", 9: "Bust out Cooldown -75% for 48 hours", 10: "Bust out Cooldown -75% for 72 hours", 11: "Bust out Cooldown -75% for 96 hours",
        12: "Bust out Cooldown -50% for 6 hours", 13: "Bust out Cooldown -50% for 12 hours", 14: "Bust out Cooldown -50% for 24 hours", 15: "Bust out Cooldown -50% for 48 hours", 16: "Bust out Cooldown -50% for 72 hours", 17: "Bust out Cooldown -50% for 96 hours",
    },
    // Perk Items (categoryId 33-47)
    33: { // Map Yield Boost
        0: "Map Yield Boost +100% for 6 hours", 1: "Map Yield Boost +100% for 12 hours", 2: "Map Yield Boost +100% for 24 hours", 3: "Map Yield Boost +100% for 48 hours", 4: "Map Yield Boost +100% for 72 hours", 5: "Map Yield Boost +100% for 96 hours",
        6: "Map Yield Boost +75% for 6 hours", 7: "Map Yield Boost +75% for 12 hours", 8: "Map Yield Boost +75% for 24 hours", 9: "Map Yield Boost +75% for 48 hours", 10: "Map Yield Boost +75% for 72 hours", 11: "Map Yield Boost +75% for 96 hours",
        12: "Map Yield Boost +50% for 6 hours", 13: "Map Yield Boost +50% for 12 hours", 14: "Map Yield Boost +50% for 24 hours", 15: "Map Yield Boost +50% for 48 hours", 16: "Map Yield Boost +50% for 72 hours", 17: "Map Yield Boost +50% for 96 hours",
        18: "Map Yield Boost +25% for 6 hours", 19: "Map Yield Boost +25% for 12 hours", 20: "Map Yield Boost +25% for 24 hours", 21: "Map Yield Boost +25% for 48 hours", 22: "Map Yield Boost +25% for 72 hours", 23: "Map Yield Boost +25% for 96 hours",
    },
    34: { // Race XP Boost
        0: "Race XP Boost +100% for 6 hours", 1: "Race XP Boost +100% for 12 hours", 2: "Race XP Boost +100% for 24 hours", 3: "Race XP Boost +100% for 48 hours", 4: "Race XP Boost +100% for 72 hours", 5: "Race XP Boost +100% for 96 hours",
        6: "Race XP Boost +75% for 6 hours", 7: "Race XP Boost +75% for 12 hours", 8: "Race XP Boost +75% for 24 hours", 9: "Race XP Boost +75% for 48 hours", 10: "Race XP Boost +75% for 72 hours", 11: "Race XP Boost +75% for 96 hours",
        12: "Race XP Boost +50% for 6 hours", 13: "Race XP Boost +50% for 12 hours", 14: "Race XP Boost +50% for 24 hours", 15: "Race XP Boost +50% for 48 hours", 16: "Race XP Boost +50% for 72 hours", 17: "Race XP Boost +50% for 96 hours",
        18: "Race XP Boost +25% for 6 hours", 19: "Race XP Boost +25% for 12 hours", 20: "Race XP Boost +25% for 24 hours", 21: "Race XP Boost +25% for 48 hours", 22: "Race XP Boost +25% for 72 hours", 23: "Race XP Boost +25% for 96 hours",
    },
    35: { // Kill Skill XP Boost
        0: "Kill Skill XP Boost +100% for 6 hours", 1: "Kill Skill XP Boost +100% for 12 hours", 2: "Kill Skill XP Boost +100% for 24 hours", 3: "Kill Skill XP Boost +100% for 48 hours", 4: "Kill Skill XP Boost +100% for 72 hours", 5: "Kill Skill XP Boost +100% for 96 hours",
        6: "Kill Skill XP Boost +75% for 6 hours", 7: "Kill Skill XP Boost +75% for 12 hours", 8: "Kill Skill XP Boost +75% for 24 hours", 9: "Kill Skill XP Boost +75% for 48 hours", 10: "Kill Skill XP Boost +75% for 72 hours", 11: "Kill Skill XP Boost +75% for 96 hours",
        12: "Kill Skill XP Boost +50% for 6 hours", 13: "Kill Skill XP Boost +50% for 12 hours", 14: "Kill Skill XP Boost +50% for 24 hours", 15: "Kill Skill XP Boost +50% for 48 hours", 16: "Kill Skill XP Boost +50% for 72 hours", 17: "Kill Skill XP Boost +50% for 96 hours",
        18: "Kill Skill XP Boost +25% for 6 hours", 19: "Kill Skill XP Boost +25% for 12 hours", 20: "Kill Skill XP Boost +25% for 24 hours", 21: "Kill Skill XP Boost +25% for 48 hours", 22: "Kill Skill XP Boost +25% for 72 hours", 23: "Kill Skill XP Boost +25% for 96 hours",
    },
    36: { // Bust Out XP Boost
        0: "Bust Out XP Boost +100% for 6 hours", 1: "Bust Out XP Boost +100% for 12 hours", 2: "Bust Out XP Boost +100% for 24 hours", 3: "Bust Out XP Boost +100% for 48 hours", 4: "Bust Out XP Boost +100% for 72 hours", 5: "Bust Out XP Boost +100% for 96 hours",
        6: "Bust Out XP Boost +75% for 6 hours", 7: "Bust Out XP Boost +75% for 12 hours", 8: "Bust Out XP Boost +75% for 24 hours", 9: "Bust Out XP Boost +75% for 48 hours", 10: "Bust Out XP Boost +75% for 72 hours", 11: "Bust Out XP Boost +75% for 96 hours",
        12: "Bust Out XP Boost +50% for 6 hours", 13: "Bust Out XP Boost +50% for 12 hours", 14: "Bust Out XP Boost +50% for 24 hours", 15: "Bust Out XP Boost +50% for 48 hours", 16: "Bust Out XP Boost +50% for 72 hours", 17: "Bust Out XP Boost +50% for 96 hours",
        18: "Bust Out XP Boost +25% for 6 hours", 19: "Bust Out XP Boost +25% for 12 hours", 20: "Bust Out XP Boost +25% for 24 hours", 21: "Bust Out XP Boost +25% for 48 hours", 22: "Bust Out XP Boost +25% for 72 hours", 23: "Bust Out XP Boost +25% for 96 hours",
    },
    37: { // Narcotics Sales Price Boost
        0: "Narcotics Sales Price Boost +100% for 6 hours", 1: "Narcotics Sales Price Boost +100% for 12 hours", 2: "Narcotics Sales Price Boost +100% for 24 hours", 3: "Narcotics Sales Price Boost +100% for 48 hours", 4: "Narcotics Sales Price Boost +100% for 72 hours", 5: "Narcotics Sales Price Boost +100% for 96 hours",
        6: "Narcotics Sales Price Boost +75% for 6 hours", 7: "Narcotics Sales Price Boost +75% for 12 hours", 8: "Narcotics Sales Price Boost +75% for 24 hours", 9: "Narcotics Sales Price Boost +75% for 48 hours", 10: "Narcotics Sales Price Boost +75% for 72 hours", 11: "Narcotics Sales Price Boost +75% for 96 hours",
        12: "Narcotics Sales Price Boost +50% for 6 hours", 13: "Narcotics Sales Price Boost +50% for 12 hours", 14: "Narcotics Sales Price Boost +50% for 24 hours", 15: "Narcotics Sales Price Boost +50% for 48 hours", 16: "Narcotics Sales Price Boost +50% for 72 hours", 17: "Narcotics Sales Price Boost +50% for 96 hours",
        18: "Narcotics Sales Price Boost +25% for 6 hours", 19: "Narcotics Sales Price Boost +25% for 12 hours", 20: "Narcotics Sales Price Boost +25% for 24 hours", 21: "Narcotics Sales Price Boost +25% for 48 hours", 22: "Narcotics Sales Price Boost +25% for 72 hours", 23: "Narcotics Sales Price Boost +25% for 96 hours",
    },
    38: { // Booze Sales Price Boost
        0: "Booze Sales Price Boost +100% for 6 hours", 1: "Booze Sales Price Boost +100% for 12 hours", 2: "Booze Sales Price Boost +100% for 24 hours", 3: "Booze Sales Price Boost +100% for 48 hours", 4: "Booze Sales Price Boost +100% for 72 hours", 5: "Booze Sales Price Boost +100% for 96 hours",
        6: "Booze Sales Price Boost +75% for 6 hours", 7: "Booze Sales Price Boost +75% for 12 hours", 8: "Booze Sales Price Boost +75% for 24 hours", 9: "Booze Sales Price Boost +75% for 48 hours", 10: "Booze Sales Price Boost +75% for 72 hours", 11: "Booze Sales Price Boost +75% for 96 hours",
        12: "Booze Sales Price Boost +50% for 6 hours", 13: "Booze Sales Price Boost +50% for 12 hours", 14: "Booze Sales Price Boost +50% for 24 hours", 15: "Booze Sales Price Boost +50% for 48 hours", 16: "Booze Sales Price Boost +50% for 72 hours", 17: "Booze Sales Price Boost +50% for 96 hours",
        18: "Booze Sales Price Boost +25% for 6 hours", 19: "Booze Sales Price Boost +25% for 12 hours", 20: "Booze Sales Price Boost +25% for 24 hours", 21: "Booze Sales Price Boost +25% for 48 hours", 22: "Booze Sales Price Boost +25% for 72 hours", 23: "Booze Sales Price Boost +25% for 96 hours",
    },
    39: { // Worth Boost
        0: "Worth Boost +100% for 6 hours", 1: "Worth Boost +100% for 12 hours", 2: "Worth Boost +100% for 24 hours", 3: "Worth Boost +100% for 48 hours", 4: "Worth Boost +100% for 72 hours", 5: "Worth Boost +100% for 96 hours",
        6: "Worth Boost +75% for 6 hours", 7: "Worth Boost +75% for 12 hours", 8: "Worth Boost +75% for 24 hours", 9: "Worth Boost +75% for 48 hours", 10: "Worth Boost +75% for 72 hours", 11: "Worth Boost +75% for 96 hours",
        12: "Worth Boost +50% for 6 hours", 13: "Worth Boost +50% for 12 hours", 14: "Worth Boost +50% for 24 hours", 15: "Worth Boost +50% for 48 hours", 16: "Worth Boost +50% for 72 hours", 17: "Worth Boost +50% for 96 hours",
        18: "Worth Boost +25% for 6 hours", 19: "Worth Boost +25% for 12 hours", 20: "Worth Boost +25% for 24 hours", 21: "Worth Boost +25% for 48 hours", 22: "Worth Boost +25% for 72 hours", 23: "Worth Boost +25% for 96 hours",
    },
    40: { // Crime Rewards Boost
        0: "Crime Rewards Boost +100% for 6 hours", 1: "Crime Rewards Boost +100% for 12 hours", 2: "Crime Rewards Boost +100% for 24 hours", 3: "Crime Rewards Boost +100% for 48 hours", 4: "Crime Rewards Boost +100% for 72 hours", 5: "Crime Rewards Boost +100% for 96 hours",
        6: "Crime Rewards Boost +75% for 6 hours", 7: "Crime Rewards Boost +75% for 12 hours", 8: "Crime Rewards Boost +75% for 24 hours", 9: "Crime Rewards Boost +75% for 48 hours", 10: "Crime Rewards Boost +75% for 72 hours", 11: "Crime Rewards Boost +75% for 96 hours",
        12: "Crime Rewards Boost +50% for 6 hours", 13: "Crime Rewards Boost +50% for 12 hours", 14: "Crime Rewards Boost +50% for 24 hours", 15: "Crime Rewards Boost +50% for 48 hours", 16: "Crime Rewards Boost +50% for 72 hours", 17: "Crime Rewards Boost +50% for 96 hours",
        18: "Crime Rewards Boost +25% for 6 hours", 19: "Crime Rewards Boost +25% for 12 hours", 20: "Crime Rewards Boost +25% for 24 hours", 21: "Crime Rewards Boost +25% for 48 hours", 22: "Crime Rewards Boost +25% for 72 hours", 23: "Crime Rewards Boost +25% for 96 hours",
    },
    41: { // Double Purchase
        0: "Double Purchase for 6 hours", 1: "Double Purchase for 12 hours", 2: "Double Purchase for 24 hours", 3: "Double Purchase for 48 hours", 4: "Double Purchase for 72 hours", 5: "Double Purchase for 96 hours",
    },
    42: { // No Jail Time
        0: "No Jail Time for 6 hours", 1: "No Jail Time for 12 hours", 2: "No Jail Time for 24 hours", 3: "No Jail Time for 48 hours", 4: "No Jail Time for 72 hours", 5: "No Jail Time for 96 hours",
    },
    43: { // Free Travel
        0: "Free Travel for 6 hours", 1: "Free Travel for 12 hours", 2: "Free Travel for 24 hours", 3: "Free Travel for 48 hours", 4: "Free Travel for 72 hours", 5: "Free Travel for 96 hours",
    },
    44: { // Bank Fee Reduction
        0: "Bank Fee Reduction for 6 hours", 1: "Bank Fee Reduction for 12 hours", 2: "Bank Fee Reduction for 24 hours", 3: "Bank Fee Reduction for 48 hours", 4: "Bank Fee Reduction for 72 hours", 5: "Bank Fee Reduction for 96 hours",
    },
    45: { // Credit Cost Reduction
        0: "Credit Cost Reduction for 6 hours", 1: "Credit Cost Reduction for 12 hours", 2: "Credit Cost Reduction for 24 hours", 3: "Credit Cost Reduction for 48 hours", 4: "Credit Cost Reduction for 72 hours", 5: "Credit Cost Reduction for 96 hours",
    },
    46: { // Increased Conversion Rate
        0: "Increased Conversion Rate for 6 hours", 1: "Increased Conversion Rate for 12 hours", 2: "Increased Conversion Rate for 24 hours", 3: "Increased Conversion Rate for 48 hours", 4: "Increased Conversion Rate for 72 hours", 5: "Increased Conversion Rate for 96 hours",
    },
    47: { // Credit Spend Reduction
        0: "Credit Spend Reduction for 6 hours", 1: "Credit Spend Reduction for 12 hours", 2: "Credit Spend Reduction for 24 hours", 3: "Credit Spend Reduction for 48 hours", 4: "Credit Spend Reduction for 72 hours", 5: "Credit Spend Reduction for 96 hours",
    },
    48: { // Bodyguard Johnny
        0: "Lvl 1 - Johnny", 1: "Lvl 2 - Johnny", 2: "Lvl 3 - Johnny", 3: "Lvl 4 - Johnny", 4: "Lvl 5 - Johnny",
        5: "Lvl 6 - Johnny", 6: "Lvl 7 - Johnny", 7: "Lvl 8 - Johnny", 8: "Lvl 9 - Johnny", 9: "Lvl 10 - Johnny",
    },
    49: { // Bodyguard Jim
        0: "Lvl 1 - Jim", 1: "Lvl 2 - Jim", 2: "Lvl 3 - Jim", 3: "Lvl 4 - Jim", 4: "Lvl 5 - Jim",
        5: "Lvl 6 - Jim", 6: "Lvl 7 - Jim", 7: "Lvl 8 - Jim", 8: "Lvl 9 - Jim", 9: "Lvl 10 - Jim",
    },
    50: { // Bodyguard Sam
        0: "Lvl 1 - Sam", 1: "Lvl 2 - Sam", 2: "Lvl 3 - Sam", 3: "Lvl 4 - Sam", 4: "Lvl 5 - Sam",
        5: "Lvl 6 - Sam", 6: "Lvl 7 - Sam", 7: "Lvl 8 - Sam", 8: "Lvl 9 - Sam", 9: "Lvl 10 - Sam",
    },
    51: { // Bodyguard Frank
        0: "Lvl 1 - Frank", 1: "Lvl 2 - Frank", 2: "Lvl 3 - Frank", 3: "Lvl 4 - Frank", 4: "Lvl 5 - Frank",
        5: "Lvl 6 - Frank", 6: "Lvl 7 - Frank", 7: "Lvl 8 - Frank", 8: "Lvl 9 - Frank", 9: "Lvl 10 - Frank",
    },
    52: { // Subscription Item
        0: "1 Month Player+", 1: "1 Month Unlimited", 2: "1 Month Player+", 3: "1 Month Unlimited",
        4: "2 Month Player+", 5: "2 Month Unlimited", 6: "3 Month Player+", 7: "3 Month Unlimited",
        8: "6 Month Player+", 9: "6 Month Unlimited",
    },
    53: { // GI Credit
        0: "3 GI Credits", 1: "4 GI Credits", 2: "5 GI Credits", 3: "7 GI Credits", 4: "10 GI Credits",
        5: "15 GI Credits", 6: "25 GI Credits", 7: "50 GI Credits", 8: "75 GI Credits", 9: "100 GI Credits",
    },
    54: { // Mystery Box
        0: "Mystery Box",
    },
    55: { // Booze Pack
        0: "75 Beer", 1: "75 Wine", 2: "75 Port", 3: "75 Vodka", 4: "75 Whiskey", 5: "75 Cognac", 6: "75 Tequila",
    },
    56: { // Narcotics Pack
        0: "50 Glue", 1: "50 Marijuana", 2: "50 Amphetamine", 3: "50 Cocaine", 4: "50 Morphine", 5: "50 Opium", 6: "50 Heroin",
    },
};




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


// Mystery Box Rewards (27 items, index 0-26)
export const MYSTERY_BOX_REWARDS = [
    { id: 1, label: "1000 Credits" },
    { id: 2, label: "2000 Credits" },
    { id: 3, label: "5 Keys" },
    { id: 4, label: "10 Keys" },
    { id: 5, label: "3 Perk Box" },
    { id: 6, label: "5 Perk Box" },
    { id: 7, label: "10 Perk Box" },
    { id: 8, label: "Level 7 Frank Bodyguard" },
    { id: 9, label: "Level 7 Sam Bodyguard" },
    { id: 10, label: "Level 5 Jim Bodyguard" },
    { id: 11, label: "Level 5 Johnny Bodyguard" },
    { id: 12, label: "6 Month Unlimited Subscription" },
    { id: 13, label: "3 Month Unlimited Subscription" },
    { id: 14, label: "1 Month Unlimited Subscription" },
    { id: 15, label: "6 Month Badge Subscription" },
    { id: 16, label: "3 Month Badge Subscription" },
    { id: 17, label: "1 Month Badge Subscription" },
    { id: 18, label: "1.5% KillSkill XP Boost" },
    { id: 19, label: "2.5% KillSkill XP Boost" },
    { id: 20, label: "5% KillSkill XP Boost" },
    { id: 21, label: "20% Bodyguard XP Boost" },
    { id: 22, label: "15% Race XP Boost" },
    { id: 23, label: "1K Rank XP" },
    { id: 24, label: "1.5K Rank XP" },
    { id: 25, label: "2.5K Rank XP" },
    { id: 26, label: "3.5K Rank XP" },
    { id: 27, label: "5K Rank XP" },
] as const;

// Smuggle market constants
export const BOOZE_TYPES: Record<number, string> = {
    0: "Beer",
    1: "Wine",
    2: "Port",
    3: "Vodka",
    4: "Whiskey",
    5: "Cognac",
    6: "Tequila",
};

export const NARCS_TYPES: Record<number, string> = {
    0: "Glue",
    1: "Marijuana",
    2: "Amphetamine",
    3: "Cocaine",
    4: "Morphine",
    5: "Opium",
    6: "Heroin",
};


// Organized Crime constants
export const OC_LOBBY_STATUS = {
    WAITING: 0,
    STARTED: 1,
    FINISHED: 2,
    CANCELLED: 3,
} as const;

export const OC_LOBBY_STATUS_LABELS: Record<number, string> = {
    0: "Waiting",
    1: "In Progress",
    2: "Finished",
    3: "Cancelled",
};

export const OC_ASSET_EXPECTATION = {
    FULL: 0,
    PARTIAL: 1,
    NONE: 2,
} as const;

export const OC_ASSET_EXPECTATION_LABELS: Record<number, string> = {
    0: "Full Asset",
    1: "Partial Asset",
    2: "No Requirement",
};

export const OC_ROLE_NAMES: Record<number, string> = {
    0: "Leader",
    1: "Driver",
    2: "Weapon Expert",
    3: "Explosive Expert",
    4: "Team Expert",
};

/** On-chain `Reward.typeId` → possible amount range (success rolls). Cash uses wei on-chain; others are integer counts. */
export const OC_REWARD_CONFIG: Record<number, { min: number; max: number; name: string }> = {
    0: { min: 100_000, max: 5_000_000, name: "Cash" },
    1: { min: 1, max: 3, name: "Keys" },
    2: { min: 50, max: 1000, name: "Booze items" },
    3: { min: 50, max: 800, name: "Narcs items" },
    4: { min: 50, max: 300, name: "Helper credits" },
    5: { min: 1, max: 50, name: "GI Credits" },
    6: { min: 1, max: 5, name: "Perk box" },
    7: { min: 1, max: 2, name: "Mystery boxes" },
    8: { min: 500, max: 20_000, name: "Bullets" },
    9: { min: 50, max: 500, name: "Health" },
};

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