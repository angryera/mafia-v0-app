"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  formatEther,
  formatUnits,
  maxUint256,
  zeroAddress,
} from "viem";
import { INGAME_CURRENCY_ABI, LOTTERY_HALL_ABI } from "@/lib/contract";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  UserRound,
  Ticket,
  Timer,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "@/types/mafia-globals";

const REFETCH_MS = 10_000;
const HISTORY_PAGE_SIZE = 20;
const PARTICIPANTS_PAGE_SIZE = BigInt(200);

export const LOTTERY_TICKET_PRICE_CASH = 5000;
const WEI_PER_CASH = BigInt("1000000000000000000"); // 10^18
const LOTTERY_TICKET_PRICE_WEI = BigInt(LOTTERY_TICKET_PRICE_CASH) * WEI_PER_CASH;

type RoundTuple = {
  startTime: bigint;
  endTime: bigint;
  totalEntries: bigint;
  winner: `0x${string}`;
  ended: boolean;
};

function parseRound(raw: unknown): RoundTuple | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return {
      startTime: BigInt(raw[0] ?? 0),
      endTime: BigInt(raw[1] ?? 0),
      totalEntries: BigInt(raw[2] ?? 0),
      winner: (raw[3] ?? zeroAddress) as `0x${string}`,
      ended: Boolean(raw[4]),
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    startTime: BigInt((o.startTime as bigint | string | number) ?? 0),
    endTime: BigInt((o.endTime as bigint | string | number) ?? 0),
    totalEntries: BigInt((o.totalEntries as bigint | string | number) ?? 0),
    winner: (o.winner ?? zeroAddress) as `0x${string}`,
    ended: Boolean(o.ended),
  };
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0:00:00";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (seconds >= 86400) {
    return `${d}:${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function addressHue(addr: string): string {
  const h =
    parseInt(addr.slice(2, 10), 16) % 360;
  return `hsl(${h} 65% 42%)`;
}

type LotteryHallProfileBoardProps = {
  ownerAddress: `0x${string}`;
  ownerDisplayName: string | null;
  namesLoading: boolean;
  viewerAddress: `0x${string}` | undefined;
  explorer: string;
  ownerTotalProfitWei: bigint | undefined;
};

function LotteryHallProfileBoard({
  ownerAddress,
  ownerDisplayName,
  namesLoading,
  viewerAddress,
  explorer,
  ownerTotalProfitWei,
}: LotteryHallProfileBoardProps) {
  const isMissing = ownerAddress === zeroAddress;

  const profitLabel =
    ownerTotalProfitWei !== undefined
      ? Number(formatUnits(ownerTotalProfitWei, 18)).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
      : null;

  return (
    <div className="mb-5 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <UserRound className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Lottery owner</h3>
      </div>

      {isMissing ? (
        <p className="text-xs text-muted-foreground">
          No lottery owner resolved (inventory item may be unset on-chain).
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="inline-block h-10 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: addressHue(ownerAddress) }}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {ownerDisplayName ? (
                  <Link
                    href={
                      viewerAddress &&
                        ownerAddress.toLowerCase() === viewerAddress.toLowerCase()
                        ? "/my-profile"
                        : "/players"
                    }
                    className="truncate font-medium text-primary hover:underline"
                  >
                    {ownerDisplayName}
                  </Link>
                ) : namesLoading ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading name…
                  </span>
                ) : (
                  <a
                    href={`${explorer}/address/${ownerAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-sm text-muted-foreground hover:text-primary"
                  >
                    {`${ownerAddress.slice(0, 6)}…${ownerAddress.slice(-4)}`}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </a>
                )}
              </div>
              {ownerDisplayName && (
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                  {ownerAddress}
                </p>
              )}
            </div>
          </div>

          <div
            className={cn(
              "rounded-lg border px-3 py-2 sm:text-right",
              "border-primary/20 bg-primary/5",
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Owner total profit
            </p>
            <p className="font-mono text-base font-semibold tabular-nums text-foreground">
              {profitLabel !== null ? profitLabel : "—"}{" "}
              <span className="text-xs font-normal text-muted-foreground">cash</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Wagmi may decode multi-return as `{ list, amounts }` or tuple `[list, amounts]`. */
function parseParticipantsPack(raw: unknown): { addr: `0x${string}`; amount: bigint }[] {
  if (raw == null) return [];
  if (Array.isArray(raw) && raw.length >= 2) {
    const list = raw[0] as readonly `0x${string}`[];
    const amounts = raw[1] as readonly (bigint | string)[];
    if (!Array.isArray(list)) return [];
    return list.map((addr, i) => ({
      addr,
      amount: BigInt(amounts[i] ?? 0),
    }));
  }
  if (typeof raw === "object" && raw !== null) {
    const o = raw as { list?: unknown; amounts?: unknown };
    const list = Array.isArray(o.list) ? (o.list as `0x${string}`[]) : [];
    const amounts = Array.isArray(o.amounts) ? o.amounts : [];
    return list.map((addr, i) => ({
      addr,
      amount: BigInt((amounts[i] as bigint | string | number | undefined) ?? 0),
    }));
  }
  return [];
}

type RoundFinishInfo = {
  roundId: bigint;
  winner: `0x${string}`;
  totalPrize: bigint;
  ownerFee: bigint;
  isOwnerWithdraw: boolean;
};

export function LotteryHallAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { chainConfig } = useChain();
  const publicClient = usePublicClient();
  const { authData } = useAuth();

  const lotteryHall = addresses.lotteryHall;
  const configured = lotteryHall !== zeroAddress;

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [ticketCountInput, setTicketCountInput] = useState("");
  const [finishInfos, setFinishInfos] = useState<RoundFinishInfo[]>([]);
  const [historyNextStartIndex, setHistoryNextStartIndex] = useState<bigint | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [nameByAddr, setNameByAddr] = useState<Record<string, string>>({});
  const [profileScriptLoaded, setProfileScriptLoaded] = useState(false);
  const [profileNamesLoading, setProfileNamesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");

  const enterAfterApproveRef = useRef<bigint | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.MafiaProfile) {
      const script = document.createElement("script");
      script.src = "/js/mafia-utils.js";
      script.async = true;
      script.onload = () => setProfileScriptLoaded(Boolean(window.MafiaProfile));
      script.onerror = () => setProfileScriptLoaded(false);
      document.body.appendChild(script);
    } else {
      setProfileScriptLoaded(true);
    }
  }, []);

  const { data: currentRoundIdRaw, refetch: refetchRoundId } = useReadContract({
    address: lotteryHall,
    abi: LOTTERY_HALL_ABI,
    functionName: "currentRoundId",
    query: { enabled: configured, refetchInterval: REFETCH_MS },
  });

  const currentRoundId = currentRoundIdRaw
    ? BigInt(currentRoundIdRaw as bigint)
    : BigInt(0);

  const { data: roundRaw, refetch: refetchRound } = useReadContract({
    address: lotteryHall,
    abi: LOTTERY_HALL_ABI,
    functionName: "rounds",
    args: currentRoundId > BigInt(0) ? [currentRoundId] : undefined,
    query: { enabled: configured && currentRoundId > BigInt(0), refetchInterval: REFETCH_MS },
  });

  const round = useMemo(() => parseRound(roundRaw), [roundRaw]);

  const { data: prizeRaw, refetch: refetchPrize } = useReadContract({
    address: lotteryHall,
    abi: LOTTERY_HALL_ABI,
    functionName: "getCurrentPrize",
    query: { enabled: configured, refetchInterval: REFETCH_MS },
  });

  const { data: partCountRaw, refetch: refetchPartCount } = useReadContract({
    address: lotteryHall,
    abi: LOTTERY_HALL_ABI,
    functionName: "getParticipantsCount",
    args: currentRoundId > BigInt(0) ? [currentRoundId] : undefined,
    query: { enabled: configured && currentRoundId > BigInt(0), refetchInterval: REFETCH_MS },
  });

  const participantCount = partCountRaw != null ? BigInt(partCountRaw as bigint) : BigInt(0);
  const participantsFetchLength =
    participantCount > PARTICIPANTS_PAGE_SIZE ? PARTICIPANTS_PAGE_SIZE : participantCount;

  const {
    data: participantsPack,
    refetch: refetchParticipants,
    isPending: participantsQueryPending,
  } = useReadContract({
    address: lotteryHall,
    abi: LOTTERY_HALL_ABI,
    functionName: "getParticipants",
    args:
      configured && currentRoundId > BigInt(0) && participantCount > BigInt(0)
        ? [currentRoundId, BigInt(0), participantsFetchLength]
        : undefined,
    query: {
      enabled: configured && currentRoundId > BigInt(0) && participantCount > BigInt(0),
      refetchInterval: REFETCH_MS,
    },
  });

  const { data: ownerFeePctRaw } = useReadContract({
    address: lotteryHall,
    abi: LOTTERY_HALL_ABI,
    functionName: "ownerFeePercent",
    query: { enabled: configured, refetchInterval: REFETCH_MS },
  });

  const { data: lotteryOwnerRaw, refetch: refetchLotteryOwner } = useReadContract({
    address: lotteryHall,
    abi: LOTTERY_HALL_ABI,
    functionName: "lotteryOwner",
    query: { enabled: configured, refetchInterval: REFETCH_MS },
  });

  console.log(configured, lotteryOwnerRaw);

  const { data: ownerTotalProfitRaw, refetch: refetchOwnerTotalProfit } = useReadContract({
    address: lotteryHall,
    abi: LOTTERY_HALL_ABI,
    functionName: "ownerTotalProfit",
    query: { enabled: configured, refetchInterval: REFETCH_MS },
  });

  const lotteryOwner = (lotteryOwnerRaw ?? zeroAddress) as `0x${string}`;
  const ownerTotalProfitWei =
    ownerTotalProfitRaw != null ? BigInt(ownerTotalProfitRaw as bigint) : undefined;
  const isLotteryOwner =
    !!address &&
    lotteryOwner !== zeroAddress &&
    address.toLowerCase() === lotteryOwner.toLowerCase();

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowances",
    args:
      address && configured
        ? [address, lotteryHall]
        : undefined,
    query: { enabled: !!address && configured && isConnected, refetchInterval: REFETCH_MS },
  });

  const allowance = allowanceRaw != null ? BigInt(allowanceRaw as bigint) : undefined;

  const { data: cashBalRaw } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address && configured
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address && configured && isConnected },
  });

  const cashBalance =
    cashBalRaw != null ? BigInt(cashBalRaw as bigint) : undefined;

  const participants = useMemo(
    () => parseParticipantsPack(participantsPack),
    [participantsPack],
  );

  const profileLookupKey = useMemo(() => {
    const addrs = new Set<string>();
    participants.forEach((p) => addrs.add(p.addr.toLowerCase()));
    finishInfos.forEach((f) => addrs.add(f.winner.toLowerCase()));
    if (lotteryOwner !== zeroAddress) addrs.add(lotteryOwner.toLowerCase());
    return [...addrs].sort().join(",");
  }, [participants, finishInfos, lotteryOwner]);

  useEffect(() => {
    if (!profileLookupKey) {
      setNameByAddr({});
      setProfileNamesLoading(false);
      return;
    }
    const mafiaProfile = window.MafiaProfile;
    if (!profileScriptLoaded || !mafiaProfile) return;

    let cancelled = false;
    setProfileNamesLoading(true);
    (async () => {
      try {
        const users = await mafiaProfile.getUsersInfo({
          chain: chainConfig.id,
        });
        if (cancelled) return;
        const want = new Set(profileLookupKey.split(",").filter(Boolean));
        const next: Record<string, string> = {};
        for (const u of users) {
          const row = u as { user?: string; name?: string };
          const raw = row.user;
          if (!raw) continue;
          const key = raw.toLowerCase();
          if (!want.has(key)) continue;
          const name = row.name?.trim();
          if (name) next[key] = name;
        }
        setNameByAddr(next);
      } catch (e) {
        console.error("Lottery hall: MafiaProfile.getUsersInfo failed", e);
        if (!cancelled) setNameByAddr({});
      } finally {
        if (!cancelled) setProfileNamesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileScriptLoaded, chainConfig.id, profileLookupKey]);

  const loadMoreHistory = useCallback(async () => {
    if (!publicClient || !configured) return;
    const startIndex = historyNextStartIndex;
    if (startIndex === null) return;
    if (startIndex <= BigInt(0)) return;

    setHistoryLoading(true);
    try {
      const raw = (await publicClient.readContract({
        address: lotteryHall,
        abi: LOTTERY_HALL_ABI,
        functionName: "getRoundFinishInfos",
        args: [startIndex, BigInt(HISTORY_PAGE_SIZE)],
      })) as unknown;

      const list = Array.isArray(raw) ? (raw as any[]) : [];
      const parsed: RoundFinishInfo[] = list
        .map((x) => {
          const o = x as any;
          return {
            roundId: BigInt(o.roundId ?? o[0] ?? 0),
            winner: (o.winner ?? o[1] ?? zeroAddress) as `0x${string}`,
            totalPrize: BigInt(o.totalPrize ?? o[2] ?? 0),
            ownerFee: BigInt(o.ownerFee ?? o[3] ?? 0),
            isOwnerWithdraw: Boolean(o.isOwnerWithdraw ?? o[4]),
          } satisfies RoundFinishInfo;
        })
        .filter((x) => x.roundId > BigInt(0));

      setFinishInfos((prev) => [...prev, ...parsed]);

      // pagination goes backwards (older rounds) by lowering startIndex
      if (startIndex <= BigInt(1)) {
        setHistoryNextStartIndex(null);
      } else {
        const nextOlder =
          startIndex > BigInt(HISTORY_PAGE_SIZE)
            ? startIndex - BigInt(HISTORY_PAGE_SIZE)
            : BigInt(1);
        setHistoryNextStartIndex(nextOlder);
      }
    } catch (e) {
      console.error("Lottery hall: getRoundFinishInfos failed", e);
      // keep existing list
    } finally {
      setHistoryLoading(false);
    }
  }, [publicClient, configured, historyNextStartIndex, lotteryHall, currentRoundId]);

  const resetAndLoadHistory = useCallback(() => {
    if (!configured) return;
    if (currentRoundId <= BigInt(1)) {
      setFinishInfos([]);
      setHistoryNextStartIndex(null);
      return;
    }
    const start =
      currentRoundId > BigInt(HISTORY_PAGE_SIZE)
        ? currentRoundId - BigInt(HISTORY_PAGE_SIZE)
        : BigInt(1);
    setFinishInfos([]);
    setHistoryNextStartIndex(start);
  }, [configured, currentRoundId]);

  useEffect(() => {
    resetAndLoadHistory();
  }, [resetAndLoadHistory]);

  useEffect(() => {
    // auto-load first page after reset
    if (historyNextStartIndex === null) return;
    if (finishInfos.length > 0) return;
    void loadMoreHistory();
  }, [historyNextStartIndex, finishInfos.length, loadMoreHistory]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchRoundId(),
      refetchRound(),
      refetchPrize(),
      refetchPartCount(),
      refetchParticipants(),
      refetchLotteryOwner(),
      refetchOwnerTotalProfit(),
      refetchAllowance(),
    ]);
  }, [
    refetchRoundId,
    refetchRound,
    refetchPrize,
    refetchPartCount,
    refetchParticipants,
    refetchLotteryOwner,
    refetchOwnerTotalProfit,
    refetchAllowance,
  ]);

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const {
    writeContract: writeEnter,
    data: enterHash,
    isPending: enterPending,
    error: enterError,
    reset: resetEnter,
  } = useChainWriteContract();
  const { isLoading: enterConfirming, isSuccess: enterSuccess } =
    useWaitForTransactionReceipt({ hash: enterHash });

  const {
    writeContract: writeDraw,
    data: drawHash,
    isPending: drawPending,
    reset: resetDraw,
  } = useChainWriteContract();
  const { isLoading: drawConfirming, isSuccess: drawSuccess } =
    useWaitForTransactionReceipt({ hash: drawHash });

  const {
    writeContract: writeOwnerWithdraw,
    data: ownerHash,
    isPending: ownerPending,
    reset: resetOwner,
  } = useChainWriteContract();
  const { isLoading: ownerConfirming, isSuccess: ownerSuccess } =
    useWaitForTransactionReceipt({ hash: ownerHash });

  const approveLoading = approvePending || approveConfirming;
  const enterLoading = enterPending || enterConfirming;
  const drawLoading = drawPending || drawConfirming;
  const ownerWithdrawLoading = ownerPending || ownerConfirming;

  useEffect(() => {
    if (approveError) enterAfterApproveRef.current = null;
  }, [approveError]);

  useEffect(() => {
    if (!approveSuccess || !approveHash) return;
    const wei = enterAfterApproveRef.current;
    if (wei === null) return;
    enterAfterApproveRef.current = null;
    resetEnter();
    writeEnter({
      address: lotteryHall,
      abi: LOTTERY_HALL_ABI,
      functionName: "enter",
      args: [wei],
    });
  }, [
    approveSuccess,
    approveHash,
    writeEnter,
    lotteryHall,
    resetEnter,
  ]);

  const handleEnter = () => {
    if (!configured) return;
    const raw = ticketCountInput.trim();
    if (!raw) return;
    if (!/^[0-9]+$/.test(raw)) {
      toast.error("Enter a whole number of tickets");
      return;
    }
    const tickets = BigInt(raw);
    if (tickets <= BigInt(0)) {
      toast.error("Enter at least 1 ticket");
      return;
    }
    const requiredCashWei = tickets * LOTTERY_TICKET_PRICE_WEI;
    if (allowance === undefined) {
      toast.error("Allowance not loaded yet");
      return;
    }
    if (cashBalance !== undefined && requiredCashWei > cashBalance) {
      toast.error("Insufficient in-game cash");
      return;
    }
    resetApprove();
    resetEnter();
    if (allowance < requiredCashWei) {
      enterAfterApproveRef.current = requiredCashWei;
      writeApprove({
        address: addresses.ingameCurrency,
        abi: INGAME_CURRENCY_ABI,
        functionName: "approveInGameCurrency",
        args: [lotteryHall, maxUint256],
      });
    } else {
      enterAfterApproveRef.current = null;
      writeEnter({
        address: lotteryHall,
        abi: LOTTERY_HALL_ABI,
        functionName: "enter",
        args: [requiredCashWei],
      });
    }
  };

  const handleDrawWinner = () => {
    if (!configured) return;
    resetDraw();
    writeDraw({
      address: lotteryHall,
      abi: LOTTERY_HALL_ABI,
      functionName: "drawWinner",
    });
  };

  const handleOwnerWithdraw = () => {
    if (!configured) return;
    resetOwner();
    writeOwnerWithdraw({
      address: lotteryHall,
      abi: LOTTERY_HALL_ABI,
      functionName: "ownerWithdraw",
    });
  };

  const enterToastRef = useRef(false);
  useEffect(() => {
    if (enterSuccess && enterHash && !enterToastRef.current) {
      enterToastRef.current = true;
      toast.success("Entered the lottery round");
      void refetchAll();
      setTicketCountInput("");
    }
    if (!enterHash) enterToastRef.current = false;
  }, [enterSuccess, enterHash, refetchAll]);

  const drawToastRef = useRef(false);
  useEffect(() => {
    if (drawSuccess && drawHash && !drawToastRef.current) {
      drawToastRef.current = true;
      toast.success("Winner drawn — new round started");
      void refetchAll().then(() => resetAndLoadHistory());
    }
    if (!drawHash) drawToastRef.current = false;
  }, [drawSuccess, drawHash, refetchAll, resetAndLoadHistory]);

  const ownerToastRef = useRef(false);
  useEffect(() => {
    if (ownerSuccess && ownerHash && !ownerToastRef.current) {
      ownerToastRef.current = true;
      toast.success("Owner withdraw complete");
      void refetchAll().then(() => resetAndLoadHistory());
    }
    if (!ownerHash) ownerToastRef.current = false;
  }, [ownerSuccess, ownerHash, refetchAll, resetAndLoadHistory]);

  const poolWei = prizeRaw != null ? BigInt(prizeRaw as bigint) : BigInt(0);
  const ownerFeePct =
    ownerFeePctRaw != null ? Number(ownerFeePctRaw) : null;

  const waitingForTimer =
    !!round && !round.ended && round.endTime === BigInt(0);
  const timerRunning =
    !!round && !round.ended && round.endTime > BigInt(0) && now < Number(round.endTime);
  const canDraw =
    !!round &&
    !round.ended &&
    round.endTime > BigInt(0) &&
    now >= Number(round.endTime);
  const canEnterRound =
    !!round &&
    !round.ended &&
    (round.endTime === BigInt(0) || now < Number(round.endTime));

  const remainingSec =
    timerRunning && round ? Math.max(0, Number(round.endTime) - now) : 0;
  const countdownLabel =
    remainingSec >= 86400 ? "Time left (d:h:m)" : "Time left (h:m:s)";

  const showOwnerWithdraw =
    isLotteryOwner &&
    round &&
    !round.ended &&
    round.totalEntries > BigInt(0);

  if (!configured) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Lottery contract not configured
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Set <code className="rounded bg-secondary px-1 font-mono text-[11px]">lotteryHall</code>{" "}
              in <code className="rounded bg-secondary px-1 font-mono text-[11px]">lib/constants/address.ts</code>{" "}
              for this chain to the deployed{" "}
              <code className="rounded bg-secondary px-1 font-mono text-[11px]">MafiaLotteryHall</code>{" "}
              address, then reload.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Lottery Hall</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            On-chain rounds: enter with in-game cash, weighted random winner, optional
            inventory-owner withdraw.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetchAll()}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <LotteryHallProfileBoard
        ownerAddress={lotteryOwner}
        ownerDisplayName={
          lotteryOwner !== zeroAddress
            ? nameByAddr[lotteryOwner.toLowerCase()] ?? null
            : null
        }
        namesLoading={profileNamesLoading}
        viewerAddress={address}
        explorer={explorer}
        ownerTotalProfitWei={ownerTotalProfitWei}
      />

      {round && currentRoundId > BigInt(0) && (
        <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Round #{currentRoundId.toString()}
              </span>
            </div>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                round.ended
                  ? "border-border bg-secondary text-muted-foreground"
                  : waitingForTimer
                    ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-400"
                    : timerRunning
                      ? "border-green-400/30 bg-green-400/10 text-green-400"
                      : canDraw
                        ? "border-orange-400/30 bg-orange-400/10 text-orange-400"
                        : "border-border bg-secondary text-muted-foreground",
              )}
            >
              {round.ended
                ? "Ended"
                : waitingForTimer
                  ? participantCount === BigInt(0)
                    ? "Waiting for first entry"
                    : "Starting…"
                  : timerRunning
                    ? "Live"
                    : canDraw
                      ? "Ready to draw"
                      : "—"}
            </span>
          </div>

          <div className="mb-4 text-center">
            <p className="mb-1 text-xs text-muted-foreground">Pool (seed + entries)</p>
            <p className="font-mono text-3xl font-bold text-foreground">
              {Number(formatEther(poolWei)).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">in-game cash (wei scale)</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-center">
              <Users className="mx-auto mb-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <p className="font-mono text-sm font-semibold text-foreground">
                {participantCount.toString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Participants</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-center">
              <Wallet className="mx-auto mb-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <p className="font-mono text-sm font-semibold text-foreground">
                {cashBalance !== undefined
                  ? Number(formatEther(cashBalance)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                  : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">Your cash</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-center">
              <Timer
                className={cn(
                  "mx-auto mb-0.5 h-3.5 w-3.5",
                  timerRunning ? "text-green-400" : "text-muted-foreground",
                )}
              />
              {waitingForTimer ? (
                <p className="font-mono text-xs font-semibold text-yellow-400">
                  {participantCount === BigInt(0) ? "—" : "Starting"}
                </p>
              ) : timerRunning ? (
                <p className="font-mono text-sm font-semibold text-green-400 tabular-nums">
                  {formatCountdown(remainingSec)}
                </p>
              ) : (
                <p className="font-mono text-sm font-semibold text-muted-foreground">—</p>
              )}
              <p className="text-[10px] text-muted-foreground">
                {waitingForTimer ? "Starts after first entry" : countdownLabel}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-center">
              <Trophy className="mx-auto mb-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <p className="font-mono text-sm font-semibold text-foreground">
                {ownerFeePct !== null ? `${ownerFeePct}%` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">Owner fee</p>
            </div>
          </div>

          {round && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[10px] text-muted-foreground font-mono">
              <span>
                Total tickets:{" "}
                <span className="text-foreground">
                  {(LOTTERY_TICKET_PRICE_WEI > BigInt(0)
                    ? round.totalEntries / LOTTERY_TICKET_PRICE_WEI
                    : BigInt(0)
                  ).toString()}
                </span>
              </span>
              <span>
                Total cash entries:{" "}
                <span className="text-foreground">
                  {Number(formatUnits(round.totalEntries, 18)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </span>
            </div>
          )}

          {(canDraw || showOwnerWithdraw) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
              {canDraw && (
                <Button
                  size="sm"
                  onClick={handleDrawWinner}
                  disabled={drawLoading}
                  className="gap-1.5"
                >
                  {drawLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trophy className="h-3.5 w-3.5" />
                  )}
                  Finish round (draw winner)
                </Button>
              )}
              {showOwnerWithdraw && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleOwnerWithdraw}
                  disabled={ownerWithdrawLoading}
                  className="gap-1.5"
                >
                  {ownerWithdrawLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {ownerWithdrawLoading ? "Withdrawing…" : "Owner withdraw (entries)"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("current")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors",
            activeTab === "current"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          Current draw
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors",
            activeTab === "history"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          History
        </button>
      </div>

      {activeTab === "current" && (
        <>
          {/* Participants */}
          <div className="mb-5 overflow-x-auto rounded-lg border border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
              <p className="text-sm font-semibold text-foreground">Participants</p>
              {profileNamesLoading && (
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  Loading names…
                </span>
              )}
            </div>

            {participantCount === BigInt(0) ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No participants yet.
              </div>
            ) : participantsQueryPending && participantsPack === undefined ? (
              <div className="flex items-center gap-2 px-3 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading participants…
              </div>
            ) : participants.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Could not load participants.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-12 text-[10px] uppercase text-muted-foreground">
                      #
                    </TableHead>
                    <TableHead className="text-[10px] uppercase text-muted-foreground">
                      Player
                    </TableHead>
                    <TableHead className="text-[10px] uppercase text-muted-foreground">
                      Tickets
                    </TableHead>
                    <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">
                      Cash
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((row, idx) => {
                    const key = row.addr.toLowerCase();
                    const displayName = nameByAddr[key] ?? null;
                    const tickets = LOTTERY_TICKET_PRICE_WEI > BigInt(0)
                      ? row.amount / LOTTERY_TICKET_PRICE_WEI
                      : BigInt(0);
                    const cash = Number(formatUnits(row.amount, 18));
                    return (
                      <TableRow
                        key={`${row.addr}-${idx}`}
                        className="border-border/30 hover:bg-secondary/30"
                      >
                        <TableCell className="align-middle font-mono text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-7 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: addressHue(row.addr) }}
                              aria-hidden
                            />
                            {idx + 1}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[min(40vw,14rem)] align-middle">
                          {displayName ? (
                            <Link
                              href={row.addr.toLowerCase() === address?.toLowerCase() ? "/my-profile" : "/players"}
                              className="font-medium text-primary hover:underline"
                            >
                              {displayName}
                            </Link>
                          ) : (
                            <a
                              href={`${explorer}/address/${row.addr}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary"
                            >
                              {`${row.addr.slice(0, 6)}…${row.addr.slice(-4)}`}
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="align-middle font-mono text-xs">
                          {tickets.toString()}
                        </TableCell>
                        <TableCell className="text-right align-middle font-mono text-xs font-semibold tabular-nums">
                          {cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {participantCount > participantsFetchLength && (
              <p className="border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground">
                Showing first {participantsFetchLength.toString()} of {participantCount.toString()} participants.
              </p>
            )}
          </div>

          {/* Enter */}
          <div
            className={cn(
              "mb-5 rounded-xl border p-4",
              canEnterRound
                ? "border-chain-accent/30 bg-chain-accent/5"
                : "border-border bg-muted/20 opacity-80",
            )}
          >
            <p className="text-sm font-semibold text-foreground">Enter (tickets)</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ticket price:{" "}
              <span className="font-mono">
                {LOTTERY_TICKET_PRICE_CASH.toLocaleString()}
              </span>{" "}
              cash. We will auto-approve if needed, then submit{" "}
              <code className="font-mono text-[10px]">enter</code>.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Tickets (e.g. 10)"
                value={ticketCountInput}
                onChange={(e) => setTicketCountInput(e.target.value)}
                disabled={!isConnected || !canEnterRound || enterLoading || approveLoading}
                className="h-10 max-w-xs font-mono text-sm"
              />
              <Button
                onClick={handleEnter}
                disabled={
                  !isConnected ||
                  !canEnterRound ||
                  enterLoading ||
                  approveLoading ||
                  !ticketCountInput.trim()
                }
                className="h-10 gap-1.5 sm:w-auto"
              >
                {approveLoading || enterLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Ticket className="h-3.5 w-3.5" />
                )}
                {approveLoading
                  ? "Approving…"
                  : enterLoading
                    ? "Buying…"
                    : "Buy tickets"}
              </Button>
            </div>
            {ticketCountInput.trim() && /^[0-9]+$/.test(ticketCountInput.trim()) && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Required cash:{" "}
                <span className="font-mono text-foreground">
                  {(
                    Number(ticketCountInput.trim()) * LOTTERY_TICKET_PRICE_CASH
                  ).toLocaleString()}
                </span>
              </p>
            )}
            {enterError && (
              <p className="mt-2 text-[10px] text-red-400">
                {enterError.message.includes("User rejected")
                  ? "Transaction rejected"
                  : enterError.message.split("\n")[0]}
              </p>
            )}
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Finished draws</p>
            {historyLoading && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </span>
            )}
          </div>

          {finishInfos.length === 0 && !historyLoading && (
            <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
              No finished rounds yet.
            </div>
          )}

          {[...finishInfos]
            .sort((a, b) => Number(b.roundId - a.roundId))
            .map((info) => {
              const winnerKey = info.winner.toLowerCase();
              const winnerName = nameByAddr[winnerKey] ?? null;
              const totalPrizeCash = Number(formatUnits(info.totalPrize, 18));
              const ownerFeeCash = Number(formatUnits(info.ownerFee, 18));
              return (
                <div
                  key={info.roundId.toString()}
                  className="rounded-lg border border-border/60 bg-card/40 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Draw ID</p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        #{info.roundId.toString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        info.isOwnerWithdraw
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                          : "border-green-400/30 bg-green-400/10 text-green-400",
                      )}
                    >
                      {info.isOwnerWithdraw ? "Owner withdraw" : "Winner draw"}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Winner
                      </p>
                      {info.winner === zeroAddress ? (
                        <span className="text-sm text-muted-foreground">No winner</span>
                      ) : winnerName ? (
                        <Link
                          href={info.winner.toLowerCase() === address?.toLowerCase() ? "/my-profile" : "/players"}
                          className="block truncate text-sm font-medium text-primary hover:underline"
                        >
                          {winnerName}
                        </Link>
                      ) : (
                        <a
                          href={`${explorer}/address/${info.winner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary"
                        >
                          {`${info.winner.slice(0, 6)}…${info.winner.slice(-4)}`}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                        </a>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Total prize
                      </p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {totalPrizeCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Owner fee
                      </p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {ownerFeeCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

          <Button
            variant="outline"
            onClick={() => void loadMoreHistory()}
            disabled={historyLoading || historyNextStartIndex === null}
            className="w-full"
          >
            {historyNextStartIndex === null ? "No more rounds" : "Load more"}
          </Button>
        </div>
      )}

      {enterSuccess && enterHash && (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-xs text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Entry confirmed.</span>
          <a
            href={`${explorer}/tx/${enterHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto font-mono text-[10px] hover:underline"
          >
            {enterHash.slice(0, 10)}…{enterHash.slice(-6)}
          </a>
        </div>
      )}
    </div>
  );
}
