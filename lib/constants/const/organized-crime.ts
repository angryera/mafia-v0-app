/** `MafiaOCLobby.Reward`: amount is ether-denominated only for cash (typeId 0). */
export const OC_REWARD_CASH_TYPE_ID = 0;

export const OC_MIN_HEALTH = 300;

export const OC_MAX_CASH = 1_500_000;

export const OC_MAX_BULLETS = 5_000;

export const OC_JAIL_HOURS = 72; // 48 * 1.5

export const OC_HEALTH_LOSS = 300;

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
