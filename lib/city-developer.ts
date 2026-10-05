/** Offense and defense bonus for the City Developer of a city, in percent. */
export const CITY_DEVELOPER_BOOST_PERCENT = 20;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export type CityDeveloperPower = {
  base: number;
  bonus: number;
  total: number;
};

export type CityDeveloperCallResult = {
  status: "success" | "failure";
  result?: unknown;
};

function boostMultiplier(isCityDeveloper: boolean): number {
  return isCityDeveloper ? 1 + CITY_DEVELOPER_BOOST_PERCENT / 100 : 1;
}

export function isCityDeveloperAddress(
  developer: string | null | undefined,
  wallet: string | null | undefined,
): boolean {
  if (!developer || !wallet) return false;
  const developerAddress = developer.toLowerCase();
  if (developerAddress === ZERO_ADDRESS) return false;
  return developerAddress === wallet.toLowerCase();
}

/** Pull `developer` out of a `cityDevelopers` tuple or named result. */
export function developerAddressFromResult(result: unknown): string | null {
  if (typeof result === "string") return result;
  if (Array.isArray(result)) {
    const developer = result[1];
    return typeof developer === "string" ? developer : null;
  }
  if (result && typeof result === "object" && "developer" in result) {
    const developer = (result as { developer: unknown }).developer;
    return typeof developer === "string" ? developer : null;
  }
  return null;
}

export function developedCityIdsFromResults(
  wallet: string,
  cityIds: readonly number[],
  results: readonly CityDeveloperCallResult[],
): number[] {
  const developed: number[] = [];
  for (let index = 0; index < cityIds.length; index++) {
    const row = results[index];
    if (!row || row.status !== "success") continue;
    const developer = developerAddressFromResult(row.result);
    if (isCityDeveloperAddress(developer, wallet)) {
      developed.push(cityIds[index]);
    }
  }
  return developed;
}

/**
 * Multicall `cityDevelopers` for every city.
 * An empty wallet performs no reads.
 */
export async function readDevelopedCityIds(params: {
  wallet?: string | null;
  cityIds: readonly number[];
  multicall: (
    cityIds: readonly number[],
  ) => Promise<readonly CityDeveloperCallResult[]>;
}): Promise<number[]> {
  const wallet = params.wallet?.trim();
  if (!wallet) return [];
  const results = await params.multicall(params.cityIds);
  return developedCityIdsFromResults(wallet, params.cityIds, results);
}

/**
 * Split an on-chain total that already includes the City Developer boost.
 * `total` is returned unchanged. `base + bonus` always equals `total`.
 */
export function splitCityDeveloperPower(
  total: number,
  isCityDeveloper: boolean,
): CityDeveloperPower {
  if (!isCityDeveloper) {
    return { base: total, bonus: 0, total };
  }
  const base = Math.round(total / boostMultiplier(true));
  return { base, bonus: total - base, total };
}

/**
 * Project a saved on-chain total after an unsaved item swap.
 * Only the item-stat delta is applied. MAFIA stake changes are not an input.
 */
export function projectLoadoutPower(params: {
  onChainTotal: number;
  savedItemStat: number;
  draftItemStat: number;
  isCityDeveloper: boolean;
}): number {
  const delta = Math.round(
    (params.draftItemStat - params.savedItemStat) *
      boostMultiplier(params.isCityDeveloper),
  );
  return Math.max(0, params.onChainTotal + delta);
}

/** Extra offense and defense the City Developer boost adds to one equipped item. */
export function cityDeveloperItemBoost(
  offense: number,
  defense: number,
): { offense: number; defense: number } | null {
  if (offense <= 0 && defense <= 0) return null;
  return {
    offense: Math.round((offense * CITY_DEVELOPER_BOOST_PERCENT) / 100),
    defense: Math.round((defense * CITY_DEVELOPER_BOOST_PERCENT) / 100),
  };
}

export function formatGroupedPower(value: number): string {
  return value.toLocaleString("en-US");
}

export function cityDeveloperPowerTooltip(
  stat: "offense" | "defense",
  power: CityDeveloperPower,
): string {
  return `Base ${stat} ${formatGroupedPower(power.base)} + ${formatGroupedPower(power.bonus)} City Developer bonus (${CITY_DEVELOPER_BOOST_PERCENT}%)`;
}

export function loadoutEstimateTooltip(stat: "offense" | "defense"): string {
  return `Estimated ${stat} after saving. Based on item stats; MAFIA stake changes are applied on save.`;
}

export function formatLoadoutEstimate(
  projected: number,
  onChainTotal: number,
): string {
  const delta = projected - onChainTotal;
  const sign = delta > 0 ? "+" : "";
  return `→ ${formatGroupedPower(projected)} (${sign}${formatGroupedPower(delta)})`;
}

export function formatCityDeveloperItemBoost(boost: {
  offense: number;
  defense: number;
}): string {
  return `City Developer boost: +${boost.offense} offense, +${boost.defense} defense`;
}

export function cityDeveloperBadgeTooltip(cityName: string): string {
  return `As the City Developer of ${cityName}, your offense and defense in this city are boosted by ${CITY_DEVELOPER_BOOST_PERCENT}% on-chain.`;
}

export function cityDeveloperCrownTooltip(cityName: string): string {
  return `You are the City Developer of ${cityName}: +${CITY_DEVELOPER_BOOST_PERCENT}% offense and defense here.`;
}
