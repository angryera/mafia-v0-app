// ─────────────────────────────────────────────────────────────────────────────
// Kill history — shared data service
//
// Single source for KillSucceeded reads used by kill-history and dead-account.
// On-chain when MafiaKill is deployed; temporary mock entries until then.
// ─────────────────────────────────────────────────────────────────────────────

import {
  type Abi,
  type PublicClient,
  zeroAddress,
} from "viem";
import { CONTRACT_ADDRESSES, type ChainId } from "@/lib/contract";

export type KillResultType = 0 | 1 | 2;

export interface KillHistoryEntry {
  id: string;
  timestamp: number;
  attackerName: string;
  attackerAddress?: `0x${string}`;
  victimName: string;
  victimAddress?: `0x${string}`;
  resultType: KillResultType;
  attackerBullets?: number;
  backfireBullets?: number;
}

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

// TODO(contract): remove once MafiaKill KillSucceeded events are live on all chains.
const NOW = Math.floor(Date.now() / 1000);
const HOUR = 3600;

const DEV_KILL_HISTORY: KillHistoryEntry[] = [
  {
    id: "kill-1",
    timestamp: NOW - 2 * HOUR,
    attackerName: "TonySoprano",
    attackerAddress: "0x1111111111111111111111111111111111111111",
    victimName: "PaulieWalnuts",
    victimAddress: "0x2222222222222222222222222222222222222222",
    resultType: 0,
    attackerBullets: 12500,
  },
  {
    id: "kill-2",
    timestamp: NOW - 8 * HOUR,
    attackerName: "VitoCorleone",
    attackerAddress: "0x3333333333333333333333333333333333333333",
    victimName: "Salvatore",
    victimAddress: "0x4444444444444444444444444444444444444444",
    resultType: 1,
    attackerBullets: 48000,
    backfireBullets: 31000,
  },
  {
    id: "kill-3",
    timestamp: NOW - 14 * HOUR,
    attackerName: "Christopher",
    attackerAddress: "0x5555555555555555555555555555555555555555",
    victimName: "TonySoprano",
    victimAddress: "0x1111111111111111111111111111111111111111",
    resultType: 2,
    attackerBullets: 9000,
    backfireBullets: 22000,
  },
  {
    id: "kill-4",
    timestamp: NOW - 26 * HOUR,
    attackerName: "Silvio",
    attackerAddress: "0x6666666666666666666666666666666666666666",
    victimName: "Adriana",
    victimAddress: "0x7777777777777777777777777777777777777777",
    resultType: 0,
    attackerBullets: 8500,
  },
  {
    id: "kill-5",
    timestamp: NOW - 36 * HOUR,
    attackerName: "Salvatore",
    attackerAddress: "0x4444444444444444444444444444444444444444",
    victimName: "VitoCorleone",
    victimAddress: "0x3333333333333333333333333333333333333333",
    resultType: 2,
    attackerBullets: 40000,
    backfireBullets: 150000,
  },
  {
    id: "kill-6",
    timestamp: NOW - 52 * HOUR,
    attackerName: "PaulieWalnuts",
    attackerAddress: "0x2222222222222222222222222222222222222222",
    victimName: "Christopher",
    victimAddress: "0x5555555555555555555555555555555555555555",
    resultType: 1,
    attackerBullets: 96000,
    backfireBullets: 58000,
  },
];

function getKillContractAddress(chainId: ChainId): `0x${string}` {
  return CONTRACT_ADDRESSES[chainId].kill ?? zeroAddress;
}

function isKillContractLive(address: `0x${string}`): boolean {
  return address !== zeroAddress;
}

function normalizeResultType(value: unknown): KillResultType | null {
  const n = Number(value);
  if (n === 0 || n === 1 || n === 2) return n;
  return null;
}

function victimMatchesEntry(
  entry: KillHistoryEntry,
  victimAddress: string,
  victimName: string,
): boolean {
  const addr = victimAddress.toLowerCase();
  if (entry.victimAddress && entry.victimAddress.toLowerCase() === addr) {
    return true;
  }
  const name = victimName.trim().toLowerCase();
  if (name && entry.victimName.trim().toLowerCase() === name) {
    return true;
  }
  return false;
}

