import {
  formatEther,
  isAddress,
  parseEventLogs,
  zeroAddress,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { HITLIST_ABI } from "@/lib/constants/abi/hitlist";
import type { ChainId } from "@/lib/constants/address";
import { CONTRACT_ADDRESSES } from "@/lib/constants/address";
import { formatWalletAddress } from "@/lib/format";

export enum HitlistKind {
  Player = 0,
  Protocol = 1,
}

export enum HitlistRewardType {
  Cash = 0,
  HelperCredit = 1,
  Keys = 2,
}

export enum HitlistStoredStatus {
  Open = 0,
  Claimed = 1,
  Refunded = 2,
  Survived = 3,
  Voided = 4,
}

/** Expired open listings use derived states instead of the stored Open status. */
export enum HitlistState {
  Claimed = 1,
  Refunded = 2,
  Survived = 3,
  Voided = 4,
  Active = 10,
  Refundable = 12,
  SurvivorClaimable = 13,
}

export type HitlistRewardKind = "cash" | "hc" | "keys";

export interface HitlistListing {
  id: bigint;
  creator: `0x${string}`;
  createdAt: number;
  expiresAt: number;
  target: `0x${string}`;
  kind: HitlistKind;
  rewardType: HitlistRewardType;
  status: HitlistStoredStatus;
  state: HitlistState;
  /** Cash and HC in wei; keys as a plain count. */
  amount: bigint;
  settledTo: `0x${string}`;
  settledAmount: bigint;
}

export interface HitlistConfig {
  playerMinAmount: bigint;
  playerMinDuration: number;
  playerMaxDuration: number;
  protocolCooldown: number;
  protocolMinDays: number;
  protocolMaxDays: number;
  modifierMinBps: number;
  modifierMaxBps: number;
  survivorBps: number;
  maxProbes: number;
  maxActivePerTarget: number;
  maxRankRetries: number;
  fulfillerReward: bigint;
}

export interface PendingHitlistRequest {
  requestBlock: bigint;
  requester: `0x${string}`;
  ready: boolean;
  expired: boolean;
}

export type FulfillProtocolListingOutcome =
  | { outcome: "created"; listingId: bigint }
  | { outcome: "skipped"; rank: number }
  | { outcome: "expired" };

export interface HitlistSnapshot {
  listings: HitlistListing[];
  history: HitlistListing[];
  config: HitlistConfig;
  nextProtocolListingAt: number;
  pending: PendingHitlistRequest;
}

const PAGE_SIZE = 100n;

type ReadClient = Pick<PublicClient, "readContract" | "getBlockNumber">;

function field(value: unknown, name: string, index: number): unknown {
  if (Array.isArray(value)) return value[index];
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return item[name] ?? item[String(index)];
  }
  return undefined;
}

function toBigInt(value: unknown, label: string): bigint {
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(`Invalid ${label} from Hitlist contract`);
}

