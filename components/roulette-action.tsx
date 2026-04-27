"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
  usePublicClient,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  ROULETTE_CONTRACT_ABI,
  ROULETTE_BET_TYPES,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_ADDRESS,
  INGAME_CURRENCY_APPROVE_AMOUNT,
  USER_PROFILE_CONTRACT_ABI,
  TRAVEL_DESTINATIONS,
} from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Dices,
  Plus,
  Trash2,
  Trophy,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUnits, parseUnits, decodeEventLog, type Log } from "viem";

// ── Types ──────────────────────────────────────────────────────────
interface RouletteTable {
  id: number;
  isOpened: boolean;
  minBet: bigint;
  maxBet: bigint;
  minBetTop: bigint;
  minBetBottom: bigint;
  maxBetTop: bigint;
  maxBetBottom: bigint;
}

interface BetEntry {
  betType: number;
  number: number;
  amount: string; // human-readable input
}

interface FinishedBetResult {
  rouletteId: number;
  betId: bigint;
  nonce: bigint;
  betAmount: bigint;
  totalReward: bigint;
  rewardReceived: bigint;
  feeAmount: bigint;
}

type Phase = "idle" | "placing" | "pending" | "spinning" | "result";

// ── Colour helpers ─────────────────────────────────────────────────
const ROULETTE_RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function getRouletteNumberColor(n: number): "green" | "red" | "black" {
  if (n === 0 || n === 37) return "green";
  if (n <= 10 || (n >= 19 && n <= 28)) {
    return n % 2 === 0 ? "black" : "red";
  } else {
    return n % 2 === 1 ? "black" : "red";
  }
}

function numberBg(n: number): string {
  const c = getRouletteNumberColor(n);
  if (c === "green") return "bg-emerald-500";
  if (c === "red") return "bg-red-500";
  return "bg-zinc-800";
}

// ── Bet label helpers ──────────────────────────────────────────────
function betLabel(betType: number, num: number): string {
  const bt = ROULETTE_BET_TYPES.find((b) => b.id === betType);
  if (!bt) return `Type ${betType} #${num}`;
  if (bt.options) {
    const opt = bt.options.find((o) => o.value === num);
    return opt ? `${bt.label}: ${opt.label}` : `${bt.label} #${num}`;
  }
  // Straight
  return num === 37 ? "Straight: 00" : `Straight: ${num}`;
}

// Default number for bet type
function defaultNumberForType(betType: number): number {
  return 0;
}

