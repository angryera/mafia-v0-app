import { zeroAddress, type PublicClient } from "viem";
import type { ChainId } from "@/lib/constants/address";
import {
  AttackStatus,
  KILL_INITIATOR_ABI,
  getKillOpenTime,
  killAddress,
  killBigInt,
  killBoolean,
  killField,
  killSafeNumber,
  requireKillAddress,
} from "@/lib/killChain";

export { getKillOpenTime } from "@/lib/killChain";

/** Numeric amounts are base units. Bullets and health have 18 decimals. */
export interface KillAttackRecord {
  attacker: `0x${string}`;
  requestBlock: bigint;
  status: number;
  cityId: number;
  outcome: number;
  lossLevel: number;
  victim: `0x${string}`;
  requestedAt: number;
  resolvedAt: number;
  bullets: bigint;
  healthLost: bigint;
  backfireBullets: bigint;
  backfireHealthLost: bigint;
  victimKillId: bigint;
  attackerKillId: bigint;
  victimKilled: boolean;
  attackerKilled: boolean;
  backfire: number;
  backfirePolicy: number;
  backfireOutcome: number;
  backfireLossLevel: number;
  message: string;
}

/** Health is 18-decimal; offense and defense are raw integers. */
export interface KillAttackStats {
  attackerHealth: bigint;
  victimHealth: bigint;
  attackerDefense: bigint;
  attackerOffense: bigint;
  victimDefense: bigint;
  victimOffense: bigint;
}

export interface KillAttackEntry {
  id: bigint;
  attack: KillAttackRecord;
  stats: KillAttackStats;
}

function parseAttack(raw: unknown): KillAttackRecord {
  const field = (name: string, index: number) => killField(raw, name, index);
  const status = killSafeNumber(field("status", 2), "attack status");
  if (status > AttackStatus.Expired) throw new Error(`Unknown attack status ${status}`);
  const message = field("message", 21);
  if (typeof message !== "string") throw new Error("Invalid attack message");
  return {
    attacker: killAddress(field("attacker", 0), "attacker"),
    requestBlock: killBigInt(field("requestBlock", 1), "request block"),
    status,
    cityId: killSafeNumber(field("cityId", 3), "city id"),
    outcome: killSafeNumber(field("outcome", 4), "outcome"),
    lossLevel: killSafeNumber(field("lossLevel", 5), "loss level"),
    victim: killAddress(field("victim", 6), "victim"),
    requestedAt: killSafeNumber(field("requestedAt", 7), "requested time"),
    resolvedAt: killSafeNumber(field("resolvedAt", 8), "resolved time"),
    bullets: killBigInt(field("bullets", 9), "bullets"),
    healthLost: killBigInt(field("healthLost", 10), "health lost"),
    backfireBullets: killBigInt(field("backfireBullets", 11), "backfire bullets"),
    backfireHealthLost: killBigInt(field("backfireHealthLost", 12), "backfire health lost"),
    victimKillId: killBigInt(field("victimKillId", 13), "victim kill id"),
    attackerKillId: killBigInt(field("attackerKillId", 14), "attacker kill id"),
    victimKilled: killBoolean(field("victimKilled", 15), "victim killed flag"),
    attackerKilled: killBoolean(field("attackerKilled", 16), "attacker killed flag"),
    backfire: killSafeNumber(field("backfire", 17), "backfire"),
    backfirePolicy: killSafeNumber(field("backfirePolicy", 18), "backfire policy"),
    backfireOutcome: killSafeNumber(field("backfireOutcome", 19), "backfire outcome"),
    backfireLossLevel: killSafeNumber(field("backfireLossLevel", 20), "backfire loss level"),
    message,
  };
}

function parseStats(raw: unknown): KillAttackStats {
  const value = (name: string, index: number) => killBigInt(killField(raw, name, index), name);
  return {
    attackerHealth: value("attackerHealth", 0),
    victimHealth: value("victimHealth", 1),
    attackerDefense: value("attackerDefense", 2),
    attackerOffense: value("attackerOffense", 3),
    victimDefense: value("victimDefense", 4),
    victimOffense: value("victimOffense", 5),
  };
}

