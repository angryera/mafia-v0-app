// ─────────────────────────────────────────────────────────────────────────────
// Dead account — killer info service
//
// Reads the victim's most recent KillSucceeded event from the MafiaKill contract.
// Returns null when the contract is not deployed or no matching kill exists.
// ─────────────────────────────────────────────────────────────────────────────

import { type Abi, type PublicClient, zeroAddress } from "viem";
import type { ChainId } from "@/lib/contract";
import type { DeadAccountKillerInfo } from "@/lib/deadAccount";

/** Per-chain MafiaKill address. Set when deployed; zero address = not live. */
const KILL_CONTRACT_ADDRESSES: Record<ChainId, `0x${string}`> = {
  bnb: zeroAddress,
  pulse: zeroAddress,
};

/**
 * Minimal KillSucceeded event ABI for log decoding.
 * TODO(contract): align field names with the deployed MafiaKill contract.
 */
const KILL_SUCCEEDED_EVENT_ABI = [
  {
    type: "event",
    name: "KillSucceeded",
    inputs: [
      { name: "attacker", type: "address", indexed: true },
      { name: "victim", type: "address", indexed: true },
      { name: "attackerName", type: "string", indexed: false },
      { name: "victimName", type: "string", indexed: false },
      { name: "resultType", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const satisfies Abi;

function isKillContractLive(address: `0x${string}` | undefined): address is `0x${string}` {
  return Boolean(address && address !== zeroAddress);
}

function normalizeResultType(value: unknown): 0 | 1 | 2 | null {
  const n = Number(value);
  if (n === 0 || n === 1 || n === 2) return n;
  return null;
}

function victimMatches(
  logVictim: string | undefined,
  logVictimName: string | undefined,
  victimAddress: string,
  victimName: string,
): boolean {
  const addr = victimAddress.toLowerCase();
  if (logVictim && logVictim.toLowerCase() === addr) return true;
  const name = victimName.trim().toLowerCase();
  if (name && logVictimName && logVictimName.trim().toLowerCase() === name) {
    return true;
  }
  return false;
}

/**
 * Load killer information for a dead account from on-chain kill history.
 * Returns null when the kill contract is unavailable or no matching kill exists.
 */
export async function fetchDeadAccountKillerInfo(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  victimAddress: `0x${string}`;
  victimName: string;
}): Promise<DeadAccountKillerInfo | null> {
  const { publicClient, chainId, victimAddress, victimName } = params;
  const killAddress = KILL_CONTRACT_ADDRESSES[chainId];

  if (!isKillContractLive(killAddress)) {
    return null;
  }

  try {
    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock = latestBlock > BigInt(500_000) ? latestBlock - BigInt(500_000) : BigInt(0);

    const logs = await publicClient.getLogs({
      address: killAddress,
      event: KILL_SUCCEEDED_EVENT_ABI[0],
      fromBlock,
      toBlock: "latest",
    });

    if (!logs.length) return null;

    type DecodedKill = {
      attacker?: `0x${string}`;
      victim?: `0x${string}`;
      attackerName?: string;
      victimName?: string;
      resultType?: number;
      timestamp?: bigint;
      blockTimestamp?: bigint;
    };

    const matching: Array<{ decoded: DecodedKill; logIndex: bigint; blockNumber: bigint }> = [];

    for (const log of logs) {
      const args = log.args as DecodedKill | undefined;
      if (!args) continue;

      if (
        !victimMatches(
          args.victim,
          args.victimName,
          victimAddress,
          victimName,
        )
      ) {
        continue;
      }

      matching.push({
        decoded: args,
        logIndex: BigInt(log.logIndex),
        blockNumber: log.blockNumber,
      });
    }

    if (!matching.length) return null;

    matching.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber > b.blockNumber ? -1 : 1;
      }
      return a.logIndex > b.logIndex ? -1 : 1;
    });

    const latest = matching[0].decoded;
    const resultType = normalizeResultType(latest.resultType);
    if (resultType === null) return null;

    let timestamp = latest.timestamp !== undefined ? Number(latest.timestamp) : 0;
    if (!timestamp) {
      try {
        const block = await publicClient.getBlock({
          blockNumber: matching[0].blockNumber,
        });
        timestamp = Number(block.timestamp);
      } catch {
        timestamp = 0;
      }
    }

    const killerName =
      latest.attackerName?.trim() ||
      (latest.attacker ? `${latest.attacker.slice(0, 6)}...${latest.attacker.slice(-4)}` : "");

    if (!killerName) return null;

    return {
      killerName,
      killerAddress: latest.attacker,
      timestamp,
      resultType,
    };
  } catch {
    return null;
  }
}
