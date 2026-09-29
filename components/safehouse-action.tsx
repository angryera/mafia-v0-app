"use client";

import { getErrorMessage } from "@/lib/format";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAccount, useReadContract } from "wagmi";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import {
  COOLDOWN_READ_QUERY,
  cooldownSecondsLeft,
  formatCooldownClock,
  useCooldownRemaining,
} from "@/hooks/use-cooldown-remaining";
import {
  SAFEHOUSE_ABI,
  SAFEHOUSE_BASE_COOLDOWN,
  SAFEHOUSE_COST_PER_HOUR,
  SAFEHOUSE_MIN_HOURS,
  SAFEHOUSE_MAX_HOURS,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
} from "@/lib/contract";
import { useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { AlertCircle, Home, Loader2, ShieldCheck, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatEther, parseEther } from "viem";

const HOUR_PRESETS = [
  { hours: 1, label: "1h" },
  { hours: 6, label: "6h" },
  { hours: 12, label: "12h" },
  { hours: 24, label: "1 day" },
  { hours: 48, label: "2 days" },
  { hours: SAFEHOUSE_MAX_HOURS, label: "Max" },
] as const;

const WAIT_HOURS = SAFEHOUSE_BASE_COOLDOWN / 3600;

function formatRemaining(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  if (days > 0) {
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return formatCooldownClock(seconds);
}

function readSafehouseField(raw: unknown, key: string, index: number): number {
  if (Array.isArray(raw)) return Number(raw[index] ?? 0);
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const value = record[key] ?? record[index];
    return value == null ? 0 : Number(value);
  }
  return 0;
}

function StatusCard({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "protected";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md rounded-xl border bg-card px-6 py-10 text-center",
        tone === "protected" ? "border-cyan-400/25" : "border-border",
      )}
    >
      {children}
    </div>
  );
}

