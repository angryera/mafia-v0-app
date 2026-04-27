// ========== HelperBot Info Type & Parser ==========
export type HelperBotInfo = {
    successRate: number;
    startTimestamp: number;
    endTimestamp: number;
    attemptCount: number;
    isRunning: boolean;
};

export type BulletBotPlusInfo = {
    amountModifiedPercent: bigint;
    priceModifiedPercent: bigint;
};

// ========== Bodyguard Info ==========
export type TrainingSlotType = {
    oldItemId: number;
    newItemId: number;
    newCategoryId: number;
    newTypeId: number;
    startTime: number;
    endTime: number;
    trainingCost: number;
    isTraining: boolean;
};