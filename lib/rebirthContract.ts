// ─────────────────────────────────────────────────────────────────────────────
// Rebirth — data service layer
//
// Reads/writes MafiaRebirth. Option labels stay hardcoded; costs and enabled
// flags come from chain via quoteRebirth / getRebirthOption.
// ─────────────────────────────────────────────────────────────────────────────

import type { Abi } from "viem";
import { formatUnits } from "viem";
import { MAFIA_FAMILY_ABI, RANK_ABI, REBIRTH_ABI } from "@/lib/constants/abi";

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

/** Extra headroom on token send/approve to cover price drift (legacy parity). */
export const REBIRTH_PAYMENT_BUFFER = 1.05;

/** Max USD delta allowed between on-chain quote and client formula. */
export const REBIRTH_COST_TOLERANCE_USD = 1;

type ReadClient = {
  readContract: (args: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
};

export function isRebirthContractConfigured(
  address: `0x${string}` | undefined,
): boolean {
  return Boolean(address && address.toLowerCase() !== ZERO_ADDRESS);
}

// ── Cost calculation (client-side validation) ────────────────────────────────

/** Clamp rank index to 0–29 (Nobody … Godfather). */
export function clampRankIndex(rankIndex: number): number {
  return Math.min(29, Math.max(0, Math.floor(rankIndex)));
}

/**
 * Convert on-chain rank level (1-based: 1 = Nobody … 30 = Godfather) to a
 * 0-based rank index used for rebirth pricing.
 */
export function rankLevelToIndex(rankLevel: number): number {
  return clampRankIndex(Math.floor(rankLevel) - 1);
}

/**
 * Base USD cost for option 1 (Light) at the given 1-based rank level.
 * Mirrors MafiaRebirth: baseCostUsd + (level - 1) * costIncrementUsd (50 + (L-1)*15).
 */
export function getRebirthBaseCostUsdFromLevel(rankLevel: number): number {
  const level = Math.max(1, Math.min(30, Math.floor(rankLevel)));
  return 50 + (level - 1) * 15;
}

/**
 * Base USD cost for option 1 at 0-based rank index (Nobody = 0 … Godfather = 29).
 */
export function getRebirthBaseCostUsd(rankIndex: number): number {
  return getRebirthBaseCostUsdFromLevel(clampRankIndex(rankIndex) + 1);
}

export type RebirthCostMultiplier = 1 | 1.5 | 2;

const COST_RATIO_BPS: Record<RebirthCostMultiplier, number> = {
  1: 10000,
  1.5: 15000,
  2: 20000,
};

/** Apply option costRatioBps with integer division (same as the contract). */
export function getOptionCostUsd(
  baseCostUsd: number,
  multiplier: RebirthCostMultiplier,
): number {
  const bps = COST_RATIO_BPS[multiplier];
  return Math.floor((baseCostUsd * bps) / 10000);
}

export function getExpectedOptionCostUsd(
  rankLevel: number,
  optionId: 0 | 1 | 2,
): number {
  const option = REBIRTH_OPTIONS.find((o) => o.id === optionId);
  if (!option) {
    throw new Error("Invalid rebirth option");
  }
  return getOptionCostUsd(
    getRebirthBaseCostUsdFromLevel(rankLevel),
    option.multiplier,
  );
}

export function validateRebirthUsdCost(
  onChainUsdCost: number,
  rankLevel: number,
  optionId: 0 | 1 | 2,
): boolean {
  const expected = getExpectedOptionCostUsd(rankLevel, optionId);
  const quoted = Math.round(onChainUsdCost);
  return Math.abs(quoted - expected) <= REBIRTH_COST_TOLERANCE_USD;
}

// ── Rebirth options (UI labels only) ─────────────────────────────────────────

export type RebirthRewardKind =
  | "xp"
  | "kill-xp"
  | "cash"
  | "bullets"
  | "helper-credits"
  | "helper-credit-mint"
  | "premium"
  | "bodyguard-sam"
  | "bodyguard-frank";

export interface RebirthReward {
  kind: RebirthRewardKind;
  label: string;
  value: string;
  highlight?: boolean;
}

export interface RebirthOption {
  id: 0 | 1 | 2;
  name: string;
  subtitle: string;
  description: string;
  multiplier: RebirthCostMultiplier;
  rewards: RebirthReward[];
}

export const REBIRTH_OPTIONS: readonly RebirthOption[] = [
  {
    id: 0,
    name: "Light Rebirth",
    subtitle: "XP only",
    description:
      "Cheapest comeback with a small cash and bullet boost. No asset mints.",
    multiplier: 1,
    rewards: [
      { kind: "xp", label: "XP returned", value: "70%", highlight: true },
      { kind: "cash", label: "Cash", value: "1,000,000" },
      { kind: "bullets", label: "Bullets", value: "10,000" },
      { kind: "kill-xp", label: "Kill XP returned", value: "20%" },
    ],
  },
  {
    id: 1,
    name: "Medium Rebirth",
    subtitle: "XP + Assets",
    description:
      "Balanced recovery with extra assets and a bodyguard mint.",
    multiplier: 1.5,
    rewards: [
      { kind: "xp", label: "XP returned", value: "80%", highlight: true },
      { kind: "helper-credits", label: "Helper credits", value: "500" },
      { kind: "cash", label: "Cash", value: "2,500,000" },
      { kind: "bullets", label: "Bullets", value: "100,000" },
      { kind: "bodyguard-sam", label: "Bodyguard", value: "Sam Level 3" },
      { kind: "kill-xp", label: "Kill XP returned", value: "40%" },
    ],
  },
  {
    id: 2,
    name: "Max Rebirth",
    subtitle: "Full comeback",
    description:
      "Maximum XP plus premium, top bodyguard, and the largest bundle.",
    multiplier: 2,
    rewards: [
      { kind: "xp", label: "XP returned", value: "90%", highlight: true },
      {
        kind: "helper-credit-mint",
        label: "Helper credit mint",
        value: "1,000",
      },
      { kind: "cash", label: "Cash", value: "5,000,000" },
      { kind: "premium", label: "Premium subscription", value: "1 Month" },
      { kind: "bullets", label: "Bullets", value: "250,000" },
      {
        kind: "bodyguard-frank",
        label: "Bodyguard",
        value: "Frank Level 5",
      },
      { kind: "kill-xp", label: "Kill XP returned", value: "60%" },
    ],
  },
] as const;

export const CDN_IMAGE_BASE =
  "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/";

// ── Player status read ───────────────────────────────────────────────────────

export interface RebirthPlayerStatus {
  isDead: boolean;
  rankLevel: number;
  rankIndex: number;
  baseCostUsd: number;
}

type PlayerInfoTuple = {
  familyId: bigint;
  level: number;
  isDead: boolean;
};

export async function getRebirthPlayerStatus(params: {
  publicClient: ReadClient;
  mafiaFamilyAddress: `0x${string}`;
  rankXpAddress: `0x${string}`;
  wallet: `0x${string}`;
}): Promise<RebirthPlayerStatus> {
  const { publicClient, mafiaFamilyAddress, rankXpAddress, wallet } = params;

  const [playerInfoRaw, rankLevelRaw] = await Promise.all([
    publicClient.readContract({
      address: mafiaFamilyAddress,
      abi: MAFIA_FAMILY_ABI as Abi,
      functionName: "getPlayerInfo",
      args: [wallet],
    }),
    publicClient.readContract({
      address: rankXpAddress,
      abi: RANK_ABI as Abi,
      functionName: "getRankLevel",
      args: [wallet],
    }),
  ]);

  const playerInfo = playerInfoRaw as PlayerInfoTuple;
  const rankLevel = Number(rankLevelRaw ?? 1);
  const rankIndex = rankLevelToIndex(rankLevel);

  return {
    isDead: Boolean(playerInfo?.isDead) || true,
    rankLevel,
    rankIndex,
    baseCostUsd: getRebirthBaseCostUsdFromLevel(rankLevel),
  };
}

// ── On-chain reads ───────────────────────────────────────────────────────────

export interface RebirthOptionState {
  optionId: 0 | 1 | 2;
  enabled: boolean;
  usdCost: number;
}

export interface RebirthPaymentQuote {
  usdCost: number;
  inputToken: `0x${string}`;
  inputAmount: bigint;
}

export async function fetchRebirthOptionState(params: {
  publicClient: ReadClient;
  rebirthAddress: `0x${string}`;
  optionId: 0 | 1 | 2;
}): Promise<{ enabled: boolean }> {
  const { publicClient, rebirthAddress, optionId } = params;
  const result = await publicClient.readContract({
    address: rebirthAddress,
    abi: REBIRTH_ABI as Abi,
    functionName: "getRebirthOption",
    args: [BigInt(optionId)],
  });

  const option = result as { enabled: boolean };
  return { enabled: Boolean(option?.enabled) };
}

export async function quoteRebirthPayment(params: {
  publicClient: ReadClient;
  rebirthAddress: `0x${string}`;
  wallet: `0x${string}`;
  optionId: 0 | 1 | 2;
  swapTokenId: number;
}): Promise<RebirthPaymentQuote> {
  const { publicClient, rebirthAddress, wallet, optionId, swapTokenId } =
    params;

  const result = await publicClient.readContract({
    address: rebirthAddress,
    abi: REBIRTH_ABI as Abi,
    functionName: "quoteRebirth",
    args: [wallet, BigInt(optionId), BigInt(swapTokenId)],
  });

  const [usdCostRaw, inputToken, inputAmount] = result as readonly [
    bigint,
    `0x${string}`,
    bigint,
  ];

  return {
    usdCost: Number(formatUnits(usdCostRaw, 18)),
    inputToken,
    inputAmount,
  };
}

export async function fetchRebirthOptionQuotes(params: {
  publicClient: ReadClient;
  rebirthAddress: `0x${string}`;
  wallet: `0x${string}`;
  stableSwapTokenId: number;
}): Promise<RebirthOptionState[]> {
  const {
    publicClient,
    rebirthAddress,
    wallet,
    stableSwapTokenId,
  } = params;

  const countRaw = await publicClient.readContract({
    address: rebirthAddress,
    abi: REBIRTH_ABI as Abi,
    functionName: "getRebirthOptionsCount",
  });
  const optionsCount = Number(countRaw ?? 0);

  return Promise.all(
    REBIRTH_OPTIONS.map(async (option) => {
      if (option.id >= optionsCount) {
        return { optionId: option.id, enabled: false, usdCost: 0 };
      }

      const [optionState, quote] = await Promise.all([
        fetchRebirthOptionState({
          publicClient,
          rebirthAddress,
          optionId: option.id,
        }),
        quoteRebirthPayment({
          publicClient,
          rebirthAddress,
          wallet,
          optionId: option.id,
          swapTokenId: stableSwapTokenId,
        }),
      ]);

      return {
        optionId: option.id,
        enabled: optionState.enabled,
        usdCost: Math.round(quote.usdCost),
      };
    }),
  );
}

export type SwapTokenInfo = {
  name: string;
  tokenAddress: `0x${string}`;
  isStable: boolean;
  isEnabled: boolean;
  decimal: number;
  tokenId: number;
  formattedPrice: number;
};

export function parseSwapTokens(
  swapData: unknown,
): SwapTokenInfo[] {
  if (!swapData) return [];

  const result = swapData as unknown as readonly [
    readonly {
      name: string;
      decimal: number;
      tokenAddress: `0x${string}`;
      price: bigint;
      isStable: boolean;
      isEnabled: boolean;
    }[],
    readonly bigint[],
  ];

  if (!result[0] || !result[1]) return [];

  return result[0].map((token, index) => ({
    name: token.name,
    tokenAddress: token.tokenAddress,
    isStable: token.isStable,
    isEnabled: token.isEnabled,
    decimal: Number(token.decimal),
    tokenId: index,
    formattedPrice: Number(formatUnits(result[1][index], 18)),
  }));
}

export function findStableSwapTokenId(tokens: SwapTokenInfo[]): number | null {
  return tokens.find((token) => token.isStable && token.isEnabled)?.tokenId ?? null;
}
