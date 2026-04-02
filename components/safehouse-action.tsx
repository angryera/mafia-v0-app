"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  SAFEHOUSE_ABI,
  SAFEHOUSE_COST_PER_HOUR,
  SAFEHOUSE_MIN_HOURS,
  SAFEHOUSE_MAX_HOURS,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
} from "@/lib/contract";
import {
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Home,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  ShieldCheck,
  Coins,
  Clock,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEther } from "viem";

function formatSafehouseTime(seconds: number): {
  days: number;
  hours: number;
  minutes: number;
  secs: number;
} {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return { days, hours, minutes, secs };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-background/50">
        <span className="font-mono text-xl font-bold text-foreground">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function SafehouseAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const {
    authData,
    isSigning: authSigning,
    signError,
    requestSignature,
  } = useAuth();

  // ---------- Safehouse status ----------
  const [safehouseTimeLeft, setSafehouseTimeLeft] = useState<number | null>(null);

  const { data: userInfoRaw, refetch: refetchSafehouse } = useReadContract({
    address: addresses.safehouse,
    abi: SAFEHOUSE_ABI,
    functionName: "getUserInfo",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address, refetchInterval: 15000 },
  });

  const safeUntilTs =
    userInfoRaw !== undefined
      ? Number((userInfoRaw as { safeUntil: bigint }).safeUntil)
      : 0;
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

  // ---------- Hours state ----------
  const [hours, setHours] = useState<number>(1);

  const totalCost = hours * SAFEHOUSE_COST_PER_HOUR;

  const incrementHours = () =>
    setHours((h) => Math.min(h + 1, SAFEHOUSE_MAX_HOURS));
  const decrementHours = () =>
    setHours((h) => Math.max(h - 1, SAFEHOUSE_MIN_HOURS));

  // ---------- Read cash balance ----------
  const { data: cashBalanceRaw, isLoading: cashLoading } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const cashBalance =
    cashBalanceRaw !== undefined ? Number(formatEther(cashBalanceRaw as bigint)) : null;
  const hasEnoughCash = cashBalance !== null && cashBalance >= totalCost;

  // ---------- Step 1: Approve cash spending ----------
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const handleApprove = () => {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.safehouse, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const approveLoading = approvePending || approveConfirming;

  const approveToastFired = useRef(false);
  useEffect(() => {
    if (approveSuccess && approveHash && !approveToastFired.current) {
      approveToastFired.current = true;
      toast.success("Cash spending approved for Safehouse contract");
    }
    if (!approveHash) {
      approveToastFired.current = false;
    }
  }, [approveSuccess, approveHash]);

  // ---------- Step 2: Enter safehouse ----------
  const {
    writeContract: writeEnter,
    data: enterHash,
    isPending: enterPending,
    error: enterError,
    reset: resetEnter,
  } = useChainWriteContract();

  const { isLoading: enterConfirming, isSuccess: enterSuccess } =
    useWaitForTransactionReceipt({ hash: enterHash });

  const handleEnterSafehouse = () => {
    resetEnter();
    writeEnter({
      address: addresses.safehouse,
      abi: SAFEHOUSE_ABI,
      functionName: "enterSafehouse",
      args: [BigInt(hours)],
    });
  };

  const enterLoading = enterPending || enterConfirming;

  const enterToastFired = useRef(false);
  useEffect(() => {
    if (enterSuccess && enterHash && !enterToastFired.current) {
      enterToastFired.current = true;
      toast.success(
        `Entered safehouse for ${hours} hour${hours > 1 ? "s" : ""} (${totalCost.toLocaleString()} cash)`
      );
      refetchSafehouse();
    }
    if (!enterHash) {
      enterToastFired.current = false;
    }
  }, [enterSuccess, enterHash, hours, totalCost, refetchSafehouse]);

  // ---------- Auth states ----------
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Home className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Safehouse</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to enter the safehouse.
        </p>
      </div>
    );
  }

  if (authSigning) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">
          Sign to Verify
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please sign the message in your wallet to load safehouse data.
        </p>
      </div>
    );
  }

  if (signError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">
          Signature Required
        </p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          A wallet signature is needed to verify your identity.
        </p>
        <button
          onClick={requestSignature}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign Message
        </button>
      </div>
    );
  }

  const safehouseCountdown = safehouseTimeLeft !== null ? formatSafehouseTime(safehouseTimeLeft) : null;

  return (
    <div>
      {/* Page heading */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Safehouse</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hide from attacks by entering the safehouse. Costs{" "}
            <span className="font-mono text-primary">
              {SAFEHOUSE_COST_PER_HOUR.toLocaleString()}
            </span>{" "}
            cash per hour.
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          <Home className="inline h-3.5 w-3.5" />
        </span>
      </div>

      {/* ===== Active Safehouse Banner ===== */}
      {isInSafehouse && safehouseCountdown && safehouseTimeLeft !== null && safehouseTimeLeft > 0 && (
        <div className="mb-5 rounded-xl border border-cyan-400/20 bg-card p-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-cyan-400">
                You Are Safe
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You are currently protected in the safehouse. No one can attack you.
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-center gap-1.5 text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Protection Remaining
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CountdownUnit value={safehouseCountdown.days} label="Days" />
                <span className="text-xl font-bold text-muted-foreground pb-5">:</span>
                <CountdownUnit value={safehouseCountdown.hours} label="Hrs" />
                <span className="text-xl font-bold text-muted-foreground pb-5">:</span>
                <CountdownUnit value={safehouseCountdown.minutes} label="Min" />
                <span className="text-xl font-bold text-muted-foreground pb-5">:</span>
                <CountdownUnit value={safehouseCountdown.secs} label="Sec" />
              </div>
            </div>

            <div className="rounded-lg bg-background/50 px-4 py-2 w-full max-w-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Safe Until</span>
                <span className="font-mono text-[10px] text-foreground">
                  {new Date(safeUntilTs * 1000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isInSafehouse && safehouseTimeLeft === 0 && (
        <div className="mb-5 rounded-xl border border-cyan-400/20 bg-card p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-medium text-cyan-400">
              Your safehouse protection has ended.
            </p>
          </div>
        </div>
      )}

      {/* ===== Entry form - only show when NOT in safehouse ===== */}
      {!isInSafehouse && (
      <>
      {/* ===== Cash Balance ===== */}
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <Coins
          className={cn(
            "h-5 w-5 shrink-0",
            cashBalance !== null && hasEnoughCash
              ? "text-green-400"
              : "text-primary"
          )}
        />
        <div className="flex flex-1 items-center justify-between">
          <span className="text-sm text-muted-foreground">Cash Balance</span>
          {cashLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : cashBalance !== null ? (
            <span
              className={cn(
                "font-mono text-sm font-semibold tabular-nums",
                hasEnoughCash ? "text-green-400" : "text-red-400"
              )}
            >
              {cashBalance.toLocaleString()}
            </span>
          ) : (
            <span className="font-mono text-sm text-muted-foreground">-</span>
          )}
        </div>
      </div>

      {/* ===== Hour Selector ===== */}
      <div className="mb-5 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Duration
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono">
              {SAFEHOUSE_MIN_HOURS} - {SAFEHOUSE_MAX_HOURS} hours
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={decrementHours}
            disabled={hours <= SAFEHOUSE_MIN_HOURS}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" />
          </button>

          <input
            type="number"
            min={SAFEHOUSE_MIN_HOURS}
            max={SAFEHOUSE_MAX_HOURS}
            value={hours}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                setHours(
                  Math.max(
                    SAFEHOUSE_MIN_HOURS,
                    Math.min(SAFEHOUSE_MAX_HOURS, val)
                  )
                );
              }
            }}
            className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-center font-mono text-lg font-bold text-foreground outline-none transition-colors focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            type="button"
            onClick={incrementHours}
            disabled={hours >= SAFEHOUSE_MAX_HOURS}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Quick-select buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[1, 6, 12, 24, 48, 100].map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                hours === h
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {h}h
            </button>
          ))}
        </div>

        {/* Cost summary */}
        <div className="rounded-lg bg-background/50 border border-border p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Cost
            </span>
            <span
              className={cn(
                "font-mono text-lg font-bold tabular-nums",
                hasEnoughCash ? "text-foreground" : "text-red-400"
              )}
            >
              {totalCost.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {hours} hour{hours > 1 ? "s" : ""} x{" "}
              {SAFEHOUSE_COST_PER_HOUR.toLocaleString()} per hour
            </span>
            {cashBalance !== null && !hasEnoughCash && (
              <span className="text-[10px] text-red-400 font-medium">
                Insufficient cash
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== Step 1: Approve Cash ===== */}
      <div
        className={cn(
          "mb-5 rounded-xl border border-border bg-card p-6 transition-all duration-300",
          approveSuccess && "border-green-400/30",
          approveError && "border-red-400/30"
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Step 1: Approve Cash Spending
            </h3>
            <p className="text-xs text-muted-foreground">
              Allow the safehouse contract to spend your in-game cash
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mb-4 rounded-md bg-background/50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Function</span>
            <span className="font-mono text-[10px] text-primary">
              approveInGameCurrency(address, uint256)
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Spender</span>
            <span className="font-mono text-[10px] text-foreground">
              Safehouse contract
            </span>
          </div>
        </div>

        {approveSuccess && approveHash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-400" />
            <span className="text-[10px] text-green-400 font-medium">
              Approved
            </span>
            <a
              href={`${explorer}/tx/${approveHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
            >
              {approveHash.slice(0, 10)}...{approveHash.slice(-8)}
            </a>
          </div>
        )}

        {approveError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <p className="line-clamp-2 text-[10px] text-red-400">
              {approveError.message.includes("User rejected")
                ? "Approval rejected by user"
                : approveError.message.split("\n")[0]}
            </p>
          </div>
        )}

        <button
          onClick={handleApprove}
          disabled={!isConnected || approveLoading}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            isConnected
              ? "bg-amber-500/90 text-white hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {approveLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {approvePending ? "Confirm in wallet..." : "Confirming..."}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Approve Cash Spending
            </>
          )}
        </button>
      </div>

      {/* ===== Step 2: Enter Safehouse ===== */}
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-6 transition-all duration-300",
          enterSuccess && "border-green-400/30",
          enterError && "border-red-400/30"
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Step 2: Enter Safehouse
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter the safehouse for {hours} hour{hours > 1 ? "s" : ""} at{" "}
              {totalCost.toLocaleString()} cash
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mb-4 rounded-md bg-background/50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Function</span>
            <span className="font-mono text-[10px] text-primary">
              enterSafehouse(uint256)
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Hours</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {hours}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cost</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {totalCost.toLocaleString()} cash
            </span>
          </div>
        </div>

        {enterSuccess && enterHash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
            <span className="text-[10px] text-green-400 font-medium">
              Safe for {hours}h
            </span>
            <a
              href={`${explorer}/tx/${enterHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
            >
              {enterHash.slice(0, 10)}...{enterHash.slice(-8)}
            </a>
          </div>
        )}

        {enterError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <p className="line-clamp-2 text-[10px] text-red-400">
              {enterError.message.includes("User rejected")
                ? "Transaction rejected by user"
                : enterError.message.split("\n")[0]}
            </p>
          </div>
        )}

        <button
          onClick={handleEnterSafehouse}
          disabled={
            !isConnected ||
            enterLoading ||
            !hasEnoughCash ||
            hours < SAFEHOUSE_MIN_HOURS ||
            hours > SAFEHOUSE_MAX_HOURS
          }
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            isConnected && hasEnoughCash
              ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {enterLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {enterPending ? "Confirm in wallet..." : "Confirming..."}
            </>
          ) : (
            <>
              <Home className="h-4 w-4" />
              Enter Safehouse
            </>
          )}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
