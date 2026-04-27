"use client";

import { useAuth } from "@/components/auth-provider";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { useToast } from "@/hooks/use-toast";
import {
  INGAME_CURRENCY_ABI,
  RACE_LOBBY_ABI,
  TRAVEL_DESTINATIONS,
  USER_PROFILE_CONTRACT_ABI
} from "@/lib/contract";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Ban,
  Car,
  Clock,
  DollarSign,
  Eye,
  Flag,
  Heart,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trophy
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeEventLog, formatEther, maxUint256, parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";

// ── Types ───────────────────────────────────────────────────────
enum RaceStatus {
  Pending = 0,
  Started = 1,
  Finished = 2,
  Cancelled = 3,
}

enum PrizeType {
  OpponentCar = 0,
  GameCash = 1,
}

enum RaceResult {
  Pending = 0,
  WinnerWithNoCrash = 1,
  WinnerWithCrash = 2,
  BothCrash = 3,
}

interface Race {
  id: bigint;
  startTime: bigint;
  endTime: bigint;
  creator: string;
  opponent: string;
  winner: string;
  creatorCarId: bigint;
  opponentCarId: bigint;
  cashAmount: bigint;
  creatorHealthLost: bigint;
  opponentHealthLost: bigint;
  cityId: number;
  prizeType: number;
  result: number;
  status: number;
}

interface CarItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId: number;
  car: {
    id: number;
    brand: string;
    carName: string;
    image: string;
    qualityLvl: number;
    basePrice: number;
    speed: number;
    seats: number;
  };
  damagePercent: number;
}

interface ProfileData {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
}

type RawRace = Partial<Record<keyof Race, unknown>> & {
  creatorCarDamagePercent?: unknown;
  opponentCarDamagePercent?: unknown;
};

// ── Script loader ───────────────────────────────────────────────
function useInventoryScript() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.MafiaInventory) {
      setReady(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="/js/mafia-utils.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setError("Failed to load inventory script");
    document.head.appendChild(script);
  }, []);

  return { ready, error };
}

