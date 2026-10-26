import {
  formatUnits,
  isAddress,
  parseEventLogs,
  zeroAddress,
  type Abi,
  type TransactionReceipt,
} from "viem";

const ZERO = BigInt(0);

function tenTo(decimals: number): bigint {
  let scale = BigInt(1);
  for (let index = 0; index < decimals; index += 1) scale *= BigInt(10);
  return scale;
}

const PROFILE_READ_ABI = [
  {
    type: "function",
    name: "hasProfile",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isTakenName",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isValidUserName",
    stateMutability: "view",
    inputs: [{ name: "s", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const SWAP_TOKENS_ABI = [
  {
    type: "function",
    name: "getSwapTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "name", type: "string" },
          { name: "decimal", type: "uint8" },
          { name: "tokenAddress", type: "address" },
          { name: "price", type: "uint256" },
          { name: "isStable", type: "bool" },
          { name: "isEnabled", type: "bool" },
        ],
      },
      { name: "", type: "uint256[]" },
    ],
  },
] as const;

export const PAID_TIER_IDS = ["common", "rare", "mythic"] as const;

export type PaidTierId = (typeof PAID_TIER_IDS)[number];
export type ProfileTierId = "free" | PaidTierId;

export const REWARD_KEYS = [
  "rank",
  "killSkill",
  "bustOutSkill",
  "raceSkill",
  "cash",
  "bullets",
  "health",
] as const;

export type RewardKey = (typeof REWARD_KEYS)[number];

export const REWARD_LABELS: Record<RewardKey, string> = {
  rank: "Rank",
  killSkill: "Kill skill",
  bustOutSkill: "Bust-out skill",
  raceSkill: "Race skill",
  cash: "Cash",
  bullets: "Bullets",
  health: "Health",
};

export const REWARD_APPLICATION: Record<RewardKey, "replace" | "add"> = {
  rank: "replace",
  killSkill: "replace",
  bustOutSkill: "replace",
  raceSkill: "replace",
  cash: "add",
  bullets: "add",
  health: "add",
};

/** Display rank 0 through 29. Bucket bounds are one higher than these names. */
export const UNBOX_RANK_NAMES = [
  "Nobody",
  "Apprentice",
  "Pickpocket",
  "Cloak",
  "Thief",
  "Locksmith",
  "Runner",
  "Associate",
  "Dealer",
  "Fixer",
  "Collector",
  "Enforcer",
  "Prospect",
  "Lieutenant",
  "Soldier",
  "Mobster",
  "Swindler",
  "Whisperer",
  "Architect",
  "Hitman",
  "Assassin",
  "Commander",
  "Executioner",
  "Widowmaker",
  "Bone collector",
  "Tactician",
  "Chief",
  "Warlord",
  "Capo bastone",
  "Godfather",
] as const;

const REWARD_SCALES = [1, 10_000, 5_000, 5_000, 1, 1, 1] as const;

export const MAX_PROFILE_NAME_LENGTH = 14;

export const PROFILE_CHECK_ERROR =
  "Could not check this wallet's profile on chain. Retry or reconnect your wallet.";
export const UNBOX_NETWORK_UNAVAILABLE =
  "Paid profile unboxing is not available on this network yet.";
export const UNBOX_LINK_MISMATCH =
  "The unboxing contract is linked to a different profile or payment router.";
export const UNBOX_QUOTE_MOVED =
  "The payment price moved more than 1%. Review the updated quote and try again.";
export const USER_REJECTED_REQUEST = "User rejected the request.";

export interface RewardRange {
  min: number;
  max: number;
}

export interface ProfileTier {
  id: ProfileTierId;
  label: string;
  /** Charged USD in 18-decimal units: raw `getTierPrices()` value divided by 1000. */
  priceUsdWei: bigint;
  rewards: Record<RewardKey, RewardRange>;
}

export interface UnboxPaymentToken {
  id: number;
  name: string;
  address: `0x${string}`;
  decimals: number;
  price: bigint;
}

export interface FreshSwapToken extends UnboxPaymentToken {
  enabled: boolean;
}

export interface PendingUnbox {
  tierId: PaidTierId;
  requestBlock: bigint;
  canOpen: boolean;
}

export interface ProfileUnboxResult {
  tierId: PaidTierId;
  transactionHash: string;
  rewards: Record<RewardKey, number>;
}

export interface ProfileSignupDraft {
  account: `0x${string}`;
  name: string;
  gender: 0 | 1;
  country: string;
  referrer: `0x${string}` | "";
}

const bucketComponents = [
  { name: "lo", type: "uint64" },
  { name: "hi", type: "uint64" },
  { name: "weight", type: "uint16" },
] as const;

const resultComponents = [
  { name: "rankLevel", type: "uint8" },
  { name: "rankXp", type: "uint256" },
  { name: "killSkillXp", type: "uint256" },
  { name: "bustOutXp", type: "uint256" },
  { name: "raceXp", type: "uint256" },
  { name: "cash", type: "uint256" },
  { name: "bullets", type: "uint256" },
  { name: "health", type: "uint256" },
] as const;

export const PROFILE_UNBOX_ABI = [
  {
    type: "function",
    name: "getTierPrices",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[3]" }],
  },
  {
    type: "function",
    name: "swapRouter",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "profile",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getBuckets",
    stateMutability: "view",
    inputs: [
      { name: "tier", type: "uint8" },
      { name: "attr", type: "uint8" },
    ],
    outputs: [{ name: "", type: "tuple[]", components: bucketComponents }],
  },
  {
    type: "function",
    name: "unboxRequests",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "isPending", type: "bool" },
      { name: "tier", type: "uint8" },
      { name: "requestBlock", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "canOpen",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "requestUnbox",
    stateMutability: "payable",
    inputs: [
      { name: "tier", type: "uint8" },
      { name: "swapTokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "createProfileAndUnbox",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "referrer", type: "address" },
      { name: "gender", type: "uint8" },
      { name: "country", type: "string" },
      { name: "imageId", type: "uint256" },
      { name: "tier", type: "uint8" },
      { name: "swapTokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "openUnbox",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "event",
    name: "Unboxed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "tier", type: "uint8", indexed: false },
      { name: "isFloor", type: "bool", indexed: false },
      { name: "result", type: "tuple", components: resultComponents, indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export const FREE_TIER: ProfileTier = {
  id: "free",
  label: "Free",
  priceUsdWei: ZERO,
  rewards: {
    rank: { min: 0, max: 0 },
    killSkill: { min: 0, max: 0 },
    bustOutSkill: { min: 0, max: 0 },
    raceSkill: { min: 0, max: 0 },
    cash: { min: 0, max: 0 },
    bullets: { min: 0, max: 0 },
    health: { min: 100, max: 100 },
  },
};

/** This app has no profile-tier palette, so these stand in for Free, Common, Rare, and Mythic. */
export const TIER_COLORS: Record<ProfileTierId, string> = {
  free: "#8d887c",
  common: "#c5ccd4",
  rare: "#6fbfb0",
  mythic: "#c984ff",
};

export function accentForeground(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#14120e" : "#f7f3ea";
}

export type ContractRead = (parameters: {
  address: `0x${string}`;
  abi: Abi | readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
}) => Promise<unknown>;

export function sameAddress(left?: string | null, right?: string | null): boolean {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

export function hasUnboxAddress(address?: string | null): address is `0x${string}` {
  return Boolean(address && isAddress(address) && !sameAddress(address, zeroAddress));
}

export function normalizeProfileName(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function validateProfileName(value: string): string {
  if (!value) return "Enter a character name.";
  if (!/^[A-Z][a-z]*$/.test(value)) return "Profile name must consist only of letters.";
  if (value.length > MAX_PROFILE_NAME_LENGTH) {
    return "Character name must have at most 14 letters.";
  }
  return "";
}

export function referralFromQuery(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  return isAddress(trimmed) ? trimmed : "";
}

export function referralFieldError(value: string, account?: string | null): string {
  if (!value) return "";
  if (!isAddress(value) || sameAddress(value, zeroAddress) || (account && sameAddress(value, account))) {
    return "Enter a valid referral code from another player.";
  }
  return "";
}

export function revertReason(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? "");
  const marked = text.match(/reason:\s*([^\n]+)/i);
  return (marked?.[1] ?? text).trim();
}

export async function profileNameError(
  read: ContractRead,
  profile: `0x${string}`,
  name: string,
): Promise<string> {
  const local = validateProfileName(name);
  if (local) return local;

  try {
    const taken = Boolean(await read({
      address: profile,
      abi: PROFILE_READ_ABI,
      functionName: "isTakenName",
      args: [name],
    }));
    if (taken) return "This profile name is already taken.";

    const valid = Boolean(await read({
      address: profile,
      abi: PROFILE_READ_ABI,
      functionName: "isValidUserName",
      args: [name],
    }));
    if (!valid) return "Profile name must consist only of letters.";
    return "";
  } catch (error) {
    const reason = revertReason(error).toLowerCase();
    if (reason.includes("name taken") || reason.includes("already taken")) {
      return "This profile name is already taken.";
    }
    if (reason.includes("too short")) return "Character name must have at least 3 letters.";
    if (reason.includes("too long")) return "Character name must have at most 14 letters.";
    if (reason.includes("empty")) return "Enter a character name.";
    if (/revert|not valid/i.test(reason)) return "Profile name must consist only of letters.";
    return "Could not check this name on chain. Try again.";
  }
}

export function chargedTierPrice(rawUsdWei: bigint): bigint {
  return rawUsdWei;
}

export function formatChargedUsd(wei: bigint): string {
  const raw = formatUnits(wei, 18);
  if (!raw.includes(".")) return raw;
  return raw.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "") || "0";
}

export function formatTierPrice(wei: bigint): string {
  return wei === ZERO ? "$0" : `$${formatChargedUsd(wei)}`;
}

export function formatReward(key: RewardKey, value: number): string {
  if (key === "rank") return UNBOX_RANK_NAMES[value] ?? "Unknown";
  if (key === "killSkill" || key === "bustOutSkill" || key === "raceSkill") return `${value}%`;
  return value.toLocaleString("en-US");
}

export function formatRewardRange(key: RewardKey, range: RewardRange): string {
  const min = formatReward(key, range.min);
  const max = formatReward(key, range.max);
  return `${min}–${max}`;
}

export function isRewardInTier(tier: ProfileTier, key: RewardKey, value: number): boolean {
  const { min, max } = tier.rewards[key];
  return Number.isFinite(value) && value >= min && value <= max;
}

export function isVerifiedResult(result: ProfileUnboxResult, tiers: readonly ProfileTier[]): boolean {
  if (!result.transactionHash) return false;
  const tier = tiers.find((item) => item.id === result.tierId);
  if (!tier) return false;
  return REWARD_KEYS.every((key) => isRewardInTier(tier, key, result.rewards[key]));
}

export function quoteUnboxPayment(
  chargedUsdWei: bigint,
  token: { decimals: number; price: bigint },
): bigint {
  if (token.price <= ZERO) throw new Error("The selected payment token has no price.");
  return chargedUsdWei * tenTo(token.decimals) / token.price;
}

export function bufferedUnboxPayment(amount: bigint): bigint {
  return amount + (amount + BigInt(99)) / BigInt(100);
}

export function paymentLabel(amount: bigint, token: { decimals: number; name: string }): string {
  const value = Number(formatUnits(amount, token.decimals));
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${token.name}`;
}

export class UnboxQuoteChangedError extends Error {
  constructor() {
    super(UNBOX_QUOTE_MOVED);
    this.name = "UnboxQuoteChangedError";
  }
}

export function bucketConfigError(tierLabel: string): string {
  return `${tierLabel} reward buckets are not configured on chain.`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function parseTierPrices(data: unknown): bigint[] {
  if (!Array.isArray(data) || data.length < 3) {
    throw new Error("Could not read profile tier prices.");
  }
  return [0, 1, 2].map((index) => BigInt(data[index] as bigint | number | string));
}

export function parseBuckets(data: unknown): Array<{ lo: bigint; hi: bigint }> {
  if (!Array.isArray(data)) return [];
  return data.map((bucket) => {
    if (Array.isArray(bucket)) {
      return { lo: BigInt(bucket[0] as bigint | number | string), hi: BigInt(bucket[1] as bigint | number | string) };
    }
    const row = asRecord(bucket);
    return {
      lo: BigInt((row?.lo ?? 0) as bigint | number | string),
      hi: BigInt((row?.hi ?? 0) as bigint | number | string),
    };
  });
}

export function rangeFromBuckets(
  buckets: ReadonlyArray<{ lo: bigint | number; hi: bigint | number }>,
  attribute: number,
): RewardRange {
  const bounds = buckets.flatMap((bucket) => [Number(bucket.lo), Number(bucket.hi)]);
  const scale = REWARD_SCALES[attribute] ?? 1;
  const adjustment = attribute === 0 ? -1 : 0;
  return {
    min: Math.min(...bounds) / scale + adjustment,
    max: Math.max(...bounds) / scale + adjustment,
  };
}

export function parseSwapTokenList(data: unknown): { all: FreshSwapToken[]; payable: UnboxPaymentToken[] } {
  if (!Array.isArray(data) || !Array.isArray(data[0]) || !Array.isArray(data[1])) {
    throw new Error("Could not read payment tokens.");
  }
  const prices = data[1] as readonly unknown[];
  const all: FreshSwapToken[] = (data[0] as readonly unknown[]).map((token, id) => {
    const row = asRecord(token);
    const tuple = Array.isArray(token) ? token : null;
    const decimals = Number(row?.decimal ?? tuple?.[1]);
    return {
      id,
      name: String(row?.name ?? tuple?.[0] ?? ""),
      address: String(row?.tokenAddress ?? tuple?.[2] ?? zeroAddress) as `0x${string}`,
      decimals,
      price: BigInt((prices[id] ?? 0) as bigint | number | string),
      enabled: Boolean(row?.isEnabled ?? (tuple ? tuple[5] : false)),
    };
  });
  const payable = all
    .filter((token) => token.enabled && token.price > ZERO && Number.isInteger(token.decimals) && token.decimals >= 0 && token.decimals <= 30)
    .map(({ enabled: _enabled, ...token }) => token);
  return { all, payable };
}

export function parseUnboxRequest(data: unknown): { isPending: boolean; tier: number; requestBlock: bigint } {
  if (Array.isArray(data)) {
    return {
      isPending: Boolean(data[0]),
      tier: Number(data[1]),
      requestBlock: BigInt((data[2] ?? 0) as bigint | number | string),
    };
  }
  const row = asRecord(data);
  return {
    isPending: Boolean(row?.isPending),
    tier: Number(row?.tier ?? 0),
    requestBlock: BigInt((row?.requestBlock ?? 0) as bigint | number | string),
  };
}

export function defaultTokenId(tokens: readonly UnboxPaymentToken[]): number | null {
  const native = tokens.find((token) => sameAddress(token.address, zeroAddress));
  return (native ?? tokens[0])?.id ?? null;
}

export function paidTierIndex(id: ProfileTierId): number {
  return PAID_TIER_IDS.indexOf(id as PaidTierId);
}

export function paidTierLabel(id: PaidTierId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export async function loadPaidUnboxOptions(
  read: ContractRead,
  config: { unbox: `0x${string}`; profile: `0x${string}`; swapRouter: `0x${string}` },
): Promise<{ tiers: ProfileTier[]; tokens: UnboxPaymentToken[] }> {
  const [profileAddress, routerAddress] = await Promise.all([
    read({ address: config.unbox, abi: PROFILE_UNBOX_ABI, functionName: "profile" }),
    read({ address: config.unbox, abi: PROFILE_UNBOX_ABI, functionName: "swapRouter" }),
  ]);
  if (!sameAddress(String(profileAddress), config.profile) || !sameAddress(String(routerAddress), config.swapRouter)) {
    throw new Error(UNBOX_LINK_MISMATCH);
  }

  const [priceData, swapData] = await Promise.all([
    read({ address: config.unbox, abi: PROFILE_UNBOX_ABI, functionName: "getTierPrices" }),
    read({ address: config.swapRouter, abi: SWAP_TOKENS_ABI, functionName: "getSwapTokens" }),
  ]);
  const prices = parseTierPrices(priceData);
  const tiers = await Promise.all(PAID_TIER_IDS.map(async (id, tierIndex) => {
    const label = paidTierLabel(id);
    const lists = await Promise.all(REWARD_KEYS.map((_, attribute) => read({
      address: config.unbox,
      abi: PROFILE_UNBOX_ABI,
      functionName: "getBuckets",
      args: [tierIndex, attribute],
    }).then(parseBuckets)));
    if (lists.some((list) => list.length === 0)) throw new Error(bucketConfigError(label));
    const rewards = Object.fromEntries(
      lists.map((list, attribute) => [REWARD_KEYS[attribute], rangeFromBuckets(list, attribute)]),
    ) as ProfileTier["rewards"];
    return {
      id,
      label,
      priceUsdWei: chargedTierPrice(prices[tierIndex] ?? ZERO),
      rewards,
    };
  }));
  return { tiers, tokens: parseSwapTokenList(swapData).payable };
}

export async function readFreshPayment(
  read: ContractRead,
  unbox: `0x${string}`,
  swapRouter: `0x${string}`,
): Promise<{ rawPrices: bigint[]; tokens: FreshSwapToken[] }> {
  const [priceData, swapData] = await Promise.all([
    read({ address: unbox, abi: PROFILE_UNBOX_ABI, functionName: "getTierPrices" }),
    read({ address: swapRouter, abi: SWAP_TOKENS_ABI, functionName: "getSwapTokens" }),
  ]);
  return { rawPrices: parseTierPrices(priceData), tokens: parseSwapTokenList(swapData).all };
}

export async function readPendingUnbox(
  read: ContractRead,
  unbox: `0x${string}`,
  account: `0x${string}`,
): Promise<PendingUnbox | null> {
  const request = parseUnboxRequest(await read({
    address: unbox,
    abi: PROFILE_UNBOX_ABI,
    functionName: "unboxRequests",
    args: [account],
  }));
  if (!request.isPending) return null;
  const tierId = PAID_TIER_IDS[request.tier];
  if (!tierId) throw new Error("The pending box has an unknown tier.");
  const canOpen = Boolean(await read({
    address: unbox,
    abi: PROFILE_UNBOX_ABI,
    functionName: "canOpen",
    args: [account],
  }));
  return { tierId, requestBlock: request.requestBlock, canOpen };
}

export async function readAccountUnboxState(
  read: ContractRead,
  profile: `0x${string}`,
  unbox: `0x${string}` | null,
  account: `0x${string}`,
): Promise<{ hasProfile: boolean; pending: PendingUnbox | null }> {
  const hasProfile = Boolean(await read({
    address: profile,
    abi: PROFILE_READ_ABI,
    functionName: "hasProfile",
    args: [account],
  }));
  const pending = unbox ? await readPendingUnbox(read, unbox, account) : null;
  return { hasProfile, pending };
}

export function assertFreshPayment(input: {
  rawPrices: readonly bigint[];
  tierIndex: number;
  previous: UnboxPaymentToken;
  freshTokens: readonly FreshSwapToken[];
  shownBuffer: bigint;
}): void {
  const fresh = input.freshTokens.find((token) => token.id === input.previous.id);
  if (
    !fresh?.enabled ||
    !sameAddress(fresh.address, input.previous.address) ||
    fresh.decimals !== input.previous.decimals
  ) {
    throw new Error("The payment token changed. Refresh the page before continuing.");
  }
  if (fresh.price <= ZERO) throw new Error("The payment token has no current price.");
  const raw = input.rawPrices[input.tierIndex];
  if (raw === undefined) throw new Error("Could not read profile tier prices.");
  const freshAmount = quoteUnboxPayment(chargedTierPrice(raw), fresh);
  if (freshAmount > input.shownBuffer) throw new UnboxQuoteChangedError();
}

export function rewardsFromUnboxResult(result: {
  rankLevel: bigint | number;
  killSkillXp: bigint | number;
  bustOutXp: bigint | number;
  raceXp: bigint | number;
  cash: bigint | number;
  bullets: bigint | number;
  health: bigint | number;
}): Record<RewardKey, number> {
  return {
    rank: Number(result.rankLevel) - 1,
    killSkill: Number(result.killSkillXp) / 10_000,
    bustOutSkill: Number(result.bustOutXp) / 5_000,
    raceSkill: Number(result.raceXp) / 5_000,
    cash: Number(formatUnits(BigInt(result.cash), 18)),
    bullets: Number(formatUnits(BigInt(result.bullets), 18)),
    health: Number(formatUnits(BigInt(result.health), 18)),
  };
}

function resultFields(value: unknown): {
  rankLevel: bigint | number;
  killSkillXp: bigint | number;
  bustOutXp: bigint | number;
  raceXp: bigint | number;
  cash: bigint | number;
  bullets: bigint | number;
  health: bigint | number;
} {
  if (Array.isArray(value)) {
    return {
      rankLevel: value[0] as bigint | number,
      killSkillXp: value[2] as bigint | number,
      bustOutXp: value[3] as bigint | number,
      raceXp: value[4] as bigint | number,
      cash: value[5] as bigint | number,
      bullets: value[6] as bigint | number,
      health: value[7] as bigint | number,
    };
  }
  const row = asRecord(value) ?? {};
  return {
    rankLevel: (row.rankLevel ?? 0) as bigint | number,
    killSkillXp: (row.killSkillXp ?? 0) as bigint | number,
    bustOutXp: (row.bustOutXp ?? 0) as bigint | number,
    raceXp: (row.raceXp ?? 0) as bigint | number,
    cash: (row.cash ?? 0) as bigint | number,
    bullets: (row.bullets ?? 0) as bigint | number,
    health: (row.health ?? 0) as bigint | number,
  };
}

export function decodeUnboxed(receipt: TransactionReceipt, account: string): ProfileUnboxResult {
  let logs: Array<{ args: { user?: string; tier?: number; result?: unknown } }>;
  try {
    logs = parseEventLogs({
      abi: PROFILE_UNBOX_ABI,
      eventName: "Unboxed",
      logs: receipt.logs,
    }) as typeof logs;
  } catch {
    throw new Error("The opening confirmed, but its reward event was not found. Refresh your profile.");
  }
  const event = logs[0];
  if (!event) {
    throw new Error("The opening confirmed, but its reward event was not found. Refresh your profile.");
  }
  const args = event.args;
  if (!sameAddress(String(args.user ?? ""), account)) {
    throw new Error("Reward event does not match this wallet.");
  }
  const tierId = PAID_TIER_IDS[Number(args.tier)];
  if (!tierId) throw new Error("Reward event has an unknown tier.");
  return {
    tierId,
    transactionHash: receipt.transactionHash,
    rewards: rewardsFromUnboxResult(resultFields(args.result)),
  };
}

export function isUserRejectedRequest(error: unknown): boolean {
  const parts: string[] = [];
  const visit = (value: unknown, depth: number) => {
    if (!value || depth > 5) return;
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (value instanceof Error) {
      parts.push(value.name, value.message);
      const extra = value as Error & { shortMessage?: string; details?: string; cause?: unknown };
      if (extra.shortMessage) parts.push(extra.shortMessage);
      if (extra.details) parts.push(extra.details);
      visit(extra.cause, depth + 1);
    }
  };
  visit(error, 0);
  const text = parts.join(" ").toLowerCase();
  return text.includes("user rejected") || text.includes("user denied") || text.includes("rejected the request");
}

export function actionErrorMessage(error: unknown, fallback: string): string {
  if (isUserRejectedRequest(error)) return USER_REJECTED_REQUEST;
  if (error instanceof Error) {
    const line = error.message.split("\n")[0]?.trim();
    if (line) return line;
  }
  return fallback;
}

export function unboxActionLabel(input: {
  pending: { canOpen: boolean } | null;
  requesting: boolean;
  opening: boolean;
  isFree: boolean;
}): string {
  if (input.pending) {
    if (input.opening) return "Opening…";
    return input.pending.canOpen ? "Open box" : "Waiting for blocks…";
  }
  if (input.requesting) return "Confirming…";
  return input.isFree ? "Create free profile" : "Request unbox";
}

export const SWEEP_CYCLES = 2;
export const MOTION_DURATION_MS = 3600;
export const REVEAL_INTERVAL_MS = MOTION_DURATION_MS + 350;

/** Two sweeps across the range, then a settle on the confirmed value. */
export function markerPositionAt(elapsedMs: number, stop: number): number {
  const progress = Math.min(Math.max(elapsedMs / MOTION_DURATION_MS, 0), 1);
  const eased = 1 - (1 - progress) ** 2;
  const loopDistance = SWEEP_CYCLES * 200;
  const distance = eased * (loopDistance + stop);
  if (distance >= loopDistance) return distance - loopDistance;
  const leg = Math.floor(distance / 100);
  const positionOnLeg = distance % 100;
  return leg % 2 === 0 ? positionOnLeg : 100 - positionOnLeg;
}

export function valueAtMarker(min: number, max: number, position: number): number {
  return min + Math.round(((max - min) * position) / 100);
}

const requestLock = { held: false };
const openLocks = new Set<string>();

export function claimRequestLock(): boolean {
  if (requestLock.held) return false;
  requestLock.held = true;
  return true;
}

export function releaseRequestLock(): void {
  requestLock.held = false;
}

export function openLockKey(account: string, requestBlock: bigint): string {
  return `${account.toLowerCase()}:${requestBlock.toString()}`;
}

export function claimOpenLock(key: string): boolean {
  if (openLocks.has(key)) return false;
  openLocks.add(key);
  return true;
}

export function releaseOpenLock(key: string): void {
  openLocks.delete(key);
}
