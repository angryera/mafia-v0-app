"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { decodeEventLog } from "viem";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { PERK_OPENER_CONTRACT_ABI } from "@/lib/contract";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import {
  Loader2,
  Gift,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Radio,
  Sparkles,
  ExternalLink,
  Zap,
  RefreshCw,
  Package,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Perk box category ID from inventory
const PERK_BOX_CATEGORY = 17;
const PERK_BOX_TYPE = 0;

type Phase = "idle" | "requesting" | "waiting-vrf" | "finishing" | "done";

interface GeneratedPerk {
  user: string;
  perkCategoryId: bigint;
  perkTypeId: bigint;
  timestamp: bigint;
}

interface InventoryItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId: number;
}

interface MafiaInventory {
  getItemsByCategory: (params: {
    chain: string;
    contractAddress: string;
    categoryId: number;
    maxItems: number;
    onProgress?: (info: { fetched: number; batchIndex: number }) => void;
  }) => Promise<InventoryItem[]>;
}

declare global {
  interface Window {
    MafiaInventory?: MafiaInventory;
  }
}

const POLL_INTERVAL = 4000;

// ========== PERK MAPPING ==========
// Mapping rules from prompt
const SUCCESS_OPTIONS = ["Crime", "NickCar", "Booze", "Narcotics", "KillSkill", "BustOut"];
const COOLDOWN_OPTIONS = ["Crime", "NickCar", "Booze", "Narcotics", "KillSkill", "Travel", "BulletBuy", "HealthBuy", "BustOut"];
const BOOSTER_OPTIONS = ["MapYield", "RaceXp", "KillSkillXp", "BustOutXp", "SalesPriceNarcotics", "SalesPriceBooze", "Worth", "Rewards"];
const TOOLS_OPTIONS = ["Purchase", "NoJail", "FreeTravel", "BankFee", "CreditCost", "Convert", "CreditSpend"];

const DURATIONS = ["6", "12", "24", "48", "72", "96"];
const SUCCESS_AMOUNTS = ["100", "75", "50"];
const COOLDOWN_AMOUNTS = ["90", "75", "50"];
const BOOSTER_AMOUNTS = ["100", "75", "50", "25"];

interface PerkDisplay {
  type: "success" | "cooldown" | "booster" | "tools";
  option: string;
  amount: string;
  duration: string;
  tools: string;
}

function getPerkDisplay(categoryId: number, typeId: number): PerkDisplay {
  const D = DURATIONS.length; // 6

  // SUCCESS perks (18-23)
  if (categoryId >= 18 && categoryId <= 23) {
    const optionIndex = categoryId - 18;
    const amountIndex = Math.floor(typeId / D);
    const durationIndex = typeId % D;
    return {
      type: "success",
      option: SUCCESS_OPTIONS[optionIndex] ?? `Option #${optionIndex}`,
      amount: SUCCESS_AMOUNTS[amountIndex] ?? "Unknown",
      duration: DURATIONS[durationIndex] ?? "Unknown",
      tools: "",
    };
  }

  // COOLDOWN perks (24-32)
  if (categoryId >= 24 && categoryId <= 32) {
    const optionIndex = categoryId - 24;
    const amountIndex = Math.floor(typeId / D);
    const durationIndex = typeId % D;
    return {
      type: "cooldown",
      option: COOLDOWN_OPTIONS[optionIndex] ?? `Option #${optionIndex}`,
      amount: COOLDOWN_AMOUNTS[amountIndex] ?? "Unknown",
      duration: DURATIONS[durationIndex] ?? "Unknown",
      tools: "",
    };
  }

  // BOOSTER perks (33-40)
  if (categoryId >= 33 && categoryId <= 40) {
    const optionIndex = categoryId - 33;
    const amountIndex = Math.floor(typeId / D);
    const durationIndex = typeId % D;
    return {
      type: "booster",
      option: BOOSTER_OPTIONS[optionIndex] ?? `Option #${optionIndex}`,
      amount: BOOSTER_AMOUNTS[amountIndex] ?? "Unknown",
      duration: DURATIONS[durationIndex] ?? "Unknown",
      tools: "",
    };
  }

  // TOOLS perks (41-47)
  if (categoryId >= 41 && categoryId <= 47) {
    const toolsIndex = categoryId - 41;
    const durationIndex = typeId % D;
    return {
      type: "tools",
      option: "",
      amount: "",
      duration: DURATIONS[durationIndex] ?? "Unknown",
      tools: TOOLS_OPTIONS[toolsIndex] ?? `Tool #${toolsIndex}`,
    };
  }

  // Unknown category
  return {
    type: "success",
    option: `Unknown (Cat ${categoryId})`,
    amount: "?",
    duration: "?",
    tools: "",
  };
}

