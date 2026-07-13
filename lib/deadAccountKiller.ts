// ─────────────────────────────────────────────────────────────────────────────
// Dead account — killer info service
//
// Reads the victim's most recent successful kill via the shared kill history
// service (KillSucceeded events when MafiaKill is live).
// Returns mock killer data while the contract is not deployed.
// ─────────────────────────────────────────────────────────────────────────────

import { type PublicClient, zeroAddress } from "viem";
import { CONTRACT_ADDRESSES, type ChainId } from "@/lib/contract";
import type { DeadAccountKillerInfo } from "@/lib/deadAccount";
import { fetchLatestKillForVictim } from "@/lib/killHistoryService";

function isKillContractLive(chainId: ChainId): boolean {
  const address = CONTRACT_ADDRESSES[chainId]?.kill ?? zeroAddress;
  return address !== zeroAddress;
}

/** Placeholder killer shown on the dead account page until MafiaKill is live. */
function getMockDeadAccountKillerInfo(): DeadAccountKillerInfo {
  return {
    killerName: "TonySoprano",
    killerAddress: "0x1111111111111111111111111111111111111111",
    timestamp: Math.floor(Date.now() / 1000) - 2 * 3600,
    resultType: 0,
  };
}

/**
 * Load killer information for a dead account.
 * Uses on-chain KillSucceeded events when live; mock data otherwise.
 */
export async function fetchDeadAccountKillerInfo(params: {
  publicClient: PublicClient | undefined;
  chainId: ChainId;
  victimAddress: `0x${string}`;
  victimName: string;
}): Promise<DeadAccountKillerInfo | null> {
  const { publicClient, chainId, victimAddress, victimName } = params;

  if (!isKillContractLive(chainId)) {
    if (publicClient) {
      const entry = await fetchLatestKillForVictim({
        publicClient,
        chainId,
        victimAddress,
        victimName,
      });
      if (entry) {
        return {
          killerName: entry.attackerName,
          killerAddress: entry.attackerAddress,
          timestamp: entry.timestamp,
          resultType: entry.resultType,
        };
      }
    }

    return getMockDeadAccountKillerInfo();
  }

  if (!publicClient) return null;

  const entry = await fetchLatestKillForVictim({
    publicClient,
    chainId,
    victimAddress,
    victimName,
  });

  if (!entry) return null;

  return {
    killerName: entry.attackerName,
    killerAddress: entry.attackerAddress,
    timestamp: entry.timestamp,
    resultType: entry.resultType,
  };
}
