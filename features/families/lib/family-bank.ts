import { formatUnits, parseEther, zeroAddress } from "viem";
import { RANK_NAMES } from "@/lib/constants/const";

export const BANK_REFETCH_MS = 10_000;
export const BANK_LOG_PAGE_SIZE = 20;

/** Mirrors `MafiaFamilyCashBank.LogType` (Solidity enum). */
export const BANK_LOG_TYPES = {
  Deposit: 0,
  Withdraw: 1,
  Promotion: 2,
  Tax: 3,
  NativeTax: 4,
  NativeWithdraw: 5,
  NativeSwap: 6,
  Seed: 7,
} as const;

const BANK_LOG_TYPE_LABELS: Readonly<Record<number, string>> = {
  [BANK_LOG_TYPES.Deposit]: "Deposit",
  [BANK_LOG_TYPES.Withdraw]: "Withdraw",
  [BANK_LOG_TYPES.Promotion]: "Promotion",
  [BANK_LOG_TYPES.Tax]: "Tax",
  [BANK_LOG_TYPES.NativeTax]: "Native Tax",
  [BANK_LOG_TYPES.NativeWithdraw]: "Native Withdraw",
  [BANK_LOG_TYPES.NativeSwap]: "Native Swap",
  [BANK_LOG_TYPES.Seed]: "Seed",
};

const NATIVE_LOG_TYPES: ReadonlySet<number> = new Set([
  BANK_LOG_TYPES.NativeTax,
  BANK_LOG_TYPES.NativeWithdraw,
  BANK_LOG_TYPES.NativeSwap,
]);

const PROMOTION_REWARD_RANK_MAX = 29;
type IntegerLike = bigint | string | number;

export interface BankLogEntry {
  logType: number;
  logSubType: string;
  user: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  secondaryAmount: bigint;
  rank: number;
  timestamp: bigint;
}

export function nativeSymbolForChain(chainId: string): string {
  return chainId === "pulse" ? "PLS" : "BNB";
}

export function bankLogTypeBadgeClass(logType: number): string {
  switch (logType) {
    case BANK_LOG_TYPES.Deposit:
      return "border-green-500/40 bg-green-500/10 text-green-400";
    case BANK_LOG_TYPES.Withdraw:
      return "border-orange-500/40 bg-orange-500/10 text-orange-400";
    case BANK_LOG_TYPES.Promotion:
      return "border-purple-500/40 bg-purple-500/10 text-purple-400";
    case BANK_LOG_TYPES.Tax:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case BANK_LOG_TYPES.NativeTax:
      return "border-teal-500/40 bg-teal-500/10 text-teal-400";
    case BANK_LOG_TYPES.NativeWithdraw:
      return "border-rose-500/40 bg-rose-500/10 text-rose-400";
    case BANK_LOG_TYPES.NativeSwap:
      return "border-sky-500/40 bg-sky-500/10 text-sky-400";
    case BANK_LOG_TYPES.Seed:
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    default:
      return "border-border bg-secondary text-muted-foreground";
  }
}

export function getPromotionRewardRankIds(maxRank?: number): number[] {
  const cap = maxRank && maxRank > 0
    ? Math.min(maxRank, PROMOTION_REWARD_RANK_MAX)
    : PROMOTION_REWARD_RANK_MAX;
  return Array.from({ length: cap + 1 }, (_, rank) => rank).filter(
    (rank) => Boolean(RANK_NAMES[rank]),
  );
}

export function parseBankLog(raw: unknown): BankLogEntry | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return {
      logType: Number(raw[0] ?? 0),
      logSubType: String(raw[1] ?? ""),
      user: (raw[2] ?? zeroAddress) as `0x${string}`,
      recipient: (raw[3] ?? zeroAddress) as `0x${string}`,
      amount: BigInt(raw[4] ?? 0),
      secondaryAmount: BigInt(raw[5] ?? 0),
      rank: Number(raw[6] ?? 0),
      timestamp: BigInt(raw[7] ?? 0),
    };
  }
  if (typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  return {
    logType: Number(value.logType ?? 0),
    logSubType: String(value.logSubType ?? ""),
    user: (value.user ?? zeroAddress) as `0x${string}`,
    recipient: (value.recipient ?? zeroAddress) as `0x${string}`,
    amount: BigInt((value.amount as IntegerLike) ?? 0),
    secondaryAmount: BigInt((value.secondaryAmount as IntegerLike) ?? 0),
    rank: Number(value.rank ?? 0),
    timestamp: BigInt((value.timestamp as IntegerLike) ?? 0),
  };
}

export function parseBankLogs(raw: unknown): BankLogEntry[] {
  const list = Array.isArray(raw)
    ? raw
    : raw != null && typeof raw === "object" && Array.isArray((raw as { list?: unknown }).list)
      ? (raw as { list: unknown[] }).list
      : [];
  return list
    .map((item) => parseBankLog(item))
    .filter((entry): entry is BankLogEntry => entry !== null);
}