function getToolsDisplayName(toolsId: string): string {
  const toolsNames: Record<string, string> = {
    Purchase: "Free Purchase",
    NoJail: "No Jail",
    FreeTravel: "Free Travel",
    BankFee: "No Bank Fee",
    CreditCost: "Reduced Credit Cost",
    Convert: "Free Convert",
    CreditSpend: "Reduced Credit Spend",
  };
  return toolsNames[toolsId] ?? toolsId;
}

function getTypeLabel(type: "success" | "cooldown" | "booster" | "tools"): string {
  const labels: Record<string, string> = {
    success: "Success Boost",
    cooldown: "Cooldown Reduction",
    booster: "Booster",
    tools: "Tool",
  };
  return labels[type] ?? type;
}

// Colour per perk type
type ColourSet = { text: string; bg: string; border: string };
const TYPE_COLOURS: Record<string, ColourSet> = {
  success: { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  cooldown: { text: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/30" },
  booster: { text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  tools: { text: "text-fuchsia-400", bg: "bg-fuchsia-400/10", border: "border-fuchsia-400/30" },
};

export function OpenPerkBoxAction() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [vrfFulfilled, setVrfFulfilled] = useState(false);
  const [generatedPerk, setGeneratedPerk] = useState<GeneratedPerk | null>(null);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inventory state
  const [perkBoxes, setPerkBoxes] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // Fetch perk boxes from inventory
  const fetchPerkBoxes = useCallback(async () => {
    if (!address || !window.MafiaInventory) {
      setInventoryLoading(false);
      return;
    }

    setInventoryLoading(true);
    setInventoryError(null);

    try {
      const chainId = chainConfig.id === "bnb" ? "bnb" : "pls";
      const items = await window.MafiaInventory.getItemsByCategory({
        chain: chainId,
        contractAddress: addresses.inventory,
        categoryId: PERK_BOX_CATEGORY,
        maxItems: 100000,
      });

      // Filter items by owner and type
      const userBoxes = items.filter(
        (item) =>
          item.owner.toLowerCase() === address.toLowerCase() &&
          item.categoryId === PERK_BOX_CATEGORY &&
          item.typeId === PERK_BOX_TYPE
      );

      setPerkBoxes(userBoxes);
    } catch (err) {
      console.error("Failed to fetch perk boxes:", err);
      setInventoryError("Failed to load perk boxes from inventory");
    } finally {
      setInventoryLoading(false);
    }
  }, [address, chainConfig.id, addresses.inventory]);

  // Load inventory on mount and when address changes
  useEffect(() => {
    const checkInventory = () => {
      if (window.MafiaInventory) {
        fetchPerkBoxes();
      } else {
        setTimeout(checkInventory, 500);
      }
    };

    if (isConnected && address) {
      checkInventory();
    } else {
      setInventoryLoading(false);
    }
  }, [isConnected, address, fetchPerkBoxes]);

  // ---------- Read user nonce status on mount ----------
  const {
    data: userStatusData,
    refetch: refetchUserStatus,
    isLoading: isStatusLoading,
  } = useReadContract({
    address: addresses.perkOpener,
    abi: PERK_OPENER_CONTRACT_ABI,
    functionName: "userNonceStatus",
    args: address ? [address] : undefined,
    chainId: chainConfig.wagmiChainId,
    query: { enabled: !!address },
  });

  // userNonceStatus returns [isPending: bool, requestBlock: uint256]
  const isPending = userStatusData
    ? Array.isArray(userStatusData)
      ? Boolean((userStatusData as unknown[])[0])
      : Boolean(userStatusData)
    : false;

  // If user already has a pending request, jump to waiting-vrf on mount
  useEffect(() => {
    if (isPending && phase === "idle") {
      setPhase("waiting-vrf");
    }
  }, [isPending, phase]);

  // ---------- Step 1: requestOpenPerkBox(itemId) ----------
  const {
    writeContract: writeRequest,
    data: requestHash,
    isPending: isRequestPending,
    error: requestError,
    reset: resetRequest,
  } = useChainWriteContract();

  const { isLoading: isRequestConfirming, isSuccess: isRequestSuccess } =
    useWaitForTransactionReceipt({ hash: requestHash });

  useEffect(() => {
    if (isRequestSuccess && phase === "requesting") {
      setPhase("waiting-vrf");
    }
  }, [isRequestSuccess, phase]);

  // ---------- VRF polling ----------
  const { refetch: refetchNonce } = useReadContract({
    address: addresses.perkOpener,
    abi: PERK_OPENER_CONTRACT_ABI,
    functionName: "getNonceStatus",
    args: address ? [address] : undefined,
    chainId: chainConfig.wagmiChainId,
    query: { enabled: !!address && phase === "waiting-vrf" },
  });

  useEffect(() => {
    if (phase !== "waiting-vrf") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const result = await refetchNonce();
        if (result.data === true) {
          setVrfFulfilled(true);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // ignore polling errors
      }
    }, POLL_INTERVAL);

    // Immediate check
    refetchNonce().then((result) => {
      if (result.data === true) {
        setVrfFulfilled(true);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    });

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [phase, refetchNonce]);

  // ---------- Step 2: finishOpenPerkBox ----------
  const {
    writeContract: writeFinish,
    data: finishHash,
    isPending: isFinishPending,
    error: finishError,
    reset: resetFinish,
  } = useChainWriteContract();

  const {
    isLoading: isFinishConfirming,
    isSuccess: isFinishSuccess,
    data: finishReceipt,
  } = useWaitForTransactionReceipt({ hash: finishHash });

  // Parse PerkGenerated event from the receipt
  useEffect(() => {
    if (!isFinishSuccess || !finishReceipt || phase !== "finishing") return;

    let found = false;

    for (const log of finishReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: PERK_OPENER_CONTRACT_ABI,
          data: log.data,
          topics: log.topics,
          strict: false,
        });
        if (decoded.eventName === "PerkGenerated") {
          const args = decoded.args as unknown as {
            user: string;
            perkCategoryId: bigint;
            perkTypeId: bigint;
            timestamp: bigint;
          };
          setGeneratedPerk({
            user: args.user,
            perkCategoryId: args.perkCategoryId,
            perkTypeId: args.perkTypeId,
            timestamp: args.timestamp,
          });
          found = true;
          break;
        }
      } catch {
        // Not this event
      }
    }

    if (found) {
      setShowRewardPopup(true);
    }

    setPhase("done");
  }, [isFinishSuccess, finishReceipt, phase]);

  // ---------- Handlers ----------
  const handleRequest = () => {
    if (perkBoxes.length === 0) return;

    resetRequest();
    resetFinish();
    setGeneratedPerk(null);
    setVrfFulfilled(false);
    setShowRewardPopup(false);
    setPhase("requesting");

    const firstBox = perkBoxes[0];

    writeRequest({
      address: addresses.perkOpener,
      abi: PERK_OPENER_CONTRACT_ABI,
      functionName: "requestOpenPerkBox",
      args: [BigInt(firstBox.itemId)],
    });
  };

  const handleFinish = () => {
    resetFinish();
    setGeneratedPerk(null);
    setShowRewardPopup(false);
    setPhase("finishing");
    writeFinish({
      address: addresses.perkOpener,
      abi: PERK_OPENER_CONTRACT_ABI,
      functionName: "finishOpenPerkBox",
      args: [],
    });
  };

  const handleReset = () => {
    resetRequest();
    resetFinish();
    setVrfFulfilled(false);
    setGeneratedPerk(null);
    setShowRewardPopup(false);
    setPhase("idle");
    refetchUserStatus();
    fetchPerkBoxes();
  };

  // ---------- Derived state ----------
  const boxCount = perkBoxes.length;
  const isRequestLoading = isRequestPending || isRequestConfirming;
  const isFinishLoading = isFinishPending || isFinishConfirming;
  const step1Done =
    isRequestSuccess || phase === "waiting-vrf" || phase === "finishing" || phase === "done";
  const step2Done = phase === "done";
  const isWaitingVrf = phase === "waiting-vrf" && !vrfFulfilled;
  const canFinish =
    (phase === "waiting-vrf" && vrfFulfilled) || (isPending && vrfFulfilled);
  const canOpen = boxCount > 0 && phase === "idle" && !inventoryLoading && !isStatusLoading;

  // Perk display
  const perkDisplay = generatedPerk
    ? getPerkDisplay(Number(generatedPerk.perkCategoryId), Number(generatedPerk.perkTypeId))
    : null;
  const colour = perkDisplay ? TYPE_COLOURS[perkDisplay.type] : TYPE_COLOURS.success;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground">Perk Box</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Open a perk box to receive a random perk. Perks include success boosts, cooldown reductions, boosters, and tools.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-5">
          {/* Perk Box Count */}
          <div className="flex items-center justify-between rounded-lg bg-background/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-400/10">
                <Gift className="h-5 w-5 text-fuchsia-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Your Perk Boxes</p>
                <p className="text-xs text-muted-foreground">Category ID: {PERK_BOX_CATEGORY}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {inventoryLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-2xl font-bold text-fuchsia-400">{boxCount}</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchPerkBoxes}
                disabled={inventoryLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", inventoryLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                step1Done
                  ? "bg-green-400/20 text-green-400"
                  : phase === "requesting" || phase === "idle"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              )}
            >
              {step1Done ? <CheckCircle2 className="h-4 w-4" /> : "1"}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                step1Done ? "text-green-400" : "text-foreground"
              )}
            >
              Request
            </span>

            <ArrowRight className="h-3 w-3 text-muted-foreground" />

            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                isWaitingVrf
                  ? "bg-amber-400/20 text-amber-400"
                  : canFinish || phase === "finishing" || step2Done
                    ? step2Done
                      ? "bg-green-400/20 text-green-400"
                      : "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              )}
            >
              {isWaitingVrf ? (
                <Radio className="h-4 w-4 animate-pulse" />
              ) : step2Done ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                "2"
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                isWaitingVrf
                  ? "text-amber-400"
                  : step2Done
                    ? "text-green-400"
                    : canFinish || phase === "finishing"
                      ? "text-foreground"
                      : "text-muted-foreground"
              )}
            >
              {isWaitingVrf ? "Waiting VRF..." : "Finish & Reveal"}
            </span>
          </div>

          {/* Error Messages */}
          {inventoryError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-400">{inventoryError}</p>
            </div>
          )}

          {/* No Boxes Message */}
          {!inventoryLoading && boxCount === 0 && !inventoryError && phase === "idle" && (
            <div className="flex items-center gap-2 rounded-lg bg-fuchsia-400/10 px-3 py-2">
              <Package className="h-3.5 w-3.5 text-fuchsia-400 shrink-0" />
              <span className="text-xs text-fuchsia-400">
                You don&apos;t have any perk boxes.
              </span>
            </div>
          )}

          {/* Status loading */}
          {isStatusLoading && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Checking pending request status...
              </span>
            </div>
          )}

          {/* Pending request detected */}
          {isPending && phase === "waiting-vrf" && !isRequestSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2">
              <Radio className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span className="text-xs text-amber-400">
                Pending request detected. Waiting for VRF fulfillment...
              </span>
            </div>
          )}

          {/* VRF waiting indicator */}
          {isWaitingVrf && isRequestSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-spin" />
              <span className="text-xs text-amber-400">
                Waiting for VRF random seed fulfillment... This may take a few blocks.
              </span>
            </div>
          )}

          {/* VRF fulfilled */}
          {vrfFulfilled && phase === "waiting-vrf" && (
            <div className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
              <span className="text-xs text-green-400">
                VRF fulfilled! You can now finish opening your perk box.
              </span>
            </div>
          )}

          {/* Step 1 tx success */}
          {isRequestSuccess && requestHash && (
            <div className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
              <span className="shrink-0 text-[10px] text-green-400 mr-1">
                Request sent:
              </span>
              <a
                href={`${explorer}/tx/${requestHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400 truncate"
              >
                {requestHash.slice(0, 10)}...{requestHash.slice(-8)}
              </a>
            </div>
          )}

          {/* Step 1 error */}
          {requestError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-400 line-clamp-2">
                {requestError.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : requestError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Step 2 error */}
          {finishError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-400 line-clamp-2">
                {finishError.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : finishError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Perk Box Visual */}
          <div className="relative flex flex-col items-center justify-center py-6">
            <div
              className={cn(
                "relative flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-fuchsia-400/30 bg-fuchsia-400/10 transition-all duration-500",
                (isRequestLoading || isFinishLoading) && "animate-pulse scale-105 border-fuchsia-400"
              )}
            >
              {isRequestLoading || isFinishLoading ? (
                <Sparkles className="h-14 w-14 text-fuchsia-400 animate-spin" />
              ) : (
                <Gift className="h-14 w-14 text-fuchsia-400" />
              )}
            </div>
          </div>

          {/* ========== ACTION BUTTONS ========== */}
          {phase === "idle" && !requestError && (
            <Button
              onClick={handleRequest}
              disabled={!canOpen}
              className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold h-12"
            >
              {!isConnected ? (
                "Connect Wallet First"
              ) : inventoryLoading || isStatusLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : boxCount === 0 ? (
                "No Perk Boxes"
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Open Perk Box
                </>
              )}
            </Button>
          )}

          {phase === "requesting" && (
            <Button disabled className="w-full h-12 opacity-80">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isRequestPending
                ? "Confirm in wallet..."
                : isRequestConfirming
                  ? "Confirming transaction..."
                  : "Processing..."}
            </Button>
          )}

          {requestError && phase === "requesting" && (
            <Button
              onClick={handleRequest}
              disabled={boxCount === 0}
              className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold h-12"
            >
              <Gift className="mr-2 h-4 w-4" />
              Retry: Open Perk Box
            </Button>
          )}

          {isWaitingVrf && (
            <Button
              disabled
              className="w-full h-12 bg-amber-500/20 border border-amber-500/30 text-amber-400"
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Waiting for VRF fulfillment...
            </Button>
          )}

          {canFinish && phase !== "finishing" && phase !== "done" && (
            <Button
              onClick={handleFinish}
              disabled={!isConnected}
              className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold h-12"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Finish Opening
            </Button>
          )}

          {phase === "finishing" && (
            <Button disabled className="w-full h-12 opacity-80">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isFinishPending
                ? "Confirm in wallet..."
                : isFinishConfirming
                  ? "Opening perk box..."
                  : "Processing..."}
            </Button>
          )}

          {finishError && phase === "finishing" && (
            <Button
              onClick={handleFinish}
              className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold h-12"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Retry: Finish Opening
            </Button>
          )}

          {phase === "done" && (
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full h-12"
            >
              <Gift className="mr-2 h-4 w-4" />
              Open Another Perk Box
            </Button>
          )}

          {/* Contract info */}
          <div className="rounded-md bg-background/50 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Contract</span>
              <a
                href={`${explorer}/address/${addresses.perkOpener}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-primary hover:underline"
              >
                {addresses.perkOpener.slice(0, 6)}...
                {addresses.perkOpener.slice(-4)}
              </a>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Step 1</span>
              <span className="font-mono text-[10px] text-primary">
                requestOpenPerkBox(itemId)
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Step 2</span>
              <span className="font-mono text-[10px] text-primary">
                finishOpenPerkBox()
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Popup */}
      <Dialog open={showRewardPopup} onOpenChange={(open) => !open && setShowRewardPopup(false)}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <button
            onClick={() => setShowRewardPopup(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          <DialogHeader>
            <DialogTitle className="text-center">You received a perk!</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            <div className={cn("flex h-20 w-20 items-center justify-center rounded-full", colour.bg)}>
              <Zap className={cn("h-10 w-10", colour.text)} />
            </div>

            {perkDisplay && (
              <div className="text-center w-full">
                {/* Type badge */}
                <span
                  className={cn(
                    "inline-block rounded-full px-3 py-1 text-xs font-semibold mb-3",
                    colour.bg,
                    colour.text
                  )}
                >
                  {getTypeLabel(perkDisplay.type)}
                </span>

                {/* Main content */}
                {perkDisplay.type === "tools" ? (
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {getToolsDisplayName(perkDisplay.tools)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Duration: <span className="font-semibold text-foreground">{perkDisplay.duration} hours</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {perkDisplay.option}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {perkDisplay.type === "success" && (
                        <>Amount: <span className="font-semibold text-emerald-400">+{perkDisplay.amount}% success chance</span></>
                      )}
                      {perkDisplay.type === "cooldown" && (
                        <>Amount: <span className="font-semibold text-sky-400">-{perkDisplay.amount}% cooldown</span></>
                      )}
                      {perkDisplay.type === "booster" && (
                        <>Amount: <span className="font-semibold text-amber-400">+{perkDisplay.amount}%</span></>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Duration: <span className="font-semibold text-foreground">{perkDisplay.duration} hours</span>
                    </p>
                  </div>
                )}

                {/* IDs for reference */}
                <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>Category: {generatedPerk?.perkCategoryId.toString()}</span>
                  <span>Type: {generatedPerk?.perkTypeId.toString()}</span>
                </div>
              </div>
            )}

            {!perkDisplay && generatedPerk && (
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">Perk Received</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Category ID: {generatedPerk.perkCategoryId.toString()}, Type ID: {generatedPerk.perkTypeId.toString()}
                </p>
              </div>
            )}

            {!generatedPerk && (
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">Perk Box Opened Successfully</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Could not decode the perk event from logs. Check the transaction for details.
                </p>
              </div>
            )}

            {finishHash && (
              <a
                href={`${explorer}/tx/${finishHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Transaction
              </a>
            )}

            <Button
              onClick={handleReset}
              className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold"
            >
              <Gift className="mr-2 h-4 w-4" />
              Open Another Perk Box
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
