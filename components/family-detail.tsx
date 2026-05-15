"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseEther, zeroAddress } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Crown,
  Shield,
  User,
  Skull,
  Lock,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Loader2,
  Landmark,
  ArrowDownToLine,
  ArrowUpFromLine,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Gift,
  UserCog,
} from "lucide-react";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  FAMILY_GAME_CASH_BANK,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
} from "@/lib/contract";
import { RANK_NAMES } from "@/lib/constants/const";
import { cn } from "@/lib/utils";
import type { Family } from "@/components/family-table";
import "@/types/mafia-globals";
import { MAFIA_FAMILY_ABI } from "@/lib/constants/abi";

// Role hierarchy for sorting
const ROLE_ORDER: Record<string, number> = {
  Don: 0,
  Consigliere: 1,
  Capodecina: 2,
  Capo: 3,
};

const WITHDRAW_LEADER_ROLES = new Set(["Don", "Consigliere", "Capodecina"]);

/** On-chain `FamilyRole` leader slot indices (Don=0 … Capo5=7). */
const FAMILY_LEADER_ROLE_INDEX: Record<string, number> = {
  Don: 0,
  Consigliere: 1,
  Capodecina: 2,
};

const CAPO_LEADER_INDEX_MIN = 3;
const CAPO_LEADER_INDEX_MAX = 7;

type FamilyMemberOption = {
  address: string;
  name: string;
  level: number;
};

type LeaderSlot = {
  address: string;
  role: string;
  name: string;
  familyId: number;
  level: number;
  isDead: boolean;
  isJailed: boolean;
  gender: number;
  country: string;
  jailedUntil: number;
  leaderIndex: number;
  displayRole: string;
};

function canManageLeaderSlot(
  myRole: string | null,
  leaderIndex: number,
): boolean {
  if (!myRole || leaderIndex < 0) return false;
  if (myRole === "Don") {
    return leaderIndex >= 0 && leaderIndex <= CAPO_LEADER_INDEX_MAX;
  }
  if (myRole === "Consigliere" || myRole === "Capodecina") {
    return leaderIndex >= CAPO_LEADER_INDEX_MIN && leaderIndex <= CAPO_LEADER_INDEX_MAX;
  }
  return false;
}

function buildLeaderSlots(
  leaders: Family["leaders"],
): LeaderSlot[] {
  let capoNum = 0;
  return leaders.map((leader) => {
    if (leader.role === "Capo") {
      const leaderIndex = CAPO_LEADER_INDEX_MIN + capoNum;
      capoNum += 1;
      return {
        ...leader,
        leaderIndex,
        displayRole: `Capo ${capoNum}`,
      };
    }
    const leaderIndex = FAMILY_LEADER_ROLE_INDEX[leader.role] ?? -1;
    return { ...leader, leaderIndex, displayRole: leader.role };
  });
}

const BANK_REFETCH_MS = 10_000;
const BANK_LOG_PAGE_SIZE = 20;

const BANK_LOG_TYPE_LABELS = ["Deposit", "Withdraw", "Promotion"] as const;

/** Player ranks shown in promotion rewards (Apprentice → Godfather). */
const PROMOTION_REWARD_RANK_MIN = 0;
const PROMOTION_REWARD_RANK_MAX = 29;

function getPromotionRewardRankIds(maxRank?: number): number[] {
  const cap =
    maxRank != null && maxRank > 0
      ? Math.min(maxRank, PROMOTION_REWARD_RANK_MAX)
      : PROMOTION_REWARD_RANK_MAX;
  const ranks: number[] = [];
  for (let r = PROMOTION_REWARD_RANK_MIN; r <= cap; r++) {
    if (RANK_NAMES[r]) ranks.push(r);
  }
  return ranks;
}

type BankLogEntry = {
  logType: number;
  user: `0x${string}`;
  amount: bigint;
  rank: number;
  timestamp: bigint;
};

function parseBankLog(raw: unknown): BankLogEntry | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return {
      logType: Number(raw[0] ?? 0),
      user: (raw[1] ?? zeroAddress) as `0x${string}`,
      amount: BigInt(raw[2] ?? 0),
      rank: Number(raw[3] ?? 0),
      timestamp: BigInt(raw[4] ?? 0),
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    logType: Number(o.logType ?? 0),
    user: (o.user ?? zeroAddress) as `0x${string}`,
    amount: BigInt((o.amount as bigint | string | number) ?? 0),
    rank: Number(o.rank ?? 0),
    timestamp: BigInt((o.timestamp as bigint | string | number) ?? 0),
  };
}

function formatLogTimestamp(ts: bigint): string {
  const n = Number(ts);
  if (!n) return "—";
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toLocaleString();
}

function bankLogTypeLabel(logType: number): string {
  return BANK_LOG_TYPE_LABELS[logType] ?? `Type ${logType}`;
}

function promotionRankLabel(contractRank: number): string {
  return RANK_NAMES[contractRank] ?? `Rank ${contractRank}`;
}

function bankLogRankLabel(rank: number): string | null {
  if (rank === 0) return null;
  return promotionRankLabel(rank);
}

function parsePromotionRewardWeiValue(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
  const s = String(v ?? "").trim();
  if (!s) return BigInt(0);
  if (s.includes(".")) {
    try {
      return parseEther(s);
    } catch {
      return BigInt(0);
    }
  }
  try {
    return BigInt(s);
  } catch {
    return BigInt(0);
  }
}

function parsePromotionRewardsRaw(raw: unknown): bigint[] {
  if (raw == null) return [];

  let values: unknown[] | undefined;

  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.rewards)) {
      values = o.rewards;
    } else if (Array.isArray(o[0])) {
      values = o[0] as unknown[];
    }
  } else if (typeof raw === "string") {
    values = raw.split(",").map((part) => part.trim()).filter(Boolean);
  }

  if (!values?.length) return [];
  return values.map(parsePromotionRewardWeiValue);
}

