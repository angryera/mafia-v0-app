import { parseEther } from "viem";
import {
  getResidentialGameCashYieldPer24h,
  isResidentialGameCashYieldTier,
  YIELD_TIER_MAX_ACCRUAL_DAYS,
} from "@/lib/city-slot-config";

const WAD = BigInt(10 ** 18);

/**
 * Floored whole token amount from 18-decimal `wei` — no fractional digits (integer display).
 * Used for Game Cash + MAFIA staking display on the map.
 */
export function formatWeiWholeUnits(wei: bigint): string {
  const whole = wei / WAD;
  return whole.toLocaleString("en-US");
}

const SECONDS_PER_DAY = BigInt(86400);

function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export type YieldPayoutRead = {
  amount: bigint;
  lastDayTimestamp: bigint;
};

/** Normalize wagmi `calculateCurrentYieldPayout` / bulk tuple or named object. */
export function parseYieldPayoutRead(data: unknown): YieldPayoutRead | null {
  if (data == null) return null;
  if (Array.isArray(data) && data.length >= 2) {
    return {
      amount: data[0] as bigint,
      lastDayTimestamp: data[1] as bigint,
    };
  }
  if (typeof data === "object" && data !== null && "amount" in data) {
    const o = data as { amount: bigint; lastDayTimestamp: bigint };
    if (o.amount === undefined || o.lastDayTimestamp === undefined) return null;
    return { amount: o.amount, lastDayTimestamp: o.lastDayTimestamp };
  }
  return null;
}

/**
 * Live Game Cash yield (wei) for residential yield tiers.
 *
 * Matches legacy client: `baseFromRpc + (elapsedSec / 86400) * perDayWei`, capped at
 * `perDayWei * YIELD_TIER_MAX_ACCRUAL_DAYS`, when operating.
 *
 * `baseWeiFromContract` and `lastDayTimestampSec` come from the map contract view calls.
 */
export function estimateGameCashYieldWeiLive(opts: {
  baseWeiFromContract: bigint;
  lastDayTimestampSec: number;
  slotType: number;
  slotSubType: number;
  isOperating: boolean;
  nowSec: number;
}): bigint {
  const {
    baseWeiFromContract,
    lastDayTimestampSec,
    slotType,
    slotSubType,
    isOperating,
    nowSec,
  } = opts;

  if (!isOperating || !isResidentialGameCashYieldTier(slotType, slotSubType)) {
    return BigInt(0);
  }

  const perDayHuman = getResidentialGameCashYieldPer24h(slotType, slotSubType);
  if (perDayHuman == null) return BigInt(0);

  const perDayWei = parseEther(String(perDayHuman));
  const maxAccrualWei = perDayWei * BigInt(YIELD_TIER_MAX_ACCRUAL_DAYS);

  if (
    !Number.isFinite(lastDayTimestampSec) ||
    lastDayTimestampSec <= 0
  ) {
    return minBigInt(baseWeiFromContract, maxAccrualWei);
  }

  const elapsed = Math.max(0, nowSec - Math.floor(lastDayTimestampSec));
  const elapsedBn = BigInt(elapsed);
  const accruedSinceAnchor = (elapsedBn * perDayWei) / SECONDS_PER_DAY;

  const raw = baseWeiFromContract + accruedSinceAnchor;
  return minBigInt(raw, maxAccrualWei);
}
