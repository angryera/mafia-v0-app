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
  SLOT_MACHINE_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
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
  Cherry,
  Trophy,
  RefreshCw,
  ShieldCheck,
  Heart,
  Shield,
  Bot,
  DollarSign,
  Crosshair,
  Package,
  Coins,
  KeyRound,
  Image as ImageIcon,
  Diamond,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUnits, parseUnits, decodeEventLog, type Log } from "viem";

// ── Types ──────────────────────────────────────────────────────────
interface SlotMachineTable {
  id: number;
  isOpened: boolean;
  minBet: bigint;
  maxBet: bigint;
}

interface FinishedBetResult {
  slotMachineId: number;
  betId: bigint;
  nonce: bigint;
  spinCount: number;
  amountPerSpin: bigint;
  totalReward: bigint;
  rewardReceived: bigint;
  feeAmount: bigint;
}

type Phase = "idle" | "placing" | "pending" | "spinning" | "result";

// ── Slot symbols mapped to lucide icons ─────────────────────────
const SLOT_SYMBOLS = [
  { name: "Health", icon: Heart, color: "text-red-400", bg: "bg-red-400/15" },
  { name: "Bodyguard", icon: Shield, color: "text-blue-400", bg: "bg-blue-400/15" },
  { name: "Helper Bot", icon: Bot, color: "text-cyan-400", bg: "bg-cyan-400/15" },
  { name: "Cash", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/15" },
  { name: "Bullets", icon: Crosshair, color: "text-orange-400", bg: "bg-orange-400/15" },
  { name: "Crate", icon: Package, color: "text-amber-400", bg: "bg-amber-400/15" },
  { name: "MAFIA", icon: Coins, color: "text-yellow-400", bg: "bg-yellow-400/15" },
  { name: "Keys", icon: KeyRound, color: "text-purple-400", bg: "bg-purple-400/15" },
  { name: "OG NFT", icon: ImageIcon, color: "text-pink-400", bg: "bg-pink-400/15" },
  { name: "Diamond", icon: Diamond, color: "text-sky-300", bg: "bg-sky-300/15" },
  { name: "Jackpot", icon: Sparkles, color: "text-yellow-300", bg: "bg-yellow-300/15" },
] as const;

// ── Single spinning reel column ─────────────────────────────────
function SlotReel({ spinning, delay, stopped }: { spinning: boolean; delay: number; stopped: boolean }) {
  const [visibleIdx, setVisibleIdx] = useState(0);

  useEffect(() => {
    if (!spinning) return;
    let frame: number;
    let speed = 60;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      // Speed up quickly then slow down when stopping
      if (stopped && elapsed > delay) {
        speed = Math.min(speed + 15, 400);
      } else {
        speed = 60 + Math.sin(elapsed / 200) * 10;
      }
      setVisibleIdx((prev) => (prev + 1) % SLOT_SYMBOLS.length);
      if (stopped && speed >= 400) return; // fully stopped
      frame = window.setTimeout(tick, speed);
    };

    const startDelay = window.setTimeout(() => {
      tick();
    }, delay * 0.3);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(frame);
    };
  }, [spinning, delay, stopped]);

  const sym = SLOT_SYMBOLS[visibleIdx];
  const Icon = sym.icon;

  return (
    <div className={cn(
      "flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 transition-all duration-200",
      spinning
        ? "border-primary/40 bg-primary/5 scale-105"
        : "border-border bg-card",
      stopped && !spinning && "border-primary/20",
    )}>
      <div className={cn("rounded-lg p-2", sym.bg)}>
        <Icon className={cn("h-6 w-6 transition-transform", sym.color, spinning && "scale-110")} />
      </div>
      <span className={cn(
        "mt-1 text-[9px] font-bold uppercase tracking-wider transition-opacity",
        sym.color,
        spinning ? "opacity-0" : "opacity-100",
      )}>
        {sym.name}
      </span>
    </div>
  );
}

