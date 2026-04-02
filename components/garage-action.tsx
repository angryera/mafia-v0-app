"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useChain, useChainExplorer } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  TRAVEL_DESTINATIONS,
  INVENTORY_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
} from "@/lib/contract";
import { parseEther, maxUint256 } from "viem";

const SHIP_APPROVE_AMOUNT = parseEther("2000");
const REPAIR_APPROVE_AMOUNT = maxUint256;
import { useChainAddresses } from "@/components/chain-provider";
import {
  Car,
  AlertCircle,
  Loader2,
  RefreshCw,
  Gauge,
  Users,
  MapPin,
  Wrench,
  DollarSign,
  MoreVertical,
  Truck,
  SendHorizontal,
  Banknote,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";

// ── Types ───────────────────────────────────────────────────────
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

declare global {
  interface Window {
    MafiaInventory?: {
      getItemsByCategory: (opts: {
        chain: string;
        contractAddress: string;
        categoryId: number;
        maxItems: number;
        onProgress?: (info: { fetched: number; batchIndex: number }) => void;
      }) => Promise<CarItem[]>;
    };
  }
}

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

// ── Helpers ─────────────────────────────────────────────────────
function getCityName(cityId: number): string {
  if (cityId >= 0 && cityId < TRAVEL_DESTINATIONS.length) {
    return TRAVEL_DESTINATIONS[cityId].label;
  }
  return `City #${cityId}`;
}

function getConditionColor(condition: number): string {
  if (condition >= 75) return "bg-green-500";
  if (condition >= 50) return "bg-yellow-500";
  if (condition >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function getConditionTextColor(condition: number): string {
  if (condition >= 75) return "text-green-400";
  if (condition >= 50) return "text-yellow-400";
  if (condition >= 25) return "text-orange-400";
  return "text-red-400";
}

function getQualityLabel(
  lvl: number,
): { label: string; className: string } {
  switch (lvl) {
    case 1:
      return {
        label: "Common",
        className: "text-muted-foreground bg-muted-foreground/10",
      };
    case 2:
      return { label: "Uncommon", className: "text-green-400 bg-green-400/10" };
    case 3:
      return { label: "Rare", className: "text-blue-400 bg-blue-400/10" };
    case 4:
      return { label: "Epic", className: "text-purple-400 bg-purple-400/10" };
    case 5:
      return { label: "Legendary", className: "text-primary bg-primary/10" };
    default:
      return {
        label: `Tier ${lvl}`,
        className: "text-muted-foreground bg-muted-foreground/10",
      };
  }
}

// ── Action types ────────────────────────────────────────────────
type GarageActionType = "ship" | "transfer" | "sell" | "repair";

const ACTIONS_NEEDING_APPROVE: GarageActionType[] = ["ship", "repair"];

// ── Action Dialog ───────────────────────────────────────────────
function GarageActionDialog({
  item,
  action,
  open,
  onOpenChange,
  onSuccess,
}: {
  item: CarItem;
  action: GarageActionType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { toast } = useToast();

  // Main action write
  const { writeContract, data: hash, isPending, reset } = useChainWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Approve cash spend (for ship & repair)
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const [destinationCity, setDestinationCity] = useState<string>("");
  const [transferAddress, setTransferAddress] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setDestinationCity("");
      setTransferAddress("");
      reset();
      resetApprove();
    }
  }, [open, reset, resetApprove]);

  // Handle success
  useEffect(() => {
    if (isSuccess && hash) {
      const messages: Record<GarageActionType, string> = {
        ship: `Car #${item.itemId} shipped to ${getCityName(Number(destinationCity))}`,
        transfer: `Car #${item.itemId} transferred successfully`,
        sell: `Car #${item.itemId} sold successfully`,
        repair: `Car #${item.itemId} repaired successfully`,
      };
      toast({
        title: "Transaction Confirmed",
        description: messages[action],
      });
      onOpenChange(false);
      onSuccess();
    }
  }, [isSuccess, hash, action, item.itemId, destinationCity, toast, onOpenChange, onSuccess]);

  // Toast on approve success
  useEffect(() => {
    if (approveSuccess && approveHash) {
      toast({
        title: "Cash Spend Approved",
        description: action === "repair" ? "You can now repair your car." : "You can now ship your car.",
      });
    }
  }, [approveSuccess, approveHash, toast]);

  const dmg = Number(item.damagePercent) || 0;
  const estimatedValue = Math.round(item.car.basePrice * (1 - dmg / 100));
  const inventoryAddress = chainConfig.addresses.inventory;

  const approveLoading = approvePending || approveConfirming;

  function handleApprove() {
    resetApprove();
    const amount = action === "ship" ? SHIP_APPROVE_AMOUNT : REPAIR_APPROVE_AMOUNT;
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [inventoryAddress, amount],
    });
  }

  function handleSubmit() {
    switch (action) {
      case "ship":
        if (!destinationCity) return;
        writeContract({
          address: inventoryAddress,
          abi: INVENTORY_CONTRACT_ABI,
          functionName: "shipCars",
          args: [
            [BigInt(item.itemId)],
            [Number(destinationCity)],
          ],
        });
        break;

      case "transfer":
        if (!transferAddress || !/^0x[a-fA-F0-9]{40}$/.test(transferAddress))
          return;
        writeContract({
          address: inventoryAddress,
          abi: INVENTORY_CONTRACT_ABI,
          functionName: "transferItem",
          args: [transferAddress as `0x${string}`, BigInt(item.itemId)],
        });
        break;

      case "sell":
        writeContract({
          address: inventoryAddress,
          abi: INVENTORY_CONTRACT_ABI,
          functionName: "sellCars",
          args: [[BigInt(item.itemId)]],
        });
        break;

      case "repair":
        writeContract({
          address: inventoryAddress,
          abi: INVENTORY_CONTRACT_ABI,
          functionName: "repairCars",
          args: [[BigInt(item.itemId)]],
        });
        break;
    }
  }

  const titles: Record<GarageActionType, string> = {
    ship: "Ship Car",
    transfer: "Transfer Car",
    sell: "Sell Car",
    repair: "Repair Car",
  };

  const descriptions: Record<GarageActionType, string> = {
    ship: `Ship ${item.car.brand} #${item.itemId} to another city. Requires cash spend approval first.`,
    transfer: `Transfer ${item.car.brand} #${item.itemId} to another wallet.`,
    sell: `Sell ${item.car.brand} #${item.itemId} for an estimated ${estimatedValue.toLocaleString()} cash.`,
    repair: `Repair ${item.car.brand} #${item.itemId} to restore it to full condition. Requires cash spend approval first.`,
  };

  const isWorking = isPending || isConfirming;

  const needsApproval = ACTIONS_NEEDING_APPROVE.includes(action);

  const canSubmit = (() => {
    if (isWorking) return false;
    if (needsApproval && !approveSuccess) return false;
    if (action === "ship") return !!destinationCity;
    if (action === "transfer")
      return /^0x[a-fA-F0-9]{40}$/.test(transferAddress);
    return true;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
          <DialogDescription>{descriptions[action]}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Car preview */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
            <div className="relative h-12 w-18 flex-shrink-0 overflow-hidden rounded bg-background/50">
              {item.car.image ? (
                <img
                  src={item.car.image}
                  alt={item.car.carName}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Car className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {item.car.brand}
              </p>
              <p className="text-xs text-muted-foreground">
                #{item.itemId} &middot; {getCityName(item.cityId)}
              </p>
            </div>
          </div>

          {/* Action-specific inputs */}
          {action === "ship" && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  Destination City
                </label>
                <Select
                  value={destinationCity}
                  onValueChange={setDestinationCity}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAVEL_DESTINATIONS.filter(
                      (d) => d.id !== item.cityId,
                    ).map((dest) => (
                      <SelectItem key={dest.id} value={String(dest.id)}>
                        {dest.label}, {dest.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 1: Approve cash spend */}
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
                      {approveSuccess
                        ? "Approval confirmed. You can now ship your car."
                        : "You must approve cash spend before shipping."}
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
                            {approvePending
                              ? "Confirm in wallet..."
                              : "Approving..."}
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

              {/* Step 2 indicator */}
              <div
                className={cn(
                  "rounded-lg border p-3",
                  approveSuccess
                    ? "border-chain-accent/30 bg-chain-accent/5"
                    : "border-border bg-background/30 opacity-50",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      approveSuccess
                        ? "bg-chain-accent/20 text-chain-accent"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        approveSuccess
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      Ship Car
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {approveSuccess
                        ? "Select a destination and click Ship Car below."
                        : "Complete step 1 first to unlock shipping."}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {action === "transfer" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Recipient Address
              </label>
              <Input
                placeholder="0x..."
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
                className="font-mono text-sm"
              />
              {transferAddress &&
                !/^0x[a-fA-F0-9]{40}$/.test(transferAddress) && (
                  <p className="text-xs text-destructive">
                    Enter a valid wallet address
                  </p>
                )}
            </div>
          )}

          {action === "sell" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Estimated Sale Value
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {estimatedValue.toLocaleString()} cash
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Sale price depends on the car{"'"}s current damage.
                This action cannot be undone.
              </p>
            </div>
          )}

          {action === "repair" && dmg === 0 && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <p className="text-sm text-green-400">
                This car is already in perfect condition.
              </p>
            </div>
          )}

          {action === "repair" && dmg > 0 && (
            <>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Current Damage
                  </span>
                  <span className="text-sm font-semibold text-red-400">
                    {dmg}%
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Repairing will restore the car to 0% damage. This costs cash.
                </p>
              </div>

              {/* Step 1: Approve cash spend */}
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
                      {approveSuccess
                        ? "Approval confirmed. You can now repair your car."
                        : "You must approve cash spend on the InGameCurrency contract before repairing."}
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
                            {approvePending
                              ? "Confirm in wallet..."
                              : "Approving..."}
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

              {/* Step 2 indicator */}
              <div
                className={cn(
                  "rounded-lg border p-3",
                  approveSuccess
                    ? "border-chain-accent/30 bg-chain-accent/5"
                    : "border-border bg-background/30 opacity-50",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      approveSuccess
                        ? "bg-chain-accent/20 text-chain-accent"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        approveSuccess
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      Repair Car
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {approveSuccess
                        ? "Click Repair below to fix your car."
                        : "Complete step 1 first to unlock repair."}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Transaction status */}
          {hash && (
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">
                Tx:{" "}
                <a
                  href={`${explorer}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  {hash.slice(0, 10)}...{hash.slice(-8)}
                </a>
              </p>
              {isConfirming && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for confirmation...
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isWorking || approveLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !canSubmit ||
              (action === "repair" && dmg === 0)
            }
            className={cn(
              action === "sell" && "bg-red-600 text-white hover:bg-red-700",
            )}
          >
            {isWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
                ? "Confirming..."
                : titles[action]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── List Row ────────────────────────────────────────────────────
function GarageRow({
  item,
  onRefresh,
}: {
  item: CarItem;
  onRefresh: () => void;
}) {
  const quality = getQualityLabel(item.car.qualityLvl);
  const dmg = Number(item.damagePercent) || 0;
  const condition = 100 - dmg;
  const estimatedValue = Math.round(item.car.basePrice * (1 - dmg / 100));

  const [dialogAction, setDialogAction] = useState<GarageActionType | null>(
    null,
  );

  return (
    <>
      <div className="group flex items-center gap-4 rounded-lg border border-border bg-card p-3 transition-all duration-150 hover:border-primary/30 hover:bg-card/80">
        {/* Thumbnail */}
        <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-md bg-background/50">
          {item.car.image ? (
            <img
              src={item.car.image}
              alt={item.car.carName}
              className="h-full w-full object-contain p-1"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={cn(
              "flex h-full w-full items-center justify-center",
              item.car.image ? "hidden" : "",
            )}
          >
            <Car className="h-6 w-6 text-muted-foreground/40" />
          </div>
        </div>

        {/* Main info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          {/* Name + quality */}
          <div className="flex min-w-0 flex-shrink-0 flex-col sm:w-40">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {item.car.brand}
              </h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                #{item.itemId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  quality.className,
                )}
              >
                {quality.label}
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <DollarSign className="h-3 w-3 text-primary/70" />
                <span className="font-medium text-foreground">
                  {estimatedValue.toLocaleString()}
                </span>
                {dmg > 0 && (
                  <span className="text-muted-foreground/60 line-through">
                    {item.car.basePrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-1 items-center gap-3 text-xs sm:gap-4">
            <div
              className="flex items-center gap-1 text-muted-foreground"
              title="Speed"
            >
              <Gauge className="h-3.5 w-3.5 text-primary/70" />
              <span className="font-medium text-foreground">
                {item.car.speed}
              </span>
              <span className="hidden sm:inline">mph</span>
            </div>
            <div
              className="flex items-center gap-1 text-muted-foreground"
              title="Seats"
            >
              <Users className="h-3.5 w-3.5 text-primary/70" />
              <span className="font-medium text-foreground">
                {item.car.seats}
              </span>
            </div>
            <div
              className="flex items-center gap-1 text-muted-foreground"
              title="City"
            >
              <MapPin className="h-3.5 w-3.5 text-primary/70" />
              <span className="font-medium text-foreground">
                {getCityName(item.cityId)}
              </span>
            </div>
          </div>

          {/* Condition bar */}
          <div className="flex items-center gap-2 sm:w-36 sm:flex-shrink-0">
            <Wrench className="hidden h-3.5 w-3.5 text-primary/70 sm:block" />
            <div className="flex flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    getConditionColor(condition),
                  )}
                  style={{ width: `${condition}%` }}
                />
              </div>
              <span
                className={cn(
                  "w-8 text-right text-xs font-semibold tabular-nums",
                  getConditionTextColor(condition),
                )}
              >
                {condition}%
              </span>
            </div>
          </div>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Car actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setDialogAction("ship")}>
              <Truck className="mr-2 h-4 w-4" />
              Ship Car
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogAction("transfer")}>
              <SendHorizontal className="mr-2 h-4 w-4" />
              Transfer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogAction("repair")}>
              <Wrench className="mr-2 h-4 w-4" />
              Repair Car
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDialogAction("sell")}
              className="text-red-400 focus:text-red-400"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Sell Car
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Action dialogs */}
      {dialogAction && (
        <GarageActionDialog
          item={item}
          action={dialogAction}
          open={!!dialogAction}
          onOpenChange={(open) => {
            if (!open) setDialogAction(null);
          }}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}

// ── Loading skeleton ────────────────────────────────────────────
function GarageRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 animate-pulse">
      <div className="h-16 w-24 flex-shrink-0 rounded-md bg-secondary/50" />
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-col gap-1.5 sm:w-40">
          <div className="h-4 w-28 rounded bg-secondary/50" />
          <div className="h-3 w-20 rounded bg-secondary/30" />
        </div>
        <div className="flex flex-1 gap-4">
          <div className="h-3 w-12 rounded bg-secondary/30" />
          <div className="h-3 w-8 rounded bg-secondary/30" />
          <div className="h-3 w-16 rounded bg-secondary/30" />
        </div>
        <div className="h-1.5 w-28 rounded-full bg-secondary/50" />
      </div>
      <div className="h-8 w-8 rounded bg-secondary/30" />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export function GarageAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const { ready: scriptReady, error: scriptError } = useInventoryScript();

  const [cars, setCars] = useState<CarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    fetched: number;
    batchIndex: number;
  } | null>(null);

  const fetchCars = useCallback(async () => {
    if (!window.MafiaInventory || !address) return;

    setLoading(true);
    setError(null);
    setProgress(null);
    setCars([]);

    try {
      const items = await window.MafiaInventory.getItemsByCategory({
        chain: "bnb",
        contractAddress: chainConfig.addresses.inventory,
        categoryId: 15,
        maxItems: 100000,
        onProgress: (info) => {
          setProgress(info);
        },
      });

      const myCars = items.filter(
        (item) => item.owner.toLowerCase() === address.toLowerCase(),
      );

      setCars(myCars);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cars");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [address, chainConfig.addresses.inventory]);

  useEffect(() => {
    if (scriptReady && isConnected && address) {
      fetchCars();
    }
  }, [scriptReady, isConnected, address, fetchCars]);

  // ── Not connected ───────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Car className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-lg font-semibold text-foreground">Connect Wallet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to view your garage.
        </p>
      </div>
    );
  }

  // ── Script error ────────────────────────────────────────────
  if (scriptError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-card py-16">
        <AlertCircle className="h-10 w-10 text-destructive/60 mb-3" />
        <p className="text-lg font-semibold text-foreground">Script Error</p>
        <p className="mt-1 text-sm text-muted-foreground">{scriptError}</p>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────
  if (loading || !scriptReady) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {!scriptReady
                ? "Loading inventory module..."
                : "Scanning blockchain for your cars..."}
            </p>
            {progress && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Fetched {progress.fetched.toLocaleString()} items (batch{" "}
                {progress.batchIndex})
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <GarageRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-card py-16">
        <AlertCircle className="h-10 w-10 text-destructive/60 mb-3" />
        <p className="text-lg font-semibold text-foreground">Error</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={fetchCars}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────
  if (cars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Car className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-lg font-semibold text-foreground">No Cars Found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You don{"'"}t have any cars in your garage yet. Nick a car to get
          started!
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={fetchCars}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    );
  }

  // ── Cars list ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{cars.length}</span>{" "}
          {cars.length === 1 ? "car" : "cars"} in your garage
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchCars}
          disabled={loading}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {cars.map((car) => (
          <GarageRow key={car.itemId} item={car} onRefresh={fetchCars} />
        ))}
      </div>
    </div>
  );
}
