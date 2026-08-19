"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import {
  Loader2,
  Skull,
  TrendingUp,
  Target,
  DollarSign,
  Zap,
  Sparkles,
  Crown,
  Shield,
  Unlock,
  Wrench,
  HatGlasses,
  ChevronDown,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { ERC20_ABI, RANK_NAMES, REBIRTH_ABI, SWAP_ROUTER_ABI } from "@/lib/contract";
import {
  REBIRTH_OPTIONS,
  REBIRTH_PAYMENT_BUFFER,
  fetchRebirthOptionQuotes,
  findStableSwapTokenId,
  getRebirthPlayerStatus,
  isRebirthContractConfigured,
  parseSwapTokens,
  quoteRebirthPayment,
  validateRebirthUsdCost,
  type RebirthOption,
  type RebirthOptionState,
  type RebirthReward,
  type RebirthRewardKind,
} from "@/lib/rebirthContract";

// ── Reward icon ──────────────────────────────────────────────────────────────

function RewardIcon({ kind }: { kind: RebirthRewardKind }) {
  const className = "h-4 w-4 shrink-0";

  switch (kind) {
    case "xp":
      return <TrendingUp className={cn(className, "text-primary")} />;
    case "kill-xp":
      return <Target className={cn(className, "text-red-400")} />;
    case "cash":
      return <DollarSign className={cn(className, "text-emerald-400")} />;
    case "bullets":
      return <Zap className={cn(className, "text-amber-400")} />;
    case "helper-credits":
    case "helper-credit-mint":
      return <Sparkles className={cn(className, "text-violet-400")} />;
    case "premium":
      return <Crown className={cn(className, "text-yellow-400")} />;
    case "bodyguard-sam":
      return <HatGlasses className={cn(className, "text-blue-400")} />;
    case "bodyguard-frank":
      return <HatGlasses className={cn(className, "text-blue-400")} />;
    default:
      return <Shield className={className} />;
  }
}

function RewardRow({ reward }: { reward: RebirthReward }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
        reward.highlight &&
          "border border-emerald-500/30 bg-emerald-500/10",
      )}
    >
      <RewardIcon kind={reward.kind} />
      <span className="flex-1 text-muted-foreground">{reward.label}</span>
      <span
        className={cn(
          "font-mono tabular-nums font-medium",
          reward.highlight ? "text-emerald-400" : "text-foreground",
        )}
      >
        {reward.value}
      </span>
    </div>
  );
}

// ── Option card ──────────────────────────────────────────────────────────────

