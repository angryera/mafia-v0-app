import { formatUnits, getAddress, isAddress, parseUnits, zeroAddress, type Abi } from "viem";

export const ZERO_ADDRESS = zeroAddress;
const ZERO = BigInt(0);
const HUNDRED = BigInt(100);
const ONE_ETHER = parseUnits("1", 18);

export const HOLDER_PAGE_SIZE = BigInt(200);
export const LISTING_LIMIT = BigInt(48);
export const DEPLOYMENT_LIMIT = BigInt(48);
export const PRICE_HISTORY_LIMIT = BigInt(365);

export type ProfileChain = "bnb" | "pulse";
export type SettlementAsset = "native" | "mafia";
export type OnChainListingStatus = "open" | "completed" | "cancelled";
export type DisplayStatus = "open" | "expired" | "completed" | "cancelled";
export type DeploymentPhase = "open" | "closed" | "pending";
export type OnChainDeploymentStatus = "live" | "coming-soon" | "closed";
export type AuctionFilter = DisplayStatus | "all";

export interface FtsNetwork {
  chainId: number;
  nativeSymbol: string;
  profileChain: ProfileChain;
  initialSupply: number;
  fts: `0x${string}`;
  market: `0x${string}`;
  subscription: `0x${string}`;
  mafia: `0x${string}`;
}

export interface FtsBid {
  bidder: `0x${string}`;
  amount: bigint;
  timestamp: number;
}

export interface FtsListing {
  id: number;
  seller: `0x${string}`;
  shareAmountWei: bigint;
  amount: number;
  assetType: SettlementAsset;
  listingToken: `0x${string}`;
  startAmountWei: bigint;
  startingTotal: number;
  highestBidWei: bigint;
  highestBid: number;
  highestBidder: `0x${string}` | null;
  bidCount: number;
  endTimestamp: number;
  onChainStatus: OnChainListingStatus;
  isYours: boolean;
}

export interface FtsDeployment {
  id: number;
  name: string;
  onChainStatus: OnChainDeploymentStatus;
  totalSubscribed: number;
  createdAt: number;
  closeAt: number;
  heldAmount: number;
  subscribed: boolean;
}

export interface PricePoint {
  timestamp: number;
  value: number;
}

export interface HolderRow {
  rank: number | null;
  address: `0x${string}`;
  balance: number;
}

export interface FtsSnapshot {
  chainId: number;
  loadedAccount: string | null;
  balanceWei: bigint;
  balance: number;
  totalSupply: number;
  listingsCount: number;
  bidIncreasePercent: number;
  feePercent: number;
  minSubscriptionWei: bigint;
  minSubscription: number;
  priceHistory: PricePoint[];
  listings: FtsListing[];
  deployments: FtsDeployment[];
  holders: HolderRow[];
}

export interface ProfileDirectory {
  byAddress: Record<string, string>;
  byName: Record<string, string>;
}

export const EMPTY_DIRECTORY: ProfileDirectory = { byAddress: {}, byName: {} };

const NETWORKS: Record<number, FtsNetwork> = {
  56: {
    chainId: 56,
    nativeSymbol: "BNB",
    profileChain: "bnb",
    initialSupply: 3286,
    fts: getAddress("0x4d0913F632CFd36750ff2045eA473CDA5a1889F1"),
    market: getAddress("0x165Db3Cab10541a274658f0b5928ee96b8A7F738"),
    subscription: getAddress("0x8ee3bB9a95Cf253FA5391CAc8bFd8e435875384e"),
    mafia: getAddress("0x3cb3F4f43D4Be61AA92BB4EEFfe7142A13bf4111"),
  },
  369: {
    chainId: 369,
    nativeSymbol: "PLS",
    profileChain: "pulse",
    initialSupply: 2943,
    fts: getAddress("0x2FA131c51E6c3567e994105192fbB4733b07D4CD"),
    market: getAddress("0x9023e2ec4Ac7790e3F86Dc22CCC97eC961C3B973"),
    subscription: getAddress("0x07c5f56C599D82292a1d8E6eb5e48034674EDe99"),
    mafia: getAddress("0xa27aDe5806Ded801b93499C6fA23cc8dC9AC55EA"),
  },
};

