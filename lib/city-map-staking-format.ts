import { formatWeiWholeUnits } from "@/lib/city-map-yield-accrual";

/**
 * Convert float `number` to integer string without scientific notation.
 * `Math.trunc` / `BigInt(n)` are unsafe for wei-sized values (IEEE-754 gaps).
 */
function numberToIntegerStringNoExponent(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (Number.isSafeInteger(n)) return String(n);
  const s = n.toLocaleString("fullwide", {
    useGrouping: false,
    maximumFractionDigits: 0,
  });
  const neg = s.startsWith("-");
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return "0";
  return neg ? `-${digits}` : digits;
}

/**
 * Parse decimal / scientific string to bigint (integer only; truncates fractional wei).
 */
function parseWeiStringToBigInt(input: string): bigint {
  const s = input.trim().replace(/_/g, "");
  if (!s) return BigInt(0);

  if (/^0x[0-9a-fA-F]+$/i.test(s)) {
    return BigInt(s);
  }

  const negative = s.startsWith("-");
  const t = negative ? s.slice(1) : s;
  if (!t) return BigInt(0);

  const eIdx = t.search(/[eE]/);
  if (eIdx === -1) {
    const [whole, frac = ""] = t.split(".");
    const digits = (whole + frac).replace(/\D/g, "");
    if (!digits) return BigInt(0);
    const v = BigInt(digits);
    return negative ? -v : v;
  }

  const mantStr = t.slice(0, eIdx);
  const expStr = t.slice(eIdx + 1).trim();
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return BigInt(0);

  const dotIdx = mantStr.indexOf(".");
  const intPart = dotIdx >= 0 ? mantStr.slice(0, dotIdx) : mantStr;
  const fracPart =
    dotIdx >= 0 ? mantStr.slice(dotIdx + 1) : "";
  let mantDigits = (intPart + fracPart).replace(/\D/g, "");
  if (!mantDigits) mantDigits = "0";
  const fracLen = fracPart.length;
  const expAdj = Math.trunc(exp) - fracLen;

  let out: bigint;
  if (expAdj >= 0) {
    out = BigInt(mantDigits + "0".repeat(expAdj));
  } else {
    const cut = mantDigits.length + expAdj;
    out = cut <= 0 ? BigInt(0) : BigInt(mantDigits.slice(0, cut));
  }
  return negative ? -out : out;
}

/** Slot `stakingAmount` from chain: always treat as wei (18 decimals). No float math in formatting. */
function stakingWeiToBigInt(raw: bigint | number | string): bigint {
  if (typeof raw === "bigint") return raw;

  if (typeof raw === "string") {
    try {
      return parseWeiStringToBigInt(raw);
    } catch {
      return BigInt(0);
    }
  }

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return BigInt(0);
    if (Number.isSafeInteger(raw)) return BigInt(raw);
    try {
      return BigInt(numberToIntegerStringNoExponent(raw));
    } catch {
      return BigInt(0);
    }
  }

  return BigInt(0);
}

/** Human-readable MAFIA — floored whole tokens (no fractional display). */
export function formatMafiaStakingFromWei(
  raw: bigint | number | string
): string {
  try {
    const wei = stakingWeiToBigInt(raw);
    return formatWeiWholeUnits(wei);
  } catch {
    return String(raw);
  }
}

export function isMafiaStakingPositive(
  raw: bigint | number | string
): boolean {
  try {
    return stakingWeiToBigInt(raw) > BigInt(0);
  } catch {
    return Number(raw) > 0;
  }
}
