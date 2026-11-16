import { formatEther, parseEther } from "viem";

/** Matches the deployed MafiaKillInitiator.BackfirePolicy enum. */
export const BackfireMode = {
  None: 0,
  Range: 1,
  DoubleAttacker: 2,
  RangeRandom: 3,
  SameAsAttacker: 4,
} as const;
export type BackfireMode = (typeof BackfireMode)[keyof typeof BackfireMode];

export interface BackfireModeOption {
  mode: BackfireMode;
  title: string;
  description: string;
  requiresBulletAmount: boolean;
}

export const BACKFIRE_MIN_BULLETS = 1;
export const BACKFIRE_MAX_BULLETS = 75_000;
export const BACKFIRE_DEFAULT_MODE = BackfireMode.None;
export const BACKFIRE_DEFAULT_BULLET_AMOUNT = 1_000;

export const BACKFIRE_MODE_OPTIONS: readonly BackfireModeOption[] = [
  {
    mode: BackfireMode.Range,
    title: "Shoot X amount of bullets (Range)",
    description: "Return fire with a fixed bullet amount you choose (1–75,000).",
    requiresBulletAmount: true,
  },
  {
    mode: BackfireMode.DoubleAttacker,
    title: "Shoot 2× amount of the attacker",
    description: "Automatically shoot back with twice the bullets your attacker spent.",
    requiresBulletAmount: false,
  },
  {
    mode: BackfireMode.RangeRandom,
    title: "Shoot a random amount of the range",
    description: "Return fire with a random bullet count within the admin-configured game range.",
    requiresBulletAmount: false,
  },
  {
    mode: BackfireMode.SameAsAttacker,
    title: "Shoot same amount",
    description: "Match the attacker bullet for bullet when you return fire.",
    requiresBulletAmount: false,
  },
  {
    mode: BackfireMode.None,
    title: "No backfire",
    description: "Do not automatically return fire when you are attacked.",
    requiresBulletAmount: false,
  },
];

export interface BackfireSettings {
  mode: BackfireMode;
  rangeMin: number;
  rangeMax: number;
}

export function getDefaultBackfireSettings(): BackfireSettings {
  return {
    mode: BACKFIRE_DEFAULT_MODE,
    rangeMin: BACKFIRE_DEFAULT_BULLET_AMOUNT,
    rangeMax: BACKFIRE_DEFAULT_BULLET_AMOUNT,
  };
}

export function isBackfireMode(value: unknown): value is BackfireMode {
  return typeof value === "number" && Number.isInteger(value) &&
    value >= BackfireMode.None && value <= BackfireMode.SameAsAttacker;
}

function parseBackfireMode(value: unknown): BackfireMode {
  const number = typeof value === "bigint" ||
    (typeof value === "string" && /^\d+$/.test(value))
    ? Number(value)
    : value;
  if (!isBackfireMode(number)) {
    throw new Error(`Unknown backfire policy from kill loot lens: ${String(value)}`);
  }
  return number;
}

export function clampBulletAmount(amount: number): number {
  if (!Number.isFinite(amount)) return BACKFIRE_DEFAULT_BULLET_AMOUNT;
  return Math.min(BACKFIRE_MAX_BULLETS, Math.max(BACKFIRE_MIN_BULLETS, Math.floor(amount)));
}

/** Keep a single fixed bullet amount for the page's draft and preview. */
export function normalizeBackfireSettings(
  input: Partial<BackfireSettings> | null | undefined,
): BackfireSettings {
  const defaults = getDefaultBackfireSettings();
  if (!input) return defaults;
  const mode = isBackfireMode(input.mode) ? input.mode : defaults.mode;
  const amount = clampBulletAmount(Number(input.rangeMin ?? input.rangeMax ?? defaults.rangeMin));
  return { mode, rangeMin: amount, rangeMax: amount };
}

/** Decode the lens' on-chain 18-decimal amount without rounding fractional bullets. */
export function backfireSettingsFromLens(policy: unknown, fixedAmount: unknown): BackfireSettings {
  const mode = parseBackfireMode(policy);
  const wei = typeof fixedAmount === "bigint"
    ? fixedAmount
    : typeof fixedAmount === "string" && /^\d+$/.test(fixedAmount)
      ? BigInt(fixedAmount)
      : undefined;
  if (wei === undefined || wei < 0n) {
    throw new Error("Invalid fixed amount from kill loot lens");
  }
  if (mode !== BackfireMode.Range) return { ...getDefaultBackfireSettings(), mode };

  const decimal = formatEther(wei);
  if (!/^[1-9]\d*$/.test(decimal)) {
    throw new Error("Invalid fixed backfire amount from contract");
  }
  const amount = Number(decimal);
  if (!Number.isSafeInteger(amount) || amount > BACKFIRE_MAX_BULLETS) {
    throw new Error("Invalid fixed backfire amount from contract");
  }
  return { mode, rangeMin: amount, rangeMax: amount };
}

/** Build the exact setBackfire uint256 argument; other policies send zero. */
export function toBackfireFixedAmount(mode: BackfireMode, bulletAmount: number): bigint {
  if (!isBackfireMode(mode)) throw new Error("Invalid backfire policy");
  if (mode !== BackfireMode.Range) return 0n;
  if (!Number.isSafeInteger(bulletAmount) ||
      bulletAmount < BACKFIRE_MIN_BULLETS || bulletAmount > BACKFIRE_MAX_BULLETS) {
    throw new Error(`Bullet amount must be between ${BACKFIRE_MIN_BULLETS.toLocaleString()} and ${BACKFIRE_MAX_BULLETS.toLocaleString()}.`);
  }
  return parseEther(String(bulletAmount));
}
