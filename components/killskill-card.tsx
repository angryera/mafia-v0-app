"use client";

import { formatWeiDisplay, getErrorMessage } from "@/lib/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { formatCooldownClock, useCooldownRemaining } from "@/hooks/use-cooldown-remaining";
import { decodeEventLog, parseEther } from "viem";
import {
  KILLSKILL_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
  type TRAIN_TYPES,
} from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Swords,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Timer,
  ExternalLink,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";

const APPROVE_AMOUNT = parseEther("100000000");

type TrainType = (typeof TRAIN_TYPES)[number];
type Phase = "idle" | "requesting" | "waiting" | "finishing" | "done";

export type KillSkillTrainRequest = {
  isPending: boolean;
  trainType: number;
  requestBlock: number;
};

const INTENSITY_COLORS = {
  Low: "text-green-400 bg-green-400/10 border-green-400/20",
  Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  High: "text-orange-400 bg-orange-400/10 border-orange-400/20",
} as const;

type Intensity = keyof typeof INTENSITY_COLORS;

interface TrainResult {
  isSuccess: boolean;
  xpPoint: bigint;
  trainCost: bigint;
  nextTrainTime: number;
}

function formatXp(xpPoint: bigint): string {
  if (xpPoint <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(xpPoint).toLocaleString();
  }
  return xpPoint.toString();
}

function formatTrainCost(cost: number): string {
  if (cost <= 0) return "Free";
  return `$${cost.toLocaleString()}`;
}

function trainingIntensity(percentage: number): Intensity {
  if (percentage >= 15) return "High";
  if (percentage >= 7) return "Medium";
  return "Low";
}

function rateTone(percentage: number): { text: string; bar: string } {
  if (percentage >= 15) return { text: "text-primary", bar: "bg-primary" };
  if (percentage >= 7) return { text: "text-yellow-400", bar: "bg-yellow-400" };
  return { text: "text-orange-400", bar: "bg-orange-400" };
}