export function hasAttackStats(stats: KillAttackStats): boolean {
  return Object.values(stats).some((value) => value !== 0n);
}

function parseAttackPage(raw: unknown): KillAttackEntry[] {
  const ids = killField(raw, "ids", 0);
  const list = killField(raw, "list", 1);
  const stats = killField(raw, "stats", 2);
  if (!Array.isArray(ids) || !Array.isArray(list) || !Array.isArray(stats)) {
    throw new Error("Invalid attack page from contract");
  }
  if (ids.length !== list.length) throw new Error("Attack ids and records length mismatch");
  if (stats.length !== list.length) throw new Error("Attack records and stats length mismatch");
  const seen = new Set<string>();
  return ids.map((id, index) => {
    const parsedId = killBigInt(id, "attack id");
    if (seen.has(parsedId.toString())) throw new Error("Attack id repeats within page");
    seen.add(parsedId.toString());
    return { id: parsedId, attack: parseAttack(list[index]), stats: parseStats(stats[index]) };
  });
}

function assertPageBounds(start: bigint, length: bigint): void {
  if (start < 0n || length < 1n || length > 1000n) {
    throw new Error("Invalid attack page bounds");
  }
}

export async function getAttack(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  attackId: string | bigint;
}): Promise<KillAttackEntry> {
  const id = typeof params.attackId === "bigint"
    ? params.attackId
    : /^(0|[1-9]\d{0,77})$/.test(params.attackId) ? BigInt(params.attackId) : -1n;
  if (id < 0n || id >= 2n ** 256n) throw new Error("Invalid attack id");
  const count = await getAttackCount(params);
  if (id >= count) throw new Error(`Attack #${id} does not exist`);
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killInitiator"),
    abi: KILL_INITIATOR_ABI,
    functionName: "getAttack",
    args: [id],
  });
  const attack = parseAttack(killField(raw, "record", 0));
  if (attack.requestedAt === 0 || attack.attacker.toLowerCase() === zeroAddress ||
      attack.victim.toLowerCase() === zeroAddress) {
    throw new Error(`Attack #${id} has no stored record`);
  }
  return {
    id,
    attack,
    stats: parseStats(killField(raw, "stats", 1)),
  };
}

export async function getAttackCount(params: {
  publicClient: PublicClient;
  chainId: ChainId;
}): Promise<bigint> {
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killInitiator"),
    abi: KILL_INITIATOR_ABI,
    functionName: "getAttackCount",
  });
  return killBigInt(raw, "attack count");
}

export async function getAttacks(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  start: bigint | number;
  length: bigint | number;
  totalCount?: bigint;
}): Promise<KillAttackEntry[]> {
  const start = BigInt(params.start);
  const length = BigInt(params.length);
  assertPageBounds(start, length);
  const count = params.totalCount ?? await getAttackCount(params);
  if (start >= count) return [];
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killInitiator"),
    abi: KILL_INITIATOR_ABI,
    functionName: "getAttacks",
    args: [start, length],
  });
  const page = parseAttackPage(raw);
  if (page.length === 0) throw new Error("Attack page is empty before end of history");
  const expected = length < count - start ? length : count - start;
  if (BigInt(page.length) !== expected) throw new Error("Attack page is shorter than the remaining history");
  return page;
}

export async function getUserAttackCounts(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  user: `0x${string}`;
}): Promise<{ asAttacker: bigint; asVictim: bigint }> {
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killInitiator"),
    abi: KILL_INITIATOR_ABI,
    functionName: "getUserAttackCounts",
    args: [params.user],
  });
  return {
    asAttacker: killBigInt(killField(raw, "asAttacker", 0), "attacker count"),
    asVictim: killBigInt(killField(raw, "asVictim", 1), "victim count"),
  };
}

