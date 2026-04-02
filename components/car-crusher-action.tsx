"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { useAuth } from "@/components/auth-provider";
import {
  INGAME_CURRENCY_ABI,
  CAR_CRUSHER_ABI,
  TRAVEL_DESTINATIONS,
  USER_PROFILE_CONTRACT_ABI,
} from "@/lib/contract";
import { maxUint256, formatEther } from "viem";
import {
  Car,
  AlertCircle,
  Loader2,
  RefreshCw,
  Wrench,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Crosshair,
  Timer,
  Gauge,
  MapPin,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────
interface ProfileData {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
}

interface CarItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  cityId: number;
  damagePercent: number;
  owner: string;
  car: {
    brand: string;
    carName: string;
    image: string;
    speed: number;
    seats: number;
    basePrice: number;
    qualityLvl: number;
  };
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

// ── Helpers ────────────────────────────────────────────────────
function getCityName(cityId: number): string {
  const dest = TRAVEL_DESTINATIONS.find((d) => d.id === cityId);
  return dest ? dest.label : `City ${cityId}`;
}

function getQualityLabel(lvl: number): string {
  switch (lvl) {
    case 1: return "Common";
    case 2: return "Uncommon";
    case 3: return "Rare";
    case 4: return "Epic";
    case 5: return "Legendary";
    default: return `Lvl ${lvl}`;
  }
}

function getQualityColor(lvl: number): string {
  switch (lvl) {
    case 1: return "text-muted-foreground";
    case 2: return "text-green-400";
    case 3: return "text-blue-400";
    case 4: return "text-purple-400";
    case 5: return "text-amber-400";
    default: return "text-muted-foreground";
  }
}

// ── Main Component ─────────────────────────────────────────────
export function CarCrusherAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData, isSigning, signError, requestSignature } = useAuth();

  // Read user profile to get cityId
  const { data: profileRaw, isLoading: profileLoading } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args: authData && address
      ? [address, authData.message, authData.signature]
      : undefined,
    query: { enabled: !!authData && !!address },
  });

  const profile = profileRaw as ProfileData | undefined;
  const playerCityId = profile?.cityId;
  const playerCityName = playerCityId !== undefined
    ? getCityName(playerCityId)
    : null;

  // State
  const [allCars, setAllCars] = useState<CarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Approve cash
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Crush
  const {
    writeContract,
    data: crushHash,
    isPending: crushPending,
    error: crushError,
    reset: resetCrush,
  } = useChainWriteContract();
  const { isLoading: crushConfirming, isSuccess: crushSuccess } =
    useWaitForTransactionReceipt({ hash: crushHash });

  // Read on-chain data
  const { data: bulletsPerCarRaw } = useReadContract({
    address: addresses.carCrusher,
    abi: CAR_CRUSHER_ABI,
    functionName: "bulletsPerCar",
    query: { enabled: isConnected },
  });

  const { data: maxCrushCountRaw } = useReadContract({
    address: addresses.carCrusher,
    abi: CAR_CRUSHER_ABI,
    functionName: "maxCrushCount",
    query: { enabled: isConnected },
  });

  const { data: nextCrushTimeRaw } = useReadContract({
    address: addresses.carCrusher,
    abi: CAR_CRUSHER_ABI,
    functionName: "nextCrushTime",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 15_000,
    },
  });

  // Read city crusher info for the player's current city
  const { data: cityCrusherInfoRaw } = useReadContract({
    address: addresses.carCrusher,
    abi: CAR_CRUSHER_ABI,
    functionName: "cityCrusherInfo",
    args: playerCityId !== undefined ? [playerCityId] : undefined,
    query: {
      enabled: isConnected && playerCityId !== undefined,
    },
  });

  const BULLETS_PER_CAR = 20;
  const bulletsPerCar = bulletsPerCarRaw ? Number(formatEther(bulletsPerCarRaw as bigint)) : BULLETS_PER_CAR;
  const maxCrushCount = maxCrushCountRaw ? Number(maxCrushCountRaw) : 10;

  // Parse city crusher info
  const cityCrusherInfo = cityCrusherInfoRaw
    ? {
        bulletProfit: Number(formatEther((cityCrusherInfoRaw as any).bulletProfit ?? (cityCrusherInfoRaw as any)[0] ?? 0n)),
        cashProfit: Number(formatEther((cityCrusherInfoRaw as any).cashProfit ?? (cityCrusherInfoRaw as any)[1] ?? 0n)),
        inventoryItemId: Number((cityCrusherInfoRaw as any).inventoryItemId ?? (cityCrusherInfoRaw as any)[2] ?? 0n),
        bulletFeePerCar: Number(formatEther((cityCrusherInfoRaw as any).bulletFeePerCar ?? (cityCrusherInfoRaw as any)[3] ?? 0n)),
        oneTimeCashFee: Number(formatEther((cityCrusherInfoRaw as any).oneTimeCashFee ?? (cityCrusherInfoRaw as any)[4] ?? 0n)),
      }
    : null;

  const netBulletsPerCar = cityCrusherInfo
    ? bulletsPerCar - cityCrusherInfo.bulletFeePerCar
    : bulletsPerCar;

  // Cooldown
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  useEffect(() => {
    if (nextCrushTimeRaw === undefined) return;
    const nextTime = Number(nextCrushTimeRaw) * 1000;
    const tick = () => {
      const diff = nextTime - Date.now();
      setCooldownRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [nextCrushTimeRaw]);

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);
  const cooldownReady = cooldownSeconds <= 0;
  const cooldownMinutes = Math.floor(cooldownSeconds / 60);
  const cooldownSecs = cooldownSeconds % 60;

  // Load script
  useEffect(() => {
    if (typeof window !== "undefined" && window.MafiaInventory) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Failed to load inventory script");
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Fetch cars
  const fetchCars = useCallback(async () => {
    if (!scriptLoaded || !window.MafiaInventory || !address) return;
    setLoading(true);
    setError(null);
    setProgress("");
    try {
      const chainName = chainConfig.id === "bnb" ? "bnb" : "pulsechain";
      const items = await window.MafiaInventory.getItemsByCategory({
        chain: chainName,
        contractAddress: chainConfig.addresses.inventory,
        categoryId: 15,
        maxItems: 100000,
        onProgress: (info) => {
          setProgress(`Fetched ${info.fetched} items (batch ${info.batchIndex})...`);
        },
      });
      const myCars = items.filter(
        (item) => item.owner.toLowerCase() === address.toLowerCase(),
      );
      setAllCars(myCars);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cars");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }, [scriptLoaded, address, chainConfig]);

  useEffect(() => {
    if (scriptLoaded && isConnected && address) {
      fetchCars();
    }
  }, [scriptLoaded, isConnected, address, fetchCars]);

  // Filter cars to player's current city
  const cars = playerCityId !== undefined
    ? allCars.filter((c) => c.cityId === playerCityId)
    : [];

  // Clear selection when player city changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [playerCityId]);

  // Selection
  function toggleCar(itemId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        if (next.size < maxCrushCount) {
          next.add(itemId);
        }
      }
      return next;
    });
  }

  function selectAll() {
    const all = cars.slice(0, maxCrushCount).map((c) => c.itemId);
    setSelectedIds(new Set(all));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  // Approve
  function handleApprove() {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.carCrusher, maxUint256],
    });
  }

  // Crush
  function handleCrush() {
    if (!authData || selectedIds.size === 0) return;
    resetCrush();
    const itemIds = Array.from(selectedIds).map((id) => BigInt(id));
    writeContract({
      address: addresses.carCrusher,
      abi: CAR_CRUSHER_ABI,
      functionName: "crushCars",
      args: [itemIds, authData.message, authData.signature],
    });
  }

  // Success toast
  const toastFired = useRef(false);
  useEffect(() => {
    if (crushSuccess && crushHash && !toastFired.current) {
      toastFired.current = true;
      toast.success(
        `Crushed ${selectedIds.size} car${selectedIds.size > 1 ? "s" : ""} into ~${(selectedIds.size * netBulletsPerCar).toLocaleString()} net bullets`,
      );
    }
    if (!crushHash) {
      toastFired.current = false;
    }
  }, [crushSuccess, crushHash, selectedIds.size, netBulletsPerCar]);

  // Approve success toast
  useEffect(() => {
    if (approveSuccess && approveHash) {
      toast.success("Cash spend approved. You can now crush cars.");
    }
  }, [approveSuccess, approveHash]);

  const approveLoading = approvePending || approveConfirming;
  const crushLoading = crushPending || crushConfirming;
  const isWorking = approveLoading || crushLoading;
  const selectedCount = selectedIds.size;
  const estimatedBullets = selectedCount * netBulletsPerCar;

  // ── Not connected ────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <Wrench className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Connect your wallet to crush cars into bullets.
        </p>
      </div>
    );
  }

  // ── Auth required ────────────────────────────────────────────
  if (!authData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground mb-3">
          You need to sign a message to authenticate before crushing cars.
        </p>
        <Button onClick={requestSignature} disabled={isSigning}>
          {isSigning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing...
            </>
          ) : (
            "Sign Message"
          )}
        </Button>
        {signError && (
          <p className="mt-2 text-xs text-destructive">
            Signature failed. Please try again.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Car Crusher</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Select cars to crush into bullets via{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
              crushCars(uint256[],string,bytes)
            </code>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchCars}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Player location */}
      {profileLoading ? (
        <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your location...
        </div>
      ) : playerCityName ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Your location:</span>
          <span className="font-semibold text-foreground">{playerCityName}</span>
          <span className="text-xs text-muted-foreground ml-1">
            ({cars.length} car{cars.length !== 1 ? "s" : ""} here, {allCars.length} total)
          </span>
        </div>
      ) : null}

      {/* Stats bar - always visible */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Bullet ratio card */}
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Gross Bullets / Car</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
            {bulletsPerCar.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Fee / Car</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-red-400">
            {cityCrusherInfo ? cityCrusherInfo.bulletFeePerCar.toLocaleString() : "--"}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">bullet fee deducted</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-xs text-muted-foreground">Net Bullets / Car</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-green-400">
            {cityCrusherInfo ? netBulletsPerCar.toLocaleString() : "--"}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">you receive</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-2">
          <Timer className={cn("h-4 w-4 shrink-0", cooldownReady ? "text-green-400" : "text-primary")} />
          <div>
            <p className="text-xs text-muted-foreground">Cooldown</p>
            {cooldownReady ? (
              <p className="mt-0.5 font-mono text-sm font-semibold text-green-400">Ready</p>
            ) : (
              <p className="mt-0.5 font-mono text-sm font-semibold text-primary tabular-nums">
                {cooldownMinutes}:{cooldownSecs.toString().padStart(2, "0")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional city crusher info - always visible when data available */}
      {cityCrusherInfo && (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-chain-accent/20 bg-chain-accent/5 px-4 py-3 text-xs text-muted-foreground">
          <span>
            <Crosshair className="mr-1 inline h-3 w-3 text-primary" />
            Bullet profit: <span className="font-mono font-semibold text-foreground">{cityCrusherInfo.bulletProfit.toLocaleString()}</span>
          </span>
          <span>
            <DollarSign className="mr-1 inline h-3 w-3 text-primary" />
            Cash profit: <span className="font-mono font-semibold text-foreground">{cityCrusherInfo.cashProfit.toLocaleString()}</span>
          </span>
          <span>
            Max per crush: <span className="font-mono font-semibold text-foreground">{maxCrushCount}</span>
            {cityCrusherInfo.oneTimeCashFee > 0 && (
              <span className="ml-1.5 text-red-400">
                &middot; <DollarSign className="mr-0.5 inline h-3 w-3" />
                <span className="font-mono font-semibold">{cityCrusherInfo.oneTimeCashFee.toLocaleString()} cash</span> fee per crush
              </span>
            )}
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{progress || "Loading cars..."}</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && cars.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
          <Car className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {profileLoading
              ? "Loading your location..."
              : playerCityId === undefined
                ? "Could not determine your city. Please sign in."
                : allCars.length === 0
                  ? "No cars found in your garage."
                  : `No cars in ${playerCityName}. Ship cars here first.`}
          </p>
        </div>
      )}

      {/* Car list */}
      {!loading && !error && cars.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Selection controls */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedCount} of {Math.min(cars.length, maxCrushCount)} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-7 text-xs"
                disabled={isWorking}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deselectAll}
                className="h-7 text-xs"
                disabled={isWorking || selectedCount === 0}
              >
                Deselect All
              </Button>
            </div>
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Crosshair className="h-4 w-4 text-primary" />
                <span className="font-mono font-semibold text-foreground">
                  ~{estimatedBullets.toLocaleString()} bullets
                </span>
              </div>
            )}
          </div>

          {/* Car rows */}
          <div className="flex flex-col gap-1.5">
            {cars.map((item) => {
              const dmg = Number(item.damagePercent) || 0;
              const condition = 100 - dmg;
              const quality = getQualityLabel(item.car.qualityLvl);
              const isSelected = selectedIds.has(item.itemId);

              return (
                <div
                  key={item.itemId}
                  onClick={() => !isWorking && toggleCar(item.itemId)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all cursor-pointer",
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card hover:border-border/80 hover:bg-card/80",
                    isWorking && "pointer-events-none opacity-60",
                  )}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleCar(item.itemId)}
                    disabled={isWorking || (!isSelected && selectedCount >= maxCrushCount)}
                    className="shrink-0"
                  />

                  {/* Thumbnail */}
                  <div className="relative h-12 w-18 flex-shrink-0 overflow-hidden rounded bg-background/50">
                    {item.car.image ? (
                      <img
                        src={item.car.image}
                        alt={item.car.carName}
                        className="h-full w-full object-contain p-0.5"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div className={cn("flex h-full w-full items-center justify-center", item.car.image ? "hidden" : "")}>
                      <Car className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {item.car.brand}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        #{item.itemId}
                      </span>
                      <span className={cn("text-[10px] font-medium", getQualityColor(item.car.qualityLvl))}>
                        {quality}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getCityName(item.cityId)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        {item.car.speed} km/h
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {item.car.basePrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Condition bar */}
                  <div className="hidden w-24 flex-shrink-0 sm:block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Condition</span>
                      <span className="text-[10px] font-medium text-foreground">{condition}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          condition >= 70 ? "bg-green-500" : condition >= 40 ? "bg-amber-500" : "bg-red-500",
                        )}
                        style={{ width: `${condition}%` }}
                      />
                    </div>
                  </div>

                  {/* Bullet estimate */}
                  <div className="hidden flex-shrink-0 text-right sm:block">
                    <p className="font-mono text-xs font-semibold text-foreground">
                      {netBulletsPerCar.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">net bullets</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action panel */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Crush {selectedCount > 0 ? `${selectedCount} Car${selectedCount > 1 ? "s" : ""}` : "Cars"}
            </h3>

            {/* Step 1: Approve cash */}
            <div
              className={cn(
                "rounded-lg border p-3 mb-3",
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
                  <p className={cn("text-sm font-semibold", approveSuccess ? "text-green-400" : "text-foreground")}>
                    {approveSuccess ? "Cash Spend Approved" : "Approve Cash Spend"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {approveSuccess
                      ? "Approval confirmed. You can now crush cars."
                      : "Approve cash spend on the InGameCurrency contract for the Car Crusher."}
                  </p>

                  {approveError && (
                    <p className="mt-1 text-[10px] text-red-400">
                      {(approveError as Error).message?.includes("User rejected")
                        ? "Transaction rejected by user"
                        : (approveError as Error).message?.split("\n")[0]}
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

            {/* Step 2: Crush */}
            <div
              className={cn(
                "rounded-lg border p-3 mb-4",
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
                  <p className={cn("text-sm font-semibold", approveSuccess ? "text-foreground" : "text-muted-foreground")}>
                    Crush Cars
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {approveSuccess
                      ? `Select cars above and click crush. Estimated yield: ~${estimatedBullets.toLocaleString()} bullets.`
                      : "Complete step 1 first to unlock crushing."}
                  </p>
                </div>
              </div>
            </div>

            {/* Crush success */}
            {crushSuccess && crushHash && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
                <a
                  href={`${explorer}/tx/${crushHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
                >
                  {crushHash.slice(0, 10)}...{crushHash.slice(-8)}
                </a>
              </div>
            )}

            {/* Crush error */}
            {crushError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="line-clamp-2 text-[10px] text-red-400">
                  {(crushError as Error).message?.includes("User rejected")
                    ? "Transaction rejected by user"
                    : (crushError as Error).message?.split("\n")[0]}
                </p>
              </div>
            )}

            {/* Crush button */}
            <Button
              onClick={handleCrush}
              disabled={
                selectedCount === 0 ||
                !approveSuccess ||
                crushLoading ||
                !cooldownReady
              }
              className="w-full gap-2"
            >
              {crushLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {crushPending ? "Confirm in wallet..." : "Crushing..."}
                </>
              ) : !cooldownReady ? (
                <>
                  <Timer className="h-4 w-4" />
                  Cooldown: {cooldownMinutes}:{cooldownSecs.toString().padStart(2, "0")}
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4" />
                  Crush {selectedCount > 0 ? `${selectedCount} Car${selectedCount > 1 ? "s" : ""}` : "Cars"}
                  {selectedCount > 0 && ` (~${estimatedBullets.toLocaleString()} bullets)`}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
