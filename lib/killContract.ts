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
//   • Target safehouse    → NOT WIRED (mock — see TODO; reading another player's
//                            privacy-gated status is not possible with the current
//                            signed-message ABI, so this is mocked for now)
//   • Detective hires      → MOCK for development (see TODO for the real read)
//   • initiate kill (write)→ NOT DEPLOYED (mock — validates then resolves)
// ─────────────────────────────────────────────────────────────────────────────

import { formatEther, isAddress, type Abi } from "viem";
import {
  BULLET_ABI,
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
  status: "pending" | "searching" | "revealed" | "failed" | string;
  isTargetRevealed: boolean;
  targetCityId: number | null; // set once revealed
  canKillUntilTime: number | null; // unix seconds; null/unknown ⇒ treated as active
}

export type KillBlockReason =
  | "eligible"
  | "checking"
  | "not_found"
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
  safehouse: "0x5555555555555555555555555555555555555555" as `0x${string}`,
};

// Known profiles that power the victim-name autocomplete. The mock targets are
// included so the eligibility scenarios are reachable by name in development.
const MOCK_PROFILES: KnownProfile[] = [
  { name: "Lucky Luciano", address: MOCK_TARGETS.eligible },
  { name: "Frank Costello", address: MOCK_TARGETS.wrongCity },
  { name: "Meyer Lansky", address: MOCK_TARGETS.expired },
  { name: "Bugsy Siegel", address: MOCK_TARGETS.notLocated },
  { name: "Al Capone", address: MOCK_TARGETS.safehouse },
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
 * REAL read against the deployed Bullets contract (`balanceOf`).
 */
export async function getBulletBalance(params: {
  publicClient: ReadClient;
  bulletsAddress: `0x${string}`;
  wallet: `0x${string}`;
}): Promise<number> {
  const { publicClient, bulletsAddress, wallet } = params;
  const raw = await publicClient.readContract({
    address: bulletsAddress,
    abi: BULLET_ABI as Abi,
    functionName: "balanceOf",
    args: [wallet],
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
 * Target's safehouse status.
 *
 * MOCK: returns protected only for the mock "Al Capone" target. A real read is
 * not currently possible — Safehouse `getUserInfo(address, message, signature)`
 * is gated by the *target's* signature, which an attacker cannot produce.
 *
 * TODO(contract): replace with a public read once the kill contract (or a
 * companion view) exposes a target's safehouse expiry, e.g.
 *   const info = await publicClient.readContract({
 *     address: addresses.safehouse, abi: SAFEHOUSE_ABI,
 *     functionName: "getProtectionUntil", args: [target],
 *   });
 *   const safeUntil = Number(info);
 *   return { inSafehouse: safeUntil > Date.now() / 1000, safeUntil };
 */
export async function getTargetSafehouseStatus(params: {
  target: `0x${string}`;
}): Promise<SafehouseStatus> {
  await delay(400);
  const isProtected =
    params.target.toLowerCase() === MOCK_TARGETS.safehouse.toLowerCase();
  return {
    inSafehouse: isProtected,
    safeUntil: isProtected ? Math.floor(Date.now() / 1000) + 3600 : 0,
  };
}

/**
 * The connected player's detective hires (used to compute kill eligibility).
 *
 * MOCK: returns a deterministic list covering every eligibility scenario. The
 * "eligible" / "expired" / "safehouse" targets are placed in the player's own
 * city, while the "wrong city" target sits in a different city, so the demo
 * works regardless of where the player currently is.
 *
 * TODO(contract): replace with the paginated on-chain read, e.g.
 *   const [hireIds, list] = await publicClient.readContract({
 *     address: addresses.detectiveAgency, abi: DETECTIVE_AGENCY_ABI,
 *     functionName: "getUserDetectiveHires",
 *     args: [wallet, startIndex, pageSize, message, signature],
 *   });
 * then map each record to DetectiveHireRecord. Note `canKillUntilTime` is
 * derived: startedAt + targetNumber*60 + DETECTIVE_TARGET_FOUND_DURATION.
 */
export async function getUserDetectiveHires(params: {
  wallet: `0x${string}`;
  playerCityId: number | null;
}): Promise<DetectiveHireRecord[]> {
  await delay(600);
  const now = Math.floor(Date.now() / 1000);
  const sameCity = params.playerCityId ?? 0;
  const otherCity = sameCity === 0 ? 1 : 0;
  const TWO_HOURS = 2 * 60 * 60;

  return [
    {
      target: MOCK_TARGETS.eligible,
      targetName: "Lucky Luciano",
      status: "revealed",
      isTargetRevealed: true,
      targetCityId: sameCity,
      canKillUntilTime: now + TWO_HOURS,
    },
    {
      target: MOCK_TARGETS.wrongCity,
      targetName: "Frank Costello",
      status: "revealed",
      isTargetRevealed: true,
      targetCityId: otherCity,
      canKillUntilTime: now + TWO_HOURS,
    },
    {
      target: MOCK_TARGETS.expired,
      targetName: "Meyer Lansky",
      status: "revealed",
      isTargetRevealed: true,
      targetCityId: sameCity,
      canKillUntilTime: now - 60, // window already closed
    },
    {
      // Located but not yet revealed → counts as "not located" for kills.
      target: MOCK_TARGETS.notLocated,
      targetName: "Bugsy Siegel",
      status: "pending",
      isTargetRevealed: false,
      targetCityId: null,
      canKillUntilTime: null,
    },
    {
      // Revealed + in-city, but the safehouse check will block this one first.
      target: MOCK_TARGETS.safehouse,
      targetName: "Al Capone",
      status: "revealed",
      isTargetRevealed: true,
      targetCityId: sameCity,
      canKillUntilTime: now + TWO_HOURS,
    },
  ];
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
    const byAddr = addr !== null && h.target.toLowerCase() === addr;
    const byName =
      name !== null && (h.targetName?.toLowerCase() ?? "") === name;
    return byAddr || byName;
  });

  // 2) Keep only revealed hires with a known city.
  const revealed = matching.filter(
    (h) =>
      (h.isTargetRevealed || h.status === "revealed") &&
      h.targetCityId !== null &&
      h.targetCityId !== undefined,
  );
  if (revealed.length === 0) {
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
      return "This target has not been located. Hire detectives at the Detective Agency and reveal their location before initiating a kill.";
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

/**
 * Initiate a kill against `targetAddress`, spending `bulletAmount` bullets.
 *
 * MOCK: the MafiaKill contract is not deployed yet. This validates inputs and
 * resolves after a short delay to simulate a pending → success tx. The caller is
 * responsible for running all the gameplay checks first and showing the
 * "coming soon" message after this resolves.
 *
 * TODO(contract): replace with a real wallet write + tx confirmation, e.g.
 *   const hash = await walletClient.writeContract({
 *     address: addresses.kill, abi: KILL_ABI,
 *     functionName: "initiateKill",
 *     args: [targetAddress, BigInt(bulletAmount), message, signature],
 *   });
 *   await publicClient.waitForTransactionReceipt({ hash });
 */
export async function initiateKill(params: {
  targetAddress: `0x${string}`;
  bulletAmount: number;
}): Promise<void> {
  const { targetAddress, bulletAmount } = params;
  if (!isAddress(targetAddress)) {
    throw new Error("Invalid target address");
  }
  if (!Number.isFinite(bulletAmount) || bulletAmount < 1) {
    throw new Error("Invalid bullet amount");
  }
  await delay(900);
  // No-op: real on-chain initiation lands here once the contract is deployed.
}
