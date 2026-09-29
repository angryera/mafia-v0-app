"use client";

import { getErrorMessage } from "@/lib/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { decodeEventLog, parseEther } from "viem";
import {
  KILLSKILL_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
  type TRAIN_TYPES,
} from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  Loader2,
  Swords,
  CheckCircle2,
  XCircle,
  Trophy,
  Skull,
  ShieldCheck,
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

function formatXp(xpPoint: bigint): string {
  if (xpPoint <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(xpPoint).toLocaleString();
  }
  return xpPoint.toString();
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
  const requestHash = requestTx.hash;
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
          };
          return {
            isSuccess: args.isSuccess,
            xpPoint: args.xpPoint ?? BigInt(0),
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

  const handleRequest = () => {
    resetRequest();
    resetFinish();
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

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        isFinishSuccess && trainResult?.isSuccess && "border-green-400/30",
        isFinishSuccess && trainResult && !trainResult.isSuccess && "border-chain-accent/30",
        (requestError || finishError) && "border-red-400/30"
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {trainType.label}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {trainType.description}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-md bg-background/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">trainType</span>
          <span className="font-mono text-xs text-foreground">
            {trainType.id}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Step 1</span>
          <span className="font-mono text-[10px] text-primary">
            requestTrainSkill(uint8)
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Step 2</span>
          <span className="font-mono text-[10px] text-primary">
            finishTrainSkill()
          </span>
        </div>
      </div>

      {isFinishSuccess && trainResult && (
        <div
          className={cn(
            "mb-3 rounded-lg px-3 py-3",
            trainResult.isSuccess ? "bg-green-400/10" : "bg-chain-accent/10"
          )}
        >
          <div className="flex items-center gap-2 mb-1.5">
            {trainResult.isSuccess ? (
              <Trophy className="h-4 w-4 text-green-400" />
            ) : (
              <Skull className="h-4 w-4 text-chain-accent" />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                trainResult.isSuccess ? "text-green-400" : "text-chain-accent"
              )}
            >
              {trainResult.isSuccess
                ? "Training Successful!"
                : "Training Failed"}
            </span>
          </div>
          <p
            className={cn(
              "text-[11px] leading-relaxed",
              trainResult.isSuccess
                ? "text-green-400/70"
                : "text-chain-accent/70"
            )}
          >
            {trainResult.isSuccess
              ? `Your ${trainType.label.toLowerCase()} skill has improved.${trainResult.xpPoint > BigInt(0) ? ` +${formatXp(trainResult.xpPoint)} XP.` : ""}`
              : "Better luck next time. Try training again."}
          </p>
          {finishHash && (
            <a
              href={`${explorer}/tx/${finishHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-1.5 font-mono text-[10px] underline decoration-current/30 hover:decoration-current",
                trainResult.isSuccess ? "text-green-400/60" : "text-chain-accent/60"
              )}
            >
              {finishHash.slice(0, 10)}...{finishHash.slice(-8)}
            </a>
          )}
        </div>
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

      {showFinishFlow && !nonceReady && !isFinishSuccess && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-400" />
          <span className="text-xs text-amber-400">
            Waiting for the training result. This can take a few blocks.
          </span>
        </div>
      )}

      {showFinishFlow && nonceReady && !isFinishSuccess && phase !== "finishing" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
          <span className="text-xs text-green-400">
            Result is ready. Finish training to reveal the outcome.
          </span>
        </div>
      )}

      {requestHash && phase !== "idle" && phase !== "done" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2">
          <span className="shrink-0 text-[10px] text-muted-foreground">Request</span>
          <a
            href={`${explorer}/tx/${requestHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-[10px] text-primary underline decoration-primary/30 hover:decoration-primary"
          >
            {requestHash.slice(0, 10)}...{requestHash.slice(-8)}
          </a>
        </div>
      )}

      {requestError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="line-clamp-2 text-[10px] text-red-400">
            {requestError.message.includes("User rejected")
              ? "Transaction rejected by user"
              : getErrorMessage(requestError)}
          </p>
        </div>
      )}

      {finishError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="line-clamp-2 text-[10px] text-red-400">
            {finishError.message.includes("User rejected")
              ? "Transaction rejected by user"
              : getErrorMessage(finishError)}
          </p>
        </div>
      )}

      {approveError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="line-clamp-2 text-[10px] text-red-400">
            {approveError.message.includes("User rejected")
              ? "Approval rejected by user"
              : getErrorMessage(approveError)}
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {showFinishFlow ? (
          <button
            onClick={handleFinish}
            disabled={!canFinish}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200",
              canFinish
                ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {isFinishLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isFinishPending ? "Confirm..." : "Confirming..."}
              </>
            ) : nonceReady ? (
              <>
                <Swords className="h-4 w-4" />
                Finish Training
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
                  ? "bg-green-400/10 text-green-400 cursor-default"
                  : isConnected && !blockedByOther && !ownsPending
                    ? "bg-secondary text-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
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
                  Approve Cash
                </>
              )}
            </button>
            <button
              onClick={handleRequest}
              disabled={!isConnected || isLoading || !approved || onCooldown || blockedByOther || ownsPending}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                isConnected && approved && !onCooldown && !blockedByOther && !ownsPending
                  ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {isRequestLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRequestPending ? "Confirm..." : "Confirming..."}
                </>
              ) : (
                <>
                  <Swords className="h-4 w-4" />
                  Request Training
                </>
              )}
            </button>
            {blockedByOther && (
              <p className="text-center text-[10px] text-muted-foreground">
                Finish the pending training first.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
