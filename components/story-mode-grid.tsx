"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Lock,
  Trophy,
  Gift,
  Loader2,
  ExternalLink,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { toast } from "sonner";
import {
  STORY_MODE_ABI,
  type UserMissionStatus,
  CHAPTER_METADATA,
  calculateProgress,
  isStageClaimable,
  getStageState,
  type StageState,
  isValidItemId,
  formatTimestamp,
} from "@/lib/story-mode";

const TOTAL_CHAPTERS = 7;

// Defensive helper: Normalize user status with proper padding/clamping
function normalizeUserStatus(
  raw: {
    currentStage: number | bigint;
    isMissionCompleted: readonly boolean[];
    isStarted: boolean;
    startedAt: bigint;
    completedAt: readonly bigint[];
  } | null | undefined,
  tasksInCurrentStage: number
): UserMissionStatus | null {
  if (!raw) return null;

  // Clamp currentStage to [0..6]
  const currentStage = Math.min(Math.max(0, Number(raw.currentStage)), TOTAL_CHAPTERS - 1);

  // Pad isMissionCompleted if shorter than tasks in current stage
  const rawCompleted = [...raw.isMissionCompleted];
  const paddedCompleted: boolean[] = [];
  for (let i = 0; i < tasksInCurrentStage; i++) {
    paddedCompleted.push(rawCompleted[i] ?? false);
  }

  // Pad completedAt if shorter than 7
  const rawCompletedAt = [...raw.completedAt];
  const paddedCompletedAt: bigint[] = [];
  for (let i = 0; i < TOTAL_CHAPTERS; i++) {
    paddedCompletedAt.push(rawCompletedAt[i] ?? BigInt(0));
  }

  return {
    currentStage,
    isMissionCompleted: paddedCompleted,
    isStarted: raw.isStarted,
    startedAt: raw.startedAt,
    completedAt: paddedCompletedAt,
  };
}

// Stage icon component
function StageIcon({ state }: { state: StageState }) {
  switch (state) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />;
    case "claimable":
      return <Trophy className="h-5 w-5 text-amber-500 shrink-0" />;
    case "in-progress":
      return <Circle className="h-5 w-5 text-blue-500 shrink-0" />;
    case "locked":
    default:
      return <Lock className="h-5 w-5 text-muted-foreground shrink-0" />;
  }
}

// State badge component
function StateBadge({ state }: { state: StageState }) {
  switch (state) {
    case "completed":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          Complete
        </Badge>
      );
    case "claimable":
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          Claimable
        </Badge>
      );
    case "in-progress":
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          In Progress
        </Badge>
      );
    case "locked":
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Locked
        </Badge>
      );
  }
}

