// ─────────────────────────────────────────────────────────────────────────────
// Backfire settings — persistence service
//
// SOURCE OF TRUTH (eventual): an on-chain smart contract. It is NOT deployed yet.
//
// For now this module is a *mock* that simulates the future wallet write +
// tx-confirmation flow (pending → success/failure) and caches the value so the
// UX survives reloads. It is intentionally the SINGLE place persistence lives,
// so swapping to a real contract call is a drop-in replacement: keep the same
// async function signatures and replace the bodies where the TODOs are marked.
// ─────────────────────────────────────────────────────────────────────────────

// ── Backfire modes ───────────────────────────────────────────────────────────
// NOTE: These numeric values MUST match the future contract enum exactly.
export enum BackfireMode {
  Range = 1,
  DoubleAttacker = 2,
  RangeRandom = 3,
  SameAsAttacker = 4,
  None = 5,
}

export interface BackfireModeOption {
  mode: BackfireMode;
  title: string;
  description: string;
}

// Display order matches the listed order in the spec.
export const BACKFIRE_MODE_OPTIONS: BackfireModeOption[] = [
  {
    mode: BackfireMode.Range,
    title: "Shoot X amount of bullets (Range)",
    description: "Return fire with a fixed bullet amount you choose (1–200,000).",
  },
  {
    mode: BackfireMode.DoubleAttacker,
    title: "Shoot 2× amount of the attacker",
    description:
      "Automatically shoot back with twice the bullets your attacker spent.",
  },
  {
    mode: BackfireMode.RangeRandom,
    title: "Shoot a random amount of the range",
    description:
      "Return fire with a random bullet count within the allowed game range.",
  },
  {
    mode: BackfireMode.SameAsAttacker,
    title: "Shoot same amount",
    description: "Match the attacker bullet for bullet when you return fire.",
  },
  {
    mode: BackfireMode.None,
    title: "Not backfire",
    description: "Do not automatically return fire when you are attacked.",
  },
];

// ── Constants / defaults ─────────────────────────────────────────────────────
export const BACKFIRE_MIN_BULLETS = 1;
export const BACKFIRE_MAX_BULLETS = 200_000;
export const BACKFIRE_DEFAULT_MODE: BackfireMode = BackfireMode.None;
export const BACKFIRE_DEFAULT_BULLET_AMOUNT = 1_000;

// ── Data model ───────────────────────────────────────────────────────────────
// `rangeMin`/`rangeMax` mirror the eventual contract shape. The UI only exposes a
// single number for the `Range` mode and keeps min === max.
export interface BackfireSettings {
  mode: number;
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function isValidMode(mode: number): mode is BackfireMode {
  return (
    mode === BackfireMode.Range ||
    mode === BackfireMode.DoubleAttacker ||
    mode === BackfireMode.RangeRandom ||
    mode === BackfireMode.SameAsAttacker ||
    mode === BackfireMode.None
  );
}

export function clampBulletAmount(amount: number): number {
  if (!Number.isFinite(amount)) return BACKFIRE_MIN_BULLETS;
  const floored = Math.floor(amount);
  return Math.min(
    BACKFIRE_MAX_BULLETS,
    Math.max(BACKFIRE_MIN_BULLETS, floored),
  );
}

/**
 * Coerce arbitrary/partial input into a well-formed settings object, falling
 * back to defaults for anything missing or malformed. Mirrors what the contract
 * decode + sanitization will eventually guarantee.
 */
export function normalizeBackfireSettings(
  input: Partial<BackfireSettings> | null | undefined,
): BackfireSettings {
  const defaults = getDefaultBackfireSettings();
  if (!input || typeof input !== "object") return defaults;

  const mode = isValidMode(Number(input.mode))
    ? Number(input.mode)
    : BackfireMode.None;

  // Only the Range mode carries a meaningful amount; keep min === max.
  const rawAmount = Number(
    input.rangeMin ?? input.rangeMax ?? BACKFIRE_DEFAULT_BULLET_AMOUNT,
  );
  const amount = Number.isFinite(rawAmount)
    ? clampBulletAmount(rawAmount)
    : BACKFIRE_DEFAULT_BULLET_AMOUNT;

  return { mode, rangeMin: amount, rangeMax: amount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock persistence layer
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "mafia.backfireSettings.mock";
const MOCK_LATENCY_MS = 700;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Per-wallet in-memory cache (so reads are instant within a session even if
// localStorage is unavailable). Keyed by lowercased wallet address.
const memoryCache = new Map<string, BackfireSettings>();

function cacheKey(wallet?: string | null): string {
  return wallet ? wallet.toLowerCase() : "default";
}

function readFromStorage(key: string): BackfireSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}.${key}`);
    if (!raw) return null;
    return normalizeBackfireSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeToStorage(key: string, settings: BackfireSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY}.${key}`,
      JSON.stringify(settings),
    );
  } catch {
    // Ignore storage failures (private mode, quota, etc.) — memory cache covers UX.
  }
}

/**
 * Load the player's backfire settings.
 *
 * MOCK: resolves from the in-memory / localStorage cache after a short delay.
 *
 * TODO(contract): replace with an on-chain READ for `wallet`, e.g.
 *   const data = await publicClient.readContract({
 *     address: BACKFIRE_CONTRACT_ADDRESS,
 *     abi: BACKFIRE_ABI,
 *     functionName: "getBackfireSettings",
 *     args: [wallet],
 *   });
 *   return normalizeBackfireSettings(data);
 */
export async function loadBackfireSettings(
  wallet?: string | null,
): Promise<BackfireSettings> {
  await delay(MOCK_LATENCY_MS);

  const key = cacheKey(wallet);
  const cached = memoryCache.get(key) ?? readFromStorage(key);
  const settings = normalizeBackfireSettings(cached);
  memoryCache.set(key, settings);
  return settings;
}

/**
 * Save the player's backfire settings.
 *
 * MOCK: simulates the pending → success flow with a short delay, then persists
 * to the in-memory / localStorage cache. Throws on failure (mirrors a rejected
 * wallet write or reverted tx) so the UI can surface the failure toast.
 *
 * TODO(contract): replace with a wallet WRITE + tx confirmation, e.g.
 *   const hash = await walletClient.writeContract({
 *     address: BACKFIRE_CONTRACT_ADDRESS,
 *     abi: BACKFIRE_ABI,
 *     functionName: "setBackfireSettings",
 *     args: [settings.mode, settings.rangeMin, settings.rangeMax],
 *   });
 *   await publicClient.waitForTransactionReceipt({ hash }); // tx confirmation
 */
export async function saveBackfireSettings(
  settings: BackfireSettings,
  wallet?: string | null,
): Promise<BackfireSettings> {
  await delay(MOCK_LATENCY_MS);

  const normalized = normalizeBackfireSettings(settings);
  const key = cacheKey(wallet);
  memoryCache.set(key, normalized);
  writeToStorage(key, normalized);
  return normalized;
}