/** Wei (18 decimals) → human-readable cash for inputs. */
function formatWeiToCashInput(wei: bigint): string {
  if (wei === BigInt(0)) return "";
  const ether = formatUnits(wei, 18);
  if (!ether.includes(".")) return ether;
  return ether.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function promotionRewardInputsFromWei(
  rewards: bigint[],
  rankIds: readonly number[],
): Record<number, string> {
  const next: Record<number, string> = {};
  for (const rank of rankIds) {
    const wei = rewards[rank] ?? BigInt(0);
    next[rank] = formatWeiToCashInput(wei);
  }
  return next;
}

function parsePlayerFamilyId(raw: unknown): bigint | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "object" && raw !== null && "familyId" in raw) {
    return (raw as { familyId: bigint }).familyId;
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return BigInt(raw[0] as bigint | string | number);
  }
  return undefined;
}

function parseCashInput(raw: string): bigint | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  try {
    const wei = parseEther(trimmed);
    return wei > BigInt(0) ? wei : null;
  } catch {
    return null;
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case "Don":
      return <Crown className="h-3.5 w-3.5 text-yellow-500" />;
    case "Consigliere":
      return <Shield className="h-3.5 w-3.5 text-purple-500" />;
    case "Capodecina":
      return <Shield className="h-3.5 w-3.5 text-blue-500" />;
    case "Capo":
      return <Shield className="h-3.5 w-3.5 text-cyan-500" />;
    case "Heir":
      return <Shield className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <User className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getRoleBadgeClass(role: string) {
  switch (role) {
    case "Don":
      return "border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
    case "Consigliere":
      return "border-purple-500/50 bg-purple-500/10 text-purple-400";
    case "Capodecina":
      return "border-blue-500/50 bg-blue-500/10 text-blue-400";
    case "Capo":
      return "border-cyan-500/50 bg-cyan-500/10 text-cyan-400";
    case "Heir":
      return "border-amber-500/50 bg-amber-500/10 text-amber-400";
    default:
      return "border-muted-foreground/50 text-muted-foreground";
  }
}

// Status indicators
function StatusIndicators({ isJailed, isDead }: { isJailed: boolean; isDead: boolean }) {
  if (!isJailed && !isDead) return null;
  return (
    <span className="inline-flex gap-1 ml-1">
      {isJailed && <Lock className="h-3 w-3 text-amber-500" aria-label="Jailed" />}
      {isDead && <Skull className="h-3 w-3 text-red-500" aria-label="Dead" />}
    </span>
  );
}

// Format address helper
function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isLeaderAssigned(leader: { name: string; address: string }): boolean {
  if (!leader.name?.trim()) return false;
  const addr = leader.address?.toLowerCase() ?? "";
  return (
    addr !== "" &&
    addr !== zeroAddress.toLowerCase() &&
    addr !== "0x0000000000000000000000000000000000000000"
  );
}

interface FamilyDetailProps {
  familyId: number;
}

export function FamilyDetail({ familyId }: FamilyDetailProps) {
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { authData } = useAuth();
  const familyGameCashBank = addresses.familyGameCashBank;
  const bankConfigured = familyGameCashBank !== zeroAddress;

  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [promotionRewardsDialogOpen, setPromotionRewardsDialogOpen] =
    useState(false);
  const [promotionRewardInputs, setPromotionRewardInputs] = useState<
    Record<number, string>
  >({});
  const [leaderManageOpen, setLeaderManageOpen] = useState(false);
  const [leaderManageIndex, setLeaderManageIndex] = useState<number | null>(null);
  const [leaderManageRoleLabel, setLeaderManageRoleLabel] = useState("");
  const [selectedLeaderMember, setSelectedLeaderMember] = useState("");
  const [bankLogs, setBankLogs] = useState<BankLogEntry[]>([]);
  const [bankLogsTotal, setBankLogsTotal] = useState<bigint>(BigInt(0));
  const [bankLogsPageIndex, setBankLogsPageIndex] = useState(0);
  const [bankLogsLoading, setBankLogsLoading] = useState(false);
  const [logNameByAddr, setLogNameByAddr] = useState<Record<string, string>>({});
  const depositAfterApproveRef = useRef<bigint | null>(null);
  const promotionRewardsInputsSyncedRef = useRef(false);

  const { data: playerInfoRaw, refetch: refetchPlayerInfo } = useReadContract({
    address: addresses.mafiaFamily,
    abi: MAFIA_FAMILY_ABI,
    functionName: "getPlayerInfo",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const myFamilyId = useMemo(
    () => parsePlayerFamilyId(playerInfoRaw),
    [playerInfoRaw],
  );

  const { data: familyBalanceRaw, refetch: refetchFamilyBalance } = useReadContract({
    address: familyGameCashBank,
    abi: FAMILY_GAME_CASH_BANK,
    functionName: "familyBalance",
    args: [BigInt(familyId)],
    query: {
      enabled: bankConfigured && familyId > 0,
      refetchInterval: BANK_REFETCH_MS,
    },
  });

  const familyBankBalanceWei =
    familyBalanceRaw != null ? BigInt(familyBalanceRaw as bigint) : undefined;

  const { data: maxRankRaw } = useReadContract({
    address: familyGameCashBank,
    abi: FAMILY_GAME_CASH_BANK,
    functionName: "MAX_RANK",
    query: { enabled: bankConfigured },
  });

  const { data: promotionRewardsRaw, refetch: refetchPromotionRewards } =
    useReadContract({
      address: familyGameCashBank,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "getPromotionRewards",
      args: [BigInt(familyId)],
      query: {
        enabled: bankConfigured && familyId > 0,
        refetchInterval: BANK_REFETCH_MS,
      },
    });

  const promotionRewardsWei = useMemo(
    () => [BigInt(0), ...parsePromotionRewardsRaw(promotionRewardsRaw)],
    [promotionRewardsRaw],
  );

  const promotionRewardRankIds = useMemo(
    () =>
      getPromotionRewardRankIds(
        maxRankRaw != null ? Number(maxRankRaw) : undefined,
      ),
    [maxRankRaw],
  );

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowances",
    args:
      address && bankConfigured
        ? [address, familyGameCashBank]
        : undefined,
    query: {
      enabled: !!address && bankConfigured && isConnected,
      refetchInterval: BANK_REFETCH_MS,
    },
  });

  const allowance =
    allowanceRaw != null ? BigInt(allowanceRaw as bigint) : undefined;

  const { data: cashBalRaw, refetch: refetchCashBalance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address && bankConfigured
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address && bankConfigured && isConnected },
  });

  const myCashBalanceWei =
    cashBalRaw != null ? BigInt(cashBalRaw as bigint) : undefined;

  // Load the MafiaFamily script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.MafiaFamily) {
      const script = document.createElement("script");
      script.src = "/js/mafia-utils.js";
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      script.onerror = () => {
        setError("Failed to load MafiaFamily script");
      };
      document.body.appendChild(script);
    } else if (window.MafiaFamily) {
      setScriptLoaded(true);
    }
  }, []);

  // Fetch family data
  const fetchFamily = useCallback(async () => {
    if (!window.MafiaFamily) {
      setError("MafiaFamily not available");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadProgress("Loading family data...");

    try {
      const allFamilies = await window.MafiaFamily.getFamiliesWithPlayers({
        chain: chainConfig.id,
        onProgress: (info) => {
          if (info.step === "families") {
            setLoadProgress(`Loading families... ${info.fetched}`);
          } else {
            setLoadProgress(`Loading player info... ${info.fetched}`);
          }
        },
      });

      const foundFamily = allFamilies.find((f) => f.familyId === familyId);
      if (foundFamily) {
        setFamily(foundFamily);
      } else {
        setError(`Family #${familyId} not found`);
      }
      setLoadProgress("");
    } catch (err) {
      console.error("Error fetching family:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch family data");
    } finally {
      setIsLoading(false);
    }
  }, [chainConfig.id, familyId]);

  // Auto-fetch on mount when script is loaded
  useEffect(() => {
    if (scriptLoaded && !family && !isLoading) {
      fetchFamily();
    }
  }, [scriptLoaded, family, isLoading, fetchFamily]);

  // Copy address handler
  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Sorted leaders with on-chain slot indices
  const sortedLeaderSlots = useMemo(() => {
    if (!family) return [];
    const sorted = [...family.leaders].sort((a, b) => {
      const orderA = ROLE_ORDER[a.role] ?? 99;
      const orderB = ROLE_ORDER[b.role] ?? 99;
      return orderA - orderB;
    });
    return buildLeaderSlots(sorted);
  }, [family]);

  const sortedLeaders = sortedLeaderSlots;

  // Regular members (excluding leaders and successor)
  const regularMembers = useMemo(() => {
    if (!family) return [];
    const leaderAddresses = new Set(family.leaders.map((l) => l.address.toLowerCase()));
    const successorAddress = family.successor?.address?.toLowerCase();
    return family.players.filter(
      (p) =>
        !leaderAddresses.has(p.address.toLowerCase()) &&
        p.address.toLowerCase() !== successorAddress
    );
  }, [family]);

  const isMyFamily = useMemo(() => {
    if (myFamilyId === undefined) return false;
    return myFamilyId === BigInt(familyId) && familyId > 0;
  }, [myFamilyId, familyId]);

  const isListedFamilyMember = useMemo(() => {
    if (!family || !address) return false;
    const key = address.toLowerCase();
    if (family.leaders.some((l) => l.address.toLowerCase() === key)) return true;
    if (family.players.some((p) => p.address.toLowerCase() === key)) return true;
    const succ = family.successor?.address?.toLowerCase();
    return !!succ && succ === key;
  }, [family, address]);

  const isFamilyMember = isMyFamily || isListedFamilyMember;

  const myLeaderRole = useMemo(() => {
    if (!family || !address) return null;
    const key = address.toLowerCase();
    const leader = family.leaders.find((l) => l.address.toLowerCase() === key);
    return leader?.role ?? null;
  }, [family, address]);

  const canWithdrawFromBank =
    isFamilyMember &&
    !!myLeaderRole &&
    WITHDRAW_LEADER_ROLES.has(myLeaderRole);

  const canSetPromotionRewards = isFamilyMember && myLeaderRole === "Don";

  const canManageFamilyLeaders =
    isConnected &&
    isFamilyMember &&
    (myLeaderRole === "Don" ||
      myLeaderRole === "Consigliere" ||
      myLeaderRole === "Capodecina");

  const donLeaderAddress = useMemo(() => {
    const don = family?.leaders.find((l) => l.role === "Don");
    if (!don || !isLeaderAssigned(don)) return null;
    return don.address.toLowerCase();
  }, [family]);

  const allFamilyMemberOptions = useMemo((): FamilyMemberOption[] => {
    if (!family) return [];
    const byAddr = new Map<string, FamilyMemberOption>();
    const add = (m: {
      address: string;
      name: string;
      level: number;
    }) => {
      const addr = m.address?.trim();
      if (!addr) return;
      const key = addr.toLowerCase();
      if (
        key === zeroAddress.toLowerCase() ||
        key === "0x0000000000000000000000000000000000000000"
      ) {
        return;
      }
      byAddr.set(key, {
        address: addr,
        name: m.name?.trim() || formatAddress(addr),
        level: m.level,
      });
    };
    for (const p of family.players) add(p);
    for (const l of family.leaders) add(l);
    if (family.successor) add(family.successor);
    return Array.from(byAddr.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [family]);

  const leaderAssignMemberOptions = useMemo((): FamilyMemberOption[] => {
    if (!canManageFamilyLeaders) return [];

    const excludeDon =
      leaderManageIndex !== null && leaderManageIndex !== 0;

    if (!excludeDon || !donLeaderAddress) {
      return allFamilyMemberOptions;
    }

    return allFamilyMemberOptions.filter(
      (m) => m.address.toLowerCase() !== donLeaderAddress,
    );
  }, [
    allFamilyMemberOptions,
    leaderManageIndex,
    donLeaderAddress,
    canManageFamilyLeaders,
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
    writeContract: writeDeposit,
    data: depositHash,
    isPending: depositPending,
    error: depositError,
    reset: resetDeposit,
  } = useChainWriteContract();
  const { isLoading: depositConfirming, isSuccess: depositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });

  const {
    writeContract: writeWithdraw,
    data: withdrawHash,
    isPending: withdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useChainWriteContract();
  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  const {
    writeContract: writeSetPromotionRewards,
    data: setRewardsHash,
    isPending: setRewardsPending,
    error: setRewardsError,
    reset: resetSetRewards,
  } = useChainWriteContract();
  const { isLoading: setRewardsConfirming, isSuccess: setRewardsSuccess } =
    useWaitForTransactionReceipt({ hash: setRewardsHash });

  const {
    writeContract: writeUpdateLeader,
    data: updateLeaderHash,
    isPending: updateLeaderPending,
    error: updateLeaderError,
    reset: resetUpdateLeader,
  } = useChainWriteContract();
  const { isLoading: updateLeaderConfirming, isSuccess: updateLeaderSuccess } =
    useWaitForTransactionReceipt({ hash: updateLeaderHash });

  const approveLoading = approvePending || approveConfirming;
  const depositLoading = depositPending || depositConfirming;
  const withdrawLoading = withdrawPending || withdrawConfirming;
  const setRewardsLoading = setRewardsPending || setRewardsConfirming;
  const updateLeaderLoading = updateLeaderPending || updateLeaderConfirming;

  const refetchBankData = useCallback(async () => {
    await Promise.all([
      refetchFamilyBalance(),
      refetchAllowance(),
      refetchCashBalance(),
      refetchPlayerInfo(),
    ]);
  }, [
    refetchFamilyBalance,
    refetchAllowance,
    refetchCashBalance,
    refetchPlayerInfo,
  ]);

  useEffect(() => {
    if (approveError) depositAfterApproveRef.current = null;
  }, [approveError]);

  useEffect(() => {
    if (!approveSuccess || !approveHash) return;
    const wei = depositAfterApproveRef.current;
    if (wei === null) return;
    depositAfterApproveRef.current = null;
    resetDeposit();
    writeDeposit({
      address: familyGameCashBank,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "deposit",
      args: [BigInt(familyId), wei],
    });
  }, [
    approveSuccess,
    approveHash,
    writeDeposit,
    familyGameCashBank,
    familyId,
    resetDeposit,
  ]);

  useEffect(() => {
    if (!depositSuccess || !depositHash) return;
    toast.success("Deposit successful");
    setDepositInput("");
    setDepositDialogOpen(false);
    void refetchBankData();
  }, [depositSuccess, depositHash, refetchBankData]);

  useEffect(() => {
    if (!withdrawSuccess || !withdrawHash) return;
    toast.success("Withdrawal successful");
    setWithdrawInput("");
    setWithdrawDialogOpen(false);
    void refetchBankData();
  }, [withdrawSuccess, withdrawHash, refetchBankData]);

  useEffect(() => {
    if (!setRewardsSuccess || !setRewardsHash) return;
    toast.success("Promotion rewards updated");
    setPromotionRewardsDialogOpen(false);
    void refetchPromotionRewards();
    void refetchFamilyBalance();
  }, [setRewardsSuccess, setRewardsHash, refetchPromotionRewards, refetchFamilyBalance]);

  useEffect(() => {
    if (!updateLeaderSuccess || !updateLeaderHash) return;
    toast.success("Family leader updated");
    setLeaderManageOpen(false);
    setLeaderManageIndex(null);
    setSelectedLeaderMember("");
    void fetchFamily();
  }, [updateLeaderSuccess, updateLeaderHash, fetchFamily]);

  useEffect(() => {
    if (!promotionRewardsDialogOpen) {
      promotionRewardsInputsSyncedRef.current = false;
      return;
    }
    if (promotionRewardsRaw === undefined) return;
    if (
      promotionRewardsWei.length === 0 &&
      promotionRewardRankIds.length > 0
    ) {
      return;
    }
    if (promotionRewardsInputsSyncedRef.current) return;
    promotionRewardsInputsSyncedRef.current = true;
    setPromotionRewardInputs(
      promotionRewardInputsFromWei(promotionRewardsWei, promotionRewardRankIds),
    );

    console.log(promotionRewardsWei, promotionRewardRankIds);
  }, [
    promotionRewardsDialogOpen,
    promotionRewardsRaw,
    promotionRewardsWei,
    promotionRewardRankIds,
  ]);

  const handleDeposit = () => {
    if (!bankConfigured || !isConnected) return;
    if (!isFamilyMember) {
      toast.error("Only members of this family can deposit");
      return;
    }
    const wei = parseCashInput(depositInput);
    if (wei === null) {
      toast.error("Enter a valid cash amount");
      return;
    }
    if (allowance === undefined) {
      toast.error("Allowance not loaded yet");
      return;
    }
    if (myCashBalanceWei !== undefined && wei > myCashBalanceWei) {
      toast.error("Insufficient in-game cash");
      return;
    }
    resetApprove();
    resetDeposit();
    if (allowance < wei) {
      depositAfterApproveRef.current = wei;
      writeApprove({
        address: addresses.ingameCurrency,
        abi: INGAME_CURRENCY_ABI,
        functionName: "approveInGameCurrency",
        args: [familyGameCashBank, INGAME_CURRENCY_APPROVE_AMOUNT],
      });
      return;
    }
    writeDeposit({
      address: familyGameCashBank,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "deposit",
      args: [BigInt(familyId), wei],
    });
  };

  const openLeaderManageDialog = (slot: LeaderSlot) => {
    setLeaderManageIndex(slot.leaderIndex);
    setLeaderManageRoleLabel(slot.displayRole);
    let initialMember = isLeaderAssigned(slot) ? slot.address : "";
    if (
      slot.leaderIndex !== 0 &&
      donLeaderAddress &&
      initialMember.toLowerCase() === donLeaderAddress
    ) {
      initialMember = "";
    }
    setSelectedLeaderMember(initialMember);
    resetUpdateLeader();
    setLeaderManageOpen(true);
  };

  const handleUpdateFamilyLeader = () => {
    if (!isConnected) {
      toast.error("Connect your wallet");
      return;
    }
    if (leaderManageIndex === null) return;
    if (!canManageLeaderSlot(myLeaderRole, leaderManageIndex)) {
      toast.error("You cannot manage this leadership slot");
      return;
    }
    if (!selectedLeaderMember) {
      toast.error("Select a family member");
      return;
    }
    resetUpdateLeader();
    writeUpdateLeader({
      address: addresses.mafiaFamily,
      abi: MAFIA_FAMILY_ABI,
      functionName: "updateFamilyLeader",
      args: [
        BigInt(familyId),
        selectedLeaderMember as `0x${string}`,
        leaderManageIndex,
      ],
    });
  };

  const handleSavePromotionRewards = () => {
    if (!bankConfigured || !isConnected) return;
    if (!canSetPromotionRewards) {
      toast.error("Only the Don can set promotion rewards");
      return;
    }

    const ranks: number[] = [];
    const amounts: bigint[] = [];

    for (const rank of promotionRewardRankIds) {
      const raw = (promotionRewardInputs[rank] ?? "").trim();
      let wei: bigint;
      if (!raw) {
        wei = BigInt(0);
      } else {
        const parsed = parseCashInput(raw);
        if (parsed === null) {
          toast.error(`Enter a valid amount for ${promotionRankLabel(rank)}`);
          return;
        }
        wei = parsed;
      }
      ranks.push(rank);
      amounts.push(wei);
    }

    resetSetRewards();
    writeSetPromotionRewards({
      address: familyGameCashBank,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "setPromotionRewards",
      args: [BigInt(familyId), ranks, amounts],
    });
  };

  const handleWithdraw = () => {
    if (!bankConfigured || !isConnected) return;
    if (!canWithdrawFromBank) {
      toast.error("Only Don, Consigliere, or Capodecina can withdraw");
      return;
    }
    const wei = parseCashInput(withdrawInput);
    if (wei === null) {
      toast.error("Enter a valid cash amount");
      return;
    }
    if (familyBankBalanceWei !== undefined && wei > familyBankBalanceWei) {
      toast.error("Amount exceeds family bank balance");
      return;
    }
    resetWithdraw();
    writeWithdraw({
      address: familyGameCashBank,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "withdraw",
      args: [BigInt(familyId), wei],
    });
  };

  const formatCashWei = (wei: bigint | undefined) => {
    if (wei === undefined) return "—";
    return Number(formatUnits(wei, 18)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  const rosterNameByAddr = useMemo(() => {
    const map: Record<string, string> = {};
    if (!family) return map;
    for (const l of family.leaders) {
      if (l.name?.trim()) map[l.address.toLowerCase()] = l.name.trim();
    }
    for (const p of family.players) {
      if (p.name?.trim()) map[p.address.toLowerCase()] = p.name.trim();
    }
    if (family.successor?.name?.trim() && family.successor.address) {
      map[family.successor.address.toLowerCase()] = family.successor.name.trim();
    }
    return map;
  }, [family]);

  const fetchBankLogsPage = useCallback(
    async (pageIndex: number) => {
      if (!publicClient || !bankConfigured) return;
      setBankLogsLoading(true);
      try {
        const total = (await publicClient.readContract({
          address: familyGameCashBank,
          abi: FAMILY_GAME_CASH_BANK,
          functionName: "getFamilyLogsCount",
          args: [BigInt(familyId)],
        })) as bigint;

        setBankLogsTotal(total);

        if (total === BigInt(0)) {
          setBankLogs([]);
          return;
        }

        const pageSize = BigInt(BANK_LOG_PAGE_SIZE);
        const endExclusive = total - BigInt(pageIndex) * pageSize;
        if (endExclusive <= BigInt(0)) {
          setBankLogs([]);
          return;
        }

        const start =
          endExclusive > pageSize ? endExclusive - pageSize : BigInt(0);
        const length = endExclusive - start;

        const raw = (await publicClient.readContract({
          address: familyGameCashBank,
          abi: FAMILY_GAME_CASH_BANK,
          functionName: "getFamilyLogs",
          args: [BigInt(familyId), start, length],
        })) as unknown;

        const list = Array.isArray(raw)
          ? raw
          : raw != null && typeof raw === "object" && Array.isArray((raw as { list?: unknown }).list)
            ? ((raw as { list: unknown[] }).list)
            : [];
        const parsed = list
          .map((item) => parseBankLog(item))
          .filter((x): x is BankLogEntry => x !== null)
          .reverse();

        setBankLogs(parsed);
      } catch (e) {
        console.error("Family bank logs fetch failed", e);
        toast.error("Could not load bank logs");
        setBankLogs([]);
      } finally {
        setBankLogsLoading(false);
      }
    },
    [publicClient, bankConfigured, familyGameCashBank, familyId],
  );

  const bankLogsHasOlder =
    (BigInt(bankLogsPageIndex) + BigInt(1)) * BigInt(BANK_LOG_PAGE_SIZE) <
    bankLogsTotal;
  const bankLogsHasNewer = bankLogsPageIndex > 0;

  const bankLogsPageLabel = useMemo(() => {
    if (bankLogsTotal === BigInt(0)) return "No entries";
    const pageSize = BigInt(BANK_LOG_PAGE_SIZE);
    const endExclusive = bankLogsTotal - BigInt(bankLogsPageIndex) * pageSize;
    const start =
      endExclusive > pageSize ? endExclusive - pageSize + BigInt(1) : BigInt(1);
    return `Entries ${start.toString()}–${endExclusive.toString()} of ${bankLogsTotal.toString()}`;
  }, [bankLogsTotal, bankLogsPageIndex]);

  useEffect(() => {
    if (!logsDialogOpen) return;
    void fetchBankLogsPage(bankLogsPageIndex);
  }, [logsDialogOpen, bankLogsPageIndex, fetchBankLogsPage]);

  useEffect(() => {
    if (!logsDialogOpen || bankLogs.length === 0) return;

    const next: Record<string, string> = { ...rosterNameByAddr };
    for (const log of bankLogs) {
      const key = log.user.toLowerCase();
      if (!next[key]) {
        const fromRoster = rosterNameByAddr[key];
        if (fromRoster) next[key] = fromRoster;
      }
    }
    setLogNameByAddr(next);

    const missing = bankLogs
      .map((l) => l.user.toLowerCase())
      .filter((k) => !next[k]);
    if (missing.length === 0) return;

    const mafiaProfile = window.MafiaProfile;
    if (!scriptLoaded || !mafiaProfile) return;

    let cancelled = false;
    (async () => {
      try {
        const users = await mafiaProfile.getUsersInfo({ chain: chainConfig.id });
        if (cancelled) return;
        const want = new Set(missing);
        const resolved: Record<string, string> = { ...next };
        for (const u of users) {
          const row = u as { user?: string; name?: string };
          const raw = row.user;
          if (!raw) continue;
          const key = raw.toLowerCase();
          if (!want.has(key)) continue;
          const name = row.name?.trim();
          if (name) resolved[key] = name;
        }
        setLogNameByAddr(resolved);
      } catch (e) {
        console.error("Family bank log names failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logsDialogOpen, bankLogs, rosterNameByAddr, scriptLoaded, chainConfig.id]);

  const openBankLogsDialog = () => {
    setBankLogsPageIndex(0);
    setLogsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/50 bg-red-500/10">
        <CardContent className="p-6 text-center">
          <Skull className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h3 className="text-lg font-semibold text-red-400">{error}</h3>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/families">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Families
              </Link>
            </Button>
            <Button variant="outline" onClick={fetchFamily}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!family) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/families">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{family.name}</h1>
            {family.isDead ? (
              <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400">
                <Skull className="mr-1 h-3 w-3" />
                Disbanded
              </Badge>
            ) : (
              <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400">
                Active
              </Badge>
            )}
            {isConnected && (
              isMyFamily ? (
                <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary">
                  My family
                </Badge>
              ) : (
                <Badge variant="outline" className="border-border bg-secondary text-muted-foreground">
                  Not your family
                </Badge>
              )
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Family ID: #{family.familyId} | {family.memberCount} members
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchFamily}
          className="ml-auto"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Family game cash bank */}
      {bankConfigured && (
        <>
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Landmark className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Family game cash bank</p>
                  <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                    {formatCashWei(familyBankBalanceWei)}
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                      cash
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setPromotionRewardsDialogOpen(true)}
                >
                  <Gift className="h-3.5 w-3.5" />
                  Rewards
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={openBankLogsDialog}
                >
                  <ScrollText className="h-3.5 w-3.5" />
                  Log
                </Button>
                {isConnected ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setDepositDialogOpen(true)}
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      Deposit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setWithdrawDialogOpen(true)}
                    >
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                      Withdraw
                    </Button>
                  </>
                ) : (
                  <p className="self-center text-xs text-muted-foreground">
                    Connect wallet to deposit or withdraw
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Deposit to family bank</DialogTitle>
                <DialogDescription>
                  Transfer in-game cash from your wallet into the family treasury.
                  {isFamilyMember && (
                    <>
                      {" "}
                      Your balance:{" "}
                      <span className="font-mono text-foreground">
                        {formatCashWei(myCashBalanceWei)} cash
                      </span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              {!isFamilyMember ? (
                <p className="text-sm text-amber-400">
                  You must be a member of this family to deposit.
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground" htmlFor="deposit-amount">
                    Amount (cash)
                  </label>
                  <Input
                    id="deposit-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={depositInput}
                    onChange={(e) => setDepositInput(e.target.value)}
                    disabled={depositLoading || approveLoading}
                    className="font-mono"
                  />
                </div>
              )}
              {(depositError || approveError) && (
                <p className="text-xs text-red-400">
                  {(depositError ?? approveError)?.message.split("\n")[0]}
                </p>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setDepositDialogOpen(false)}
                  disabled={depositLoading || approveLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeposit}
                  disabled={!isFamilyMember || depositLoading || approveLoading}
                  className="gap-1.5"
                >
                  {depositLoading || approveLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="h-4 w-4" />
                  )}
                  Confirm deposit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Withdraw from family bank</DialogTitle>
                <DialogDescription>
                  Only Don, Consigliere, and Capodecina can withdraw. Treasury balance:{" "}
                  <span className="font-mono text-foreground">
                    {formatCashWei(familyBankBalanceWei)} cash
                  </span>
                </DialogDescription>
              </DialogHeader>
              {!canWithdrawFromBank ? (
                <p className="text-sm text-amber-400">
                  {isFamilyMember
                    ? myLeaderRole
                      ? `${myLeaderRole} cannot withdraw from the bank.`
                      : "Leadership role required to withdraw."
                    : "You must be a member of this family with a leadership role to withdraw."}
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground" htmlFor="withdraw-amount">
                    Amount (cash)
                  </label>
                  <Input
                    id="withdraw-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={withdrawInput}
                    onChange={(e) => setWithdrawInput(e.target.value)}
                    disabled={withdrawLoading}
                    className="font-mono"
                  />
                </div>
              )}
              {withdrawError && (
                <p className="text-xs text-red-400">
                  {withdrawError.message.split("\n")[0]}
                </p>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setWithdrawDialogOpen(false)}
                  disabled={withdrawLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={!canWithdrawFromBank || withdrawLoading}
                  className="gap-1.5"
                >
                  {withdrawLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4" />
                  )}
                  Confirm withdraw
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={promotionRewardsDialogOpen}
            onOpenChange={setPromotionRewardsDialogOpen}
          >
            <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Promotion rank rewards</DialogTitle>
                <DialogDescription>
                  Cash paid from the family bank when a member is promoted to a
                  player rank (Apprentice through Godfather).
                  {canSetPromotionRewards
                    ? " As Don, you can set the reward for each rank."
                    : " Only the Don can change these amounts."}
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1">
                <ScrollArea className="h-[min(70vh,480px)] w-full rounded-md border border-border/60">
                  <div className="pr-3">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] uppercase">Rank</TableHead>
                          <TableHead className="text-right text-[10px] uppercase">
                            {canSetPromotionRewards ? "Reward (cash)" : "Reward"}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promotionRewardRankIds.map((rank) => {
                          const label = promotionRankLabel(rank);
                          const currentWei = promotionRewardsWei[rank - 1] ?? BigInt(0);
                          const displayCash =
                            promotionRewardInputs[rank - 1] ??
                            formatWeiToCashInput(currentWei);
                          return (
                            <TableRow key={rank} className="border-border/30">
                              <TableCell className="py-2">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                    #{rank}
                                  </span>
                                  <span className="text-sm font-medium">{label}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                {canSetPromotionRewards ? (
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={displayCash}
                                    onChange={(e) =>
                                      setPromotionRewardInputs((prev) => ({
                                        ...prev,
                                        [rank - 1]: e.target.value,
                                      }))
                                    }
                                    disabled={setRewardsLoading || rank === 1}
                                    className="ml-auto max-w-[9rem] font-mono text-right text-sm"
                                  />
                                ) : (
                                  <span className="font-mono text-sm tabular-nums">
                                    {formatCashWei(currentWei)}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>

              {setRewardsError && (
                <p className="text-xs text-red-400">
                  {setRewardsError.message.split("\n")[0]}
                </p>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setPromotionRewardsDialogOpen(false)}
                  disabled={setRewardsLoading}
                >
                  Close
                </Button>
                {canSetPromotionRewards && (
                  <Button
                    onClick={handleSavePromotionRewards}
                    disabled={setRewardsLoading}
                    className="gap-1.5"
                  >
                    {setRewardsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                    Save rewards
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
            <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Family cash bank log</DialogTitle>
                <DialogDescription>
                  Deposits, withdrawals, and promotion payouts. Newest entries
                  first.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{bankLogsPageLabel}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={bankLogsLoading}
                  onClick={() => void fetchBankLogsPage(bankLogsPageIndex)}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", bankLogsLoading && "animate-spin")} />
                </Button>
              </div>

              <div className="min-h-0 flex-1">
                <ScrollArea className="h-[min(50vh,360px)] w-full rounded-md border border-border/60">
                  <div className="pr-3">
                    {bankLogsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </div>
                    ) : bankLogs.length === 0 ? (
                      <p className="py-12 text-center text-sm text-muted-foreground">
                        No log entries yet.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px] uppercase">Type</TableHead>
                            <TableHead className="text-[10px] uppercase">Player</TableHead>
                            <TableHead className="text-right text-[10px] uppercase">
                              Amount
                            </TableHead>
                            <TableHead className="text-right text-[10px] uppercase">
                              Time
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bankLogs.map((log, idx) => {
                            const key = log.user.toLowerCase();
                            const displayName = logNameByAddr[key] ?? null;
                            const typeLabel = bankLogTypeLabel(log.logType);
                            const rankLabel =
                              log.logType === 2 ? bankLogRankLabel(log.rank) : null;
                            return (
                              <TableRow
                                key={`${log.timestamp}-${log.user}-${idx}`}
                                className="border-border/30"
                              >
                                <TableCell className="align-top py-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px]",
                                      log.logType === 0 &&
                                      "border-green-500/40 bg-green-500/10 text-green-400",
                                      log.logType === 1 &&
                                      "border-orange-500/40 bg-orange-500/10 text-orange-400",
                                      log.logType === 2 &&
                                      "border-purple-500/40 bg-purple-500/10 text-purple-400",
                                    )}
                                  >
                                    {typeLabel}
                                    {rankLabel ? ` · ${rankLabel}` : ""}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[8rem] align-top py-2 text-xs">
                                  {displayName ? (
                                    <span className="font-medium text-foreground">
                                      {displayName}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-muted-foreground">
                                      {formatAddress(log.user)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="align-top py-2 text-right font-mono text-xs tabular-nums">
                                  {formatCashWei(log.amount)}
                                </TableCell>
                                <TableCell className="align-top py-2 text-right text-[10px] text-muted-foreground whitespace-nowrap">
                                  {formatLogTimestamp(log.timestamp)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={!bankLogsHasNewer || bankLogsLoading}
                    onClick={() => setBankLogsPageIndex((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Newer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={!bankLogsHasOlder || bankLogsLoading}
                    onClick={() => setBankLogsPageIndex((p) => p + 1)}
                  >
                    Older
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogsDialogOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Family Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Crown className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Leadership</p>
                <p className="text-lg font-semibold">{sortedLeaders.length} leaders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="text-lg font-semibold">{regularMembers.length} soldiers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Leave Fee</p>
                <p className="text-lg font-semibold font-mono">
                  {family.leaveFee > 0 ? `${(family.leaveFee / 1e18).toLocaleString()} MAFIA` : "Free"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leadership Table */}
      {sortedLeaders.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Crown className="h-4 w-4 text-yellow-500" />
              Leadership
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Role</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
                {canManageFamilyLeaders && (
                  <TableHead className="text-right">Manage</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeaderSlots.map((leader) => {
                const assigned = isLeaderAssigned(leader);
                const slotManageable = canManageLeaderSlot(
                  myLeaderRole,
                  leader.leaderIndex,
                );
                return (
                  <TableRow
                    key={`${leader.displayRole}-${leader.leaderIndex}`}
                    className={cn(
                      !assigned &&
                      "bg-muted/20 text-muted-foreground opacity-60 hover:bg-muted/20",
                    )}
                  >
                    <TableCell>
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          !assigned && "opacity-70",
                        )}
                      >
                        {getRoleIcon(leader.role)}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            assigned
                              ? getRoleBadgeClass(leader.role)
                              : "border-border/50 bg-muted/30 text-muted-foreground",
                          )}
                        >
                          {leader.displayRole}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-medium",
                        !assigned && "italic text-muted-foreground",
                      )}
                    >
                      {assigned ? leader.name : "Not Assigned"}
                      {assigned && (
                        <StatusIndicators
                          isJailed={leader.isJailed}
                          isDead={leader.isDead}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {assigned ? leader.level : "—"}
                    </TableCell>
                    <TableCell>
                      {!assigned ? (
                        <Badge
                          variant="outline"
                          className="border-border/50 bg-muted/30 text-muted-foreground text-[10px]"
                        >
                          Vacant
                        </Badge>
                      ) : leader.isDead ? (
                        <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-[10px]">
                          Dead
                        </Badge>
                      ) : leader.isJailed ? (
                        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px]">
                          Jailed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {assigned ? (
                        <button
                          onClick={() => handleCopyAddress(leader.address)}
                          className="group flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                          title={leader.address}
                        >
                          {formatAddress(leader.address)}
                          {copiedAddress === leader.address ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {canManageFamilyLeaders && (
                      <TableCell className="text-right">
                        {slotManageable ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => openLeaderManageDialog(leader)}
                          >
                            <UserCog className="h-3 w-3" />
                            {assigned ? "Change" : "Assign"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={leaderManageOpen} onOpenChange={setLeaderManageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign {leaderManageRoleLabel}</DialogTitle>
            <DialogDescription>
              {leaderManageIndex === 0
                ? "Choose any family member for the Don position."
                : "Choose a family member. The Don cannot be assigned to other leadership roles."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="leader-member-select">Family member</Label>
            {leaderAssignMemberOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No eligible family members found.
              </p>
            ) : (
              <Select
                value={selectedLeaderMember || undefined}
                onValueChange={setSelectedLeaderMember}
                disabled={updateLeaderLoading}
              >
                <SelectTrigger id="leader-member-select">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {leaderAssignMemberOptions.map((m) => (
                    <SelectItem key={m.address} value={m.address}>
                      {m.name} · Lvl {m.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {updateLeaderError && (
            <p className="text-xs text-red-400">
              {updateLeaderError.message.split("\n")[0]}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setLeaderManageOpen(false)}
              disabled={updateLeaderLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFamilyLeader}
              disabled={updateLeaderLoading || !selectedLeaderMember}
              className="gap-1.5"
            >
              {updateLeaderLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCog className="h-4 w-4" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Successor */}
      {family.successor && family.successor.address && family.successor.address !== "0x0000000000000000000000000000000000000000" && (
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Shield className="h-4 w-4 text-amber-500" />
              Successor
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Role</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getRoleIcon("Heir")}
                    <Badge variant="outline" className={cn("text-[10px]", getRoleBadgeClass("Heir"))}>
                      Heir
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {family.successor.name || "Unknown"}
                  <StatusIndicators isJailed={family.successor.isJailed} isDead={family.successor.isDead} />
                </TableCell>
                <TableCell className="text-center font-mono text-sm">{family.successor.level}</TableCell>
                <TableCell>
                  {family.successor.isDead ? (
                    <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-[10px]">
                      Dead
                    </Badge>
                  ) : family.successor.isJailed ? (
                    <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px]">
                      Jailed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-[10px]">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => handleCopyAddress(family.successor.address)}
                    className="group flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title={family.successor.address}
                  >
                    {formatAddress(family.successor.address)}
                    {copiedAddress === family.successor.address ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Members Table */}
      {regularMembers.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <User className="h-4 w-4 text-primary" />
              Members ({regularMembers.length})
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regularMembers.map((member) => (
                <TableRow key={member.address}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {member.name || "Unknown"}
                      <StatusIndicators isJailed={member.isJailed} isDead={member.isDead} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">{member.level}</TableCell>
                  <TableCell>
                    {member.isDead ? (
                      <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-[10px]">
                        Dead
                      </Badge>
                    ) : member.isJailed ? (
                      <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-[10px]">
                        Jailed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{member.country || "—"}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleCopyAddress(member.address)}
                      className="group flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                      title={member.address}
                    >
                      {formatAddress(member.address)}
                      {copiedAddress === member.address ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