export function SafehouseAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const {
    authData,
    isSigning: authSigning,
    signError,
    requestSignature,
  } = useAuth();

  const [safehouseTimeLeft, setSafehouseTimeLeft] = useState<number | null>(null);
  const [hours, setHours] = useState<number>(1);
  const [sessionApproved, setSessionApproved] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const { data: userInfoRaw, refetch: refetchSafehouse } = useReadContract({
    address: addresses.safehouse,
    abi: SAFEHOUSE_ABI,
    functionName: "getUserInfo",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address, ...COOLDOWN_READ_QUERY },
  });

  const infoKnown = userInfoRaw !== undefined;
  const safeUntilTs = infoKnown ? readSafehouseField(userInfoRaw, "safeUntil", 0) : 0;
  const nextSafehouseTs = infoKnown
    ? readSafehouseField(userInfoRaw, "nextSafehouseTime", 2)
    : undefined;
  const reentrySeconds = cooldownSecondsLeft(
    useCooldownRemaining(authData && address ? nextSafehouseTs : undefined),
  );
  const onReentryCooldown = reentrySeconds !== null && reentrySeconds > 0;
  const reentryPending = Boolean(authData && address) && reentrySeconds === null;
  const isInSafehouse = safeUntilTs > Math.floor(Date.now() / 1000);

  useEffect(() => {
    if (!isInSafehouse || !safeUntilTs) {
      setSafehouseTimeLeft(null);
      return;
    }
    function tick() {
      const now = Math.floor(Date.now() / 1000);
      const remaining = safeUntilTs - now;
      setSafehouseTimeLeft(remaining > 0 ? remaining : 0);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isInSafehouse, safeUntilTs]);

  const totalCost = hours * SAFEHOUSE_COST_PER_HOUR;
  const costWei = parseEther(String(totalCost));

  const { data: cashBalanceRaw, refetch: refetchCash } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowances",
    args: address ? [address, addresses.safehouse] : undefined,
    query: { enabled: !!address },
  });

  const cashBalance =
    cashBalanceRaw !== undefined ? Number(formatEther(cashBalanceRaw as bigint)) : null;
  const allowance = allowanceRaw !== undefined ? (allowanceRaw as bigint) : null;
  const hasEnoughCash = cashBalance !== null && cashBalance >= totalCost;
  const isApproved = sessionApproved || (allowance !== null && allowance >= costWei);
  const detailsKnown = cashBalance !== null && (sessionApproved || allowance !== null);

  const approve = useContractTransaction({
    onSuccess: () => {
      setSessionApproved(true);
      toast.success("Cash spending approved");
      refetchAllowance();
    },
  });

  const enter = useContractTransaction({
    onSuccess: () => {
      toast.success(
        `Hidden for ${hours} hour${hours > 1 ? "s" : ""}`,
      );
      refetchSafehouse();
      refetchCash();
    },
  });

  const exit = useContractTransaction({
    onSuccess: () => {
      setConfirmExit(false);
      toast.success("You left the safehouse");
      refetchSafehouse();
    },
  });

  const handleApprove = () => {
    approve.reset();
    approve.write({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.safehouse, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const handleEnterSafehouse = () => {
    enter.reset();
    enter.write({
      address: addresses.safehouse,
      abi: SAFEHOUSE_ABI,
      functionName: "enterSafehouse",
      args: [BigInt(hours)],
    });
  };

  const handleExitSafehouse = () => {
    exit.reset();
    exit.write({
      address: addresses.safehouse,
      abi: SAFEHOUSE_ABI,
      functionName: "exitSafehouse",
    });
  };

  const activeError = approve.error ?? enter.error;
  const protectedNow = isInSafehouse && safehouseTimeLeft !== 0;
  const protectedSeconds =
    safehouseTimeLeft ??
    Math.max(0, safeUntilTs - Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!protectedNow) setConfirmExit(false);
  }, [protectedNow]);

  if (!isConnected) {
    return (
      <StatusCard>
        <Home className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          Connect your wallet to hide.
        </p>
      </StatusCard>
    );
  }

  if (authSigning) {
    return (
      <StatusCard>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in your wallet to continue.
        </p>
      </StatusCard>
    );
  }

  if (signError) {
    return (
      <StatusCard>
        <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-4 text-sm text-muted-foreground">
          Sign to verify your wallet.
        </p>
        <Button onClick={requestSignature} className="mt-4">
          Sign message
        </Button>
      </StatusCard>
    );
  }

  if (!infoKnown || (reentryPending && !protectedNow)) {
    return (
      <StatusCard>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Checking protection...</p>
      </StatusCard>
    );
  }

  if (protectedNow) {
    return (
      <StatusCard tone="protected">
        <ShieldCheck className="mx-auto h-8 w-8 text-cyan-400" />
        <p className="mt-4 text-sm font-medium text-cyan-400">Protected</p>
        <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-foreground">
          {formatRemaining(protectedSeconds)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You are hidden from attacks.
        </p>

        {exit.error && (
          <p className="mt-4 text-xs text-red-400">
            {exit.error.message.includes("User rejected")
              ? "Transaction rejected in wallet"
              : getErrorMessage(exit.error)}
          </p>
        )}

        {confirmExit ? (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              Leaving ends protection immediately.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={exit.isLoading}
                onClick={() => {
                  exit.reset();
                  setConfirmExit(false);
                }}
              >
                Stay
              </Button>
              <Button
                variant="destructive"
                className="h-11 flex-1"
                disabled={exit.isLoading}
                onClick={handleExitSafehouse}
              >
                {exit.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {exit.isPending ? "Confirm in wallet..." : "Leaving..."}
                  </>
                ) : (
                  "Leave now"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="mt-6 h-11 w-full"
            onClick={() => setConfirmExit(true)}
          >
            Leave safehouse
          </Button>
        )}
      </StatusCard>
    );
  }

  if (onReentryCooldown) {
    return (
      <StatusCard>
        <Timer className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">You can hide again in</p>
        <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-foreground">
          {formatCooldownClock(reentrySeconds ?? 0)}
        </p>
      </StatusCard>
    );
  }

  const busy = approve.isLoading || enter.isLoading;
  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">How long do you want to hide?</p>

      <div className="mt-4">
        <label htmlFor="safehouse-hours" className="text-xs text-muted-foreground">
          Hours
        </label>
        <input
          id="safehouse-hours"
          type="number"
          inputMode="numeric"
          min={SAFEHOUSE_MIN_HOURS}
          max={SAFEHOUSE_MAX_HOURS}
          value={hours}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!Number.isNaN(val)) {
              setHours(
                Math.max(SAFEHOUSE_MIN_HOURS, Math.min(SAFEHOUSE_MAX_HOURS, val)),
              );
            }
          }}
          className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-center font-mono text-3xl font-semibold text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {HOUR_PRESETS.map((preset) => (
          <button
            key={preset.hours}
            type="button"
            onClick={() => setHours(preset.hours)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              hours === preset.hours
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <dl className="mt-5 space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Cost</dt>
          <dd
            className={cn(
              "font-mono font-semibold tabular-nums",
              cashBalance !== null && !hasEnoughCash ? "text-red-400" : "text-foreground",
            )}
          >
            {totalCost.toLocaleString()} cash
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Your cash</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {cashBalance === null ? "—" : cashBalance.toLocaleString()}
          </dd>
        </div>
      </dl>

      {cashBalance !== null && !hasEnoughCash && (
        <p className="mt-3 text-xs text-red-400">
          You need {totalCost.toLocaleString()} cash.
        </p>
      )}

      {activeError && (
        <p className="mt-3 text-xs text-red-400">
          {activeError.message.includes("User rejected")
            ? "Transaction rejected in wallet"
            : getErrorMessage(activeError)}
        </p>
      )}

      <Button
        onClick={isApproved ? handleEnterSafehouse : handleApprove}
        disabled={
          busy ||
          !detailsKnown ||
          !hasEnoughCash ||
          hours < SAFEHOUSE_MIN_HOURS ||
          hours > SAFEHOUSE_MAX_HOURS
        }
        className="mt-5 h-11 w-full text-sm font-semibold"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {approve.isPending || enter.isPending ? "Confirm in wallet..." : "Confirming..."}
          </>
        ) : !detailsKnown ? (
          "Checking..."
        ) : hasEnoughCash && !isApproved ? (
          "Approve cash"
        ) : (
          `Hide for ${hourLabel}`
        )}
      </Button>

      <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        {hasEnoughCash && !isApproved
          ? `Approve once, then hide. After protection ends, wait ${WAIT_HOURS} hours.`
          : `After protection ends, wait ${WAIT_HOURS} hours before hiding again.`}
      </p>
    </div>
  );
}
