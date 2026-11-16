// ─────────────────────────────────────────────────────────────────────────────
// Kill contract bindings and profile/detective helpers shared by the kill flow.
// ─────────────────────────────────────────────────────────────────────────────

import { formatEther, isAddress, type Abi } from "viem";
import {
  BULLET_ABI,
  DETECTIVE_AGENCY_ABI,
  SAFEHOUSE_ABI,
  USER_PROFILE_CONTRACT_ABI,
} from "@/lib/contract";
import { getTravelCityName } from "@/lib/format";
import "@/types/mafia-globals";
export * from "@/lib/killChain";
export * from "@/lib/killLootService";

// Minimal shape of the viem/wagmi public client we rely on (readContract only).
type ReadClient = {
  readContract: (args: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
};

// ── City helper ──────────────────────────────────────────────────────────────
export function getCityName(cityId: number | null | undefined): string {
  if (cityId == null) return "another city";
  return getTravelCityName(cityId);
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface KnownProfile {
  name: string;
  address: `0x${string}`;
}

export interface PlayerCity {
  cityId: number;
  cityName: string;
  username: string;
}

export interface SafehouseStatus {
  inSafehouse: boolean;
  safeUntil: number; // unix seconds (0 when not protected)
}

/**
 * A detective hire as needed for kill eligibility. Mirrors the eventual contract
 * record but is intentionally trimmed to the fields the eligibility rule needs.
 */
export interface DetectiveHireRecord {
  target: string; // wallet address
  targetName?: string;
  /** Contract enum: 0 Pending, 1 Success, 2 Failed — or legacy string labels */
  status: "pending" | "searching" | "revealed" | "failed" | "success" | number;
  isTargetRevealed: boolean;
  targetCityId: number | null; // set once revealed
  canKillUntilTime: number | null; // unix seconds; null when not revealed
}

/** Matches `MafiaDetectiveAgency.DetectiveHireStatus` on-chain. */
export const DetectiveHireStatus = {
  Pending: 0,
  Success: 1,
  Failed: 2,
} as const;

type OnChainDetectiveHire = {
  cityId: number;
  target: `0x${string}`;
  user: string;
  requestBlock: bigint;
  detectiveCount: bigint;
  startedAt: bigint;
  targetNumber: bigint;
  totalCost: bigint;
  status: number;
  isTargetRevealed: boolean;
  targetCityId: number;
};

function mapDetectiveHireStatus(status: number): DetectiveHireRecord["status"] {
  switch (status) {
    case DetectiveHireStatus.Pending:
      return "pending";
    case DetectiveHireStatus.Success:
      return "success";
    case DetectiveHireStatus.Failed:
      return "failed";
    default:
      return status;
  }
}

/** A hire is kill-eligible only after the player reveals the target city on-chain. */
export function isDetectiveHireRevealed(h: DetectiveHireRecord): boolean {
  if (!h.isTargetRevealed) return false;
  if (h.targetCityId === null || h.targetCityId === undefined) return false;
  const { status } = h;
  if (typeof status === "number") {
    return status === DetectiveHireStatus.Success;
  }
  return status === "revealed" || status === "success";
}

async function resolveCanKillUntilTime(params: {
  publicClient: ReadClient;
  detectiveAgencyAddress: `0x${string}`;
  wallet: `0x${string}`;
  hire: OnChainDetectiveHire;
}): Promise<number | null> {
  const { publicClient, detectiveAgencyAddress, wallet, hire } =
    params;
  if (!hire.isTargetRevealed) return null;
  const until = await publicClient.readContract({
    address: detectiveAgencyAddress,
    abi: DETECTIVE_AGENCY_ABI as Abi,
    functionName: "canKillUntil",
    args: [wallet, hire.target, hire.targetCityId],
  });
  return Number(until as bigint);
}

export type KillBlockReason =
  | "eligible"
  | "checking"
  | "not_found"
  | "not_revealed"
  | "wrong_city"
  | "expired";

export interface KillEligibility {
  reason: KillBlockReason;
  targetCityId: number | null;
  targetCityName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Player's in-game bullet balance.
 *
 * REAL read against the deployed Bullets contract (`balanceOf`), which is
 * privacy-gated by the connected wallet's signed auth message — same args as
 * `exchange-bullet-action` and the header bullet balance chip.
 */
export async function getBulletBalance(params: {
  publicClient: ReadClient;
  bulletsAddress: `0x${string}`;
  wallet: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}): Promise<number> {
  const { publicClient, bulletsAddress, wallet, message, signature } = params;
  const raw = await publicClient.readContract({
    address: bulletsAddress,
    abi: BULLET_ABI as Abi,
    functionName: "balanceOf",
    args: [wallet, message, signature],
  });
  return Number(formatEther(raw as bigint));
}

/**
 * Player's profile (used for current city + own name for the self-target check).
 *
 * REAL read against the deployed UserProfile contract (`getUserProfile`), which
 * is privacy-gated by a signed message owned by the connected wallet.
 */
export async function getPlayerCity(params: {
  publicClient: ReadClient;
  userProfileAddress: `0x${string}`;
  wallet: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}): Promise<PlayerCity> {
  const { publicClient, userProfileAddress, wallet, message, signature } = params;
  const raw = await publicClient.readContract({
    address: userProfileAddress,
    abi: USER_PROFILE_CONTRACT_ABI as Abi,
    functionName: "getUserProfile",
    args: [wallet, message, signature],
  });
  const p = raw as { username: string; cityId: number };
  const cityId = Number(p.cityId);
  return { cityId, cityName: getCityName(cityId), username: p.username ?? "" };
}

/**
 * Connected player's (attacker) safehouse status.
 *
 * REAL read against Safehouse `getUserInfo` — privacy-gated by the attacker's
 * own signed auth message. Attackers cannot initiate a kill while protected.
 */
export async function getAttackerSafehouseStatus(params: {
  publicClient: ReadClient;
  safehouseAddress: `0x${string}`;
  wallet: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}): Promise<SafehouseStatus> {
  const { publicClient, safehouseAddress, wallet, message, signature } = params;
  const raw = await publicClient.readContract({
    address: safehouseAddress,
    abi: SAFEHOUSE_ABI as Abi,
    functionName: "getUserInfo",
    args: [wallet, message, signature],
  });
  const safeUntil = Number((raw as { safeUntil: bigint }).safeUntil);
  return {
    inSafehouse: safeUntil > Math.floor(Date.now() / 1000),
    safeUntil,
  };
}

/**
 * The connected player's detective hires (used to compute kill eligibility).
 *
 * REAL read: paginated `getUserDetectiveHires` on the Detective Agency contract,
 * matching `detective-agency-action.tsx`. Kill windows use `canKillUntil` when
 * the target has been revealed.
 */
export async function getUserDetectiveHires(params: {
  publicClient: ReadClient;
  detectiveAgencyAddress: `0x${string}`;
  wallet: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}): Promise<DetectiveHireRecord[]> {
  const {
    publicClient,
    detectiveAgencyAddress,
    wallet,
    message,
    signature,
  } = params;

  const pageSize = 20;
  let startIndex = 0;
  const onChainHires: OnChainDetectiveHire[] = [];

  while (true) {
    const result = await publicClient.readContract({
      address: detectiveAgencyAddress,
      abi: DETECTIVE_AGENCY_ABI as Abi,
      functionName: "getUserDetectiveHires",
      args: [wallet, startIndex, pageSize, message, signature],
    });

    const [hireIds, list] = result as [readonly number[], readonly OnChainDetectiveHire[]];
    if (!hireIds?.length) break;

    for (let i = 0; i < hireIds.length; i++) {
      onChainHires.push(list[i]);
    }

    if (hireIds.length < pageSize) break;
    startIndex += pageSize;
  }

  const records: DetectiveHireRecord[] = [];
  for (const hire of onChainHires) {
    const canKillUntilTime = await resolveCanKillUntilTime({
      publicClient,
      detectiveAgencyAddress,
      wallet,
      hire,
    });

    records.push({
      target: hire.target,
      status: mapDetectiveHireStatus(hire.status),
      isTargetRevealed: hire.isTargetRevealed,
      targetCityId: hire.isTargetRevealed ? hire.targetCityId : null,
      canKillUntilTime,
    });
  }

  return records;
}

/**
 * Known profiles for the victim-name autocomplete.
 *
 * Uses the app's contract-backed MafiaProfile helper. No preview profiles are
 * returned if the script or its RPC request fails.
 */
export async function getKnownProfiles(params: {
  chain: string;
}): Promise<KnownProfile[]> {
  if (typeof window === "undefined" || !window.MafiaProfile) {
    throw new Error("MafiaProfile is unavailable");
  }
  const byAddress = new Map<string, KnownProfile>();
  const users = await window.MafiaProfile.getUsersInfo({ chain: params.chain });
  for (const u of users as Array<{ name?: string; user?: string }>) {
    if (!u?.name || !u?.user || !isAddress(u.user)) continue;
    const key = u.user.toLowerCase();
    if (!byAddress.has(key)) {
      byAddress.set(key, { name: u.name, address: u.user as `0x${string}` });
    }
  }
  return Array.from(byAddress.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Eligibility (pure logic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute whether the player may attack `target`, from their detective hires.
 * See the page spec for the exact algorithm.
 */
export function computeKillEligibility(params: {
  hires: DetectiveHireRecord[];
  targetAddress: string | null;
  targetName: string | null;
  playerCityId: number | null;
  now: number; // unix seconds
}): KillEligibility {
  const { hires, targetAddress, targetName, playerCityId, now } = params;

  const addr = targetAddress?.toLowerCase() ?? null;
  const name = targetName?.toLowerCase() ?? null;

  // 1) Hires that match the entered target by address OR name.
  const matching = hires.filter((h) => {
    const hireAddr = h.target.toLowerCase();
    const byAddr = addr !== null && hireAddr === addr;
    const byName =
      name !== null &&
      (h.targetName?.toLowerCase() ?? "") === name;
    return byAddr || byName;
  });

  // 2) Keep only hires where the target city was revealed on-chain.
  const revealed = matching.filter(isDetectiveHireRevealed);
  if (revealed.length === 0) {
    const awaitingReveal = matching.some((h) => {
      const succeeded =
        typeof h.status === "number"
          ? h.status === DetectiveHireStatus.Success
          : h.status === "success";
      return succeeded && !h.isTargetRevealed;
    });
    if (awaitingReveal) {
      return { reason: "not_revealed", targetCityId: null, targetCityName: null };
    }
    return { reason: "not_found", targetCityId: null, targetCityName: null };
  }

  // 3) Of those, keep ones whose kill window is still active.
  const active = revealed.filter(
    (h) => h.canKillUntilTime == null || now <= h.canKillUntilTime,
  );
  if (active.length === 0) {
    return { reason: "expired", targetCityId: null, targetCityName: null };
  }

  // 4) Take the active revealed hire and compare cities.
  const hire = active[0];
  const cityId = hire.targetCityId as number;
  if (playerCityId === null || cityId !== playerCityId) {
    return {
      reason: "wrong_city",
      targetCityId: cityId,
      targetCityName: getCityName(cityId),
    };
  }

  // 5) Same city → eligible.
  return { reason: "eligible", targetCityId: cityId, targetCityName: getCityName(cityId) };
}

/** Human-readable message for a blocking eligibility reason. */
export function getEligibilityMessage(
  reason: KillBlockReason,
  cityName: string | null,
): string {
  const city = cityName ?? "another city";
  switch (reason) {
    case "not_found":
      return "This target has not been located. Hire detectives at the Detective Agency, wait for them to find the target, then reveal their location before initiating a kill.";
    case "not_revealed":
      return "Detectives found this target, but their city has not been revealed yet. Return to the Detective Agency and reveal the location before initiating a kill.";
    case "wrong_city":
      return `Your target is in ${city}. Travel to the same city before initiating a kill.`;
    case "expired":
      return "Your window to kill this target has expired. Hire detectives again to relocate them.";
    default:
      return "";
  }
}
