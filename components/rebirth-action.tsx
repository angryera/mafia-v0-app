"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { useChainAddresses } from "@/components/chain-provider";
import { RANK_NAMES } from "@/lib/contract";
import {
  REBIRTH_OPTIONS,
  CDN_IMAGE_BASE,
  confirmRebirth,
  getOptionCostUsd,
  getRebirthPlayerStatus,
  type RebirthOption,
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
  onSelect,
}: {
  option: RebirthOption;
  costUsd: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex h-full w-full flex-col rounded-xl border bg-card/60 p-5 text-left backdrop-blur transition-all",
        "hover:border-primary/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        selected
          ? "border-emerald-500/60 ring-2 ring-emerald-500/30"
          : "border-border/50",
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
          <RewardRow key={`${option.id}-${reward.kind}-${reward.label}`} reward={reward} />
        ))}
      </div>

      <div className="mt-4 border-t border-border/40 pt-4">
        <p className="text-center text-2xl font-bold tabular-nums text-foreground">
          ${costUsd.toLocaleString()}
        </p>
      </div>
    </button>
  );
}

// ── Main action ──────────────────────────────────────────────────────────────

export function RebirthAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { authData, requestSignature } = useAuth();
  const publicClient = usePublicClient();

  const [selectedOptionId, setSelectedOptionId] = useState<0 | 1 | 2 | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<{
    isDead: boolean;
    rankLevel: number;
    rankIndex: number;
    baseCostUsd: number;
  } | null>(null);

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
  }, [publicClient, address, isConnected, addresses.mafiaFamily, addresses.rankXp]);

  useEffect(() => {
    loadPlayerStatus();
  }, [loadPlayerStatus]);

  const isDead = !(playerStatus?.isDead ?? false);
  const rankLevel = playerStatus?.rankLevel ?? 1;
  const rankIndex = playerStatus?.rankIndex ?? 0;
  const baseCostUsd = playerStatus?.baseCostUsd ?? 50;
  const rankName = RANK_NAMES[rankIndex] ?? `Rank ${rankLevel}`;

  const optionCosts = useMemo(
    () =>
      REBIRTH_OPTIONS.map((opt) =>
        getOptionCostUsd(baseCostUsd, opt.multiplier),
      ),
    [baseCostUsd],
  );

  const selectedCostUsd =
    selectedOptionId !== null ? optionCosts[selectedOptionId] : null;

  const showStatusLoading =
    isConnected && !!address && (statusLoading || playerStatus === null);

  const handleConfirm = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Account not connected");
      return;
    }

    if (!authData) {
      toast.error(
        "Please sign the message in your wallet to verify your identity.",
      );
      requestSignature();
      return;
    }

    if (selectedOptionId === null) {
      toast.error("Select a rebirth option to continue.");
      return;
    }

    if (!isDead) {
      toast.error("Rebirth is only available when your account is dead.");
      return;
    }

    setConfirming(true);
    try {
      await confirmRebirth({
        account: address,
        optionId: selectedOptionId,
        costUsd: optionCosts[selectedOptionId],
        rankIndex,
      });
      toast.success(
        "Rebirth payment validated. On-chain revival will be enabled in an upcoming update.",
      );
      await loadPlayerStatus();
    } catch (e) {
      console.error("Rebirth failed:", e);
      toast.error(
        "Could not complete rebirth. Check your wallet and try again.",
      );
    } finally {
      setConfirming(false);
    }
  }, [
    isConnected,
    address,
    authData,
    requestSignature,
    selectedOptionId,
    isDead,
    optionCosts,
    rankIndex,
    loadPlayerStatus,
  ]);

  // Reset selection when rank cost changes materially
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
      {/* Dramatic background accent */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 h-64 rounded-3xl bg-gradient-to-b from-red-950/20 via-background/0 to-transparent"
        aria-hidden
      />

      {/* Header */}
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

      {/* Option cards */}
      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
        {REBIRTH_OPTIONS.map((option, i) => (
          <RebirthOptionCard
            key={option.id}
            option={option}
            costUsd={optionCosts[i]}
            selected={selectedOptionId === option.id}
            onSelect={() => setSelectedOptionId(option.id)}
          />
        ))}
      </div>

      {/* Confirm */}
      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={confirming || selectedOptionId === null}
          onClick={handleConfirm}
          className={cn(
            "min-w-[280px] bg-gradient-to-r from-emerald-600 to-emerald-500 text-base font-semibold text-white shadow-lg shadow-emerald-900/30",
            "hover:from-emerald-500 hover:to-emerald-400",
            "disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none",
          )}
        >
          {confirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Rebirthing...
            </>
          ) : selectedOptionId === null ? (
            "Select a rebirth option"
          ) : (
            `Become alive again — $${selectedCostUsd?.toLocaleString()}`
          )}
        </Button>
      </div>

      {/* Unstake section */}
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
