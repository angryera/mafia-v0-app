"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useReadContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { formatEther, decodeEventLog } from "viem";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  WEEKLY_MISSION_ABI,
  type UserMissionStatus,
  getCommonMissionMetadata,
  getSmuggleMissionInfo,
  getCityName,
  calculateCurrentReward,
  calculateRemainingTime,
  formatTimeRemaining,
  WEEKLY_DURATION_SECONDS,
} from "@/lib/weekly-mission";
import { CONTRACT_ABI, USER_PROFILE_CONTRACT_ABI } from "@/lib/contract";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  Gift,
  Zap,
  RefreshCw,
  Trophy,
  ExternalLink,
  TrendingDown,
  Target,
  Package,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Common Mission Card (list item style, no image)
function CommonMissionCard({
  title,
  description,
  isCompleted,
  link,
  cityName,
}: {
  title: string;
  description: string;
  isCompleted: boolean;
  link?: string;
  cityName?: string;
}) {
  const content = (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all duration-200",
        isCompleted
          ? "border-green-500/30 bg-green-500/5"
          : "hover:border-primary/30 hover:bg-card/80"
      )}
    >
      <div className="shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground truncate">
            {title}
          </h4>
          {cityName && (
            <span className="shrink-0 inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {cityName}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">
          {description}
        </p>
      </div>
      {link && !isCompleted && (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
      )}
    </div>
  );

  if (link && !isCompleted) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}

// Smuggle Mission Card (list item style)
function SmuggleMissionCard({
  title,
  description,
  isCompleted,
  link,
  cityName,
}: {
  title: string;
  description: string;
  isCompleted: boolean;
  link?: string;
  cityName?: string;
}) {
  const content = (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all duration-200",
        isCompleted
          ? "border-green-500/30 bg-green-500/5"
          : "hover:border-primary/30 hover:bg-card/80"
      )}
    >
      <div className="shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground truncate">
            {title}
          </h4>
          {cityName && (
            <span className="shrink-0 inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {cityName}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">
          {description}
        </p>
      </div>
      {link && !isCompleted && (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
      )}
    </div>
  );

  if (link && !isCompleted) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}