export function StoryModeGrid() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { writeContractAsync, isPending: isWritePending } = useChainWriteContract();

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showMysteryDialog, setShowMysteryDialog] = useState(false);
  const [mysteryResult, setMysteryResult] = useState<{
    itemId: string;
    mysteryBoxIndex: string;
    claimedAt: string;
  } | null>(null);

  // Read user status from contract (the only contract call we need)
  const {
    data: userStatusRaw,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useReadContract({
    address: addresses.storyMode,
    abi: STORY_MODE_ABI,
    functionName: "getUserMissionStatus",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: txReceipt } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Determine current stage for task count
  const rawCurrentStage = userStatusRaw ? Math.min(Math.max(0, Number(userStatusRaw.currentStage)), TOTAL_CHAPTERS - 1) : 0;
  const tasksInCurrentStage = CHAPTER_METADATA[rawCurrentStage]?.tasks.length ?? 5;

  // Parse user status with defensive normalization
  const userStatus = useMemo(() => {
    return normalizeUserStatus(userStatusRaw ?? null, tasksInCurrentStage);
  }, [userStatusRaw, tasksInCurrentStage]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!userStatus) return 0;
    return calculateProgress(userStatus, TOTAL_CHAPTERS);
  }, [userStatus]);

  const isFullyCompleted = userStatus && Number(userStatus.currentStage) >= TOTAL_CHAPTERS - 1 &&
    userStatus.completedAt[TOTAL_CHAPTERS - 1] !== undefined &&
    Number(userStatus.completedAt[TOTAL_CHAPTERS - 1]) > 0;

  // Handle tx confirmation
  useEffect(() => {
    if (isConfirmed && txReceipt) {
      // Parse events from receipt for feedback
      const logs = txReceipt.logs || [];
      let foundMysteryBox = false;

      for (const log of logs) {
        // MysteryBoxClaimed event - check for any relevant log
        // We continue with generic success if parsing fails
        if (log.topics && log.topics.length > 0) {
          // Just check if we have mystery result pending
          if (mysteryResult) {
            foundMysteryBox = true;
          }
        }
      }

      if (foundMysteryBox && mysteryResult) {
        setShowMysteryDialog(true);
      } else {
        // Generic success for claimReward
        setSuccessMessage("Stage reward claimed successfully!");
        setShowSuccessDialog(true);
      }

      // Refresh data
      refetchStatus();
      setTxHash(undefined);
    }
  }, [isConfirmed, txReceipt, refetchStatus, mysteryResult]);

  // Claim stage reward
  const handleClaimReward = useCallback(async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: addresses.storyMode,
        abi: STORY_MODE_ABI,
        functionName: "claimReward",
      });
      setTxHash(hash);
      toast.info("Transaction submitted, waiting for confirmation...");
    } catch (error) {
      console.error("Claim reward error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to claim reward"
      );
    }
  }, [address, addresses.storyMode, writeContractAsync]);

  // Claim mystery box
  const handleClaimMysteryBox = useCallback(
    async (itemId: number) => {
      if (!address) {
        toast.error("Please connect your wallet");
        return;
      }

      if (!isValidItemId(itemId)) {
        toast.error("Invalid item ID");
        return;
      }

      try {
        const hash = await writeContractAsync({
          address: addresses.storyMode,
          abi: STORY_MODE_ABI,
          functionName: "claimMysteryBox",
          args: [BigInt(itemId)],
        });
        setTxHash(hash);
        setMysteryResult({
          itemId: String(itemId),
          mysteryBoxIndex: "0",
          claimedAt: new Date().toISOString(),
        });
        toast.info("Transaction submitted, waiting for confirmation...");
      } catch (error) {
        console.error("Claim mystery box error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to claim mystery box"
        );
      }
    },
    [address, addresses.storyMode, writeContractAsync]
  );

  const isTxPending = isWritePending || isConfirming;

  // Helper to determine stage state - works even without userStatus
  // For users who haven't started: chapter 0 shows "in-progress" to indicate where to begin
  const getChapterState = useCallback((stageIndex: number): StageState => {
    if (!userStatus || !userStatus.isStarted) {
      // Show first chapter as "in-progress" to guide new users, rest as locked
      return stageIndex === 0 ? "in-progress" : "locked";
    }
    return getStageState(userStatus, stageIndex, TOTAL_CHAPTERS);
  }, [userStatus]);

  // Helper to check if task is completed
  const isTaskCompleted = useCallback((stageIndex: number, taskIndex: number): boolean => {
    if (!userStatus) return false;
    
    const currentStage = Number(userStatus.currentStage);
    
    // Past stages - all tasks completed
    if (stageIndex < currentStage) {
      return true;
    }
    
    // Future stages - no tasks completed
    if (stageIndex > currentStage) {
      return false;
    }
    
    // Current stage - check isMissionCompleted array
    return userStatus.isMissionCompleted[taskIndex] ?? false;
  }, [userStatus]);

  // Render chapter list - ALWAYS render all 7 chapters
  const renderChapters = () => {
    return CHAPTER_METADATA.map((chapter, stageIndex) => {
      const state = getChapterState(stageIndex);
      const canClaim = userStatus && isStageClaimable(userStatus, stageIndex, TOTAL_CHAPTERS);
      const isCurrentStage = userStatus && Number(userStatus.currentStage) === stageIndex;

      return (
        <AccordionItem
          key={stageIndex}
          value={`chapter-${stageIndex}`}
          className="border rounded-lg px-4 bg-background/50"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3 w-full">
              <StageIcon state={state} />
              <div className="flex-1 text-left">
                <div className="font-medium">
                  Chapter {stageIndex + 1}: {chapter.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {chapter.tasks.length} tasks
                </div>
              </div>
              <StateBadge state={state} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            {/* Tasks */}
            <div className="space-y-2 mb-4">
              {chapter.tasks.map((task, taskIndex) => {
                const completed = isTaskCompleted(stageIndex, taskIndex);
                const canNavigate = isConnected && state !== "locked";

                return (
                  <div
                    key={taskIndex}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      state === "locked" ? "bg-muted/20 opacity-60" : "bg-muted/30"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{task.label}</div>
                    </div>
                    {!completed && canNavigate && task.route !== "/" && (
                      <Link href={task.route}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          Go
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rewards */}
            <div className="border-t pt-3">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-500" />
                Rewards
              </div>
              <div className="flex flex-wrap gap-2">
                {chapter.rewards.map((reward, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="bg-amber-500/10 text-amber-400 border-amber-500/30"
                  >
                    {reward.amount && `${reward.amount} `}
                    {reward.type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Claim Button - only gated by completion */}
            {canClaim && isConnected && (
              <div className="border-t pt-3 mt-3">
                <Button
                  onClick={handleClaimReward}
                  disabled={isTxPending}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {isTxPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Claim Chapter Reward
                    </>
                  )}
                </Button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      );
    });
  };

  // Determine default open accordion value
  const defaultAccordionValue = useMemo(() => {
    if (!userStatus) return "chapter-0";
    return `chapter-${Math.min(Number(userStatus.currentStage), TOTAL_CHAPTERS - 1)}`;
  }, [userStatus]);

  return (
    <div className="space-y-6">
      {/* Connect Wallet Banner - shown but chapters still visible */}
      {!isConnected && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Wallet className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-amber-400">
              Connect your wallet to track progress and claim rewards
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status Summary */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              Story Progress
              {isLoadingStatus && isConnected && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </span>
            {isFullyCompleted && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <Trophy className="h-3 w-3 mr-1" />
                Complete!
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-medium">
                {!isConnected
                  ? "Not Connected"
                  : isLoadingStatus
                  ? "Loading..."
                  : userStatus?.isStarted
                  ? "In Progress"
                  : "Not Started"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Current Chapter</span>
              <p className="font-medium">
                {isFullyCompleted
                  ? "All Complete"
                  : `Chapter ${(userStatus?.currentStage ?? 0) + 1} of ${TOTAL_CHAPTERS}`}
              </p>
            </div>
            {userStatus?.isStarted && Number(userStatus.startedAt) > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Started At</span>
                <p className="font-medium">
                  {formatTimestamp(userStatus.startedAt)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Not Started Banner */}
      {isConnected && !isLoadingStatus && !userStatus?.isStarted && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                <BookOpen className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-amber-400">Story Mode Not Started</p>
                <p className="text-sm text-muted-foreground">
                  Complete in-game actions to begin your story mode journey and earn rewards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chapter List - ALWAYS render all 7 chapters */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Chapters</CardTitle>
        </CardHeader>
        <CardContent className={!userStatus?.isStarted && !isLoadingStatus ? "opacity-50 pointer-events-none" : ""}>
          <Accordion
            type="single"
            collapsible
            defaultValue={defaultAccordionValue}
            className="space-y-2"
          >
            {renderChapters()}
          </Accordion>
        </CardContent>
      </Card>

      {/* Mystery Box Section (for final chapter completion) */}
      {isFullyCompleted && isConnected && (
        <Card className="bg-gradient-to-br from-amber-500/10 to-purple-500/10 border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Mystery Box Reward
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Congratulations! You have completed all story chapters. Claim your
              exclusive Mystery Box reward!
            </p>
            <Button
              onClick={() => handleClaimMysteryBox(0)}
              disabled={isTxPending}
              className="w-full bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-700 hover:to-purple-700"
            >
              {isTxPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Claim Mystery Box
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Reward Claimed!
            </DialogTitle>
            <DialogDescription>{successMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccessDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mystery Box Dialog */}
      <Dialog open={showMysteryDialog} onOpenChange={setShowMysteryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Mystery Box Claimed!
            </DialogTitle>
            <DialogDescription>
              Your Mystery Box has been claimed successfully.
            </DialogDescription>
          </DialogHeader>
          {mysteryResult && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item ID</span>
                <span className="font-medium">{mysteryResult.itemId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Claimed At</span>
                <span className="font-medium">{mysteryResult.claimedAt}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setShowMysteryDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
