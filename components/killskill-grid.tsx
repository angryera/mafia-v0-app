"use client";

import { Loader2, Swords } from "lucide-react";
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

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Swords className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Training Options
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Call{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
              requestTrainSkill(trainType)
            </code>
            , then{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
              finishTrainSkill()
            </code>{" "}
            once the result is ready
          </p>
        </div>
      </div>

      {cooldown && !pendingRequest && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2">
          <span className="text-xs font-medium text-amber-400">
            Training cooldown
          </span>
          <span className="font-mono text-xs text-amber-400 tabular-nums">
            {cooldown.label}
          </span>
        </div>
      )}

      {pendingRequest && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2">
          <span className="text-xs font-medium text-amber-400">
            {pendingLabel ? `${pendingLabel} is in progress` : "Training in progress"}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs text-amber-400">
            {!nonceReady && <Loader2 className="h-3 w-3 animate-spin" />}
            {nonceReady ? "Ready to finish" : "Waiting for result..."}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
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
