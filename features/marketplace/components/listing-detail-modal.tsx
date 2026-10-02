"use client";

import { useAuth } from "@/components/auth-provider";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GAME_CASH_MARKETPLACE_SWAP_TOKEN_ID,
  NATIVE_ADDRESS,
  addressEquals,
  calculateNextBid,
  formatLandSlotSubtitle,
  formatLandSlotTitle,
  formatPrice,
  formatTimeRemaining,
  getItemName,
  getLandSlotRarityLabel,
  isExpired,
  isGameCashToken,
  pow10BigInt,
  LISTING_TYPE_LABELS,
  STATUS_LABELS,
  type InventoryMarketplaceListing,
  type LandSlotDetails,
  type SwapToken,
} from "@/features/marketplace/lib/marketplace";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import {
  ERC20_ABI,
  INGAME_CURRENCY_ABI,
  City,
  INVENTORY_MARKETPLACE_ABI,
  MARKETPLACE_CATEGORY_NAMES,
} from "@/lib/contract";
import { cn } from "@/lib/utils";
import { CheckCircle2, Coins, ExternalLink, Gavel, Loader2, MapPin, Package, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatUnits, maxUint256, parseUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { formatWalletAddress } from "@/lib/format";
import { getResidentialGameCashYieldPer24h } from "@/lib/city-slot-config";
import { formatMafiaStakingFromWei } from "@/lib/city-map-staking-format";

function PlotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function LandSlotDetailList({ slot }: { slot: LandSlotDetails }) {
  const city = City[slot.cityId] ?? `City #${slot.cityId}`;
  const defense =
    slot.originalDefensePower !== slot.defensePower
      ? `${slot.defensePower} (base ${slot.originalDefensePower})`
      : String(slot.defensePower);
  const gameCashPer24h = getResidentialGameCashYieldPer24h(slot.slotType, slot.slotSubType);

  return (
    <div className="space-y-1.5">
      <PlotRow label="City" value={city} />
      <PlotRow label="Coordinates" value={`(${slot.x}, ${slot.y})`} />
      <PlotRow label="Building" value={formatLandSlotTitle(slot)} />
      <PlotRow label="Rarity" value={getLandSlotRarityLabel(slot.rarity)} />
      <PlotRow label="Defense" value={defense} />
      <PlotRow label="Boost" value={`${slot.boostPercentage}%`} />
      <PlotRow
        label="Activated"
        value={slot.isOperating ? "Yes (MAFIA deposited)" : "No"}
      />
      <PlotRow
        label="Staked MAFIA"
        value={`${formatMafiaStakingFromWei(slot.stakingAmount)} MAFIA`}
      />
      <PlotRow label="Yield" value={slot.yieldPayout.toLocaleString()} />
      {gameCashPer24h != null && (
        <PlotRow label="Game Cash / 24h" value={`$${gameCashPer24h.toLocaleString()}`} />
      )}
      {slot.familyId > 0 && <PlotRow label="Family ID" value={String(slot.familyId)} />}
      <PlotRow label="Item ID" value={`#${slot.itemId}`} />
    </div>
  );
}

interface ListingDetailModalProps {
  listing: InventoryMarketplaceListing | null;
  /** Plot details for a land-slot listing. `null` while they are still loading. */
  landSlot?: LandSlotDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  getTokenInfo: (token: `0x${string}`) => { name: string; decimal: number; isNative: boolean };
  swapTokens: SwapToken[];
}

export function ListingDetailModal({
  listing,
  landSlot,
  open,
  onOpenChange,
  onSuccess,
  getTokenInfo,
  swapTokens,
}: ListingDetailModalProps) {
  const { address, isConnected } = useAccount();
  const { authData } = useAuth();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // ── Action States ─────────────────────────────────────────────
  const [bidAmount, setBidAmount] = useState("");
  const [selectedSwapTokenId, setSelectedSwapTokenId] = useState<number>(0);
  const [isApproved, setIsApproved] = useState(false);

  // Find native, mafia, and stablecoin tokens for payment selection
  const nativeToken = swapTokens.find((t) => t.tokenAddress === NATIVE_ADDRESS);
  const mafiaToken = swapTokens.find(
    (t) => t.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase()
  );
  // Find stablecoin tokens (USDT, USDC) for purchase payments
  const stableTokens = swapTokens.filter((t) => t.isStable);
  const selectedPaymentToken = swapTokens.find((t) => t.tokenId === selectedSwapTokenId);
  const listingPricedInGameCash = Boolean(listing && isGameCashToken(listing.token));

  // Calculate token amount from USD price (18-dec) and swap oracle price (same as contract convention).
  const calculateTokenAmountFloor = useCallback(
    (usdPrice: bigint, paymentToken: SwapToken | undefined): bigint => {
      if (!paymentToken || paymentToken.price === BigInt(0)) return BigInt(0);
      const scale = pow10BigInt(Number(paymentToken.decimal));
      return (usdPrice * scale) / paymentToken.price;
    },
    []
  );

  /** Ceil division so allowance ≥ amount the market may pull (floor + mismatch → BEP20 #1002). */
  const calculateTokenAmountCeil = useCallback(
    (usdPrice: bigint, paymentToken: SwapToken | undefined): bigint => {
      if (!paymentToken || paymentToken.price === BigInt(0)) return BigInt(0);
      const scale = pow10BigInt(Number(paymentToken.decimal));
      const num = usdPrice * scale;
      const den = paymentToken.price;
      return (num + den - BigInt(1)) / den;
    },
    []
  );

  // Calculate the token amount needed for purchase (game cash listings: price is already in cash units)
  const requiredTokenAmount = useMemo(() => {
    if (!listing) return BigInt(0);
    if (isGameCashToken(listing.token)) return listing.currentPrice;
    if (!selectedPaymentToken) return BigInt(0);
    // Native value: floor matches typical “exact” listing math; ERC20/stables: ceil prevents under-approve.
    if (selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) {
      return calculateTokenAmountFloor(listing.currentPrice, selectedPaymentToken);
    }
    return calculateTokenAmountCeil(listing.currentPrice, selectedPaymentToken) * BigInt(105) / BigInt(100);
  }, [
    listing,
    selectedPaymentToken,
    calculateTokenAmountFloor,
    calculateTokenAmountCeil,
  ]);

  // For MAFIA token, add 5% extra for buy/sell fee (ERC20 path only)
  const requiredApprovalAmount = useMemo(() => {
    if (listingPricedInGameCash || !selectedPaymentToken) return BigInt(0);
    const isMafia =
      selectedPaymentToken.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase();
    if (isMafia) {
      return (requiredTokenAmount * BigInt(105)) / BigInt(100);
    }
    return requiredTokenAmount;
  }, [listingPricedInGameCash, requiredTokenAmount, selectedPaymentToken, addresses.mafia]);

  /** Minimum balance needed to complete a fixed-price buy (native: exact send; ERC20: includes MAFIA fee buffer). */
  const buyBalanceRequired = useMemo(() => {
    if (listingPricedInGameCash) {
      if (!listing) return BigInt(0);
      return listing.currentPrice;
    }
    if (!selectedPaymentToken) return BigInt(0);
    if (selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) return requiredTokenAmount;
    return requiredApprovalAmount;
  }, [
    listing,
    listingPricedInGameCash,
    selectedPaymentToken,
    requiredTokenAmount,
    requiredApprovalAmount,
  ]);

  const payWithNative =
    !listingPricedInGameCash && selectedPaymentToken?.tokenAddress === NATIVE_ADDRESS;
  const payWithErc20 =
    !listingPricedInGameCash &&
    !!selectedPaymentToken &&
    selectedPaymentToken.tokenAddress !== NATIVE_ADDRESS;

  const { data: nativeWalletBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: chainConfig.wagmiChainId,
    query: {
      enabled: !!open && !!address && payWithNative,
    },
  });

  const { data: erc20BalanceRaw, refetch: refetchErc20Balance } = useReadContract({
    address: selectedPaymentToken?.tokenAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!open && !!address && payWithErc20,
    },
  });

  const { data: gameCashBalanceRaw, refetch: refetchGameCashBalance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: {
      enabled:
        !!open &&
        !!address &&
        !!authData &&
        listingPricedInGameCash,
    },
  });

  const buyBalanceSufficient = useMemo(() => {
    if (buyBalanceRequired <= BigInt(0)) return true;
    if (listingPricedInGameCash) {
      if (!authData) return false;
      if (gameCashBalanceRaw === undefined) return false;
      return (gameCashBalanceRaw as bigint) >= buyBalanceRequired;
    }
    if (!selectedPaymentToken) return false;
    if (selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) {
      if (nativeWalletBalance === undefined) return false;
      return nativeWalletBalance.value >= buyBalanceRequired;
    }
    if (erc20BalanceRaw === undefined) return false;
    return (erc20BalanceRaw as bigint) >= buyBalanceRequired;
  }, [
    buyBalanceRequired,
    listingPricedInGameCash,
    authData,
    gameCashBalanceRaw,
    selectedPaymentToken,
    nativeWalletBalance,
    erc20BalanceRaw,
  ]);

  // ── ERC20 Allowance Check ─────────────────────────────────────
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: selectedPaymentToken?.tokenAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && selectedPaymentToken?.tokenAddress
      ? [address, addresses.inventoryMarketplace]
      : undefined,
    query: {
      enabled:
        !!address &&
        !listingPricedInGameCash &&
        !!selectedPaymentToken &&
        selectedPaymentToken.tokenAddress !== NATIVE_ADDRESS,
    },
  });

  // ERC20 / native readiness (Game Cash uses InGameCurrency approve instead)
  useEffect(() => {
    if (listingPricedInGameCash) return;
    if (!selectedPaymentToken || selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) {
      setIsApproved(true);
      return;
    }
    const allowance = allowanceRaw as bigint | undefined;
    setIsApproved(!!allowance && allowance >= requiredApprovalAmount);
  }, [listingPricedInGameCash, allowanceRaw, requiredApprovalAmount, selectedPaymentToken]);

  const approve = useContractTransaction({
    onSuccess: () => {
      toast.success("Token approved successfully!");
      refetchAllowance();
    },
  });
  const cashSpendApprove = useContractTransaction({
    onSuccess: () => {
      toast.success("Game Cash spend approved for marketplace");
    },
  });
  const buy = useContractTransaction({
    onSuccess: () => {
      toast.success("Item purchased successfully!");
      void refetchErc20Balance();
      void refetchGameCashBalance();
      void refetchNativeBalance();
      onSuccess();
    },
  });
  const bid = useContractTransaction({
    onSuccess: () => {
      toast.success("Bid placed successfully!");
      onSuccess();
    },
  });
  const cancel = useContractTransaction({
    onSuccess: () => {
      toast.success("Listing canceled successfully!");
      onSuccess();
    },
  });
  const finish = useContractTransaction({
    onSuccess: () => {
      toast.success("Auction completed successfully!");
      onSuccess();
    },
  });
  const resetApprove = approve.reset;
  const resetCashSpendApprove = cashSpendApprove.reset;
  const resetBuy = buy.reset;
  const resetBid = bid.reset;
  const resetCancel = cancel.reset;
  const resetFinish = finish.reset;

  useEffect(() => {
    if (!open) {
      setBidAmount("");
      setSelectedSwapTokenId(0);
      resetApprove();
      resetCashSpendApprove();
      resetBuy();
      resetBid();
      resetCancel();
      resetFinish();
    }
  }, [
    open,
    resetApprove,
    resetCashSpendApprove,
    resetBuy,
    resetBid,
    resetCancel,
    resetFinish,
  ]);

  // Default payment token for USD listings (Game Cash listings do not use swap token picker)
  useEffect(() => {
    if (!open || !listing || isGameCashToken(listing.token)) return;
    const native = swapTokens.find((t) => t.tokenAddress === NATIVE_ADDRESS);
    setSelectedSwapTokenId(native?.tokenId ?? swapTokens[0]?.tokenId ?? 0);
  }, [open, listing?.listingId, listing?.token, swapTokens]);

  if (!listing) return null;

  const tokenInfo = getTokenInfo(listing.token);
  const isLandSlot = landSlot !== undefined;
  const itemName = landSlot
    ? formatLandSlotTitle(landSlot)
    : getItemName(listing.item.categoryId, listing.item.typeId);
  const categoryName = landSlot
    ? formatLandSlotSubtitle(landSlot)
    : isLandSlot
      ? "Loading plot..."
      : (MARKETPLACE_CATEGORY_NAMES[listing.item.categoryId] ?? "Item");
  const expired = isExpired(listing.expiresAt);
  const isSeller = addressEquals(listing.seller, address);
  const isOpen = listing.status === 0;
  const isAuction = listing.listingType === 1;

  // Next bid: `currentPrice` is Game Cash wei, or USD (18-dec) for native/MAFIA/stables — convert to pay-token units.
  const nextBidWei = calculateNextBid(listing.currentPrice);
  const bidPayIsErc20 =
    !listingPricedInGameCash &&
    !!selectedPaymentToken &&
    selectedPaymentToken.tokenAddress !== NATIVE_ADDRESS;

  const minBidAsPayTokenWei = listingPricedInGameCash
    ? nextBidWei
    : !selectedPaymentToken
      ? BigInt(0)
      : selectedPaymentToken.tokenAddress === NATIVE_ADDRESS
        ? calculateTokenAmountFloor(nextBidWei, selectedPaymentToken)
        : (calculateTokenAmountCeil(nextBidWei, selectedPaymentToken) * BigInt(105)) /
        BigInt(100);

  const bidParseDecimals = listingPricedInGameCash
    ? 18
    : (selectedPaymentToken?.decimal ?? 18);

  let parsedBidWeiForAllowance = BigInt(0);
  if (bidAmount?.trim()) {
    try {
      parsedBidWeiForAllowance = parseUnits(bidAmount, bidParseDecimals);
    } catch {
      parsedBidWeiForAllowance = BigInt(0);
    }
  }

  const bidApprovalThreshold = !bidPayIsErc20
    ? BigInt(0)
    : parsedBidWeiForAllowance > BigInt(0)
      ? (parsedBidWeiForAllowance >= minBidAsPayTokenWei
        ? parsedBidWeiForAllowance
        : minBidAsPayTokenWei)
      : minBidAsPayTokenWei;

  const allowanceBn = (allowanceRaw as bigint | undefined) ?? BigInt(0);

  const bidAllowanceRequired =
    !bidPayIsErc20 || bidApprovalThreshold <= BigInt(0)
      ? BigInt(0)
      : selectedPaymentToken?.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase()
        ? (bidApprovalThreshold * BigInt(105)) / BigInt(100)
        : bidApprovalThreshold;

  const bidErc20AllowanceOk = !bidPayIsErc20 || allowanceBn >= bidAllowanceRequired;

  const bidDisplayDecimals = bidParseDecimals;
  const bidDisplaySymbol = listingPricedInGameCash
    ? "Game Cash"
    : (selectedPaymentToken?.name ?? tokenInfo.name);
  const minBidAmountDisplay = formatUnits(minBidAsPayTokenWei, bidDisplayDecimals);

  // ── Action Handlers ───────────────────────────────────────────
  const handleApproveErc20 = () => {
    if (!selectedPaymentToken || !isConnected) return;
    if (selectedPaymentToken.tokenAddress === NATIVE_ADDRESS) return;
    approve.reset();

    const isAuctionErc20Bid =
      listing.listingType === 1 && bidPayIsErc20;
    let amount = isAuctionErc20Bid ? bidApprovalThreshold : requiredApprovalAmount;

    if (
      isAuctionErc20Bid &&
      selectedPaymentToken.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase()
    ) {
      amount = (amount * BigInt(105)) / BigInt(100);
    }

    if (amount <= BigInt(0)) {
      toast.error("Nothing to approve for the current action");
      return;
    }

    approve.write({
      address: selectedPaymentToken.tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addresses.inventoryMarketplace, amount],
    });
  };

  const handleApproveGameCashSpend = () => {
    if (!isConnected) return;
    cashSpendApprove.reset();
    cashSpendApprove.write({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.inventoryMarketplace, maxUint256],
    });
  };

  const handleBuy = () => {
    if (!listing || !isConnected) return;
    if (!buyBalanceSufficient) {
      toast.error("Insufficient balance for this purchase");
      return;
    }
    buy.reset();

    if (listingPricedInGameCash) {
      buy.write({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "purchaseFixedItem",
        args: [
          BigInt(listing.listingId),
          BigInt(GAME_CASH_MARKETPLACE_SWAP_TOKEN_ID),
        ],
      });
      return;
    }

    if (!selectedPaymentToken) return;
    const isNativePayment = selectedPaymentToken.tokenAddress === NATIVE_ADDRESS;

    if (isNativePayment) {
      buy.write({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "purchaseFixedItem",
        args: [BigInt(listing.listingId), BigInt(selectedPaymentToken.tokenId)],
        value: requiredTokenAmount,
      } as unknown as Parameters<typeof buy.write>[0]);
    } else {
      buy.write({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "purchaseFixedItem",
        args: [BigInt(listing.listingId), BigInt(selectedPaymentToken.tokenId)],
      });
    }
  };

  const handleBid = () => {
    if (!listing || !isConnected || !bidAmount?.trim()) return;
    if (!listingPricedInGameCash && !selectedPaymentToken) return;
    bid.reset();

    let bidWei: bigint;
    try {
      bidWei = parseUnits(bidAmount, bidParseDecimals);
    } catch {
      toast.error("Invalid bid amount");
      return;
    }

    const minBidPay = minBidAsPayTokenWei;
    if (bidWei < minBidPay) {
      toast.error(
        `Minimum bid is ${Number(formatUnits(minBidPay, bidDisplayDecimals)).toFixed(6)} ${bidDisplaySymbol}`
      );
      return;
    }

    const payIsNative =
      !listingPricedInGameCash &&
      selectedPaymentToken!.tokenAddress === NATIVE_ADDRESS;
    const erc20AllowanceNeeded =
      !listingPricedInGameCash &&
        !payIsNative &&
        selectedPaymentToken!.tokenAddress.toLowerCase() === addresses.mafia?.toLowerCase()
        ? (bidWei * BigInt(110)) / BigInt(100)
        : bidWei;
    if (!listingPricedInGameCash && !payIsNative && allowanceBn < erc20AllowanceNeeded) {
      toast.error("Approve the token for the marketplace before bidding");
      return;
    }

    const bidSwapTokenId = isGameCashToken(listing.token)
      ? GAME_CASH_MARKETPLACE_SWAP_TOKEN_ID
      : selectedSwapTokenId;

    if (payIsNative) {
      bid.write({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "bidOnAuctionItem",
        args: [BigInt(listing.listingId), BigInt(bidSwapTokenId), bidWei],
        value: bidWei,
      } as unknown as Parameters<typeof bid.write>[0]);
    } else {
      bid.write({
        address: addresses.inventoryMarketplace,
        abi: INVENTORY_MARKETPLACE_ABI,
        functionName: "bidOnAuctionItem",
        args: [BigInt(listing.listingId), BigInt(bidSwapTokenId), bidWei],
      });
    }
  };

  const handleCancel = () => {
    if (!listing || !isConnected) return;
    cancel.reset();

    cancel.write({
      address: addresses.inventoryMarketplace,
      abi: INVENTORY_MARKETPLACE_ABI,
      functionName: "cancelListing",
      args: [BigInt(listing.listingId)],
    });
  };

  const handleFinish = () => {
    if (!listing || !isConnected) return;
    finish.reset();

    finish.write({
      address: addresses.inventoryMarketplace,
      abi: INVENTORY_MARKETPLACE_ABI,
      functionName: "finishAuctionItem",
      args: [BigInt(listing.listingId)],
    });
  };

  const approveLoading = approve.isLoading;
  const cashSpendApproveLoading = cashSpendApprove.isLoading;
  const buyLoading = buy.isLoading;
  const bidLoading = bid.isLoading;
  const cancelLoading = cancel.isLoading;
  const finishLoading = finish.isLoading;
  const anyLoading =
    approveLoading ||
    cashSpendApproveLoading ||
    buyLoading ||
    bidLoading ||
    cancelLoading ||
    finishLoading;

  const purchaseReady =
    (listingPricedInGameCash ? cashSpendApprove.isSuccess : isApproved) &&
    buyBalanceSufficient;

  // ── Action Availability ────────────────────────────────────��──
  const hasBids = listing.bids.length > 0;
  const canBuy = isOpen && !isAuction && !isSeller && !expired && isConnected;
  const canBid = isOpen && isAuction && !isSeller && !expired && isConnected;
  // Open listings with no bids can be canceled.
  // - If not expired: only the seller can cancel.
  // - If expired: anyone can cancel.
  const canCancel =
    isOpen && !hasBids && isConnected && (expired || isSeller);
  // Expired auctions with at least one bid can be finished.
  const canFinish = isOpen && isAuction && expired && hasBids && isConnected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              {isLandSlot ? (
                <MapPin className="h-5 w-5 text-primary" />
              ) : (
                <Package className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold">{itemName}</p>
              <p className="text-xs text-muted-foreground">{categoryName}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {isLandSlot && (
            <div className="rounded-lg bg-background/50 p-3">
              <p className="mb-2 text-xs text-muted-foreground">Plot</p>
              {landSlot ? (
                <LandSlotDetailList slot={landSlot} />
              ) : (
                <p className="text-sm text-muted-foreground">Loading plot details...</p>
              )}
            </div>
          )}

          {/* Listing Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Listing Type</p>
              <p className="font-medium text-foreground">
                {LISTING_TYPE_LABELS[listing.listingType]}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p
                className={cn(
                  "font-medium",
                  isOpen ? "text-green-400" : listing.status === 1 ? "text-blue-400" : "text-red-400"
                )}
              >
                {STATUS_LABELS[listing.status]}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                {isAuction ? "Current Bid" : "Price"}
              </p>
              <p className="font-mono font-semibold text-foreground">
                {formatPrice(listing.currentPrice, listing.token, tokenInfo)}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Time Left</p>
              <p
                className={cn(
                  "font-medium",
                  expired ? "text-red-400" : "text-green-400"
                )}
              >
                {formatTimeRemaining(listing.expiresAt)}
              </p>
            </div>
          </div>

          {/* Seller */}
          <div className="rounded-lg bg-background/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Seller</p>
            <a
              href={`${explorer}/address/${listing.seller}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-sm text-primary hover:underline"
            >
              {listing.seller}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Bid History (for auctions) */}
          {isAuction && listing.bids.length > 0 && (
            <div className="rounded-lg bg-background/50 p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Bid History ({listing.bids.length})
              </p>
              <div className="max-h-32 space-y-2 overflow-y-auto">
                {listing.bids
                  .slice()
                  .reverse()
                  .map((bid, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">
                        {formatWalletAddress(bid.buyer)}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {Number(formatUnits(bid.price, tokenInfo.decimal)).toFixed(4)}{" "}
                        {tokenInfo.name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 border-t border-border pt-4">
            {/* Buy (Fixed Price) */}
            {canBuy && (
              <div className="space-y-3">
                {/* Payment Token Selection - Only show for BNB/MAFIA listings */}
                {!isGameCashToken(listing.token) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Pay with:</p>
                    <div className="flex flex-wrap gap-2">
                      {nativeToken && (
                        <button
                          onClick={() => setSelectedSwapTokenId(nativeToken.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === nativeToken.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {chainConfig.id === "bnb" ? "BNB" : "PLS"}
                        </button>
                      )}
                      {mafiaToken && (
                        <button
                          onClick={() => setSelectedSwapTokenId(mafiaToken.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === mafiaToken.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          MAFIA
                        </button>
                      )}
                      {stableTokens.map((token) => (
                        <button
                          key={token.tokenId}
                          onClick={() => setSelectedSwapTokenId(token.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === token.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {token.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isGameCashToken(listing.token) && (
                  <div className="rounded-lg border border-border bg-background/50 p-3">
                    <p className="text-xs font-medium text-foreground">Payment: Game Cash</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Approve Game Cash spend on the InGameCurrency contract for the inventory marketplace,
                      then buy. The price is deducted from your in-game cash balance.
                    </p>
                  </div>
                )}

                {/* Price display */}
                {requiredTokenAmount > BigInt(0) &&
                  (listingPricedInGameCash || selectedPaymentToken) && (
                    <div className="rounded-lg bg-background/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Amount to pay:</span>
                        <span className="font-mono font-semibold text-foreground">
                          {Number(
                            formatUnits(
                              requiredTokenAmount,
                              listingPricedInGameCash
                                ? 18
                                : (selectedPaymentToken?.decimal ?? 18)
                            )
                          ).toFixed(6)}{" "}
                          {listingPricedInGameCash ? "Game Cash" : selectedPaymentToken!.name}
                        </span>
                      </div>
                      {!listingPricedInGameCash &&
                        selectedPaymentToken?.tokenAddress.toLowerCase() ===
                        addresses.mafia?.toLowerCase() && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            +5% fee buffer for MAFIA token
                          </p>
                        )}
                    </div>
                  )}

                {buyBalanceRequired > BigInt(0) && !buyBalanceSufficient && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                    {listingPricedInGameCash && !authData
                      ? "Sign in with your wallet (signature) to load your Game Cash balance."
                      : "Insufficient balance for this purchase."}
                  </p>
                )}

                {/* Approve Game Cash spend (InGameCurrency → marketplace) */}
                {listingPricedInGameCash && !cashSpendApprove.isSuccess && (
                  <button
                    type="button"
                    onClick={handleApproveGameCashSpend}
                    disabled={anyLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {cashSpendApproveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Approve Game Cash for marketplace
                  </button>
                )}

                {/* Approve ERC20 (MAFIA / stables) */}
                {!listingPricedInGameCash &&
                  !isApproved &&
                  selectedPaymentToken &&
                  selectedPaymentToken.tokenAddress !== NATIVE_ADDRESS && (
                    <button
                      type="button"
                      onClick={handleApproveErc20}
                      disabled={anyLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                    >
                      {approveLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      Approve {selectedPaymentToken.name}
                    </button>
                  )}

                {/* Buy Button */}
                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={
                    anyLoading ||
                    !purchaseReady ||
                    (!listingPricedInGameCash && !selectedPaymentToken)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {buyLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Coins className="h-4 w-4" />
                  )}
                  {requiredTokenAmount > BigInt(0) &&
                    (listingPricedInGameCash || selectedPaymentToken)
                    ? `Buy for ${Number(
                      formatUnits(
                        requiredTokenAmount,
                        listingPricedInGameCash
                          ? 18
                          : (selectedPaymentToken?.decimal ?? 18)
                      )
                    ).toFixed(4)} ${listingPricedInGameCash ? "Game Cash" : selectedPaymentToken!.name}`
                    : `Buy for ${formatPrice(listing.currentPrice, listing.token, tokenInfo)}`}
                </button>
              </div>
            )}

            {/* Bid (Auction) */}
            {canBid && (
              <div className="space-y-2">
                {isGameCashToken(listing.token) && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Bids use Game Cash. Approve spend once, then place your bid.
                  </p>
                )}
                {!isGameCashToken(listing.token) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Bid with:</p>
                    <div className="flex flex-wrap gap-2">
                      {nativeToken && (
                        <button
                          type="button"
                          onClick={() => setSelectedSwapTokenId(nativeToken.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === nativeToken.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {chainConfig.id === "bnb" ? "BNB" : "PLS"}
                        </button>
                      )}
                      {mafiaToken && (
                        <button
                          type="button"
                          onClick={() => setSelectedSwapTokenId(mafiaToken.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === mafiaToken.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          MAFIA
                        </button>
                      )}
                      {stableTokens.map((token) => (
                        <button
                          key={token.tokenId}
                          type="button"
                          onClick={() => setSelectedSwapTokenId(token.tokenId)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            selectedSwapTokenId === token.tokenId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {token.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      ERC20 / stable bids require approving the marketplace for that token first (native
                      excluded).
                    </p>
                  </div>
                )}
                {isGameCashToken(listing.token) && !cashSpendApprove.isSuccess && (
                  <button
                    type="button"
                    onClick={handleApproveGameCashSpend}
                    disabled={anyLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {cashSpendApproveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Approve Game Cash for marketplace
                  </button>
                )}
                {bidPayIsErc20 && !bidErc20AllowanceOk && (
                  <button
                    type="button"
                    onClick={handleApproveErc20}
                    disabled={anyLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {approveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Approve {selectedPaymentToken?.name} for marketplace
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Min: ${Number(minBidAmountDisplay).toFixed(4)} ${bidDisplaySymbol}`}
                    className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    step="0.0001"
                    min={Number(minBidAmountDisplay)}
                  />
                  <button
                    type="button"
                    onClick={() => setBidAmount(minBidAmountDisplay)}
                    className="rounded-lg border border-border bg-background/50 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Min
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleBid}
                  disabled={
                    anyLoading ||
                    !bidAmount?.trim() ||
                    (!listingPricedInGameCash && !selectedPaymentToken) ||
                    (isGameCashToken(listing.token) && !cashSpendApprove.isSuccess) ||
                    (bidPayIsErc20 && !bidErc20AllowanceOk)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  {bidLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Gavel className="h-4 w-4" />
                  )}
                  Place Bid
                </button>
              </div>
            )}

            {/* Cancel (Seller) */}
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={anyLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-400/20 disabled:opacity-50"
              >
                {cancelLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Cancel Listing
              </button>
            )}

            {/* Finish Auction */}
            {canFinish && (
              <button
                onClick={handleFinish}
                disabled={anyLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
              >
                {finishLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Complete Auction
              </button>
            )}

            {/* Not Connected */}
            {!isConnected && isOpen && (
              <p className="text-center text-sm text-muted-foreground">
                Connect your wallet to interact with this listing
              </p>
            )}

            {/* Closed Listing */}
            {!isOpen && (
              <p className="text-center text-sm text-muted-foreground">
                This listing is no longer active
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
