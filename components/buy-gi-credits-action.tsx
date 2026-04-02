"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { formatUnits, parseUnits } from "viem";
import {
  GI_CREDITS_ABI,
  SWAP_ROUTER_ABI,
  ERC20_ABI,
} from "@/lib/contract";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import {
  Loader2,
  Coins,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
  DollarSign,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function BuyGiCreditsAction() {
  const [amount, setAmount] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState(0);
  const [step, setStep] = useState<"approve" | "buy">("approve");
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // Fetch swap tokens from the swapRouter contract
  const { data: swapData, error: swapError, isLoading: swapLoading } = useReadContract({
    address: addresses.swapRouter,
    abi: SWAP_ROUTER_ABI,
    functionName: "getSwapTokens",
    chainId: chainConfig.wagmiChainId,
  });

  // Fetch GI credit price from the giCredits contract itself
  const { data: creditPriceRaw } = useReadContract({
    address: addresses.giCredits,
    abi: GI_CREDITS_ABI,
    functionName: "price",
    chainId: chainConfig.wagmiChainId,
  });

  const creditPriceUsd = creditPriceRaw
    ? Number(formatUnits(creditPriceRaw as bigint, 18))
    : null;

  // Parse swap tokens
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

    const tokenInfos = result[0];
    const prices = result[1];

    return tokenInfos.map((t, index) => ({
      name: t.name,
      tokenAddress: t.tokenAddress,
      isStable: t.isStable,
      isEnabled: t.isEnabled,
      price: prices[index],
      decimal: Number(t.decimal),
      tokenId: index,
      formattedPrice: Number(formatUnits(prices[index], 18)),
    }));
  }, [swapData]);

  // Selected token
  const selectedToken = swapTokens.find((t) => t.tokenId === selectedTokenId);
  const isNativeToken =
    selectedToken?.tokenAddress === "0x0000000000000000000000000000000000000000";

  // Calculate cost in selected token
  const costPerCredit = useMemo(() => {
    if (!creditPriceUsd || !selectedToken || selectedToken.formattedPrice === 0)
      return null;
    return creditPriceUsd / selectedToken.formattedPrice;
  }, [creditPriceUsd, selectedToken]);

  const totalTokenCost = costPerCredit ? costPerCredit * amount : null;

  // Auto-select first enabled token
  useEffect(() => {
    if (swapTokens.length > 0) {
      const first = swapTokens.find((t) => t.isEnabled);
      if (first) setSelectedTokenId(first.tokenId);
    }
  }, [swapTokens]);

  // Check ERC20 allowance
  const { data: allowanceData } = useReadContract({
    address: selectedToken?.tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address as `0x${string}`, addresses.giCredits],
    chainId: chainConfig.wagmiChainId,
    query: { enabled: !!address && !!selectedToken && !isNativeToken },
  });

  // Determine if approval is needed
  const needsApproval = useMemo(() => {
    if (isNativeToken || !totalTokenCost || !selectedToken) return false;
    if (!allowanceData) return true;
    const allowance = Number(
      formatUnits(allowanceData as bigint, selectedToken.decimal)
    );
    return allowance < totalTokenCost;
  }, [isNativeToken, totalTokenCost, allowanceData, selectedToken]);

  // Auto-set step
  useEffect(() => {
    if (isNativeToken || !needsApproval) {
      setStep("buy");
    } else {
      setStep("approve");
    }
  }, [isNativeToken, needsApproval]);

  // Approve tx
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Buy tx
  const {
    writeContract: writeBuy,
    data: buyHash,
    isPending: buyPending,
    error: buyError,
    reset: resetBuy,
  } = useChainWriteContract();

  const { isLoading: buyConfirming, isSuccess: buySuccess } =
    useWaitForTransactionReceipt({ hash: buyHash });

  useEffect(() => {
    if (approveSuccess) setStep("buy");
  }, [approveSuccess]);

  const handleApprove = () => {
    if (!selectedToken || !totalTokenCost) return;
    const approveAmount = parseUnits(
      (totalTokenCost * 1.01).toFixed(selectedToken.decimal),
      selectedToken.decimal
    );
    writeApprove({
      address: selectedToken.tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addresses.giCredits, approveAmount],
    });
  };

  const handleBuy = () => {
    if (!selectedToken || !totalTokenCost) return;

    // creditAmount in wei (18 decimals)
    const creditAmountWei = parseUnits(amount.toFixed(18), 18);

    if (isNativeToken) {
      // Native: send value with a small buffer
      const sendAmount = parseUnits(
        (totalTokenCost * 1.001).toFixed(18),
        18
      );
      writeBuy({
        address: addresses.giCredits,
        abi: GI_CREDITS_ABI,
        functionName: "buyCredit",
        args: [BigInt(selectedTokenId), creditAmountWei],
        value: sendAmount,
      });
    } else {
      writeBuy({
        address: addresses.giCredits,
        abi: GI_CREDITS_ABI,
        functionName: "buyCredit",
        args: [BigInt(selectedTokenId), creditAmountWei],
      });
    }
  };

  const handleReset = () => {
    resetApprove();
    resetBuy();
    setStep(needsApproval && !isNativeToken ? "approve" : "buy");
    setAmount(1);
  };

  const isPending = approvePending || buyPending;
  const isConfirming = approveConfirming || buyConfirming;
  const error = approveError || buyError;
  const txHash = buyHash || approveHash;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400/10">
          <Coins className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Buy GI Credits
          </h3>
          <p className="text-sm text-muted-foreground">
            Purchase GI Credits with multiple payment tokens
          </p>
        </div>
      </div>

      {buySuccess ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-green-400/10 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
            <div>
              <p className="text-lg font-bold text-foreground">
                Purchase Complete!
              </p>
              <p className="text-sm text-muted-foreground">
                You bought {amount} GI Credit{amount !== 1 ? "s" : ""}
              </p>
            </div>
            {buyHash && (
              <a
                href={`${explorer}/tx/${buyHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View transaction
              </a>
            )}
          </div>
          <button
            onClick={handleReset}
            className="w-full rounded-lg bg-secondary py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            Buy More
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Loading / Error states */}
          {swapLoading && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading payment tokens from contract...</span>
            </div>
          )}
          {swapError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-4 py-3">
              <XCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <p className="text-xs text-red-400">
                Failed to load payment tokens: {swapError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Token selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Payment Token
            </label>
            <div className="relative">
              <button
                onClick={() => setTokenMenuOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/30"
              >
                <span className="text-sm font-medium text-foreground">
                  {swapLoading ? "Loading tokens..." : selectedToken?.name || "No tokens available"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    tokenMenuOpen && "rotate-180"
                  )}
                />
              </button>
              {tokenMenuOpen && swapTokens.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-lg">
                  {swapTokens
                    .filter((t) => t.isEnabled)
                    .map((token) => (
                      <button
                        key={token.tokenId}
                        onClick={() => {
                          setSelectedTokenId(token.tokenId);
                          setTokenMenuOpen(false);
                          resetApprove();
                          resetBuy();
                        }}
                        className={cn(
                          "flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                          token.tokenId === selectedTokenId &&
                            "bg-primary/10"
                        )}
                      >
                        <span className="text-sm font-medium text-foreground">
                          {token.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ${token.formattedPrice.toFixed(4)}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Amount selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Amount
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAmount(Math.max(1, amount - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-secondary"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-center">
                <span className="text-2xl font-bold text-foreground">
                  {amount}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  credit{amount !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setAmount(amount + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-secondary"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {/* Quick amount buttons */}
            <div className="mt-2 flex gap-2">
              {[1, 5, 10, 25, 50].map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(q)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
                    amount === q
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Price info */}
          <div className="space-y-2 rounded-lg bg-secondary/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Price per credit
              </span>
              <span className="text-sm font-medium text-foreground">
                {creditPriceUsd != null
                  ? `$${creditPriceUsd.toFixed(2)}`
                  : "Loading..."}
              </span>
            </div>
            {costPerCredit != null && selectedToken && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Cost per credit
                </span>
                <span className="text-sm font-medium text-foreground">
                  {costPerCredit.toFixed(6)} {selectedToken.name}
                </span>
              </div>
            )}
            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Total
                </span>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">
                    {totalTokenCost != null && selectedToken
                      ? `${totalTokenCost.toFixed(6)} ${selectedToken.name}`
                      : "..."}
                  </span>
                  {creditPriceUsd != null && (
                    <p className="text-xs text-muted-foreground">
                      ~${(creditPriceUsd * amount).toFixed(2)} USD
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step indicators (ERC20 only) */}
          {!isNativeToken && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  step === "approve"
                    ? "bg-primary text-primary-foreground"
                    : approveSuccess
                      ? "bg-green-400 text-background"
                      : "bg-secondary text-muted-foreground"
                )}
              >
                {approveSuccess ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  "1"
                )}
              </div>
              <span
                className={cn(
                  "text-xs",
                  step === "approve"
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Approve
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  step === "buy"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                2
              </div>
              <span
                className={cn(
                  "text-xs",
                  step === "buy"
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Buy
              </span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 p-3">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-400">
                {(error as Error).message?.split("\n")[0] ||
                  "Transaction failed"}
              </p>
            </div>
          )}

          {/* Action button */}
          {!isConnected ? (
            <div className="rounded-lg bg-secondary/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Connect your wallet to buy GI Credits
              </p>
            </div>
          ) : step === "approve" && !isNativeToken ? (
            <button
              onClick={handleApprove}
              disabled={
                isPending ||
                isConfirming ||
                !selectedToken ||
                !totalTokenCost
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 py-3 text-sm font-bold text-background transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {approvePending || approveConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {approvePending ? "Confirm in wallet..." : "Approving..."}
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Approve {selectedToken?.name}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleBuy}
              disabled={
                isPending ||
                isConfirming ||
                !selectedToken ||
                !totalTokenCost
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 py-3 text-sm font-bold text-background transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buyPending || buyConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {buyPending ? "Confirm in wallet..." : "Purchasing..."}
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  Buy {amount} GI Credit{amount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          )}

          {/* Tx link */}
          {txHash && !buySuccess && (
            <div className="text-center">
              <a
                href={`${explorer}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View pending transaction
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
