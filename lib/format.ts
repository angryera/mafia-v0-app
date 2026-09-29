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

/** Duration as `1h 2m 3s`, dropping leading zero units (`2m 3s`, `3s`). */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Coarse duration for multi-day cooldowns: `3d 4h`, `4h 5m`, `5m`, `42s`, or `Ready`. */
export function formatLongCooldown(seconds: number): string {
  if (seconds <= 0) return "Ready";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${seconds}s`;
}

/** Relative time for a unix timestamp in seconds: `Just now`, `5m ago`, `3h ago`, `2d ago`. */
export function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Travel-destination city label. Unknown ids render as `City #<id>`. */
export function getTravelCityName(cityId: number): string {
  if (cityId >= 0 && cityId < TRAVEL_DESTINATIONS.length) {
    return TRAVEL_DESTINATIONS[cityId].label;
  }
  return `City #${cityId}`;
}
