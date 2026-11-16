import type { PublicClient } from "viem";
import type { ChainId } from "@/lib/contract";
import type { DeadAccountKillerInfo } from "@/lib/deadAccount";
import { fetchLatestKillForVictim } from "@/lib/killHistoryService";

/** Most recent confirmed death for a player, including deaths from backfire. */
export async function fetchDeadAccountKillerInfo(params: {
  publicClient: PublicClient | undefined;
  chainId: ChainId;
  victimAddress: `0x${string}`;
  victimName: string;
}): Promise<DeadAccountKillerInfo | null> {
  if (!params.publicClient) return null;
  const entry = await fetchLatestKillForVictim({
    publicClient: params.publicClient,
    chainId: params.chainId,
    victimAddress: params.victimAddress,
    victimName: params.victimName,
  });
  if (!entry) return null;
  return {
    killerName: entry.attackerName,
    killerAddress: entry.attackerAddress,
    timestamp: entry.timestamp,
    resultType: entry.resultType,
  };
}