export function getFtsNetwork(chainId: number | undefined): FtsNetwork | null {
  if (chainId == null) return null;
  const network = NETWORKS[chainId];
  if (!network || network.fts.toLowerCase() === ZERO_ADDRESS) return null;
  return network;
}

export const FTS_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "holdersCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getHolders",
    stateMutability: "view",
    inputs: [
      { name: "start", type: "uint256" },
      { name: "length", type: "uint256" },
    ],
    outputs: [
      { name: "addrs", type: "address[]" },
      { name: "balances", type: "uint256[]" },
    ],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

const BID_COMPONENTS = [
  { name: "bidder", type: "address" },
  { name: "amount", type: "uint256" },
  { name: "timestamp", type: "uint256" },
] as const;

export const FTS_MARKET_ABI = [
  {
    type: "function",
    name: "listingsCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "bidIncreasePercent",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "feePercent",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "priceHistoryCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getPriceHistory",
    stateMutability: "view",
    inputs: [
      { name: "start", type: "uint256" },
      { name: "length", type: "uint256" },
    ],
    outputs: [
      { name: "dayIds", type: "uint256[]" },
      { name: "pricesUSD", type: "uint256[]" },
    ],
  },
  {
    type: "function",
    name: "getListing",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "seller", type: "address" },
          { name: "buyer", type: "address" },
          { name: "shareAmount", type: "uint256" },
          { name: "listingToken", type: "address" },
          { name: "startAmount", type: "uint256" },
          { name: "currentAmount", type: "uint256" },
          { name: "endTimestamp", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "bids", type: "tuple[]", components: BID_COMPONENTS },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "list",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shareAmount", type: "uint256" },
      { name: "listingToken", type: "address" },
      { name: "startAmount", type: "uint256" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "bid",
    stateMutability: "payable",
    inputs: [
      { name: "itemId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "itemId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "finish",
    stateMutability: "nonpayable",
    inputs: [{ name: "itemId", type: "uint256" }],
    outputs: [],
  },
] as const satisfies Abi;

const DEPLOYMENT_COMPONENTS = [
  { name: "name", type: "string" },
  { name: "status", type: "uint8" },
  { name: "totalSubscribed", type: "uint256" },
  { name: "createdAt", type: "uint256" },
  { name: "closeAt", type: "uint256" },
] as const;

export const FTS_SUBSCRIPTION_ABI = [
  {
    type: "function",
    name: "deploymentsCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getDeployments",
    stateMutability: "view",
    inputs: [
      { name: "start", type: "uint256" },
      { name: "length", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: DEPLOYMENT_COMPONENTS,
      },
    ],
  },
  {
    type: "function",
    name: "userSubscription",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "minSubscription",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "subscribe",
    stateMutability: "nonpayable",
    inputs: [
      { name: "deploymentId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const satisfies Abi;

export function fromWei(value: bigint): number {
  return Number(formatUnits(value, 18));
}

export function trimUnits(value: bigint): string {
  const text = formatUnits(value, 18);
  if (!text.includes(".")) return text;
  return text.replace(/0+$/, "").replace(/\.$/, "");
}

export function parseTokenInput(input: string): bigint | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (!cleaned) return null;
  try {
    return parseUnits(cleaned, 18);
  } catch {
    return null;
  }
}

export function formatFts(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function formatNativeAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function formatMafiaAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function assetSymbol(asset: SettlementAsset, nativeSymbol: string): string {
  return asset === "native" ? nativeSymbol : "MAFIA";
}

export function formatBidAmount(listing: FtsListing): string {
  const amount = currentBidAmount(listing);
  return listing.assetType === "mafia" ? formatMafiaAmount(amount) : formatNativeAmount(amount);
}

export function errorText(error: unknown): string {
  if (error && typeof error === "object") {
    const value = error as { shortMessage?: string; message?: string };
    const line = (value.shortMessage || value.message || "").split("\n")[0]?.trim();
    if (line) return line;
  }
  return "Transaction failed";
}

export function chartFractionDigits(values: number[]): number {
  const positive = values.filter((value) => value > 0 && Number.isFinite(value));
  if (positive.length === 0) return 2;
  const log = Math.log10(Math.min(...positive));
  if (!Number.isFinite(log)) return 2;
  return Math.min(8, Math.max(2, 2 - Math.floor(log)));
}

export function formatChartUsd(value: number, digits: number): string {
  const fractionDigits = Math.min(8, Math.max(2, digits));
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatUsdValue(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatSignificant(value: number, significant: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  const decimals = Math.max(0, significant - Math.floor(Math.log10(abs)) - 1);
  const text = value.toFixed(Math.min(decimals, 20));
  return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

/** Card USD-per-share. Zero stays "0"; missing callers should pass "—" themselves. */
export function formatUsdPerFts(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  if (Math.abs(value) >= 1) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return `$${formatSignificant(value, 4)}`;
}

export function formatChartDate(seconds: number): string {
  const date = new Date(seconds * 1000);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}.${day}`;
}

export function formatMediumDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function formatCountdown(endTimestamp: number, now: number): string {
  const remaining = endTimestamp - now;
  if (remaining <= 0) return "Ended";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function formatSupplyPercent(balance: number, totalSupply: number): string {
  if (!(totalSupply > 0) || !(balance > 0)) return "0% of supply";
  return `${((balance / totalSupply) * 100).toFixed(2)}% of supply`;
}

export function formatDeploymentShare(held: number, total: number): string {
  if (!(total > 0) || !(held > 0)) return "0% of deployment";
  const percent = (held / total) * 100;
  if (percent < 0.01) return "<0.01% of deployment";
  return `${percent.toFixed(2)}% of deployment`;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function timelinePercent(createdAt: number, closeAt: number, now: number): number {
  if (closeAt <= 0 || closeAt <= createdAt) return 0;
  return clampPercent(((now - createdAt) / (closeAt - createdAt)) * 100);
}

export const AUCTION_FILTERS: readonly { value: AuctionFilter; label: string; empty: string }[] = [
  { value: "open", label: "Open auctions", empty: "No open founder-share auctions right now." },
  { value: "expired", label: "Expired auctions", empty: "No expired founder-share auctions right now." },
  { value: "completed", label: "Completed auctions", empty: "No completed founder-share auctions yet." },
  { value: "cancelled", label: "Cancelled auctions", empty: "No cancelled founder-share auctions yet." },
  { value: "all", label: "All auctions", empty: "No founder-share auctions yet." },
];

export const DURATION_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
] as const;

const CHAIN_BADGES = [
  { match: "arbitrum", letter: "A" },
  { match: "base", letter: "B" },
  { match: "monad", letter: "M" },
  { match: "robinhood", letter: "R" },
] as const;

export function chainBadgeLetter(name: string): string | null {
  const lower = name.toLowerCase();
  return CHAIN_BADGES.find((badge) => lower.includes(badge.match))?.letter ?? null;
}

function readField(raw: unknown, name: string, index: number): unknown {
  if (!raw || typeof raw !== "object") {
    throw new Error("Unexpected contract result");
  }
  const record = raw as Record<string, unknown> & unknown[];
  if (record[name] !== undefined) return record[name];
  return record[index];
}

function asBigint(value: unknown): bigint {
  return BigInt(value as bigint | number | string);
}

function asAddress(value: unknown): `0x${string}` {
  return getAddress(String(value));
}

export function isNativeToken(address: string): boolean {
  return address.toLowerCase() === ZERO_ADDRESS;
}

function onChainListingStatus(status: number): OnChainListingStatus {
  if (status === 0) return "open";
  if (status === 1) return "completed";
  return "cancelled";
}

export function parseListing(raw: unknown, fallbackId: number, account?: string): FtsListing {
  const shareAmountWei = asBigint(readField(raw, "shareAmount", 3));
  const listingToken = asAddress(readField(raw, "listingToken", 4));
  const startAmountWei = asBigint(readField(raw, "startAmount", 5));
  const bidsRaw = readField(raw, "bids", 9);
  const bids = Array.isArray(bidsRaw)
    ? bidsRaw.map((bid) => ({
        bidder: asAddress(readField(bid, "bidder", 0)),
        amount: asBigint(readField(bid, "amount", 1)),
        timestamp: Number(readField(bid, "timestamp", 2)),
      }))
    : [];
  const last = bids.length > 0 ? bids[bids.length - 1] : null;
  const seller = asAddress(readField(raw, "seller", 1));
  const highestBidWei = last?.amount ?? ZERO;
  return {
    id: Number(readField(raw, "id", 0) ?? fallbackId),
    seller,
    shareAmountWei,
    amount: fromWei(shareAmountWei),
    assetType: isNativeToken(listingToken) ? "native" : "mafia",
    listingToken,
    startAmountWei,
    startingTotal: fromWei(startAmountWei),
    highestBidWei,
    highestBid: fromWei(highestBidWei),
    highestBidder: last?.bidder ?? null,
    bidCount: bids.length,
    endTimestamp: Number(readField(raw, "endTimestamp", 7)),
    onChainStatus: onChainListingStatus(Number(readField(raw, "status", 8))),
    isYours: !!account && seller.toLowerCase() === account.toLowerCase(),
  };
}

export function parsePriceHistory(raw: unknown): PricePoint[] {
  const dayIds = readField(raw, "dayIds", 0);
  const prices = readField(raw, "pricesUSD", 1);
  if (!Array.isArray(dayIds) || !Array.isArray(prices)) {
    throw new Error("Unexpected price history");
  }
  return dayIds.map((dayId, index) => ({
    timestamp: Number(dayId) * 86400,
    value: fromWei(asBigint(prices[index] ?? 0)),
  }));
}

export function parseDeployment(raw: unknown, id: number): FtsDeployment {
  const name = String(readField(raw, "name", 0) ?? "").trim();
  const status = Number(readField(raw, "status", 1));
  const totalSubscribed = fromWei(asBigint(readField(raw, "totalSubscribed", 2)));
  return {
    id,
    name: name || `Deployment ${id + 1}`,
    onChainStatus: status === 1 ? "live" : status === 0 ? "coming-soon" : "closed",
    totalSubscribed,
    createdAt: Number(readField(raw, "createdAt", 3) ?? 0),
    closeAt: Number(readField(raw, "closeAt", 4) ?? 0),
    heldAmount: 0,
    subscribed: false,
  };
}

export function parseHolderPage(raw: unknown): { address: `0x${string}`; balance: bigint }[] {
  const addrs = readField(raw, "addrs", 0);
  const balances = readField(raw, "balances", 1);
  if (!Array.isArray(addrs) || !Array.isArray(balances)) {
    throw new Error("Unexpected holder page");
  }
  return addrs.map((addr, index) => ({
    address: asAddress(addr),
    balance: asBigint(balances[index] ?? 0),
  }));
}

export function rankHolders(
  entries: { address: `0x${string}`; balance: bigint }[],
): HolderRow[] {
  const positive = entries.filter((entry) => entry.balance > ZERO);
  positive.sort((a, b) => {
    if (a.balance !== b.balance) return a.balance > b.balance ? -1 : 1;
    return a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1;
  });
  return positive.map((entry, index) => ({
    rank: index + 1,
    address: entry.address,
    balance: fromWei(entry.balance),
  }));
}

export function displayStatus(listing: FtsListing, now: number): DisplayStatus {
  if (listing.onChainStatus === "completed") return "completed";
  if (listing.onChainStatus === "cancelled") return "cancelled";
  if (listing.endTimestamp <= now) return "expired";
  return "open";
}

export function statusLine(listing: FtsListing, now: number, bidderName: string | null): string {
  const status = displayStatus(listing, now);
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "expired" && listing.bidCount > 0) return "Ready to settle";
  if (status === "expired") return "Expired";
  if (listing.isYours) return "Your listing";
  if (bidderName && listing.bidCount > 0) return `${bidderName} leads`;
  return "Open";
}

export function currentBidAmount(listing: FtsListing): number {
  return listing.bidCount > 0 ? listing.highestBid : listing.startingTotal;
}

export function usdPerFts(listing: FtsListing, assetPrice: number): string {
  if (listing.amount === 0 || !(assetPrice > 0)) return "—";
  return formatUsdPerFts((currentBidAmount(listing) / listing.amount) * assetPrice);
}

export function minimumBidWei(listing: FtsListing, bidIncreasePercent: number): bigint {
  const base = listing.highestBidWei > ZERO ? listing.highestBidWei : listing.startAmountWei;
  const percent = BigInt(Math.max(0, Math.trunc(bidIncreasePercent)));
  return (base * (HUNDRED + percent)) / HUNDRED;
}

export function deploymentPhase(deployment: FtsDeployment, now: number): DeploymentPhase {
  const deadlinePassed = deployment.closeAt > 0 && now >= deployment.closeAt;
  if (deadlinePassed || deployment.onChainStatus === "closed") return "closed";
  if (deployment.onChainStatus === "live") return "open";
  return "pending";
}

export function formatPerShare(total: bigint, shares: bigint): string | null {
  if (shares <= ZERO || total <= ZERO) return null;
  return trimUnits((total * ONE_ETHER) / shares);
}

export function defaultListShares(balanceWei: bigint): string {
  const ten = parseUnits("10", 18);
  return trimUnits(balanceWei < ten ? balanceWei : ten);
}

export function defaultSubscribeAmount(minWei: bigint, balanceWei: bigint): string {
  const one = parseUnits("1", 18);
  let amount = minWei > one ? minWei : one;
  if (amount > balanceWei) amount = balanceWei;
  if (amount < ZERO) amount = ZERO;
  return trimUnits(amount);
}

export function shareAmountError(amountWei: bigint | null, balanceWei: bigint, balanceLabel: string): string | null {
  if (amountWei == null || amountWei <= ZERO) return "Enter a share amount greater than zero.";
  if (amountWei > balanceWei) return `You only have ${balanceLabel} liquid FTS available.`;
  return null;
}

export function resolveRecipient(
  input: string,
  directory: ProfileDirectory,
): { address: `0x${string}`; name?: string } | null {
  const text = input.trim();
  if (!text) return null;
  if (isAddress(text, { strict: false })) {
    const address = getAddress(text);
    return { address, name: directory.byAddress[address.toLowerCase()] };
  }
  const found = directory.byName[text.toLowerCase()];
  if (found && isAddress(found, { strict: false })) {
    const address = getAddress(found);
    return { address, name: directory.byAddress[address.toLowerCase()] ?? text };
  }
  return null;
}

export interface AssetPrices {
  mafia: number;
  native: number;
}

export function parseSwapPrices(swapData: unknown, mafia: `0x${string}` | undefined): AssetPrices {
  if (!swapData || !mafia) return { mafia: 0, native: 0 };
  const result = swapData as readonly [
    readonly { tokenAddress?: `0x${string}` }[],
    readonly bigint[],
  ];
  const tokens = result?.[0];
  const prices = result?.[1];
  if (!tokens || !prices) return { mafia: 0, native: 0 };
  const priceAt = (index: number) => {
    const raw = prices[index];
    if (raw == null) return 0;
    const value = fromWei(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  const mafiaIndex = tokens.findIndex(
    (token) => token.tokenAddress?.toLowerCase() === mafia.toLowerCase(),
  );
  const nativeIndex = tokens.findIndex(
    (token) => !!token.tokenAddress && isNativeToken(token.tokenAddress),
  );
  return {
    mafia: mafiaIndex >= 0 ? priceAt(mafiaIndex) : 0,
    native: nativeIndex >= 0 ? priceAt(nativeIndex) : tokens.length > 0 ? priceAt(0) : 0,
  };
}

export interface FtsDerived {
  balanceWei: bigint;
  balance: number;
  totalSupply: number;
  burnedShares: number;
  listedShares: number;
  mySubscribed: number;
  totalSubscribed: number;
  myTotal: number;
  issued: number;
  subscribedSupply: number;
  circulating: number;
  latestPrice: number;
  myUsd: number | null;
  marketCap: number | null;
  priceHistory: PricePoint[];
  listings: FtsListing[];
  deployments: FtsDeployment[];
  holders: HolderRow[];
  userHolder: HolderRow | null;
  minSubscriptionWei: bigint;
  minSubscription: number;
  bidIncreasePercent: number;
  feePercent: number | null;
  listingsCount: number | null;
  liveDeployments: number;
}

export function deriveFts(
  snapshot: FtsSnapshot | null,
  address: string | undefined,
  chainId: number,
  initialSupply: number,
): FtsDerived {
  const empty: FtsDerived = {
    balanceWei: ZERO,
    balance: 0,
    totalSupply: 0,
    burnedShares: 0,
    listedShares: 0,
    mySubscribed: 0,
    totalSubscribed: 0,
    myTotal: 0,
    issued: 0,
    subscribedSupply: 0,
    circulating: 0,
    latestPrice: 0,
    myUsd: null,
    marketCap: null,
    priceHistory: [],
    listings: [],
    deployments: [],
    holders: [],
    userHolder: null,
    minSubscriptionWei: ZERO,
    minSubscription: 0,
    bidIncreasePercent: 5,
    feePercent: null,
    listingsCount: null,
    liveDeployments: 0,
  };
  if (!snapshot || snapshot.chainId !== chainId) return empty;

  const accountMatches =
    (snapshot.loadedAccount ?? "").toLowerCase() === (address ?? "").toLowerCase();
  const listings = snapshot.listings.map((listing) => ({
    ...listing,
    isYours: accountMatches && !!address && listing.seller.toLowerCase() === address.toLowerCase(),
  }));
  const deployments = snapshot.deployments.map((deployment) => {
    if (accountMatches) return deployment;
    return { ...deployment, heldAmount: 0, subscribed: false };
  });
  const balance = accountMatches ? snapshot.balance : 0;
  const balanceWei = accountMatches ? snapshot.balanceWei : ZERO;
  const listedShares = listings
    .filter((listing) => listing.isYours && listing.onChainStatus === "open")
    .reduce((sum, listing) => sum + listing.amount, 0);
  const mySubscribed = deployments.reduce((sum, deployment) => sum + deployment.heldAmount, 0);
  const totalSubscribed = deployments.reduce((sum, deployment) => sum + deployment.totalSubscribed, 0);
  const burnedShares = Math.max(0, initialSupply - snapshot.totalSupply);
  const issued = snapshot.totalSupply + burnedShares;
  const subscribedSupply = Math.min(snapshot.totalSupply, Math.max(0, totalSubscribed));
  const circulating = Math.max(0, snapshot.totalSupply - subscribedSupply);
  const latestPrice = snapshot.priceHistory.length
    ? snapshot.priceHistory[snapshot.priceHistory.length - 1].value
    : 0;
  const myTotal = balance + listedShares + mySubscribed;
  const userHolder = address
    ? snapshot.holders.find((holder) => holder.address.toLowerCase() === address.toLowerCase()) ?? {
        rank: null,
        address: getAddress(address),
        balance: 0,
      }
    : null;

  return {
    balanceWei,
    balance,
    totalSupply: snapshot.totalSupply,
    burnedShares,
    listedShares,
    mySubscribed,
    totalSubscribed,
    myTotal,
    issued,
    subscribedSupply,
    circulating,
    latestPrice,
    myUsd: latestPrice > 0 ? myTotal * latestPrice : null,
    marketCap: latestPrice > 0 ? circulating * latestPrice : null,
    priceHistory: snapshot.priceHistory,
    listings,
    deployments,
    holders: snapshot.holders,
    userHolder,
    minSubscriptionWei: snapshot.minSubscriptionWei,
    minSubscription: snapshot.minSubscription,
    bidIncreasePercent: snapshot.bidIncreasePercent,
    feePercent: snapshot.feePercent,
    listingsCount: snapshot.listingsCount,
    liveDeployments: deployments.filter((deployment) => deployment.onChainStatus === "live").length,
  };
}
