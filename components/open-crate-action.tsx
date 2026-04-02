"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
  usePublicClient,
} from "wagmi";
import { decodeEventLog } from "viem";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  INVENTORY_CONTRACT_ABI,
  getCrateCategory,
  getCrateItemLabel,
} from "@/lib/contract";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import {
  Loader2,
  BoxSelect,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Radio,
  Sparkles,
  ExternalLink,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "requesting" | "waiting-vrf" | "finishing" | "done";

interface GeneratedItem {
  owner: string;
  itemId: bigint;
  categoryId: bigint;
  typeId: bigint;
  timestamp: bigint;
}

const POLL_INTERVAL = 4000;

// Colour per category group for the reveal card
type ColourSet = { text: string; bg: string; border: string };
const C = (name: string): ColourSet => ({
  text: `text-${name}-400`,
  bg: `bg-${name}-400/10`,
  border: `border-${name}-400/30`,
});

const CATEGORY_COLOURS: Record<number, ColourSet> = {
  0:  C("emerald"),   // Cash
  1:  C("amber"),     // Bullet
  2:  C("red"),       // Health
  3:  C("orange"),    // Shop Item
  4:  C("cyan"),      // Business
  5:  C("blue"),      // Bodyguard
  6:  C("indigo"),    // Helper Credits
  7:  C("yellow"),    // Car
  8:  C("pink"),      // Wrapped NFTs / KEY
  9:  C("sky"),       // Keys / KEYITEMS
  10: C("teal"),      // MAFIA
  11: C("pink"),      // OG NFTs
  12: C("indigo"),    // Noti Credits
  13: C("lime"),      // Land Slot
  14: C("cyan"),      // Business Extra
  15: C("yellow"),    // Car Item
  16: C("blue"),      // FBI Assets
  17: C("fuchsia"),   // Perk Box
  // Success boosts (18-23) — green
  18: C("emerald"), 19: C("emerald"), 20: C("emerald"),
  21: C("emerald"), 22: C("emerald"), 23: C("emerald"),
  // Cooldown boosts (24-32) — sky
  24: C("sky"), 25: C("sky"), 26: C("sky"), 27: C("sky"), 28: C("sky"),
  29: C("sky"), 30: C("sky"), 31: C("sky"), 32: C("sky"),
  // Misc boosts (33-47) — amber
  33: C("amber"), 34: C("amber"), 35: C("amber"), 36: C("amber"),
  37: C("amber"), 38: C("amber"), 39: C("amber"), 40: C("amber"),
  41: C("amber"), 42: C("amber"), 43: C("amber"), 44: C("amber"),
  45: C("amber"), 46: C("amber"), 47: C("amber"),
  // Bodyguards individual (48-51) — blue
  48: C("blue"), 49: C("blue"), 50: C("blue"), 51: C("blue"),
  // Misc (52-56)
  52: C("rose"),      // Subscription
  53: C("indigo"),    // GI Credit
  54: C("amber"),     // Mystery Box
  55: C("orange"),    // Booze Pack
  56: C("orange"),    // Narcs Pack
};

const FALLBACK_COLOUR: ColourSet = C("zinc");

function getItemLabel(categoryId: number, typeId: number): string {
  return getCrateItemLabel(categoryId, typeId);
}

function getCategoryLabel(categoryId: number): string {
  const cat = getCrateCategory(categoryId);
  return cat?.name ?? `Category #${categoryId}`;
}

function getCategoryColour(categoryId: number) {
  return CATEGORY_COLOURS[categoryId] ?? FALLBACK_COLOUR;
}

export function OpenCrateAction() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [vrfFulfilled, setVrfFulfilled] = useState(false);
  const [generatedItem, setGeneratedItem] = useState<GeneratedItem | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const publicClient = usePublicClient();

  // ---------- Read user nonce status on mount ----------
  const {
    data: userStatusData,
    refetch: refetchUserStatus,
    isLoading: isStatusLoading,
  } = useReadContract({
    address: addresses.inventory,
    abi: INVENTORY_CONTRACT_ABI,
    functionName: "userNonceStatus",
    args: address ? [address] : undefined,
    chainId: chainConfig.wagmiChainId,
    query: { enabled: !!address },
  });

  // userNonceStatus returns [isPending: bool, requestId: uint256]
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

  // ---------- Step 1: requestOpenCrate ----------
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
    address: addresses.inventory,
    abi: INVENTORY_CONTRACT_ABI,
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

  // ---------- Step 2: finishOpenCrate ----------
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

  // Parse ItemGenerated event from the receipt
  useEffect(() => {
    if (!isFinishSuccess || !finishReceipt || phase !== "finishing") return;

    const ITEM_GENERATED_TOPIC =
      "0x3f50cef8f3b6b60159b69c3656521d46a54eb802107bd572e175ace3107f241e";

    let found = false;

    console.log("[v0] finishOpenCrate receipt logs count:", finishReceipt.logs.length);

    for (const log of finishReceipt.logs) {
      console.log("[v0] log address:", log.address, "topics:", log.topics);

      // First try: match by known topic hash directly
      if (
        log.topics[0]?.toLowerCase() === ITEM_GENERATED_TOPIC.toLowerCase()
      ) {
        console.log("[v0] Matched ItemGenerated topic, data:", log.data);
        try {
          const decoded = decodeEventLog({
            abi: INVENTORY_CONTRACT_ABI,
            data: log.data,
            topics: log.topics,
            strict: false,
          });
          console.log("[v0] decoded event:", decoded.eventName, decoded.args);
          if (decoded.eventName === "ItemGenerated") {
            const args = decoded.args as unknown as {
              owner: string;
              itemId: bigint;
              categoryId: bigint;
              typeId: bigint;
              timestamp: bigint;
            };
            setGeneratedItem({
              owner: args.owner,
              itemId: args.itemId,
              categoryId: args.categoryId,
              typeId: args.typeId,
              timestamp: args.timestamp,
            });
            found = true;
            break;
          }
        } catch (err) {
          console.log("[v0] decodeEventLog error:", err);
        }
      }

      // Second try: use decodeEventLog without strict matching
      if (!found) {
        try {
          const decoded = decodeEventLog({
            abi: INVENTORY_CONTRACT_ABI,
            data: log.data,
            topics: log.topics,
            strict: false,
          });
          if (decoded.eventName === "ItemGenerated") {
            console.log("[v0] decoded via fallback:", decoded.args);
            const args = decoded.args as unknown as {
              owner: string;
              itemId: bigint;
              categoryId: bigint;
              typeId: bigint;
              timestamp: bigint;
            };
            setGeneratedItem({
              owner: args.owner,
              itemId: args.itemId,
              categoryId: args.categoryId,
              typeId: args.typeId,
              timestamp: args.timestamp,
            });
            found = true;
            break;
          }
        } catch {
          // Not this event
        }
      }
    }

    console.log("[v0] ItemGenerated found:", found);
    setPhase("done");
  }, [isFinishSuccess, finishReceipt, phase]);

  // ---------- Handlers ----------
  const handleRequest = () => {
    resetRequest();
    resetFinish();
    setGeneratedItem(null);
    setPhase("requesting");
    writeRequest({
      address: addresses.inventory,
      abi: INVENTORY_CONTRACT_ABI,
      functionName: "requestOpenCrate",
      args: [],
    });
  };

  const handleFinish = () => {
    resetFinish();
    setGeneratedItem(null);
    setPhase("finishing");
    writeFinish({
      address: addresses.inventory,
      abi: INVENTORY_CONTRACT_ABI,
      functionName: "finishOpenCrate",
      args: [],
    });
  };

  const handleReset = () => {
    resetRequest();
    resetFinish();
    setVrfFulfilled(false);
    setGeneratedItem(null);
    setPhase("idle");
    refetchUserStatus();
  };

  // ---------- Derived state ----------
  const isRequestLoading = isRequestPending || isRequestConfirming;
  const isFinishLoading = isFinishPending || isFinishConfirming;
  const step1Done =
    isRequestSuccess || phase === "waiting-vrf" || phase === "finishing" || phase === "done";
  const step2Done = phase === "done";
  const isWaitingVrf = phase === "waiting-vrf" && !vrfFulfilled;
  const canFinish =
    (phase === "waiting-vrf" && vrfFulfilled) || (isPending && vrfFulfilled);

  // Item display
  const catId = generatedItem ? Number(generatedItem.categoryId) : 0;
  const typId = generatedItem ? Number(generatedItem.typeId) : 0;
  const colour = getCategoryColour(catId);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground">Open Crate</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Open a crate in two steps: request a random seed, wait for VRF
          fulfillment, then finish to reveal your items.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-5">
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

          {/* Contract info */}
          <div className="rounded-md bg-background/50 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Contract</span>
              <a
                href={`${explorer}/address/${addresses.inventory}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-primary hover:underline"
              >
                {addresses.inventory.slice(0, 6)}...
                {addresses.inventory.slice(-4)}
              </a>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Step 1</span>
              <span className="font-mono text-[10px] text-primary">
                requestOpenCrate()
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Step 2</span>
              <span className="font-mono text-[10px] text-primary">
                finishOpenCrate()
              </span>
            </div>
          </div>

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
                Waiting for VRF random seed fulfillment... This may take a few
                blocks.
              </span>
            </div>
          )}

          {/* VRF fulfilled */}
          {vrfFulfilled && phase === "waiting-vrf" && (
            <div className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
              <span className="text-xs text-green-400">
                VRF fulfilled! You can now finish opening your crate.
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

          {/* ========== REVEAL CARD ========== */}
          {phase === "done" && generatedItem && (
            <div
              className={cn(
                "relative overflow-hidden rounded-xl border-2 p-5",
                colour.border,
                colour.bg
              )}
            >
              {/* Sparkle decoration */}
              <div className="absolute -top-2 -right-2 opacity-20">
                <Sparkles className={cn("h-20 w-20", colour.text)} />
              </div>

              <div className="relative flex flex-col items-center gap-4 text-center">
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl",
                    colour.bg
                  )}
                >
                  <Package className={cn("h-7 w-7", colour.text)} />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Item Revealed
                  </p>
                  <p className={cn("mt-1 text-xl font-bold", colour.text)}>
                    {getItemLabel(catId, typId)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-semibold",
                      colour.bg,
                      colour.text
                    )}
                  >
                    {getCategoryLabel(catId)}
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
                    Item #{generatedItem.itemId.toString()}
                  </span>
                </div>

                <div className="mt-1 grid w-full grid-cols-2 gap-2 text-left">
                  <div className="rounded-lg bg-background/60 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">
                      Category ID
                    </p>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {generatedItem.categoryId.toString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">Type ID</p>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {generatedItem.typeId.toString()}
                    </p>
                  </div>
                </div>

                {finishHash && (
                  <a
                    href={`${explorer}/tx/${finishHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View transaction
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Done but no event parsed */}
          {phase === "done" && !generatedItem && finishHash && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-green-400/30 bg-green-400/10 p-5 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-400">
                  Crate Opened Successfully
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Could not decode the item event from logs. Check the
                  transaction for details.
                </p>
              </div>
              <a
                href={`${explorer}/tx/${finishHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View transaction
              </a>
            </div>
          )}

          {/* ========== ACTION BUTTONS ========== */}
          {phase === "idle" && !requestError && (
            <button
              onClick={handleRequest}
              disabled={!isConnected || isStatusLoading}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200",
                isConnected
                  ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              <BoxSelect className="h-4 w-4" />
              {isConnected
                ? "Step 1: Request Open Crate"
                : "Connect Wallet First"}
            </button>
          )}

          {phase === "requesting" && (
            <button
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground opacity-80"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {isRequestPending
                ? "Confirm in wallet..."
                : isRequestConfirming
                  ? "Confirming transaction..."
                  : "Processing..."}
            </button>
          )}

          {requestError && phase === "requesting" && (
            <button
              onClick={handleRequest}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110 active:scale-[0.98]"
            >
              <BoxSelect className="h-4 w-4" />
              Retry: Request Open Crate
            </button>
          )}

          {isWaitingVrf && (
            <button
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-3 text-sm font-semibold text-amber-400"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for VRF fulfillment...
            </button>
          )}

          {canFinish && phase !== "finishing" && phase !== "done" && (
            <button
              onClick={handleFinish}
              disabled={!isConnected}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200",
                "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              Step 2: Finish & Reveal
            </button>
          )}

          {phase === "finishing" && (
            <button
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground opacity-80"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {isFinishPending
                ? "Confirm in wallet..."
                : isFinishConfirming
                  ? "Opening crate..."
                  : "Processing..."}
            </button>
          )}

          {finishError && phase === "finishing" && (
            <button
              onClick={handleFinish}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110 active:scale-[0.98]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Retry: Finish & Reveal
            </button>
          )}

          {phase === "done" && (
            <button
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-secondary/80 active:scale-[0.98]"
            >
              <BoxSelect className="h-4 w-4" />
              Open Another Crate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
