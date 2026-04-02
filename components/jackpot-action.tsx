"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  JACKPOT_ABI,
  INGAME_CURRENCY_ABI,
} from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  Loader2,
  Trophy,
  Users,
  DollarSign,
  Timer,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEther, parseEther, decodeEventLog, maxUint256, type Log } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useChain } from "@/components/chain-provider";
import { ItemCategory } from "@/lib/contract";
import Script from "next/script";
import { Package } from "lucide-react";

// ── Shop item names ─────────────────────────────────────────────
const SHOP_ITEM_NAMES = [
  "Hand Gun Colt",
  "Remington",
  "Thompson",
  "Molotov cocktail",
  "Grenade",
  "Motorcycle",
  "Bullet proof vest",
  "Bullet proof suit",
  "Armored car",
  "Douglas M-3",
];

// ── Perk box names (based on typeId) ────────────────────────────
const PERK_BOX_NAMES = [
  "1 Perk Box",
  "3 Perk Boxes",
  "5 Perk Boxes",
  "7 Perk Boxes",
  "10 Perk Boxes",
  "15 Perk Boxes",
  "25 Perk Boxes",
  "50 Perk Boxes",
  "75 Perk Boxes",
  "100 Perk Boxes",
];

// ── Inventory item type ─────────────────────────────────────────
interface InventoryItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
}

// ── Round states (matches contract enum) ────────────────────────
// enum STATE { WAITING, STARTED, LIVE, CALCULATING_WINNER }
const ROUND_STATES: Record<number, { label: string; color: string; description: string }> = {
  0: { label: "Waiting", color: "text-yellow-400", description: "No players yet" },
  1: { label: "Started", color: "text-orange-400", description: "1 player, waiting for opponent" },
  2: { label: "Live", color: "text-green-400", description: "Countdown active" },
  3: { label: "Calculating", color: "text-primary", description: "Winner being determined" },
};

// ── Entry types (matches contract EntryType enum) ───────────────
// enum EntryType { MAFIA_TOKEN, IN_GAME_CASH, HELPER_CREDIT, PERK_BOX, OG_CRATE, INVENTORY_ITEM }
const ENTRY_TYPES = [
  { id: 0, label: "Mafia Token", unit: "tokens" },
  { id: 1, label: "In-Game Cash", unit: "cash" },
  { id: 2, label: "Helper Credit", unit: "credits" },
  { id: 3, label: "Perk Box", unit: "boxes" },
  { id: 4, label: "OG Crate", unit: "crates" },
  { id: 5, label: "Shop Item", unit: "item" },
] as const;

