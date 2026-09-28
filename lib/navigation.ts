/**
 * Route identifiers shared by navigation and page composition.
 *
 * Keep this module free of React and wallet dependencies so route parsing does
 * not pull the interactive header into otherwise unrelated components.
 */
export const TABS = [
  "crime",
  "organized-crime",
  "travel",
  "nickcar",
  "killskill",
  "jail",
  "helperbots",
  "buy-helper-credits",
  "buy-keys",
  "buy-perk-boxes",
  "buy-premium",
  "buy-gi-credits",
  "my-profile",
  "worth",
  "cash",
  "biz-shop",
  "biz-hospital",
  "biz-bulletfactory",
  "biz-detective-agency",
  "biz-car-crusher",
  "biz-bank",
  "biz-roulette",
  "biz-slotmachine",
  "biz-jackpot",
  "biz-lottery-hall",
  "biz-safehouse",
  "biz-booze",
  "biz-narcs",
  "city-map",
  "garage",
  "open-crate",
  "open-perkbox",
  "mystery-box",
  "rank-activation",
  "bodyguard-training",
  "equipment",
  "players",
  "families",
  "info",
  "exchange-convert",
  "exchange-bullet",
  "exchange-liquidity",
  "exchange-otc",
  "referral",
  "weekly-missions",
  "story-mode",
  "xp-market",
  "marketplace",
  "racing",
  "create-profile",
  "marketing-dao",
  "backfire-settings",
  "graveyard",
  "kill-history",
  "kill-initiation",
  "kill-outcome",
  "kill-attempt",
  "rebirth",
  "unstake-mafia",
] as const;

export type Tab = (typeof TABS)[number];

const TAB_SET: ReadonlySet<string> = new Set(TABS);

export function isTab(value: string): value is Tab {
  return TAB_SET.has(value);
}

export function getTabUrl(tab: Tab): string {
  return tab === "crime" ? "/" : `/${tab}`;
}

export function getTabFromPath(pathname: string): Tab {
  const firstSegment = pathname.replace(/^\//, "").split("/")[0];
  return firstSegment && isTab(firstSegment) ? firstSegment : "crime";
}
