import { createPublicClient, http, isAddress, parseAbiItem, type PublicClient } from "viem";
import { bsc } from "viem/chains";

/** BNB's configured Binance RPC rejects eth_getLogs; this public RPC accepts it. */
export const BNB_KILL_LOG_PUBLIC_CLIENT = createPublicClient({
  chain: bsc,
  transport: http("https://bsc-rpc.publicnode.com"),
});

const KILL_DRAINED_EVENT = parseAbiItem(
  "event KillDrained(uint256 indexed killId, uint32 specIndex, uint32 drainedCount, bool specDone)",
);

/** Keep log queries within common public RPC block-range limits. */
const LOG_CHUNK_BLOCKS = 5_000n;
/** About a month of BNB Chain history at three-second blocks. */
const MAX_SCAN_BLOCKS = 1_000_000n;
const MAX_CONCURRENT_LOG_REQUESTS = 3;

export interface KillDrainEvent {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
  /** Registry asset-spec cursor, not a count of transferred assets. */
  specIndex: number;
  /** Count reported by this drain call, not a list of asset identities. */
  drainedCount: number;
  specDone: boolean;
}

export interface KillDrainEventHistory {
  events: KillDrainEvent[];
  fromBlock: bigint;
  toBlock: bigint;
}

export class KillDrainHistoryRangeError extends Error {
  constructor(fromBlock: bigint, toBlock: bigint) {
    super(
      `On-chain drain history spans ${toBlock - fromBlock + 1n} blocks, ` +
        `above the ${MAX_SCAN_BLOCKS}-block scan limit.`,
    );
    this.name = "KillDrainHistoryRangeError";
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("On-chain drain history request was cancelled.", "AbortError");
  }
}

async function findLastBlockAtOrBefore(
  publicClient: PublicClient,
  fromBlock: bigint,
  chainHead: bigint,
  unixSeconds: number,
  signal?: AbortSignal,
): Promise<bigint> {
  if (!Number.isSafeInteger(unixSeconds) || unixSeconds <= 0) {
    throw new Error("Invalid on-chain kill finish time.");
  }
  const finishTime = BigInt(unixSeconds);
  let low = fromBlock;
  let high = chainHead;
  let lastMatchingBlock = fromBlock - 1n;

  try {
    while (low <= high) {
      assertNotAborted(signal);
      const middle = low + (high - low) / 2n;
      const block = await publicClient.getBlock({ blockNumber: middle });
      assertNotAborted(signal);
      if (block.timestamp <= finishTime) {
        lastMatchingBlock = middle;
        low = middle + 1n;
      } else {
        high = middle - 1n;
      }
    }
  } catch (cause) {
    if (signal?.aborted) assertNotAborted(signal);
    throw new Error("Could not locate the kill finish block on chain.", { cause });
  }
  if (lastMatchingBlock < fromBlock) {
    throw new Error("On-chain kill finish time is before the attack request block.");
  }
  return lastMatchingBlock;
}

/**
 * Reads the registry's indexed KillDrained logs for one kill. The attack's
 * requestBlock is a conservative lower bound for the first possible drain.
 * For a completed kill, finishedAt bounds the scan at its on-chain finish
 * block. The returned snapshot is complete through toBlock, or this throws.
 *
 * The event contains progress and counts only. It cannot prove which specific
 * assets, amounts, or recipients were transferred.
 */
export async function getKillDrainEventHistory(params: {
  publicClient: PublicClient;
  /** Optional provider dedicated to event logs; block reads stay on publicClient. */
  logPublicClient?: PublicClient;
  registryAddress: `0x${string}`;
  killId: bigint;
  requestBlock: bigint;
  /** On-chain registry finishedAt, in Unix seconds. Pass only for finished kills. */
  finishedAt?: number;
  signal?: AbortSignal;
}): Promise<KillDrainEventHistory> {
  const { publicClient, logPublicClient, registryAddress, killId, requestBlock, finishedAt, signal } = params;
  if (!isAddress(registryAddress)) throw new Error("Invalid kill registry address.");
  if (killId < 0n) throw new Error("Invalid kill ID.");
  if (requestBlock < 0n) throw new Error("Invalid attack request block.");
  assertNotAborted(signal);

  const chainHead = await publicClient.getBlockNumber();
  assertNotAborted(signal);
  if (requestBlock > chainHead) {
    throw new Error("Attack request block is ahead of the current chain head.");
  }
  const toBlock = finishedAt === undefined || finishedAt === 0
    ? chainHead
    : await findLastBlockAtOrBefore(publicClient, requestBlock, chainHead, finishedAt, signal);
  if (toBlock - requestBlock + 1n > MAX_SCAN_BLOCKS) {
    throw new KillDrainHistoryRangeError(requestBlock, toBlock);
  }

  const events: KillDrainEvent[] = [];
  let nextFromBlock = requestBlock;
  let scanError: unknown;
  let stopped = false;
  const chunkCount = Number((toBlock - requestBlock) / LOG_CHUNK_BLOCKS + 1n);

  const worker = async () => {
    while (!stopped && nextFromBlock <= toBlock) {
      const fromBlock = nextFromBlock;
      nextFromBlock += LOG_CHUNK_BLOCKS;
      const chunkEnd = fromBlock + LOG_CHUNK_BLOCKS - 1n;
      const chunkToBlock = chunkEnd < toBlock ? chunkEnd : toBlock;
      try {
        assertNotAborted(signal);
        const logs = await (logPublicClient ?? publicClient).getLogs({
          address: registryAddress,
          event: KILL_DRAINED_EVENT,
          args: { killId },
          fromBlock,
          toBlock: chunkToBlock,
        });
        assertNotAborted(signal);
        for (const log of logs) {
          if (
            log.blockNumber === null ||
            log.logIndex === null ||
            log.transactionHash === null ||
            log.args.specIndex === undefined ||
            log.args.drainedCount === undefined ||
            log.args.specDone === undefined
          ) {
            throw new Error("Kill registry returned an incomplete drain event.");
          }
          events.push({
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            specIndex: Number(log.args.specIndex),
            drainedCount: Number(log.args.drainedCount),
            specDone: log.args.specDone,
          });
        }
      } catch (cause) {
        stopped = true;
        scanError ??= signal?.aborted
          ? new DOMException("On-chain drain history request was cancelled.", "AbortError")
          : new Error(
              `Could not read on-chain drain events in blocks ${fromBlock}-${chunkToBlock}.`,
              { cause },
            );
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(chunkCount, MAX_CONCURRENT_LOG_REQUESTS) }, worker));
  if (stopped) throw scanError;
  assertNotAborted(signal);

  events.sort((a, b) =>
    a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : a.logIndex - b.logIndex,
  );
  return { events, fromBlock: requestBlock, toBlock };
}
