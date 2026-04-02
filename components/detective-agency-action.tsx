"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
  useSignMessage,
  usePublicClient,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  DETECTIVE_AGENCY_ABI,
  DETECTIVE_HIRING_TIME,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
  USER_PROFILE_CONTRACT_ABI,
  TRAVEL_DESTINATIONS,
} from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Coins,
  RefreshCw,
  Users,
  Eye,
  EyeOff,
  Clock,
  Target,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseUnits, formatEther } from "viem";

// Detective hire status enum matching contract
enum DetectiveHireStatus {
  Pending = 0,
  Success = 1,
  Failed = 2,
}

interface DetectiveHire {
  hireId: number;
  cityId: number;
  target: string;
  user: string;
  requestBlock: bigint;
  detectiveCount: bigint;
  startedAt: bigint;
  targetNumber: bigint;
  totalCost: bigint;
  status: DetectiveHireStatus;
  isTargetRevealed: boolean;
  targetCityId: number;
}

interface ProfileData {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getCityName(cityId: number): string {
  if (cityId < TRAVEL_DESTINATIONS.length) {
    return TRAVEL_DESTINATIONS[cityId].label;
  }
  return `City #${cityId}`;
}

export function DetectiveAgencyAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData, isSigning: authSigning, signError, requestSignature } = useAuth();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();

  // ---------- Profile ----------
  const { data: profileRaw, isLoading: profileLoading } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address },
  });
  const profile = profileRaw as ProfileData | undefined;
  const cityId = profile?.cityId;
  const cityName = profile && profile.cityId < TRAVEL_DESTINATIONS.length
    ? TRAVEL_DESTINATIONS[profile.cityId].label
    : profile ? `City #${profile.cityId}` : null;

  // ---------- Detective cost for current city ----------
  const [detectiveCost, setDetectiveCost] = useState<bigint | null>(null);
  const [costLoading, setCostLoading] = useState(false);

  const fetchDetectiveCost = useCallback(async () => {
    if (cityId === undefined || !publicClient) return;
    setCostLoading(true);
    try {
      const result = await publicClient.readContract({
        address: addresses.detectiveAgency,
        abi: DETECTIVE_AGENCY_ABI,
        functionName: "getCityDetectiveCost",
        args: [cityId],
      });
      setDetectiveCost(result as bigint);
    } catch (e) {
      console.error("Failed to fetch detective cost:", e);
    } finally {
      setCostLoading(false);
    }
  }, [cityId, publicClient, addresses.detectiveAgency]);

  useEffect(() => {
    fetchDetectiveCost();
  }, [fetchDetectiveCost]);

  // ---------- Max detective count ----------
  const { data: maxDetectiveCountRaw } = useReadContract({
    address: addresses.detectiveAgency,
    abi: DETECTIVE_AGENCY_ABI,
    functionName: "maxDetectiveCount",
    query: { enabled: !!addresses.detectiveAgency },
  });
  const maxDetectives = maxDetectiveCountRaw ? Number(maxDetectiveCountRaw) : 10;

  // ---------- Hire form state ----------
  const [targetAddress, setTargetAddress] = useState("");
  const [detectiveCount, setDetectiveCount] = useState("1");
  const [hireSigning, setHireSigning] = useState(false);

  const isValidTarget = targetAddress.length === 42 && targetAddress.startsWith("0x");
  const isValidCount =
    detectiveCount.length > 0 &&
    Number(detectiveCount) >= 1 &&
    Number(detectiveCount) <= maxDetectives &&
    Number.isInteger(Number(detectiveCount));

  const totalCost = detectiveCost !== null && isValidCount
    ? detectiveCost * BigInt(detectiveCount)
    : null;

  // ---------- Step 1: Approve cash ----------
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
      args: [addresses.detectiveAgency, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const approveLoading = approvePending || approveConfirming;

  // ---------- Step 2: Request hire ----------
  const {
    writeContract: writeHire,
    data: hireHash,
    isPending: hirePending,
    error: hireError,
    reset: resetHire,
  } = useChainWriteContract();

  const { isLoading: hireConfirming, isSuccess: hireSuccess } =
    useWaitForTransactionReceipt({ hash: hireHash });

  const handleRequestHire = async () => {
    if (!isValidTarget || !isValidCount || !address) return;
    resetHire();
    setHireSigning(true);
    try {
      const threeDaysInSeconds = 3 * 24 * 60 * 60;
      const utcTimestamp = Math.floor(Date.now() / 1000) + threeDaysInSeconds;
      const authMessage = `"Sign this message with ${address} - expire at ${utcTimestamp}"`;
      const signature = await signMessageAsync({ message: authMessage });
      setHireSigning(false);

      writeHire({
        address: addresses.detectiveAgency,
        abi: DETECTIVE_AGENCY_ABI,
        functionName: "requestHireDetective",
        args: [targetAddress as `0x${string}`, BigInt(detectiveCount), authMessage, signature],
      });
    } catch {
      setHireSigning(false);
    }
  };

  const hireLoading = hireSigning || hirePending || hireConfirming;

  // ---------- Hire toast ----------
  const hireToastFired = useRef(false);
  useEffect(() => {
    if (hireSuccess && hireHash && !hireToastFired.current) {
      hireToastFired.current = true;
      toast.success("Detective hire requested successfully");
      fetchHireList();
    }
    if (!hireHash) hireToastFired.current = false;
  }, [hireSuccess, hireHash]);

  // ---------- Approve toast ----------
  const approveToastFired = useRef(false);
  useEffect(() => {
    if (approveSuccess && approveHash && !approveToastFired.current) {
      approveToastFired.current = true;
      toast.success("Cash spending approved for Detective Agency");
    }
    if (!approveHash) approveToastFired.current = false;
  }, [approveSuccess, approveHash]);

  // ---------- Detective hire list ----------
  const [hireList, setHireList] = useState<DetectiveHire[]>([]);
  const [hireListLoading, setHireListLoading] = useState(false);
  const [hireListFetching, setHireListFetching] = useState(false);

  const fetchHireList = useCallback(async () => {
    if (!address || !authData || !publicClient) return;
    console.log("[v0] fetchHireList called with:", {
      address,
      detectiveAgency: addresses.detectiveAgency,
      authMessage: authData.message,
      authSigLen: authData.signature?.length,
    });
    setHireListFetching(true);
    try {
      const allHires: DetectiveHire[] = [];
      const pageSize = 20;
      let startIndex = 0;

      while (true) {
        console.log("[v0] Fetching hires page, startIndex:", startIndex, "pageSize:", pageSize);
        const result = await publicClient.readContract({
          address: addresses.detectiveAgency,
          abi: DETECTIVE_AGENCY_ABI,
          functionName: "getUserDetectiveHires",
          args: [address, startIndex, pageSize, authData.message, authData.signature],
        });

        console.log("[v0] getUserDetectiveHires raw result:", JSON.stringify(result, (_, v) => typeof v === "bigint" ? v.toString() : v));

        const [hireIds, list] = result as [number[], readonly unknown[]];

        console.log("[v0] hireIds:", hireIds, "hireIds type:", typeof hireIds, "Array.isArray:", Array.isArray(hireIds));
        console.log("[v0] hireIds length:", hireIds?.length, "list length:", (list as unknown[])?.length);

        if (!hireIds || hireIds.length === 0) {
          console.log("[v0] No more hireIds, breaking");
          break;
        }

        for (let i = 0; i < hireIds.length; i++) {
          const item = list[i] as {
            cityId: number;
            target: string;
            user: string;
            requestBlock: bigint;
            detectiveCount: bigint;
            startedAt: bigint;
            targetNumber: bigint;
            totalCost: bigint;
            status: number;
            isTargetRevealed: boolean;
            targetCityId: number;
          };
          console.log("[v0] Hire item", i, ":", JSON.stringify(item, (_, v) => typeof v === "bigint" ? v.toString() : v));
          allHires.push({
            hireId: Number(hireIds[i]),
            cityId: item.cityId,
            target: item.target,
            user: item.user,
            requestBlock: item.requestBlock,
            detectiveCount: item.detectiveCount,
            startedAt: item.startedAt,
            targetNumber: item.targetNumber,
            totalCost: item.totalCost,
            status: item.status as DetectiveHireStatus,
            isTargetRevealed: item.isTargetRevealed,
            targetCityId: item.targetCityId,
          });
        }

        if (hireIds.length < pageSize) break;
        startIndex += pageSize;
      }

      console.log("[v0] Total hires fetched:", allHires.length);
      // Reverse so newest first
      setHireList(allHires.reverse());
    } catch (e) {
      console.error("[v0] Failed to fetch hire list:", e);
      console.error("[v0] Error details:", (e as Error)?.message, (e as Error)?.stack);
    } finally {
      setHireListFetching(false);
      setHireListLoading(false);
    }
  }, [address, authData, publicClient, addresses.detectiveAgency]);

  useEffect(() => {
    if (!address || !authData || !publicClient) return;
    setHireListLoading(true);
    fetchHireList();
    const id = setInterval(fetchHireList, 30_000);
    return () => clearInterval(id);
  }, [address, authData, publicClient, fetchHireList]);

  // ---------- Finish hire ----------
  const {
    writeContract: writeFinish,
    data: finishHash,
    isPending: finishPending,
    error: finishError,
    reset: resetFinish,
  } = useChainWriteContract();

  const { isLoading: finishConfirming, isSuccess: finishSuccess } =
    useWaitForTransactionReceipt({ hash: finishHash });

  const [finishingHireId, setFinishingHireId] = useState<number | null>(null);

  const handleFinishHire = (hireId: number) => {
    resetFinish();
    resetReveal();
    setFinishingHireId(hireId);
    writeFinish({
      address: addresses.detectiveAgency,
      abi: DETECTIVE_AGENCY_ABI,
      functionName: "finishHireDetective",
      args: [BigInt(hireId)],
    });
  };

  const finishLoading = finishPending || finishConfirming;

  const finishToastFired = useRef(false);
  useEffect(() => {
    if (finishSuccess && finishHash && !finishToastFired.current) {
      finishToastFired.current = true;
      toast.success("Detective hire finished");
      fetchHireList();
      setFinishingHireId(null);
    }
    if (!finishHash) finishToastFired.current = false;
  }, [finishSuccess, finishHash]);

  // ---------- Reveal target ----------
  const {
    writeContract: writeReveal,
    data: revealHash,
    isPending: revealPending,
    error: revealError,
    reset: resetReveal,
  } = useChainWriteContract();

  const { isLoading: revealConfirming, isSuccess: revealSuccess } =
    useWaitForTransactionReceipt({ hash: revealHash });

  const [revealingHireId, setRevealingHireId] = useState<number | null>(null);

  const handleRevealTarget = (hireId: number) => {
    resetReveal();
    resetFinish();
    setRevealingHireId(hireId);
    writeReveal({
      address: addresses.detectiveAgency,
      abi: DETECTIVE_AGENCY_ABI,
      functionName: "revealTarget",
      args: [BigInt(hireId)],
    });
  };

  const revealLoading = revealPending || revealConfirming;

  const revealToastFired = useRef(false);
  useEffect(() => {
    if (revealSuccess && revealHash && !revealToastFired.current) {
      revealToastFired.current = true;
      toast.success("Target location revealed!");
      fetchHireList();
      setRevealingHireId(null);
    }
    if (!revealHash) revealToastFired.current = false;
  }, [revealSuccess, revealHash]);

  // ---------- Current time for countdowns ----------
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
    return () => clearInterval(id);
  }, []);

  // ---------- Helper: compute display status for a hire ----------
  function getHireDisplayInfo(hire: DetectiveHire) {
    const startedAt = Number(hire.startedAt);
    const targetNumber = Number(hire.targetNumber);

    if (hire.status === DetectiveHireStatus.Pending) {
      return { displayStatus: "pending" as const, timeLeft: 0, canFinish: true, canReveal: false };
    }

    if (hire.status === DetectiveHireStatus.Failed) {
      const revealTime = startedAt + DETECTIVE_HIRING_TIME;
      const timeLeft = Math.max(0, revealTime - now);
      if (timeLeft > 0) {
        return { displayStatus: "searching" as const, timeLeft, canFinish: false, canReveal: false };
      }
      return { displayStatus: "failed" as const, timeLeft: 0, canFinish: false, canReveal: false };
    }

    // Success
    if (hire.isTargetRevealed) {
      return { displayStatus: "revealed" as const, timeLeft: 0, canFinish: false, canReveal: false };
    }

    if (targetNumber > 0) {
      const foundTime = startedAt + (targetNumber * 60);
      const timeLeft = Math.max(0, foundTime - now);
      if (timeLeft <= 0) {
        return { displayStatus: "found" as const, timeLeft: 0, canFinish: false, canReveal: true };
      }
    }

    // Still searching (waiting for targetNumber time)
    const revealTime = startedAt + DETECTIVE_HIRING_TIME;
    const timeLeft = Math.max(0, revealTime - now);
    return { displayStatus: "searching" as const, timeLeft, canFinish: false, canReveal: false };
  }

  // ---------- Auth states ----------
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Search className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Detective Agency</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to hire detectives.
        </p>
      </div>
    );
  }

  if (authSigning) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Sign to Verify</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please sign the message in your wallet to load detective data.
        </p>
      </div>
    );
  }

  if (signError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">Signature Required</p>
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

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Detective Agency</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hire detectives to find your target&apos;s location. Approve cash spending first, then request a hire.
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          <Search className="inline h-3.5 w-3.5" />
        </span>
      </div>

      {/* Detective cost info */}
      <div className="mb-5 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Detective Cost{cityName ? ` - ${cityName}` : ""}
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                getCityDetectiveCost(cityId)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchDetectiveCost}
            disabled={costLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-50"
            aria-label="Refresh cost"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", costLoading && "animate-spin")} />
          </button>
        </div>

        {costLoading || cityId === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading cost data...
          </div>
        ) : detectiveCost !== null ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background/50 border border-border p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Coins className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cost per Detective
                </span>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {Number(formatEther(detectiveCost)).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">cash per detective</p>
            </div>
            <div className="rounded-lg bg-background/50 border border-border p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Max Detectives
                </span>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {maxDetectives}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">per hire request</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No cost data available.</p>
        )}
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
            <Coins className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Step 1 &mdash; Approve Cash Spending
            </h3>
            <p className="text-xs text-muted-foreground">
              Allow the Detective Agency contract to spend your in-game cash
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
              Detective Agency
            </span>
          </div>
        </div>

        {approveSuccess && approveHash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
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
                ? "Transaction rejected by user"
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
              <Coins className="h-4 w-4" />
              Approve Cash Spending
            </>
          )}
        </button>
      </div>

      {/* ===== Step 2: Request Hire ===== */}
      <div
        className={cn(
          "mb-5 rounded-xl border border-border bg-card p-6 transition-all duration-300",
          hireSuccess && "border-green-400/30",
          hireError && "border-red-400/30"
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Search className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Step 2 &mdash; Hire Detectives
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter target address and number of detectives to send
            </p>
          </div>
        </div>

        {/* Target address */}
        <div className="mb-3">
          <label htmlFor="target-addr" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Target Address
          </label>
          <input
            id="target-addr"
            type="text"
            placeholder="0x..."
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            disabled={hireLoading}
            className={cn(
              "w-full rounded-lg border bg-background/50 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
              targetAddress.length > 0 && !isValidTarget
                ? "border-red-400/50 focus:border-red-400"
                : "border-border focus:border-primary"
            )}
          />
          {targetAddress.length > 0 && !isValidTarget && (
            <p className="mt-1 text-[10px] text-red-400">
              Please enter a valid Ethereum address (0x...)
            </p>
          )}
        </div>

        {/* Detective count */}
        <div className="mb-4">
          <label htmlFor="detective-count" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Number of Detectives (1-{maxDetectives})
          </label>
          <input
            id="detective-count"
            type="number"
            placeholder="1"
            min="1"
            max={maxDetectives}
            step="1"
            value={detectiveCount}
            onChange={(e) => setDetectiveCount(e.target.value)}
            disabled={hireLoading}
            className={cn(
              "w-full rounded-lg border bg-background/50 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
              detectiveCount.length > 0 && !isValidCount
                ? "border-red-400/50 focus:border-red-400"
                : "border-border focus:border-primary"
            )}
          />
        </div>

        {/* Cost summary */}
        <div className="mb-4 rounded-md bg-background/50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Function</span>
            <span className="font-mono text-[10px] text-primary">
              requestHireDetective(...)
            </span>
          </div>
          {totalCost !== null && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Cost</span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {Number(formatEther(totalCost)).toLocaleString()} cash
              </span>
            </div>
          )}
          {cityName && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Your City</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <MapPin className="h-3 w-3 text-primary" />
                {cityName}
              </span>
            </div>
          )}
        </div>

        {hireSuccess && hireHash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
            <a
              href={`${explorer}/tx/${hireHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
            >
              {hireHash.slice(0, 10)}...{hireHash.slice(-8)}
            </a>
          </div>
        )}

        {hireError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <p className="line-clamp-2 text-[10px] text-red-400">
              {hireError.message.includes("User rejected")
                ? "Transaction rejected by user"
                : hireError.message.split("\n")[0]}
            </p>
          </div>
        )}

        <button
          onClick={handleRequestHire}
          disabled={!isConnected || hireLoading || !isValidTarget || !isValidCount}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            isConnected && isValidTarget && isValidCount
              ? "bg-blue-500/90 text-white hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {hireLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {hireSigning ? "Sign message..." : hirePending ? "Confirm in wallet..." : "Confirming..."}
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Hire Detectives
            </>
          )}
        </button>
      </div>

      {/* ===== Hire List ===== */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Your Detectives</h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                getUserDetectiveHires(...)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchHireList}
            disabled={hireListFetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-50"
            aria-label="Refresh list"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", hireListFetching && "animate-spin")} />
          </button>
        </div>

        {hireListLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading detective hires...
          </div>
        ) : hireList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No active detectives</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {hireList.map((hire) => {
              const info = getHireDisplayInfo(hire);
              const shortTarget = `${hire.target.slice(0, 6)}...${hire.target.slice(-4)}`;
              const detectiveLabel = Number(hire.detectiveCount) > 1
                ? `${Number(hire.detectiveCount)} Detectives`
                : "1 Detective";

              return (
                <div
                  key={hire.hireId}
                  className={cn(
                    "rounded-lg border bg-background/50 p-4 transition-all",
                    info.displayStatus === "revealed" && "border-green-400/30",
                    info.displayStatus === "found" && "border-blue-400/30",
                    info.displayStatus === "failed" && "border-red-400/30",
                    (info.displayStatus === "searching" || info.displayStatus === "pending") && "border-border"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{detectiveLabel}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">#{hire.hireId}</span>
                    </div>
                    <StatusBadge status={info.displayStatus} />
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Looking for</span>
                      <a
                        href={`${explorer}/address/${hire.target}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-primary underline decoration-primary/30 hover:decoration-primary"
                      >
                        {shortTarget}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Cost</span>
                      <span className="font-mono text-[10px] text-foreground">
                        {Number(formatEther(hire.totalCost)).toLocaleString()} cash
                      </span>
                    </div>

                    {/* Time left for searching */}
                    {info.displayStatus === "searching" && info.timeLeft > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Time left</span>
                        <span className="font-mono text-[10px] text-foreground tabular-nums flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatTime(info.timeLeft)}
                        </span>
                      </div>
                    )}

                    {/* Revealed location */}
                    {info.displayStatus === "revealed" && (
                      <RevealedInfo hire={hire} now={now} explorer={explorer} />
                    )}
                  </div>

                  {/* Action buttons */}
                  {info.displayStatus === "pending" && (
                    <button
                      onClick={() => handleFinishHire(hire.hireId)}
                      disabled={finishLoading || revealLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/90 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50"
                    >
                      {finishLoading && finishingHireId === hire.hireId ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {finishPending ? "Confirm..." : "Processing..."}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Finish Hiring
                        </>
                      )}
                    </button>
                  )}

                  {info.displayStatus === "found" && info.canReveal && (
                    <button
                      onClick={() => handleRevealTarget(hire.hireId)}
                      disabled={revealLoading || finishLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500/90 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
                    >
                      {revealLoading && revealingHireId === hire.hireId ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {revealPending ? "Confirm..." : "Revealing..."}
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Reveal Target Location
                        </>
                      )}
                    </button>
                  )}

                  {info.displayStatus === "failed" && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-400/10 px-3 py-2">
                      <EyeOff className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-[10px] text-red-400 font-medium">Target not found</span>
                    </div>
                  )}

                  {/* Transaction errors */}
                  {finishError && finishingHireId === hire.hireId && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <p className="line-clamp-2 text-[10px] text-red-400">
                        {finishError.message.includes("User rejected")
                          ? "Transaction rejected by user"
                          : finishError.message.split("\n")[0]}
                      </p>
                    </div>
                  )}
                  {revealError && revealingHireId === hire.hireId && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <p className="line-clamp-2 text-[10px] text-red-400">
                        {revealError.message.includes("User rejected")
                          ? "Transaction rejected by user"
                          : revealError.message.split("\n")[0]}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Sub-components ----------

function StatusBadge({ status }: { status: "pending" | "searching" | "found" | "failed" | "revealed" }) {
  const config = {
    pending: { label: "Pending", className: "bg-amber-400/10 text-amber-400" },
    searching: { label: "Searching", className: "bg-primary/10 text-primary" },
    found: { label: "Found", className: "bg-blue-400/10 text-blue-400" },
    failed: { label: "Failed", className: "bg-red-400/10 text-red-400" },
    revealed: { label: "Revealed", className: "bg-green-400/10 text-green-400" },
  };
  const c = config[status];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", c.className)}>
      {c.label}
    </span>
  );
}

function RevealedInfo({ hire, now, explorer }: { hire: DetectiveHire; now: number; explorer: string }) {
  const targetCity = getCityName(hire.targetCityId);

  // canKillUntil is startedAt + targetNumber*60 + targetFoundDuration(2h)
  // We approximate: startedAt + targetNumber * 60 + 7200
  const foundTime = Number(hire.startedAt) + Number(hire.targetNumber) * 60;
  const canKillUntilTime = foundTime + 2 * 60 * 60; // 2 hours
  const remaining = canKillUntilTime - now;

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Target location</span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400">
          <MapPin className="h-3 w-3" />
          {targetCity}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Kill window</span>
        {remaining > 0 ? (
          <span className="font-mono text-[10px] text-foreground tabular-nums flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-amber-400" />
            {formatTime(remaining)}
          </span>
        ) : (
          <span className="text-[10px] text-red-400 font-medium">Expired</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Target</span>
        <a
          href={`${explorer}/address/${hire.target}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] text-primary underline decoration-primary/30 hover:decoration-primary"
        >
          {hire.target.slice(0, 6)}...{hire.target.slice(-4)}
        </a>
      </div>
    </>
  );
}
