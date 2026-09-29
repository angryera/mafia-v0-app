"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Abi } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useChain } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import { CHAIN_CONFIGS, SWAP_ROUTER_ABI } from "@/lib/contract";
import {
  DEPLOYMENT_LIMIT,
  EMPTY_DIRECTORY,
  FTS_ABI,
  FTS_MARKET_ABI,
  FTS_SUBSCRIPTION_ABI,
  HOLDER_PAGE_SIZE,
  LISTING_LIMIT,
  PRICE_HISTORY_LIMIT,
  ZERO_ADDRESS,
  deriveFts,
  errorText,
  fromWei,
  getFtsNetwork,
  parseDeployment,
  parseHolderPage,
  parseListing,
  parsePriceHistory,
  parseSwapPrices,
  rankHolders,
  type FtsDeployment,
  type FtsListing,
  type FtsNetwork,
  type FtsSnapshot,
  type ProfileDirectory,
  type SettlementAsset,
} from "@/features/fts/lib/fts";

type ChainClient = NonNullable<ReturnType<typeof usePublicClient>>;

type WriteRequest = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

function capped(count: bigint, cap: bigint): bigint {
  return count > cap ? cap : count;
}

async function loadListings(
  client: ChainClient,
  network: FtsNetwork,
  length: bigint,
  account: `0x${string}` | undefined,
): Promise<FtsListing[]> {
  const count = Number(length);
  if (count === 0) return [];
  const results = await client.multicall({
    allowFailure: true,
    contracts: Array.from({ length: count }, (_, id) => ({
      address: network.market,
      abi: FTS_MARKET_ABI,
      functionName: "getListing" as const,
      args: [BigInt(id)] as const,
    })),
  });
  const listings: FtsListing[] = [];
  results.forEach((result, id) => {
    if (result.status === "success") listings.push(parseListing(result.result, id, account));
  });
  if (listings.length === 0) throw new Error("Could not load founder-share auctions.");
  return listings;
}

async function loadDeployments(
  client: ChainClient,
  network: FtsNetwork,
  length: bigint,
  account: `0x${string}` | undefined,
): Promise<FtsDeployment[]> {
  if (length === BigInt(0)) return [];
  const raw = await client.readContract({
    address: network.subscription,
    abi: FTS_SUBSCRIPTION_ABI,
    functionName: "getDeployments",
    args: [BigInt(0), length],
  });
  if (!Array.isArray(raw)) throw new Error("Unexpected deployments");
  const deployments = raw.map((item, index) => parseDeployment(item, index));
  if (!account || deployments.length === 0) return deployments;

  const subs = await client.multicall({
    allowFailure: true,
    contracts: deployments.map((deployment) => ({
      address: network.subscription,
      abi: FTS_SUBSCRIPTION_ABI,
      functionName: "userSubscription" as const,
      args: [BigInt(deployment.id), account] as const,
    })),
  });

  return deployments.map((deployment, index) => {
    const result = subs[index];
    if (!result || result.status !== "success") return deployment;
    const heldAmount = fromWei(result.result);
    return { ...deployment, heldAmount, subscribed: heldAmount > 0 };
  });
}

async function loadHolders(client: ChainClient, network: FtsNetwork, holdersCount: bigint) {
  const entries: { address: `0x${string}`; balance: bigint }[] = [];
  for (let start = BigInt(0); start < holdersCount; start += HOLDER_PAGE_SIZE) {
    const length = holdersCount - start > HOLDER_PAGE_SIZE ? HOLDER_PAGE_SIZE : holdersCount - start;
    const page = await client.readContract({
      address: network.fts,
      abi: FTS_ABI,
      functionName: "getHolders",
      args: [start, length],
    });
    entries.push(...parseHolderPage(page));
  }
  return rankHolders(entries);
}

