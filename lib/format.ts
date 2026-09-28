import { formatUnits } from "viem";
import { TRAVEL_DESTINATIONS } from "@/lib/constants/const";

/** Format a wallet address for compact UI display without changing its value. */
export function formatWalletAddress(address: string): string {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Same shortening, but short strings are kept and the separator is a single ellipsis. */
export function formatEllipsisAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** First line of a contract or wallet error, which is the part meant for display. */
export function getErrorMessage(error: { message?: string } | null | undefined): string {
  return error?.message?.split("\n")[0] ?? "";
}

/** 18-decimal token amount for display. `empty` is used when the value has not loaded. */
export function formatWeiDisplay(
  wei: bigint | null | undefined,
  maximumFractionDigits = 2,
  empty = "—",
): string {
  if (wei == null) return empty;
  return Number(formatUnits(wei, 18)).toLocaleString(undefined, { maximumFractionDigits });
}

/** Travel-destination city label. Unknown ids render as `City #<id>`. */
export function getTravelCityName(cityId: number): string {
  if (cityId >= 0 && cityId < TRAVEL_DESTINATIONS.length) {
    return TRAVEL_DESTINATIONS[cityId].label;
  }
  return `City #${cityId}`;
}