/** Lower-cased user and non-zero recipient addresses referenced by the logs. */
export function getBankLogAddresses(logs: readonly BankLogEntry[]): string[] {
  const addresses = new Set<string>();
  for (const log of logs) {
    addresses.add(log.user.toLowerCase());
    const recipient = log.recipient?.toLowerCase();
    if (recipient && recipient !== zeroAddress.toLowerCase()) addresses.add(recipient);
  }
  return Array.from(addresses);
}

/**
 * Logs are stored oldest-first on-chain; page 0 is the newest `BANK_LOG_PAGE_SIZE` entries.
 * Returns `null` when the page is past the oldest entry.
 */
export function getBankLogsPageRange(
  total: bigint,
  pageIndex: number,
): { start: bigint; endExclusive: bigint } | null {
  const pageSize = BigInt(BANK_LOG_PAGE_SIZE);
  const endExclusive = total - BigInt(pageIndex) * pageSize;
  if (endExclusive <= BigInt(0)) return null;
  const start = endExclusive > pageSize ? endExclusive - pageSize : BigInt(0);
  return { start, endExclusive };
}

export function formatBankLogsPageLabel(total: bigint, pageIndex: number): string {
  const range = getBankLogsPageRange(total, pageIndex);
  if (!range) return "No entries";
  return `Entries ${(range.start + BigInt(1)).toString()}–${range.endExclusive.toString()} of ${total.toString()}`;
}

export function bankLogsHasOlderPage(total: bigint, pageIndex: number): boolean {
  return BigInt(pageIndex + 1) * BigInt(BANK_LOG_PAGE_SIZE) < total;
}

function formatWeiAmount(wei: bigint | undefined, maximumFractionDigits: number): string {
  if (wei === undefined) return "—";
  return Number(formatUnits(wei, 18)).toLocaleString(undefined, { maximumFractionDigits });
}

export function formatCashAmount(wei: bigint | undefined): string {
  return formatWeiAmount(wei, 2);
}

export function formatNativeAmount(wei: bigint | undefined): string {
  return formatWeiAmount(wei, 6);
}

export function formatLogTimestamp(timestamp: bigint): string {
  const numericTimestamp = Number(timestamp);
  if (!numericTimestamp) return "—";
  const milliseconds = numericTimestamp > 1e12 ? numericTimestamp : numericTimestamp * 1000;
  return new Date(milliseconds).toLocaleString();
}

export function bankLogTypeLabel(logType: number): string {
  return BANK_LOG_TYPE_LABELS[logType] ?? `Type ${logType}`;
}

export function bankLogIsNative(logType: number): boolean {
  return NATIVE_LOG_TYPES.has(logType);
}

export function promotionRankLabel(contractRank: number): string {
  return RANK_NAMES[contractRank] ?? `Rank ${contractRank}`;
}

export function bankLogRankLabel(rank: number): string | null {
  return rank === 0 ? null : promotionRankLabel(rank);
}

function parsePromotionReward(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  const raw = String(value ?? "").trim();
  if (!raw) return BigInt(0);
  try {
    return raw.includes(".") ? parseEther(raw) : BigInt(raw);
  } catch {
    return BigInt(0);
  }
}

export function parsePromotionRewards(raw: unknown): bigint[] {
  if (raw == null) return [];
  let values: unknown[] | undefined;
  if (Array.isArray(raw)) values = raw;
  else if (typeof raw === "object") {
    const value = raw as Record<string, unknown>;
    if (Array.isArray(value.rewards)) values = value.rewards;
    else if (Array.isArray(value[0])) values = value[0] as unknown[];
  } else if (typeof raw === "string") {
    values = raw.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return values?.map(parsePromotionReward) ?? [];
}

export function formatWeiForInput(wei: bigint): string {
  if (wei === BigInt(0)) return "";
  const value = formatUnits(wei, 18);
  return value.includes(".")
    ? value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
    : value;
}

export function promotionRewardInputsFromWei(
  rewards: readonly bigint[],
  rankIds: readonly number[],
): Record<number, string> {
  return Object.fromEntries(
    rankIds.map((rank) => [rank, formatWeiForInput(rewards[rank] ?? BigInt(0))]),
  );
}

export function parsePlayerFamilyId(raw: unknown): bigint | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "object" && "familyId" in raw) {
    return BigInt((raw as { familyId: IntegerLike }).familyId);
  }
  if (Array.isArray(raw) && raw.length > 0) return BigInt(raw[0] as IntegerLike);
  return undefined;
}

export function parseCashInput(raw: string): bigint | null {
  const value = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  try {
    const wei = parseEther(value);
    return wei > BigInt(0) ? wei : null;
  } catch {
    return null;
  }
}
