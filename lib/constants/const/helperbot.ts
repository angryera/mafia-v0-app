export const HELPER_BOT_BULLET_PRICE = 200;

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
