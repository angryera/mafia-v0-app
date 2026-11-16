"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useReadContract,
  useSignMessage,
  usePublicClient,
} from "wagmi";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import {
  DETECTIVE_AGENCY_ABI,
  DETECTIVE_HIRING_TIME,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
  USER_PROFILE_CONTRACT_ABI,
} from "@/lib/contract";
import { getErrorMessage, getTravelCityName, formatWalletAddress } from "@/lib/format";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseError, ContractFunctionRevertedError, formatEther, isAddress } from "viem";

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

type HireDisplayStatus = "pending" | "searching" | "found" | "failed" | "revealed";
const HIRES_PER_PAGE = 8;

function getHireDisplayInfo(hire: DetectiveHire, now: number) {
  const startedAt = Number(hire.startedAt);
  const targetNumber = Number(hire.targetNumber);

  if (hire.status === DetectiveHireStatus.Pending) {
    return { displayStatus: "pending" as const, timeLeft: 0, canReveal: false };
  }

  if (hire.status === DetectiveHireStatus.Failed) {
    const timeLeft = Math.max(0, startedAt + DETECTIVE_HIRING_TIME - now);
    return { displayStatus: (timeLeft > 0 ? "searching" : "failed") as HireDisplayStatus, timeLeft, canReveal: false };
  }

  if (hire.isTargetRevealed) {
    return { displayStatus: "revealed" as const, timeLeft: 0, canReveal: false };
  }

  if (targetNumber > 0) {
    const timeLeft = Math.max(0, startedAt + targetNumber * 60 - now);
    if (timeLeft === 0) {
      return { displayStatus: "found" as const, timeLeft: 0, canReveal: true };
    }
  }

  const timeLeft = Math.max(0, startedAt + DETECTIVE_HIRING_TIME - now);
  return { displayStatus: "searching" as const, timeLeft, canReveal: false };
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${(m % 60).toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// The agency v3 getter can revert with Panic(0x32) when a user index is past
// the end of its hire array. Other errors (including bad signatures) must fail.
function isMissingHireIndex(error: unknown): boolean {
  const revert = error instanceof BaseError
    ? error.walk((cause) => cause instanceof ContractFunctionRevertedError)
    : null;
  return revert instanceof ContractFunctionRevertedError
    && revert.data?.errorName === "Panic"
    && String(revert.data.args?.[0]) === "50";
}

export function DetectiveAgencyAction() {
  const { address, chainId, isConnected } = useAccount();
  const { chainConfig, isSwitching, setActiveChain } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData, isSigning: authSigning, signError, requestSignature } = useAuth();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });

  // ---------- Profile ----------
  const { data: profileRaw, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address },
  });
  const profile = profileRaw as ProfileData | undefined;
  const cityId = profile?.cityId;
  const cityName = profile ? getTravelCityName(profile.cityId) : null;

  // ---------- Detective cost for current city ----------
  const {
    data: detectiveCostRaw,
    isFetching: costLoading,
    isError: costError,
    refetch: fetchDetectiveCost,
  } = useReadContract({
    address: addresses.detectiveAgency,
    abi: DETECTIVE_AGENCY_ABI,
    functionName: "getCityDetectiveCost",
    args: cityId === undefined ? undefined : [cityId],
    query: { enabled: cityId !== undefined },
  });
  const detectiveCost = costError || detectiveCostRaw === undefined ? null : detectiveCostRaw as bigint;

  // ---------- Max detective count ----------
  const { data: maxDetectiveCountRaw } = useReadContract({
    address: addresses.detectiveAgency,
    abi: DETECTIVE_AGENCY_ABI,
    functionName: "maxDetectiveCount",
    query: { enabled: !!addresses.detectiveAgency },
  });
  const maxDetectives = maxDetectiveCountRaw ? Number(maxDetectiveCountRaw) : 10;

  const {
    data: allowanceRaw,
    isLoading: allowanceLoading,
    isError: allowanceError,
    refetch: refetchAllowance,
  } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowances",
    args: address ? [address, addresses.detectiveAgency] : undefined,
    query: { enabled: !!address },
  });
  const allowance = allowanceRaw === undefined ? null : allowanceRaw as bigint;

  // ---------- Hire form state ----------
  const [targetAddress, setTargetAddress] = useState("");
  const [detectiveCount, setDetectiveCount] = useState("1");
  const [hireSigning, setHireSigning] = useState(false);

  const isValidTarget = isAddress(targetAddress);
  const isValidCount =
    detectiveCount.length > 0 &&
    Number(detectiveCount) >= 1 &&
    Number(detectiveCount) <= maxDetectives &&
    Number.isInteger(Number(detectiveCount));

  const totalCost = detectiveCost !== null && isValidCount
    ? detectiveCost * BigInt(detectiveCount)
    : null;
  const needsApproval = totalCost !== null && allowance !== null && allowance < totalCost;
  const canSubmitHire = isValidTarget && totalCost !== null && !costLoading && !costError && allowance !== null && !allowanceLoading && !allowanceError && !needsApproval;

  // ---------- Step 1: Approve cash ----------
  const approveTx = useContractTransaction({
    onSuccess: () => {
      toast.success("Cash spending approved");
      refetchAllowance();
    },
  });
  const writeApprove = approveTx.write;
  const approveHash = approveTx.hash;
  const approvePending = approveTx.isPending;
  const approveError = approveTx.error;
  const resetApprove = approveTx.reset;
  const approveSuccess = approveTx.isSuccess;

  const handleApprove = () => {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.detectiveAgency, INGAME_CURRENCY_APPROVE_AMOUNT],
    });
  };

  const approveLoading = approveTx.isLoading;

  // ---------- Step 2: Request hire ----------
  const hireTx = useContractTransaction({
    onSuccess: () => {
      toast.success("Detectives hired");
      setTargetAddress("");
      setHirePage(1);
      refetchAllowance();
      refreshHires();
    },
  });
  const writeHire = hireTx.write;
  const hireHash = hireTx.hash;
  const hirePending = hireTx.isPending;
  const hireError = hireTx.error;
  const resetHire = hireTx.reset;
  const hireSuccess = hireTx.isSuccess;

  const handleRequestHire = async () => {
    if (!canSubmitHire || !address) return;
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

  const hireLoading = hireSigning || hireTx.isLoading;

  // ---------- Detective hire list ----------
  const sourceKey = [
    chainConfig.wagmiChainId,
    chainId ?? "disconnected",
    addresses.detectiveAgency.toLowerCase(),
    address?.toLowerCase() ?? "disconnected",
    authData?.signature ?? "unsigned",
  ].join(":");
  const [pageSelection, setPageSelection] = useState({ sourceKey, page: 1 });
  const hirePage = pageSelection.sourceKey === sourceKey ? pageSelection.page : 1;
  const setHirePage = useCallback(
    (page: number) => setPageSelection({ sourceKey, page }),
    [sourceKey]
  );
  const [loadedHires, setLoadedHires] = useState<{
    sourceKey: string;
    page: number;
    total: number;
    hires: DetectiveHire[];
  } | null>(null);
  const [hireListFetching, setHireListFetching] = useState(false);
  const [caseActionsStale, setCaseActionsStale] = useState(false);
  const [hireListError, setHireListError] = useState<{
    sourceKey: string;
    page: number;
    message: string;
  } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const fetchRequestId = useRef(0);
  const countCache = useRef<{ sourceKey: string; count: number } | null>(null);

  const refreshHires = useCallback(() => {
    fetchRequestId.current += 1;
    countCache.current = null;
    setCaseActionsStale(true);
    setReloadToken((token) => token + 1);
  }, [setCaseActionsStale, setReloadToken]);

  const fetchHireList = useCallback(async () => {
    if (!address || !authData || !publicClient) return;
    const requestId = ++fetchRequestId.current;
    setHireListFetching(true);
    setHireListError(null);
    try {
      let count: number;
      if (countCache.current?.sourceKey === sourceKey) {
        count = countCache.current.count;
      } else {
        const globalCount = Number(await publicClient.readContract({
          address: addresses.detectiveAgency,
          abi: DETECTIVE_AGENCY_ABI,
          functionName: "getTotalHireCount",
        }));

        // The contract has no per-user count. A one-item probe succeeds at an
        // indexed user entry and the v3 getter panics just beyond the array.
        const hasHireAt = async (probeIndex: number) => {
          try {
            const result = await publicClient.readContract({
              address: addresses.detectiveAgency,
              abi: DETECTIVE_AGENCY_ABI,
              functionName: "getUserDetectiveHires",
              args: [address, probeIndex, 1, authData.message, authData.signature],
            });
            const [ids] = result as [readonly number[], readonly unknown[]];
            return ids.length > 0;
          } catch (error) {
            if (!isMissingHireIndex(error)) throw error;
            return false;
          }
        };

        if (globalCount === 0 || !(await hasHireAt(0))) {
          count = 0;
        } else {
          // Grow the search window from this user's first hire. An empty
          // history takes one probe regardless of total network activity.
          let firstUnknown = 1;
          let firstMissing = 1;
          while (firstMissing < globalCount && await hasHireAt(firstMissing)) {
            firstUnknown = firstMissing + 1;
            firstMissing = Math.min(firstMissing * 2, globalCount);
          }
          while (firstUnknown < firstMissing) {
            const probeIndex = Math.floor((firstUnknown + firstMissing) / 2);
            if (await hasHireAt(probeIndex)) firstUnknown = probeIndex + 1;
            else firstMissing = probeIndex;
          }
          count = firstUnknown;
        }
        if (requestId !== fetchRequestId.current) return;
        countCache.current = { sourceKey, count };
      }

      const page = Math.min(hirePage, Math.max(1, Math.ceil(count / HIRES_PER_PAGE)));
      const endIndex = count - (page - 1) * HIRES_PER_PAGE;
      const startIndex = Math.max(0, endIndex - HIRES_PER_PAGE);
      const length = endIndex - startIndex;
      const hires: DetectiveHire[] = [];
      if (length > 0) {
        const result = await publicClient.readContract({
          address: addresses.detectiveAgency,
          abi: DETECTIVE_AGENCY_ABI,
          functionName: "getUserDetectiveHires",
          args: [address, startIndex, length, authData.message, authData.signature],
        });
        const [hireIds, list] = result as [readonly number[], readonly unknown[]];
        if (hireIds.length !== length || list.length !== length) {
          throw new Error("Detective agency returned an incomplete hire page");
        }
        for (let i = 0; i < hireIds.length; i++) {
          const item = list[i] as Omit<DetectiveHire, "hireId">;
          hires.push({
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
      }

      if (requestId === fetchRequestId.current) {
        setLoadedHires({ sourceKey, page, total: count, hires: hires.reverse() });
        if (page !== hirePage) setHirePage(page);
        setHireListError(null);
        setCaseActionsStale(false);
      }
    } catch {
      if (requestId === fetchRequestId.current) {
        setHireListError({
          sourceKey,
          page: hirePage,
          message: "Could not load your detective hires. Try again.",
        });
      }
    } finally {
      if (requestId === fetchRequestId.current) {
        setHireListFetching(false);
      }
    }
  }, [address, authData, publicClient, addresses.detectiveAgency, sourceKey, hirePage, setHirePage, setHireListFetching, setHireListError, setLoadedHires, setCaseActionsStale]);

  useEffect(() => {
    if (!address || !authData || !publicClient || chainId !== chainConfig.wagmiChainId) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchHireList(); });
    return () => {
      cancelled = true;
      fetchRequestId.current += 1;
    };
  }, [address, authData, publicClient, fetchHireList, reloadToken, chainId, chainConfig.wagmiChainId]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshHires();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [refreshHires]);

  // ---------- Finish hire ----------
  const finishTx = useContractTransaction({
    onSuccess: () => {
      toast.success("Detective hire finished");
      refreshHires();
      setFinishingHireId(null);
    },
  });
  const writeFinish = finishTx.write;
  const finishPending = finishTx.isPending;
  const finishError = finishTx.error;
  const resetFinish = finishTx.reset;

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

  const finishLoading = finishTx.isLoading;

  // ---------- Reveal target ----------
  const revealTx = useContractTransaction({
    onSuccess: () => {
      toast.success("Target location revealed!");
      refreshHires();
      setRevealingHireId(null);
    },
  });
  const writeReveal = revealTx.write;
  const revealPending = revealTx.isPending;
  const revealError = revealTx.error;
  const resetReveal = revealTx.reset;

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

  const revealLoading = revealTx.isLoading;

  // ---------- Current time for countdowns ----------
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
    return () => clearInterval(id);
  }, []);

  const pageData = loadedHires?.sourceKey === sourceKey && loadedHires.page === hirePage
    ? loadedHires
    : null;
  const hireList = pageData?.hires ?? [];
  const hireTotal = loadedHires?.sourceKey === sourceKey ? loadedHires.total : 0;
  const currentError = hireListError?.sourceKey === sourceKey && hireListError.page === hirePage
    ? hireListError.message
    : null;
  const hireListLoading = !pageData && !currentError;
  const visibleHires = hireList.map((hire) => ({ hire, info: getHireDisplayInfo(hire, now) }));
  const totalPages = Math.max(1, Math.ceil(hireTotal / HIRES_PER_PAGE));
  const currentPage = Math.min(hirePage, totalPages);
  const pageStart = (currentPage - 1) * HIRES_PER_PAGE;
  const firstPageNumber = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pageNumbers = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => firstPageNumber + index
  );

  // ---------- Auth states ----------
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Search className="mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Detective Agency</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to hire detectives.
        </p>
      </div>
    );
  }

  if (chainId !== chainConfig.wagmiChainId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-5 py-16 text-center">
        {isSwitching
          ? <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
          : <AlertCircle className="mb-3 h-10 w-10 text-amber-400" />}
        <h1 className="text-lg font-semibold text-foreground">
          {isSwitching ? "Switching network..." : "Switch network to continue"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to {chainConfig.label} to manage detective cases.
        </p>
        {!isSwitching && (
          <button
            type="button"
            onClick={() => void setActiveChain(chainConfig.id)}
            className="mt-4 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Switch to {chainConfig.label}
          </button>
        )}
      </div>
    );
  }

  if (authSigning) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <h1 className="text-lg font-semibold text-foreground">Sign to Verify</h1>
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
        <h1 className="text-lg font-semibold text-foreground">Signature Required</h1>
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

  if (!authData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <h1 className="text-lg font-semibold text-foreground">Verifying wallet...</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preparing your detective cases.</p>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <h1 className="text-lg font-semibold text-foreground">Loading Profile...</h1>
      </div>
    );
  }

  if (profileError || (authData && !profile)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-5 py-16 text-center">
        <AlertCircle className="mb-3 h-9 w-9 text-red-400" />
        <h1 className="text-lg font-semibold text-foreground">Could not load your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your city is needed to show detective pricing.</p>
        <button type="button" onClick={() => void refetchProfile()} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Retry loading</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-l-2 border-primary pl-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Detective desk</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Detective Agency</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Hire a team to find a player&apos;s city. Manage each search and reveal leads when they&apos;re ready.
          </p>
        </div>
        {hireTotal > 0 && (
          <span className="self-start rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground tabular-nums sm:self-auto">
            {hireTotal} {hireTotal === 1 ? "case" : "cases"}
          </span>
        )}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* Detective cost info */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Coins className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Pricing{cityName ? ` in ${cityName}` : ""}
                  </h3>
                  <p className="text-xs text-muted-foreground">Review the cost before hiring.</p>
                </div>
              </div>
              <button
                type="button"
              onClick={() => void fetchDetectiveCost()}
              disabled={costLoading || cityId === undefined}
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
                      Each detective
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
                      Team limit
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {maxDetectives}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">per hire request</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Cost is unavailable. Refresh to try again.</p>
            )}
          </div>

          {/* Spending approval */}
          <div
            className={cn(
              "rounded-xl border border-border bg-card p-5",
              approveSuccess && "border-green-400/30",
              approveError && "border-red-400/30"
            )}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Coins className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Cash spending</h2>
                <p className="text-xs text-muted-foreground">Approve cash before hiring a team.</p>
              </div>
            </div>

            <div className="mb-3 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-xs">
              {allowanceLoading || (allowance === null && !allowanceError) ? (
                <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking approval...</span>
              ) : allowanceError ? (
                <button type="button" onClick={() => refetchAllowance()} className="text-red-400 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Could not check approval. Retry
                </button>
              ) : totalCost === null ? (
                <span className="text-muted-foreground">Enter a team size to check approval.</span>
              ) : needsApproval ? (
                <span className="text-amber-300">Approval needed for this hire</span>
              ) : (
                <span className="flex items-center gap-2 text-green-400"><CheckCircle2 className="h-3.5 w-3.5" />Approved for this hire</span>
              )}
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
                    : getErrorMessage(approveError)}
                </p>
              </div>
            )}

            {needsApproval && <button
              onClick={handleApprove}
              disabled={approveLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              {approveLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {approvePending ? "Confirm in wallet..." : "Confirming..."}
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  Approve cash spending
                </>
              )}
            </button>}
          </div>

          {/* Hire form */}
          <div
            className={cn(
              "rounded-xl border border-border bg-card p-5",
              hireSuccess && "border-green-400/30",
              hireError && "border-red-400/30"
            )}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Search className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Start a search</h2>
                <p className="text-xs text-muted-foreground">Choose a target and team size.</p>
              </div>
            </div>

            {/* Target address */}
            <div className="mb-3">
              <label htmlFor="target-addr" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Target wallet address
              </label>
              <input
                id="target-addr"
                type="text"
                placeholder="0x..."
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value.trim())}
                disabled={hireLoading}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={targetAddress.length > 0 && !isValidTarget}
                aria-describedby={targetAddress.length > 0 && !isValidTarget ? "target-addr-error" : undefined}
                className={cn(
                  "w-full rounded-lg border bg-background/50 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
                  targetAddress.length > 0 && !isValidTarget
                    ? "border-red-400/50 focus:border-red-400"
                    : "border-border focus:border-primary"
                )}
              />
              {targetAddress.length > 0 && !isValidTarget && (
                <p id="target-addr-error" className="mt-1 text-xs text-red-400">
                  Enter a valid 0x wallet address.
                </p>
              )}
            </div>

            {/* Detective count */}
            <div className="mb-4">
              <label htmlFor="detective-count" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Detectives to send <span className="font-normal">(1–{maxDetectives})</span>
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
                aria-invalid={detectiveCount.length > 0 && !isValidCount}
                aria-describedby={detectiveCount.length > 0 && !isValidCount ? "detective-count-error" : undefined}
                className={cn(
                  "w-full rounded-lg border bg-background/50 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
                  detectiveCount.length > 0 && !isValidCount
                    ? "border-red-400/50 focus:border-red-400"
                    : "border-border focus:border-primary"
                )}
              />
              {detectiveCount.length > 0 && !isValidCount && (
                <p id="detective-count-error" className="mt-1 text-xs text-red-400">Choose a whole number from 1 to {maxDetectives}.</p>
              )}
            </div>

            {/* Cost summary */}
            <div className="mb-4 rounded-lg border border-border bg-background/50 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Total hire cost</span>
                <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
                  {totalCost !== null ? `${Number(formatEther(totalCost)).toLocaleString()} cash` : "—"}
                </span>
              </div>
              {cityName && (
                <div className="mt-2 flex items-center justify-between">
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
                    : getErrorMessage(hireError)}
                </p>
              </div>
            )}

            <button
              onClick={handleRequestHire}
              disabled={hireLoading || !canSubmitHire}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                canSubmitHire
                  ? "bg-blue-500/90 text-white hover:bg-blue-500 disabled:opacity-50"
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
                  Hire detectives
                </>
              )}
            </button>
            {needsApproval && <p className="mt-2 text-xs text-amber-300">Approve cash spending above to hire this team.</p>}
          </div>
        </div>

      {/* Hired detective cases */}
      <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="detective-hires-title" aria-busy={hireListFetching || hireListLoading}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 id="detective-hires-title" className="text-base font-semibold text-foreground">Hired detectives</h2>
              <p className="text-xs text-muted-foreground">Newest cases first</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshHires}
            disabled={hireListFetching}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            aria-label="Refresh hired detectives"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", hireListFetching && "animate-spin")} />
          </button>
        </div>

        {currentError && pageData && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
            <span>{currentError} Showing the last loaded results.</span>
            <button type="button" onClick={refreshHires} className="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Retry</button>
          </div>
        )}

        {hireListLoading ? (
          <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading detective hires...
          </div>
        ) : currentError && !pageData ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-red-400" />
            <p className="text-sm text-foreground">{currentError}</p>
            <button type="button" onClick={refreshHires} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Retry loading</button>
          </div>
        ) : hireTotal === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No hires yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Start a search to track it here.</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {visibleHires.map(({ hire, info }) => {
              const shortTarget = formatWalletAddress(hire.target);
              const detectiveLabel = Number(hire.detectiveCount) > 1
                ? `${Number(hire.detectiveCount)} Detectives`
                : "1 Detective";

              return (
                <div
                  key={hire.hireId}
                  className={cn(
                    "rounded-lg border bg-background/50 p-4",
                    info.displayStatus === "revealed" && "border-green-400/30",
                    info.displayStatus === "found" && "border-blue-400/30",
                    info.displayStatus === "failed" && "border-red-400/30",
                    info.displayStatus === "pending" && "border-amber-400/30",
                    info.displayStatus === "searching" && "border-border"
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-semibold text-foreground">Case #{hire.hireId}</span>
                    <StatusBadge status={info.displayStatus} />
                  </div>

                  <div className="mb-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Target</span>
                      <a
                        href={`${explorer}/address/${hire.target}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={hire.target}
                        className="font-mono text-xs text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {shortTarget}
                      </a>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Team</span>
                      <span className="text-xs text-foreground">{detectiveLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Cost</span>
                      <span className="font-mono text-xs text-foreground tabular-nums">
                        {Number(formatEther(hire.totalCost)).toLocaleString()} cash
                      </span>
                    </div>

                    {/* Time left for searching */}
                    {info.displayStatus === "searching" && info.timeLeft > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Search ends in</span>
                        <span className="font-mono text-xs text-foreground tabular-nums flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatTime(info.timeLeft)}
                        </span>
                      </div>
                    )}

                    {/* Revealed location */}
                    {info.displayStatus === "revealed" && (
                      <RevealedInfo hire={hire} now={now} />
                    )}
                  </div>

                  {/* Action buttons */}
                  {info.displayStatus === "pending" && (
                    <button
                      onClick={() => handleFinishHire(hire.hireId)}
                      disabled={finishLoading || revealLoading || hireListFetching || caseActionsStale}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/90 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                    >
                      {finishLoading && finishingHireId === hire.hireId ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {finishPending ? "Confirm..." : "Processing..."}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Finish hiring
                        </>
                      )}
                    </button>
                  )}

                  {info.displayStatus === "found" && info.canReveal && (
                    <button
                      onClick={() => handleRevealTarget(hire.hireId)}
                      disabled={revealLoading || finishLoading || hireListFetching || caseActionsStale}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500/90 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                    >
                      {revealLoading && revealingHireId === hire.hireId ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {revealPending ? "Confirm..." : "Revealing..."}
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Reveal location
                        </>
                      )}
                    </button>
                  )}

                  {info.displayStatus === "failed" && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-400/10 px-3 py-2">
                      <EyeOff className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-xs text-red-400 font-medium">Target not found</span>
                    </div>
                  )}

                  {/* Transaction errors */}
                  {finishError && finishingHireId === hire.hireId && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <p className="line-clamp-2 text-[10px] text-red-400">
                        {finishError.message.includes("User rejected")
                          ? "Transaction rejected by user"
                          : getErrorMessage(finishError)}
                      </p>
                    </div>
                  )}
                  {revealError && revealingHireId === hire.hireId && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <p className="line-clamp-2 text-[10px] text-red-400">
                        {revealError.message.includes("User rejected")
                          ? "Transaction rejected by user"
                          : getErrorMessage(revealError)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {hireTotal > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {pageData
                ? <>Showing {pageStart + 1}–{pageStart + hireList.length} of {hireTotal} cases</>
                : <>{hireTotal} cases</>}
              {totalPages > 1 && <span className="ml-1">· Page {currentPage} of {totalPages}</span>}
            </p>
            {totalPages > 1 && (
              <nav className="flex items-center gap-1" aria-label="Detective hire pages">
                <button
                  type="button"
                  onClick={() => setHirePage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                ><ChevronsLeft className="h-4 w-4" /></button>
                <button
                  type="button"
                  onClick={() => setHirePage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                ><ChevronLeft className="h-4 w-4" /></button>
                <div className="hidden items-center gap-1 sm:flex">
                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setHirePage(pageNumber)}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={currentPage === pageNumber ? "page" : undefined}
                      className={cn(
                        "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        currentPage === pageNumber ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground hover:border-primary/50"
                      )}
                    >{pageNumber}</button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setHirePage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                ><ChevronRight className="h-4 w-4" /></button>
                <button
                  type="button"
                  onClick={() => setHirePage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                ><ChevronsRight className="h-4 w-4" /></button>
              </nav>
            )}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

// ---------- Sub-components ----------

function StatusBadge({ status }: { status: HireDisplayStatus }) {
  const config = {
    pending: { label: "Ready to finish", className: "bg-amber-400/10 text-amber-300" },
    searching: { label: "Searching", className: "bg-primary/10 text-primary" },
    found: { label: "Ready to reveal", className: "bg-blue-400/10 text-blue-400" },
    failed: { label: "Not found", className: "bg-red-400/10 text-red-400" },
    revealed: { label: "Revealed", className: "bg-green-400/10 text-green-400" },
  };
  const c = config[status];
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", c.className)}>
      {c.label}
    </span>
  );
}

function RevealedInfo({ hire, now }: { hire: DetectiveHire; now: number }) {
  const targetCity = getTravelCityName(hire.targetCityId);

  // canKillUntil is startedAt + targetNumber*60 + targetFoundDuration(2h)
  // We approximate: startedAt + targetNumber * 60 + 7200
  const foundTime = Number(hire.startedAt) + Number(hire.targetNumber) * 60;
  const canKillUntilTime = foundTime + 2 * 60 * 60; // 2 hours
  const remaining = canKillUntilTime - now;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Target location</span>
        <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
          <MapPin className="h-3 w-3" />
          {targetCity}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Kill window</span>
        {remaining > 0 ? (
          <span className="font-mono text-xs text-foreground tabular-nums flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-amber-400" />
            {formatTime(remaining)}
          </span>
        ) : (
          <span className="text-xs text-red-400 font-medium">Expired</span>
        )}
      </div>
    </>
  );
}
