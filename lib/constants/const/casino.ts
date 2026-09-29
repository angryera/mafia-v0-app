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
