"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { formatUnits, parseUnits, parseEther } from "viem";
import {
  XP_MARKET_ABI,
  RANK_ABI,
  KILLSKILL_CONTRACT_ABI,
  RACE_XP_ABI,
  RANK_XP,
  RANK_NAMES,
  ERC20_ABI,
} from "@/lib/contract";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  TrendingUp,
  Clock,
  DollarSign,
  Gavel,
  ChevronDown,
  AlertTriangle,
  List,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

// XP Types
const XP_TYPES = [
  { id: 0, label: "Rank XP", color: "text-primary" },
  { id: 1, label: "Kill Skill XP", color: "text-red-500" },
  { id: 2, label: "Bustout XP", color: "text-amber-500" },
  { id: 3, label: "Race XP", color: "text-cyan-500" },
];

// Duration options (in hours)
const DURATION_OPTIONS = [
  { hours: 24, label: "1D" },
  { hours: 72, label: "3D" },
  { hours: 168, label: "7D" },
  { hours: 720, label: "30D" },
];

// Zero address for native token
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// Max race XP constant
const MAX_RACE_XP = 5000;

// Confirmation delay multiplier
const CONFIRMATION_DELAY = 2;

type SwapToken = {
  name: string;
  tokenAddress: `0x${string}`;
  isStable: boolean;
  isEnabled: boolean;
  price: bigint;
  decimal: number;
  tokenId: number;
  formattedPrice: number;
};

type XPListing = {
  id: bigint;
  xpType: number;
  listingType: number;
  status: number;
  xpPoint: bigint;
  owner: `0x${string}`;
  buyer: `0x${string}`;
  startPrice: bigint;
  currentPrice: bigint;
  endTimestamp: bigint;
  listingToken: `0x${string}`;
  bids: {
    bidder: `0x${string}`;
    price: bigint;
    timestamp: bigint;
  }[];
};

type ViewMode = "create" | "listings";

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

