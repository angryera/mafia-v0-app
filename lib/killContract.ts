// ─────────────────────────────────────────────────────────────────────────────
// Kill initiation — data service layer
//
// This module is the SINGLE place where the Kill Initiation page reads/writes
// game data. Every function returns a promise so that a real smart-contract call
// is a drop-in replacement: keep the signature, swap the body where the TODOs
// are marked.
//
// Status of each contract today:
//   • Bullet balance      → DEPLOYED  (real read implemented below)
//   • Player profile/city → DEPLOYED  (real read implemented below)
//   • Attacker safehouse  → DEPLOYED  (real read via getUserInfo; attacker cannot
//                            initiate while protected)
//   • Detective hires      → DEPLOYED  (real read via getUserDetectiveHires)
//   • initiate kill (write)→ NOT DEPLOYED (mock — validates then resolves)
// ─────────────────────────────────────────────────────────────────────────────

import { formatEther, isAddress, type Abi } from "viem";
import {
  BULLET_ABI,
  DETECTIVE_AGENCY_ABI,
  SAFEHOUSE_ABI,
  USER_PROFILE_CONTRACT_ABI,
  TRAVEL_DESTINATIONS,
} from "@/lib/contract";
import "@/types/mafia-globals";

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
  if (cityId === null || cityId === undefined) return "another city";
  if (cityId < TRAVEL_DESTINATIONS.length) return TRAVEL_DESTINATIONS[cityId].label;
  return `City #${cityId}`;
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
  targetFoundDuration: bigint;
}): Promise<number | null> {
  const { publicClient, detectiveAgencyAddress, wallet, hire, targetFoundDuration } =
    params;
  if (!hire.isTargetRevealed) return null;

  try {
    const until = await publicClient.readContract({
      address: detectiveAgencyAddress,
      abi: DETECTIVE_AGENCY_ABI as Abi,
      functionName: "canKillUntil",
      args: [wallet, hire.target, hire.targetCityId],
    });
    return Number(until as bigint);
  } catch {
    const foundTime = Number(hire.startedAt) + Number(hire.targetNumber) * 60;
    return foundTime + Number(targetFoundDuration);
  }
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
// Mock fixtures (development only)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_TARGETS = {
  eligible: "0x1111111111111111111111111111111111111111" as `0x${string}`,
  wrongCity: "0x2222222222222222222222222222222222222222" as `0x${string}`,
  expired: "0x3333333333333333333333333333333333333333" as `0x${string}`,
  notLocated: "0x4444444444444444444444444444444444444444" as `0x${string}`,
};

// Known profiles that power the victim-name autocomplete. The mock targets are
// included so the eligibility scenarios are reachable by name in development.
const MOCK_PROFILES: KnownProfile[] = [
  { name: "Lucky Luciano", address: MOCK_TARGETS.eligible },
  { name: "Frank Costello", address: MOCK_TARGETS.wrongCity },
  { name: "Meyer Lansky", address: MOCK_TARGETS.expired },
  { name: "Bugsy Siegel", address: MOCK_TARGETS.notLocated },
  { name: "Al Capone", address: "0x5555555555555555555555555555555555555555" },
  { name: "Carlo Gambino", address: "0x6666666666666666666666666666666666666666" },
  { name: "Vito Genovese", address: "0x7777777777777777777777777777777777777777" },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const targetFoundDuration = (await publicClient.readContract({
    address: detectiveAgencyAddress,
    abi: DETECTIVE_AGENCY_ABI as Abi,
    functionName: "targetFoundDuration",
  })) as bigint;

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
      targetFoundDuration,
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
 * Returns the mock fixtures immediately and, when the MafiaProfile helper script
 * is available, merges in live on-chain profiles. Mock entries win on address
 * collisions so the development scenarios always resolve.
 */
export async function getKnownProfiles(params: {
  chain: string;
}): Promise<KnownProfile[]> {
  const byAddress = new Map<string, KnownProfile>();
  for (const p of MOCK_PROFILES) byAddress.set(p.address.toLowerCase(), p);

  // TODO(script/contract): this live merge is best-effort. Once a dedicated
  // name→address resolver contract exists, prefer it over the bulk script.
  if (typeof window !== "undefined" && window.MafiaProfile) {
    try {
      const users = await window.MafiaProfile.getUsersInfo({ chain: params.chain });
      for (const u of users as Array<{ name?: string; user?: string }>) {
        if (!u?.name || !u?.user || !isAddress(u.user)) continue;
        const key = u.user.toLowerCase();
        if (!byAddress.has(key)) {
          byAddress.set(key, { name: u.name, address: u.user as `0x${string}` });
        }
      }
    } catch {
      // Ignore — fall back to mock profiles only.
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

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildKillBattlePayload,
  type KillBattlePayload,
} from "@/lib/killOutcome";

/** When true, `initiateKill` builds a mock battle payload for the outcome page. */
export const MOCK_KILL_INITIATION_ENABLED = true;

/**
 * Initiate a kill against `targetAddress`, spending `bulletAmount` bullets.
 *
 * MOCK: the MafiaKill contract is not deployed yet. This validates inputs and
 * resolves after a short delay to simulate a pending → success tx. When
 * `MOCK_KILL_INITIATION_ENABLED` is true, returns a deterministic battle payload
 * for the kill-outcome page.
 *
 * TODO(contract): replace with a real wallet write + tx confirmation, e.g.
 *   const hash = await walletClient.writeContract({
 *     address: addresses.kill, abi: KILL_ABI,
 *     functionName: "initiateKill",
 *     args: [targetAddress, BigInt(bulletAmount), message, signature],
 *   });
 *   await publicClient.waitForTransactionReceipt({ hash });
 * then map KillSucceeded / KillFailed events into KillBattlePayload.
 */
export async function initiateKill(params: {
  targetAddress: `0x${string}`;
  bulletAmount: number;
  attackerAddress: `0x${string}`;
  attackerName: string;
  victimName: string;
  cityName: string;
}): Promise<KillBattlePayload | void> {
  const {
    targetAddress,
    bulletAmount,
    attackerAddress,
    attackerName,
    victimName,
    cityName,
  } = params;
  if (!isAddress(targetAddress)) {
    throw new Error("Invalid target address");
  }
  if (!Number.isFinite(bulletAmount) || bulletAmount < 1) {
    throw new Error("Invalid bullet amount");
  }
  await delay(900);

  if (!MOCK_KILL_INITIATION_ENABLED) {
    return;
  }

  return buildKillBattlePayload({
    attacker: { name: attackerName, address: attackerAddress },
    victim: { name: victimName, address: targetAddress },
    bulletsFired: bulletAmount,
    cityName,
    txHash: `0x${"ab".repeat(32)}`,
  });
}
