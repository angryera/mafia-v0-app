"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { decodeEventLog } from "viem";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  STORY_MODE_ABI,
  MYSTERY_BOX_REWARDS,
} from "@/lib/contract";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Gift,
  Sparkles,
  ExternalLink,
  Package,
  RefreshCw,
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

// Mystery box category ID from inventory
const MYSTERY_BOX_CATEGORY = 54;

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

type Phase = "idle" | "loading-inventory" | "opening" | "confirming" | "done";

export function MysteryBoxAction() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mysteryBoxes, setMysteryBoxes] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [rewardIndex, setRewardIndex] = useState<number | null>(null);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  // Fetch mystery boxes from inventory
  const fetchMysteryBoxes = useCallback(async () => {
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
        categoryId: MYSTERY_BOX_CATEGORY,
        maxItems: 100000,
      });

      // Filter items by owner (case-insensitive)
      const userBoxes = items.filter(
        (item) =>
          item.owner.toLowerCase() === address.toLowerCase() &&
          item.categoryId === MYSTERY_BOX_CATEGORY
      );

      setMysteryBoxes(userBoxes);
    } catch (err) {
      console.error("Failed to fetch mystery boxes:", err);
      setInventoryError("Failed to load mystery boxes from inventory");
    } finally {
      setInventoryLoading(false);
    }
  }, [address, chainConfig.id, addresses.inventory]);

  // Load inventory on mount and when address changes
  useEffect(() => {
    // Wait for MafiaInventory to be available
    const checkInventory = () => {
      if (window.MafiaInventory) {
        fetchMysteryBoxes();
      } else {
        // Retry after a short delay
        setTimeout(checkInventory, 500);
      }
    };
    
    if (isConnected && address) {
      checkInventory();
    } else {
      setInventoryLoading(false);
    }
  }, [isConnected, address, fetchMysteryBoxes]);

  // Contract write hook
  const {
    writeContract,
    data: openHash,
    isPending: isOpenPending,
    error: openError,
    reset: resetOpen,
  } = useChainWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: openHash });

  // Handle transaction confirmation and event parsing
  useEffect(() => {
    if (!isConfirmed || !receipt || phase !== "confirming") return;

    // Parse MysteryBoxClaimed event from receipt
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: STORY_MODE_ABI,
          data: log.data,
          topics: log.topics,
          strict: false,
        });

        if (decoded.eventName === "MysteryBoxClaimed") {
          const args = decoded.args as unknown as {
            user: string;
            itemId: bigint;
            mysteryBoxIndex: bigint;
            claimedAt: bigint;
          };

          // mysteryBoxIndex is 1-based (1-27), convert to 0-based array index
          const contractIndex = Number(args.mysteryBoxIndex);
          const arrayIndex = contractIndex - 1;
          
          setRewardIndex(arrayIndex);
          setTxHash(receipt.transactionHash);
          
          // Start animation
          setIsAnimating(true);
          setTimeout(() => {
            setIsAnimating(false);
            setShowRewardPopup(true);
            setPhase("done");
          }, 1500);
          
          return;
        }
      } catch {
        // Not this event, continue
      }
    }

    // If no event found, still show done state
    setPhase("done");
  }, [isConfirmed, receipt, phase]);

  // Update phase based on transaction state
  useEffect(() => {
    if (isOpenPending && phase === "idle") {
      setPhase("opening");
    }
    if (isConfirming && phase === "opening") {
      setPhase("confirming");
    }
  }, [isOpenPending, isConfirming, isConfirmed, phase]);

  // Handle open mystery box
  const handleOpenBox = () => {
    if (mysteryBoxes.length === 0) return;

    resetOpen();
    setRewardIndex(null);
    setTxHash(null);
    setShowRewardPopup(false);
    setPhase("opening");

    const firstBox = mysteryBoxes[0];
    
    writeContract({
      address: addresses.storyMode,
      abi: STORY_MODE_ABI,
      functionName: "claimMysteryBox",
      args: [BigInt(firstBox.itemId)],
    });
  };

  // Handle opening another box
  const handleOpenAnother = () => {
    setShowRewardPopup(false);
    setRewardIndex(null);
    setTxHash(null);
    setPhase("idle");
    fetchMysteryBoxes();
  };

  // Derived state
  const boxCount = mysteryBoxes.length;
  const canOpen = boxCount > 0 && phase === "idle" && !inventoryLoading;
  const isLoading = isOpenPending || isConfirming || isAnimating;
  // rewardIndex is already 0-based array index after conversion
  const reward = rewardIndex !== null && rewardIndex >= 0 && rewardIndex < MYSTERY_BOX_REWARDS.length
    ? MYSTERY_BOX_REWARDS[rewardIndex]
    : null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground">Mystery Box</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Open mystery boxes to receive random rewards including Credits, Keys, Bodyguards, and more.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-5">
          {/* Mystery Box Count */}
          <div className="flex items-center justify-between rounded-lg bg-background/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10">
                <Gift className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Your Mystery Boxes</p>
                <p className="text-xs text-muted-foreground">Category ID: {MYSTERY_BOX_CATEGORY}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {inventoryLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-2xl font-bold text-amber-400">{boxCount}</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMysteryBoxes}
                disabled={inventoryLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", inventoryLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Error Messages */}
          {inventoryError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-400">{inventoryError}</p>
            </div>
          )}

          {openError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-400 line-clamp-2">
                {openError.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : openError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* No Boxes Message */}
          {!inventoryLoading && boxCount === 0 && !inventoryError && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2">
              <Package className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-400">
                You don&apos;t have any mystery box.
              </span>
            </div>
          )}

          {/* Transaction Status */}
          {openHash && (
            <div className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              {isConfirming ? (
                <Loader2 className="h-3.5 w-3.5 text-green-400 shrink-0 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
              )}
              <span className="shrink-0 text-[10px] text-green-400 mr-1">
                {isConfirming ? "Confirming:" : "Confirmed:"}
              </span>
              <a
                href={`${explorer}/tx/${openHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400 truncate"
              >
                {openHash.slice(0, 10)}...{openHash.slice(-8)}
              </a>
            </div>
          )}

          {/* Mystery Box Visual */}
          <div className="relative flex flex-col items-center justify-center py-8">
            <div
              className={cn(
                "relative flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 transition-all duration-500",
                isAnimating && "animate-pulse scale-110 border-amber-400"
              )}
            >
              {isAnimating ? (
                <Sparkles className="h-16 w-16 text-amber-400 animate-spin" />
              ) : (
                <Gift className="h-16 w-16 text-amber-400" />
              )}
            </div>
            {isAnimating && (
              <p className="mt-4 text-sm font-medium text-amber-400 animate-pulse">
                Opening...
              </p>
            )}
          </div>

          {/* Open Button */}
          <Button
            onClick={handleOpenBox}
            disabled={!canOpen || isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isOpenPending ? "Confirm in Wallet..." : isConfirming ? "Confirming..." : "Opening..."}
              </>
            ) : boxCount === 0 ? (
              "No Mystery Boxes"
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Open Now
              </>
            )}
          </Button>

          {/* Contract Info */}
          <div className="rounded-md bg-background/50 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Contract</span>
              <a
                href={`${explorer}/address/${addresses.storyMode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-primary hover:underline"
              >
                {addresses.storyMode.slice(0, 6)}...
                {addresses.storyMode.slice(-4)}
              </a>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Function</span>
              <span className="font-mono text-[10px] text-primary">
                claimMysteryBox(itemId)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Possible Rewards</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {MYSTERY_BOX_REWARDS.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border border-border/50 bg-background/50 p-3 text-center transition-all",
                rewardIndex === index && "border-amber-400 bg-amber-400/10"
              )}
            >
              <p className="text-xs text-muted-foreground mb-1">#{index + 1}</p>
              <p className="text-xs font-medium text-foreground leading-tight">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reward Popup */}
      {showRewardPopup && (
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
              <DialogTitle className="text-center">Mystery Box Reward</DialogTitle>
            </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10">
              <Sparkles className="h-10 w-10 text-amber-400" />
            </div>
            
            <div className="text-center">
              <p className="text-lg font-bold text-green-400 mb-2">Congratulations!</p>
              <p className="text-2xl font-bold text-foreground">
                {reward?.label || "Unknown Reward"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Has been added to your inventory
              </p>
            </div>

            {txHash && (
              <a
                href={`${explorer}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Transaction
              </a>
            )}

            <Button
              onClick={handleOpenAnother}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              <Gift className="mr-2 h-4 w-4" />
              Open New Mystery Box
            </Button>
          </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
