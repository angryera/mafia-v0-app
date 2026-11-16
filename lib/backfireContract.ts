import { isAddress, zeroAddress, type PublicClient } from "viem";
import type { ChainId } from "./constants/address";
import { KILL_LOOT_LENS_ABI, killField, requireKillAddress } from "./killChain";
import { backfireSettingsFromLens, type BackfireSettings } from "./backfirePolicy";

export {
  BACKFIRE_DEFAULT_BULLET_AMOUNT,
  BACKFIRE_DEFAULT_MODE,
  BACKFIRE_MAX_BULLETS,
  BACKFIRE_MIN_BULLETS,
  BACKFIRE_MODE_OPTIONS,
  BackfireMode,
  backfireSettingsFromLens,
  clampBulletAmount,
  getDefaultBackfireSettings,
  isBackfireMode,
  normalizeBackfireSettings,
  toBackfireFixedAmount,
} from "./backfirePolicy";
export type { BackfireModeOption, BackfireSettings } from "./backfirePolicy";

/**
 * Read the connected user's private policy through KillLootLens. The caller must
 * pass the exact string signed by the wallet; useAuth already stores the quoted
 * message, so this function must not JSON.stringify it again.
 */
export async function loadBackfireSettings(
  publicClient: PublicClient,
  chainId: ChainId,
  wallet: `0x${string}`,
  signedMessage: string,
  signature: `0x${string}`,
): Promise<BackfireSettings> {
  if (!isAddress(wallet) || wallet.toLowerCase() === zeroAddress) {
    throw new Error("Invalid backfire user address");
  }
  if (!signedMessage || !signature) {
    throw new Error("A wallet signature is required to load backfire settings");
  }

  const result = await publicClient.readContract({
    address: requireKillAddress(chainId, "killLootLens"),
    abi: KILL_LOOT_LENS_ABI,
    functionName: "getBackfireSetting",
    args: [wallet, signedMessage, signature],
  });
  return backfireSettingsFromLens(
    killField(result, "policy", 0),
    killField(result, "fixedAmount", 1),
  );
}