function TrainOutcomeDialog({
  trainType,
  result,
  hash,
  open,
  onOpenChange,
}: {
  trainType: TrainType;
  result: TrainResult;
  hash?: `0x${string}`;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const explorer = useChainExplorer();
  const xp = formatXp(result.xpPoint);
  const costLabel = formatWeiDisplay(result.trainCost, 0, "0");
  const cooldownRemaining = useCooldownRemaining(
    result.nextTrainTime > 0 ? result.nextTrainTime : undefined,
  );
  const cooldownSeconds =
    cooldownRemaining === null ? null : Math.ceil(cooldownRemaining / 1000);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                result.isSuccess ? "bg-green-400/10" : "bg-red-400/10",
              )}
            >
              {result.isSuccess ? (
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-400" />
              )}
            </div>
            <div className="min-w-0 space-y-1.5 text-left">
              <DialogTitle>
                {result.isSuccess ? "Training succeeded" : "Training failed"}
              </DialogTitle>
              <DialogDescription>
                {result.isSuccess
                  ? `${trainType.label} paid off.`
                  : `${trainType.label} didn't stick. Try again after the cooldown.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Training</span>
            <span className="text-right font-medium text-foreground">{trainType.label}</span>
          </div>
          {result.trainCost > BigInt(0) && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Coins className="h-3.5 w-3.5 text-yellow-400" />
                Cost
              </span>
              <span className="font-mono font-semibold text-yellow-400">{costLabel}</span>
            </div>
          )}
          {result.xpPoint > BigInt(0) && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">XP</span>
              <span className="font-mono font-semibold text-primary">+{xp}</span>
            </div>
          )}
          {cooldownSeconds !== null && cooldownSeconds > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                Next training
              </span>
              <span className="font-mono font-semibold text-primary tabular-nums">
                {formatCooldownClock(cooldownSeconds)}
              </span>
            </div>
          )}
          {hash && (
            <a
              href={`${explorer}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary hover:underline"
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <DialogFooter>
          <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KillSkillCard({
  trainType,
  cooldown,
  pendingRequest,
  nonceReady,
  onRequestConfirmed,
  onFinished,
  onWaitingChange,
}: {
  trainType: TrainType;
  cooldown?: { seconds: number; label: string } | null;
  pendingRequest: KillSkillTrainRequest | null;
  nonceReady: boolean;
  onRequestConfirmed?: () => void;
  onFinished?: () => void;
  onWaitingChange?: (waiting: boolean) => void;
}) {
  const { isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const [approved, setApproved] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const onCooldown = (cooldown?.seconds ?? 0) > 0;
  const ownsPending = pendingRequest?.isPending === true && pendingRequest.trainType === trainType.id;
  const blockedByOther = pendingRequest?.isPending === true && pendingRequest.trainType !== trainType.id;

  const onRequestConfirmedRef = useRef(onRequestConfirmed);
  const onFinishedRef = useRef(onFinished);
  const onWaitingChangeRef = useRef(onWaitingChange);
  useEffect(() => {
    onRequestConfirmedRef.current = onRequestConfirmed;
    onFinishedRef.current = onFinished;
    onWaitingChangeRef.current = onWaitingChange;
  });

  const approveTx = useContractTransaction({
    onSuccess: () => setApproved(true),
  });
  const writeApprove = approveTx.write;
  const isApprovePending = approveTx.isPending;
  const approveError = approveTx.error;
  const resetApprove = approveTx.reset;

  const requestTx = useContractTransaction({
    onSuccess: () => {
      setPhase("waiting");
      onRequestConfirmedRef.current?.();
    },
  });
  const writeRequest = requestTx.writeAsync;
  const isRequestPending = requestTx.isPending;
  const requestError = requestTx.error;
  const resetRequest = requestTx.reset;

  const finishTx = useContractTransaction({
    onSuccess: () => {
      setPhase("done");
      onFinishedRef.current?.();
    },
  });
  const writeFinish = finishTx.writeAsync;
  const finishHash = finishTx.hash;
  const isFinishPending = finishTx.isPending;
  const finishError = finishTx.error;
  const resetFinish = finishTx.reset;
  const isFinishSuccess = finishTx.isSuccess;
  const finishReceipt = finishTx.receipt.data;

  const trainResult = useMemo(() => {
    if (!finishReceipt?.logs) return null;
    for (const log of finishReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: KILLSKILL_CONTRACT_ABI,
          data: log.data,
          topics: log.topics,
          strict: false,
        });
        if (decoded.eventName === "TrainedSkill") {
          const args = decoded.args as unknown as {
            isSuccess: boolean;
            xpPoint?: bigint;
            trainCost?: bigint;
            nextTrainTime?: bigint;
          };
          return {
            isSuccess: args.isSuccess,
            xpPoint: args.xpPoint ?? BigInt(0),
            trainCost: args.trainCost ?? BigInt(0),
            nextTrainTime: Number(args.nextTrainTime ?? BigInt(0)),
          };
        }
      } catch {
        // Not our event, skip
      }
    }
    return null;
  }, [finishReceipt]);

  useEffect(() => {
    if (!ownsPending || phase !== "idle") return;
    setPhase("waiting");
  }, [ownsPending, phase]);

  useEffect(() => {
    if (phase !== "requesting" || requestTx.isLoading || !requestError) return;
    setPhase("idle");
  }, [phase, requestError, requestTx.isLoading]);

  useEffect(() => {
    if (phase !== "finishing" || finishTx.isLoading || !finishError) return;
    setPhase("waiting");
  }, [phase, finishError, finishTx.isLoading]);

  const handleApprove = () => {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.killskill, APPROVE_AMOUNT],
    });
  };

  const outcomeShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (!trainResult || !finishHash || outcomeShownRef.current === finishHash) return;
    outcomeShownRef.current = finishHash;
    setOutcomeOpen(true);
  }, [trainResult, finishHash]);

  const handleRequest = () => {
    resetRequest();
    resetFinish();
    setOutcomeOpen(false);
    setPhase("requesting");
    void writeRequest({
      address: addresses.killskill,
      abi: KILLSKILL_CONTRACT_ABI,
      functionName: "requestTrainSkill",
      args: [trainType.id],
    }).catch(() => undefined);
  };

  const handleFinish = () => {
    resetFinish();
    setPhase("finishing");
    void writeFinish({
      address: addresses.killskill,
      abi: KILLSKILL_CONTRACT_ABI,
      functionName: "finishTrainSkill",
    }).catch(() => undefined);
  };

  const waitingForResult = phase === "waiting" || phase === "finishing";
  useEffect(() => {
    onWaitingChangeRef.current?.(waitingForResult);
    return () => onWaitingChangeRef.current?.(false);
  }, [waitingForResult]);

  const isApproveLoading = approveTx.isLoading;
  const isRequestLoading = requestTx.isLoading;
  const isFinishLoading = finishTx.isLoading;
  const isLoading = isApproveLoading || isRequestLoading || isFinishLoading;
  const showFinishFlow = phase === "waiting" || phase === "finishing" || (ownsPending && phase !== "done");
  const canFinish = isConnected && nonceReady && !isFinishLoading;
  const canStart = isConnected && approved && !onCooldown && !blockedByOther && !ownsPending && !isLoading;
  const intensity = trainingIntensity(trainType.percentage);
  const tone = rateTone(trainType.percentage);
  const dimmed = blockedByOther || (onCooldown && !showFinishFlow);
  const actionError = finishError ?? requestError ?? approveError;
  const actionErrorMessage = !actionError
    ? null
    : actionError.message.includes("User rejected")
      ? actionError === approveError
        ? "Approval rejected"
        : "Transaction rejected"
      : getErrorMessage(actionError);

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300",
        dimmed
          ? "opacity-60"
          : "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        isFinishSuccess && trainResult?.isSuccess && "border-green-400/30",
        isFinishSuccess && trainResult && !trainResult.isSuccess && "border-red-400/30",
        actionError && "border-red-400/30",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{trainType.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{trainType.description}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            INTENSITY_COLORS[intensity],
          )}
        >
          {intensity}
        </span>
      </div>

      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Success Rate</span>
          <span className={cn("font-mono text-xs font-semibold", tone.text)}>
            {trainType.percentage}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary">
          <div
            className={cn("h-1.5 rounded-full transition-all duration-500", tone.bar)}
            style={{ width: `${Math.min(trainType.percentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="mb-4 rounded-md bg-background/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Cost</span>
          <span className="font-mono text-xs text-foreground">{formatTrainCost(trainType.cost)}</span>
        </div>
        {showFinishFlow && !isFinishSuccess && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <span className={cn("text-xs font-medium", nonceReady ? "text-green-400" : "text-amber-400")}>
              {nonceReady ? "Ready to finish" : "Waiting for result"}
            </span>
          </div>
        )}
        {blockedByOther && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">Finish the other session first.</p>
        )}
      </div>

      {isFinishSuccess && trainResult && (
        <button
          type="button"
          onClick={() => setOutcomeOpen(true)}
          className={cn(
            "mb-3 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left",
            trainResult.isSuccess ? "bg-green-400/10" : "bg-red-400/10",
          )}
        >
          <span className="flex items-center gap-2">
            {trainResult.isSuccess ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                trainResult.isSuccess ? "text-green-400" : "text-red-400",
              )}
            >
              {trainResult.isSuccess ? "Training succeeded" : "Training failed"}
            </span>
          </span>
          <span className="text-[10px] font-medium text-muted-foreground underline">View</span>
        </button>
      )}

      {isFinishSuccess && !trainResult && finishHash && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
          <a
            href={`${explorer}/tx/${finishHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
          >
            {finishHash.slice(0, 10)}...{finishHash.slice(-8)}
          </a>
        </div>
      )}

      {actionErrorMessage && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="line-clamp-2 text-[10px] text-red-400">{actionErrorMessage}</p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {showFinishFlow ? (
          <button
            onClick={handleFinish}
            disabled={!canFinish}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              canFinish
                ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]"
                : "cursor-not-allowed bg-secondary text-muted-foreground",
            )}
          >
            {isFinishLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isFinishPending ? "Confirm in wallet..." : "Confirming..."}
              </>
            ) : nonceReady ? (
              <>
                <Swords className="h-4 w-4" />
                Finish training
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for result...
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={handleApprove}
              disabled={!isConnected || isLoading || approved || blockedByOther || ownsPending}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200",
                approved
                  ? "cursor-default bg-green-400/10 text-green-400"
                  : isConnected && !blockedByOther && !ownsPending
                    ? "bg-secondary text-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                    : "cursor-not-allowed bg-secondary text-muted-foreground",
              )}
            >
              {isApproveLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isApprovePending ? "Approve..." : "Confirming..."}
                </>
              ) : approved ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Approved
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Approve cash
                </>
              )}
            </button>
            <button
              onClick={handleRequest}
              disabled={!canStart}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                canStart
                  ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]"
                  : "cursor-not-allowed bg-secondary text-muted-foreground",
              )}
            >
              {isRequestLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRequestPending ? "Confirm in wallet..." : "Confirming..."}
                </>
              ) : (
                <>
                  <Swords className="h-4 w-4" />
                  {isConnected ? "Start training" : "Connect Wallet"}
                </>
              )}
            </button>
          </>
        )}
      </div>

      {trainResult && (
        <TrainOutcomeDialog
          trainType={trainType}
          result={trainResult}
          hash={finishHash}
          open={outcomeOpen}
          onOpenChange={setOutcomeOpen}
        />
      )}
    </div>
  );
}
