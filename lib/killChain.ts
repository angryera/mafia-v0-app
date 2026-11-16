import {
  decodeEventLog,
  isAddress,
  zeroAddress,
  type Abi,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import initiatorAbi from "@/lib/constants/abi/mafia-kill-initiator.json";
import registryAbi from "@/lib/constants/abi/mafia-kill-registry.json";
import { CONTRACT_ADDRESSES, type ChainId } from "@/lib/constants/address";

// These ABIs are copied from the live application's contract bindings. In
// particular, Attack's packed field order and all event indexed flags matter.
export const KILL_INITIATOR_ABI = initiatorAbi as Abi;
export const KILL_REGISTRY_ABI = registryAbi as Abi;

const lootSummaryComponents = [
  { name: "specIndex", type: "uint256" },
  { name: "kind", type: "uint8" },
  { name: "dest", type: "uint8" },
  { name: "source", type: "address" },
  { name: "category", type: "uint256" },
  { name: "killerBps", type: "uint16" },
  { name: "total", type: "uint256" },
  { name: "toKiller", type: "uint256" },
] as const;

const lootRowComponents = [
  ...lootSummaryComponents.slice(0, 6),
  { name: "id", type: "uint256" },
  { name: "itemId", type: "uint256" },
  { name: "categoryId", type: "uint256" },
  { name: "typeId", type: "uint256" },
  { name: "cityId", type: "uint256" },
  { name: "amount", type: "uint256" },
  { name: "mafia", type: "uint256" },
  { name: "price", type: "uint256" },
] as const;

export const KILL_LOOT_LENS_ABI = [
  {
    type: "function",
    name: "previewKill",
    stateMutability: "view",
    inputs: [{ name: "killId", type: "uint256" }],
    outputs: [
      { name: "victim", type: "address" },
      { name: "killer", type: "address" },
      { name: "drainer", type: "address" },
      { name: "loot", type: "tuple[]", components: lootSummaryComponents },
    ],
  },
  {
    type: "function",
    name: "previewKillRows",
    stateMutability: "view",
    inputs: [
      { name: "killId", type: "uint256" },
      { name: "start", type: "uint256" },
      { name: "length", type: "uint256" },
    ],
    outputs: [
      { name: "total", type: "uint256" },
      { name: "rows", type: "tuple[]", components: lootRowComponents },
    ],
  },
] as const satisfies Abi;

export const AttackResult = {
  Attempted: 0,
  BulletAmountOutOfRange: 1,
  VictimInSafehouse: 2,
  VictimInactive: 3,
  RankDifferenceOutOfRange: 4,
  CityMismatch: 5,
  DetectiveLockExpired: 6,
  NoWeaponEquipped: 7,
  AttackerRankNotActivated: 8,
  VictimBlocklisted: 9,
  KillerNotWhitelisted: 10,
  AttackerRankTooHigh: 11,
  AttackerOnCooldown: 12,
  VictimInHospital: 13,
  AttackPending: 14,
  VictimRankTooHigh: 15,
} as const;

export const AttackStatus = { Pending: 0, Resolved: 1, Voided: 2, Expired: 3 } as const;
export const StrikeOutcome = { Hit: 0, InstantFail: 1, InstantDeath: 2 } as const;
export const BackfirePolicy = { None: 0, Fixed: 1, TwoTimes: 2, Random: 3, Same: 4 } as const;
export const BACKFIRE_POLICY_NAMES = ["NONE", "FIXED", "TWO TIMES", "RANDOM", "SAME"] as const;

export const BNB_KILL_OPEN_TIME = Date.parse("2026-11-05T22:00:00Z") / 1000;
export const PULSE_KILL_OPEN_TIME = Date.parse("2026-11-08T22:00:00Z") / 1000;
export const getKillOpenTime = (chainId: ChainId): number =>
  chainId === "pulse" ? PULSE_KILL_OPEN_TIME : BNB_KILL_OPEN_TIME;

export function requireKillAddress(
  chainId: ChainId,
  contract: "killInitiator" | "killRegistry" | "killLootLens",
): `0x${string}` {
  const address = CONTRACT_ADDRESSES[chainId][contract];
  if (!isAddress(address) || address.toLowerCase() === zeroAddress) {
    throw new Error(`${contract} contract is not configured on ${chainId}`);
  }
  return address;
}

export function killField(value: unknown, name: string, index: number): unknown {
  if (Array.isArray(value)) return value[index];
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return item[name] ?? item[String(index)];
  }
  return undefined;
}

export function killBigInt(value: unknown, label: string): bigint {
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(`Invalid ${label} from kill contract`);
}

