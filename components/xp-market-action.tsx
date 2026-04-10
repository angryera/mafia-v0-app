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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  const swapTokenByAddress = useMemo(() => {
    const map = new Map<string, SwapToken>();
    for (const token of swapTokens) {
      map.set(token.tokenAddress.toLowerCase(), token);
    }
    return map;
  }, [swapTokens]);

  // For CREATING listings: only allow native token (BNB/PLS) and MAFIA.
  // These options are always available and are not sourced from swap token list.
  const listingTokens = useMemo<SwapToken[]>(() => {
    const nativeFromSwap = swapTokenByAddress.get(ZERO_ADDRESS.toLowerCase());
    const mafiaFromSwap = swapTokenByAddress.get(addresses.mafia.toLowerCase());

    return [
      nativeFromSwap ?? {
        name: chainConfig.id === "bnb" ? "BNB" : "PLS",
        tokenAddress: ZERO_ADDRESS,
        isStable: false,
        isEnabled: true,
        price: BigInt(0),
        decimal: 18,
        tokenId: 0,
        formattedPrice: 0,
      },
      mafiaFromSwap ?? {
        name: "MAFIA",
        tokenAddress: addresses.mafia,
        isStable: false,
        isEnabled: true,
        price: BigInt(0),
        decimal: 18,
        tokenId: 1,
        formattedPrice: 0,
      },
    ];
  }, [swapTokenByAddress, chainConfig.id, addresses.mafia]);

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
  const rankXp = rankXpRaw !== undefined ? Number(rankXpRaw) : null;
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
              onClick={() => setXpTypeMenuOpen(!xpTypeMenuOpen)}
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

        {/* Bid Asset selector - Native token and MAFIA */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Payment Token
          </label>
          <div className="flex gap-2">
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
                    {nativeToken.formattedPrice.toFixed(2)}
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
                    {mafiaToken.formattedPrice.toFixed(4)}
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
type ListingsFilter = "active" | "finishable" | "expired";

function ViewListingsPanel() {
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { address } = useAccount();
  const { toast } = useToast();
  const [listings, setListings] = useState<XPListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [listingsFilter, setListingsFilter] = useState<ListingsFilter>("active");
  const [showMyListings, setShowMyListings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cancelingListingId, setCancelingListingId] = useState<bigint | null>(null);
  const [finishingListingId, setFinishingListingId] = useState<bigint | null>(null);
  const [biddingListing, setBiddingListing] = useState<XPListing | null>(null);

  const {
    writeContract: writeCancelListing,
    data: cancelHash,
    isPending: cancelPending,
    error: cancelError,
    reset: resetCancel,
  } = useChainWriteContract();
  const { isLoading: cancelConfirming, isSuccess: isCancelSuccess } =
    useWaitForTransactionReceipt({ hash: cancelHash });
  const {
    writeContract: writeFinishListing,
    data: finishHash,
    isPending: finishPending,
    error: finishError,
    reset: resetFinish,
  } = useChainWriteContract();
  const { isLoading: finishConfirming, isSuccess: isFinishSuccess } =
    useWaitForTransactionReceipt({ hash: finishHash });
  const {
    writeContract: writeBid,
    data: bidHash,
    isPending: bidPending,
    error: bidError,
    reset: resetBid,
  } = useChainWriteContract();
  const { isLoading: bidConfirming, isSuccess: isBidSuccess } =
    useWaitForTransactionReceipt({ hash: bidHash });
  const {
    writeContract: writeApproveBidToken,
    data: approveBidTokenHash,
    isPending: approveBidTokenPending,
    error: approveBidTokenError,
    reset: resetApproveBidToken,
  } = useChainWriteContract();
  const { isLoading: approveBidTokenConfirming, isSuccess: isApproveBidTokenSuccess } =
    useWaitForTransactionReceipt({ hash: approveBidTokenHash });

  const { data: swapData } = useReadContract({
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

  const swapTokenByAddress = useMemo(() => {
    const map = new Map<string, SwapToken>();
    for (const token of swapTokens) {
      map.set(token.tokenAddress.toLowerCase(), token);
    }
    return map;
  }, [swapTokens]);

  const isMafiaBidToken =
    !!biddingListing &&
    biddingListing.listingToken.toLowerCase() === addresses.mafia.toLowerCase();
  const { data: mafiaBidAllowanceRaw, refetch: refetchMafiaBidAllowance } = useReadContract({
    address: addresses.mafia,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, addresses.xpMarket] : undefined,
    chainId: chainConfig.wagmiChainId,
    query: {
      enabled: !!address && !!biddingListing && isMafiaBidToken,
    },
  });

  // Fetch listings using window.XpMarket.getXpListings (v9 SDK - only accepts pageSize)
  const fetchListings = useCallback(async () => {
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
  }, [chainConfig.id]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (isCancelSuccess && cancelHash) {
      toast({
        title: "Listing Cancelled",
        description: "Your XP listing was cancelled successfully.",
      });
      setCancelingListingId(null);
      fetchListings();
      resetCancel();
    }
  }, [isCancelSuccess, cancelHash, toast, fetchListings, resetCancel]);

  useEffect(() => {
    if (!cancelError) return;
    toast({
      variant: "destructive",
      title: "Cancel Failed",
      description: cancelError.message.includes("User rejected")
        ? "Transaction rejected by user."
        : cancelError.message.split("\n")[0],
    });
    setCancelingListingId(null);
  }, [cancelError, toast]);

  useEffect(() => {
    if (isFinishSuccess && finishHash) {
      toast({
        title: "Listing Finished",
        description: "Auction has been finished successfully.",
      });
      setFinishingListingId(null);
      fetchListings();
      resetFinish();
    }
  }, [isFinishSuccess, finishHash, toast, fetchListings, resetFinish]);

  useEffect(() => {
    if (!finishError) return;
    toast({
      variant: "destructive",
      title: "Finish Failed",
      description: finishError.message.includes("User rejected")
        ? "Transaction rejected by user."
        : finishError.message.split("\n")[0],
    });
    setFinishingListingId(null);
  }, [finishError, toast]);

  useEffect(() => {
    if (isBidSuccess && bidHash) {
      toast({
        title: "Bid Submitted",
        description: "Your bid has been placed successfully.",
      });
      setBiddingListing(null);
      fetchListings();
      resetBid();
    }
  }, [isBidSuccess, bidHash, toast, fetchListings, resetBid]);

  useEffect(() => {
    if (!bidError) return;
    toast({
      variant: "destructive",
      title: "Bid Failed",
      description: bidError.message.includes("User rejected")
        ? "Transaction rejected by user."
        : bidError.message.split("\n")[0],
    });
  }, [bidError, toast]);

  useEffect(() => {
    if (isApproveBidTokenSuccess && approveBidTokenHash) {
      toast({
        title: "MAFIA Approved",
        description: "You can now place your bid.",
      });
      refetchMafiaBidAllowance();
    }
  }, [isApproveBidTokenSuccess, approveBidTokenHash, toast, refetchMafiaBidAllowance]);

  useEffect(() => {
    if (!approveBidTokenError) return;
    toast({
      variant: "destructive",
      title: "Approval Failed",
      description: approveBidTokenError.message.includes("User rejected")
        ? "Transaction rejected by user."
        : approveBidTokenError.message.split("\n")[0],
    });
  }, [approveBidTokenError, toast]);

  const handleCancelListing = useCallback(
    (listingId: bigint) => {
      if (!address) {
        toast({
          variant: "destructive",
          title: "Wallet Required",
          description: "Connect wallet to cancel listing.",
        });
        return;
      }

      setCancelingListingId(listingId);
      resetCancel();
      writeCancelListing({
        address: addresses.xpMarket,
        abi: XP_MARKET_ABI,
        functionName: "cancelListing",
        args: [listingId],
        chainId: chainConfig.wagmiChainId,
      });
    },
    [address, toast, resetCancel, writeCancelListing, addresses.xpMarket, chainConfig.wagmiChainId],
  );

  const handleFinishListing = useCallback(
    (listingId: bigint) => {
      if (!address) {
        toast({
          variant: "destructive",
          title: "Wallet Required",
          description: "Connect wallet to finish listing.",
        });
        return;
      }

      setFinishingListingId(listingId);
      resetFinish();
      writeFinishListing({
        address: addresses.xpMarket,
        abi: XP_MARKET_ABI,
        functionName: "finishAuctionItem",
        args: [listingId],
        chainId: chainConfig.wagmiChainId,
      });
    },
    [address, toast, resetFinish, writeFinishListing, addresses.xpMarket, chainConfig.wagmiChainId],
  );

  const selectedSwapToken = useMemo(() => {
    if (!biddingListing) return undefined;
    return swapTokenByAddress.get(biddingListing.listingToken.toLowerCase());
  }, [biddingListing, swapTokenByAddress]);

  const isNativeBidToken = biddingListing?.listingToken === ZERO_ADDRESS;
  const bidSwapTokenId =
    biddingListing
      ? isNativeBidToken
        ? 0
        : selectedSwapToken?.tokenId
      : undefined;
  const bidTokenSymbol = useMemo(() => {
    if (!biddingListing) return "TOKEN";
    if (isNativeBidToken) return chainConfig.id === "bnb" ? "BNB" : "PLS";
    if (biddingListing.listingToken.toLowerCase() === addresses.mafia.toLowerCase()) return "MAFIA";
    if (biddingListing.listingToken.toLowerCase() === addresses.ingameCurrency.toLowerCase()) return "CASH";
    return selectedSwapToken?.name || "TOKEN";
  }, [biddingListing, isNativeBidToken, chainConfig.id, addresses.mafia, addresses.ingameCurrency, selectedSwapToken]);
  const bidTokenDecimals = selectedSwapToken?.decimal ?? 18;
  const bidTimeLeft = biddingListing
    ? Math.max(0, Number(biddingListing.endTimestamp) - Math.floor(Date.now() / 1000))
    : 0;
  const nextBidPrice =
    biddingListing
      ? (biddingListing.currentPrice * BigInt(105) + BigInt(99)) / BigInt(100)
      : BigInt(0);
  const mafiaBidAllowance = (mafiaBidAllowanceRaw as bigint | undefined) ?? BigInt(0);
  const mafiaApprovalReady =
    !isMafiaBidToken ||
    mafiaBidAllowance >= nextBidPrice ||
    isApproveBidTokenSuccess;
  const mafiaApprovalLoading = approveBidTokenPending || approveBidTokenConfirming;
  const canPlaceBid =
    !!address &&
    !!biddingListing &&
    biddingListing.owner.toLowerCase() !== address.toLowerCase() &&
    biddingListing.status === 0 &&
    Number(biddingListing.endTimestamp) >= Math.floor(Date.now() / 1000) &&
    bidSwapTokenId !== undefined &&
    mafiaApprovalReady;

  const handleOpenBid = useCallback((listing: XPListing) => {
    setBiddingListing(listing);
    resetApproveBidToken();
  }, [resetApproveBidToken]);

  const handleApproveMafiaBid = useCallback(() => {
    if (!isMafiaBidToken || !biddingListing) return;

    resetApproveBidToken();
    writeApproveBidToken({
      address: addresses.mafia,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addresses.xpMarket, nextBidPrice],
      chainId: chainConfig.wagmiChainId,
    });
  }, [
    isMafiaBidToken,
    biddingListing,
    resetApproveBidToken,
    writeApproveBidToken,
    addresses.mafia,
    addresses.xpMarket,
    chainConfig.wagmiChainId,
    nextBidPrice,
  ]);

  const handlePlaceBid = useCallback(() => {
    if (!biddingListing || bidSwapTokenId === undefined || !canPlaceBid) return;

    resetBid();
    if (isNativeBidToken) {
      writeBid({
        address: addresses.xpMarket,
        abi: XP_MARKET_ABI,
        functionName: "bidOnAuctionItem",
        args: [biddingListing.id, BigInt(bidSwapTokenId), nextBidPrice],
        chainId: chainConfig.wagmiChainId,
        value: nextBidPrice,
      } as any);
      return;
    }

    writeBid({
      address: addresses.xpMarket,
      abi: XP_MARKET_ABI,
      functionName: "bidOnAuctionItem",
      args: [biddingListing.id, BigInt(bidSwapTokenId), nextBidPrice],
      chainId: chainConfig.wagmiChainId,
    });
  }, [
    biddingListing,
    bidSwapTokenId,
    canPlaceBid,
    resetBid,
    writeBid,
    addresses.xpMarket,
    chainConfig.wagmiChainId,
    nextBidPrice,
    isNativeBidToken,
  ]);

  // Filter listings based on active/expired status
  const now = Math.floor(Date.now() / 1000);

  const statusFilteredListings = useMemo(() => {
    // status = 0 means listing is still open on-chain.
    const activeStatus = listings.filter((l) => l.status === 0);

    switch (listingsFilter) {
      case "active":
        return activeStatus.filter((l) => Number(l.endTimestamp) >= now);
      case "finishable":
        // Expired listings with bids that can be finalized.
        return activeStatus.filter(
          (l) => Number(l.endTimestamp) < now && l.bids.length > 0,
        );
      case "expired":
        // Expired listings with no bids.
        return activeStatus.filter(
          (l) => Number(l.endTimestamp) < now && l.bids.length === 0,
        );
      default:
        return activeStatus;
    }
  }, [listings, listingsFilter, now]);

  const filteredListings = useMemo(() => {
    if (!showMyListings) return statusFilteredListings;
    if (!address) return [];
    const account = address.toLowerCase();
    return statusFilteredListings.filter((l) => l.owner.toLowerCase() === account);
  }, [statusFilteredListings, showMyListings, address]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredListings.length / ITEMS_PER_PAGE));
  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredListings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredListings, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [listingsFilter, showMyListings, address]);

  const scopedListings = useMemo(() => {
    if (!showMyListings) return listings;
    if (!address) return [] as XPListing[];
    const account = address.toLowerCase();
    return listings.filter((l) => l.owner.toLowerCase() === account);
  }, [listings, showMyListings, address]);

  const activeCount = scopedListings.filter(
    (l) => l.status === 0 && Number(l.endTimestamp) >= now
  ).length;
  const finishableCount = scopedListings.filter(
    (l) => l.status === 0 && Number(l.endTimestamp) < now && l.bids.length > 0
  ).length;
  const expiredCount = scopedListings.filter(
    (l) => l.status === 0 && Number(l.endTimestamp) < now && l.bids.length === 0
  ).length;
  const myListingsCount = address
    ? listings.filter((l) => l.owner.toLowerCase() === address.toLowerCase()).length
    : 0;
  const myCaseCount = address
    ? statusFilteredListings.filter((l) => l.owner.toLowerCase() === address.toLowerCase()).length
    : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              XP Listings
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {filteredListings.length} {listingsFilter} / {scopedListings.length} scoped
            </span>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background/50 p-1">
              <button
                onClick={() => setShowMyListings(false)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                  !showMyListings
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
              <button
                onClick={() => setShowMyListings(true)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                  showMyListings
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Mine ({myCaseCount}/{myListingsCount})
              </button>
            </div>
          </div>
        </div>

        {/* Listings Filter */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-2">
          <button
            onClick={() => setListingsFilter("active")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              listingsFilter === "active"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Active ({activeCount})
          </button>
          <button
            onClick={() => setListingsFilter("finishable")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              listingsFilter === "finishable"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Gavel className="h-4 w-4" />
            Finishable ({finishableCount})
          </button>
          <button
            onClick={() => setListingsFilter("expired")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              listingsFilter === "expired"
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
            {showMyListings ? "No my" : "No"} {listingsFilter} listings
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {showMyListings && !address && "Connect your wallet to view your listings."}
            {listingsFilter === "active" && "Be the first to list your XP on the market!"}
            {listingsFilter === "finishable" && "Listings with bids appear here after expiry and can be finalized by anyone."}
            {listingsFilter === "expired" && "Listings with no bids appear here after expiry."}
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
                onOpenBid={handleOpenBid}
                onCancelListing={handleCancelListing}
                onFinishListing={handleFinishListing}
                isCanceling={
                  cancelingListingId === listing.id && (cancelPending || cancelConfirming)
                }
                isFinishing={
                  finishingListingId === listing.id && (finishPending || finishConfirming)
                }
                chainConfig={chainConfig}
                mafiaAddress={addresses.mafia}
                cashAddress={addresses.ingameCurrency}
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

      <Dialog
        open={!!biddingListing}
        onOpenChange={(open) => !open && setBiddingListing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Place Bid</DialogTitle>
            <DialogDescription>
              Bid 5% higher than the current listing price.
            </DialogDescription>
          </DialogHeader>

          {biddingListing && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Listing ID</span>
                  <span className="font-mono">#{biddingListing.id.toString()}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-mono">
                    {biddingListing.owner.slice(0, 8)}...{biddingListing.owner.slice(-6)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground">XP Type</span>
                  <span className="font-medium">
                    {XP_TYPES.find((t) => t.id === biddingListing.xpType)?.label || `Type ${biddingListing.xpType}`}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Token</span>
                  <span className="font-medium">{bidTokenSymbol}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Current Price</span>
                  <span className="font-mono">
                    {Number(formatUnits(biddingListing.currentPrice, bidTokenDecimals)).toFixed(4)} {bidTokenSymbol}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Your Bid (min)</span>
                  <span className="font-mono text-primary">
                    {Number(formatUnits(nextBidPrice, bidTokenDecimals)).toFixed(4)} {bidTokenSymbol}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Bids</span>
                  <span className="font-medium">{biddingListing.bids.length}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Ends In</span>
                  <span className="font-medium">
                    {bidTimeLeft <= 0
                      ? "Expired"
                      : `${Math.floor(bidTimeLeft / 3600)}h ${Math.floor((bidTimeLeft % 3600) / 60)}m`}
                  </span>
                </div>
              </div>

              {bidSwapTokenId === undefined && (
                <p className="text-xs text-red-400">
                  Listing token is not currently supported for bidding.
                </p>
              )}

              {isMafiaBidToken && !mafiaApprovalReady && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-xs text-amber-400">
                    MAFIA approval required before bidding.
                  </p>
                  <button
                    onClick={handleApproveMafiaBid}
                    disabled={mafiaApprovalLoading}
                    className={cn(
                      "mt-2 rounded-md px-3 py-1.5 text-xs font-medium",
                      mafiaApprovalLoading
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30",
                    )}
                  >
                    {mafiaApprovalLoading
                      ? "Approving..."
                      : `Approve ${Number(formatUnits(nextBidPrice, bidTokenDecimals)).toFixed(4)} MAFIA`}
                  </button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setBiddingListing(null)}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handlePlaceBid}
              disabled={!canPlaceBid || bidPending || bidConfirming || mafiaApprovalLoading}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium",
                !canPlaceBid || bidPending || bidConfirming || mafiaApprovalLoading
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {bidPending || bidConfirming ? "Bidding..." : "Place Bid"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  onOpenBid: (listing: XPListing) => void;
  onCancelListing: (listingId: bigint) => void;
  onFinishListing: (listingId: bigint) => void;
  isCanceling: boolean;
  isFinishing: boolean;
  chainConfig: ReturnType<typeof useChain>["chainConfig"];
  mafiaAddress: `0x${string}`;
  cashAddress: `0x${string}`;
}

function ListingCard({
  listing,
  explorer,
  isOwn,
  onOpenBid,
  onCancelListing,
  onFinishListing,
  isCanceling,
  isFinishing,
  chainConfig,
  mafiaAddress,
  cashAddress,
}: ListingCardProps) {
  const xpType = XP_TYPES.find((t) => t.id === listing.xpType);
  const now = Math.floor(Date.now() / 1000);
  const endTime = Number(listing.endTimestamp);
  const isExpired = endTime < now;
  const timeLeft = endTime - now;
  const hasBids = listing.bids.length > 0;
  const canCancel = isOwn && listing.status === 0 && !hasBids;
  const canFinish = listing.status === 0 && isExpired && hasBids;
  const canBid = !isOwn && listing.status === 0 && !isExpired;

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
      onClick={() => {
        if (canBid) onOpenBid(listing);
      }}
      className={cn(
        "rounded-lg border p-4 transition-all",
        isOwn
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background/50",
        isExpired && !canFinish && "opacity-60",
        canBid && "cursor-pointer hover:border-primary/40 hover:bg-primary/5",
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

      {canCancel && (
        <div className="mt-3 pt-2 border-t border-border">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelListing(listing.id);
            }}
            disabled={isCanceling}
            className={cn(
              "w-full rounded-md px-3 py-2 text-xs font-medium transition-all",
              isCanceling
                ? "bg-secondary text-muted-foreground cursor-not-allowed"
                : "bg-red-500/10 text-red-400 hover:bg-red-500/20",
            )}
          >
            {isCanceling ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cancelling...
              </span>
            ) : (
              "Cancel Listing"
            )}
          </button>
        </div>
      )}

      {canFinish && (
        <div className="mt-3 pt-2 border-t border-border">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFinishListing(listing.id);
            }}
            disabled={isFinishing}
            className={cn(
              "w-full rounded-md px-3 py-2 text-xs font-medium transition-all",
              isFinishing
                ? "bg-secondary text-muted-foreground cursor-not-allowed"
                : "bg-green-500/10 text-green-400 hover:bg-green-500/20",
            )}
          >
            {isFinishing ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Finishing...
              </span>
            ) : (
              "Finish Listing"
            )}
          </button>
        </div>
      )}

      {canBid && (
        <div className="mt-3 pt-2 border-t border-border">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenBid(listing);
            }}
            className="w-full rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20"
          >
            Place Bid
          </button>
        </div>
      )}
    </div>
  );
}
