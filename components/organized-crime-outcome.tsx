"use client";

import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { Button } from "@/components/ui/button";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { useToast } from "@/hooks/use-toast";
import {
  MARKETPLACE_ITEM_NAMES,
  OC_EXECUTION_ABI,
  OC_JAIL_HOURS,
  OC_REWARD_CONFIG,
} from "@/lib/contract";
import { OC_RESULT_DESCRIPTION } from "@/lib/oc-result-description";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Gift,
  Heart,
  Loader2,
  Lock,
  Minus,
  Shield,
  Trophy,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";

type LobbyFinishInfo = {
  isSuccess: boolean;
  failureType: number;
  successChance: number;
  carDamage: number;
  cashDeduction: number;
  bulletsDeduction: number;
  bgDeduction: number;
  newBodyguardItemId: number;
  newBodyguardCategoryId: number;
  newBodyguardTypeId: number;
  rewardSizePercents: number[];
  rewardTypeIds: number[];
  rewardCount: number;
};

function parseLobbyFinishInfo(data: unknown): LobbyFinishInfo {
  const d = data as Record<string, unknown>;
  return {
    isSuccess: Boolean(d.isSuccess),
    failureType: Number(d.failureType),
    successChance: Number(d.successChance),
    carDamage: Number(d.carDamage),
    cashDeduction: Number(d.cashDeduction),
    bulletsDeduction: Number(d.bulletsDeduction),
    bgDeduction: Number(d.bgDeduction),
    newBodyguardItemId: Number(d.newBodyguardItemId),
    newBodyguardCategoryId: Number(d.newBodyguardCategoryId),
    newBodyguardTypeId: Number(d.newBodyguardTypeId),
    rewardSizePercents: ((d.rewardSizePercents as unknown[]) || []).map((x) => Number(x)),
    rewardTypeIds: ((d.rewardTypeIds as unknown[]) || []).map((x) => Number(x)),
    rewardCount: Number(d.rewardCount),
  };
}

function getOcRewardAmountFromSizePercent(typeId: number, sizePercent: number): number | null {
  const cfg = OC_REWARD_CONFIG[typeId];
  if (!cfg) return null;
  const p = Math.max(0, Math.min(100, Number(sizePercent)));
  const raw = cfg.min + ((cfg.max - cfg.min) * p) / 100;

  // Some reward categories are minted in fixed bundle sizes.
  // - Booze (typeId 2): multiples of 75
  // - Narcs (typeId 3): multiples of 50
  const step = typeId === 2 ? 75 : typeId === 3 ? 50 : null;
  const stepped = step ? Math.floor(raw / step) * step : raw;

  // Clamp to on-chain bounds.
  return Math.max(cfg.min, Math.min(cfg.max, stepped));
}

function getMarketplaceItemName(categoryId: number, typeId: number): string | null {
  const cat = MARKETPLACE_ITEM_NAMES[categoryId];
  const name = cat?.[typeId];
  return name ?? null;
}

// ── Types ───────────────────────────────────────────────────────
interface Member {
  user: string;
  itemIds: number[];
  impactScore: number;
  deductedScore: number;
  assetAddresses: string[];
  assetAmounts: number[];
}

interface Reward {
  typeId: number;
  amount: number;
}

interface CrimeLobby {
  id: number;
  leader: string;
  members: Member[];
  isSuccess: boolean;
  city: number;
  failureType: number;
  assetExpectation: number;
  minRank: number;
  impactScore: number;
  deductedScore: number;
  status: number;
  createdAt: number;
  startBlock: number;
  isRewardClaimed: boolean;
  currentRewardIndex: number;
  rewards: Reward[];
}

type OutcomeType = "SUCCESS" | "INSTANCE_FAILURE" | "FAIL_AWAY";

// ── Helpers ─────────────────────────────────────────────────────
function determineOutcomeType(lobby: CrimeLobby): OutcomeType {
  if (lobby.isSuccess) {
    return "SUCCESS";
  } else if (lobby.failureType === 0) {
    return "INSTANCE_FAILURE";
  } else {
    return "FAIL_AWAY";
  }
}

function getStoryText(outcomeType: OutcomeType, blockNumber: number): string {
  const stories = OC_RESULT_DESCRIPTION[outcomeType];
  const storyIndex = blockNumber % stories.length;
  return stories[storyIndex].join(" ");
}

