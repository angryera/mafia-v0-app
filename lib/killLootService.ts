import {
  isAddress,
  zeroAddress,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import type { ChainId } from "@/lib/constants/address";
import {
  KILL_LOOT_LENS_ABI,
  KILL_REGISTRY_ABI,
  killAddress,
  killBigInt,
  killBoolean,
  killField,
  killSafeNumber,
  parseKillId,
  requireKillAddress,
} from "@/lib/killChain";

export const DEFAULT_KILL_DRAIN_BATCH_SIZE = 50;
const LOOT_PAGE_LENGTH = 50n;
const ERC20_DECIMALS_ABI = [{
  type: "function", name: "decimals", stateMutability: "view",
  inputs: [], outputs: [{ name: "", type: "uint8" }],
}] as const;

export const LootKind = {
  Token: 0, Items: 1, Listings: 2, EquippedItems: 3,
  EquipmentStake: 4, JackpotEntries: 5, LotteryEntries: 6,
  ActiveStake: 7, FamilyCash: 8, FamilyNative: 9,
} as const;
export const LootDest = { Killer: 0, Victim: 1, Split: 2 } as const;

export interface KillRegistryRecord {
  victim: `0x${string}`;
  killer: `0x${string}`;
  /** Raw current recipient. Only this value authorizes a claim. */
  drainer: `0x${string}`;
  /** Label fallback for older records with a zero drainer. */
  displayDrainer: `0x${string}`;
  specIndex: bigint;
  finished: boolean;
  startedAt: number;
  finishedAt: number;
}

export async function getKillRegistryRecord(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  killId: string | bigint;
}): Promise<KillRegistryRecord | null> {
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killRegistry"),
    abi: KILL_REGISTRY_ABI,
    functionName: "kills",
    args: [parseKillId(params.killId)],
  });
  const victim = killAddress(killField(raw, "victim", 0), "kill victim");
  if (victim.toLowerCase() === zeroAddress) return null;
  const killer = killAddress(killField(raw, "killer", 1), "kill killer");
  const recordedDrainer = killAddress(killField(raw, "drainer", 6), "kill drainer");
  return {
    victim,
    killer,
    drainer: recordedDrainer,
    displayDrainer: recordedDrainer.toLowerCase() === zeroAddress ? killer : recordedDrainer,
    specIndex: killBigInt(killField(raw, "specIndex", 2), "spec index"),
    finished: killBoolean(killField(raw, "finished", 3), "kill finished flag"),
    startedAt: killSafeNumber(killField(raw, "startedAt", 4), "kill start time"),
    finishedAt: killSafeNumber(killField(raw, "finishedAt", 5), "kill finish time"),
  };
}

export interface KillLootBase {
  specIndex: bigint;
  kind: number;
  dest: number;
  source: `0x${string}`;
  category: bigint;
  killerBps: number;
}
export interface KillLootSummary extends KillLootBase { total: bigint; toKiller: bigint }
export interface KillLootRow extends KillLootBase {
  id: bigint;
  itemId: bigint;
  categoryId: bigint;
  typeId: bigint;
  cityId: bigint;
  amount: bigint;
  mafia: bigint;
  price: bigint;
}
export interface KillLootPreview {
  victim: `0x${string}`;
  killer: `0x${string}`;
  drainer: `0x${string}`;
  summaries: KillLootSummary[];
  /** Count of index positions, including stale inventory holes. */
  totalRows: bigint;
  rows: KillLootRow[];
  tokenDecimals?: Record<string, number>;
}

function parseBase(raw: unknown): KillLootBase {
  const field = (name: string, index: number) => killField(raw, name, index);
  const kind = killSafeNumber(field("kind", 1), "loot kind");
  const dest = killSafeNumber(field("dest", 2), "loot destination");
  if (kind > LootKind.FamilyNative) throw new Error(`Unknown loot kind ${kind}`);
  if (dest > LootDest.Split) throw new Error(`Unknown loot destination ${dest}`);
  return {
    specIndex: killBigInt(field("specIndex", 0), "loot spec index"),
    kind,
    dest,
    source: killAddress(field("source", 3), "loot source"),
    category: killBigInt(field("category", 4), "loot category"),
    killerBps: killSafeNumber(field("killerBps", 5), "killer share"),
  };
}

function parseSummary(raw: unknown): KillLootSummary {
  return {
    ...parseBase(raw),
    total: killBigInt(killField(raw, "total", 6), "loot total"),
    toKiller: killBigInt(killField(raw, "toKiller", 7), "killer amount"),
  };
}

function parseRow(raw: unknown): KillLootRow {
  const field = (name: string, index: number) => killBigInt(killField(raw, name, index), name);
  return {
    ...parseBase(raw),
    id: field("id", 6),
    itemId: field("itemId", 7),
    categoryId: field("categoryId", 8),
    typeId: field("typeId", 9),
    cityId: field("cityId", 10),
    amount: field("amount", 11),
    mafia: field("mafia", 12),
    price: field("price", 13),
  };
}

