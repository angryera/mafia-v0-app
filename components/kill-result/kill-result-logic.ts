import { formatUnits } from "viem";

export type ResultOutcome =
  | "double"
  | "insta_fail_backfire"
  | "insta_fail"
  | "insta_death"
  | "success"
  | "backfire"
  | "survive";

export interface ResultRecord {
  attacker: `0x${string}`;
  victim: `0x${string}`;
  status: number;
  cityId: number;
  outcome: number;
  backfireOutcome: number;
  backfirePolicy: number;
  bullets: bigint;
  backfireBullets: bigint;
  healthLost: bigint;
  backfireHealthLost: bigint;
  victimKilled: boolean;
  attackerKilled: boolean;
  victimKillId: bigint;
  attackerKillId: bigint;
  requestedAt: bigint | number;
  resolvedAt: bigint | number;
  message: string;
}

export interface ResultStats {
  attackerHealth: bigint;
  victimHealth: bigint;
  attackerDefense: bigint;
  attackerOffense: bigint;
  victimDefense: bigint;
  victimOffense: bigint;
}

export const BACKFIRE_POLICY_NAMES = ["NONE", "FIXED", "TWO TIMES", "RANDOM", "SAME"] as const;

export function parseAttackId(value: string): bigint | null {
  if (!/^(?:0|[1-9][0-9]{0,77})$/.test(value)) return null;
  const id = BigInt(value);
  return id <= (1n << 256n) - 1n ? id : null;
}

export function resultOutcome(record: ResultRecord): ResultOutcome {
  if (record.victimKilled && record.attackerKilled) return "double";
  if (record.outcome === 1) return record.attackerKilled ? "insta_fail_backfire" : "insta_fail";
  if (record.outcome === 2 && record.attackerKilled) return "insta_death";
  if (record.victimKilled) return "success";
  if (record.attackerKilled) return "backfire";
  return "survive";
}

export function resultSubtitle(record: ResultRecord): string {
  const outcome = resultOutcome(record);
  const returnFired = record.backfireOutcome === 0 && record.backfireBullets > 0n;
  if (outcome === "insta_death") return "The attacker died instantly.";
  if (outcome === "insta_fail_backfire") return returnFired
    ? "The first strike failed instantly. The attacker fell in the response."
    : "The first strike failed instantly. The attacker went down.";
  if (outcome === "insta_fail") return "The strike failed instantly.";
  if (outcome === "double") return "Both fighters went down in the exchange.";
  if (outcome === "success") return "The target went down.";
  if (outcome === "backfire") return returnFired
    ? "The target fired back and the attacker went down."
    : "The attacker went down.";
  if (record.healthLost > 0n) return "The target survived the hit.";
  if (returnFired) return "Shots were exchanged. Both fighters survived.";
  return "The attack dealt no recorded damage.";
}

export function hasStatsSnapshot(stats: ResultStats): boolean {
  return Object.values(stats).some((value) => value !== 0n);
}

export function remainingHealth(before: bigint, damage: bigint, killed: boolean): bigint {
  return killed || damage >= before ? 0n : before - damage;
}

export function healthPercent(before: bigint, after: bigint): number {
  if (before <= 0n) return 0;
  return Number((after * 10_000n) / before) / 100;
}

/** Limit displayed combat damage to the fighter's starting HP and 1,000 HP. */
export function capRecordedDamage(value: bigint, healthBefore?: bigint): bigint {
  const maximum = 1_000n * 10n ** 18n;
  const healthCap = healthBefore === undefined ? maximum
    : healthBefore < 0n ? 0n : healthBefore < maximum ? healthBefore : maximum;
  return value < 0n ? 0n : value > healthCap ? healthCap : value;
}

/** Compact combat numbers for the game UI without losing bigint precision. */
export function formatCombatUnits(value: bigint, decimals = 18): string {
  if (!Number.isSafeInteger(decimals) || decimals < 0) throw new RangeError("Invalid combat decimals");
  const unit = 10n ** BigInt(decimals);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const hundredths = (absolute * 100n + unit / 2n) / unit;
  if (absolute > 0n && hundredths === 0n) return negative ? ">-0.01" : "<0.01";
  const whole = (hundredths / 100n).toLocaleString("en-US");
  const fraction = (hundredths % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  return `${negative && hundredths > 0n ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

/** Preserve full precision where asset amounts require exact display. */
export function formatExactUnits(amount: bigint, decimals = 18): string {
  const [whole, fraction] = formatUnits(amount, decimals).split(".");
  const grouped = BigInt(whole).toLocaleString("en-US");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function formatUtc(value: bigint | number): string {
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return "—";
  return new Date(seconds * 1000).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
}

export function killTargets(record: ResultRecord): Array<{ killId: bigint; fighter: "victim" | "attacker" }> {
  const targets: Array<{ killId: bigint; fighter: "victim" | "attacker" }> = [];
  if (record.victimKilled) targets.push({ killId: record.victimKillId, fighter: "victim" });
  if (record.attackerKilled) targets.push({ killId: record.attackerKillId, fighter: "attacker" });
  return targets;
}
