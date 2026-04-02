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
  PLAYER_SUBSCRIPTION_ABI,
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
  Crown,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Zap,
  Star,
  RefreshCw,
  Clock,
  ExternalLink,
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

const PLAN_TYPES = [
  {
    id: 1,
    name: "Plus",
    icon: Star,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.08)]",
    features: [
      "Extended helper bot slots",
      "Reduced cooldowns",
      "Bonus crime rewards",
      "Priority crime queue",
    ],
  },
  {
    id: 2,
    name: "Unlimited",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.08)]",
    features: [
      "All Plus benefits",
      "Unlimited bot operations",
      "Maximum helper slots",
      "Priority access to new features",
      "Exclusive perks & bonuses",
    ],
  },
] as const;

export function PremiumAction() {
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState(0);
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // ── Fetch swap tokens from the swapRouter contract ──────────
  const { data: swapData, isLoading: swapLoading } = useReadContract({
    address: addresses.swapRouter,
    abi: SWAP_ROUTER_ABI,
    functionName: "getSwapTokens",
    chainId: chainConfig.wagmiChainId,
  });

  // ── Fetch plan prices ───────────────────────────────────────
  const { data: plusPriceRaw } = useReadContract({
    address: addresses.playerSubscription,
    abi: PLAYER_SUBSCRIPTION_ABI,
    functionName: "planPrice",
    args: [1n],
    chainId: chainConfig.wagmiChainId,
  });

  const { data: unlimitedPriceRaw } = useReadContract({
    address: addresses.playerSubscription,
    abi: PLAYER_SUBSCRIPTION_ABI,
    functionName: "planPrice",
    args: [2n],
    chainId: chainConfig.wagmiChainId,
  });

  // ── Fetch plan duration ─────────────────────────────────────
  const { data: planDurationRaw } = useReadContract({
    address: addresses.playerSubscription,
    abi: PLAYER_SUBSCRIPTION_ABI,
    functionName: "planDuration",
    chainId: chainConfig.wagmiChainId,
  });

  // ── Check current subscription status ───────────────────────
  const { data: isSubbed, refetch: refetchSub } = useReadContract({
    address: addresses.playerSubscription,
    abi: PLAYER_SUBSCRIPTION_ABI,
    functionName: "isSubscribed",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
    chainId: chainConfig.wagmiChainId,
  });

  const { data: isUnlimited, refetch: refetchUnlimited } = useReadContract({
    address: addresses.playerSubscription,
    abi: PLAYER_SUBSCRIPTION_ABI,
    functionName: "isUnlimitedUser",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
    chainId: chainConfig.wagmiChainId,
  });

  const { data: subInfoRaw, refetch: refetchSubInfo } = useReadContract({
    address: addresses.playerSubscription,
    abi: PLAYER_SUBSCRIPTION_ABI,
    functionName: "getSubscriptionInfo",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
    chainId: chainConfig.wagmiChainId,
  });

  // ── Parse data ──────────────────────────────────────────────
  const plusPriceUsd = plusPriceRaw
    ? Number(formatUnits(plusPriceRaw as bigint, 18))
    : null;
  const unlimitedPriceUsd = unlimitedPriceRaw
    ? Number(formatUnits(unlimitedPriceRaw as bigint, 18))
    : null;
  const planDurationDays = planDurationRaw
    ? Number(planDurationRaw as bigint) / 86400
    : null;

  const currentPlanPrice =
    selectedPlan === 1 ? plusPriceUsd : unlimitedPriceUsd;

  const subscribed = isSubbed as boolean | undefined;
  const unlimited = isUnlimited as boolean | undefined;

  // Parse subscription info
  const subInfo = useMemo(() => {
    if (!subInfoRaw) return null;
    const raw = subInfoRaw as readonly [
      { planType: bigint; startedAt: bigint },
      boolean,
    ];
    return {
      planType: Number(raw[0].planType),
      startedAt: Number(raw[0].startedAt),
      isActive: raw[1],
    };
  }, [subInfoRaw]);

  // Compute subscription end date
  const subscriptionEnd = useMemo(() => {
    if (!subInfo || !planDurationRaw) return null;
    if (subInfo.startedAt === 0) return null;
    const duration = Number(planDurationRaw as bigint);
    return new Date((subInfo.startedAt + duration) * 1000);
  }, [subInfo, planDurationRaw]);

  // ── Parse swap tokens ───────────────────────────────────────
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

  const selectedToken = swapTokens.find((t) => t.tokenId === selectedTokenId);
  const isNativeToken =
    selectedToken?.tokenAddress === "0x0000000000000000000000000000000000000000";

  // Cost in selected token
  const totalTokenCost = useMemo(() => {
    if (!currentPlanPrice || !selectedToken || selectedToken.formattedPrice === 0)
      return null;
    return currentPlanPrice / selectedToken.formattedPrice;
  }, [currentPlanPrice, selectedToken]);

  // Auto-select first enabled token
  useEffect(() => {
    if (swapTokens.length > 0) {
      const first = swapTokens.find((t) => t.isEnabled);
      if (first) setSelectedTokenId(first.tokenId);
    }
  }, [swapTokens]);

  // ── Check ERC20 allowance ───────────────────────────────────
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: selectedToken?.tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address as `0x${string}`, addresses.playerSubscription],
    chainId: chainConfig.wagmiChainId,
    query: { enabled: !!address && !!selectedToken && !isNativeToken },
  });

  const needsApproval = useMemo(() => {
    if (isNativeToken || !totalTokenCost || !selectedToken) return false;
    if (!allowanceData) return true;
    const allowance = Number(
      formatUnits(allowanceData as bigint, selectedToken.decimal)
    );
    return allowance < totalTokenCost;
  }, [isNativeToken, totalTokenCost, allowanceData, selectedToken]);

  const [step, setStep] = useState<"approve" | "buy">("buy");

  useEffect(() => {
    if (isNativeToken || !needsApproval) {
      setStep("buy");
    } else {
      setStep("approve");
    }
  }, [isNativeToken, needsApproval]);

  // ── Approve tx ──────────────────────────────────────────────
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // ── Subscribe tx ────────────────────────────────────────────
  const {
    writeContract: writeSubscribe,
    data: subHash,
    isPending: subPending,
    error: subError,
    reset: resetSub,
  } = useChainWriteContract();

  const { isLoading: subConfirming, isSuccess: subSuccess } =
    useWaitForTransactionReceipt({ hash: subHash });

  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance();
      setStep("buy");
    }
  }, [approveSuccess, refetchAllowance]);

  useEffect(() => {
    if (subSuccess) {
      refetchSub();
      refetchUnlimited();
      refetchSubInfo();
    }
  }, [subSuccess, refetchSub, refetchUnlimited, refetchSubInfo]);

  const handleApprove = () => {
    if (!selectedToken || !totalTokenCost) return;
    const approveAmount = parseUnits(
      (totalTokenCost * 1.05).toFixed(selectedToken.decimal),
      selectedToken.decimal
    );
    writeApprove({
      address: selectedToken.tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addresses.playerSubscription, approveAmount],
    });
  };

  const handleSubscribe = () => {
    if (!selectedToken || !totalTokenCost) return;
    if (isNativeToken) {
      const sendAmount = parseUnits(
        (totalTokenCost * 1.005).toFixed(18),
        18
      );
      writeSubscribe({
        address: addresses.playerSubscription,
        abi: PLAYER_SUBSCRIPTION_ABI,
        functionName: "subscribe",
        args: [BigInt(selectedTokenId), BigInt(selectedPlan)],
        value: sendAmount,
      });
    } else {
      writeSubscribe({
        address: addresses.playerSubscription,
        abi: PLAYER_SUBSCRIPTION_ABI,
        functionName: "subscribe",
        args: [BigInt(selectedTokenId), BigInt(selectedPlan)],
      });
    }
  };

  const handleReset = () => {
    resetApprove();
    resetSub();
    setStep(needsApproval && !isNativeToken ? "approve" : "buy");
  };

  const isPending = approvePending || subPending;
  const isConfirming = approveConfirming || subConfirming;
  const error = approveError || subError;
  const txHash = subHash || approveHash;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10">
          <Crown className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Premium Subscription
          </h3>
          <p className="text-sm text-muted-foreground">
            Unlock exclusive benefits with a premium plan
          </p>
        </div>
      </div>

      {/* ── Current subscription status ─────────────────────── */}
      {isConnected && subscribed !== undefined && (
        <div
          className={cn(
            "rounded-xl border p-4",
            subscribed
              ? unlimited
                ? "border-amber-400/30 bg-amber-400/5"
                : "border-emerald-400/30 bg-emerald-400/5"
              : "border-border bg-card",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                subscribed
                  ? unlimited
                    ? "bg-amber-400/15"
                    : "bg-emerald-400/15"
                  : "bg-muted",
              )}
            >
              {subscribed ? (
                unlimited ? (
                  <Crown className="h-4.5 w-4.5 text-amber-400" />
                ) : (
                  <Star className="h-4.5 w-4.5 text-emerald-400" />
                )
              ) : (
                <XCircle className="h-4.5 w-4.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  subscribed
                    ? unlimited
                      ? "text-amber-400"
                      : "text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {subscribed
                  ? unlimited
                    ? "Unlimited Plan Active"
                    : "Plus Plan Active"
                  : "No Active Subscription"}
              </p>
              {subscribed && subscriptionEnd && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Renews{" "}
                  {subscriptionEnd.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Success state ──────────────────────────────────── */}
      {subSuccess ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-emerald-400/10 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                Subscription Activated!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                You are now subscribed to the{" "}
                <span
                  className={cn(
                    "font-semibold",
                    selectedPlan === 2 ? "text-amber-400" : "text-emerald-400",
                  )}
                >
                  {selectedPlan === 2 ? "Unlimited" : "Plus"}
                </span>{" "}
                plan
              </p>
            </div>
            {subHash && (
              <a
                href={`${explorer}/tx/${subHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View transaction
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <button
            onClick={handleReset}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Back to Plans
          </button>
        </div>
      ) : (
        <>
          {/* ── Plan selection cards ───────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PLAN_TYPES.map((plan) => {
              const Icon = plan.icon;
              const price = plan.id === 1 ? plusPriceUsd : unlimitedPriceUsd;
              const isSelected = selectedPlan === plan.id;

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  disabled={isPending || isConfirming}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-5 text-left transition-all duration-200",
                    isSelected
                      ? cn(plan.border, plan.bg, plan.glow)
                      : "border-border bg-card hover:border-primary/30 hover:bg-primary/5",
                    (isPending || isConfirming) && "opacity-50 pointer-events-none",
                  )}
                >
                  {/* Badge */}
                  {isSelected && (
                    <div
                      className={cn(
                        "absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        plan.bg,
                        plan.color,
                      )}
                    >
                      Selected
                    </div>
                  )}

                  <div className="mb-3 flex items-center gap-2.5">
                    <div className={cn("rounded-lg p-2", plan.bg)}>
                      <Icon className={cn("h-5 w-5", plan.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {plan.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {planDurationDays
                          ? `${planDurationDays} days`
                          : "Loading..."}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    {price !== null ? (
                      <p className={cn("text-2xl font-bold", plan.color)}>
                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          USD
                        </span>
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Loading price...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Sparkles
                          className={cn("h-3 w-3 shrink-0", plan.color)}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* ── Payment token selector ─────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Method
            </p>

            {swapLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Loading payment options...
                </span>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setTokenMenuOpen(!tokenMenuOpen)}
                  disabled={isPending || isConfirming}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/40 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {selectedToken?.name ?? "Select token"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedToken
                          ? isNativeToken
                            ? "Native token"
                            : `${selectedToken.tokenAddress.slice(0, 6)}...${selectedToken.tokenAddress.slice(-4)}`
                          : "Choose payment token"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      tokenMenuOpen && "rotate-180",
                    )}
                  />
                </button>

                {tokenMenuOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-card shadow-lg">
                    {swapTokens
                      .filter((t) => t.isEnabled)
                      .map((t) => (
                        <button
                          key={t.tokenId}
                          onClick={() => {
                            setSelectedTokenId(t.tokenId);
                            setTokenMenuOpen(false);
                            resetApprove();
                            resetSub();
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-primary/5",
                            selectedTokenId === t.tokenId &&
                              "bg-primary/10",
                          )}
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                            <Zap className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {t.name}
                            </p>
                          </div>
                          {selectedTokenId === t.tokenId && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Cost breakdown */}
            {totalTokenCost !== null && selectedToken && (
              <div className="mt-3 rounded-lg bg-background/50 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Total Cost
                  </span>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {totalTokenCost < 0.01
                      ? totalTokenCost.toFixed(6)
                      : totalTokenCost.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}{" "}
                    {selectedToken.name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Error display ──────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="line-clamp-2 text-[10px] text-red-400">
                {error.message?.includes("User rejected")
                  ? "Transaction rejected by user"
                  : error.message?.split("\n")[0]}
              </p>
            </div>
          )}

          {/* ── Approve step (ERC20 only) ──────────────────── */}
          {step === "approve" && !isNativeToken && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Approve Token Spend
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Allow the subscription contract to spend your{" "}
                    {selectedToken?.name}
                  </p>
                </div>
              </div>

              {approveSuccess && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">
                    Approved! Proceed to subscribe.
                  </span>
                </div>
              )}

              <button
                onClick={handleApprove}
                disabled={!isConnected || approvePending || approveConfirming}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary active:scale-[0.98] disabled:opacity-50"
              >
                {approvePending || approveConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {approvePending
                      ? "Confirm in wallet..."
                      : "Confirming..."}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Approve {selectedToken?.name}
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Subscribe button ───────────────────────────── */}
          <button
            onClick={handleSubscribe}
            disabled={
              !isConnected ||
              isPending ||
              isConfirming ||
              !totalTokenCost ||
              (step === "approve" && !isNativeToken)
            }
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-wider transition-all duration-200",
              isConnected &&
                totalTokenCost &&
                (step === "buy" || isNativeToken)
                ? cn(
                    "text-primary-foreground active:scale-[0.98] disabled:opacity-50",
                    selectedPlan === 2
                      ? "bg-amber-500 hover:bg-amber-400"
                      : "bg-emerald-500 hover:bg-emerald-400",
                  )
                : "bg-secondary text-muted-foreground cursor-not-allowed",
            )}
          >
            {subPending || subConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {subPending ? "Confirm in wallet..." : "Subscribing..."}
              </>
            ) : (
              <>
                <Crown className="h-4 w-4" />
                Subscribe to{" "}
                {selectedPlan === 2 ? "Unlimited" : "Plus"}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