// ── 3-reel slot machine visual ──────────────────────────────────
function SlotReels({ spinning, stopping }: { spinning: boolean; stopping: boolean }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <SlotReel spinning={spinning} delay={0} stopped={stopping} />
      <SlotReel spinning={spinning} delay={300} stopped={stopping} />
      <SlotReel spinning={spinning} delay={600} stopped={stopping} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export function SlotMachineAction() {
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
  const [machines, setMachines] = useState<SlotMachineTable[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<number>(-1);
  const [spinCount, setSpinCount] = useState<number>(1);
  const [amountPerSpin, setAmountPerSpin] = useState<string>("");
  const [result, setResult] = useState<FinishedBetResult | null>(null);

  const currentMachine = machines.find((m) => m.id === selectedMachine);

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

  // ── Pending-bet status from contract ─────────────────────────
  const { data: userBetInfoRaw, refetch: refetchBetInfo } = useReadContract({
    address: addresses.slotMachine,
    abi: SLOT_MACHINE_CONTRACT_ABI,
    functionName: "getUserBetInfo",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address, refetchInterval: 5_000 },
  });

  // ── Fetch slot machines ──────────────────────────────────────
  const fetchMachines = useCallback(async () => {
    if (!publicClient) return;
    setMachinesLoading(true);
    try {
      const raw = await publicClient.readContract({
        address: addresses.slotMachine,
        abi: SLOT_MACHINE_CONTRACT_ABI,
        functionName: "getSlotMachines",
      });
      const list = raw as Array<{
        id: number;
        isOpened: boolean;
        maxBet: bigint;
        minBet: bigint;
      }>;
      const all = list.map((t, idx) => ({
        id: Number(t.id) || idx,
        isOpened: t.isOpened,
        minBet: t.minBet,
        maxBet: t.maxBet,
      }));
      setMachines(all);
    } catch (e) {
      console.error("[v0] Failed to fetch slot machines:", e);
    } finally {
      setMachinesLoading(false);
    }
  }, [publicClient, addresses.slotMachine]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // Auto-select machine based on player cityId
  useEffect(() => {
    if (machines.length === 0) return;
    if (cityId !== undefined) {
      const match = machines.find((m) => m.id === cityId);
      if (match) setSelectedMachine(match.id);
      else setSelectedMachine(machines[0].id);
    } else if (selectedMachine === -1) {
      setSelectedMachine(machines[0].id);
    }
  }, [machines, cityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Detect pending bets on mount ───────────────────────────────
  useEffect(() => {
    if (!userBetInfoRaw) return;
    const infos = userBetInfoRaw as Array<{
      isPending: boolean;
      spinCount: number;
      amountPerSpin: bigint;
      requestId: bigint;
    }>;
    for (let i = 0; i < infos.length; i++) {
      if (infos[i]?.isPending) {
        setSelectedMachine(i);
        setPhase("pending");
        return;
      }
    }
  }, [userBetInfoRaw]);

  // ── After bet tx confirms -> move to pending ──────────────────
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

  // ── After approve tx confirms ────────────���───────────────────
  const approveToastFired = useRef(false);
  useEffect(() => {
    if (approveSuccess && approveHash && !approveToastFired.current) {
      approveToastFired.current = true;
      toast.success("Cash spend approved for Slot Machine contract");
    }
    if (!approveHash) approveToastFired.current = false;
  }, [approveSuccess, approveHash]);

  // ── After finish tx confirms -> parse result ──────────────────
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
              abi: SLOT_MACHINE_CONTRACT_ABI,
              data: log.data,
              topics: (log as Log).topics,
              strict: false,
            });
            if (decoded.eventName === "FinishedBet") {
              const args = decoded.args as unknown as {
                slotMachineId: number;
                betId: bigint;
                nonce: bigint;
                spinCount: number;
                amountPerSpin: bigint;
                totalReward: bigint;
                rewardReceived: bigint;
                feeAmount: bigint;
              };
              setResult({
                slotMachineId: Number(args.slotMachineId),
                betId: args.betId as bigint,
                nonce: args.nonce as bigint,
                spinCount: Number(args.spinCount),
                amountPerSpin: args.amountPerSpin as bigint,
                totalReward: args.totalReward as bigint,
                rewardReceived: args.rewardReceived as bigint,
                feeAmount: args.feeAmount as bigint,
              });
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

  const totalCost = spinCount * Number(amountPerSpin || 0);
  const betValid = spinCount >= 1 && spinCount <= 10 && Number(amountPerSpin) > 0;

  const isPlacing = betPending || betConfirming;
  const isSpinning = finishPending || finishConfirming;
  const approveLoading = approvePending || approveConfirming;

  // ── Handlers ──────────────────────────────────────────────────
  const handleApprove = () => {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.slotMachine, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const handlePlaceBet = async () => {
    if (!authData) {
      requestSignature();
      return;
    }
    if (!betValid) return;

    resetBet();
    setPhase("placing");

    writeBet({
      address: addresses.slotMachine,
      abi: SLOT_MACHINE_CONTRACT_ABI,
      functionName: "initializeBet",
      args: [
        selectedMachine,
        spinCount,
        parseUnits(amountPerSpin, 18),
        authData.message,
        authData.signature,
      ],
    });
  };

  const handleFinishBet = () => {
    resetFinish();
    setPhase("spinning");
    writeFinish({
      address: addresses.slotMachine,
      abi: SLOT_MACHINE_CONTRACT_ABI,
      functionName: "finishBet",
      args: [selectedMachine],
    });
  };

  const handleReset = () => {
    setPhase("idle");
    setResult(null);
    resetBet();
    resetFinish();
    betToastFired.current = false;
    finishToastFired.current = false;
    refetchBetInfo();
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Machine info (auto-selected by city) ────────────────── */}
      {selectedMachine >= 0 && currentMachine && phase !== "result" && (
        <div className="mb-4">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2.5",
              currentMachine.isOpened
                ? "border-primary/20 bg-primary/5"
                : "border-amber-400/20 bg-amber-400/5",
            )}
          >
            <Cherry
              className={cn(
                "h-4 w-4",
                currentMachine.isOpened ? "text-primary" : "text-amber-400",
              )}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {cityName ?? "Loading..."} Slot Machine
                <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                  (#{selectedMachine})
                </span>
                {!currentMachine.isOpened && (
                  <span className="ml-1.5 text-xs font-medium text-amber-400">
                    - Closed
                  </span>
                )}
              </p>
              {currentMachine.isOpened && (
                <p className="mt-0.5 flex gap-3 text-[10px] text-muted-foreground font-mono">
                  <span>
                    Min:{" "}
                    {Number(
                      formatUnits(currentMachine.minBet, 18),
                    ).toLocaleString()}{" "}
                    cash
                  </span>
                  <span>
                    Max:{" "}
                    {Number(
                      formatUnits(currentMachine.maxBet, 18),
                    ).toLocaleString()}{" "}
                    cash
                  </span>
                </p>
              )}
            </div>
          </div>
          {!currentMachine.isOpened && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <p className="text-[10px] text-amber-400">
                The slot machine in {cityName} is currently closed. You may need
                to travel to a city with an active machine.
              </p>
            </div>
          )}
        </div>
      )}

      {machines.length === 0 && !machinesLoading && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-muted-foreground">
            No slot machines found on this chain.
          </span>
        </div>
      )}

      {/* ═══════════ Approve Cash Spend Card ══════════════════════ */}
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
                Allow the Slot Machine contract to spend your in-game cash
              </p>
            </div>
          </div>

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
                Slot Machine Contract
              </span>
            </div>
          </div>

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

      {/* ═══════════ IDLE: Bet Form ═══════════════════════════════ */}
      {phase === "idle" && (
        <div className="rounded-xl border border-border bg-card p-6 overflow-hidden">
          {/* Visual slot machine header */}
          <div className="mb-5 flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <Cherry className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                Slot Machine
              </span>
              <Cherry className="h-4 w-4 text-primary" />
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>

            {/* Preview reels */}
            <div className="rounded-2xl border border-border bg-background/50 p-3">
              <div className="flex items-center gap-2">
                {[SLOT_SYMBOLS[3], SLOT_SYMBOLS[6], SLOT_SYMBOLS[10]].map((sym, i) => {
                  const Icon = sym.icon;
                  return (
                    <div key={i} className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border border-border bg-card">
                      <div className={cn("rounded-md p-1.5", sym.bg)}>
                        <Icon className={cn("h-4 w-4", sym.color)} />
                      </div>
                      <span className={cn("mt-0.5 text-[7px] font-bold uppercase", sym.color)}>
                        {sym.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Choose your spin count and wager
            </p>
          </div>

          {/* Spin count */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Spin Count (1-10)
            </label>
            <div className="flex items-center gap-2">
              {[1, 3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setSpinCount(n)}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-medium transition-all",
                    spinCount === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {n}x
                </button>
              ))}
            </div>
            {/* Custom input for other values */}
            <input
              type="number"
              min={1}
              max={10}
              value={spinCount}
              onChange={(e) => {
                const v = Math.min(10, Math.max(1, Number(e.target.value)));
                setSpinCount(v);
              }}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              placeholder="Custom (1-10)"
            />
          </div>

          {/* Amount per spin */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Amount per Spin (Cash)
            </label>
            <input
              type="number"
              min={0}
              value={amountPerSpin}
              onChange={(e) => setAmountPerSpin(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
              placeholder="Enter amount per spin"
            />
          </div>

          {/* Cost summary */}
          {totalCost > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg bg-background/50 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Total Cost</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {totalCost.toLocaleString()} cash
              </span>
            </div>
          )}

          {/* Errors */}
          {(betError || finishError) && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="line-clamp-2 text-[10px] text-red-400">
                {((betError || finishError) as Error).message?.includes(
                  "User rejected",
                )
                  ? "Transaction rejected by user"
                  : ((betError || finishError) as Error).message?.split(
                    "\n",
                  )[0]}
              </p>
            </div>
          )}

          {/* Place Bet button */}
          <button
            onClick={handlePlaceBet}
            disabled={
              !isConnected ||
              isPlacing ||
              !betValid ||
              !currentMachine?.isOpened
            }
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              isConnected && betValid && currentMachine?.isOpened
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
                <Cherry className="h-4 w-4" />
                {isConnected
                  ? authData
                    ? `Spin ${spinCount}x`
                    : "Sign & Spin"
                  : "Connect Wallet"}
              </>
            )}
          </button>
        </div>
      )}

      {/* ═══════════ PLACING ═════════════════════════════════════ */}
      {phase === "placing" && (
        <div className="rounded-xl border border-primary/30 bg-card p-6 overflow-hidden">
          <div className="flex flex-col items-center">
            {/* Decorative top bar */}
            <div className="mb-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <Cherry className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                Slot Machine
              </span>
              <Cherry className="h-4 w-4 text-primary animate-pulse" />
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>

            {/* Reels spinning during bet placement */}
            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <SlotReels spinning={true} stopping={false} />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                {betPending
                  ? "Confirm in your wallet..."
                  : "Placing bet on chain..."}
              </p>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              The reels are warming up
            </p>
          </div>
        </div>
      )}

      {/* ═══════════ PENDING: Finish Bet ════════════════════════ */}
      {phase === "pending" && (
        <div className="rounded-xl border border-primary/30 bg-card p-6 overflow-hidden">
          <div className="flex flex-col items-center">
            {/* Header */}
            <div className="mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <Cherry className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                Slot Machine
              </span>
              <Cherry className="h-4 w-4 text-primary" />
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>

            {/* Idle reels waiting to spin */}
            <div className="my-4 rounded-2xl border border-primary/20 bg-background/50 p-4">
              <SlotReels spinning={false} stopping={false} />
            </div>

            {/* Status badge */}
            <div className="mb-4 flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">
                Bet Locked In - VRF Seed Ready
              </span>
            </div>

            {betHash && (
              <div className="mb-3 w-full rounded-lg bg-background/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Bet Tx</span>
                  <a
                    href={`${explorer}/tx/${betHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-primary underline decoration-primary/30 hover:decoration-primary"
                  >
                    {betHash.slice(0, 10)}...{betHash.slice(-8)}
                  </a>
                </div>
              </div>
            )}

            {finishError && (
              <div className="mb-3 w-full flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="line-clamp-2 text-[10px] text-red-400">
                  {finishError.message?.includes("User rejected")
                    ? "Transaction rejected by user"
                    : finishError.message?.split("\n")[0]}
                </p>
              </div>
            )}

            {/* Spin button */}
            <button
              onClick={handleFinishBet}
              disabled={isSpinning}
              className={cn(
                "relative w-full overflow-hidden rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wider transition-all duration-200",
                "bg-primary text-primary-foreground",
                "hover:brightness-110 active:scale-[0.98] disabled:opacity-50",
                "shadow-[0_0_20px_rgba(var(--primary),0.3)]",
              )}
            >
              {isSpinning ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {finishPending ? "Confirm in wallet..." : "Spinning..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Cherry className="h-5 w-5" />
                  Pull the Lever
                  <Cherry className="h-5 w-5" />
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ SPINNING ═══════════════════════════════════ */}
      {phase === "spinning" && (
        <div className="rounded-xl border border-primary/40 bg-card p-6 overflow-hidden">
          <div className="flex flex-col items-center">
            {/* Header */}
            <div className="mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <Cherry className="h-4 w-4 text-primary animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">
                Spinning
              </span>
              <Cherry className="h-4 w-4 text-primary animate-spin" />
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>

            {/* Reels actively spinning */}
            <div className="my-4 rounded-2xl border-2 border-primary/30 bg-background/80 p-5 shadow-[0_0_30px_rgba(var(--primary),0.15)]">
              <SlotReels spinning={true} stopping={!finishPending} />
            </div>

            {/* Animated dots */}
            <div className="flex items-center gap-1.5 mb-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>

            <p className="text-sm font-semibold text-foreground">
              {finishPending
                ? "Confirm in your wallet..."
                : "Revealing your fortune..."}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              On-chain VRF generating result
            </p>
          </div>
        </div>
      )}

      {/* ═══════════ RESULT ═════════════════════════════════════ */}
      {phase === "result" && (
        <div className={cn(
          "rounded-xl border bg-card p-6 overflow-hidden",
          result && result.totalReward > BigInt(0)
            ? "border-emerald-400/30"
            : "border-red-400/20",
        )}>
          {/* Result header with icon fanfare */}
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <Cherry className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                Result
              </span>
              <Cherry className="h-4 w-4 text-primary" />
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>

            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl",
                result && result.totalReward > BigInt(0)
                  ? "bg-emerald-400/10"
                  : "bg-red-400/10",
              )}
            >
              <Trophy
                className={cn(
                  "h-8 w-8",
                  result && result.totalReward > BigInt(0)
                    ? "text-emerald-400"
                    : "text-red-400",
                )}
              />
            </div>
            <h3
              className={cn(
                "mt-2 text-lg font-bold",
                result && result.totalReward > BigInt(0)
                  ? "text-emerald-400"
                  : "text-red-400",
              )}
            >
              {result && result.totalReward > BigInt(0)
                ? "Winner!"
                : "Better luck next time!"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {result
                ? `${result.spinCount} spin${result.spinCount > 1 ? "s" : ""} at ${Number(formatUnits(result.amountPerSpin, 18)).toLocaleString()} cash each`
                : "Spin complete"}
            </p>
          </div>

          {result && (
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Total Wagered
                </span>
                <span className="font-mono text-sm text-foreground">
                  {Number(
                    formatUnits(
                      result.amountPerSpin * BigInt(result.spinCount),
                      18,
                    ),
                  ).toLocaleString()}{" "}
                  cash
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Total Reward
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-semibold",
                    result.totalReward > BigInt(0)
                      ? "text-emerald-400"
                      : "text-red-400",
                  )}
                >
                  {Number(
                    formatUnits(result.totalReward, 18),
                  ).toLocaleString()}{" "}
                  cash
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Reward Received
                </span>
                <span className="font-mono text-sm text-foreground">
                  {Number(
                    formatUnits(result.rewardReceived, 18),
                  ).toLocaleString()}{" "}
                  cash
                </span>
              </div>
              {result.feeAmount > BigInt(0) && (
                <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Fee</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {Number(
                      formatUnits(result.feeAmount, 18),
                    ).toLocaleString()}{" "}
                    cash
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Net Profit / Loss
                </span>
                {(() => {
                  const wagered =
                    result.amountPerSpin * BigInt(result.spinCount);
                  const net = result.rewardReceived - wagered;
                  const isProfit = net >= BigInt(0);
                  return (
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold",
                        isProfit ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      {isProfit ? "+" : ""}
                      {Number(formatUnits(net, 18)).toLocaleString()} cash
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

          {finishHash && (
            <div className="mb-4 rounded-lg bg-background/50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Spin Tx</span>
                <a
                  href={`${explorer}/tx/${finishHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-primary underline decoration-primary/30 hover:decoration-primary"
                >
                  {finishHash.slice(0, 10)}...{finishHash.slice(-8)}
                </a>
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            Spin Again
          </button>
        </div>
      )}
    </div>
  );
}