async function loadSnapshot(
  client: ChainClient,
  network: FtsNetwork,
  account: `0x${string}` | undefined,
): Promise<FtsSnapshot> {
  const [
    balanceWei,
    totalSupplyWei,
    holdersCount,
    listingsCount,
    bidIncrease,
    fee,
    historyCount,
    deploymentsCount,
    minSubscriptionWei,
  ] = await Promise.all([
    account
      ? client.readContract({
          address: network.fts,
          abi: FTS_ABI,
          functionName: "balanceOf",
          args: [account],
        })
      : Promise.resolve(BigInt(0)),
    client.readContract({ address: network.fts, abi: FTS_ABI, functionName: "totalSupply" }),
    client.readContract({ address: network.fts, abi: FTS_ABI, functionName: "holdersCount" }),
    client.readContract({ address: network.market, abi: FTS_MARKET_ABI, functionName: "listingsCount" }),
    client.readContract({ address: network.market, abi: FTS_MARKET_ABI, functionName: "bidIncreasePercent" }),
    client.readContract({ address: network.market, abi: FTS_MARKET_ABI, functionName: "feePercent" }),
    client.readContract({ address: network.market, abi: FTS_MARKET_ABI, functionName: "priceHistoryCount" }),
    client.readContract({
      address: network.subscription,
      abi: FTS_SUBSCRIPTION_ABI,
      functionName: "deploymentsCount",
    }),
    client.readContract({
      address: network.subscription,
      abi: FTS_SUBSCRIPTION_ABI,
      functionName: "minSubscription",
    }),
  ]);

  const historyLength = capped(historyCount, PRICE_HISTORY_LIMIT);
  const [priceHistory, listings, deployments, holders] = await Promise.all([
    historyLength > BigInt(0)
      ? client
          .readContract({
            address: network.market,
            abi: FTS_MARKET_ABI,
            functionName: "getPriceHistory",
            args: [historyCount - historyLength, historyLength],
          })
          .then(parsePriceHistory)
      : Promise.resolve([]),
    loadListings(client, network, capped(listingsCount, LISTING_LIMIT), account),
    loadDeployments(client, network, capped(deploymentsCount, DEPLOYMENT_LIMIT), account),
    loadHolders(client, network, holdersCount),
  ]);

  return {
    chainId: network.chainId,
    loadedAccount: account ?? null,
    balanceWei,
    balance: fromWei(balanceWei),
    totalSupply: fromWei(totalSupplyWei),
    listingsCount: Number(listingsCount),
    bidIncreasePercent: Number(bidIncrease),
    feePercent: Number(fee),
    minSubscriptionWei,
    minSubscription: fromWei(minSubscriptionWei),
    priceHistory,
    listings,
    deployments,
    holders,
  };
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function useFoundersShares() {
  const { address, chainId: walletChainId } = useAccount();
  const { chainConfig } = useChain();
  const chainId = walletChainId ?? chainConfig.wagmiChainId;
  const network = getFtsNetwork(chainId);
  const deployed = network != null;
  const nativeSymbol = network?.nativeSymbol ?? (chainId === 369 ? "PLS" : "BNB");
  const publicClient = usePublicClient({ chainId });
  const helperWrite = useChainWriteContract();
  const directWrite = useWriteContract();
  const profileStatus = useMafiaUtilsScript("MafiaProfile");

  const swapRouter = network ? CHAIN_CONFIGS[network.profileChain].addresses.swapRouter : undefined;
  const { data: swapData } = useReadContract({
    address: swapRouter,
    abi: SWAP_ROUTER_ABI,
    functionName: "getSwapTokens",
    chainId,
    query: { enabled: Boolean(swapRouter && deployed) },
  });
  const prices = useMemo(() => parseSwapPrices(swapData, network?.mafia), [swapData, network?.mafia]);

  const [directory, setDirectory] = useState<ProfileDirectory>(EMPTY_DIRECTORY);
  const [snapshot, setSnapshot] = useState<FtsSnapshot | null>(null);
  const [failure, setFailure] = useState<{ chainId: number; message: string } | null>(null);
  const [cardPending, setCardPending] = useState<{ id: number; kind: "settle" | "cancel" } | null>(null);

  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const clientRef = useRef(publicClient);
  const networkRef = useRef(network);
  const addressRef = useRef(address);

  useEffect(() => {
    clientRef.current = publicClient;
    networkRef.current = network;
    addressRef.current = address;
  }, [publicClient, network, address]);

  const load = useCallback(async () => {
    const current = networkRef.current;
    const client = clientRef.current;
    if (!current || !client) return;
    const requestId = ++requestRef.current;
    const requestedChain = current.chainId;
    try {
      const next = await loadSnapshot(client, current, addressRef.current);
      if (requestId !== requestRef.current) return;
      setSnapshot(next);
      setFailure(null);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setFailure({ chainId: requestedChain, message: errorText(err) });
    }
  }, []);

  useEffect(() => {
    if (!deployed || !publicClient) return;
    void load();
  }, [deployed, publicClient, address, chainId, load]);

  useEffect(() => {
    if (!network || profileStatus !== "ready" || !window.MafiaProfile) return;
    let cancelled = false;
    window.MafiaProfile
      .getUsersInfo({ chain: network.profileChain })
      .then((users: { user?: string; name?: string }[]) => {
        if (cancelled) return;
        const byAddress: Record<string, string> = {};
        const byName: Record<string, string> = {};
        for (const user of users) {
          const key = user.user?.toLowerCase();
          const name = user.name?.trim();
          if (!key || !name || !user.user) continue;
          byAddress[key] = name;
          const nameKey = name.toLowerCase();
          if (!byName[nameKey]) byName[nameKey] = user.user;
        }
        setDirectory({ byAddress, byName });
      })
      .catch(() => {
        if (!cancelled) setDirectory(EMPTY_DIRECTORY);
      });
    return () => {
      cancelled = true;
    };
  }, [network, profileStatus]);

  const error = failure && failure.chainId === chainId ? failure.message : null;
  const derived = useMemo(
    () => deriveFts(snapshot, address, chainId, network?.initialSupply ?? 0),
    [snapshot, address, chainId, network?.initialSupply],
  );
  const activeSnapshot = snapshot?.chainId === chainId ? snapshot : null;

  const write = useCallback(
    async (request: WriteRequest) => {
      const client = clientRef.current;
      if (!client) throw new Error("Network not ready");
      const hash =
        chainId === chainConfig.wagmiChainId
          ? await helperWrite.writeContractAsync(request as Parameters<typeof helperWrite.writeContractAsync>[0])
          : await directWrite.writeContractAsync({
              ...request,
              chainId,
            } as Parameters<typeof directWrite.writeContractAsync>[0]);
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") throw new Error("Transaction reverted");
    },
    [chainConfig.wagmiChainId, chainId, directWrite, helperWrite],
  );

  const ensureAllowance = useCallback(
    async (token: `0x${string}`, spender: `0x${string}`, amount: bigint, tokenName: string) => {
      const client = clientRef.current;
      const owner = addressRef.current;
      if (!client || !owner) throw new Error("Connect your wallet");
      const allowance = await client.readContract({
        address: token,
        abi: FTS_ABI,
        functionName: "allowance",
        args: [owner, spender],
      });
      if (allowance >= amount) return;
      toast.info(`Approve ${tokenName}`, {
        description: "Confirm the approval in your wallet, then continue.",
      });
      await write({
        address: token,
        abi: FTS_ABI,
        functionName: "approve",
        args: [spender, amount],
      });
    },
    [write],
  );

  const runLabeled = useCallback(
    async (label: string, send: () => Promise<void>, lock: boolean) => {
      if (lock) {
        if (busyRef.current) return false;
        busyRef.current = true;
      }
      toast.info(`${label} pending`, {
        description: "Confirm in your wallet. This may take a moment.",
      });
      try {
        await send();
        toast.success(`${label} confirmed`);
        await load();
        return true;
      } catch (err) {
        toast.error(`${label} failed`, { description: errorText(err) });
        return false;
      } finally {
        if (lock) busyRef.current = false;
      }
    },
    [load],
  );

  const transfer = useCallback(
    async (to: `0x${string}`, amount: bigint) => {
      const current = networkRef.current;
      const owner = addressRef.current;
      if (!current || !owner) {
        toast.error("FTS transfer failed", { description: "Connect your wallet" });
        return false;
      }
      if (to.toLowerCase() === owner.toLowerCase()) {
        toast.error("FTS transfer failed", {
          description: "You cannot transfer founder shares to yourself.",
        });
        return false;
      }
      return runLabeled(
        "FTS transfer",
        () =>
          write({
            address: current.fts,
            abi: FTS_ABI,
            functionName: "transfer",
            args: [to, amount],
          }),
        true,
      );
    },
    [runLabeled, write],
  );

  const listShares = useCallback(
    async (shareAmount: bigint, asset: SettlementAsset, startAmount: bigint, durationDays: number) => {
      const current = networkRef.current;
      if (!current || busyRef.current) return false;
      busyRef.current = true;
      try {
        try {
          await ensureAllowance(current.fts, current.market, shareAmount, "FTS");
        } catch (err) {
          toast.error("Approve FTS failed", { description: errorText(err) });
          return false;
        }
        const listingToken = asset === "native" ? ZERO_ADDRESS : current.mafia;
        return await runLabeled(
          "Listing",
          () =>
            write({
              address: current.market,
              abi: FTS_MARKET_ABI,
              functionName: "list",
              args: [shareAmount, listingToken, startAmount, BigInt(durationDays) * BigInt(86400)],
            }),
          false,
        );
      } finally {
        busyRef.current = false;
      }
    },
    [ensureAllowance, runLabeled, write],
  );

  const placeBid = useCallback(
    async (id: number, amount: bigint, asset: SettlementAsset) => {
      const current = networkRef.current;
      if (!current || busyRef.current) return false;
      busyRef.current = true;
      try {
        if (asset === "mafia") {
          try {
            await ensureAllowance(current.mafia, current.market, amount, "MAFIA");
          } catch (err) {
            toast.error("Approve MAFIA failed", { description: errorText(err) });
            return false;
          }
        }
        return await runLabeled(
          "Bid",
          () =>
            write({
              address: current.market,
              abi: FTS_MARKET_ABI,
              functionName: "bid",
              args: [BigInt(id), amount],
              value: asset === "native" ? amount : undefined,
            }),
          false,
        );
      } finally {
        busyRef.current = false;
      }
    },
    [ensureAllowance, runLabeled, write],
  );

  const cancelAuction = useCallback(
    async (id: number) => {
      const current = networkRef.current;
      if (!current || busyRef.current) return false;
      setCardPending({ id, kind: "cancel" });
      try {
        return await runLabeled(
          "Cancellation",
          () =>
            write({
              address: current.market,
              abi: FTS_MARKET_ABI,
              functionName: "cancel",
              args: [BigInt(id)],
            }),
          true,
        );
      } finally {
        setCardPending(null);
      }
    },
    [runLabeled, write],
  );

  const settleAuction = useCallback(
    async (id: number) => {
      const current = networkRef.current;
      if (!current || busyRef.current) return false;
      setCardPending({ id, kind: "settle" });
      try {
        return await runLabeled(
          "Auction settlement",
          () =>
            write({
              address: current.market,
              abi: FTS_MARKET_ABI,
              functionName: "finish",
              args: [BigInt(id)],
            }),
          true,
        );
      } finally {
        setCardPending(null);
      }
    },
    [runLabeled, write],
  );

  const subscribe = useCallback(
    async (deploymentId: number, amount: bigint) => {
      const current = networkRef.current;
      if (!current || busyRef.current) return false;
      busyRef.current = true;
      try {
        try {
          await ensureAllowance(current.fts, current.subscription, amount, "FTS");
        } catch (err) {
          toast.error("Approve FTS failed", { description: errorText(err) });
          return false;
        }
        return await runLabeled(
          "Subscription",
          () =>
            write({
              address: current.subscription,
              abi: FTS_SUBSCRIPTION_ABI,
              functionName: "subscribe",
              args: [BigInt(deploymentId), amount],
            }),
          false,
        );
      } finally {
        busyRef.current = false;
      }
    },
    [ensureAllowance, runLabeled, write],
  );

  return {
    deployed,
    nativeSymbol,
    initialLoading: deployed && !activeSnapshot && !error,
    error,
    prices,
    directory,
    derived,
    cardPending,
    transfer,
    listShares,
    placeBid,
    cancelAuction,
    settleAuction,
    subscribe,
  };
}