export function killSafeNumber(value: unknown, label: string): number {
  const number = killBigInt(value, label);
  if (number > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${label} exceeds safe integer range`);
  return Number(number);
}

export function killBoolean(value: unknown, label: string): boolean {
  if (typeof value === "boolean") return value;
  throw new Error(`Invalid ${label} from kill contract`);
}

export function killAddress(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error(`Invalid ${label} from kill contract`);
  }
  return value as `0x${string}`;
}

export function parseKillId(value: string | bigint): bigint {
  if (typeof value === "bigint") {
    if (value >= 0n) return value;
    throw new Error("Invalid kill id");
  }
  if (!/^(0|[1-9]\d*)$/.test(value) || value.length > 78) throw new Error("Invalid kill id");
  const id = BigInt(value);
  if (id >= 2n ** 256n) throw new Error("Invalid kill id");
  return id;
}

export function getAttackResultMessage(
  result: number,
  cityName?: string,
  maxRankDifference?: number | null,
): string {
  switch (result) {
    case 0: return "Attack committed. Bullets were spent in this transaction.";
    case 1: return "Bullet amount is outside the allowed range.";
    case 2: return "The target is in a safehouse.";
    case 3: return "The target is inactive.";
    case 4: return maxRankDifference == null
      ? "Rank difference is too large to attack this target."
      : `Rank difference cannot exceed ${maxRankDifference}.`;
    case 5: return "You and the target must be in the same city.";
    case 6: return "The detective lead has expired.";
    case 7: return `Equip a weapon in ${cityName || "your city"} first.`;
    case 8: return "Activate your rank before attacking.";
    case 9: return "This target is blocklisted.";
    case 10: return "Your wallet is not whitelisted to attack.";
    case 11: return "Your rank is too high to attack.";
    case 12: return "Attack cooldown is active.";
    case 13: return "The target is in hospital.";
    case 14: return "You already have a pending attack.";
    case 15: return "The target's rank is above Lieutenant.";
    default: return "Attack was rejected on-chain.";
  }
}

type DecodedKillEvent = { eventName: string; args: Record<string, unknown> };
function receiptEvents(receipt: TransactionReceipt, initiatorAddress: `0x${string}`): DecodedKillEvent[] {
  if (receipt.status === "reverted") throw new Error("Attack transaction reverted");
  const events: DecodedKillEvent[] = [];
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== initiatorAddress.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: KILL_INITIATOR_ABI, data: log.data, topics: log.topics });
      if (typeof decoded.eventName !== "string" || !decoded.args || Array.isArray(decoded.args)) continue;
      events.push({ eventName: decoded.eventName, args: decoded.args as unknown as Record<string, unknown> });
    } catch {
      // The initiator can emit unrelated events in the same transaction.
    }
  }
  return events;
}

export interface DecodedAttackInitiation {
  killer: `0x${string}`;
  victim: `0x${string}`;
  bulletAmount: bigint;
  result: number;
  timestamp: number;
  attackId: bigint | null;
  revealBlock: bigint | null;
}

export function decodeAttackInitiationReceipt(
  receipt: TransactionReceipt,
  initiatorAddress: `0x${string}`,
): DecodedAttackInitiation {
  const events = receiptEvents(receipt, initiatorAddress);
  const initiated = events.find((event) => event.eventName === "AttackInitiated");
  if (!initiated) throw new Error("Attack transaction confirmed without AttackInitiated");
  const killer = killAddress(initiated.args.killer, "killer");
  const victim = killAddress(initiated.args.victim, "victim");
  const result = killSafeNumber(initiated.args.result, "attack result");
  if (result > AttackResult.VictimRankTooHigh) throw new Error(`Unknown attack result ${result}`);
  const requested = result === AttackResult.Attempted
    ? events.find((event) => event.eventName === "AttackRequested" &&
        String(event.args.killer).toLowerCase() === killer.toLowerCase() &&
        String(event.args.victim).toLowerCase() === victim.toLowerCase())
    : undefined;
  if (result === AttackResult.Attempted && !requested) {
    throw new Error("Attack transaction confirmed without matching AttackRequested");
  }
  return {
    killer,
    victim,
    bulletAmount: killBigInt(initiated.args.bulletAmount, "bullet amount"),
    result,
    timestamp: killSafeNumber(initiated.args.timestamp, "attack timestamp"),
    attackId: requested ? killBigInt(requested.args.attackId, "attack id") : null,
    revealBlock: requested ? killBigInt(requested.args.revealBlock, "reveal block") : null,
  };
}

export function decodeAttackFinishedReceipt(
  receipt: TransactionReceipt,
  initiatorAddress: `0x${string}`,
): { attackId: bigint; status: number } {
  const event = receiptEvents(receipt, initiatorAddress)
    .find((item) => item.eventName === "AttackFinished");
  if (!event) throw new Error("Finish transaction confirmed without AttackFinished");
  const status = killSafeNumber(event.args.status, "attack status");
  if (status > AttackStatus.Expired) throw new Error(`Unknown attack status ${status}`);
  return { attackId: killBigInt(event.args.attackId, "attack id"), status };
}

export async function getPendingAttack(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  user: `0x${string}`;
}): Promise<{ hasPending: boolean; attackId: bigint; revealBlock: bigint }> {
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killInitiator"),
    abi: KILL_INITIATOR_ABI,
    functionName: "getPendingAttack",
    args: [params.user],
  });
  return {
    hasPending: killBoolean(killField(raw, "hasPending", 0), "pending flag"),
    attackId: killBigInt(killField(raw, "attackId", 1), "attack id"),
    revealBlock: killBigInt(killField(raw, "revealBlock", 2), "reveal block"),
  };
}

export async function getAttackTimers(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  user: `0x${string}`;
}): Promise<{ attackAvailableAt: number; hospitalEndsAt: number }> {
  const raw = await params.publicClient.readContract({
    address: requireKillAddress(params.chainId, "killInitiator"),
    abi: KILL_INITIATOR_ABI,
    functionName: "getAttackTimers",
    args: [params.user],
  });
  return {
    attackAvailableAt: killSafeNumber(killField(raw, "attackAvailableAt", 0), "attack available at"),
    hospitalEndsAt: killSafeNumber(killField(raw, "hospitalEndsAt", 1), "hospital ends at"),
  };
}
