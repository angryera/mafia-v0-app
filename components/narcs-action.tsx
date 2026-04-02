"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useReadContract,
  usePublicClient,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  USER_PROFILE_CONTRACT_ABI,
  TRAVEL_DESTINATIONS,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
  SMUGGLE_MARKET_ABI,
  NARCS_TYPES,
} from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  MapPin,
  RefreshCw,
  Timer,
  Pill,
  ShoppingCart,
  Minus,
  Plus,
  Lock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEther, parseEther, decodeEventLog } from "viem";

interface ProfileData {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
}

interface SmugglingGood {
  id: number;
  owner: string;
  categoryId: number;
  typeId: number;
  isSold: boolean;
}

// Count holdings by typeId
function countHoldingsByType(holdings: SmugglingGood[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (let i = 0; i < 7; i++) counts[i] = 0;
  for (const good of holdings) {
    counts[good.typeId] = (counts[good.typeId] || 0) + 1;
  }
  return counts;
}

export function NarcsAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData, isSigning: authSigning, requestSignature } = useAuth();
  const publicClient = usePublicClient();

  // ---------- State ----------
  const [holdings, setHoldings] = useState<SmugglingGood[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [prices, setPrices] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [narcsLimit, setNarcsLimit] = useState<number>(10);
  const [nextNarcsTime, setNextNarcsTime] = useState<number>(0);
  const [buyAmounts, setBuyAmounts] = useState<Record<number, number>>({});
  const [sellAmounts, setSellAmounts] = useState<Record<number, number>>({});
  const [mode, setMode] = useState<"buy" | "sell">("buy");

  // ---------- User profile ----------
  const { data: profileData } = useReadContract({
    address: addresses.travel as `0x${string}`,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args: address && authData
      ? [address, authData.message, authData.signature as `0x${string}`]
      : undefined,
    query: { enabled: !!address && !!authData },
  });

  // Profile is returned as an object from the contract, not an array
  // Memoize profile to prevent infinite re-renders in useCallback dependencies
  const profile: ProfileData | null = useMemo(() => {
    if (!profileData) return null;
    return {
      profileId: (profileData as { profileId: bigint }).profileId,
      username: (profileData as { username: string }).username,
      cityId: Number((profileData as { cityId: bigint | number }).cityId),
      isActive: (profileData as { isActive: boolean }).isActive,
    };
  }, [profileData]);

  const cityName = profile ? TRAVEL_DESTINATIONS[profile.cityId]?.label || `City ${profile.cityId}` : "Unknown";

  // ---------- Fetch holdings with pagination ----------
  const fetchHoldings = useCallback(async () => {
    if (!address || !publicClient || !addresses.smuggleMarket) return;
    setHoldingsLoading(true);
    try {
      const allGoods: SmugglingGood[] = [];
      const PAGE_SIZE = 100;
      let startIndex = 0;
      let hasMore = true;

      while (hasMore) {
        const goods = await publicClient.readContract({
          address: addresses.smuggleMarket as `0x${string}`,
          abi: SMUGGLE_MARKET_ABI,
          functionName: "getUserGoods",
          args: [address, BigInt(startIndex), BigInt(PAGE_SIZE)],
        }) as { id: number; owner: string; categoryId: number; typeId: number; isSold: boolean }[];

        if (!goods || goods.length === 0) {
          hasMore = false;
          break;
        }

        // Filter for narcs (categoryId === 1) and not sold
        const narcsGoods = goods
          .filter((good) => Number(good.categoryId) === 1 && !good.isSold)
          .map((good) => ({
            id: Number(good.id),
            owner: good.owner,
            categoryId: Number(good.categoryId),
            typeId: Number(good.typeId),
            isSold: good.isSold,
          }));

        allGoods.push(...narcsGoods);

        if (goods.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          startIndex += PAGE_SIZE;
        }
      }

      setHoldings(allGoods);
    } catch (error) {
      console.error("Error fetching holdings:", error);
    } finally {
      setHoldingsLoading(false);
    }
  }, [address, publicClient, addresses.smuggleMarket]);

  // ---------- Fetch prices ----------
  const fetchPrices = useCallback(async () => {
    if (!profile || !publicClient || !addresses.smuggleMarket) return;
    // Validate cityId is a valid number before making contract call
    const cityId = profile.cityId;
    if (typeof cityId !== "number" || isNaN(cityId) || cityId < 0) {
      console.error("Invalid cityId:", cityId);
      return;
    }
    setPricesLoading(true);
    try {
      const result = await publicClient.readContract({
        address: addresses.smuggleMarket as `0x${string}`,
        abi: SMUGGLE_MARKET_ABI,
        functionName: "getCityMarketPrice",
        args: [cityId],
      }) as [bigint[], bigint[]];

      const narcsPrices = result[1].map((p) => Number(formatEther(p)));
      setPrices(narcsPrices);
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      setPricesLoading(false);
    }
  }, [profile, publicClient, addresses.smuggleMarket]);

  // ---------- Fetch limits and cooldown ----------
  const { data: limitsData } = useReadContract({
    address: addresses.smuggleMarket as `0x${string}`,
    abi: SMUGGLE_MARKET_ABI,
    functionName: "getAmountLimit",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!addresses.smuggleMarket },
  });

  const { data: nextTimeData, refetch: refetchNextTime } = useReadContract({
    address: addresses.smuggleMarket as `0x${string}`,
    abi: SMUGGLE_MARKET_ABI,
    functionName: "nextNarcsTime",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!addresses.smuggleMarket },
  });

  useEffect(() => {
    if (limitsData) {
      setNarcsLimit(Number((limitsData as [bigint, bigint])[1]));
    }
  }, [limitsData]);

  useEffect(() => {
    if (nextTimeData) {
      setNextNarcsTime(Number(nextTimeData));
    }
  }, [nextTimeData]);

  useEffect(() => {
    if (profile) {
      fetchPrices();
      fetchHoldings();
    }
  }, [profile, fetchPrices, fetchHoldings]);

  // ---------- Allowance check ----------
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: addresses.ingameCurrency as `0x${string}`,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowance",
    args: address ? [address, addresses.smuggleMarket] : undefined,
    query: { enabled: !!address && !!addresses.smuggleMarket },
  });

  const currentAllowance = allowanceData ? BigInt(allowanceData as bigint) : 0n;

  // ---------- Transaction state ----------
  const {
    writeContractAsync: writeApprove,
    data: approveHash,
    isPending: approvePending,
    reset: resetApprove,
  } = useChainWriteContract();

  const {
    writeContractAsync: writeBuy,
    data: buyHash,
    isPending: buyPending,
    reset: resetBuy,
  } = useChainWriteContract();

  const {
    writeContractAsync: writeSell,
    data: sellHash,
    isPending: sellPending,
    reset: resetSell,
  } = useChainWriteContract();

  // ---------- Transaction receipt tracking for jail detection ----------
  const { data: buyReceipt, isLoading: buyConfirming } = useWaitForTransactionReceipt({
    hash: buyHash,
  });

  const { data: sellReceipt, isLoading: sellConfirming } = useWaitForTransactionReceipt({
    hash: sellHash,
  });

  // Track shown toasts to prevent duplicates
  const buyToastShownRef = useRef<string | null>(null);
  const sellToastShownRef = useRef<string | null>(null);

  // Parse buy transaction result
  const buyResult = useMemo(() => {
    if (!buyReceipt?.logs) return null;
    for (const log of buyReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: SMUGGLE_MARKET_ABI,
          data: log.data,
          topics: log.topics,
          strict: false,
        });
        if (decoded.eventName === "NarcsBuy") {
          const args = decoded.args as {
            buyer: `0x${string}`;
            isSuccess: boolean;
            isJailed: boolean;
            totalUserNarcsCount: number;
            cashAmount: bigint;
            xpPoint: bigint;
            nextNarcsTime: bigint;
            timestamp: bigint;
          };
          // Determine result status: Success, Jailed, or Failed
          const status = args.isSuccess ? "success" : args.isJailed ? "jailed" : "failed";
          return {
            status,
            isSuccess: args.isSuccess,
            isJailed: args.isJailed,
            cashAmount: Number(formatEther(args.cashAmount)),
            totalUserNarcsCount: Number(args.totalUserNarcsCount),
            xpPoint: Number(args.xpPoint),
          };
        }
      } catch {
        // Not our event, skip
      }
    }
    return null;
  }, [buyReceipt]);

  // Parse sell transaction result
  const sellResult = useMemo(() => {
    if (!sellReceipt?.logs) return null;
    for (const log of sellReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: SMUGGLE_MARKET_ABI,
          data: log.data,
          topics: log.topics,
          strict: false,
        });
        if (decoded.eventName === "NarcsSell") {
          const args = decoded.args as {
            seller: `0x${string}`;
            isSuccess: boolean;
            isJailed: boolean;
            totalUserNarcsCount: number;
            cashAmount: bigint;
            xpPoint: bigint;
            nextNarcsTime: bigint;
            timestamp: bigint;
          };
          // Determine result status: Success, Jailed, or Failed
          const status = args.isSuccess ? "success" : args.isJailed ? "jailed" : "failed";
          return {
            status,
            isSuccess: args.isSuccess,
            isJailed: args.isJailed,
            cashAmount: Number(formatEther(args.cashAmount)),
            totalUserNarcsCount: Number(args.totalUserNarcsCount),
            xpPoint: Number(args.xpPoint),
          };
        }
      } catch {
        // Not our event, skip
      }
    }
    return null;
  }, [sellReceipt]);

  // Show toast notifications based on transaction results
  useEffect(() => {
    if (!buyResult || !buyHash || buyToastShownRef.current === buyHash) return;
    buyToastShownRef.current = buyHash;

    if (buyResult.status === "success") {
      toast.success(`Successfully bought narcotics! You now have ${buyResult.totalUserNarcsCount} items. Cost: $${buyResult.cashAmount.toLocaleString()}`);
    } else if (buyResult.status === "jailed") {
      toast.error("You were caught and jailed while buying narcotics!", {
        icon: <Lock className="h-4 w-4 text-red-400" />,
      });
    } else {
      // Failed status
      toast.error("Failed to buy narcotics. The transaction did not succeed.", {
        icon: <XCircle className="h-4 w-4 text-red-400" />,
      });
    }
    
    // Refresh data
    fetchHoldings();
    fetchPrices();
    refetchNextTime();
  }, [buyResult, buyHash, fetchHoldings, fetchPrices, refetchNextTime]);

  useEffect(() => {
    if (!sellResult || !sellHash || sellToastShownRef.current === sellHash) return;
    sellToastShownRef.current = sellHash;

    if (sellResult.status === "success") {
      toast.success(`Successfully sold narcotics for $${sellResult.cashAmount.toLocaleString()}! You now have ${sellResult.totalUserNarcsCount} items.`);
    } else if (sellResult.status === "jailed") {
      toast.error("You were caught and jailed while selling narcotics!", {
        icon: <Lock className="h-4 w-4 text-red-400" />,
      });
    } else {
      // Failed status
      toast.error("Failed to sell narcotics. The transaction did not succeed.", {
        icon: <XCircle className="h-4 w-4 text-red-400" />,
      });
    }
    
    // Refresh data
    fetchHoldings();
    fetchPrices();
    refetchNextTime();
  }, [sellResult, sellHash, fetchHoldings, fetchPrices, refetchNextTime]);

  // ---------- Calculations ----------
  const holdingsCounts = countHoldingsByType(holdings);
  const totalHoldings = holdings.length;

  const totalBuyAmount = Object.values(buyAmounts).reduce((sum, val) => sum + val, 0);
  const totalBuyPrice = Object.entries(buyAmounts).reduce(
    (sum, [typeId, amount]) => sum + prices[Number(typeId)] * amount,
    0
  );

  const totalSellAmount = Object.values(sellAmounts).reduce((sum, val) => sum + val, 0);
  const totalSellPrice = Object.entries(sellAmounts).reduce(
    (sum, [typeId, amount]) => sum + prices[Number(typeId)] * amount,
    0
  );

  // Check if cooldown has passed
  const now = Math.floor(Date.now() / 1000);
  const canTransact = now >= nextNarcsTime;
  const cooldownRemaining = Math.max(0, nextNarcsTime - now);

  // Format cooldown time
  const formatCooldown = (seconds: number): string => {
    if (seconds <= 0) return "Now!";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // ---------- Handlers ----------
  const setBuyAmount = (typeId: number, amount: number) => {
    const maxAllowed = narcsLimit - totalHoldings;
    const current = Object.entries(buyAmounts)
      .filter(([id]) => Number(id) !== typeId)
      .reduce((sum, [, val]) => sum + val, 0);
    const maxForThis = Math.max(0, maxAllowed - current);
    const clamped = Math.max(0, Math.min(amount, maxForThis));
    setBuyAmounts((prev) => ({ ...prev, [typeId]: clamped }));
  };

  const setSellAmount = (typeId: number, amount: number) => {
    const maxForThis = holdingsCounts[typeId] || 0;
    const clamped = Math.max(0, Math.min(amount, maxForThis));
    setSellAmounts((prev) => ({ ...prev, [typeId]: clamped }));
  };

  const handleBuy = async () => {
    if (!address || !authData) {
      await requestSignature();
      return;
    }

    if (totalBuyAmount === 0) {
      toast.error("Select at least one item to buy");
      return;
    }

    if (!canTransact) {
      toast.error("Cooldown active, please wait");
      return;
    }

    // Build types array
    const types: number[] = [];
    for (const [typeId, amount] of Object.entries(buyAmounts)) {
      for (let i = 0; i < amount; i++) {
        types.push(Number(typeId));
      }
    }

    // Check allowance
    const requiredAllowance = parseEther(totalBuyPrice.toString());
    if (currentAllowance < requiredAllowance) {
      try {
        await writeApprove({
          address: addresses.ingameCurrency as `0x${string}`,
          abi: INGAME_CURRENCY_ABI,
          functionName: "approveInGameCurrency",
          args: [addresses.smuggleMarket, INGAME_CURRENCY_APPROVE_AMOUNT],
        });
        toast.success("Approval submitted, waiting for confirmation...");
        await refetchAllowance();
      } catch (error) {
        console.error("Approval error:", error);
        toast.error("Failed to approve spending");
        return;
      }
    }

    try {
      await writeBuy({
        address: addresses.smuggleMarket as `0x${string}`,
        abi: SMUGGLE_MARKET_ABI,
        functionName: "buyNarcs",
        args: [types, authData.message, authData.signature],
      });
      // Toast will be shown after transaction is confirmed and event is parsed
      setBuyAmounts({});
    } catch (error) {
      console.error("Buy error:", error);
      toast.error("Failed to buy narcotics");
    }
  };

  const handleSell = async () => {
    if (!address || !authData) {
      await requestSignature();
      return;
    }

    if (totalSellAmount === 0) {
      toast.error("Select at least one item to sell");
      return;
    }

    if (!canTransact) {
      toast.error("Cooldown active, please wait");
      return;
    }

    // Build itemIds array from holdings
    const itemIds: number[] = [];
    for (const [typeId, amount] of Object.entries(sellAmounts)) {
      const typeHoldings = holdings.filter((h) => h.typeId === Number(typeId));
      for (let i = 0; i < amount && i < typeHoldings.length; i++) {
        itemIds.push(typeHoldings[i].id);
      }
    }

    try {
      await writeSell({
        address: addresses.smuggleMarket as `0x${string}`,
        abi: SMUGGLE_MARKET_ABI,
        functionName: "sellNarcs",
        args: [itemIds, authData.message, authData.signature],
      });
      // Toast will be shown after transaction is confirmed and event is parsed
      setSellAmounts({});
    } catch (error) {
      console.error("Sell error:", error);
      toast.error("Failed to sell narcotics");
    }
  };

  // ---------- Render ----------
  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Pill className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Connect Wallet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Connect your wallet to access the Narcotics Warehouse
          </p>
        </div>
      </div>
    );
  }

  if (!authData) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Pill className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sign Message</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Sign a message to authenticate with the contract
          </p>
          <button
            onClick={() => requestSignature()}
            disabled={authSigning}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {authSigning && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">City:</span>
              <span className="font-medium text-foreground">{cityName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Pill className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Holdings:</span>
              <span className="font-medium text-foreground">{totalHoldings} / {narcsLimit}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Next action:</span>
              <span className={cn("font-medium", canTransact ? "text-green-500" : "text-amber-500")}>
                {formatCooldown(cooldownRemaining)}
              </span>
            </div>
            <button
              onClick={() => {
                fetchHoldings();
                fetchPrices();
                refetchNextTime();
              }}
              disabled={holdingsLoading || pricesLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (holdingsLoading || pricesLoading) && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("buy")}
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            mode === "buy"
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          Buy Narcotics
        </button>
        <button
          onClick={() => setMode("sell")}
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            mode === "sell"
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          Sell Narcotics
        </button>
      </div>

      {/* Product list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Holdings
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(NARCS_TYPES).map(([typeIdStr, name]) => {
              const typeId = Number(typeIdStr);
              const price = prices[typeId] || 0;
              const holdingCount = holdingsCounts[typeId] || 0;
              const amount = mode === "buy" ? (buyAmounts[typeId] || 0) : (sellAmounts[typeId] || 0);
              const total = price * amount;

              return (
                <tr key={typeId} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Pill className="h-5 w-5 text-purple-400" />
                      <span className="font-medium text-foreground">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {pricesLoading ? (
                      <div className="h-4 w-16 animate-pulse rounded bg-muted ml-auto" />
                    ) : (
                      <span className="font-mono text-sm text-foreground">
                        ${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm text-muted-foreground">{holdingCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          mode === "buy"
                            ? setBuyAmount(typeId, amount - 1)
                            : setSellAmount(typeId, amount - 1)
                        }
                        disabled={amount <= 0}
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={mode === "buy" ? narcsLimit - totalHoldings : holdingCount}
                        value={amount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          mode === "buy"
                            ? setBuyAmount(typeId, val)
                            : setSellAmount(typeId, val);
                        }}
                        className="w-14 rounded border border-border bg-background px-2 py-1 text-center text-sm font-mono"
                      />
                      <button
                        onClick={() =>
                          mode === "buy"
                            ? setBuyAmount(typeId, amount + 1)
                            : setSellAmount(typeId, amount + 1)
                        }
                        disabled={
                          mode === "buy"
                            ? totalBuyAmount >= narcsLimit - totalHoldings
                            : amount >= holdingCount
                        }
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      {mode === "sell" && holdingCount > 0 && (
                        <button
                          onClick={() => setSellAmount(typeId, holdingCount)}
                          className="text-xs text-primary hover:underline ml-1"
                        >
                          All
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm text-foreground">
                      ${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td colSpan={3} className="px-4 py-3">
                <span className="font-semibold text-foreground">
                  Total Order: {mode === "buy" ? totalBuyAmount : totalSellAmount} items
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={mode === "buy" ? handleBuy : handleSell}
                  disabled={
                    (mode === "buy" 
                      ? buyPending || buyConfirming || totalBuyAmount === 0 
                      : sellPending || sellConfirming || totalSellAmount === 0) ||
                    !canTransact
                  }
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                    mode === "buy"
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-red-500 text-white hover:bg-red-600"
                  )}
                >
                  {(buyPending || sellPending || buyConfirming || sellConfirming) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <ShoppingCart className="h-4 w-4" />
                  {mode === "buy" 
                    ? (buyPending ? "Confirm in wallet..." : buyConfirming ? "Confirming..." : "Buy")
                    : (sellPending ? "Confirm in wallet..." : sellConfirming ? "Confirming..." : "Sell")}
                </button>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-mono font-semibold text-foreground">
                  ${(mode === "buy" ? totalBuyPrice : totalSellPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