export function WeeklyMissionGrid() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // Read player's current city for smuggle mission links
  const { data: playerProfileRaw } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getProfile",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
    },
  });

  const playerCityId = useMemo(() => {
    if (!playerProfileRaw) return undefined;
    const raw = playerProfileRaw as { city: number };
    return Number(raw.city);
  }, [playerProfileRaw]);

  // Read mission status
  const {
    data: missionStatusRaw,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useReadContract({
    address: addresses.weeklyMission,
    abi: WEEKLY_MISSION_ABI,
    functionName: "getUserMissionStatus",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 30_000,
    },
  });

  // Parse mission status
  const missionStatus = useMemo((): UserMissionStatus | null => {
    if (!missionStatusRaw) return null;
    const raw = missionStatusRaw as {
      startedAt: bigint;
      completedAt: bigint;
      status: number;
      maxReward: bigint;
      commonMissions: Array<{ missionId: number; isCompleted: boolean }>;
      smuggleMissions: Array<{
        messageType: string;
        messageSubType: string;
        typeId: number;
        cityId: number;
        isCompleted: boolean;
      }>;
    };

    return {
      startedAt: Number(raw.startedAt),
      completedAt: Number(raw.completedAt),
      status: Number(raw.status),
      maxReward: raw.maxReward,
      commonMissions: raw.commonMissions.map((m) => ({
        missionId: Number(m.missionId),
        isCompleted: m.isCompleted,
      })),
      smuggleMissions: raw.smuggleMissions.map((m) => ({
        messageType: m.messageType,
        messageSubType: m.messageSubType,
        typeId: Number(m.typeId),
        cityId: Number(m.cityId),
        isCompleted: m.isCompleted,
      })),
    };
  }, [missionStatusRaw]);

  // Derived state
  const currentTime = Math.floor(Date.now() / 1000);
  const isExpired = missionStatus
    ? missionStatus.startedAt > 0 &&
    currentTime > missionStatus.startedAt + WEEKLY_DURATION_SECONDS
    : false;
  const generateNeeded =
    !missionStatus ||
    missionStatus.status === 0 ||
    (missionStatus.status === 2 && isExpired);

  const completedCommon =
    missionStatus?.commonMissions.filter((m) => m.isCompleted).length ?? 0;
  const completedSmuggle =
    missionStatus?.smuggleMissions.filter((m) => m.isCompleted).length ?? 0;
  const totalCommon = missionStatus?.commonMissions.length ?? 0;
  const totalSmuggle = missionStatus?.smuggleMissions.length ?? 0;
  const totalMissions = totalCommon + totalSmuggle;
  const completedMissions = completedCommon + completedSmuggle;
  const progressPercent =
    totalMissions > 0 ? Math.round((completedMissions * 100) / totalMissions) : 0;

  const isClaimable =
    missionStatus &&
    missionStatus.status === 1 &&
    completedMissions === totalMissions &&
    totalMissions > 0;

  // Reward calculations
  const maxRewardFormatted = missionStatus
    ? Number(formatEther(missionStatus.maxReward)).toLocaleString()
    : "0";
  const currentReward = missionStatus
    ? calculateCurrentReward(
      Number(formatEther(missionStatus.maxReward)),
      missionStatus.startedAt
    )
    : 0;

  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  useEffect(() => {
    if (!missionStatus || missionStatus.startedAt === 0) {
      setTimeRemaining(0);
      return;
    }
    const tick = () => {
      setTimeRemaining(calculateRemainingTime(missionStatus.startedAt));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [missionStatus]);

  // Contract write hooks
  const {
    writeContractAsync,
    isPending: isWritePending,
    reset: resetWrite,
    data: txHash,
  } = useChainWriteContract();

  const { isLoading: isConfirming, isSuccess: txSuccess, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Track claimed reward from event
  const claimedReward = useMemo(() => {
    if (!receipt?.logs || !txSuccess) return null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: WEEKLY_MISSION_ABI,
          data: log.data,
          topics: log.topics,
          strict: false,
        });
        if (decoded.eventName === "WeeklyMissionClaimed") {
          const args = decoded.args as unknown as { reward: bigint };
          return Number(formatEther(args.reward));
        }
      } catch {
        // Not our event
      }
    }
    return null;
  }, [receipt, txSuccess]);

  // Toast notifications
  const toastShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (!txHash || !txSuccess || toastShownRef.current === txHash) return;
    toastShownRef.current = txHash;
    if (claimedReward !== null) {
      toast.success(`Claimed ${claimedReward.toLocaleString()} cash reward!`);
    } else {
      toast.success("Transaction confirmed!");
    }
    refetchStatus();
  }, [txHash, txSuccess, claimedReward, refetchStatus]);

  // Action handlers
  const handleGenerate = async () => {
    resetWrite();
    try {
      await writeContractAsync({
        address: addresses.weeklyMission,
        abi: WEEKLY_MISSION_ABI,
        functionName: "startWeeklyMission",
        args: [],
      });
    } catch (err) {
      console.error("Generate missions error:", err);
      toast.error("Failed to generate missions");
    }
  };

  const handleClaim = async () => {
    resetWrite();
    try {
      await writeContractAsync({
        address: addresses.weeklyMission,
        abi: WEEKLY_MISSION_ABI,
        functionName: "claimWeeklyMission",
        args: [],
      });
    } catch (err) {
      console.error("Claim error:", err);
      toast.error("Failed to claim reward");
    }
  };

  const isLoading = isWritePending || isConfirming;

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Connect Wallet
        </h3>
        <p className="text-sm text-muted-foreground">
          Connect your wallet to view and complete weekly missions
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoadingStatus) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading missions...</p>
      </div>
    );
  }

  // Generate missions state
  if (generateNeeded) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {isExpired ? "Missions Expired" : "No Active Missions"}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          {isExpired
            ? "Your previous mission cycle has expired. Generate new missions to continue earning rewards."
            : "Start a new weekly mission cycle to earn cash rewards by completing various activities."}
        </p>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200",
            "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isWritePending ? "Confirm in wallet..." : "Generating..."}
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Generate Missions
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats - responsive grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Progress */}
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Target className="h-4 w-4 text-primary shrink-0" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
              Progress
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-1">
              <span className="text-xl sm:text-2xl font-bold text-foreground">
                {progressPercent}%
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                {completedMissions}/{totalMissions}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5 sm:h-2" />
          </div>
        </div>

        {/* Time Remaining */}
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
              Time Left
            </span>
          </div>
          <span
            className={cn(
              "text-lg sm:text-2xl font-bold block truncate",
              timeRemaining <= 0
                ? "text-red-500"
                : timeRemaining < 86400
                  ? "text-yellow-500"
                  : "text-foreground"
            )}
          >
            {formatTimeRemaining(timeRemaining)}
          </span>
        </div>

        {/* Max Reward */}
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Trophy className="h-4 w-4 text-primary shrink-0" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
              Max Reward
            </span>
          </div>
          <span className="text-lg sm:text-2xl font-bold text-foreground font-mono block truncate">
            ${maxRewardFormatted}
          </span>
        </div>

        {/* Current Reward */}
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <TrendingDown className="h-4 w-4 text-yellow-500 shrink-0" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
              Current
            </span>
          </div>
          <span className="text-lg sm:text-2xl font-bold text-yellow-500 font-mono block truncate">
            ${currentReward.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleClaim}
          disabled={!isClaimable || isLoading}
          className={cn(
            "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200",
            isClaimable
              ? "bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {isLoading && txHash ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Gift className="h-4 w-4" />
              Claim Reward
            </>
          )}
        </button>

        <button
          onClick={() => refetchStatus()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

        {txHash && (
          <a
            href={`${explorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-4 py-2.5 text-xs font-mono text-primary hover:bg-secondary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {txHash.slice(0, 8)}...{txHash.slice(-6)}
          </a>
        )}
      </div>

      {/* Common Missions Section */}
      {missionStatus && missionStatus.commonMissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Common Missions
            </h3>
            <span className="text-xs text-muted-foreground">
              {completedCommon}/{totalCommon} completed
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {missionStatus.commonMissions.map((mission, idx) => {
              const metadata = getCommonMissionMetadata(mission.missionId);
              return (
                <CommonMissionCard
                  key={`common-${idx}`}
                  title={metadata?.title || `Mission #${mission.missionId}`}
                  description={
                    metadata?.description || "Complete this mission to progress"
                  }
                  isCompleted={mission.isCompleted}
                  link={metadata?.link}
                  cityName={
                    metadata?.isCitySpecific && metadata.cityId !== undefined
                      ? getCityName(metadata.cityId)
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Smuggle Missions Section */}
      {missionStatus && missionStatus.smuggleMissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Smuggle Missions
            </h3>
            <span className="text-xs text-muted-foreground">
              {completedSmuggle}/{totalSmuggle} completed
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {missionStatus.smuggleMissions.map((mission, idx) => {
              const info = getSmuggleMissionInfo(
                mission.messageType,
                mission.messageSubType,
                mission.typeId,
                mission.cityId,
                playerCityId
              );
              return (
                <SmuggleMissionCard
                  key={`smuggle-${idx}`}
                  title={info.title}
                  description={info.description}
                  isCompleted={mission.isCompleted}
                  link={info.link}
                  cityName={getCityName(mission.cityId)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state if no missions */}
      {missionStatus &&
        missionStatus.commonMissions.length === 0 &&
        missionStatus.smuggleMissions.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No missions available
            </p>
          </div>
        )}
    </div>
  );
}