function getRewardTypeLabel(typeId: number, amount: number): string {
  switch (typeId) {
    case 0:
      return `${amount.toLocaleString()} Cash`;
    case 1:
      return `${amount} ${amount === 1 ? "Key" : "Keys"}`;
    case 2:
      return `${amount} Booze item${amount === 1 ? "" : "s"}`;
    case 3:
      return `${amount} Narcs item${amount === 1 ? "" : "s"}`;
    case 4:
      return `${amount} Helper credit${amount === 1 ? "" : "s"}`;
    case 5:
      return `${amount} GI Credit${amount === 1 ? "" : "s"}`;
    case 6:
      return `${amount} Perk box${amount === 1 ? "" : "es"}`;
    case 7:
      return `${amount} Mystery box${amount === 1 ? "" : "es"}`;
    case 8:
      return `${amount.toLocaleString()} Bullet${amount === 1 ? "" : "s"}`;
    case 9:
      return `${amount} Health`;
    default:
      return `Reward ${typeId}: ${amount}`;
  }
}

// ── Outcome Card ────────────────────────────────────────────────
function OutcomeCard({
  type,
  title,
  icon,
  iconColor,
  children,
}: {
  type: OutcomeType;
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
}) {
  const bgColor =
    type === "SUCCESS"
      ? "bg-green-500/5 border-green-500/30"
      : type === "INSTANCE_FAILURE"
        ? "bg-red-500/5 border-red-500/30"
        : "bg-amber-500/5 border-amber-500/30";

  return (
    <div className={cn("rounded-xl border p-6", bgColor)}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconColor)}>
          {icon}
        </div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function OrganizedCrimeOutcome({
  lobby,
  onRefresh,
}: {
  lobby: CrimeLobby;
  onRefresh: () => void;
}) {
  const { address } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { toast } = useToast();

  const [isRevealed, setIsRevealed] = useState(false);

  // Dynamic health loss for failure outcomes.
  const { data: healthDeductionRaw } = useReadContract({
    address: addresses.ocExecution,
    abi: OC_EXECUTION_ABI,
    functionName: "lobbyHealthDeduction",
    args: [BigInt(lobby.id)],
    query: { enabled: !!addresses.ocExecution && lobby.status === 2 && !lobby.isSuccess },
  });
  const healthLoss =
    healthDeductionRaw !== undefined
      ? Math.floor(Number(formatEther(healthDeductionRaw as bigint)))
      : null;

  // Fetch LobbyFinishInfo (batch view) for accurate "finished result" display.
  const { data: finishInfosRaw } = useReadContract({
    address: addresses.ocExecution,
    abi: OC_EXECUTION_ABI,
    functionName: "getLobbyFinishInfos",
    args: [[BigInt(lobby.id)]],
    query: { enabled: !!addresses.ocExecution && lobby.status === 2 },
  });

  const finishInfo: LobbyFinishInfo | null = Array.isArray(finishInfosRaw) && finishInfosRaw[0]
    ? parseLobbyFinishInfo(finishInfosRaw[0])
    : null;

  // Claim reward hooks
  const { writeContract, data: claimHash, isPending, reset } = useChainWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  // Handle claim success
  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Reward Claimed",
        description: (
          <a
            href={`${explorer}/tx/${claimHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline"
          >
            View transaction <ExternalLink className="h-3 w-3" />
          </a>
        ),
      });
      reset();
      onRefresh();
    }
  }, [isSuccess, claimHash, explorer, toast, reset, onRefresh]);

  // Reveal delay effect
  useEffect(() => {
    // If the lobby was just finished, add a delay
    // For simplicity, we'll show immediately but you can add delay here
    setIsRevealed(true);
  }, []);

  const outcomeType = determineOutcomeType(lobby);
  const storyText = getStoryText(outcomeType, lobby.startBlock);
  const isLeader = address?.toLowerCase() === lobby.leader.toLowerCase();

  const handleClaimReward = () => {
    writeContract({
      address: addresses.ocExecution,
      abi: OC_EXECUTION_ABI,
      functionName: "claimLobbyReward",
      args: [BigInt(lobby.id)],
    });
  };

  const isClaiming = isPending || isConfirming;

  // Calculate rewards for display
  const rewards = lobby.rewards.map((r) => ({
    typeId: r.typeId,
    amount: r.amount,
    label: getRewardTypeLabel(r.typeId, Math.round(r.amount)),
  }));

  const finishInfoRewards =
    finishInfo
      ? Array.from({ length: finishInfo.rewardCount }).map((_, i) => {
        const typeId = Number(finishInfo.rewardTypeIds[i]);
        const percent = Number(finishInfo.rewardSizePercents[i]);
        const amountRaw = getOcRewardAmountFromSizePercent(typeId, percent);
        const amount = amountRaw === null ? 0 : amountRaw;
        // For display we round non-cash values; cash can be large so keep integer.
        const isCash = typeId === 0;
        const displayAmount = isCash ? Math.round(amount) : Math.round(amount);
        const label = OC_REWARD_CONFIG[typeId]
          ? getRewardTypeLabel(typeId, displayAmount)
          : `Reward ${typeId} (${percent}%)`;
        return { typeId, percent, amount: displayAmount, label };
      })
      : null;

  console.log(finishInfo);

  const totalRewards = rewards.length;
  const claimedRewards = lobby.currentRewardIndex;
  const hasMoreToClaim = claimedRewards < totalRewards;

  if (outcomeType === "SUCCESS") {
    return (
      <OutcomeCard
        type="SUCCESS"
        title="Congratulations! - You succeeded!"
        icon={<Trophy className="h-6 w-6 text-green-500" />}
        iconColor="bg-green-500/10"
      >
        {/* Story */}
        <div className="mb-6">
          <p className="text-muted-foreground leading-relaxed">{storyText}</p>
        </div>

        {!isRevealed ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Revealing result...</span>
          </div>
        ) : (
          <>
            {/* Earned Items */}
            {(finishInfoRewards?.length || rewards.length) > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Your Team Earned
                </h3>
                <div className="space-y-2">
                  {(finishInfoRewards || rewards).map((reward: any, index: number) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between rounded-lg bg-card/50 px-4 py-2",
                        index < claimedRewards && "opacity-50 line-through"
                      )}
                    >
                      <span className="text-foreground">{reward.label}</span>
                      {index < claimedRewards ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Gift className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spent Items */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Your Team Spent
              </h3>
              <div className="space-y-2">
                {finishInfo ? (
                  <>
                    {finishInfo.cashDeduction > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Minus className="h-4 w-4" />
                        <span>Cash deducted: {finishInfo.cashDeduction}%</span>
                      </div>
                    )}
                    {finishInfo.bulletsDeduction > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Minus className="h-4 w-4" />
                        <span>Bullets deducted: {finishInfo.bulletsDeduction}%</span>
                      </div>
                    )}
                    {finishInfo.carDamage > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Minus className="h-4 w-4" />
                        <span>Car damage: {finishInfo.carDamage}%</span>
                      </div>
                    )}
                    {finishInfo.bgDeduction > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Minus className="h-4 w-4" />
                        <span>Bodyguard deduction: {finishInfo.bgDeduction.toLocaleString()}</span>
                      </div>
                    )}
                    {finishInfo.bgDeduction > 0 && finishInfo.newBodyguardItemId > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gift className="h-4 w-4 text-primary" />
                        <span>
                          New bodyguard:{" "}
                          {getMarketplaceItemName(
                            finishInfo.newBodyguardCategoryId,
                            finishInfo.newBodyguardTypeId
                          ) ??
                            `Category ${finishInfo.newBodyguardCategoryId}, Type ${finishInfo.newBodyguardTypeId}`}{" "}
                          #{finishInfo.newBodyguardItemId}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Minus className="h-4 w-4" />
                      <span>Weapons used in the operation</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Minus className="h-4 w-4" />
                      <span>Armor worn during the heist</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Minus className="h-4 w-4" />
                      <span>Grenades and molotovs thrown</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Claim Button */}
            {isLeader && hasMoreToClaim && (
              <Button onClick={handleClaimReward} disabled={isClaiming} className="w-full">
                {isClaiming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 h-4 w-4" />
                    Claim Reward {claimedRewards + 1} of {totalRewards}
                  </>
                )}
              </Button>
            )}

            {isLeader && !hasMoreToClaim && totalRewards > 0 && (
              <div className="flex items-center justify-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">All rewards claimed!</span>
              </div>
            )}

            {!isLeader && (
              <p className="text-center text-sm text-muted-foreground">
                Only the leader can claim rewards.
              </p>
            )}
          </>
        )}
      </OutcomeCard>
    );
  }

  if (outcomeType === "INSTANCE_FAILURE") {
    const fi = finishInfo;
    return (
      <OutcomeCard
        type="INSTANCE_FAILURE"
        title="Mission Failed."
        icon={<XCircle className="h-6 w-6 text-red-500" />}
        iconColor="bg-red-500/10"
      >
        {/* Story */}
        <div className="mb-6">
          <p className="text-muted-foreground leading-relaxed">{storyText}</p>
        </div>

        {!isRevealed ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Revealing result...</span>
          </div>
        ) : (
          <>
            {/* Result */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Result
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-red-500/10 px-4 py-3">
                  <Heart className="h-5 w-5 text-red-500" />
                  <span className="text-red-300">
                    Instant failure - lost {healthLoss ?? "…"} health
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-red-500/10 px-4 py-3">
                  <Lock className="h-5 w-5 text-red-500" />
                  <span className="text-red-300">In jail for {OC_JAIL_HOURS} hours</span>
                </div>
                {fi && fi.bgDeduction > 0 && (
                  <div className="flex items-center gap-3 rounded-lg bg-red-500/10 px-4 py-3">
                    <Shield className="h-5 w-5 text-red-500" />
                    <span className="text-red-300">
                      Bodyguard degraded
                      {fi.newBodyguardItemId > 0
                        ? ` → ${getMarketplaceItemName(fi.newBodyguardCategoryId, fi.newBodyguardTypeId) ?? `Category ${fi.newBodyguardCategoryId}, Type ${fi.newBodyguardTypeId}`} #${fi.newBodyguardItemId}`
                        : " (Lvl 1 burned)"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Lost Items */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Lost Assets
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-red-300">
                  <Minus className="h-4 w-4" />
                  <span>ALL submitted items lost</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-300">
                  <Minus className="h-4 w-4" />
                  <span>ALL cash submitted lost</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-300">
                  <Minus className="h-4 w-4" />
                  <span>ALL bullets submitted lost</span>
                </div>
              </div>
            </div>
          </>
        )}
      </OutcomeCard>
    );
  }

  // FAIL_AWAY
  const fi = finishInfo;
  return (
    <OutcomeCard
      type="FAIL_AWAY"
      title="You got away... barely."
      icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
      iconColor="bg-amber-500/10"
    >
      {/* Story */}
      <div className="mb-6">
        <p className="text-muted-foreground leading-relaxed">{storyText}</p>
      </div>

      {!isRevealed ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Revealing result...</span>
        </div>
      ) : (
        <>
          {/* Result */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Result
            </h3>
            <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 px-4 py-3">
              <Heart className="h-5 w-5 text-amber-500" />
              <span className="text-amber-300">
                Failed but got away - lost {healthLoss ?? "…"} health
              </span>
            </div>
            {fi && fi.bgDeduction > 0 && (
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-amber-500/10 px-4 py-3">
                <Shield className="h-5 w-5 text-amber-500" />
                <span className="text-amber-300">
                  Bodyguard degraded
                  {fi.newBodyguardItemId > 0
                    ? ` → ${getMarketplaceItemName(fi.newBodyguardCategoryId, fi.newBodyguardTypeId) ?? `Category ${fi.newBodyguardCategoryId}, Type ${fi.newBodyguardTypeId}`} #${fi.newBodyguardItemId}`
                    : " (Lvl 1 burned)"}
                </span>
              </div>
            )}
          </div>

          {/* Lost Items */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Lost Assets
            </h3>
            <div className="space-y-2">
              {fi ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-amber-300">
                    <Minus className="h-4 w-4" />
                    <span>Car damage: {fi.carDamage}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-amber-300">
                    <Minus className="h-4 w-4" />
                    <span>Leader cash deduction: {fi.cashDeduction}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-amber-300">
                    <Minus className="h-4 w-4" />
                    <span>Bullets deduction: {fi.bulletsDeduction}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    No weapons/armor/explosives are lost in “failed but got away”.
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Loading deduction details…
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </OutcomeCard>
  );
}
