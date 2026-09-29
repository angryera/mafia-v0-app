export const MAFIA_BUY_FEE = 4.7;

// 100 million approval amount in wei (18 decimals)
export const INGAME_CURRENCY_APPROVE_AMOUNT = BigInt("100000000000000000000000000");

/** OG Crate keys (id 0) required to `purchaseFamilyHQ` / create family on map. */
export const FAMILY_HQ_CREATION_OG_CRATE_KEYS = BigInt(10);

export const OG_CRATE_KEY_TOKEN_ID = BigInt(0);

/** Bank transfers unlock 15 minutes after `lastTransferTime`. */
export const BANK_TRANSFER_COOLDOWN_SECONDS = 15 * 60;