function RebirthOptionCard({
  option,
  costUsd,
  selected,
  disabled,
  isLoadingCost,
  onSelect,
}: {
  option: RebirthOption;
  costUsd: number;
  selected: boolean;
  disabled?: boolean;
  isLoadingCost?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "group flex h-full w-full flex-col rounded-xl border bg-card/60 p-5 text-left backdrop-blur transition-all",
        "hover:border-primary/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        selected
          ? "border-emerald-500/60 ring-2 ring-emerald-500/30"
          : "border-border/50",
        disabled && "cursor-not-allowed opacity-50 hover:border-border/50 hover:bg-card/60",
      )}
    >
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {option.name}
            </h3>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {option.subtitle}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {option.multiplier === 1.5 ? "1.5×" : `${option.multiplier}×`}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {option.description}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {option.rewards.map((reward) => (
          <RewardRow
            key={`${option.id}-${reward.kind}-${reward.label}`}
            reward={reward}
          />
        ))}
      </div>

      <div className="mt-4 border-t border-border/40 pt-4">
        {disabled ? (
          <p className="text-center text-sm font-medium text-muted-foreground">
            Currently unavailable
          </p>
        ) : isLoadingCost ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading cost...</span>
          </div>
        ) : (
          <p className="text-center text-2xl font-bold tabular-nums text-foreground">
            ${costUsd.toLocaleString()}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Main action ──────────────────────────────────────────────────────────────

export function RebirthAction() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const publicClient = usePublicClient();

  const rebirthConfigured = isRebirthContractConfigured(addresses.rebirth);

  const [selectedOptionId, setSelectedOptionId] = useState<0 | 1 | 2 | null>(
    null,
  );
  const [selectedTokenId, setSelectedTokenId] = useState(0);
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);
  const [step, setStep] = useState<"approve" | "rebirth">("rebirth");
  const [statusLoading, setStatusLoading] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<{
    isDead: boolean;
    rankLevel: number;
    rankIndex: number;
    baseCostUsd: number;
  } | null>(null);
  const [optionQuotes, setOptionQuotes] = useState<
    Record<number, RebirthOptionState>
  >({});

  const { data: swapData, isLoading: swapLoading } = useReadContract({
    address: addresses.swapRouter,
    abi: SWAP_ROUTER_ABI,
    functionName: "getSwapTokens",
    chainId: chainConfig.wagmiChainId,
    query: { enabled: rebirthConfigured },
  });

  const swapTokens = useMemo(() => parseSwapTokens(swapData), [swapData]);
  const stableSwapTokenId = useMemo(
    () => findStableSwapTokenId(swapTokens),
    [swapTokens],
  );
  const selectedToken = swapTokens.find((token) => token.tokenId === selectedTokenId);
  const isNativeToken =
    selectedToken?.tokenAddress ===
    "0x0000000000000000000000000000000000000000";

  const loadPlayerStatus = useCallback(async () => {
    if (!publicClient || !address || !isConnected) {
      setPlayerStatus(null);
      return;
    }
    setStatusLoading(true);
    try {
      const status = await getRebirthPlayerStatus({
        publicClient,
        mafiaFamilyAddress: addresses.mafiaFamily,
        rankXpAddress: addresses.rankXp,
        wallet: address,
      });
      setPlayerStatus(status);
    } catch (e) {
      console.error("Failed to load rebirth status:", e);
      setPlayerStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [
    publicClient,
    address,
    isConnected,
    addresses.mafiaFamily,
    addresses.rankXp,
  ]);

  const loadOptionQuotes = useCallback(async () => {
    if (
      !publicClient ||
      !address ||
      !rebirthConfigured ||
      stableSwapTokenId === null
    ) {
      return;
    }

    setQuotesLoading(true);
    try {
      const quotes = await fetchRebirthOptionQuotes({
        publicClient,
        rebirthAddress: addresses.rebirth,
        wallet: address,
        stableSwapTokenId,
      });
      setOptionQuotes(
        quotes.reduce<Record<number, RebirthOptionState>>((acc, quote) => {
          acc[quote.optionId] = quote;
          return acc;
        }, {}),
      );
    } catch (e) {
      console.error("Failed to load rebirth quotes:", e);
      setOptionQuotes({});
    } finally {
      setQuotesLoading(false);
    }
  }, [
    publicClient,
    address,
    rebirthConfigured,
    stableSwapTokenId,
    addresses.rebirth,
  ]);

  useEffect(() => {
    loadPlayerStatus();
  }, [loadPlayerStatus]);

  useEffect(() => {
    loadOptionQuotes();
  }, [loadOptionQuotes]);

  useEffect(() => {
    if (swapTokens.length > 0) {
      const first = swapTokens.find((token) => token.isEnabled);
      if (first) setSelectedTokenId(first.tokenId);
    }
  }, [swapTokens]);

  const isDead = playerStatus?.isDead ?? false;
  const rankLevel = playerStatus?.rankLevel ?? 1;
  const rankIndex = playerStatus?.rankIndex ?? 0;
  const baseCostUsd =
    optionQuotes[0]?.usdCost ?? playerStatus?.baseCostUsd ?? 50;
  const rankName = RANK_NAMES[rankIndex] ?? `Rank ${rankLevel}`;

  const rebirthOptions = useMemo(
    () =>
      REBIRTH_OPTIONS.map((option) => ({
        ...option,
        costUsd: optionQuotes[option.id]?.usdCost ?? 0,
        enabled: optionQuotes[option.id]?.enabled ?? false,
      })),
    [optionQuotes],
  );

  const selectedOption =
    selectedOptionId !== null
      ? rebirthOptions.find((option) => option.id === selectedOptionId) ?? null
      : null;

  const selectedCostUsd = selectedOption?.costUsd ?? null;

  const totalTokenCost = useMemo(() => {
    if (!selectedCostUsd || !selectedToken || selectedToken.formattedPrice === 0) {
      return null;
    }
    return (selectedCostUsd * REBIRTH_PAYMENT_BUFFER) / selectedToken.formattedPrice;
  }, [selectedCostUsd, selectedToken]);

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: selectedToken?.tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, addresses.rebirth] : undefined,
    chainId: chainConfig.wagmiChainId,
    query: {
      enabled: Boolean(
        address && selectedToken && !isNativeToken && rebirthConfigured,
      ),
    },
  });

  const needsApproval = useMemo(() => {
    if (isNativeToken || !totalTokenCost || !selectedToken) return false;
    if (!allowanceData) return true;
    const allowance = Number(
      formatUnits(allowanceData as bigint, selectedToken.decimal),
    );
    return allowance < totalTokenCost;
  }, [isNativeToken, totalTokenCost, allowanceData, selectedToken]);

  useEffect(() => {
    if (isNativeToken || !needsApproval) {
      setStep("rebirth");
    } else {
      setStep("approve");
    }
  }, [isNativeToken, needsApproval]);

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const {
    writeContract: writeRebirth,
    data: rebirthHash,
    isPending: rebirthPending,
    error: rebirthError,
    reset: resetRebirth,
  } = useChainWriteContract();

  const { isLoading: rebirthConfirming, isSuccess: rebirthSuccess } =
    useWaitForTransactionReceipt({ hash: rebirthHash });

  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance();
      setStep("rebirth");
      toast.success("Token approved!");
    }
  }, [approveSuccess, refetchAllowance]);

  useEffect(() => {
    if (rebirthSuccess) {
      toast.success("Rebirth complete — welcome back!");
      resetRebirth();
      resetApprove();
      router.push("/");
    }
  }, [rebirthSuccess, router, resetRebirth, resetApprove]);

  const showStatusLoading =
    isConnected && !!address && (statusLoading || playerStatus === null);

  const isBusy =
    approvePending ||
    approveConfirming ||
    rebirthPending ||
    rebirthConfirming;

  const txError = approveError || rebirthError;

  const handleSelectOption = useCallback(
    (optionId: 0 | 1 | 2) => {
      const option = rebirthOptions.find((item) => item.id === optionId);
      if (option && !option.enabled) {
        toast.error("This rebirth option is currently disabled.");
        return;
      }
      setSelectedOptionId(optionId);
    },
    [rebirthOptions],
  );

  const handleApprove = useCallback(() => {
    if (!selectedToken || !totalTokenCost) return;
    const approveAmount = parseUnits(
      (totalTokenCost * 1.01).toFixed(selectedToken.decimal),
      selectedToken.decimal,
    );
    writeApprove({
      address: selectedToken.tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addresses.rebirth, approveAmount],
    });
  }, [selectedToken, totalTokenCost, writeApprove, addresses.rebirth]);

  const handleRebirth = useCallback(async () => {
    if (!address || !publicClient || !selectedOption || !selectedToken) return;

    if (!rebirthConfigured) {
      toast.error("Rebirth is not available on this chain yet.");
      return;
    }

    if (!selectedOption.enabled) {
      toast.error("This rebirth option is currently disabled.");
      return;
    }

    try {
      const quote = await quoteRebirthPayment({
        publicClient,
        rebirthAddress: addresses.rebirth,
        wallet: address,
        optionId: selectedOption.id,
        swapTokenId: selectedTokenId,
      });

      if (!validateRebirthUsdCost(quote.usdCost, rankLevel, selectedOption.id)) {
        toast.error(
          "On-chain cost does not match expected price. Refresh and try again.",
        );
        await loadOptionQuotes();
        return;
      }

      const bufferedAmount =
        (quote.inputAmount * BigInt(Math.round(REBIRTH_PAYMENT_BUFFER * 100))) /
        BigInt(100);

      if (isNativeToken) {
        writeRebirth({
          address: addresses.rebirth,
          abi: REBIRTH_ABI,
          functionName: "initiateRebirth",
          args: [BigInt(selectedOption.id), BigInt(selectedTokenId)],
          value: bufferedAmount,
        } as any);
      } else {
        writeRebirth({
          address: addresses.rebirth,
          abi: REBIRTH_ABI,
          functionName: "initiateRebirth",
          args: [BigInt(selectedOption.id), BigInt(selectedTokenId)],
        });
      }
    } catch (e) {
      console.error("Rebirth failed:", e);
      toast.error("Could not complete rebirth. Check your wallet and try again.");
    }
  }, [
    address,
    publicClient,
    selectedOption,
    selectedToken,
    rebirthConfigured,
    addresses.rebirth,
    selectedTokenId,
    rankLevel,
    loadOptionQuotes,
    isNativeToken,
    writeRebirth,
  ]);

  useEffect(() => {
    setSelectedOptionId(null);
  }, [baseCostUsd]);

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <Skull className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm text-muted-foreground">
          Connect your wallet to view rebirth options.
        </p>
      </div>
    );
  }

  if (!rebirthConfigured) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <Skull className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h2 className="mt-5 text-xl font-semibold text-foreground">
          Rebirth not available on {chainConfig.label}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          The rebirth contract is not deployed on this chain yet. Switch to BNB
          Chain or check back later.
        </p>
      </div>
    );
  }

  if (showStatusLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <span className="text-sm">Loading account status...</span>
      </div>
    );
  }

  if (!isDead) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
          <Shield className="h-7 w-7 text-emerald-400" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-foreground">
          Your account is alive
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Rebirth is only available after you have been killed.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-[960px] space-y-10">
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 h-64 rounded-3xl bg-gradient-to-b from-red-950/20 via-background/0 to-transparent"
        aria-hidden
      />

      <div className="relative text-center">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <Skull className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Choose your rebirth
          </h2>
        </div>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Rebirth cost is based on your rank — your base rank cost is{" "}
          <span className="font-semibold text-foreground">
            ${baseCostUsd.toLocaleString()}
          </span>
          . You will not get items back, but each option mints a new reward
          bundle. Recovery is partial.
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground/80">
          {rankName} · rank level {rankLevel}
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
        {rebirthOptions.map((option) => (
          <RebirthOptionCard
            key={option.id}
            option={option}
            costUsd={option.costUsd}
            selected={selectedOptionId === option.id}
            disabled={!quotesLoading && !option.enabled}
            isLoadingCost={quotesLoading}
            onSelect={() => handleSelectOption(option.id)}
          />
        ))}
      </div>

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
              type="button"
              onClick={() => setTokenMenuOpen(!tokenMenuOpen)}
              disabled={isBusy}
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
                  .filter((token) => token.isEnabled)
                  .map((token) => (
                    <button
                      key={token.tokenId}
                      type="button"
                      onClick={() => {
                        setSelectedTokenId(token.tokenId);
                        setTokenMenuOpen(false);
                        resetApprove();
                        resetRebirth();
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-primary/5",
                        selectedTokenId === token.tokenId && "bg-primary/10",
                      )}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                        <Zap className="h-3 w-3 text-primary" />
                      </div>
                      <p className="flex-1 text-sm font-medium text-foreground">
                        {token.name}
                      </p>
                      {selectedTokenId === token.tokenId && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {totalTokenCost !== null && selectedToken && selectedOption && (
          <div className="mt-3 rounded-lg bg-background/50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Cost</span>
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
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">USD</span>
              <span className="font-mono text-xs text-muted-foreground">
                ${selectedCostUsd?.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {txError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="line-clamp-2 text-[10px] text-red-400">
            {txError.message?.includes("User rejected")
              ? "Transaction rejected by user"
              : txError.message?.split("\n")[0]}
          </p>
        </div>
      )}

      {step === "approve" && !isNativeToken && selectedOption && (
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
                Allow the rebirth contract to spend your {selectedToken?.name}
              </p>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleApprove}
            disabled={!selectedToken || isBusy}
          >
            {approvePending || approveConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {approveConfirming ? "Confirming..." : "Approving..."}
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Approve {selectedToken?.name}
              </>
            )}
          </Button>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          disabled={
            isBusy ||
            selectedOptionId === null ||
            !selectedOption?.enabled ||
            quotesLoading ||
            !totalTokenCost ||
            (step === "approve" && !isNativeToken)
          }
          onClick={handleRebirth}
          className={cn(
            "min-w-[280px] bg-gradient-to-r from-emerald-600 to-emerald-500 text-base font-semibold text-white shadow-lg shadow-emerald-900/30",
            "hover:from-emerald-500 hover:to-emerald-400",
            "disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none",
          )}
        >
          {rebirthPending || rebirthConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {rebirthConfirming ? "Confirming..." : "Rebirthing..."}
            </>
          ) : selectedOptionId === null ? (
            "Select a rebirth option"
          ) : !selectedOption?.enabled ? (
            "Selected option is disabled"
          ) : step === "approve" && !isNativeToken ? (
            "Approve token first"
          ) : (
            `Become alive again — $${selectedCostUsd?.toLocaleString()}`
          )}
        </Button>

        {rebirthHash && (
          <a
            href={`${explorer}/tx/${rebirthHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View transaction
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <Card className="border-border/50 bg-card/40 backdrop-blur">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              Unstake your assets
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Withdraw your rank MAFIA stakes and manage equipment while dead. This
            does not revive your account — use rebirth when you are ready to
            return.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/rank-activation">
                <TrendingUp className="mr-2 h-4 w-4" />
                Rank stakes
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/unstake-mafia">
                <Wrench className="mr-2 h-4 w-4" />
                Equipment
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
