import { parseUnits } from "viem";
import { HELPER_BOT_BULLET_PRICE } from "./constants/const/helperbot.ts";

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const HUNDRED = BigInt(100);
const WAD = BigInt(10 ** 18);
const CENT = BigInt(10 ** 16);
const BULLETS_PER_ATTEMPT = BigInt(3000);
const SUCCESS_RATE_SCALE = BigInt(10000);

/** Whole bullets this run can sell, in 18-decimal units. */
export function maxBulletBotOutputWei(
  attemptCount: number,
  successRate: number,
  bulletDoublePerk: boolean,
): bigint {
  if (attemptCount <= 0 || successRate <= 0) return ZERO;
  const output =
    (BigInt(attemptCount) * BigInt(successRate) * BULLETS_PER_ATTEMPT * WAD) /
    SUCCESS_RATE_SCALE;
  return bulletDoublePerk ? output * TWO : output;
}

/** Cash, in wei, required to buy `bulletWei` at the helper-bot bullet price. */
export function bulletBotCashForOutputWei(bulletWei: bigint): bigint {
  return bulletWei * BigInt(HELPER_BOT_BULLET_PRICE);
}

/** Bullets bought by `cashWei`, capped at the bot's output. */
export function bulletBotOutputForCashWei(cashWei: bigint, maxBulletWei: bigint): bigint {
  if (cashWei <= ZERO || maxBulletWei <= ZERO) return ZERO;
  const maxCashWei = bulletBotCashForOutputWei(maxBulletWei);
  if (cashWei >= maxCashWei) return maxBulletWei;
  return (cashWei * maxBulletWei) / maxCashWei;
}

/** Credits returned when the player buys only part of the bot's bullets. */
export function bulletBotRefundedCreditsWei(
  cashWei: bigint,
  maxBulletWei: bigint,
  attemptCount: number,
  creditCost: number,
  creditCostReductionPercent: number,
): bigint {
  if (maxBulletWei <= ZERO || attemptCount <= 0 || creditCost <= 0) return ZERO;
  const boughtWei = bulletBotOutputForCashWei(cashWei, maxBulletWei);
  const reduction = BigInt(Math.min(100, Math.max(0, Math.trunc(creditCostReductionPercent))));
  const creditPerAttempt = (BigInt(creditCost) * WAD * (HUNDRED - reduction)) / HUNDRED;
  return (creditPerAttempt * BigInt(attemptCount) * (maxBulletWei - boughtWei)) / maxBulletWei;
}

/** Format wei cash as a withdraw input with at most 2 decimal places. */
export function formatBulletCashInput(wei: bigint): string {
  if (wei <= ZERO) return "0";
  const cents = wei / CENT;
  const whole = cents / HUNDRED;
  const frac = cents % HUNDRED;
  if (frac === ZERO) return whole.toString();
  return `${whole.toString()}.${frac.toString().padStart(2, "0").replace(/0$/, "")}`;
}

/** `percent` of `availableWei`, rounded down to cents and kept inside the balance. */
export function percentOfCashWei(availableWei: bigint, percent: number): bigint {
  if (availableWei <= ZERO) return ZERO;
  const cents = availableWei / CENT;
  if (cents <= ZERO) return availableWei;
  if (percent >= 100) return cents * CENT;
  const picked = (cents * BigInt(percent)) / HUNDRED;
  const safe = picked === ZERO ? ONE : picked;
  return (safe > cents ? cents : safe) * CENT;
}

/** Cash entry used by the withdraw form: a non-negative amount with at most 2 decimals. */
export function parseBulletCashInput(value: string): bigint | null {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return null;
  try {
    return parseUnits(value, 18);
  } catch {
    return null;
  }
}