export async function previewKill(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  killId: string | bigint;
}): Promise<Pick<KillLootPreview, "victim" | "killer" | "drainer" | "summaries">> {
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killLootLens"),
    abi: KILL_LOOT_LENS_ABI,
    functionName: "previewKill",
    args: [parseKillId(params.killId)],
  });
  const victim = killAddress(killField(raw, "victim", 0), "loot victim");
  if (victim.toLowerCase() === zeroAddress) throw new Error("Kill loot lens returned no victim");
  const loot = killField(raw, "loot", 3);
  if (!Array.isArray(loot)) throw new Error("Invalid loot summaries from contract");
  return {
    victim,
    killer: killAddress(killField(raw, "killer", 1), "loot killer"),
    drainer: killAddress(killField(raw, "drainer", 2), "loot drainer"),
    summaries: loot.map(parseSummary),
  };
}

export async function previewKillRows(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  killId: string | bigint;
  start: bigint | number;
  length: bigint | number;
}): Promise<{ total: bigint; rows: KillLootRow[] }> {
  const start = BigInt(params.start);
  const length = BigInt(params.length);
  if (start < 0n || length < 1n || length > 1000n) throw new Error("Invalid loot page bounds");
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killLootLens"),
    abi: KILL_LOOT_LENS_ABI,
    functionName: "previewKillRows",
    args: [parseKillId(params.killId), start, length],
  });
  const rows = killField(raw, "rows", 1);
  if (!Array.isArray(rows)) throw new Error("Invalid loot rows from contract");
  return { total: killBigInt(killField(raw, "total", 0), "loot row count"), rows: rows.map(parseRow) };
}

export async function getKillLootPreview(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  killId: string | bigint;
}): Promise<KillLootPreview> {
  const summary = await previewKill(params);
  const rows: KillLootRow[] = [];
  const seen = new Set<string>();
  let totalRows = 0n;
  for (let start = 0n; ; start += LOOT_PAGE_LENGTH) {
    const page = await previewKillRows({ ...params, start, length: LOOT_PAGE_LENGTH });
    totalRows = page.total;
    for (const row of page.rows) {
      // Lens pages are index spans. A row at a spec boundary can repeat, while
      // stale inventory positions can leave an otherwise valid page empty.
      const key = [row.specIndex, row.kind, row.dest, row.id, row.itemId,
        row.categoryId, row.typeId, row.cityId, row.amount, row.mafia, row.price].join(":");
      if (!seen.has(key)) { seen.add(key); rows.push(row); }
    }
    if (start + LOOT_PAGE_LENGTH >= totalRows) break;
  }
  const sources = [...new Set(summary.summaries
    .filter((item) => item.kind === LootKind.Token && isAddress(item.source))
    .map((item) => item.source.toLowerCase() as `0x${string}`))];
  const decimals = await Promise.all(sources.map(async (source) => {
    try {
      const raw = await params.publicClient.readContract({
        address: source, abi: ERC20_DECIMALS_ABI, functionName: "decimals",
      });
      const value = killSafeNumber(raw, "token decimals");
      return value <= 255 ? [source, value] as const : null;
    } catch {
      // An unknown token can still appear in the loot preview as base units.
      return null;
    }
  }));
  const tokenDecimals = Object.fromEntries(decimals.filter((entry): entry is readonly [`0x${string}`, number] => entry !== null));
  return {
    ...summary, totalRows, rows,
    ...(Object.keys(tokenDecimals).length ? { tokenDecimals } : {}),
  };
}

/** Drain a single batch. The caller repeats after rereading kills(killId). */
export async function drainKill(params: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  chainId: ChainId;
  killId: string | bigint;
  account: `0x${string}`;
  maxBatch?: number;
}): Promise<TransactionReceipt> {
  const maxBatch = params.maxBatch ?? DEFAULT_KILL_DRAIN_BATCH_SIZE;
  if (!Number.isSafeInteger(maxBatch) || maxBatch < 1) throw new Error("Invalid claim batch size");
  const record = await getKillRegistryRecord(params);
  if (!record) throw new Error("Kill record not found on-chain");
  if (record.finished) throw new Error("Asset claim is already complete");
  if (record.drainer.toLowerCase() !== params.account.toLowerCase()) {
    throw new Error("Only the current drainer can claim these assets");
  }
  const hash = await params.walletClient.writeContract({
    address: requireKillAddress(params.chainId, "killRegistry"),
    abi: KILL_REGISTRY_ABI,
    functionName: "drain",
    args: [parseKillId(params.killId), BigInt(maxBatch)],
    account: params.account,
    chain: params.walletClient.chain ?? null,
  });
  const receipt = await params.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Asset claim transaction reverted");
  return receipt;
}
