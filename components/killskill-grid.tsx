"use client";

import { Loader2, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { TRAIN_TYPES, KILLSKILL_CONTRACT_ABI } from "@/lib/contract";
import { KillSkillCard, type KillSkillTrainRequest } from "@/components/killskill-card";
import { useChainAddresses } from "@/components/chain-provider";
import { COOLDOWN_READ_QUERY, cooldownSecondsLeft, formatCooldownClock, useCooldownRemaining } from "@/hooks/use-cooldown-remaining";

function parseTrainRequest(raw: unknown): KillSkillTrainRequest | null {
  if (raw == null) return null;

  const isPending = Array.isArray(raw)
    ? Boolean(raw[0])
    : Boolean((raw as { isPending?: unknown }).isPending);
  const trainType = Array.isArray(raw)
    ? Number(raw[1] ?? 0)
    : Number((raw as { trainType?: unknown }).trainType ?? 0);
  const requestBlock = Array.isArray(raw)
    ? Number(raw[2] ?? 0)
    : Number((raw as { requestBlock?: unknown }).requestBlock ?? 0);

  if (!isPending) return null;
  return { isPending, trainType, requestBlock };
}

export function KillSkillGrid() {
  const { isConnected, address } = useAccount();
  const addresses = useChainAddresses();
  const { data: nextTrainTimeRaw, refetch: refetchCooldown } = useReadContract({
    address: addresses.killskill,
    abi: KILLSKILL_CONTRACT_ABI,
    functionName: "nextTrainTime",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address, ...COOLDOWN_READ_QUERY },
  });

  const { data: trainRequestRaw, refetch: refetchTrainRequest } = useReadContract({
    address: addresses.killskill,
    abi: KILLSKILL_CONTRACT_ABI,
    functionName: "trainRequests",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address, staleTime: 0, refetchOnMount: "always" },
  });

  const [waitingByType, setWaitingByType] = useState<Record<number, boolean>>({});
  const awaitingResult = Object.values(waitingByType).some(Boolean);
  const pendingRequest = parseTrainRequest(trainRequestRaw);
  const pendingLabel = pendingRequest
    ? TRAIN_TYPES.find((trainType) => trainType.id === pendingRequest.trainType)?.label
    : undefined;

  const { data: nonceReadyRaw, refetch: refetchNonce } = useReadContract({
    address: addresses.killskill,
    abi: KILLSKILL_CONTRACT_ABI,
    functionName: "getTrainNonceStatus",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && (pendingRequest != null || awaitingResult),
      staleTime: 0,
      refetchInterval: pendingRequest != null || awaitingResult ? 4_000 : false,
    },
  });
  const nonceReady = nonceReadyRaw === true;

  const cooldownSeconds = cooldownSecondsLeft(
    useCooldownRemaining(nextTrainTimeRaw === undefined ? undefined : Number(nextTrainTimeRaw)),
  );
  const cooldown =
    isConnected && cooldownSeconds !== null && cooldownSeconds > 0
      ? { seconds: cooldownSeconds, label: formatCooldownClock(cooldownSeconds) }
      : isConnected && cooldownSeconds === null
        ? { seconds: 1, label: "..." }
        : null;

  const handleRequestConfirmed = useCallback(() => {
    void refetchTrainRequest();
    void refetchNonce();
  }, [refetchTrainRequest, refetchNonce]);

  const handleFinished = useCallback(() => {
    void refetchTrainRequest();
    void refetchCooldown();
    void refetchNonce();
  }, [refetchTrainRequest, refetchCooldown, refetchNonce]);

  const timerReady = isConnected && !pendingRequest && !cooldown;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Training</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Approve cash, start a session, then finish when the result is ready.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {TRAIN_TYPES.length} types
        </span>
      </div>

      {isConnected && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          {pendingRequest && !nonceReady ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          ) : (
            <Timer
              className={cn(
                "h-5 w-5 shrink-0",
                timerReady || (pendingRequest && nonceReady) ? "text-green-400" : "text-primary",
              )}
            />
          )}
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="truncate text-sm text-muted-foreground">
              {pendingRequest ? pendingLabel ?? "Training in progress" : "Next training"}
            </span>
            {pendingRequest ? (
              <span
                className={cn(
                  "shrink-0 font-mono text-sm font-semibold",
                  nonceReady ? "text-green-400" : "text-primary",
                )}
              >
                {nonceReady ? "Ready" : "Waiting"}
              </span>
            ) : cooldown ? (
              <span className="shrink-0 font-mono text-sm font-semibold text-primary tabular-nums">
                {cooldown.label}
              </span>
            ) : (
              <span className="shrink-0 font-mono text-sm font-semibold text-green-400">Now</span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {TRAIN_TYPES.map((t) => (
          <KillSkillCard
            key={t.id}
            trainType={t}
            cooldown={cooldown}
            pendingRequest={pendingRequest}
            nonceReady={nonceReady && (pendingRequest == null || pendingRequest.trainType === t.id)}
            onRequestConfirmed={handleRequestConfirmed}
            onFinished={handleFinished}
            onWaitingChange={(waiting) => {
              setWaitingByType((current) => {
                if (current[t.id] === waiting) return current;
                return { ...current, [t.id]: waiting };
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