export async function getUserAttacks(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  user: `0x${string}`;
  asVictim: boolean;
  start: bigint | number;
  length: bigint | number;
  totalCount?: bigint;
}): Promise<KillAttackEntry[]> {
  const start = BigInt(params.start);
  const length = BigInt(params.length);
  assertPageBounds(start, length);
  const counts = params.totalCount === undefined ? await getUserAttackCounts(params) : null;
  const count = params.totalCount ?? (params.asVictim ? counts!.asVictim : counts!.asAttacker);
  if (start >= count) return [];
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killInitiator"),
    abi: KILL_INITIATOR_ABI,
    functionName: "getUserAttacks",
    args: [params.user, params.asVictim, start, length],
  });
  const page = parseAttackPage(raw);
  if (page.length === 0) throw new Error("User attack page is empty before end of history");
  const expected = length < count - start ? length : count - start;
  if (BigInt(page.length) !== expected) throw new Error("User attack page is shorter than the remaining history");
  return page;
}

function appendUnique(target: KillAttackEntry[], page: KillAttackEntry[], seen: Set<string>): void {
  for (const entry of page) {
    const key = entry.id.toString();
    if (seen.has(key)) throw new Error(`Attack id ${key} repeats across pages`);
    seen.add(key);
    target.push(entry);
  }
}

/** The graveyard is intentionally limited to the newest 50 attacks. */
export async function loadLatestAttacks(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  length?: number;
}): Promise<KillAttackEntry[]> {
  const length = params.length ?? 50;
  if (!Number.isSafeInteger(length) || length < 1 || length > 1000) throw new Error("Invalid latest attack length");
  return getAttacks({ ...params, start: 0n, length: BigInt(length) });
}

/** Scan all attacks newest first for exact leaderboard scoring. */
export async function loadAllAttacks(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  pageSize?: number;
}): Promise<KillAttackEntry[]> {
  const pageSize = params.pageSize ?? 50;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Invalid page size");
  const count = await getAttackCount(params);
  const entries: KillAttackEntry[] = [];
  const seen = new Set<string>();
  for (let start = 0n; start < count; start += BigInt(pageSize)) {
    const page = await getAttacks({ ...params, start, length: pageSize, totalCount: count });
    appendUnique(entries, page, seen);
  }
  return entries;
}

export function isConfirmedKill(entry: KillAttackEntry, chainId: ChainId): boolean {
  const attack = entry.attack;
  return attack.status === AttackStatus.Resolved &&
    (attack.victimKilled || attack.attackerKilled) &&
    attack.requestedAt >= getKillOpenTime(chainId);
}

export function isAttemptedSurvival(entry: KillAttackEntry, chainId: ChainId): boolean {
  const attack = entry.attack;
  return attack.status === AttackStatus.Resolved &&
    !attack.victimKilled && attack.requestedAt >= getKillOpenTime(chainId);
}

/** At most four pages of 25; a backfire can appear here and in the graveyard. */
export async function loadAttemptedAttacks(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  maxPages?: number;
  pageSize?: number;
  maxRows?: number;
}): Promise<KillAttackEntry[]> {
  const maxPages = params.maxPages ?? 4;
  const pageSize = params.pageSize ?? 25;
  const maxRows = params.maxRows ?? 25;
  if (![maxPages, pageSize, maxRows].every((n) => Number.isSafeInteger(n) && n > 0)) {
    throw new Error("Invalid attempted attack scan bounds");
  }
  const count = await getAttackCount(params);
  const entries: KillAttackEntry[] = [];
  const seen = new Set<string>();
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const start = BigInt(pageIndex * pageSize);
    if (start >= count || entries.length >= maxRows) break;
    const page = await getAttacks({ ...params, start, length: pageSize, totalCount: count });
    const distinct: KillAttackEntry[] = [];
    appendUnique(distinct, page, seen);
    for (const entry of distinct) {
      if (isAttemptedSurvival(entry, params.chainId)) entries.push(entry);
      if (entries.length >= maxRows) break;
    }
  }
  return entries;
}

export interface KillLeaderboardEntry { address: `0x${string}`; kills: number; rank: number }