// ── Constants ───────────────────────────────────────────────────
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const RACES_PER_PAGE = 9;
const NEXT_RACE_TIME_ABI = [
  {
    type: "function",
    name: "nextRaceTime",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const RACE_FINISHED_EVENT_ABI = [
  {
    type: "event",
    name: "RaceFinished",
    inputs: [
      { name: "raceId", type: "uint256", indexed: false },
      { name: "winner", type: "address", indexed: false },
      { name: "result", type: "uint8", indexed: false },
      { name: "creator", type: "address", indexed: false },
      { name: "opponent", type: "address", indexed: false },
      { name: "winnerCashProfit", type: "uint256", indexed: false },
      { name: "creatorCarId", type: "uint256", indexed: false },
      { name: "opponentCarId", type: "uint256", indexed: false },
      { name: "creatorHealthLost", type: "uint256", indexed: false },
      { name: "opponentHealthLost", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

// ── Helpers ─────────────────────────────────────────────────────
function getCityName(cityId: number): string {
  if (cityId >= 0 && cityId < TRAVEL_DESTINATIONS.length) {
    return TRAVEL_DESTINATIONS[cityId].label;
  }
  return `City #${cityId}`;
}

function getStatusLabel(status: number): { label: string; color: string } {
  switch (status) {
    case RaceStatus.Pending:
      return { label: "Pending", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" };
    case RaceStatus.Started:
      return { label: "Started", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    case RaceStatus.Finished:
      return { label: "Finished", color: "bg-green-500/10 text-green-400 border-green-500/30" };
    case RaceStatus.Cancelled:
      return { label: "Cancelled", color: "bg-red-500/10 text-red-400 border-red-500/30" };
    default:
      return { label: `Status ${status}`, color: "bg-muted text-muted-foreground border-border" };
  }
}

function getPrizeTypeLabel(prizeType: number): string {
  switch (prizeType) {
    case PrizeType.OpponentCar:
      return "Opponent Car";
    case PrizeType.GameCash:
      return "Game Cash";
    default:
      return `Type ${prizeType}`;
  }
}

function getResultLabel(result: number): string {
  switch (result) {
    case RaceResult.Pending:
      return "Pending";
    case RaceResult.WinnerWithNoCrash:
      return "Winner (No Crash)";
    case RaceResult.WinnerWithCrash:
      return "Winner (With Crash)";
    case RaceResult.BothCrash:
      return "Both Crashed";
    default:
      return `Result ${result}`;
  }
}

function isOpenLobbyStatus(status: number): boolean {
  // Current flow: create -> Started, join -> Finished.
  // Keep Pending for backward compatibility with older records.
  return status === RaceStatus.Started || status === RaceStatus.Pending;
}

function toSafeBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.length > 0) {
    try {
      return BigInt(value);
    } catch {
      return BigInt(0);
    }
  }
  return BigInt(0);
}

function toSafeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toSafeAddress(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : ZERO_ADDRESS;
}

function normalizeRace(raw: RawRace): Race {
  return {
    id: toSafeBigInt(raw.id),
    startTime: toSafeBigInt(raw.startTime),
    endTime: toSafeBigInt(raw.endTime),
    creator: toSafeAddress(raw.creator),
    opponent: toSafeAddress(raw.opponent),
    winner: toSafeAddress(raw.winner),
    creatorCarId: toSafeBigInt(raw.creatorCarId),
    opponentCarId: toSafeBigInt(raw.opponentCarId),
    creatorHealthLost: toSafeBigInt(
      raw.creatorHealthLost ?? raw.creatorCarDamagePercent,
    ),
    opponentHealthLost: toSafeBigInt(
      raw.opponentHealthLost ?? raw.opponentCarDamagePercent,
    ),
    cityId: toSafeNumber(raw.cityId),
    prizeType: toSafeNumber(raw.prizeType),
    result: toSafeNumber(raw.result),
    status: toSafeNumber(raw.status),
    cashAmount: toSafeBigInt(raw.cashAmount),
  };
}

function formatHealthLost(value: bigint): string {
  // SDK returns health loss in wei-scaled units (1e18).
  const amount = Number(formatEther(value));
  return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatAddress(address: string): string {
  if (!address || address === ZERO_ADDRESS) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTime(timestamp: bigint): string {
  if (!timestamp || timestamp === BigInt(0)) return "-";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

function getNextRaceTimeLabel(timestamp: bigint): string {
  if (!timestamp || timestamp <= BigInt(0)) return "-";
  const nextTimeMs = Number(timestamp) * 1000;
  if (!Number.isFinite(nextTimeMs)) return "-";
  if (Date.now() >= nextTimeMs) return "Ready now";
  return new Date(nextTimeMs).toLocaleString();
}

function isRaceTimeLocked(timestamp: bigint): boolean {
  if (!timestamp || timestamp <= BigInt(0)) return false;
  const nextTimeMs = Number(timestamp) * 1000;
  if (!Number.isFinite(nextTimeMs)) return false;
  return Date.now() < nextTimeMs;
}

function getRaceTimeLockReason(timestamp: bigint): string {
  return `Next race available at ${getNextRaceTimeLabel(timestamp)}.`;
}

type WinnerState = "PENDING" | "UNSET" | "CREATOR" | "OPPONENT" | "UNKNOWN";

function getWinnerState(race: Race): WinnerState {
  if (Number(race.status) !== RaceStatus.Finished) return "PENDING";

  const winner = (race.winner || "").toLowerCase();
  const creator = (race.creator || "").toLowerCase();
  const opponent = (race.opponent || "").toLowerCase();

  if (!winner || winner === ZERO_ADDRESS.toLowerCase()) return "UNSET";
  if (winner === creator) return "CREATOR";
  if (winner === opponent) return "OPPONENT";
  return "UNKNOWN";
}

function getWinnerDisplay(race: Race): string {
  const state = getWinnerState(race);
  switch (state) {
    case "PENDING":
      return "Pending";
    case "UNSET":
      return "Not Set";
    case "CREATOR":
      return "Creator";
    case "OPPONENT":
      return "Opponent";
    case "UNKNOWN":
      return formatAddress(race.winner);
  }
}

function getActionAvailability(
  race: Race,
  account: string | undefined,
  currentCityId?: number,
): { canJoin: boolean; canCancel: boolean; reason?: string } {
  if (!account) {
    return { canJoin: false, canCancel: false, reason: "Connect wallet" };
  }

  const status = Number(race.status);
  const isCreator = race.creator.toLowerCase() === account.toLowerCase();

  if (isOpenLobbyStatus(status)) {
    if (typeof currentCityId === "number" && race.cityId !== currentCityId) {
      return {
        canJoin: false,
        canCancel: isCreator,
        reason: `You are in ${getCityName(currentCityId)}. Travel to ${getCityName(race.cityId)} to join.`,
      };
    }
    return {
      canJoin: !isCreator && race.opponent === ZERO_ADDRESS,
      canCancel: isCreator,
    };
  }

  return { canJoin: false, canCancel: false };
}

// ── Race Card ───────────────────────────────────────────────────
function RaceCard({
  race,
  account,
  currentCityId,
  nextRaceTime,
  onJoin,
  onCancel,
  onViewDetails,
}: {
  race: Race;
  account: string | undefined;
  currentCityId: number;
  nextRaceTime: bigint;
  onJoin: () => void;
  onCancel: () => void;
  onViewDetails: () => void;
}) {
  const status = getStatusLabel(Number(race.status));
  const { canJoin, canCancel, reason } = getActionAvailability(
    race,
    account,
    currentCityId,
  );
  const raceLocked = isRaceTimeLocked(nextRaceTime);
  const canJoinNow = canJoin && !raceLocked;
  const isFinished = Number(race.status) === RaceStatus.Finished;
  const winnerState = getWinnerState(race);

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Flag className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Race #{Number(race.id)}
            </p>
            <p className="text-xs text-muted-foreground">
              {getCityName(race.cityId)}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-[10px]", status.color)}>
          {status.label}
        </Badge>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-background/50 p-2">
          <p className="text-[10px] text-muted-foreground">Creator</p>
          <p className="text-xs font-mono text-foreground truncate">
            {formatAddress(race.creator)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-2">
          <p className="text-[10px] text-muted-foreground">Opponent</p>
          <p className="text-xs font-mono text-foreground truncate">
            {race.opponent === ZERO_ADDRESS
              ? "Waiting..."
              : formatAddress(race.opponent)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-2">
          <p className="text-[10px] text-muted-foreground">Prize Type</p>
          <p className="text-xs font-medium text-foreground">
            {getPrizeTypeLabel(race.prizeType)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-2">
          <p className="text-[10px] text-muted-foreground">Cash Amount</p>
          <p className="text-xs font-mono text-primary">
            {Number(formatEther(race.cashAmount)).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Winner (for finished races) */}
      {isFinished && (
        <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-2 mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs text-muted-foreground">Winner:</span>
            <span className={cn(
              "text-xs font-medium",
              winnerState === "CREATOR" || winnerState === "OPPONENT"
                ? "text-green-400"
                : "text-muted-foreground"
            )}>
              {getWinnerDisplay(race)}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {canJoinNow && (
          <Button size="sm" onClick={onJoin} className="flex-1 h-8 text-xs gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Join Race
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onCancel}
            className="flex-1 h-8 text-xs gap-1.5"
          >
            <Ban className="h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
        {isFinished && (
          <Button
            size="sm"
            variant="outline"
            onClick={onViewDetails}
            className="flex-1 h-8 text-xs gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            View Details
          </Button>
        )}
        {!canJoinNow && !canCancel && !isFinished && (
          <div className="flex-1 text-center text-xs text-muted-foreground py-2">
            {(raceLocked ? getRaceTimeLockReason(nextRaceTime) : reason) ??
              (isOpenLobbyStatus(Number(race.status))
                ? "Waiting for opponent..."
                : "No actions available")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Race Dialog ──────────────────────────────────────────
function CreateRaceDialog({
  open,
  onOpenChange,
  cars,
  carsLoading,
  cityId,
  cashBalance,
  nextRaceTime,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cars: CarItem[];
  carsLoading: boolean;
  cityId: number;
  cashBalance: bigint;
  nextRaceTime: bigint;
  onSuccess: () => void;
}) {
  const { address } = useAccount();
  const addresses = useChainAddresses();
  const { authData } = useAuth();
  const { toast } = useToast();

  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [prizeType, setPrizeType] = useState<string>(""); // Empty = not selected
  const [cashAmount, setCashAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for active lobby
  const { data: hasActiveLobbyRaw, refetch: refetchActiveLobby } = useReadContract({
    address: addresses.raceLobby,
    abi: RACE_LOBBY_ABI,
    functionName: "hasActiveLobby",
    args: address ? [address] : undefined,
    query: { enabled: !!address && addresses.raceLobby !== ZERO_ADDRESS },
  });
  const hasActiveLobby = hasActiveLobbyRaw as boolean | undefined;

  // Check allowance for cash
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowances",
    args: address && addresses.raceLobby ? [address, addresses.raceLobby] : undefined,
    query: { enabled: !!address && !!addresses.raceLobby && addresses.raceLobby !== ZERO_ADDRESS },
  });
  const allowance = allowanceRaw as bigint | undefined;

  // Approve cash spend
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Create race tx
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useChainWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  // Filter cars in the same city
  const carsInCity = useMemo(
    () => cars.filter((c) => c.cityId === cityId),
    [cars, cityId]
  );

  // Calculate if approval is needed
  const cashAmountWei = useMemo(() => {
    if (prizeType !== "1" || !cashAmount) return BigInt(0);
    try {
      return parseEther(cashAmount);
    } catch {
      return BigInt(0);
    }
  }, [prizeType, cashAmount]);

  const needsApproval = prizeType === "1" && cashAmountWei > BigInt(0);
  const hasEnoughAllowance = allowance !== undefined && allowance >= cashAmountWei;
  const isCashApprovalReady = hasEnoughAllowance || approveSuccess;
  const hasEnoughCash = cashBalance >= cashAmountWei;
  const raceLocked = isRaceTimeLocked(nextRaceTime);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedCarId("");
      setPrizeType("");
      setCashAmount("");
      setIsSubmitting(false);
      reset();
      resetApprove();
    } else {
      // Refetch allowance when dialog opens
      refetchAllowance();
      refetchActiveLobby();
    }
  }, [open, reset, resetApprove, refetchAllowance, refetchActiveLobby]);

  // Handle success
  useEffect(() => {
    if (isSuccess && hash) {
      toast({
        title: "Race Created",
        description: "Your race lobby has been created successfully.",
      });
      setIsSubmitting(false);
      onOpenChange(false);
      onSuccess();
    }
  }, [isSuccess, hash, toast, onOpenChange, onSuccess]);

  // Handle transaction error
  useEffect(() => {
    if (error) {
      setIsSubmitting(false);
    }
  }, [error]);

  // Toast on approve success and refetch allowance
  useEffect(() => {
    if (approveSuccess && approveHash) {
      toast({
        title: "Cash Spend Approved",
        description: "You can now create your race.",
      });
      refetchAllowance();
    }
  }, [approveSuccess, approveHash, toast, refetchAllowance]);

  const approveLoading = approvePending || approveConfirming;
  const isWorking = isPending || isConfirming || isSubmitting;

  function handleApprove() {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.raceLobby, cashAmountWei],
    });
  }

  function handleCreate() {
    if (!authData || !address) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Wallet not connected.",
      });
      return;
    }

    // Validation order per prompt requirements:

    if (raceLocked) {
      toast({
        title: "Race Cooldown Active",
        description: getRaceTimeLockReason(nextRaceTime),
      });
      return;
    }

    // 1. Check active lobby guard
    if (hasActiveLobby) {
      toast({
        title: "Active Lobby Exists",
        description: "You already have an active race lobby. Complete or cancel it first.",
      });
      return;
    }

    // 2. Car selected
    if (!selectedCarId) {
      toast({
        variant: "destructive",
        title: "Invalid Car",
        description: "Please select a car for the race.",
      });
      return;
    }

    // 3. Winner prize selected
    if (!prizeType) {
      toast({
        variant: "destructive",
        title: "Invalid Winner Prize",
        description: "Please select what the winner gets.",
      });
      return;
    }

    // 4. Cash-specific validations (only if prize == Cash)
    if (prizeType === "1") {
      const amount = Number(cashAmount);
      if (!cashAmount || isNaN(amount) || amount <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid Cash Amount",
          description: "Please enter a valid cash amount greater than 0.",
        });
        return;
      }

      if (!hasEnoughCash) {
        toast({
          variant: "destructive",
          title: "Insufficient Cash",
          description: "Cash amount exceeds your balance.",
        });
        return;
      }

      // Check allowance
      if (!isCashApprovalReady) {
        toast({
          title: "Approval Required",
          description: "Please approve cash spend first.",
        });
        return;
      }
    }

    // All validations passed, submit transaction
    setIsSubmitting(true);
    const finalCashAmount = prizeType === "1" ? cashAmountWei : BigInt(0);

    // createRace(uint256 carId, uint256 cashAmount, PrizeType prizeType, string memory message, bytes memory signature)
    writeContract({
      address: addresses.raceLobby,
      abi: RACE_LOBBY_ABI,
      functionName: "createRace",
      args: [
        Number(selectedCarId),
        finalCashAmount,
        Number(prizeType),
        authData.message,
        authData.signature,
      ],
    });
  }

  const canSubmit = (() => {
    if (isWorking) return false;
    if (raceLocked) return false;
    if (hasActiveLobby) return false;
    if (!selectedCarId) return false;
    if (!prizeType) return false;
    if (prizeType === "1") {
      if (!cashAmount || Number(cashAmount) <= 0) return false;
      if (!hasEnoughCash) return false;
      if (!isCashApprovalReady) return false;
    }
    return true;
  })();

  const cashBalanceFormatted = Number(formatEther(cashBalance)).toLocaleString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Race Lobby</DialogTitle>
          <DialogDescription>
            Create a race lobby in {getCityName(cityId)}. Select your car and set the prize.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {raceLocked && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <p className="text-sm text-yellow-400">
                  {getRaceTimeLockReason(nextRaceTime)}
                </p>
              </div>
            </div>
          )}

          {/* Active Lobby Warning */}
          {hasActiveLobby && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <p className="text-sm text-yellow-400">
                  You already have an active race lobby. Cancel it or wait for it to complete.
                </p>
              </div>
            </div>
          )}

          {/* City Display */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">City</span>
              <span className="text-sm font-medium">{getCityName(cityId)}</span>
            </div>
          </div>

          {/* Car Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Select Car
            </label>
            {carsLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-border bg-background/50 p-6">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading your cars...</p>
                </div>
              </div>
            ) : carsInCity.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                <p className="text-sm text-yellow-400">
                  No eligible race cars in {getCityName(cityId)}. Ship a car to this city first.
                </p>
              </div>
            ) : (
              <Select value={selectedCarId} onValueChange={setSelectedCarId} disabled={isWorking}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Car" />
                </SelectTrigger>
                <SelectContent>
                  {carsInCity.map((car) => (
                    <SelectItem key={car.itemId} value={String(car.itemId)}>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span>{car.car.brand} {car.car.carName}</span>
                        <span className="text-xs text-muted-foreground">#{car.itemId}</span>
                        <span className="text-xs text-primary">(Speed: {car.car.speed})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Prize Type */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Winner Gets
            </label>
            <Select value={prizeType} onValueChange={setPrizeType} disabled={isWorking}>
              <SelectTrigger>
                <SelectValue placeholder="Winner gets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>Opponent Car</span>
                  </div>
                </SelectItem>
                <SelectItem value="1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Cash</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cash Amount (when prize type is Cash) */}
          {prizeType === "1" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Cash Amount
                </label>
                <span className="text-xs text-muted-foreground">
                  Balance: {cashBalanceFormatted}
                </span>
              </div>
              <Input
                type="number"
                placeholder="Enter cash amount"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                min="0"
                step="1"
                disabled={isWorking}
              />
              {cashAmount && !hasEnoughCash && (
                <p className="text-xs text-red-400">
                  Amount exceeds your cash balance.
                </p>
              )}
            </div>
          )}

          {/* Approval Step (for cash bets) */}
          {needsApproval && (
            <div
              className={cn(
                "rounded-lg border p-3",
                isCashApprovalReady
                  ? "border-green-500/30 bg-green-500/5"
                  : approveError
                    ? "border-red-400/30 bg-red-400/5"
                    : "border-chain-accent/30 bg-chain-accent/5",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isCashApprovalReady
                      ? "bg-green-500/20 text-green-400"
                      : "bg-chain-accent/20 text-chain-accent",
                  )}
                >
                  {isCashApprovalReady ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    "1"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isCashApprovalReady ? "text-green-400" : "text-foreground",
                    )}
                  >
                    {isCashApprovalReady
                      ? "Cash Spend Approved"
                      : "Approve Cash Spend"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isCashApprovalReady
                      ? "Approval confirmed. You can now create your race."
                      : "You must approve cash spend before creating the race."}
                  </p>

                  {!isCashApprovalReady && (
                    <Button
                      size="sm"
                      onClick={handleApprove}
                      disabled={approveLoading || isWorking}
                      className="mt-2 h-8 gap-1.5 text-xs"
                    >
                      {approveLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {approvePending ? "Confirm in wallet..." : "Approving..."}
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Approve
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {(error || approveError) && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-sm text-red-400">
                {(error || approveError)?.message.includes("User rejected")
                  ? "Transaction rejected"
                  : (error || approveError)?.message.split("\n")[0]}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isWorking}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canSubmit}
            className="gap-1.5"
          >
            {isWorking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isPending ? "Confirm in wallet..." : "Creating..."}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Race Lobby
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Join Race Dialog ────────────────────────────────────────────
function JoinRaceDialog({
  open,
  onOpenChange,
  race,
  cars,
  currentCityId,
  nextRaceTime,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  race: Race | null;
  cars: CarItem[];
  currentCityId: number;
  nextRaceTime: bigint;
  onSuccess: (raceId?: bigint, finishedRace?: Race) => void;
}) {
  const addresses = useChainAddresses();
  const { authData } = useAuth();
  const { toast } = useToast();

  const [selectedCarId, setSelectedCarId] = useState<string>("");

  // Approve cash spend
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Join race tx
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useChainWriteContract();
  const { data: joinReceipt, isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  // Filter cars in the same city as the race
  const carsInCity = useMemo(
    () => (race ? cars.filter((c) => c.cityId === race.cityId) : []),
    [cars, race]
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedCarId("");
      reset();
      resetApprove();
    }
  }, [open, reset, resetApprove]);

  // Handle success
  useEffect(() => {
    if (isSuccess && hash) {
      let finishedRaceFromEvent: Race | undefined;

      if (joinReceipt) {
        for (const log of joinReceipt.logs) {
          if (log.address.toLowerCase() !== addresses.raceLobby.toLowerCase()) {
            continue;
          }

          try {
            const decoded = decodeEventLog({
              abi: RACE_FINISHED_EVENT_ABI,
              data: log.data,
              topics: log.topics,
              strict: false,
            });

            if (decoded.eventName !== "RaceFinished") continue;

            const eventArgs = (decoded.args ?? {}) as Record<string, unknown>;
            const eventRaceId = toSafeBigInt(eventArgs.raceId);

            if (!race || eventRaceId !== race.id) continue;

            finishedRaceFromEvent = {
              ...race,
              id: eventRaceId,
              winner: toSafeAddress(eventArgs.winner),
              result: toSafeNumber(eventArgs.result),
              creator: toSafeAddress(eventArgs.creator),
              opponent: toSafeAddress(eventArgs.opponent),
              creatorCarId: toSafeBigInt(eventArgs.creatorCarId),
              opponentCarId: toSafeBigInt(eventArgs.opponentCarId),
              creatorHealthLost: toSafeBigInt(eventArgs.creatorHealthLost),
              opponentHealthLost: toSafeBigInt(eventArgs.opponentHealthLost),
              endTime: toSafeBigInt(eventArgs.timestamp),
              status: RaceStatus.Finished,
            };
            break;
          } catch {
            // Ignore unrelated logs and continue scanning.
          }
        }
      }

      toast({
        title: "Joined Race",
        description: `You have joined race #${race?.id ? Number(race.id) : ""}.`,
      });
      onOpenChange(false);
      onSuccess(race?.id, finishedRaceFromEvent);
    }
  }, [isSuccess, hash, race, toast, onOpenChange, onSuccess, joinReceipt, addresses.raceLobby]);

  // Toast on approve success
  useEffect(() => {
    if (approveSuccess && approveHash) {
      toast({
        title: "Cash Spend Approved",
        description: "You can now join the race.",
      });
    }
  }, [approveSuccess, approveHash, toast]);

  if (!race) return null;

  const isDifferentCity = race.cityId !== currentCityId;
  const raceLocked = isRaceTimeLocked(nextRaceTime);
  const needsApproval = race.prizeType === PrizeType.GameCash && race.cashAmount > BigInt(0);
  const approveLoading = approvePending || approveConfirming;
  const isWorking = isPending || isConfirming;

  function handleApprove() {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.raceLobby, maxUint256],
    });
  }

  function handleJoin() {
    if (!authData || !selectedCarId || !race || isDifferentCity || raceLocked) return;

    writeContract({
      address: addresses.raceLobby,
      abi: RACE_LOBBY_ABI,
      functionName: "joinRace",
      args: [
        race.id,
        BigInt(selectedCarId),
        authData.message,
        authData.signature,
      ],
    });
  }

  const canSubmit = (() => {
    if (isWorking) return false;
    if (raceLocked) return false;
    if (isDifferentCity) return false;
    if (!selectedCarId) return false;
    if (needsApproval && !approveSuccess) return false;
    return true;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Race #{Number(race.id)}</DialogTitle>
          <DialogDescription>
            Join this race in {getCityName(race.cityId)}. Select your car to compete.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {raceLocked && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
              <p className="text-sm text-yellow-400">
                {getRaceTimeLockReason(nextRaceTime)}
              </p>
            </div>
          )}

          {isDifferentCity && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
              <p className="text-sm text-yellow-400">
                You are in {getCityName(currentCityId)}. Travel to {getCityName(race.cityId)} to join this race.
              </p>
            </div>
          )}

          {/* Race Info */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Prize Type:</span>{" "}
                <span className="font-medium">{getPrizeTypeLabel(race.prizeType)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cash:</span>{" "}
                <span className="font-mono text-primary">
                  {Number(formatEther(race.cashAmount)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Car Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Select Your Car
            </label>
            {carsInCity.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                <p className="text-sm text-yellow-400">
                  No cars available in {getCityName(race.cityId)}. Ship a car to this city first.
                </p>
              </div>
            ) : (
              <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a car" />
                </SelectTrigger>
                <SelectContent>
                  {carsInCity.map((car) => (
                    <SelectItem key={car.itemId} value={String(car.itemId)}>
                      {car.car.brand} #{car.itemId} (Speed: {car.car.speed})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Approval Step */}
          {needsApproval && (
            <div
              className={cn(
                "rounded-lg border p-3",
                approveSuccess
                  ? "border-green-500/30 bg-green-500/5"
                  : approveError
                    ? "border-red-400/30 bg-red-400/5"
                    : "border-chain-accent/30 bg-chain-accent/5",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    approveSuccess
                      ? "bg-green-500/20 text-green-400"
                      : "bg-chain-accent/20 text-chain-accent",
                  )}
                >
                  {approveSuccess ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    "1"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      approveSuccess ? "text-green-400" : "text-foreground",
                    )}
                  >
                    {approveSuccess
                      ? "Cash Spend Approved"
                      : "Approve Cash Spend"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Match the race bet of {Number(formatEther(race.cashAmount)).toLocaleString()} cash.
                  </p>

                  {!approveSuccess && (
                    <Button
                      size="sm"
                      onClick={handleApprove}
                      disabled={approveLoading}
                      className="mt-2 h-8 gap-1.5 text-xs"
                    >
                      {approveLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {approvePending ? "Confirm in wallet..." : "Approving..."}
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Approve
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-sm text-red-400">
                {error.message.includes("User rejected")
                  ? "Transaction rejected"
                  : error.message.split("\n")[0]}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isWorking}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={!canSubmit}
            className="gap-1.5"
          >
            {isWorking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isPending ? "Confirm in wallet..." : "Joining..."}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Join Race
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Cancel Race Dialog ──────────────────────────────────────────
function CancelRaceDialog({
  open,
  onOpenChange,
  race,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  race: Race | null;
  onSuccess: () => void;
}) {
  const addresses = useChainAddresses();
  const { authData } = useAuth();
  const { toast } = useToast();

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useChainWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (isSuccess && hash) {
      toast({
        title: "Race Cancelled",
        description: `Race #${race?.id ? Number(race.id) : ""} has been cancelled.`,
      });
      onOpenChange(false);
      onSuccess();
    }
  }, [isSuccess, hash, race, toast, onOpenChange, onSuccess]);

  if (!race) return null;

  const isWorking = isPending || isConfirming;

  function handleCancel() {
    if (!authData || !race) return;

    writeContract({
      address: addresses.raceLobby,
      abi: RACE_LOBBY_ABI,
      functionName: "cancelRace",
      args: [race.id],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Race #{Number(race.id)}</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this race? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <p className="text-sm text-red-400">
              {error.message.includes("User rejected")
                ? "Transaction rejected"
                : error.message.split("\n")[0]}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isWorking}
          >
            Keep Race
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isWorking}
            className="gap-1.5"
          >
            {isWorking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isPending ? "Confirm in wallet..." : "Cancelling..."}
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" />
                Cancel Race
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Race Details Dialog ─────────────────────────────────────────
function RaceDetailsDialog({
  open,
  onOpenChange,
  race,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  race: Race | null;
}) {
  if (!race) return null;

  const status = getStatusLabel(Number(race.status));
  const winnerState = getWinnerState(race);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Race #{Number(race.id)} Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
          </div>

          {/* City */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">City</span>
            <span className="text-sm font-medium">{getCityName(race.cityId)}</span>
          </div>

          {/* Participants */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Participants</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Creator</p>
                <p className="text-xs font-mono text-foreground">{formatAddress(race.creator)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Car #{Number(race.creatorCarId)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Opponent</p>
                <p className="text-xs font-mono text-foreground">
                  {race.opponent === ZERO_ADDRESS ? "None" : formatAddress(race.opponent)}
                </p>
                {race.opponent !== ZERO_ADDRESS && (
                  <p className="text-[10px] text-muted-foreground mt-1">Car #{Number(race.opponentCarId)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Prize */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Prize</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">{getPrizeTypeLabel(race.prizeType)}</span>
              <span className="text-sm font-mono text-primary">
                {Number(formatEther(race.cashAmount)).toLocaleString()} cash
              </span>
            </div>
          </div>

          {/* Winner (for finished races, except both crashed) */}
          {Number(race.status) === RaceStatus.Finished &&
            Number(race.result) !== RaceResult.BothCrash && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Winner</span>
                </div>
                <p className="text-sm">
                  {winnerState === "CREATOR" && "Creator"}
                  {winnerState === "OPPONENT" && "Opponent"}
                  {winnerState === "UNSET" && "Not Set"}
                  {winnerState === "UNKNOWN" && formatAddress(race.winner)}
                  {winnerState === "PENDING" && "Pending"}
                </p>
                {race.winner && race.winner !== ZERO_ADDRESS && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">{race.winner}</p>
                )}
              </div>
            )}

          {/* Health Lost */}
          {Number(race.status) === RaceStatus.Finished && (
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Health Lost</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs">
                    Creator: {formatHealthLost(race.creatorHealthLost)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs">
                    Opponent: {formatHealthLost(race.opponentHealthLost)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {Number(race.status) === RaceStatus.Finished && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Result</span>
              <span className="text-sm font-medium">{getResultLabel(race.result)}</span>
            </div>
          )}

          {/* Timestamps */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Timeline</p>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Time</span>
                <span>{formatTime(race.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Time</span>
                <span>{formatTime(race.endTime)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function RacingAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const { authData, isSigning, signError, requestSignature } = useAuth();
  const { toast } = useToast();
  const { ready: scriptReady, error: scriptError } = useInventoryScript();

  // View state
  const [showHistory, setShowHistory] = useState(false);
  const [showMyRaces, setShowMyRaces] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinRace, setJoinRace] = useState<Race | null>(null);
  const [cancelRace, setCancelRace] = useState<Race | null>(null);
  const [detailsRace, setDetailsRace] = useState<Race | null>(null);
  const [pendingResultRaceId, setPendingResultRaceId] = useState<bigint | null>(null);

  // Data state
  const [allRaces, setAllRaces] = useState<Race[]>([]);
  const [racesLoading, setRacesLoading] = useState(true);
  const [cars, setCars] = useState<CarItem[]>([]);
  const [carsLoading, setCarsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedRacesRef = useRef(false);

  // Get user profile for city
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

  const profile = profileRaw as ProfileData | undefined;
  const cityId = profile?.cityId ?? 0;
  const cityName = getCityName(cityId);

  // Get races from SDK race lobbies
  const fetchRaces = useCallback(async () => {
    if (!scriptReady) return;
    if (!window.MafiaRaceLobby) {
      setAllRaces([]);
      setRacesLoading(false);
      return;
    }

    setRacesLoading(true);
    try {
      const races = await window.MafiaRaceLobby.getRaces({
        chain: chainConfig.id === "bnb" ? "bnb" : "pls",
        pageSize: 200,
      });

      const list = Array.isArray(races) ? races : [];
      const statusCounts = { pending: 0, started: 0, finished: 0, cancelled: 0 };
      list.forEach((r) => {
        const status = toSafeNumber(r.status);
        if (status === RaceStatus.Pending) statusCounts.pending++;
        else if (status === RaceStatus.Started) statusCounts.started++;
        else if (status === RaceStatus.Finished) statusCounts.finished++;
        else if (status === RaceStatus.Cancelled) statusCounts.cancelled++;
      });

      const normalized = list
        .map((r) => normalizeRace(r));

      setAllRaces(normalized);
    } catch (err) {
      console.error("Failed to fetch race lobbies:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load race lobbies.",
      });
    } finally {
      setRacesLoading(false);
    }
  }, [scriptReady, chainConfig.id, cityId, toast]);

  // Get user cash balance
  const { data: cashBalanceRaw, refetch: refetchCashBalance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args: authData && address
      ? [address, authData.message, authData.signature]
      : undefined,
    query: { enabled: !!authData && !!address },
  });
  const cashBalance = (cashBalanceRaw as bigint) ?? BigInt(0);

  // Next race time per account
  const { data: nextRaceTimeRaw, refetch: refetchNextRaceTime } = useReadContract({
    address: addresses.raceLobby,
    abi: NEXT_RACE_TIME_ABI,
    functionName: "nextRaceTime",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && addresses.raceLobby !== ZERO_ADDRESS,
      refetchInterval: 30000,
    },
  });
  const nextRaceTime = (nextRaceTimeRaw as bigint | undefined) ?? BigInt(0);
  const raceLocked = isRaceTimeLocked(nextRaceTime);

  // Filter races based on view mode
  const filteredRaces = useMemo(() => {
    let races = [...allRaces];

    // Filter by status (active vs history)
    if (showHistory) {
      races = races.filter(
        (r) =>
          Number(r.status) === RaceStatus.Finished ||
          Number(r.status) === RaceStatus.Cancelled
      );
    } else {
      races = races.filter(
        (r) => isOpenLobbyStatus(Number(r.status))
      );
    }

    // Filter by "my races"
    if (showMyRaces && address) {
      const addr = address.toLowerCase();
      races = races.filter(
        (r) =>
          r.creator.toLowerCase() === addr ||
          r.opponent.toLowerCase() === addr
      );
    }

    // Sort by ID descending (newest first)
    races.sort((a, b) => Number(b.id) - Number(a.id));

    return races;
  }, [allRaces, showHistory, showMyRaces, address]);

  const totalPages = Math.max(1, Math.ceil(filteredRaces.length / RACES_PER_PAGE));
  const paginatedRaces = useMemo(() => {
    const start = (currentPage - 1) * RACES_PER_PAGE;
    return filteredRaces.slice(start, start + RACES_PER_PAGE);
  }, [filteredRaces, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [showHistory, showMyRaces, address, filteredRaces.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Fetch cars
  const fetchCars = useCallback(async () => {
    if (!address || !scriptReady || !window.MafiaInventory) return;

    setCarsLoading(true);
    try {
      const items = await window.MafiaInventory.getItemsByCategory({
        chain: chainConfig.id === "bnb" ? "bnb" : "pls",
        contractAddress: addresses.inventory,
        categoryId: 15, // CAR_ITEM
        maxItems: Number.MAX_SAFE_INTEGER,
      });

      const ownedCars = items.filter(
        (item) => item.owner.toLowerCase() === address.toLowerCase()
      );
      setCars(ownedCars);
    } catch (err) {
      console.error("Failed to fetch cars:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load your cars.",
      });
    } finally {
      setCarsLoading(false);
    }
  }, [address, scriptReady, chainConfig.id, addresses.inventory, toast]);

  // Load cars on mount
  useEffect(() => {
    if (scriptReady && address) {
      fetchCars();
    }
  }, [scriptReady, address, fetchCars, refreshKey]);

  // Load race lobbies once on initial page load
  useEffect(() => {
    if (!scriptReady || !window.MafiaRaceLobby || hasLoadedRacesRef.current) return;
    hasLoadedRacesRef.current = true;
    fetchRaces();
  }, [scriptReady, fetchRaces]);

  const handleRefresh = useCallback(() => {
    fetchRaces();
    refetchCashBalance();
    refetchNextRaceTime();
    fetchCars();
    setRefreshKey((k) => k + 1);
  }, [fetchRaces, refetchCashBalance, refetchNextRaceTime, fetchCars]);

  const handleSuccess = useCallback((raceId?: bigint, finishedRace?: Race) => {
    if (finishedRace) {
      setDetailsRace(finishedRace);
      setPendingResultRaceId(null);
    } else if (typeof raceId === "bigint") {
      setPendingResultRaceId(raceId);
    }
    handleRefresh();
  }, [handleRefresh]);

  useEffect(() => {
    if (pendingResultRaceId === null) return;

    const updatedRace = allRaces.find((r) => r.id === pendingResultRaceId);
    if (!updatedRace) return;

    if (Number(updatedRace.status) === RaceStatus.Finished) {
      setDetailsRace(updatedRace);
      setPendingResultRaceId(null);
    }
  }, [pendingResultRaceId, allRaces]);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Flag className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Racing</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to view and participate in races.
        </p>
      </div>
    );
  }

  // Signing state
  if (isSigning) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Sign to Verify</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please sign the message in your wallet.
        </p>
      </div>
    );
  }

  // Sign error state
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
        <Button onClick={requestSignature}>Sign Message</Button>
      </div>
    );
  }

  // Zero address check
  if (addresses.raceLobby === ZERO_ADDRESS) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-yellow-400" />
        <p className="text-lg font-semibold text-foreground">
          Racing Not Available
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The race lobby contract is not deployed on this chain yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Racing - {cityName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filteredRaces.length} race{filteredRaces.length !== 1 ? "s" : ""}{" "}
            {showHistory ? "in history" : "active"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Next race time: {getNextRaceTimeLabel(nextRaceTime)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={racesLoading || carsLoading}
            className="h-9 gap-1.5"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                (racesLoading || carsLoading) && "animate-spin"
              )}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            disabled={raceLocked}
            className="h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Race Lobby
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Tabs
          value={showHistory ? "history" : "active"}
          onValueChange={(v) => setShowHistory(v === "history")}
        >
          <TabsList className="h-8">
            <TabsTrigger value="active" className="text-xs px-3 h-7">
              Active
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs px-3 h-7">
              Track History
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs
          value={showMyRaces ? "mine" : "all"}
          onValueChange={(v) => setShowMyRaces(v === "mine")}
        >
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-7">
              All Races
            </TabsTrigger>
            <TabsTrigger value="mine" className="text-xs px-3 h-7">
              My Races
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="p-4">
        {racesLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading races...</p>
          </div>
        ) : filteredRaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Flag className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No races found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {showHistory
                ? "No completed races yet."
                : showMyRaces
                  ? "You haven't joined any races yet."
                  : "Be the first to create a race!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedRaces.map((race) => (
              <RaceCard
                key={Number(race.id)}
                race={race}
                account={address}
                currentCityId={cityId}
                nextRaceTime={nextRaceTime}
                onJoin={() => setJoinRace(race)}
                onCancel={() => setCancelRace(race)}
                onViewDetails={() => setDetailsRace(race)}
              />
            ))}
          </div>
        )}

        {!racesLoading && filteredRaces.length > 0 && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateRaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        cars={cars}
        carsLoading={carsLoading}
        cityId={cityId}
        cashBalance={cashBalance}
        nextRaceTime={nextRaceTime}
        onSuccess={handleSuccess}
      />

      <JoinRaceDialog
        open={!!joinRace}
        onOpenChange={(open) => !open && setJoinRace(null)}
        race={joinRace}
        cars={cars}
        currentCityId={cityId}
        nextRaceTime={nextRaceTime}
        onSuccess={handleSuccess}
      />

      <CancelRaceDialog
        open={!!cancelRace}
        onOpenChange={(open) => !open && setCancelRace(null)}
        race={cancelRace}
        onSuccess={handleSuccess}
      />

      <RaceDetailsDialog
        open={!!detailsRace}
        onOpenChange={(open) => !open && setDetailsRace(null)}
        race={detailsRace}
      />
    </div>
  );
}