export function XpMarketAction() {
  const [viewMode, setViewMode] = useState<ViewMode>("create");
  const [selectedXpType, setSelectedXpType] = useState<number | null>(null);
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(null);
  const [unitStartAmount, setUnitStartAmount] = useState<string>("");
  const [duration, setDuration] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isListXP, setIsListXP] = useState(false);
  const [xpTypeMenuOpen, setXpTypeMenuOpen] = useState(false);

  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData } = useAuth();
  const { toast } = useToast();

  // ────────────────────────────────────────────────────────────────
  // Contract Reads
  // ────────────────────────────────────────────────────────────────

  // Fetch swap tokens
  const { data: swapData, isLoading: swapLoading } = useReadContract({
    address: addresses.xpMarket,
    abi: XP_MARKET_ABI,
    functionName: "getSwapTokens",
    chainId: chainConfig.wagmiChainId,
  });

  const swapTokens: SwapToken[] = useMemo(() => {
    if (!swapData) return [];
    const result = swapData as unknown as readonly [
      readonly {
        name: string;
        decimal: number;
        tokenAddress: `0x${string}`;
        price: bigint;
        isStable: boolean;
        isEnabled: boolean;
      }[],
      readonly bigint[],
    ];
    if (!result[0] || !result[1]) return [];
    return result[0].map((t, index) => ({
      name: t.name,
      tokenAddress: t.tokenAddress,
      isStable: t.isStable,
      isEnabled: t.isEnabled,
      price: result[1][index],
      decimal: Number(t.decimal),
      tokenId: index,
      formattedPrice: Number(formatUnits(result[1][index], 18)),
    }));
  }, [swapData]);

  // For CREATING listings: Allow In-game Cash, BNB/PLS (native), and MAFIA tokens
  const listingTokens = swapTokens.filter((t) => {
    if (!t.isEnabled) return false;
    // Allow native token (BNB/PLS)
    if (t.tokenAddress === ZERO_ADDRESS) return true;
    // Allow MAFIA token
    if (t.tokenAddress.toLowerCase() === addresses.mafia.toLowerCase()) return true;
    // Allow In-game Cash token
    if (t.tokenAddress.toLowerCase() === addresses.cash.toLowerCase()) return true;
    return false;
  });

  // For PURCHASING listings: Allow BNB, MAFIA, USDT, USDC (stables)
  const purchaseTokens = swapTokens.filter((t) => {
    if (!t.isEnabled) return false;
    // Allow native token (BNB/PLS)
    if (t.tokenAddress === ZERO_ADDRESS) return true;
    // Allow MAFIA token
    if (t.tokenAddress.toLowerCase() === addresses.mafia.toLowerCase()) return true;
    // Allow stablecoins (USDT, USDC)
    if (t.isStable) return true;
    return false;
  });
  
  const selectedTokenInfo = listingTokens.find(
    (t) => t.tokenAddress === selectedToken
  );

  // Listing token quick-select options
  const nativeToken = listingTokens.find((t) => t.tokenAddress === ZERO_ADDRESS);
  const mafiaToken = listingTokens.find(
    (t) => t.tokenAddress.toLowerCase() === addresses.mafia.toLowerCase()
  );
  const cashToken = listingTokens.find(
    (t) => t.tokenAddress.toLowerCase() === addresses.cash.toLowerCase()
  );

  // Fetch user XP data
  const { data: rankLevelRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankLevel",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: rankXpRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankXp",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address },
  });

  const { data: killXpRaw } = useReadContract({
    address: addresses.killskill,
    abi: KILLSKILL_CONTRACT_ABI,
    functionName: "getSkillXp",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address },
  });

  const { data: bustXpRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getBustOutXp",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address },
  });

  const { data: raceXpRaw } = useReadContract({
    address: addresses.raceXp,
    abi: RACE_XP_ABI,
    functionName: "getXp",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address },
  });

  // Derived user XP info
  const rankNumber = rankLevelRaw !== undefined ? Number(rankLevelRaw) : null;
  const rankXp = rankXpRaw !== undefined ? Math.floor(Number(rankXpRaw) / 100) : null;
  const ksXp = killXpRaw !== undefined ? Number(killXpRaw) : null;
  const bustOutSkillXp = bustXpRaw !== undefined ? Number(bustXpRaw) : null;
  const raceXp = raceXpRaw !== undefined ? Number(raceXpRaw) : null;

  // Calculate rank percent - RANK_XP is now an array indexed by rank-1
  const rankPercent = useMemo(() => {
    if (rankNumber === null || rankXp === null) return null;
    // RANK_XP array: index 0 = rank 1, index 1 = rank 2, etc.
    const currentLevelIndex = rankNumber - 1;
    const nextLevelIndex = rankNumber;
    const currentLevelXp = RANK_XP[currentLevelIndex] ?? 0;
    const nextLevelXp = RANK_XP[nextLevelIndex];
    if (nextLevelXp === undefined || nextLevelIndex >= RANK_XP.length) return 100;
    const range = nextLevelXp - currentLevelXp;
    if (range <= 0) return 100;
    return Math.min(100, Math.max(0, ((rankXp - currentLevelXp) / range) * 100));
  }, [rankNumber, rankXp]);

  // Generate XP point info text
  const xpPointInfo = useMemo(() => {
    if (selectedXpType === null) return null;

    switch (selectedXpType) {
      case 0: // Rank XP
        if (rankNumber === null || rankPercent === null) return "Loading...";
        const rankName = RANK_NAMES[rankNumber] || `Level ${rankNumber}`;
        return `Rank XP - ${rankName} ${rankPercent.toFixed(2)}%`;
      case 1: // Kill Skill XP
        if (ksXp === null) return "Loading...";
        return `Kill skill XP - ${(ksXp / 10000).toFixed(2)}%`;
      case 2: // Bustout XP
        if (bustOutSkillXp === null) return "Loading...";
        return `Bustout XP - ${(bustOutSkillXp / 5000).toFixed(2)}%`;
      case 3: // Race XP
        if (raceXp === null) return "Loading...";
        return `Race XP - ${(raceXp / MAX_RACE_XP).toFixed(2)}%`;
      default:
        return null;
    }
  }, [selectedXpType, rankNumber, rankPercent, ksXp, bustOutSkillXp, raceXp]);

  // Estimated USD value
  const estimatedUsd = useMemo(() => {
    if (!selectedTokenInfo || !unitStartAmount) return null;
    const amount = Number(unitStartAmount);
    if (isNaN(amount) || amount <= 0) return null;
    return selectedTokenInfo.formattedPrice * amount;
  }, [selectedTokenInfo, unitStartAmount]);

  // ────────────────────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────────────────────

  const isXpTypeAvailable = useMemo(() => {
    if (selectedXpType === null) return false;
    if (!authData) return false;

    switch (selectedXpType) {
      case 0: // Rank XP - disabled when rankNumber === 1 && !rankPercent
        if (rankNumber === 1 && !rankPercent) return false;
        return true;
      case 1: // Kill XP - disabled when !ksXp
        return !!ksXp && ksXp > 0;
      case 2: // Bust XP - disabled when !bustOutSkillXp
        return !!bustOutSkillXp && bustOutSkillXp > 0;
      case 3: // Race XP - can proceed
        return true;
      default:
        return false;
    }
  }, [selectedXpType, authData, rankNumber, rankPercent, ksXp, bustOutSkillXp]);

  const isButtonDisabled = useMemo(() => {
    if (isListXP) return true;
    if (selectedXpType === null || !isXpTypeAvailable) return true;
    return false;
  }, [isListXP, selectedXpType, isXpTypeAvailable]);

  // ────────────────────────────────────────────────────────────────
  // Reset state when XP type changes
  // ────────────────────────────────────────────────────────────────

  useEffect(() => {
    setUnitStartAmount("");
    setDuration(null);
    setConfirmed(false);
  }, [selectedXpType]);

  // ────────────────────────────────────────────────────────────────
  // Contract Write
  // ────────────────────────────────────────────────────────────────

  const {
    writeContract: writeList,
    data: listHash,
    isPending: isListPending,
    error: listError,
    reset: resetList,
  } = useChainWriteContract();

  const { isLoading: isListConfirming, isSuccess: isListSuccess } =
    useWaitForTransactionReceipt({
      hash: listHash,
      confirmations: CONFIRMATION_DELAY,
    });

  useEffect(() => {
    if (isListSuccess) {
      setIsListXP(false);
      toast({
        title: "XP Listed Successfully",
        description: "Your XP has been listed on the market.",
      });
      // Reset form
      setSelectedXpType(null);
      setUnitStartAmount("");
      setDuration(null);
      setConfirmed(false);
    }
  }, [isListSuccess, toast]);

  useEffect(() => {
    if (listError) {
      setIsListXP(false);
    }
  }, [listError]);

  // ────────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────────

  const handleValidate = useCallback(() => {
    if (selectedXpType === null) {
      toast({
        title: "Validation Error",
        description: "Not select type",
        variant: "destructive",
      });
      return false;
    }
    if (selectedToken === null) {
      toast({
        title: "Validation Error",
        description: "Not select token",
        variant: "destructive",
      });
      return false;
    }
    if (!unitStartAmount || isNaN(Number(unitStartAmount)) || Number(unitStartAmount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Not select amount",
        variant: "destructive",
      });
      return false;
    }
    if (duration === null) {
      toast({
        title: "Validation Error",
        description: "Not select duration",
        variant: "destructive",
      });
      return false;
    }
    if (!confirmed) {
      toast({
        title: "Validation Error",
        description: "Not select confirm",
        variant: "destructive",
      });
      return false;
    }
    return true;
  }, [selectedXpType, selectedToken, unitStartAmount, duration, confirmed, toast]);

  const handleConfirm = useCallback(() => {
    if (!isConnected) {
      // Connect wallet - handled by ConnectButton
      return;
    }

    if (!handleValidate()) return;
    if (!selectedTokenInfo || duration === null) return;

    setIsListXP(true);
    resetList();

    // Convert duration to seconds
    const durationSeconds = BigInt(duration * 3600);

    // Convert start price to wei based on token decimals
    const startPriceWei = parseUnits(unitStartAmount, selectedTokenInfo.decimal);

    writeList({
      address: addresses.xpMarket,
      abi: XP_MARKET_ABI,
      functionName: "listXp",
      args: [
        selectedXpType!, // xpType (uint8)
        1, // listingType = 1 (auction) (uint8)
        selectedToken!, // listingToken
        startPriceWei, // startPrice
        durationSeconds, // duration
      ],
    });
  }, [
    isConnected,
    handleValidate,
    selectedTokenInfo,
    duration,
    resetList,
    writeList,
    addresses.xpMarket,
    selectedXpType,
    selectedToken,
    unitStartAmount,
  ]);

  const isLoading = isListPending || isListConfirming;

  // ────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────��────────────────────────

  return (
    <div>
      {/* Tab Toggle */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setViewMode("create")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            viewMode === "create"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <Plus className="h-4 w-4" />
          Create Listing
        </button>
        <button
          onClick={() => setViewMode("listings")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            viewMode === "listings"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <List className="h-4 w-4" />
          View Listings
        </button>
      </div>

      {viewMode === "create" ? (
        <CreateListingPanel
          selectedXpType={selectedXpType}
          setSelectedXpType={setSelectedXpType}
          selectedToken={selectedToken}
          setSelectedToken={setSelectedToken}
          unitStartAmount={unitStartAmount}
          setUnitStartAmount={setUnitStartAmount}
          duration={duration}
          setDuration={setDuration}
          confirmed={confirmed}
          setConfirmed={setConfirmed}
          xpTypeMenuOpen={xpTypeMenuOpen}
          setXpTypeMenuOpen={setXpTypeMenuOpen}
          swapLoading={swapLoading}
          nativeToken={nativeToken}
          mafiaToken={mafiaToken}
          cashToken={cashToken}
          xpPointInfo={xpPointInfo}
          estimatedUsd={estimatedUsd}
          isXpTypeAvailable={isXpTypeAvailable}
          isButtonDisabled={isButtonDisabled}
          isLoading={isLoading}
          isConnected={isConnected}
          handleConfirm={handleConfirm}
          listHash={listHash}
          listError={listError}
          isListSuccess={isListSuccess}
          explorer={explorer}
          chainConfig={chainConfig}
          authData={authData}
        />
      ) : (
        <ViewListingsPanel />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Create Listing Panel
// ────────────────────────────────────────────────────────────────

interface CreateListingPanelProps {
  selectedXpType: number | null;
  setSelectedXpType: (type: number | null) => void;
  selectedToken: `0x${string}` | null;
  setSelectedToken: (token: `0x${string}` | null) => void;
  unitStartAmount: string;
  setUnitStartAmount: (amount: string) => void;
  duration: number | null;
  setDuration: (duration: number | null) => void;
  confirmed: boolean;
  setConfirmed: (confirmed: boolean) => void;
  xpTypeMenuOpen: boolean;
  setXpTypeMenuOpen: (open: boolean) => void;
  swapLoading: boolean;
  nativeToken: SwapToken | undefined;
  mafiaToken: SwapToken | undefined;
  cashToken: SwapToken | undefined;
  xpPointInfo: string | null;
  estimatedUsd: number | null;
  isXpTypeAvailable: boolean;
  isButtonDisabled: boolean;
  isLoading: boolean;
  isConnected: boolean;
  handleConfirm: () => void;
  listHash: `0x${string}` | undefined;
  listError: Error | null;
  isListSuccess: boolean;
  explorer: string;
  chainConfig: ReturnType<typeof useChain>["chainConfig"];
  authData: ReturnType<typeof useAuth>["authData"];
}

function CreateListingPanel({
  selectedXpType,
  setSelectedXpType,
  selectedToken,
  setSelectedToken,
  unitStartAmount,
  setUnitStartAmount,
  duration,
  setDuration,
  confirmed,
  setConfirmed,
  xpTypeMenuOpen,
  setXpTypeMenuOpen,
  swapLoading,
  nativeToken,
  mafiaToken,
  cashToken,
  xpPointInfo,
  estimatedUsd,
  isXpTypeAvailable,
  isButtonDisabled,
  isLoading,
  isConnected,
  handleConfirm,
  listHash,
  listError,
  isListSuccess,
  explorer,
  chainConfig,
  authData,
}: CreateListingPanelProps) {
  const selectedXpTypeInfo = XP_TYPES.find((t) => t.id === selectedXpType);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Create XP Listing
          </h3>
        </div>

        {/* Sign in required warning */}
        {!authData && isConnected && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-400/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400">
              Please sign in (connect wallet and sign message) to view your XP data and create listings.
            </p>
          </div>
        )}

        {/* XP Type selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            XP Type
          </label>
          <div className="relative">
            <button
              onClick={() => setXpTypeMenuOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/30"
            >
              <span className={cn(
                "text-sm font-medium",
                selectedXpTypeInfo ? selectedXpTypeInfo.color : "text-muted-foreground"
              )}>
                {selectedXpTypeInfo?.label || "Select XP Type"}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  xpTypeMenuOpen && "rotate-180"
                )}
              />
            </button>

            {xpTypeMenuOpen && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-card shadow-lg">
                {XP_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedXpType(type.id);
                      setXpTypeMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/50 first:rounded-t-lg last:rounded-b-lg",
                      type.id === selectedXpType
                        ? "bg-primary/5 font-medium"
                        : ""
                    )}
                  >
                    <span className={type.color}>{type.label}</span>
                    {type.id === selectedXpType && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* XP Point Info */}
          {selectedXpType !== null && xpPointInfo && (
            <div className="mt-2 rounded-md bg-secondary/50 px-3 py-2">
              <p className={cn("text-xs font-medium", selectedXpTypeInfo?.color)}>
                {xpPointInfo}
              </p>
            </div>
          )}

          {/* XP Type Availability Warning */}
          {selectedXpType !== null && !isXpTypeAvailable && authData && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-red-400/10 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">
                You don&apos;t have enough {selectedXpTypeInfo?.label} to list.
              </p>
            </div>
          )}
        </div>

        {/* Bid Asset selector - In-game Cash, BNB/PLS, and MAFIA */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Payment Token
          </label>
          <div className="flex gap-2">
            {cashToken && (
              <button
                onClick={() => setSelectedToken(cashToken.tokenAddress)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-3 text-sm font-medium transition-all",
                  selectedToken === cashToken.tokenAddress
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>CASH</span>
                  <span className="text-[10px] text-muted-foreground">
                    ${cashToken.formattedPrice.toFixed(4)}
                  </span>
                </div>
              </button>
            )}
            {nativeToken && (
              <button
                onClick={() => setSelectedToken(nativeToken.tokenAddress)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-3 text-sm font-medium transition-all",
                  selectedToken === nativeToken.tokenAddress
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>{chainConfig.id === "bnb" ? "BNB" : "PLS"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    ${nativeToken.formattedPrice.toFixed(2)}
                  </span>
                </div>
              </button>
            )}
            {mafiaToken && (
              <button
                onClick={() => setSelectedToken(mafiaToken.tokenAddress)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-3 text-sm font-medium transition-all",
                  selectedToken === mafiaToken.tokenAddress
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>MAFIA</span>
                  <span className="text-[10px] text-muted-foreground">
                    ${mafiaToken.formattedPrice.toFixed(4)}
                  </span>
                </div>
              </button>
            )}
          </div>
          {swapLoading && (
            <p className="mt-2 text-xs text-muted-foreground">Loading tokens...</p>
          )}
        </div>

        {/* Unit Start Amount */}
        <div>
          <label
            htmlFor="start-amount"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Starting Bid Amount
          </label>
          <input
            id="start-amount"
            type="text"
            inputMode="decimal"
            value={unitStartAmount}
            onChange={(e) => setUnitStartAmount(e.target.value)}
            placeholder="0.00"
            className="h-10 w-full rounded-lg border border-border bg-background px-4 text-foreground outline-none ring-primary/50 transition-all focus:border-primary focus:ring-2 placeholder:text-muted-foreground font-mono"
          />

          {/* Estimated USD value */}
          {estimatedUsd !== null && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-foreground">
                Estimated value:{" "}
                <span className="font-semibold text-primary">
                  ${estimatedUsd.toFixed(2)} USD
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Duration selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Duration
          </label>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                onClick={() => setDuration(opt.hours)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                  duration === opt.hours
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Confirmation checkbox */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3">
          <input
            type="checkbox"
            id="confirm-terms"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary/50"
          />
          <label
            htmlFor="confirm-terms"
            className="text-xs leading-relaxed text-muted-foreground cursor-pointer"
          >
            I confirm that I fully understand the terms and conditions of listing XP items
          </label>
        </div>

        {/* Transaction status */}
        {isListSuccess && listHash && (
          <div className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
            <span className="shrink-0 text-[10px] text-green-400 mr-1">
              Listed:
            </span>
            <a
              href={`${explorer}/tx/${listHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
            >
              {listHash.slice(0, 10)}...{listHash.slice(-8)}
            </a>
          </div>
        )}
        {listError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
            <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-400 line-clamp-2">
              {listError.message.includes("User rejected")
                ? "Transaction rejected by user"
                : listError.message.split("\n")[0]}
            </p>
          </div>
        )}

        {/* Submit button */}
        {isConnected ? (
          <button
            onClick={handleConfirm}
            disabled={isButtonDisabled || isLoading}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all",
              isButtonDisabled || isLoading
                ? "bg-secondary text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Listing XP...
              </>
            ) : (
              <>
                <Gavel className="h-4 w-4" />
                List XP for Auction
              </>
            )}
          </button>
        ) : (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        )}

        {/* Contract info */}
        <div className="rounded-md bg-background/50 px-3 py-2 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Function</span>
            <span className="font-mono text-primary">
              listXp(uint8, uint8, address, uint256, uint256)
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">XP Type</span>
            <span className="font-mono text-foreground">
              {selectedXpType !== null ? selectedXpType : "-"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">Duration (seconds)</span>
            <span className="font-mono text-foreground">
              {duration !== null ? duration * 3600 : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// View Listings Panel
// ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

function ViewListingsPanel() {
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { address } = useAccount();
  const [listings, setListings] = useState<XPListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showExpired, setShowExpired] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch listings using window.XpMarket.getXpListings (v9 SDK - only accepts pageSize)
  useEffect(() => {
    const fetchListings = async () => {
      setListingsLoading(true);
      try {
        // Check if window.XpMarket is available
        if (typeof window !== "undefined" && (window as any).XpMarket?.getXpListings) {
          const result = await (window as any).XpMarket.getXpListings({
            chain: chainConfig.id,
            pageSize: 100, // Fetch up to 100 listings
          });
          
          if (result && Array.isArray(result)) {
            // Map the result to our XPListing type
            const mappedListings: XPListing[] = result.map((item: any) => ({
              id: BigInt(item.id),
              xpType: Number(item.xpType),
              listingType: Number(item.listingType),
              status: Number(item.status),
              xpPoint: BigInt(item.xpPoint),
              owner: item.owner as `0x${string}`,
              buyer: item.buyer as `0x${string}`,
              startPrice: BigInt(item.startPrice),
              currentPrice: BigInt(item.currentPrice),
              endTimestamp: BigInt(item.endTimestamp),
              listingToken: item.listingToken as `0x${string}`,
              bids: (item.bids || []).map((bid: any) => ({
                bidder: bid.bidder as `0x${string}`,
                price: BigInt(bid.price),
                timestamp: BigInt(bid.timestamp),
              })),
            }));
            setListings(mappedListings);
            setTotalCount(mappedListings.length);
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching XP listings:", error);
      } finally {
        setListingsLoading(false);
      }
    };

    fetchListings();
  }, [chainConfig.id]);

  // Filter listings based on active/expired status
  const now = Math.floor(Date.now() / 1000);
  
  const filteredListings = useMemo(() => {
    // status = 0 means active listing, but we also check if time has expired
    const activeStatus = listings.filter((l) => l.status === 0);
    
    if (showExpired) {
      // Show expired: time has passed but status is still 0 (not finalized)
      return activeStatus.filter((l) => Number(l.endTimestamp) < now);
    } else {
      // Show active: time has not passed
      return activeStatus.filter((l) => Number(l.endTimestamp) >= now);
    }
  }, [listings, showExpired, now]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredListings.length / ITEMS_PER_PAGE));
  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredListings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredListings, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [showExpired]);

  const activeCount = listings.filter((l) => l.status === 0 && Number(l.endTimestamp) >= now).length;
  const expiredCount = listings.filter((l) => l.status === 0 && Number(l.endTimestamp) < now).length;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              XP Listings
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {filteredListings.length} {showExpired ? "expired" : "active"} / {totalCount} total
          </span>
        </div>

        {/* Active/Expired Toggle */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-2">
          <button
            onClick={() => setShowExpired(false)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              !showExpired
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Active ({activeCount})
          </button>
          <button
            onClick={() => setShowExpired(true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              showExpired
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-4 w-4" />
            Expired ({expiredCount})
          </button>
        </div>
      </div>

      {listingsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : paginatedListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-secondary/50 p-4 mb-3">
            <Gavel className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No {showExpired ? "expired" : "active"} listings
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {showExpired 
              ? "Expired listings will appear here once auctions end."
              : "Be the first to list your XP on the market!"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedListings.map((listing) => (
              <ListingCard
                key={listing.id.toString()}
                listing={listing}
                explorer={explorer}
                isOwn={address?.toLowerCase() === listing.owner.toLowerCase()}
                chainConfig={chainConfig}
                mafiaAddress={addresses.mafia}
                cashAddress={addresses.cash}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  currentPage === 1
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-md text-sm font-medium transition-all",
                      page === currentPage
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  currentPage === totalPages
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Listing Card Component
// ────────────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: XPListing;
  explorer: string;
  isOwn: boolean;
  chainConfig: ReturnType<typeof useChain>["chainConfig"];
  mafiaAddress: `0x${string}`;
  cashAddress: `0x${string}`;
}

function ListingCard({ listing, explorer, isOwn, chainConfig, mafiaAddress, cashAddress }: ListingCardProps) {
  const xpType = XP_TYPES.find((t) => t.id === listing.xpType);
  const now = Math.floor(Date.now() / 1000);
  const endTime = Number(listing.endTimestamp);
  const isExpired = endTime < now;
  const timeLeft = endTime - now;

  // Get token name based on listing token
  const getTokenName = () => {
    if (listing.listingToken === ZERO_ADDRESS) {
      return chainConfig.id === "bnb" ? "BNB" : "PLS";
    }
    if (listing.listingToken.toLowerCase() === mafiaAddress.toLowerCase()) {
      return "MAFIA";
    }
    if (listing.listingToken.toLowerCase() === cashAddress.toLowerCase()) {
      return "CASH";
    }
    return "TOKEN";
  };

  // Format XP point information
  const formatXpInfo = () => {
    const xpPoint = Number(listing.xpPoint);
    
    switch (listing.xpType) {
      case 0: // Rank XP
        // Find rank level from xpPoint - RANK_XP is array indexed by rank-1
        let rankNumber = 1;
        for (let i = RANK_XP.length - 1; i >= 0; i--) {
          if (xpPoint >= RANK_XP[i]) {
            rankNumber = i + 1; // Convert index to rank number
            break;
          }
        }
        const rankName = RANK_NAMES[rankNumber] || `Level ${rankNumber}`;
        
        // Calculate percent to next rank
        const currentLevelIndex = rankNumber - 1;
        const nextLevelIndex = rankNumber;
        const currentLevelXp = RANK_XP[currentLevelIndex] ?? 0;
        const nextLevelXp = RANK_XP[nextLevelIndex];
        let percent = 0;
        if (nextLevelXp !== undefined && nextLevelIndex < RANK_XP.length) {
          const range = nextLevelXp - currentLevelXp;
          if (range > 0) {
            percent = Math.min(100, Math.max(0, ((xpPoint - currentLevelXp) / range) * 100));
          }
        } else {
          percent = 100;
        }
        return {
          main: `${rankName}`,
          sub: `${percent.toFixed(2)}% to next rank`,
          xpValue: xpPoint.toLocaleString(),
        };
      
      case 1: // Kill Skill XP
        return {
          main: `Kill Skill`,
          sub: `${(xpPoint / 10000).toFixed(4)}%`,
          xpValue: xpPoint.toLocaleString(),
        };
      
      case 2: // Bustout XP
        return {
          main: `Bustout`,
          sub: `${(xpPoint / 5000).toFixed(4)}%`,
          xpValue: xpPoint.toLocaleString(),
        };
      
      case 3: // Race XP
        return {
          main: `Race`,
          sub: `${(xpPoint / MAX_RACE_XP).toFixed(4)}%`,
          xpValue: xpPoint.toLocaleString(),
        };
      
      default:
        return {
          main: `Unknown`,
          sub: ``,
          xpValue: xpPoint.toLocaleString(),
        };
    }
  };

  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return "Expired";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const tokenName = getTokenName();
  const xpInfo = formatXpInfo();

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        isOwn
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background/50",
        isExpired && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-sm font-semibold",
                xpType?.color || "text-foreground"
              )}
            >
              {xpType?.label || `XP Type ${listing.xpType}`}
            </span>
            {isOwn && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Your Listing
              </span>
            )}
          </div>
          
          {/* XP Information */}
          <div className="mb-1.5 rounded-md bg-secondary/30 px-2 py-1.5">
            <div className="flex items-center justify-between">
              <span className={cn("text-xs font-medium", xpType?.color || "text-foreground")}>
                {xpInfo.main}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {xpInfo.xpValue} XP
              </span>
            </div>
            {xpInfo.sub && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {xpInfo.sub}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground truncate">
            Owner: {listing.owner.slice(0, 8)}...{listing.owner.slice(-6)}
          </p>
        </div>

        <div className="text-right shrink-0">
          {/* Price with token name */}
          <div className="flex items-center gap-1 justify-end">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <p className="font-mono text-sm font-semibold text-foreground">
              {Number(formatUnits(listing.currentPrice, 18)).toFixed(4)}
            </p>
            <span className="text-xs text-primary font-medium">{tokenName}</span>
          </div>
          
          {/* Start price */}
          {listing.startPrice !== listing.currentPrice && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Start: {Number(formatUnits(listing.startPrice, 18)).toFixed(4)} {tokenName}
            </p>
          )}

          <div className="flex items-center gap-1 justify-end mt-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span
              className={cn(
                "text-[10px]",
                isExpired ? "text-red-400" : "text-muted-foreground"
              )}
            >
              {formatTimeLeft(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {/* Bids info */}
      {listing.bids.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            {listing.bids.length} bid{listing.bids.length !== 1 ? "s" : ""} -
            Current: {listing.bids[listing.bids.length - 1]?.bidder.slice(0, 6)}...
          </p>
        </div>
      )}
    </div>
  );
}