function toNumber(value: unknown, label: string): number {
  const number = toBigInt(value, label);
  if (number > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} exceeds safe integer range`);
  }
  return Number(number);
}

function toBool(value: unknown, label: string): boolean {
  if (typeof value === "boolean") return value;
  throw new Error(`Invalid ${label} from Hitlist contract`);
}

function toAddress(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error(`Invalid ${label} from Hitlist contract`);
  }
  return value;
}

function toEnum<T extends number>(value: unknown, valid: readonly number[], label: string): T {
  const number = toNumber(value, label);
  if (!valid.includes(number)) throw new Error(`Unknown ${label} from Hitlist contract: ${String(value)}`);
  return number as T;
}

export function isHitlistConfigured(chainId: ChainId): boolean {
  const address = CONTRACT_ADDRESSES[chainId].hitlist;
  return isAddress(address) && address.toLowerCase() !== zeroAddress;
}

export function requireHitlistAddress(chainId: ChainId): `0x${string}` {
  if (!isHitlistConfigured(chainId)) {
    throw new Error(`Hitlist contract is not configured on ${chainId}`);
  }
  return CONTRACT_ADDRESSES[chainId].hitlist;
}

function parseListing(id: bigint, raw: unknown, rawState: unknown): HitlistListing {
  return {
    id,
    creator: toAddress(field(raw, "creator", 0), "listing creator"),
    createdAt: toNumber(field(raw, "createdAt", 1), "listing creation time"),
    expiresAt: toNumber(field(raw, "expiresAt", 2), "listing expiry time"),
    target: toAddress(field(raw, "target", 3), "listing target"),
    kind: toEnum<HitlistKind>(field(raw, "kind", 4), [0, 1], "listing kind"),
    rewardType: toEnum<HitlistRewardType>(field(raw, "rewardType", 5), [0, 1, 2], "reward type"),
    status: toEnum<HitlistStoredStatus>(field(raw, "status", 6), [0, 1, 2, 3, 4], "listing status"),
    amount: toBigInt(field(raw, "amount", 7), "listing amount"),
    settledTo: toAddress(field(raw, "settledTo", 8), "listing recipient"),
    settledAmount: toBigInt(field(raw, "settledAmount", 9), "settled amount"),
    state: toEnum<HitlistState>(rawState, [1, 2, 3, 4, 10, 12, 13], "listing state"),
  };
}

function parseRows(ids: unknown[], list: unknown[], states: unknown[]): HitlistListing[] {
  if (ids.length !== list.length || list.length !== states.length) {
    throw new Error("Hitlist listing IDs, rows, and states length mismatch");
  }
  return list.map((row, index) => parseListing(toBigInt(ids[index], "listing id"), row, states[index]));
}

function sortNewest(list: HitlistListing[]): HitlistListing[] {
  return list.sort((a, b) => b.createdAt - a.createdAt || (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));
}

function parsePage(result: unknown): { listings: HitlistListing[]; total: bigint } {
  return {
    listings: parseRows(
      (field(result, "ids", 0) as unknown[]) ?? [],
      (field(result, "list", 1) as unknown[]) ?? [],
      (field(result, "states", 2) as unknown[]) ?? [],
    ),
    total: toBigInt(field(result, "total", 3) ?? 0n, "listing total"),
  };
}

async function loadOpenListings(
  client: ReadClient,
  address: `0x${string}`,
  functionName: "getOpenListings" | "getOpenListingsByCreator",
  prefixArgs: readonly unknown[],
): Promise<HitlistListing[]> {
  // EnumerableSet swaps its last item into a removed slot. Read every page at one
  // block so settlements between RPC calls cannot shift rows across page boundaries.
  const blockNumber = await client.getBlockNumber();
  const byId = new Map<string, HitlistListing>();
  let offset = 0n;
  let total: bigint | undefined;
  do {
    const result = await client.readContract({
      address,
      abi: HITLIST_ABI,
      functionName,
      args: [...prefixArgs, offset, PAGE_SIZE] as never,
      blockNumber,
    });
    const page = parsePage(result);
    if (total !== undefined && page.total !== total) {
      throw new Error("Hitlist listing count changed during the page scan");
    }
    total = page.total;
    for (const listing of page.listings) byId.set(listing.id.toString(), listing);
    offset += PAGE_SIZE;
  } while (offset < total);
  if (BigInt(byId.size) !== total) {
    throw new Error("Hitlist page scan did not return every listing");
  }
  return sortNewest([...byId.values()]);
}

export async function getOpenHitlistListings(
  client: ReadClient,
  chainId: ChainId,
): Promise<HitlistListing[]> {
  return loadOpenListings(client, requireHitlistAddress(chainId), "getOpenListings", []);
}

export async function getOpenHitlistListingsByCreator(
  client: ReadClient,
  chainId: ChainId,
  creator: `0x${string}`,
): Promise<HitlistListing[]> {
  if (!isAddress(creator)) throw new Error("Invalid creator address");
  return loadOpenListings(client, requireHitlistAddress(chainId), "getOpenListingsByCreator", [creator]);
}

export async function getOpenHitlistListingsOnTarget(
  client: ReadClient,
  chainId: ChainId,
  target: `0x${string}`,
): Promise<HitlistListing[]> {
  if (!isAddress(target)) throw new Error("Invalid target address");
  const result = await client.readContract({
    address: requireHitlistAddress(chainId),
    abi: HITLIST_ABI,
    functionName: "getOpenListingsOnTarget",
    args: [target],
  });
  return sortNewest(
    parseRows(
      (field(result, "ids", 0) as unknown[]) ?? [],
      (field(result, "list", 1) as unknown[]) ?? [],
      (field(result, "states", 2) as unknown[]) ?? [],
    ),
  );
}

export async function getRecentHitlistHistory(
  client: ReadClient,
  chainId: ChainId,
  limit = 50,
): Promise<HitlistListing[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Hitlist history limit must be between 1 and 100");
  }
  const address = requireHitlistAddress(chainId);
  const count = toBigInt(
    await client.readContract({ address, abi: HITLIST_ABI, functionName: "listingCount" }),
    "listing count",
  );
  if (count === 0n) return [];
  const length = count < BigInt(limit) ? count : BigInt(limit);
  const start = count - length;
  const result = await client.readContract({
    address,
    abi: HITLIST_ABI,
    functionName: "getListings",
    args: [start, length],
  });
  const list = (field(result, "list", 0) as unknown[]) ?? [];
  const states = (field(result, "states", 1) as unknown[]) ?? [];
  const ids = list.map((_, index) => start + BigInt(index));
  return sortNewest(parseRows(ids, list, states).filter((listing) => listing.state < HitlistState.Active));
}

export async function getNextProtocolListingAt(client: ReadClient, chainId: ChainId): Promise<number> {
  return toNumber(
    await client.readContract({
      address: requireHitlistAddress(chainId),
      abi: HITLIST_ABI,
      functionName: "nextProtocolListingAt",
    }),
    "next protocol listing time",
  );
}

export async function getPendingHitlistRequest(
  client: ReadClient,
  chainId: ChainId,
): Promise<PendingHitlistRequest> {
  const result = await client.readContract({
    address: requireHitlistAddress(chainId),
    abi: HITLIST_ABI,
    functionName: "getPendingRequest",
  });
  return {
    requestBlock: toBigInt(field(result, "requestBlock", 0), "request block"),
    requester: toAddress(field(result, "requester", 1), "pending requester"),
    ready: toBool(field(result, "ready", 2), "request ready"),
    expired: toBool(field(result, "expired", 3), "request expired"),
  };
}

export async function getHitlistConfig(client: ReadClient, chainId: ChainId): Promise<HitlistConfig> {
  const result = await client.readContract({
    address: requireHitlistAddress(chainId),
    abi: HITLIST_ABI,
    functionName: "config",
  });
  return {
    playerMinAmount: toBigInt(field(result, "playerMinAmount", 0), "player minimum amount"),
    playerMinDuration: toNumber(field(result, "playerMinDuration", 1), "minimum listing duration"),
    playerMaxDuration: toNumber(field(result, "playerMaxDuration", 2), "maximum listing duration"),
    protocolCooldown: toNumber(field(result, "protocolCooldown", 3), "protocol cooldown"),
    protocolMinDays: toNumber(field(result, "protocolMinDays", 4), "minimum protocol days"),
    protocolMaxDays: toNumber(field(result, "protocolMaxDays", 5), "maximum protocol days"),
    modifierMinBps: toNumber(field(result, "modifierMinBps", 6), "minimum modifier"),
    modifierMaxBps: toNumber(field(result, "modifierMaxBps", 7), "maximum modifier"),
    survivorBps: toNumber(field(result, "survivorBps", 8), "survivor share"),
    maxProbes: toNumber(field(result, "maxProbes", 9), "maximum probes"),
    maxActivePerTarget: toNumber(field(result, "maxActivePerTarget", 10), "target listing cap"),
    maxRankRetries: toNumber(field(result, "maxRankRetries", 11), "maximum rank retries"),
    fulfillerReward: toBigInt(field(result, "fulfillerReward", 12), "fulfiller reward"),
  };
}

export async function loadHitlistSnapshot(
  client: ReadClient,
  chainId: ChainId,
): Promise<HitlistSnapshot> {
  const [listings, history, config, nextProtocolListingAt, pending] = await Promise.all([
    getOpenHitlistListings(client, chainId),
    getRecentHitlistHistory(client, chainId),
    getHitlistConfig(client, chainId),
    getNextProtocolListingAt(client, chainId),
    getPendingHitlistRequest(client, chainId),
  ]);
  return { listings, history, config, nextProtocolListingAt, pending };
}

export function decodeFulfillProtocolListingReceipt(
  receipt: TransactionReceipt,
  hitlistAddress: `0x${string}`,
): FulfillProtocolListingOutcome {
  const logs = parseEventLogs({
    abi: HITLIST_ABI,
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === hitlistAddress.toLowerCase()),
  });
  const created = logs.find((log) => log.eventName === "ListingCreated");
  if (created && "id" in created.args) {
    return { outcome: "created", listingId: toBigInt(created.args.id, "listing id") };
  }
  const skipped = logs.find((log) => log.eventName === "ProtocolListingSkipped");
  if (skipped && "rank" in skipped.args) {
    return { outcome: "skipped", rank: toNumber(skipped.args.rank, "skipped protocol rank") };
  }
  const expired = logs.find((log) => log.eventName === "ProtocolRequestExpired");
  if (expired) return { outcome: "expired" };
  throw new Error("Reveal transaction confirmed but no protocol outcome event was found");
}

export function decodeListingCreatedId(
  receipt: TransactionReceipt,
  hitlistAddress: `0x${string}`,
): bigint {
  const logs = parseEventLogs({
    abi: HITLIST_ABI,
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === hitlistAddress.toLowerCase()),
  });
  const created = logs.find((log) => log.eventName === "ListingCreated");
  if (!created || !("id" in created.args)) {
    throw new Error("Listing transaction confirmed but ListingCreated event was not found");
  }
  return toBigInt(created.args.id, "listing id");
}

export function rewardKindFromType(rewardType: HitlistRewardType | number): HitlistRewardKind {
  if (rewardType === HitlistRewardType.Cash) return "cash";
  if (rewardType === HitlistRewardType.HelperCredit) return "hc";
  if (rewardType === HitlistRewardType.Keys) return "keys";
  throw new Error(`Unknown Hitlist reward type: ${rewardType}`);
}

const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function formatRewardNumber(amount: bigint, kind: HitlistRewardKind): string {
  if (kind === "keys") return groupDigits(amount.toString());
  const [whole, fraction] = formatEther(amount).split(".");
  return `${groupDigits(whole)}${fraction ? `.${fraction}` : ""}`;
}

export function formatHitlistReward(amount: bigint, kind: HitlistRewardKind): string {
  const value = formatRewardNumber(amount, kind);
  if (kind === "cash") return `$${value}`;
  return `${value} ${kind === "hc" ? "HC" : "keys"}`;
}

export function sameAddress(left?: string | null, right?: string | null): boolean {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

export function listingStateLabel(state: HitlistState): string {
  switch (state) {
    case HitlistState.Active:
      return "Available";
    case HitlistState.Refundable:
      return "Refund available";
    case HitlistState.SurvivorClaimable:
      return "Survivor claim";
    case HitlistState.Claimed:
      return "Claimed";
    case HitlistState.Refunded:
      return "Refunded";
    case HitlistState.Survived:
      return "Survived";
    case HitlistState.Voided:
      return "Voided";
    default:
      return "Unknown";
  }
}

export function formatHitlistCountdown(remainingSeconds: number): string {
  const seconds = Math.max(0, Math.floor(remainingSeconds));
  if (seconds === 0) return "Ready now";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

const REVERT_MESSAGES: Record<string, string> = {
  "inactive user": "Your player is inactive. You cannot make this Hitlist request right now.",
  "cannot target yourself": "You cannot place a bounty on yourself.",
  "no profile": "That target does not have a game profile.",
  "amount too low": "The cash reward is below the contract minimum.",
  "invalid duration": "Choose a permanent listing or an expiry within the contract's allowed range.",
  "target listing cap": "This target already has the maximum number of active listings.",
  cooldown: "The next protocol listing is still on cooldown.",
  "request pending": "A protocol listing request is already waiting to be revealed.",
  "no request": "There is no protocol listing request to reveal.",
  "too early": "Wait for two more blocks before revealing the listing.",
  "nothing to settle": "This listing is not ready to settle.",
  "create a profile before using game contracts":
    "Create a game profile before funding or requesting a Hitlist listing.",
};

export function hitlistErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  for (const [revert, friendly] of Object.entries(REVERT_MESSAGES)) {
    if (lower.includes(revert)) return friendly;
  }
  if (/rejected|denied|cancelled|canceled/.test(lower)) return "Transaction cancelled in your wallet.";
  if (/insufficient.*cash|balance too low|not enough.*cash/.test(lower)) {
    return "You do not have enough in-game cash for this reward.";
  }
  return "Could not complete the Hitlist request. Please try again.";
}

export function resolveTargetAddress(
  input: string,
  profiles: readonly { name: string; address: `0x${string}` }[],
): `0x${string}` | null {
  const value = input.trim();
  if (isAddress(value)) return value;
  const match = profiles.find(
    (profile) => profile.name.trim().toLowerCase() === value.toLowerCase() && profile.address,
  );
  return match?.address ?? null;
}

export function profileNameForAddress(
  address: string,
  profiles: readonly { name: string; address: `0x${string}` }[],
): string | null {
  return (
    profiles.find((profile) => sameAddress(profile.address, address) && profile.name.trim())?.name.trim() ??
    null
  );
}

export function labelHitlistAddress(
  address: string,
  profiles: readonly { name: string; address: `0x${string}` }[],
): string {
  return profileNameForAddress(address, profiles) ?? formatWalletAddress(address);
}
