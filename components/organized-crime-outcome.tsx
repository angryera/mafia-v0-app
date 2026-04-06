"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  OC_EXECUTION_ABI,
  OC_HEALTH_LOSS,
  OC_JAIL_HOURS,
} from "@/lib/contract";
import { OC_RESULT_DESCRIPTION } from "@/lib/oc-result-description";
import {
  Trophy,
  XCircle,
  AlertTriangle,
  Gift,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Heart,
  Lock,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
            {rewards.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Your Team Earned
                </h3>
                <div className="space-y-2">
                  {rewards.map((reward, index) => (
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
                    Instant failure - lost {OC_HEALTH_LOSS} health
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-red-500/10 px-4 py-3">
                  <Lock className="h-5 w-5 text-red-500" />
                  <span className="text-red-300">In jail for {OC_JAIL_HOURS} hours</span>
                </div>
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
                Failed but got away - lost {OC_HEALTH_LOSS} health
              </span>
            </div>
          </div>

          {/* Lost Items */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Lost Assets
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-amber-300">
                <Minus className="h-4 w-4" />
                <span>Weapons used in the operation</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-300">
                <Minus className="h-4 w-4" />
                <span>Armor worn during the heist</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-300">
                <Minus className="h-4 w-4" />
                <span>Grenades and molotovs thrown</span>
              </div>
              {lobby.deductedScore > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-300">
                  <Minus className="h-4 w-4" />
                  <span>Partial cash and bullet deductions</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </OutcomeCard>
  );
}
