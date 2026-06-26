// ─────────────────────────────────────────────────────────────────────────────
// Rebirth — data service layer
//
// Single place where the Rebirth page reads/writes game data. Every function
// returns a promise so a real smart-contract call is a drop-in replacement:
// keep the signature, swap the body where the TODOs are marked.
//
// Status of each contract today:
//   • Player isDead         → DEPLOYED  (MafiaFamily.getPlayerInfo)
//   • Player rank level     → DEPLOYED  (RankXp.getRankLevel)
//   • confirm rebirth (write)→ NOT DEPLOYED (mock — validates then resolves)
// ─────────────────────────────────────────────────────────────────────────────

import type { Abi } from "viem";
import { MAFIA_FAMILY_ABI, RANK_ABI } from "@/lib/constants/abi";

type ReadClient = {
  readContract: (args: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
};

// ── Cost calculation ─────────────────────────────────────────────────────────

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
 * Base USD cost for Option 1 (Light) at the given 0-based rank index.
 * Formula: 50 + (clamp(rankIndex - 1, 0, 29)) × 15
 */
export function getRebirthBaseCostUsd(rankIndex: number): number {
  const idx = clampRankIndex(rankIndex);
  const rankStep = Math.min(29, Math.max(0, idx - 1));
  return 50 + rankStep * 15;
}

export type RebirthCostMultiplier = 1 | 1.5 | 2;

export function getOptionCostUsd(
  baseCostUsd: number,
  multiplier: RebirthCostMultiplier,
): number {
  if (multiplier === 1.5) return Math.round(baseCostUsd * 1.5);
  return baseCostUsd * multiplier;
}

// ── Rebirth options ──────────────────────────────────────────────────────────

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
    isDead: Boolean(playerInfo?.isDead),
    rankLevel,
    rankIndex,
    baseCostUsd: getRebirthBaseCostUsd(rankIndex),
  };
}

// ── Rebirth write (mock) ─────────────────────────────────────────────────────

export interface ConfirmRebirthParams {
  account: `0x${string}`;
  optionId: 0 | 1 | 2;
  costUsd: number;
  rankIndex: number;
}

export interface ConfirmRebirthResult {
  success: true;
  /** Placeholder tx hash until the contract is deployed. */
  txHash: `0x${string}`;
}

const MOCK_TX_DELAY_MS = 1200;

/**
 * Mock rebirth confirmation. Validates inputs, simulates on-chain latency, then
 * resolves. Swap the body for a real `writeContract` + receipt wait when the
 * rebirth contract is deployed.
 */
export async function confirmRebirth(
  params: ConfirmRebirthParams,
): Promise<ConfirmRebirthResult> {
  const { account, optionId, costUsd, rankIndex } = params;

  if (!account) {
    throw new Error("Wallet not connected");
  }

  const option = REBIRTH_OPTIONS.find((o) => o.id === optionId);
  if (!option) {
    throw new Error("Invalid rebirth option");
  }

  const expectedCost = getOptionCostUsd(
    getRebirthBaseCostUsd(rankIndex),
    option.multiplier,
  );
  if (costUsd !== expectedCost) {
    throw new Error("Rebirth cost mismatch");
  }

  // TODO: Replace with on-chain write once the rebirth contract is deployed.
  // Example:
  //   const hash = await walletClient.writeContract({
  //     address: rebirthContractAddress,
  //     abi: REBIRTH_ABI,
  //     functionName: "rebirth",
  //     args: [optionId],
  //     value: parseEther(usdToNative(costUsd)),
  //   });
  //   await publicClient.waitForTransactionReceipt({ hash });
  //   return { success: true, txHash: hash };

  await new Promise((resolve) => setTimeout(resolve, MOCK_TX_DELAY_MS));

  const mockHash =
    `0x${"0".repeat(64)}` as `0x${string}`;

  return { success: true, txHash: mockHash };
}