// ═══════════════════════════════════════════════════════════════
export function JackpotAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const publicClient = usePublicClient();
  const { chainConfig } = useChain();

  // ── State ──────────────────────────────────────────────────────
  const [entryAmount, setEntryAmount] = useState("");
  const [selectedEntryType, setSelectedEntryType] = useState(1); // Default: In-Game Cash (entry type 1)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  // ── Shop items inventory state ─────────────────────────────────
  const [scriptReady, setScriptReady] = useState(false);
  const [shopItems, setShopItems] = useState<InventoryItem[]>([]);
  const [shopItemsLoading, setShopItemsLoading] = useState(false);
  const [selectedShopItemId, setSelectedShopItemId] = useState<number | null>(null);

  // ── Perk box items inventory state ─────────────────────────────
  const [perkBoxItems, setPerkBoxItems] = useState<InventoryItem[]>([]);
  const [perkBoxItemsLoading, setPerkBoxItemsLoading] = useState(false);
  const [selectedPerkBoxIds, setSelectedPerkBoxIds] = useState<number[]>([]);

  // ── Tick every second for countdown ────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Load shop items from inventory ─────────────────────────────
  const loadShopItems = useCallback(async () => {
    if (!scriptReady || !address || !chainConfig) return;
    setShopItemsLoading(true);
    try {
      // @ts-expect-error MafiaInventory is loaded from external script
      const items = await window.MafiaInventory.getItemsByCategory({
        chain: chainConfig.id,
        contractAddress: addresses.inventory,
        categoryId: ItemCategory.SHOPITEM, // categoryId 3
        maxItems: 100000,
      });
      // Filter to only items owned by the current user
      const ownedItems = (items || []).filter(
        (item: InventoryItem) => item.owner?.toLowerCase() === address.toLowerCase()
      );
      setShopItems(ownedItems);
    } catch (err) {
      console.error("Failed to load shop items:", err);
      setShopItems([]);
    } finally {
      setShopItemsLoading(false);
    }
  }, [scriptReady, address, chainConfig, addresses.inventory]);

  // Load shop items when entry type is Shop Item
  useEffect(() => {
    if (selectedEntryType === 5 && scriptReady && isConnected && address) {
      loadShopItems();
    }
  }, [selectedEntryType, scriptReady, isConnected, address, loadShopItems]);

  // ── Load perk box items from inventory ─────────────────────────
  const loadPerkBoxItems = useCallback(async () => {
    if (!scriptReady || !address || !chainConfig) return;
    setPerkBoxItemsLoading(true);
    try {
      // @ts-expect-error MafiaInventory is loaded from external script
      const items = await window.MafiaInventory.getItemsByCategory({
        chain: chainConfig.id,
        contractAddress: addresses.inventory,
        categoryId: ItemCategory.PERK_BOX, // categoryId 17
        maxItems: 100000,

      });
      // Filter to only items owned by the current user and categoryId 17
      const ownedItems = (items || []).filter(
        (item: InventoryItem) => 
          item.owner?.toLowerCase() === address.toLowerCase() &&
          item.categoryId === ItemCategory.PERK_BOX
      );
      setPerkBoxItems(ownedItems);
    } catch (err) {
      console.error("Failed to load perk box items:", err);
      setPerkBoxItems([]);
    } finally {
      setPerkBoxItemsLoading(false);
    }
  }, [scriptReady, address, chainConfig, addresses.inventory]);

  // Load perk box items when entry type is Perk Box
  useEffect(() => {
    if (selectedEntryType === 3 && scriptReady && isConnected && address) {
      loadPerkBoxItems();
    }
  }, [selectedEntryType, scriptReady, isConnected, address, loadPerkBoxItems]);

  // ── Read current round ─────────────────────────────────────────
  const { data: roundRaw, refetch: refetchRound, isLoading: roundLoading } = useReadContract({
    address: addresses.jackpot,
    abi: JACKPOT_ABI,
    functionName: "getCurrentRound",
    query: { enabled: isConnected, refetchInterval: 10_000 },
  });

  // ── Read total pot USD ─────────────────────────────────────────
  const { data: totalPotRaw, refetch: refetchPot } = useReadContract({
    address: addresses.jackpot,
    abi: JACKPOT_ABI,
    functionName: "getCurrentRoundTotalPotUSD",
    query: { enabled: isConnected, refetchInterval: 10_000 },
  });

  // ── Read bet limits ────────────────────────────────────────────
  const { data: betLimitsRaw } = useReadContract({
    address: addresses.jackpot,
    abi: JACKPOT_ABI,
    functionName: "getBetLimits",
    query: { enabled: isConnected },
  });

  // ── Read fee percentage ────────────────────────────────────────
  const { data: feePercentageRaw } = useReadContract({
    address: addresses.jackpot,
    abi: JACKPOT_ABI,
    functionName: "feePercentage",
    query: { enabled: isConnected },
  });

  // ── Parse round data ───────────────────────────────────────────
  const round = useMemo(() => {
    if (!roundRaw) return null;
    const r = roundRaw as any;
    return {
      roundId: Number(r.roundId ?? r[0] ?? 0n),
      state: Number(r.state ?? r[1] ?? 0),
      totalUSD: Number(formatEther(r.totalUSD ?? r[2] ?? 0n)),
      liveTime: Number(r.liveTime ?? r[3] ?? 0n),
      duration: Number(r.duration ?? r[4] ?? 0n),
      entriesCount: Number(r.entriesCount ?? r[5] ?? 0n),
      minBetUSD: Number(formatEther(r.minBetUSD ?? r[6] ?? 0n)),
      maxBetUSD: Number(formatEther(r.maxBetUSD ?? r[7] ?? 0n)),
    };
  }, [roundRaw]);

  const totalPotUSD = totalPotRaw ? Number(formatEther(totalPotRaw as bigint)) : round?.totalUSD ?? 0;
  const betLimits = betLimitsRaw
    ? {
        min: Number(formatEther((betLimitsRaw as any).minBetUSD ?? (betLimitsRaw as any)[0] ?? 0n)),
        max: Number(formatEther((betLimitsRaw as any).maxBetUSD ?? (betLimitsRaw as any)[1] ?? 0n)),
      }
    : null;
  const feePercent = feePercentageRaw ? Number(feePercentageRaw) : null;

  // ── Countdown ──────────────────────────────────────────────────
  // Countdown only applies when state is LIVE (2) - liveTime is set when round goes LIVE
  const roundEndTime = round ? round.liveTime + round.duration : 0;
  const remaining = round?.state === 2 ? Math.max(0, roundEndTime - now) : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  
  // State flags:
  // - isLive: countdown is active (state 2 = LIVE)
  // - isAccepting: players can enter (states 0=WAITING, 1=STARTED, 2=LIVE)
  const isLive = round?.state === 2;
  const isAccepting = round?.state === 0 || round?.state === 1 || round?.state === 2;

  // ── Round state display ────────────────────────────────────────
  const stateInfo = round ? ROUND_STATES[round.state] ?? { label: `State ${round.state}`, color: "text-muted-foreground", description: "Unknown state" } : null;

  // ── Contracts: Approve ─────────────────────────────────────────
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const approveLoading = approvePending || approveConfirming;

  // ── Contracts: Enter Pot ───────────────────────────────────────
  const {
    writeContract: writeEnter,
    data: enterHash,
    isPending: enterPending,
    error: enterError,
    reset: resetEnter,
  } = useChainWriteContract();

  const {
    isLoading: enterConfirming,
    isSuccess: enterSuccess,
    data: enterReceipt,
  } = useWaitForTransactionReceipt({ hash: enterHash });

  const enterLoading = enterPending || enterConfirming;

  // ── Handle approve ─────────────────────────────────────────────
  function handleApprove() {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.jackpot, maxUint256],
    });
  }

  // ── Handle enter pot ───────────────────────────────────────────
  function handleEnterPot() {
    resetEnter();

    // Shop Item entry uses different contract function
    if (selectedEntryType === 5) {
      if (!selectedShopItemId) {
        toast.error("Select a shop item to enter");
        return;
      }
      writeEnter({
        address: addresses.jackpot,
        abi: JACKPOT_ABI,
        functionName: "enterPotWithInventoryItem",
        args: [BigInt(selectedShopItemId)],
      });
      return;
    }

    // Perk Box entry uses enterPotWithPerkBoxes with item IDs
    if (selectedEntryType === 3) {
      if (selectedPerkBoxIds.length === 0) {
        toast.error("Select at least one perk box to enter");
        return;
      }
      writeEnter({
        address: addresses.jackpot,
        abi: JACKPOT_ABI,
        functionName: "enterPotWithPerkBoxes",
        args: [selectedPerkBoxIds.map(id => BigInt(id))],
      });
      return;
    }

    const amount = Number(entryAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    // Entry types that use wei (parseEther): MAFIA_TOKEN (0), IN_GAME_CASH (1), HELPER_CREDIT (2)
    // Entry types that use integer count: OG_CRATE (4)
    const useWeiConversion = selectedEntryType === 0 || selectedEntryType === 1 || selectedEntryType === 2;
    const amountValue = useWeiConversion 
      ? parseEther(entryAmount) 
      : BigInt(Math.floor(amount));

    writeEnter({
      address: addresses.jackpot,
      abi: JACKPOT_ABI,
      functionName: "enterPot",
      args: [selectedEntryType, amountValue],
    });
  }

  // ── Toast on approve success ───────────────────────────────────
  const approveToastRef = useRef(false);
  useEffect(() => {
    if (approveSuccess && approveHash && !approveToastRef.current) {
      approveToastRef.current = true;
      toast.success("Cash spend approved for Jackpot");
    }
    if (!approveHash) approveToastRef.current = false;
  }, [approveSuccess, approveHash]);

  // ── Parse EnteredPot event on success ──────────────────────────
  const enteredPotResult = useMemo(() => {
    if (!enterReceipt?.logs) return null;
    for (const log of enterReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: JACKPOT_ABI,
          data: log.data,
          topics: (log as Log).topics,
          strict: false,
        });
        if (decoded.eventName === "EnteredPot") {
          const args = decoded.args as any;
          return {
            assetType: args.assetType as string,
            usdValue: Number(formatEther(args.usdValue ?? 0n)),
            amount: Number(formatEther(args.amount ?? 0n)),
            entryId: Number(args.entryId ?? 0n),
          };
        }
      } catch {
        // not our event
      }
    }
    return null;
  }, [enterReceipt]);

  // ── Toast on enter success ─────────────────────────────────────
  const enterToastRef = useRef(false);
  useEffect(() => {
    if (enterSuccess && enterHash && !enterToastRef.current) {
      enterToastRef.current = true;
      const usd = enteredPotResult
        ? ` ($${enteredPotResult.usdValue.toFixed(2)} USD)`
        : "";
      toast.success(`Entered the pot${usd}! Entry #${enteredPotResult?.entryId ?? "?"}`);
      refetchRound();
      refetchPot();
      // Refresh shop items if we just entered with one
      if (selectedEntryType === 5) {
        setSelectedShopItemId(null);
        loadShopItems();
      }
      // Refresh perk box items if we just entered with them
      if (selectedEntryType === 3) {
        setSelectedPerkBoxIds([]);
        loadPerkBoxItems();
      }
    }
    if (!enterHash) enterToastRef.current = false;
  }, [enterSuccess, enterHash, enteredPotResult, refetchRound, refetchPot, selectedEntryType, loadShopItems, loadPerkBoxItems]);

  // For shop items, we need a selected item instead of an amount
  // For perk boxes, we need selected perk box IDs
  // Approval is only required for In-Game Cash (entry type 1)
  const needsApproval = selectedEntryType === 1;
  const isApproved = !needsApproval || approveSuccess;
  const canEnter = isAccepting && !enterLoading && isApproved && (
    selectedEntryType === 5 
      ? selectedShopItemId !== null 
      : selectedEntryType === 3
        ? selectedPerkBoxIds.length > 0
        : Number(entryAmount) > 0
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      {/* External scripts for inventory */}
      <Script
        src="/js/mafia-utils.js"
        strategy="afterInteractive"
        onReady={() => {
          // Utils script loaded
        }}
      />
      <Script
        src="/js/mafia-inventory.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Jackpot</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Enter the pot with cash, tokens, or items. Winner takes all.
          </p>
        </div>
        <button
          onClick={() => {
            refetchRound();
            refetchPot();
          }}
          disabled={roundLoading}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Refresh round"
        >
          <RefreshCw className={cn("h-4 w-4", roundLoading && "animate-spin")} />
        </button>
      </div>

      {/* ── Round status hero card ──────────────────────────────── */}
      {round && (
        <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Round #{round.roundId}
              </span>
            </div>
            {stateInfo && (
              <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    stateInfo.color,
                    round.state === 2
                      ? "border-green-400/30 bg-green-400/10" // LIVE
                      : round.state === 1
                        ? "border-orange-400/30 bg-orange-400/10" // STARTED
                        : round.state === 0
                          ? "border-yellow-400/30 bg-yellow-400/10" // WAITING
                          : "border-border bg-secondary", // CALCULATING_WINNER
                  )}
              >
                {stateInfo.label}
              </span>
            )}
          </div>

          {/* Pot value */}
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground mb-1">Total Pot</p>
            <p className="font-mono text-3xl font-bold text-foreground">
              ${totalPotUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">USD</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-center">
              <Users className="mx-auto h-3.5 w-3.5 text-muted-foreground mb-0.5" />
              <p className="font-mono text-sm font-semibold text-foreground">
                {round.entriesCount}
              </p>
              <p className="text-[10px] text-muted-foreground">Entries</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-center">
              <Timer
                className={cn(
                  "mx-auto h-3.5 w-3.5 mb-0.5",
                  isLive && remaining > 0 ? "text-green-400" : "text-muted-foreground",
                )}
              />
              {isLive && remaining > 0 ? (
                <p className="font-mono text-sm font-semibold text-green-400 tabular-nums">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </p>
              ) : (
                <p className="font-mono text-sm font-semibold text-muted-foreground">--:--</p>
              )}
              <p className="text-[10px] text-muted-foreground">Time Left</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-center">
              <DollarSign className="mx-auto h-3.5 w-3.5 text-muted-foreground mb-0.5" />
              <p className="font-mono text-sm font-semibold text-foreground">
                {feePercent !== null ? `${feePercent}%` : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground">Fee</p>
            </div>
          </div>

          {/* Bet limits */}
          {betLimits && (
            <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-mono">
              <span>Min: ${betLimits.min.toLocaleString()} USD</span>
              <span>Max: ${betLimits.max.toLocaleString()} USD</span>
            </div>
          )}
        </div>
      )}

      {roundLoading && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading round data...</span>
        </div>
      )}

      {/* ── Step 1: Approve (only for In-Game Cash) ────────────── */}
      {needsApproval && (
        <div
          className={cn(
            "mb-4 rounded-xl border p-4",
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
              {approveSuccess ? <ShieldCheck className="h-3.5 w-3.5" /> : "1"}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  approveSuccess ? "text-green-400" : "text-foreground",
                )}
              >
                {approveSuccess ? "Cash Spend Approved" : "Approve Cash Spend"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {approveSuccess
                  ? "Approved. You can now enter the pot."
                  : "Allow the Jackpot contract to use your in-game cash."}
              </p>

              {approveError && (
                <p className="mt-1 text-[10px] text-red-400">
                  {approveError.message.includes("User rejected")
                    ? "Transaction rejected by user"
                    : approveError.message.split("\n")[0]}
                </p>
              )}

              {approveHash && (
                <a
                  href={`${explorer}/tx/${approveHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-mono text-[10px] text-primary hover:underline"
                >
                  {approveHash.slice(0, 10)}...{approveHash.slice(-8)}
                </a>
              )}

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

      {/* ── Enter pot section ────────────────────────────────────── */}
      <div
        className={cn(
          "mb-4 rounded-xl border p-4",
          isApproved
            ? "border-chain-accent/30 bg-chain-accent/5"
            : "border-border bg-background/30 opacity-50",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
              isApproved
                ? "bg-chain-accent/20 text-chain-accent"
                : "bg-muted text-muted-foreground",
            )}
          >
            {needsApproval ? "2" : <Trophy className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-semibold",
                isApproved ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Enter the Pot
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isApproved
                ? "Choose entry type and amount to enter the jackpot."
                : "Complete step 1 first."}
            </p>

            {isApproved && (
              <div className="mt-3 flex flex-col gap-3">
                {/* Entry type selector */}
                <div className="flex flex-wrap gap-1.5">
                  {ENTRY_TYPES.map((et) => (
                    <button
                      key={et.id}
                      onClick={() => setSelectedEntryType(et.id)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        selectedEntryType === et.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {et.label}
                    </button>
                  ))}
                </div>

                {/* Amount input, Shop Item selector, or Perk Box selector */}
                {selectedEntryType === 5 ? (
                  // Shop Item selector
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Package className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Select
                          value={selectedShopItemId?.toString() ?? ""}
                          onValueChange={(val) => setSelectedShopItemId(val ? Number(val) : null)}
                          disabled={shopItemsLoading}
                        >
                          <SelectTrigger className="h-10 pl-9 font-mono text-sm">
                            <SelectValue placeholder={shopItemsLoading ? "Loading items..." : "Select shop item"} />
                          </SelectTrigger>
                          <SelectContent>
                            {shopItems.length === 0 && !shopItemsLoading ? (
                              <SelectItem value="none" disabled>
                                No shop items in inventory
                              </SelectItem>
                            ) : (
                              shopItems.map((item) => (
                                <SelectItem key={item.itemId} value={item.itemId.toString()}>
                                  {SHOP_ITEM_NAMES[item.typeId] ?? `Item #${item.typeId}`} (ID: {item.itemId})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleEnterPot}
                        disabled={!canEnter}
                        className="h-10 gap-1.5"
                      >
                        {enterLoading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {enterPending ? "Confirm..." : "Entering..."}
                          </>
                        ) : (
                          <>
                            <Trophy className="h-3.5 w-3.5" />
                            Enter Pot
                          </>
                        )}
                      </Button>
                    </div>
                    {shopItemsLoading && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading shop items from inventory...
                      </div>
                    )}
                    {!shopItemsLoading && shopItems.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        You don&apos;t have any shop items in your inventory.
                      </p>
                    )}
                    {!shopItemsLoading && shopItems.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {shopItems.length} shop item{shopItems.length !== 1 ? "s" : ""} available
                      </p>
                    )}
                  </div>
                ) : selectedEntryType === 3 ? (
                  // Perk Box selector with multi-select
                  <div className="flex flex-col gap-2">
                    {perkBoxItemsLoading && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading perk boxes from inventory...
                      </div>
                    )}
                    {!perkBoxItemsLoading && perkBoxItems.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        You don&apos;t have any perk boxes in your inventory.
                      </p>
                    )}
                    {!perkBoxItemsLoading && perkBoxItems.length > 0 && (
                      <>
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-2">
                          <div className="flex flex-col gap-1.5">
                            {perkBoxItems.map((item) => {
                              const isSelected = selectedPerkBoxIds.includes(item.itemId);
                              return (
                                <label
                                  key={item.itemId}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                    isSelected
                                      ? "bg-primary/10 text-primary"
                                      : "hover:bg-muted"
                                  )}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedPerkBoxIds([...selectedPerkBoxIds, item.itemId]);
                                      } else {
                                        setSelectedPerkBoxIds(selectedPerkBoxIds.filter(id => id !== item.itemId));
                                      }
                                    }}
                                  />
                                                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                                  <span className="font-mono text-xs">
                                                    {PERK_BOX_NAMES[item.typeId] ?? `Perk Box`} (ID: {item.itemId})
                                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {selectedPerkBoxIds.length} of {perkBoxItems.length} perk box{perkBoxItems.length !== 1 ? "es" : ""} selected
                          </p>
                          <div className="flex gap-2">
                            {selectedPerkBoxIds.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPerkBoxIds([])}
                                className="h-8 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                            {selectedPerkBoxIds.length < perkBoxItems.length && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPerkBoxIds(perkBoxItems.map(i => i.itemId))}
                                className="h-8 text-xs"
                              >
                                Select All
                              </Button>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={handleEnterPot}
                          disabled={!canEnter}
                          className="h-10 gap-1.5"
                        >
                          {enterLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {enterPending ? "Confirm..." : "Entering..."}
                            </>
                          ) : (
                            <>
                              <Trophy className="h-3.5 w-3.5" />
                              Enter Pot with {selectedPerkBoxIds.length} Perk Box{selectedPerkBoxIds.length !== 1 ? "es" : ""}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  // Default amount input for tokens, cash, credits, crates
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Coins className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={entryAmount}
                        onChange={(e) => setEntryAmount(e.target.value)}
                        placeholder={`Amount in ${ENTRY_TYPES[selectedEntryType]?.unit ?? "tokens"}`}
                        className="h-10 pl-9 font-mono text-sm"
                      />
                    </div>
                    <Button
                      onClick={handleEnterPot}
                      disabled={!canEnter}
                      className="h-10 gap-1.5"
                    >
                      {enterLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {enterPending ? "Confirm..." : "Entering..."}
                        </>
                      ) : (
                        <>
                          <Trophy className="h-3.5 w-3.5" />
                          Enter Pot
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Not accepting */}
                {!isAccepting && round && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <p className="text-[10px] text-amber-400">
                      The pot is not accepting entries right now (state: {ROUND_STATES[round.state]?.label ?? round.state}).
                    </p>
                  </div>
                )}

                {/* Enter error */}
                {enterError && (
                  <p className="text-[10px] text-red-400">
                    {enterError.message.includes("User rejected")
                      ? "Transaction rejected by user"
                      : enterError.message.split("\n")[0]}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Entry result ──────────────────────────────────────────── */}
      {enterSuccess && enterHash && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">Entry Confirmed</span>
          </div>

          {enteredPotResult && (
            <div className="flex flex-col gap-1 text-[11px] mb-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Asset Type</span>
                <span className="font-semibold text-foreground">{enteredPotResult.assetType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Entry ID</span>
                <span className="font-mono font-semibold text-foreground">#{enteredPotResult.entryId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">USD Value</span>
                <span className="font-mono font-semibold text-primary">
                  ${enteredPotResult.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          <a
            href={`${explorer}/tx/${enterHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-mono text-[10px] text-muted-foreground hover:text-primary hover:underline"
          >
            {enterHash.slice(0, 10)}...{enterHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
