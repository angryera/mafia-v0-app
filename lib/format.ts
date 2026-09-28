/** Format a wallet address for compact UI display without changing its value. */
export function formatWalletAddress(address: string): string {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
