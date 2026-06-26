// ─────────────────────────────────────────────────────────────────────────────
// Dead account — route gating helpers
// ─────────────────────────────────────────────────────────────────────────────

export type DeadAccountKillerResultType = 0 | 1 | 2;

export interface DeadAccountKillerInfo {
  killerName: string;
  killerAddress?: string;
  /** Unix seconds */
  timestamp: number;
  resultType: DeadAccountKillerResultType;
}

/** Profile shape used to evaluate dead state (on-chain / merged). */
export interface DeadAccountProfile {
  id?: bigint | number | string | null;
  profileId?: bigint | number | string | null;
  name?: string | null;
  username?: string | null;
  isDead?: boolean | null;
  is_dead?: boolean | null;
}

const ALLOWED_DEAD_PATHS = [
  "/rebirth",
  "/rank-activation",
  "/equipment",
  "/unstake-mafia",
  "/worth",
  "/vault",
  "/buy",
] as const;

const MINIMAL_LAYOUT_PATHS = [
  "/rebirth",
  "/rank-activation",
  "/equipment",
  "/unstake-mafia",
  "/worth",
] as const;

function matchesPathPrefix(pathname: string, base: string): boolean {
  if (pathname === base) return true;
  return pathname.startsWith(`${base}/`);
}

/** True when the profile has loaded (name or id present). */
export function isDeadAccountProfileLoaded(
  profile: DeadAccountProfile | null | undefined,
): boolean {
  if (!profile) return false;
  const name = profile.name ?? profile.username;
  if (typeof name === "string" && name.trim().length > 0) return true;

  const id = profile.id ?? profile.profileId;
  if (id === undefined || id === null) return false;
  if (typeof id === "bigint") return id !== BigInt(0);
  if (typeof id === "number") return id !== 0;
  if (typeof id === "string") return id.trim().length > 0 && id !== "0";
  return false;
}

/** Dead when profile.isDead === true OR profile.is_dead === true (after load). */
export function isDeadAccount(profile: DeadAccountProfile | null | undefined): boolean {
  if (!isDeadAccountProfileLoaded(profile)) return false;
  return profile!.isDead === true || profile!.is_dead === true;
}

function isPlayerProfilePath(pathname: string): boolean {
  const match = pathname.match(/^\/profile\/([^/]+)/);
  return Boolean(match?.[1]);
}

export function isDeadAccountPathAllowed(pathname: string): boolean {
  if (isPlayerProfilePath(pathname)) return true;
  return ALLOWED_DEAD_PATHS.some((base) => matchesPathPrefix(pathname, base));
}

export function shouldShowDeadAccountFullscreen(
  pathname: string,
  isDead: boolean,
): boolean {
  return isDead && !isDeadAccountPathAllowed(pathname);
}

export function shouldUseDeadAccountMinimalLayout(
  pathname: string,
  isDead: boolean,
): boolean {
  if (!isDead) return false;
  const onMinimalPath = MINIMAL_LAYOUT_PATHS.some((base) =>
    matchesPathPrefix(pathname, base),
  );
  const wouldShowFullscreen = shouldShowDeadAccountFullscreen(pathname, isDead);
  return onMinimalPath || wouldShowFullscreen;
}

export const KILL_RESULT_LABELS: Record<DeadAccountKillerResultType, string> = {
  0: "Single kill",
  1: "Double kill",
  2: "Backfire kill",
};

export const KILL_RESULT_COLORS: Record<DeadAccountKillerResultType, string> = {
  0: "text-red-400",
  1: "text-amber-400",
  2: "text-purple-400",
};