export function buildKillLeaderboard(entries: KillAttackEntry[], chainId: ChainId): KillLeaderboardEntry[] {
  const counts = new Map<string, { address: `0x${string}`; kills: number }>();
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!isConfirmedKill(entry, chainId)) continue;
    const id = entry.id.toString();
    if (seen.has(id)) throw new Error(`Attack id ${id} repeats in leaderboard history`);
    seen.add(id);
    const { attacker, victim, victimKilled, attackerKilled } = entry.attack;
    const credited = victimKilled && attackerKilled ? [attacker, victim]
      : victimKilled ? [attacker] : [victim];
    for (const address of new Set(credited.map((a) => a.toLowerCase()))) {
      const old = counts.get(address);
      counts.set(address, { address: old?.address ?? credited.find((a) => a.toLowerCase() === address)!, kills: (old?.kills ?? 0) + 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.kills - a.kills || a.address.localeCompare(b.address))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// Compatibility for the existing dead-account and legacy kill-history screens.
// Their data now comes from the initiator records, with no fixture fallback.
export type KillResultType = 0 | 1 | 2;
export const KillResultType = { SingleKill: 0, DoubleKill: 1, BackfireKill: 2 } as const;
export interface KillHistoryEntry {
  id: string;
  timestamp: number;
  attackerName: string;
  attackerAddress?: `0x${string}`;
  victimName: string;
  victimAddress?: `0x${string}`;
  resultType: KillResultType;
  attackerBullets?: number;
  backfireBullets?: number;
}

function shortAddress(address: string): string { return `${address.slice(0, 6)}...${address.slice(-4)}`; }
function toLegacy(entry: KillAttackEntry): KillHistoryEntry {
  const a = entry.attack;
  return {
    id: entry.id.toString(),
    timestamp: a.resolvedAt || a.requestedAt,
    attackerName: shortAddress(a.attacker),
    attackerAddress: a.attacker,
    victimName: shortAddress(a.victim),
    victimAddress: a.victim,
    resultType: a.victimKilled && a.attackerKilled ? 1 : a.victimKilled ? 0 : 2,
    attackerBullets: Number(a.bullets / 10n ** 18n),
    backfireBullets: Number(a.backfireBullets / 10n ** 18n),
  };
}

export async function fetchKillHistory(params: {
  publicClient: PublicClient;
  chainId: ChainId;
}): Promise<KillHistoryEntry[]> {
  return (await loadLatestAttacks(params)).filter((entry) => isConfirmedKill(entry, params.chainId)).map(toLegacy);
}

export async function fetchLatestKillForVictim(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  victimAddress: `0x${string}`;
  victimName: string;
}): Promise<KillHistoryEntry | null> {
  const counts = await getUserAttackCounts({ ...params, user: params.victimAddress });
  const findDeath = async (asVictim: boolean): Promise<KillAttackEntry | null> => {
    const count = asVictim ? counts.asVictim : counts.asAttacker;
    const seen = new Set<string>();
    for (let start = 0n; start < count; start += 50n) {
      const page = await getUserAttacks({
        ...params, user: params.victimAddress, asVictim,
        start, length: 50n, totalCount: count,
      });
      const unique: KillAttackEntry[] = [];
      appendUnique(unique, page, seen);
      const match = unique.find((entry) => entry.attack.status === AttackStatus.Resolved &&
        (asVictim ? entry.attack.victimKilled : entry.attack.attackerKilled) &&
        entry.attack.requestedAt >= getKillOpenTime(params.chainId));
      if (match) return match;
    }
    return null;
  };
  const [victimDeath, attackerDeath] = await Promise.all([findDeath(true), findDeath(false)]);
  const match = !victimDeath ? attackerDeath : !attackerDeath ? victimDeath
    : victimDeath.id > attackerDeath.id ? victimDeath : attackerDeath;
  if (!match) return null;
  const legacy = toLegacy(match);
  if (match.attack.attacker.toLowerCase() === params.victimAddress.toLowerCase()) {
    // In backfire the original target delivered the fatal strike.
    return {
      ...legacy,
      attackerName: shortAddress(match.attack.victim),
      attackerAddress: match.attack.victim,
      victimName: params.victimName || shortAddress(params.victimAddress),
      victimAddress: params.victimAddress,
    };
  }
  return { ...legacy, victimName: params.victimName || shortAddress(params.victimAddress) };
}
