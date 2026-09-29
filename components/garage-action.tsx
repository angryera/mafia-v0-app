"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { useChain, useChainExplorer } from "@/components/chain-provider";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import { getCarModelName } from "@/lib/constants/cars";
import { getErrorMessage, getTravelCityName } from "@/lib/format";
import {
  TRAVEL_DESTINATIONS,
  INVENTORY_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
} from "@/lib/contract";
import { maxUint256 } from "viem";

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
import { Checkbox } from "@/components/ui/checkbox";
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

// ── Helpers ─────────────────────────────────────────────────────
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

const ACTIONS_NEEDING_APPROVE: GarageActionType[] = ["repair"];

// ── Action Dialog ───────────────────────────────────────────────
function carCountLabel(count: number): string {
  return count === 1 ? "1 car" : `${count} cars`;
}

function GarageActionDialog({
  items,
  action,
  open,
  onOpenChange,
  onSuccess,
}: {
  items: CarItem[];
  action: GarageActionType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { toast } = useToast();

  const actionTx = useContractTransaction({
    onSuccess: () => {
      const shippedCount =
        action === "ship" && destinationCity
          ? items.filter((car) => car.cityId !== Number(destinationCity)).length
          : items.length;
      const messages: Record<GarageActionType, string> = {
        ship: `${carCountLabel(shippedCount)} shipped to ${getTravelCityName(Number(destinationCity))}`,
        transfer: `${carCountLabel(items.length)} transferred successfully`,
        sell: `${carCountLabel(items.length)} sold successfully`,
        repair: `${carCountLabel(items.filter((car) => (Number(car.damagePercent) || 0) > 0).length)} repaired successfully`,
      };
      toast({
        title: "Transaction Confirmed",
        description: messages[action],
      });
      onOpenChange(false);
      onSuccess();
    },
  });
  const writeContract = actionTx.write;
  const hash = actionTx.hash;
  const isPending = actionTx.isPending;
  const isConfirming = actionTx.isConfirming;
  const isSuccess = actionTx.isSuccess;
  const reset = actionTx.reset;

  const approve = useContractTransaction({
    onSuccess: () => {
      toast({
        title: "Cash Spend Approved",
        description: "You can now repair.",
      });
    },
  });
  const writeApprove = approve.write;
  const approveHash = approve.hash;
  const approvePending = approve.isPending;
  const approveError = approve.error;
  const resetApprove = approve.reset;
  const approveConfirming = approve.isConfirming;
  const approveSuccess = approve.isSuccess;

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

  const damagedItems = items.filter(
    (car) => (Number(car.damagePercent) || 0) > 0,
  );
  const destinationId = destinationCity ? Number(destinationCity) : null;
  const shippableItems =
    destinationId === null
      ? items
      : items.filter((car) => car.cityId !== destinationId);
  const skippedShipCount = items.length - shippableItems.length;
  const actionableItems =
    action === "repair"
      ? damagedItems
      : action === "ship"
        ? shippableItems
        : items;
  const estimatedValue = items.reduce((sum, car) => {
    const dmg = Number(car.damagePercent) || 0;
    return sum + Math.round(car.car.basePrice * (1 - dmg / 100));
  }, 0);
  const inventoryAddress = chainConfig.addresses.inventory;
  const subject =
    items.length === 1
      ? `${items[0].car.brand} #${items[0].itemId}`
      : carCountLabel(items.length);

  const approveLoading = approvePending || approveConfirming;

  function handleApprove() {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [inventoryAddress, REPAIR_APPROVE_AMOUNT],
    });
  }

  function handleSubmit() {
    const itemIds = actionableItems.map((car) => BigInt(car.itemId));
    if (itemIds.length === 0) return;

    switch (action) {
      case "ship":
        if (destinationId === null) return;
        writeContract({
          address: inventoryAddress,
          abi: INVENTORY_CONTRACT_ABI,
          functionName: "shipCars",
          args: [itemIds, itemIds.map(() => destinationId)],
        });
        break;

      case "transfer":
        if (!transferAddress || !/^0x[a-fA-F0-9]{40}$/.test(transferAddress))
          return;
        if (itemIds.length === 1) {
          writeContract({
            address: inventoryAddress,
            abi: INVENTORY_CONTRACT_ABI,
            functionName: "transferItem",
            args: [transferAddress as `0x${string}`, itemIds[0]],
          });
        } else {
          writeContract({
            address: inventoryAddress,
            abi: INVENTORY_CONTRACT_ABI,
            functionName: "transferItems",
            args: [transferAddress as `0x${string}`, itemIds],
          });
        }
        break;

      case "sell":
        writeContract({
          address: inventoryAddress,
          abi: INVENTORY_CONTRACT_ABI,
          functionName: "sellCars",
          args: [itemIds],
        });
        break;

      case "repair":
        writeContract({
          address: inventoryAddress,
          abi: INVENTORY_CONTRACT_ABI,
          functionName: "repairCars",
          args: [itemIds],
        });
        break;
    }
  }

  const titles: Record<GarageActionType, string> = {
    ship: items.length === 1 ? "Ship Car" : "Ship Cars",
    transfer: items.length === 1 ? "Transfer Car" : "Transfer Cars",
    sell: items.length === 1 ? "Sell Car" : "Sell Cars",
    repair: items.length === 1 ? "Repair Car" : "Repair Cars",
  };

  const descriptions: Record<GarageActionType, string> = {
    ship: `Ship ${subject} to another city.`,
    transfer: `Transfer ${subject} to another wallet.`,
    sell: `Sell ${subject} for an estimated ${estimatedValue.toLocaleString()} cash.`,
    repair: `Repair ${subject} to restore full condition. Requires cash spend approval first.`,
  };

  const isWorking = isPending || isConfirming;

  const needsApproval = ACTIONS_NEEDING_APPROVE.includes(action);

  const canSubmit = (() => {
    if (isWorking) return false;
    if (needsApproval && !approveSuccess) return false;
    if (action === "ship") return destinationId !== null && shippableItems.length > 0;
    if (action === "repair") return damagedItems.length > 0;
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
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background/50">
            {items.map((car) => (
              <div
                key={car.itemId}
                className="border-b border-border px-3 py-2 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {car.car.brand}
                  </p>
                  <p className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    #{car.itemId}
                  </p>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {getCarModelName(car.car)} · {getTravelCityName(car.cityId)}
                </p>
              </div>
            ))}
          </div>

          {/* Action-specific inputs */}
          {action === "ship" && (
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
                  {TRAVEL_DESTINATIONS.map((dest) => (
                    <SelectItem key={dest.id} value={String(dest.id)}>
                      {dest.label}, {dest.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {destinationId !== null && skippedShipCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {carCountLabel(skippedShipCount)} already in{" "}
                  {getTravelCityName(destinationId)}
                  {shippableItems.length === 0
                    ? ". Choose a different city."
                    : ` and will be skipped. ${carCountLabel(shippableItems.length)} will be shipped.`}
                </p>
              )}
            </div>
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

          {action === "repair" && damagedItems.length === 0 && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <p className="text-sm text-green-400">
                {items.length === 1
                  ? "This car is already in perfect condition."
                  : "These cars are already in perfect condition."}
              </p>
            </div>
          )}

          {action === "repair" && damagedItems.length > 0 && (
            <>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Cars to repair
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {damagedItems.length}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Repairing restores each car to 0% damage. This costs cash.
                  {items.length > damagedItems.length &&
                    ` ${carCountLabel(items.length - damagedItems.length)} already perfect and will be skipped.`}
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
                          : getErrorMessage(approveError)}
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
                      {titles.repair}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {approveSuccess
                        ? `Click ${titles.repair} below to restore condition.`
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
            disabled={!canSubmit}
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

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 truncate text-xs font-medium text-foreground">
        {children}
      </div>
    </div>
  );
}

// ── Car card ────────────────────────────────────────────────────
function GarageCard({
  item,
  selected,
  onSelectedChange,
  onRefresh,
}: {
  item: CarItem;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onRefresh: () => void;
}) {
  const quality = getQualityLabel(item.car.qualityLvl);
  const dmg = Number(item.damagePercent) || 0;
  const condition = 100 - dmg;
  const estimatedValue = Math.round(item.car.basePrice * (1 - dmg / 100));
  const modelName = getCarModelName(item.car);

  const [dialogAction, setDialogAction] = useState<GarageActionType | null>(
    null,
  );

  return (
    <>
      <div
        className={cn(
          "flex h-full flex-col gap-3 rounded-lg border p-3 transition-all duration-150",
          selected
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-card hover:border-primary/30 hover:bg-card/80",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange(checked === true)}
              aria-label={`Select ${item.car.brand} #${item.itemId}`}
              className="mt-0.5"
            />
            <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {item.car.brand}
              </h3>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                #{item.itemId}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
              {modelName}
            </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
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

        <span
          className={cn(
            "inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            quality.className,
          )}
        >
          {quality.label}
        </span>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <Stat label="Value">
            <span className="inline-flex items-center gap-0.5">
              <DollarSign className="h-3 w-3 text-primary/70" />
              {estimatedValue.toLocaleString()}
            </span>
            {dmg > 0 && (
              <span className="ml-1 text-[10px] font-normal text-muted-foreground/60 line-through">
                {item.car.basePrice.toLocaleString()}
              </span>
            )}
          </Stat>
          <Stat label="Speed">
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3 w-3 text-primary/70" />
              {item.car.speed} mph
            </span>
          </Stat>
          <Stat label="Seats">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 text-primary/70" />
              {item.car.seats}
            </span>
          </Stat>
          <Stat label="City">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
              <span className="truncate">{getTravelCityName(item.cityId)}</span>
            </span>
          </Stat>
        </div>

        <div className="mt-auto flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 shrink-0 text-primary/70" />
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

      {dialogAction && (
        <GarageActionDialog
          items={[item]}
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
function GarageCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-4 w-28 rounded bg-secondary/50" />
          <div className="h-3 w-full rounded bg-secondary/30" />
        </div>
        <div className="h-7 w-7 rounded bg-secondary/30" />
      </div>
      <div className="h-4 w-16 rounded bg-secondary/40" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-7 rounded bg-secondary/30" />
        <div className="h-7 rounded bg-secondary/30" />
        <div className="h-7 rounded bg-secondary/30" />
        <div className="h-7 rounded bg-secondary/30" />
      </div>
      <div className="h-1.5 rounded-full bg-secondary/50" />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export function GarageAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const inventoryScript = useMafiaUtilsScript("MafiaInventory");
  const scriptReady = inventoryScript === "ready";
  const scriptError =
    inventoryScript === "error" ? "Failed to load inventory script" : null;

  const [cars, setCars] = useState<CarItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<GarageActionType | null>(null);
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
    if (loading) return;
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(cars.map((car) => car.itemId));
      let changed = false;
      const next = new Set<number>();
      for (const id of prev) {
        if (live.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [cars, loading]);

  const selectedCars = useMemo(
    () => cars.filter((car) => selectedIds.has(car.itemId)),
    [cars, selectedIds],
  );
  const selectedDamagedCount = selectedCars.filter(
    (car) => (Number(car.damagePercent) || 0) > 0,
  ).length;

  function toggleCar(itemId: number, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <GarageCardSkeleton key={i} />
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

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selectedCars.length}
            </span>{" "}
            selected
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              setSelectedIds(new Set(cars.map((car) => car.itemId)))
            }
          >
            Select all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedCars.length === 0}
          >
            Clear
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={selectedCars.length === 0}
            onClick={() => setBulkAction("ship")}
          >
            <Truck className="h-3.5 w-3.5" />
            Ship
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={selectedCars.length === 0}
            onClick={() => setBulkAction("transfer")}
          >
            <SendHorizontal className="h-3.5 w-3.5" />
            Transfer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={selectedDamagedCount === 0}
            onClick={() => setBulkAction("repair")}
          >
            <Wrench className="h-3.5 w-3.5" />
            Repair
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-400"
            disabled={selectedCars.length === 0}
            onClick={() => setBulkAction("sell")}
          >
            <Banknote className="h-3.5 w-3.5" />
            Sell
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cars.map((car) => (
          <GarageCard
            key={car.itemId}
            item={car}
            selected={selectedIds.has(car.itemId)}
            onSelectedChange={(selected) => toggleCar(car.itemId, selected)}
            onRefresh={fetchCars}
          />
        ))}
      </div>

      {bulkAction && (
        <GarageActionDialog
          items={selectedCars}
          action={bulkAction}
          open={!!bulkAction}
          onOpenChange={(open) => {
            if (!open) setBulkAction(null);
          }}
          onSuccess={() => {
            setSelectedIds(new Set());
            fetchCars();
          }}
        />
      )}
    </div>
  );
}
