"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  HELPERBOT_CONTRACT_ABI,
  parseHelperBotInfo,
  type HelperBotInfo,
  type HELPER_BOTS,
} from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  Bot,
  CircleDot,
  ChevronDown,
  Clock,
  Target,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type HelperBot = (typeof HELPER_BOTS)[number];

export function HelperBotCard({ bot, creditBalance, onCreditChange }: { bot: HelperBot; creditBalance: number | null; onCreditChange?: () => void }) {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const publicClient = usePublicClient();
  const { authData } = useAuth();
  const authMessage = authData?.message ?? null;
  const signature = authData?.signature ?? null;

  // ---------- Read bot info ----------
  const [botInfo, setBotInfo] = useState<HelperBotInfo | null>(null);

  const fetchBotInfo = useCallback(async () => {
    if (!address || !publicClient) return;
    try {
      const result = await publicClient.readContract({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: bot.infoFn,
        args: [address],
      });
      if (result && typeof result === "object") {
        const info = parseHelperBotInfo(result);
        setBotInfo(info);
      }
    } catch {
      // silently fail
    }
  }, [address, publicClient, addresses.helperbot, bot.infoFn]);

  useEffect(() => {
    fetchBotInfo();
    const interval = setInterval(fetchBotInfo, 15000);
    return () => clearInterval(interval);
  }, [fetchBotInfo]);

  const isRunning = botInfo?.isRunning === true;

  // ---------- Attempt count selector ----------
  const balanceMax = creditBalance !== null && bot.credits > 0
    ? Math.floor(creditBalance / bot.credits)
    : bot.maxAttempts;
  const maxAttempts = Math.min(balanceMax, bot.maxAttempts);
  const minAttempts = bot.minAttempts;
  const [selectedAttempts, setSelectedAttempts] = useState<number>(bot.minAttempts);
  const [inputMode, setInputMode] = useState<"dropdown" | "manual">("dropdown");
  const dropdownOptions = [
    minAttempts,
    ...([5, 10, 25, 50].filter((v) => v > minAttempts)),
    ...Array.from({ length: 50 }, (_, i) => (i + 1) * 100),
  ].filter((v) => v >= minAttempts && v <= maxAttempts);

  // ---------- Start bot ----------
  const {
    writeContract: writeStart,
    data: startHash,
    isPending: startPending,
    error: startError,
    reset: resetStart,
  } = useChainWriteContract();

  const { isLoading: startConfirming, isSuccess: startSuccess } =
    useWaitForTransactionReceipt({ hash: startHash });

  const handleStart = () => {
    resetStart();
    writeStart({
      address: addresses.helperbot,
      abi: HELPERBOT_CONTRACT_ABI,
      functionName: bot.startFn,
      args: [BigInt(selectedAttempts), []],
      gas: BigInt(500_000),
    });
  };

  const startToastFired = useRef(false);
  useEffect(() => {
    if (startSuccess && startHash && !startToastFired.current) {
      startToastFired.current = true;
      toast.success(`${bot.label} hired successfully`);
      fetchBotInfo();
      onCreditChange?.();
      const t = setTimeout(() => { fetchBotInfo(); onCreditChange?.(); }, 3000);
      return () => clearTimeout(t);
    }
    if (!startHash) startToastFired.current = false;
  }, [startSuccess, startHash, bot.label, fetchBotInfo, onCreditChange]);

  // ---------- End bot ----------
  const {
    writeContract: writeEnd,
    data: endHash,
    isPending: endPending,
    error: endError,
    reset: resetEnd,
  } = useChainWriteContract();

  const { isLoading: endConfirming, isSuccess: endSuccess } =
    useWaitForTransactionReceipt({ hash: endHash });

  const handleEnd = () => {
    resetEnd();
    if (bot.endType === "none") {
      writeEnd({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: bot.endFn,
        args: [],
        gas: BigInt(500_000),
      });
    } else if (bot.endType === "signed") {
      if (!authMessage || !signature) {
        toast.error("Authentication required. Please sign in first.");
        return;
      }
      writeEnd({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: bot.endFn,
        args: [authMessage, signature],
        gas: BigInt(500_000),
      });
    } else if (bot.endType === "bulletSigned") {
      if (!authMessage || !signature) {
        toast.error("Authentication required. Please sign in first.");
        return;
      }
      writeEnd({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: bot.endFn,
        args: [true, authMessage, signature],
        gas: BigInt(500_000),
      });
    }
  };

  const endToastFired = useRef(false);
  useEffect(() => {
    if (endSuccess && endHash && !endToastFired.current) {
      endToastFired.current = true;
      toast.success(`${bot.label} withdrawn successfully`);
      fetchBotInfo();
      onCreditChange?.();
      const t = setTimeout(() => { fetchBotInfo(); onCreditChange?.(); }, 3000);
      return () => clearTimeout(t);
    }
    if (!endHash) endToastFired.current = false;
  }, [endSuccess, endHash, bot.label, fetchBotInfo, onCreditChange]);

  // ---------- Derived state ----------
  const startLoading = startPending || startConfirming;
  const endLoading = endPending || endConfirming;
  const isLoading = startLoading || endLoading;
  const error = startError || endError;
  const txHash = startHash || endHash;
  const txSuccess = startSuccess || endSuccess;

  // End time countdown
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const endTimeSec = botInfo ? botInfo.endTimestamp : 0;
  const startTimeSec = botInfo ? botInfo.startTimestamp : 0;
  const timeLeft = endTimeSec > now ? endTimeSec - now : 0;
  const canWithdraw = isRunning && timeLeft === 0;

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  // Progress bar percentage
  const totalDuration = endTimeSec > startTimeSec ? endTimeSec - startTimeSec : 0;
  const elapsed = now > startTimeSec ? now - startTimeSec : 0;
  const progressPct = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card p-5 transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/5",
        isRunning
          ? "border-green-400/30 hover:border-green-400/50"
          : "border-border hover:border-primary/30",
        txSuccess && "border-primary/30",
        error && "border-red-400/30"
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isRunning
                ? "bg-green-400/10 text-green-400"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {bot.label}
            </h3>
            <p className="text-xs text-muted-foreground">{bot.description}</p>
          </div>
        </div>

        {/* Status indicator */}
        {isConnected && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
              isRunning
                ? "bg-green-400/10 text-green-400"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <CircleDot
              className={cn("h-3 w-3", isRunning && "animate-pulse")}
            />
            {isRunning ? "Running" : "Idle"}
          </div>
        )}
      </div>

      {/* Bot info details */}
      <div className="mb-4 rounded-md bg-background/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Credit / Attempt</span>
          <span className="text-xs font-medium text-foreground">{bot.credits}</span>
        </div>
        {!isRunning && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Credits</span>
            <span className="text-xs font-semibold text-primary">{(bot.credits * selectedAttempts).toLocaleString()}</span>
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Rank</span>
          <span className={cn(
            "text-xs font-medium",
            bot.rank === "High" ? "text-red-400" : bot.rank === "Medium" ? "text-chain-accent" : "text-green-400"
          )}>{bot.rank}</span>
        </div>
        {bot.endType !== "none" && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Withdraw</span>
            <span className="text-[10px] font-mono text-chain-accent">Requires signature</span>
          </div>
        )}
      </div>

      {/* Running info with progress */}
      {isRunning && botInfo && (
        <div className="mb-4 rounded-md border border-green-400/20 bg-green-400/5 px-3 py-2.5">
          {/* Attempts & Success Rate */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" /> Attempts
            </span>
            <span className="text-xs font-mono font-semibold text-foreground">{botInfo.attemptCount.toLocaleString()}</span>
          </div>
          {botInfo.successRate > 0 && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" /> Success Rate
              </span>
              <span className="text-xs font-mono text-green-400">{(botInfo.successRate / 100).toFixed(2)}%</span>
            </div>
          )}

          {/* Time remaining */}
          {timeLeft > 0 && (
            <>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Time Left
                </span>
                <span className="text-xs font-mono text-chain-accent">{formatTime(timeLeft)}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/80">
                <div
                  className="h-full rounded-full bg-green-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </>
          )}
          {timeLeft === 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className="text-xs font-medium text-green-400">Ready to withdraw</span>
            </div>
          )}
          {startTimeSec > 0 && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Started</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {new Date(startTimeSec * 1000).toLocaleString()}
              </span>
            </div>
          )}
          {endTimeSec > 0 && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ends</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {new Date(endTimeSec * 1000).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Attempt count selector (when not running) */}
      {!isRunning && (
        <div className="mb-4">
          {/* Mode toggle */}
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs text-muted-foreground">
              Attempt Count
            </label>
            <div className="flex rounded-md border border-border bg-background/50">
              <button
                type="button"
                onClick={() => {
                  setInputMode("dropdown");
                  const nearest = dropdownOptions.reduce((a, b) =>
                    Math.abs(b - selectedAttempts) < Math.abs(a - selectedAttempts) ? b : a
                  , dropdownOptions[0] ?? 100);
                  setSelectedAttempts(nearest);
                }}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-medium transition-colors rounded-l-md",
                  inputMode === "dropdown"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Preset
              </button>
              <button
                type="button"
                onClick={() => setInputMode("manual")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-medium transition-colors rounded-r-md",
                  inputMode === "manual"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Custom
              </button>
            </div>
          </div>

          {inputMode === "dropdown" ? (
            <div className="relative">
              <select
                value={selectedAttempts}
                onChange={(e) => setSelectedAttempts(Number(e.target.value))}
                className="w-full appearance-none rounded-lg border border-border bg-background/50 px-3 py-2 pr-8 text-sm text-foreground outline-none focus:border-primary"
                size={1}
              >
                {dropdownOptions.map((c) => (
                  <option key={c} value={c}>
                    {c.toLocaleString()} attempts
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={minAttempts}
                max={maxAttempts}
                step={1}
                value={selectedAttempts}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) setSelectedAttempts(Math.min(Math.max(minAttempts, val), maxAttempts));
                }}
                className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm font-mono text-foreground outline-none focus:border-primary"
                placeholder={`Min: ${minAttempts}`}
              />
            </div>
          )}
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {inputMode === "manual"
              ? `Min: ${minAttempts.toLocaleString()} / Max: ${maxAttempts.toLocaleString()}`
              : `Select from preset amounts (${minAttempts.toLocaleString()} - ${maxAttempts.toLocaleString()})`}
          </p>
          {creditBalance !== null && selectedAttempts * bot.credits > creditBalance && (
            <p className="mt-1 text-[10px] font-medium text-red-400">
              {"Insufficient credits. Need "}{(selectedAttempts * bot.credits).toLocaleString()}{", have "}{creditBalance.toLocaleString()}{"."}
            </p>
          )}
        </div>
      )}

      {/* Status messages */}
      {txSuccess && txHash && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
          <a
            href={`${explorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="line-clamp-2 text-[10px] text-red-400">
            {error.message.includes("User rejected")
              ? "Transaction rejected by user"
              : error.message.split("\n")[0]}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-auto">
        {!isRunning && (
          <button
            onClick={handleStart}
            disabled={!isConnected || isLoading || (creditBalance !== null && selectedAttempts * bot.credits > creditBalance)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {startLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{startPending ? "Confirm in wallet..." : "Starting..."}</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Hire Bot</span>
              </>
            )}
          </button>
        )}

        {isRunning && timeLeft > 0 && !endLoading && (
          <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-400/20 bg-green-400/5 px-4 py-2.5 text-sm font-semibold text-green-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Bot is working...</span>
          </div>
        )}

        {isRunning && canWithdraw && (
          <button
            onClick={handleEnd}
            disabled={!isConnected || endLoading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              "bg-green-500 text-white hover:bg-green-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {endLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{endPending ? "Confirm in wallet..." : "Withdrawing..."}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Withdraw Results</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