// ═══════════════════════════════════════════════════════════════════
export function RouletteAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData, isSigning: authSigning, signError, requestSignature } = useAuth();
  const publicClient = usePublicClient();

  // ── Read user profile to get cityId (requires auth) ────────────
  const { data: profileRaw } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const profile = profileRaw as
    | { profileId: bigint; username: string; cityId: number; isActive: boolean }
    | undefined;
  const cityId = profile?.cityId;
  const cityName =
    cityId !== undefined && cityId < TRAVEL_DESTINATIONS.length
      ? TRAVEL_DESTINATIONS[cityId].label
      : cityId !== undefined
        ? `City #${cityId}`
        : null;

  // ── State ──────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("idle");
  const [tables, setTables] = useState<RouletteTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number>(-1);
  const [bets, setBets] = useState<BetEntry[]>([
    { betType: 5, number: 0, amount: "" },
  ]);
  const [result, setResult] = useState<FinishedBetResult | null>(null);

  // ── Contracts ──────────────────────────────────────────────────
  const {
    writeContract: writeBet,
    data: betHash,
    isPending: betPending,
    error: betError,
    reset: resetBet,
  } = useChainWriteContract();

  const {
    writeContract: writeFinish,
    data: finishHash,
    isPending: finishPending,
    error: finishError,
    reset: resetFinish,
  } = useChainWriteContract();

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: betConfirming, isSuccess: betSuccess } =
    useWaitForTransactionReceipt({ hash: betHash });

  const { isLoading: finishConfirming, isSuccess: finishSuccess } =
    useWaitForTransactionReceipt({ hash: finishHash });

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // ── Pending-bet status per table from contract ─────────────────
  const { data: userBetInfoRaw, refetch: refetchBetInfo } = useReadContract({
    address: addresses.roulette,
    abi: ROULETTE_CONTRACT_ABI,
    functionName: "getUserBetInfo",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address, refetchInterval: 5_000 },
  });

  // ── Total bet amount ────────────────────────────────────────────
  const totalBetAmount = bets.reduce((sum, b) => {
    const val = Number(b.amount);
    return sum + (Number.isNaN(val) ? 0 : val);
  }, 0);

  // ── Fetch roulette tables ──────────────────────────────────────
  const fetchTables = useCallback(async () => {
    if (!publicClient) return;
    setTablesLoading(true);
    try {
      const raw = await publicClient.readContract({
        address: addresses.roulette,
        abi: ROULETTE_CONTRACT_ABI,
        functionName: "getRoulettes",
      });
      console.log("[v0] getRoulettes raw:", raw);
      const list = raw as Array<{
        id: number;
        isOpened: boolean;
        maxBet: bigint;
        minBet: bigint;
        minBetTop: bigint;
        minBetBottom: bigint;
        maxBetTop: bigint;
        maxBetBottom: bigint;
      }>;
      // Map with index as id (contract returns array indexed by cityId)
      const all = list.map((t, idx) => ({
        id: Number(t.id) || idx,
        isOpened: t.isOpened,
        minBet: t.minBet,
        maxBet: t.maxBet,
        minBetTop: t.minBetTop,
        minBetBottom: t.minBetBottom,
        maxBetTop: t.maxBetTop,
        maxBetBottom: t.maxBetBottom,
      }));
      console.log("[v0] Roulette tables:", all.map(t => ({ id: t.id, isOpened: t.isOpened, min: t.minBet.toString(), max: t.maxBet.toString() })));
      setTables(all);
    } catch (e) {
      console.error("[v0] Failed to fetch roulette tables:", e);
    } finally {
      setTablesLoading(false);
    }
  }, [publicClient, addresses.roulette]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Auto-select table based on player cityId
  useEffect(() => {
    if (tables.length === 0) return;
    if (cityId !== undefined) {
      const match = tables.find((t) => t.id === cityId);
      if (match) {
        console.log("[v0] Auto-selecting table for cityId:", cityId);
        setSelectedTable(match.id);
      } else {
        console.log("[v0] No table matches cityId", cityId, "falling back to first table");
        setSelectedTable(tables[0].id);
      }
    } else if (selectedTable === -1) {
      setSelectedTable(tables[0].id);
    }
  }, [tables, cityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Detect pending bets on mount ───────────────────────────────
  useEffect(() => {
    if (!userBetInfoRaw) return;
    console.log("[v0] getUserBetInfo raw:", userBetInfoRaw);
    const infos = userBetInfoRaw as Array<{
      isPending: boolean;
      requestBlock: bigint;
      totalAmount: bigint;
    }>;
    for (let i = 0; i < infos.length; i++) {
      if (infos[i]?.isPending) {
        console.log("[v0] Found pending bet on table index:", i);
        setSelectedTable(i);
        setPhase("pending");
        return;
      }
    }
  }, [userBetInfoRaw]);

  // ── After bet tx confirms → move to pending ────────────────────
  const betToastFired = useRef(false);
  useEffect(() => {
    if (betSuccess && betHash && !betToastFired.current) {
      betToastFired.current = true;
      toast.success("Bet placed! Waiting for block confirmation...");
      setPhase("pending");
      refetchBetInfo();
    }
    if (!betHash) betToastFired.current = false;
  }, [betSuccess, betHash, refetchBetInfo]);

  // ── After approve tx confirms ────────────────────────────────────
  const approveToastFired = useRef(false);
  useEffect(() => {
    if (approveSuccess && approveHash && !approveToastFired.current) {
      approveToastFired.current = true;
      toast.success("Cash spend approved for Roulette contract");
    }
    if (!approveHash) approveToastFired.current = false;
  }, [approveSuccess, approveHash]);

  // ── After finish tx confirms → parse result ────────────────────
  const finishToastFired = useRef(false);
  useEffect(() => {
    if (!finishSuccess || !finishHash || finishToastFired.current) return;
    finishToastFired.current = true;

    const parseResult = async () => {
      if (!publicClient) return;
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: finishHash,
        });
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: ROULETTE_CONTRACT_ABI,
              data: log.data,
              topics: (log as Log).topics,
              strict: false,
            });
            if (decoded.eventName === "FinishedBet") {
              const args = decoded.args as unknown as {
                rouletteId: number;
                betId: bigint;
                nonce: bigint;
                betAmount: bigint;
                totalReward: bigint;
                rewardReceived: bigint;
                feeAmount: bigint;
              };
              setResult(args);
              setPhase("result");
              return;
            }
          } catch {
            // not our event
          }
        }
        setPhase("result");
      } catch {
        setPhase("result");
      }
    };
    parseResult();

    if (!finishHash) finishToastFired.current = false;
  }, [finishSuccess, finishHash, publicClient]);

  // ── Bet management ─────────────────────────────────────────────
  const addBet = () => {
    setBets((prev) => [...prev, { betType: 5, number: 0, amount: "" }]);
  };

  const removeBet = (idx: number) => {
    setBets((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateBet = (idx: number, field: keyof BetEntry, value: string | number) => {
    setBets((prev) =>
      prev.map((b, i) => {
        if (i !== idx) return b;
        if (field === "betType") {
          // reset number to 0 when changing type
          return { ...b, betType: value as number, number: defaultNumberForType(value as number) };
        }
        return { ...b, [field]: value };
      }),
    );
  };

  const allBetsValid = bets.length > 0 && bets.every((b) => Number(b.amount) > 0);

  // ── Handle approve cash spend (same pattern as shop / other biz pages) ──
  const handleApprove = () => {
    resetApprove();
    writeApprove({
      address: INGAME_CURRENCY_ADDRESS,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.roulette, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const approveLoading = approvePending || approveConfirming;

  // ── Handle place bet ───────────────────────────────────────────
  const handlePlaceBet = async () => {
    if (!authData) {
      requestSignature();
      return;
    }
    if (!allBetsValid) return;

    resetBet();
    setPhase("placing");

    const betArgs = bets.map((b) => ({
      betType: b.betType,
      number: b.number,
      amount: parseUnits(b.amount, 18),
    }));

    writeBet({
      address: addresses.roulette,
      abi: ROULETTE_CONTRACT_ABI,
      functionName: "initializeBet",
      args: [selectedTable, betArgs, authData.message, authData.signature],
    });
  };

  // ── Handle finish / spin ───────────────────────────────────────
  const handleFinish = () => {
    resetFinish();
    setPhase("spinning");
    writeFinish({
      address: addresses.roulette,
      abi: ROULETTE_CONTRACT_ABI,
      functionName: "finishBet",
      args: [selectedTable],
    });
  };

  // ── Handle new round ───────────────────────────────────────────
  const handleNewRound = () => {
    setPhase("idle");
    setResult(null);
    resetBet();
    resetFinish();
    setBets([{ betType: 5, number: 0, amount: "" }]);
    refetchBetInfo();
  };

  // ── Derived loading states ─────────────────────────────────────
  const isPlacing = betPending || betConfirming;
  const isSpinning = finishPending || finishConfirming;

  const anyError = betError || finishError;

  // ── Get current table ──────────────────────────────────────────
  const currentTable = tables.find((t) => t.id === selectedTable) ?? tables[0];

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Roulette</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Place bets on the on-chain roulette wheel via{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
              initializeBet / finishBet
            </code>
          </p>
        </div>
        <button
          onClick={fetchTables}
          disabled={tablesLoading}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Refresh tables"
        >
          <RefreshCw className={cn("h-4 w-4", tablesLoading && "animate-spin")} />
        </button>
      </div>

      {/* ── Table info (auto-selected by city) ──────────────────── */}
      {selectedTable >= 0 && currentTable && phase !== "result" && (
        <div className="mb-4">
          <div className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2.5",
            currentTable.isOpened
              ? "border-primary/20 bg-primary/5"
              : "border-amber-400/20 bg-amber-400/5",
          )}>
            <Dices className={cn("h-4 w-4", currentTable.isOpened ? "text-primary" : "text-amber-400")} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {cityName ?? "Loading..."} Roulette
                <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                  (Table #{selectedTable})
                </span>
                {!currentTable.isOpened && (
                  <span className="ml-1.5 text-xs font-medium text-amber-400">
                    - Closed
                  </span>
                )}
              </p>
              {currentTable.isOpened && (
                <p className="mt-0.5 flex gap-3 text-[10px] text-muted-foreground font-mono">
                  <span>
                    Min: {Number(formatUnits(currentTable.minBet, 18)).toLocaleString()} cash
                  </span>
                  <span>
                    Max: {Number(formatUnits(currentTable.maxBet, 18)).toLocaleString()} cash
                  </span>
                </p>
              )}
            </div>
          </div>
          {!currentTable.isOpened && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <p className="text-[10px] text-amber-400">
                The roulette table in {cityName} is currently closed. You may need
                to travel to a city with an active table.
              </p>
            </div>
          )}
        </div>
      )}

      {tables.length === 0 && !tablesLoading && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-muted-foreground">
            No roulette tables found on this chain.
          </span>
        </div>
      )}

      {tablesLoading && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading roulette tables...
          </span>
        </div>
      )}

      {/* ── Auth gate ───────────────────────────────────────────── */}
      {isConnected && !authData && phase === "idle" && (
        <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Signature Required
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sign a message to authenticate your wallet before placing bets.
              </p>
              <button
                onClick={requestSignature}
                disabled={authSigning}
                className="mt-2 rounded-lg bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
              >
                {authSigning ? "Signing..." : signError ? "Retry Signature" : "Sign Message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Approve Cash Spend Card ═════════════════ */}
      {phase === "idle" && (
        <div
          className={cn(
            "mb-5 rounded-xl border border-border bg-card p-6 transition-all duration-300",
            approveSuccess && "border-green-400/30",
            approveError && "border-red-400/30",
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Approve Cash Spend
              </h3>
              <p className="text-xs text-muted-foreground">
                Allow the Roulette contract to spend your in-game cash
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
                Roulette Contract
              </span>
            </div>
          </div>

          {/* Approve success */}
          {approveSuccess && approveHash && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-400" />
              <span className="shrink-0 text-[10px] text-green-400 mr-1">
                Approved:
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

          {/* Approve error */}
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

          {/* Approve button */}
          <button
            onClick={handleApprove}
            disabled={!isConnected || approveLoading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              isConnected
                ? "bg-primary/90 text-primary-foreground hover:bg-primary active:scale-[0.98] disabled:opacity-50"
                : "bg-secondary text-muted-foreground cursor-not-allowed",
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
                Approve Cash Spend
              </>
            )}
          </button>
        </div>
      )}

      {/* ═══════════════ IDLE: Bet Builder ═══════════════════════ */}
      {(phase === "idle" || phase === "placing") && (
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-5 transition-all",
            anyError && "border-red-400/30",
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Place Your Bets
            </h3>
            {bets.length < 10 && (
              <button
                onClick={addBet}
                disabled={isPlacing}
                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                Add Bet
              </button>
            )}
          </div>

          {/* Bet rows */}
          <div className="flex flex-col gap-3">
            {bets.map((bet, idx) => {
              const bt = ROULETTE_BET_TYPES.find((b) => b.id === bet.betType);
              const hasOptions = bt?.options != null;
              return (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-background/50 p-3 sm:flex-row sm:items-end sm:gap-3"
                >
                  {/* Bet Type */}
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Bet Type
                    </label>
                    <select
                      value={bet.betType}
                      onChange={(e) => updateBet(idx, "betType", Number(e.target.value))}
                      disabled={isPlacing}
                      className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {ROULETTE_BET_TYPES.map((bt) => (
                        <option key={bt.id} value={bt.id}>
                          {bt.label} ({bt.payout})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Number / Option picker */}
                  <div className="w-full sm:w-40">
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {hasOptions ? "Selection" : "Number (0-37)"}
                    </label>
                    {hasOptions ? (
                      <select
                        value={bet.number}
                        onChange={(e) => updateBet(idx, "number", Number(e.target.value))}
                        disabled={isPlacing}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
                      >
                        {bt!.options!.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={37}
                        value={bet.number}
                        onChange={(e) =>
                          updateBet(
                            idx,
                            "number",
                            Math.max(0, Math.min(37, Number(e.target.value))),
                          )
                        }
                        disabled={isPlacing}
                        placeholder="0-37"
                        className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground font-mono outline-none focus:border-primary"
                      />
                    )}
                  </div>

                  {/* Amount */}
                  <div className="w-full sm:w-36">
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Amount (Cash)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={bet.amount}
                      onChange={(e) => updateBet(idx, "amount", e.target.value)}
                      disabled={isPlacing}
                      className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground font-mono outline-none focus:border-primary"
                    />
                  </div>

                  {/* Remove */}
                  {bets.length > 1 && (
                    <button
                      onClick={() => removeBet(idx)}
                      disabled={isPlacing}
                      className="self-end rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                      aria-label="Remove bet"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bet summary chips */}
          {bets.some((b) => Number(b.amount) > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {bets
                .filter((b) => Number(b.amount) > 0)
                .map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {betLabel(b.betType, b.number)}
                    <span className="font-mono text-foreground">
                      {Number(b.amount).toLocaleString()}
                    </span>
                  </span>
                ))}
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 rounded-lg bg-background/50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Bets</span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {bets.length}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Total Amount
              </span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {totalBetAmount.toLocaleString()} cash
              </span>
            </div>
          </div>

          {/* Errors */}
          {(betError || finishError) && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="line-clamp-2 text-[10px] text-red-400">
                {((betError || finishError) as Error).message?.includes("User rejected")
                  ? "Transaction rejected by user"
                  : ((betError || finishError) as Error).message?.split("\n")[0]}
              </p>
            </div>
          )}

          {/* ── Place Bet button ─────────────────────────────── */}
          <button
            onClick={handlePlaceBet}
            disabled={
              !isConnected ||
              isPlacing ||
              !allBetsValid ||
              !currentTable?.isOpened
            }
            className={cn(
              "mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              isConnected && allBetsValid && currentTable?.isOpened
                ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                : "bg-secondary text-muted-foreground cursor-not-allowed",
            )}
          >
            {isPlacing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {betPending ? "Confirm in wallet..." : "Placing bet..."}
              </>
            ) : (
              <>
                <Dices className="h-4 w-4" />
                {isConnected
                  ? authData
                    ? "Place Bet"
                    : "Sign & Place Bet"
                  : "Connect Wallet"}
              </>
            )}
          </button>
        </div>
      )}

      {/* ═══════════════ PENDING: Waiting for block ═════════════ */}
      {phase === "pending" && (
        <div className="rounded-xl border border-primary/30 bg-card p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Bet Placed on Table #{selectedTable}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Waiting for block confirmation before spinning. Click below when
                ready.
              </p>
            </div>

            {betHash && (
              <a
                href={`${explorer}/tx/${betHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-primary underline decoration-primary/30 hover:decoration-primary"
              >
                {betHash.slice(0, 10)}...{betHash.slice(-8)}
              </a>
            )}

            <button
              onClick={handleFinish}
              disabled={isSpinning}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {isSpinning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {finishPending ? "Confirm in wallet..." : "Spinning..."}
                </>
              ) : (
                <>
                  <Dices className="h-4 w-4" />
                  Spin the Wheel
                </>
              )}
            </button>

            {finishError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="text-[10px] text-red-400">
                  {finishError.message?.includes("User rejected")
                    ? "Transaction rejected"
                    : finishError.message?.includes("too early")
                      ? "Block not ready yet. Please wait a moment and try again."
                      : finishError.message?.split("\n")[0]}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ SPINNING ═══════════════════════════════ */}
      {phase === "spinning" && (
        <div className="rounded-xl border border-primary/30 bg-card p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-primary/30" />
              <Dices className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Spinning the Wheel...
            </h3>
            <p className="text-sm text-muted-foreground">
              Resolving your bet on-chain. This may take a moment.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════ RESULT ═════════════════════════════════ */}
      {phase === "result" && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {result ? (
              <>
                {/* Win or Loss */}
                {result.totalReward > BigInt(0) ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10">
                    <Trophy className="h-8 w-8 text-emerald-400" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-400/10">
                    <XCircle className="h-8 w-8 text-red-400" />
                  </div>
                )}

                <div>
                  <h3
                    className={cn(
                      "text-lg font-bold",
                      result.totalReward > BigInt(0)
                        ? "text-emerald-400"
                        : "text-red-400",
                    )}
                  >
                    {result.totalReward > BigInt(0) ? "You Won!" : "No Luck This Time"}
                  </h3>

                  {/* Nonce / winning number */}
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Winning Number:
                    </span>
                    {(() => {
                      const winNum = Number(result.nonce % BigInt(38));
                      const col = getRouletteNumberColor(winNum);
                      return (
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white",
                            col === "green"
                              ? "bg-emerald-500"
                              : col === "red"
                                ? "bg-red-500"
                                : "bg-zinc-800",
                          )}
                        >
                          {winNum === 37 ? "00" : winNum}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Stats */}
                <div className="w-full max-w-xs space-y-2 rounded-lg bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Total Bet
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {Number(
                        formatUnits(result.betAmount, 18),
                      ).toLocaleString()}{" "}
                      cash
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Total Reward
                    </span>
                    <span
                      className={cn(
                        "font-mono text-xs font-semibold",
                        result.totalReward > BigInt(0)
                          ? "text-emerald-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {Number(
                        formatUnits(result.totalReward, 18),
                      ).toLocaleString()}{" "}
                      cash
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Received (after fee)
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {Number(
                        formatUnits(result.rewardReceived, 18),
                      ).toLocaleString()}{" "}
                      cash
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Fee</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {Number(
                        formatUnits(result.feeAmount, 18),
                      ).toLocaleString()}{" "}
                      cash
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-10 w-10 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Bet Resolved
                </h3>
                <p className="text-sm text-muted-foreground">
                  Transaction confirmed but no FinishedBet event was found.
                </p>
              </>
            )}

            {finishHash && (
              <a
                href={`${explorer}/tx/${finishHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-primary underline decoration-primary/30 hover:decoration-primary"
              >
                {finishHash.slice(0, 10)}...{finishHash.slice(-8)}
              </a>
            )}

            <button
              onClick={handleNewRound}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Dices className="h-4 w-4" />
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
