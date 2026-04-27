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
  BUY_PERKBOX_CONTRACT_ABI,
  ERC20_ABI,
} from "@/lib/contract";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import {
  Loader2,
  Package,
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

export function BuyPerkboxAction() {
  const [amount, setAmount] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState(0);
  const [step, setStep] = useState<"approve" | "buy">("approve");
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // Fetch swap tokens from the contract
  const { data: swapData, error: swapError, isLoading: swapLoading } = useReadContract({
    address: addresses.buyPerkbox,
    abi: BUY_PERKBOX_CONTRACT_ABI,
    functionName: "getSwapTokens",
    chainId: chainConfig.wagmiChainId,
  });

  // Fetch perk box price from the contract
  const { data: perkboxPriceRaw } = useReadContract({
    address: addresses.buyPerkbox,
    abi: BUY_PERKBOX_CONTRACT_ABI,
    functionName: "price",
    chainId: chainConfig.wagmiChainId,
  });

  const perkboxPriceUsd = perkboxPriceRaw
    ? Number(formatUnits(perkboxPriceRaw as bigint, 18))
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

  const enabledTokens = swapTokens.filter((t) => t.isEnabled);
  const selectedToken = enabledTokens.find(
    (t) => t.tokenId === selectedTokenId
  );

  // Calculate payment amount in the selected token
  const paymentAmount = useMemo(() => {
    if (!selectedToken || !perkboxPriceUsd) return null;
    if (selectedToken.formattedPrice <= 0) return null;
    const totalUsd = amount * perkboxPriceUsd;
    const tokensNeeded = totalUsd / selectedToken.formattedPrice;
    return tokensNeeded;
  }, [selectedToken, perkboxPriceUsd, amount]);

  // Wei value for ERC20 approval
  const paymentAmountWei = useMemo(() => {
    if (!paymentAmount || !selectedToken) return BigInt(0);
    return parseUnits(
      paymentAmount.toFixed(selectedToken.decimal),
      selectedToken.decimal
    );
  }, [paymentAmount, selectedToken]);

  // For native token (tokenId 0), send value with 0.1% buffer
  const nativeValue = useMemo(() => {
    if (!selectedToken || selectedToken.tokenId !== 0 || !paymentAmount)
      return BigInt(0);
    const buffered = paymentAmount * 1.001;
    return parseUnits(
      buffered.toFixed(selectedToken.decimal),
      selectedToken.decimal
    );
  }, [selectedToken, paymentAmount]);

  // Check ERC20 allowance
  const isNativeToken = selectedToken?.tokenId === 0;

  const { data: currentAllowance, refetch: refetchAllowance } =
    useReadContract({
      address: selectedToken?.tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: address ? [address, addresses.buyPerkbox] : undefined,
      chainId: chainConfig.wagmiChainId,
      query: { enabled: !!address && !!selectedToken && !isNativeToken },
    });

  const hasEnoughAllowance =
    isNativeToken ||
    (currentAllowance !== undefined &&
      paymentAmountWei > BigInt(0) &&
      (currentAllowance as bigint) >= paymentAmountWei);

  useEffect(() => {
    if (hasEnoughAllowance) {
      setStep("buy");
    } else {
      setStep("approve");
    }
  }, [hasEnoughAllowance, selectedTokenId]);

  // Approve ERC20
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setStep("buy");
    }
  }, [isApproveSuccess, refetchAllowance]);

  // Buy perk boxes
  const {
    writeContract: writeBuy,
    data: buyHash,
    isPending: isBuyPending,
    error: buyError,
    reset: resetBuy,
  } = useChainWriteContract();

  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } =
    useWaitForTransactionReceipt({ hash: buyHash });

  const handleApprove = () => {
    if (!selectedToken || paymentAmountWei === BigInt(0)) return;
    resetApprove();
    writeApprove({
      address: selectedToken.tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addresses.buyPerkbox, paymentAmountWei],
    });
  };

  const handleBuy = () => {
    if (!selectedToken || amount < 1) return;
    resetBuy();

    if (isNativeToken) {
      writeBuy({
        address: addresses.buyPerkbox,
        abi: BUY_PERKBOX_CONTRACT_ABI,
        functionName: "buyPerkBoxes",
        args: [BigInt(selectedToken.tokenId), BigInt(amount)],
        value: nativeValue,
      } as any);
    } else {
      writeBuy({
        address: addresses.buyPerkbox,
        abi: BUY_PERKBOX_CONTRACT_ABI,
        functionName: "buyPerkBoxes",
        args: [BigInt(selectedToken.tokenId), BigInt(amount)],
      });
    }
  };

  const isApproveLoading = isApprovePending || isApproveConfirming;
  const isBuyLoading = isBuyPending || isBuyConfirming;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setAmount(0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setAmount(parsed);
    }
  };

  const totalCostUsd = perkboxPriceUsd ? amount * perkboxPriceUsd : null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground">Buy Perk Boxes</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Select a payment token and purchase perk boxes via{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
            buyPerkBoxes(swapTokenId, perkBoxAmount)
          </code>
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6">
          {/* Step indicator */}
          {!isNativeToken && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  step === "approve" && !hasEnoughAllowance
                    ? "bg-primary text-primary-foreground"
                    : "bg-green-400/20 text-green-400"
                )}
              >
                {hasEnoughAllowance || step === "buy" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  "1"
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  step === "approve" && !hasEnoughAllowance
                    ? "text-foreground"
                    : "text-green-400"
                )}
              >
                Approve {selectedToken?.name}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  step === "buy" || hasEnoughAllowance
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {isBuySuccess ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  "2"
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  step === "buy" || hasEnoughAllowance
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Buy Perk Boxes
              </span>
            </div>
          )}

          {/* Loading / Error states */}
          {swapLoading && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading payment tokens from contract...</span>
            </div>
          )}
          {swapError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-4 py-3">
              <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
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

              {tokenMenuOpen && enabledTokens.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-card shadow-lg">
                  {enabledTokens.map((token) => (
                    <button
                      key={token.tokenId}
                      onClick={() => {
                        setSelectedTokenId(token.tokenId);
                        setTokenMenuOpen(false);
                        resetApprove();
                        resetBuy();
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/50 first:rounded-t-lg last:rounded-b-lg",
                        token.tokenId === selectedTokenId
                          ? "bg-primary/5 text-primary font-medium"
                          : "text-foreground"
                      )}
                    >
                      <span>{token.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ${token.formattedPrice.toFixed(4)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label
              htmlFor="perkbox-amount"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Number of Perk Boxes
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAmount((prev) => Math.max(1, prev - 1))}
                disabled={amount <= 1}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Decrease amount"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                id="perkbox-amount"
                type="number"
                min={1}
                value={amount || ""}
                onChange={handleInputChange}
                className="h-10 w-full rounded-lg border border-border bg-background px-4 text-center font-mono text-lg text-foreground outline-none ring-primary/50 transition-all focus:border-primary focus:ring-2"
              />
              <button
                onClick={() => setAmount((prev) => prev + 1)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80"
                aria-label="Increase amount"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Quick select */}
            <div className="mt-3 flex gap-2">
              {[1, 3, 5, 10, 25, 50].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-all duration-150",
                    amount === val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Cost display */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Estimated Cost
                </span>
              </div>
              <div className="text-right">
                {totalCostUsd !== null ? (
                  <>
                    <p className="text-2xl font-bold tracking-tight text-primary">
                      ${totalCostUsd.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {amount} box{amount !== 1 ? "es" : ""} x $
                      {perkboxPriceUsd?.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">
                    Loading price...
                  </p>
                )}
              </div>
            </div>

            {/* Token payment amount */}
            {selectedToken && paymentAmount !== null && (
              <div className="mt-3 rounded-md bg-chain-accent/5 border border-chain-accent/20 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-chain-accent">
                    Pay with {selectedToken.name}
                    {isNativeToken ? " (native)" : ""}
                  </span>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-chain-accent">
                      {paymentAmount.toFixed(
                        Math.min(selectedToken.decimal, 6)
                      )}{" "}
                      {selectedToken.name}
                    </p>
                    <p className="text-[10px] text-chain-accent/60">
                      @ ${selectedToken.formattedPrice.toFixed(4)}/
                      {selectedToken.name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contract info */}
          <div className="rounded-md bg-background/50 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">swapTokenId</span>
              <span className="font-mono text-xs text-foreground">
                {selectedToken?.tokenId ?? "..."}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">perkBoxAmount</span>
              <span className="font-mono text-xs text-foreground">
                {amount}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Function</span>
              <span className="font-mono text-[10px] text-primary">
                buyPerkBoxes(uint256, uint256)
              </span>
            </div>
          </div>

          {/* Approve status */}
          {isApproveSuccess && approveHash && (
            <div className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-green-400 shrink-0" />
              <span className="shrink-0 text-[10px] text-green-400 mr-1">
                Approved:
              </span>
              <a
                href={`${explorer}/tx/${approveHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
              >
                {approveHash.slice(0, 10)}...{approveHash.slice(-8)}
              </a>
            </div>
          )}
          {approveError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-400 line-clamp-2">
                {approveError.message.includes("User rejected")
                  ? "Approval rejected by user"
                  : approveError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Buy status */}
          {isBuySuccess && buyHash && (
            <div className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
              <a
                href={`${explorer}/tx/${buyHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
              >
                {buyHash.slice(0, 10)}...{buyHash.slice(-8)}
              </a>
            </div>
          )}
          {buyError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-400 line-clamp-2">
                {buyError.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : buyError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!isNativeToken && !hasEnoughAllowance ? (
            <button
              onClick={handleApprove}
              disabled={!isConnected || isApproveLoading || !selectedToken || paymentAmountWei === BigInt(0)}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200",
                isConnected
                  ? "bg-chain-accent text-white hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {isApproveLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isApprovePending ? "Confirm in wallet..." : "Approving..."}
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
              disabled={!isConnected || isBuyLoading || amount < 1 || !selectedToken}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200",
                isConnected
                  ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {isBuyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isBuyPending ? "Confirm in wallet..." : "Confirming..."}
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  {isConnected
                    ? `Buy ${amount} Perk Box${amount !== 1 ? "es" : ""}${totalCostUsd !== null ? ` - $${totalCostUsd.toFixed(2)}` : ""}`
                    : "Connect Wallet First"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