type KillSucceededLog = {
  args: {
    attacker?: `0x${string}`;
    victim?: `0x${string}`;
    attackerName?: string;
    victimName?: string;
    resultType?: number;
    timestamp?: bigint;
  };
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
};

async function mapLogToEntry(
  publicClient: PublicClient,
  log: KillSucceededLog,
): Promise<KillHistoryEntry | null> {
  const args = log.args as {
    attacker?: `0x${string}`;
    victim?: `0x${string}`;
    attackerName?: string;
    victimName?: string;
    resultType?: number;
    timestamp?: bigint;
  };

  const resultType = normalizeResultType(args.resultType);
  if (resultType === null) return null;

  let timestamp = args.timestamp !== undefined ? Number(args.timestamp) : 0;
  if (!timestamp) {
    try {
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
      timestamp = Number(block.timestamp);
    } catch {
      timestamp = 0;
    }
  }

  const attackerName = args.attackerName?.trim();
  const victimName = args.victimName?.trim();
  if (!attackerName || !victimName) return null;

  return {
    id: `${log.transactionHash}-${log.logIndex}`,
    timestamp,
    attackerName,
    attackerAddress: args.attacker,
    victimName,
    victimAddress: args.victim,
    resultType,
  };
}

async function fetchOnChainKillHistory(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  victimAddress?: `0x${string}`;
}): Promise<KillHistoryEntry[]> {
  const { publicClient, chainId, victimAddress } = params;
  const killAddress = getKillContractAddress(chainId);

  if (!isKillContractLive(killAddress)) {
    return [];
  }

  try {
    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock =
      latestBlock > BigInt(500_000) ? latestBlock - BigInt(500_000) : BigInt(0);

    const logs = await publicClient.getLogs({
      address: killAddress,
      event: KILL_SUCCEEDED_EVENT_ABI[0],
      args: victimAddress ? { victim: victimAddress } : undefined,
      fromBlock,
      toBlock: "latest",
    });

    const entries: KillHistoryEntry[] = [];
    for (const log of logs) {
      const entry = await mapLogToEntry(publicClient, log as KillSucceededLog);
      if (entry) entries.push(entry);
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);
    return entries;
  } catch {
    return [];
  }
}

function fetchDevKillHistory(victimAddress?: string, victimName?: string): KillHistoryEntry[] {
  if (!victimAddress && !victimName?.trim()) {
    return [...DEV_KILL_HISTORY].sort((a, b) => b.timestamp - a.timestamp);
  }

  return DEV_KILL_HISTORY.filter((entry) =>
    victimMatchesEntry(entry, victimAddress ?? "", victimName ?? ""),
  ).sort((a, b) => b.timestamp - a.timestamp);
}

/** All successful kills — on-chain when live, dev entries otherwise. */
export async function fetchKillHistory(params: {
  publicClient: PublicClient;
  chainId: ChainId;
}): Promise<KillHistoryEntry[]> {
  const onChain = await fetchOnChainKillHistory({
    publicClient: params.publicClient,
    chainId: params.chainId,
  });

  if (onChain.length > 0) {
    return onChain;
  }

  if (isKillContractLive(getKillContractAddress(params.chainId))) {
    return [];
  }

  return fetchDevKillHistory();
}

/** Most recent kill where the given wallet/name was the victim. */
export async function fetchLatestKillForVictim(params: {
  publicClient: PublicClient;
  chainId: ChainId;
  victimAddress: `0x${string}`;
  victimName: string;
}): Promise<KillHistoryEntry | null> {
  const { publicClient, chainId, victimAddress, victimName } = params;

  const onChain = await fetchOnChainKillHistory({
    publicClient,
    chainId,
    victimAddress,
  });

  const onChainMatch = onChain.find((entry) =>
    victimMatchesEntry(entry, victimAddress, victimName),
  );
  if (onChainMatch) return onChainMatch;

  if (isKillContractLive(getKillContractAddress(chainId))) {
    return null;
  }

  const devMatches = fetchDevKillHistory(victimAddress, victimName);
  return devMatches[0] ?? null;
}
