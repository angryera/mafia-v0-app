"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useReadContract,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  TRAVEL_CONTRACT_ABI,
  TRAVEL_TYPES,
  TravelCities,
  getCityRegion,
  INGAME_CURRENCY_ABI,
} from "@/lib/contract";
import { useChainAddresses, useChain } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { formatEther, parseEther } from "viem";
import {
  Timer,
  Train,
  Car,
  Plane,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Globe,
  Clock,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const APPROVE_AMOUNT = parseEther("100000000");

interface TravelInfo {
  travelType: number;
  travelUntil: number;
  itemId: number;
}

interface ProfileData {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
}

interface ShopItem {
  itemId: number;
  owner: string;
  categoryId: number;
  typeId: number;
}

// Vehicle typeIds for shop items (categoryId 3)
const VEHICLE_TYPE_IDS = {
  CAR: [3, 5], // Car/Motorcycle
  PLANE: [9], // Airplane
};

const TRAVEL_ICONS: Record<string, React.ElementType> = {
  train: Train,
  car: Car,
  plane: Plane,
};

function formatTimeRemaining(endTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = endTime - now;
  if (diff <= 0) return "Ready";
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export function TravelGrid() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { chainConfig } = useChain();
  const { authData, isSigning, signError, requestSignature } = useAuth();
  const { toast } = useToast();

  // State
  const [selectedTravelType, setSelectedTravelType] = useState(0);
  const [selectedDestination, setSelectedDestination] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(0);
  const [vehicles, setVehicles] = useState<ShopItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [approved, setApproved] = useState(false);

  // Get user profile (for current city)
  const { data: profileRaw } = useReadContract({
    address: addresses.userProfile,
    abi: TRAVEL_CONTRACT_ABI,
    functionName: "getUserProfile",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const profile = profileRaw as ProfileData | undefined;
  const currentCityId = profile?.cityId ?? 0;
  const currentCityRegion = getCityRegion(currentCityId);

  // Get user travel info
  const {
    data: travelInfoRaw,
    refetch: refetchTravelInfo,
  } = useReadContract({
    address: addresses.travel,
    abi: TRAVEL_CONTRACT_ABI,
    functionName: "getUserTravelInfo",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address, refetchInterval: 15_000 },
  });

  const travelInfo: TravelInfo | null = travelInfoRaw
    ? {
      travelType: Number((travelInfoRaw as { travelType: bigint }).travelType),
      travelUntil: Number((travelInfoRaw as { travelUntil: bigint }).travelUntil),
      itemId: Number((travelInfoRaw as { itemId: bigint }).itemId),
    }
    : null;

  const isTraveling = travelInfo && travelInfo.travelUntil > Math.floor(Date.now() / 1000);

  // Get cash balance
  const { data: cashBalanceRaw } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const cashBalance = cashBalanceRaw
    ? Number(formatEther(cashBalanceRaw as bigint))
    : 0;

  // Countdown timer
  useEffect(() => {
    if (!travelInfo || !isTraveling) {
      setTimeLeft("");
      return;
    }

    const tick = () => {
      setTimeLeft(formatTimeRemaining(travelInfo.travelUntil));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [travelInfo, isTraveling]);

  // Load vehicles from MafiaInventory
  const loadVehicles = useCallback(async () => {
    if (!address || typeof window === "undefined") return;

    setLoadingVehicles(true);
    try {
      if (window.MafiaInventory) {
        const items = await window.MafiaInventory.getItemsByCategory({
          chain: chainConfig.id,
          contractAddress: addresses.inventory,
          categoryId: 3, // Shop items
          maxItems: 100000,
        });

        // Filter by owner and vehicle types
        const userVehicles = items.filter(
          (item: ShopItem) =>
            item.owner.toLowerCase() === address.toLowerCase() &&
            ([...VEHICLE_TYPE_IDS.CAR, ...VEHICLE_TYPE_IDS.PLANE].includes(item.typeId))
        );

        setVehicles(userVehicles);
      }
    } catch (error) {
      console.error("Failed to load vehicles:", error);
    } finally {
      setLoadingVehicles(false);
    }
  }, [address, chainConfig.id, addresses.inventory]);

  useEffect(() => {
    if (isConnected && address) {
      loadVehicles();
    }
  }, [isConnected, address, loadVehicles]);

  // Get available vehicles for selected travel type
  const availableVehicles = vehicles.filter((v) => {
    if (selectedTravelType === 1) {
      return VEHICLE_TYPE_IDS.CAR.includes(v.typeId);
    }
    if (selectedTravelType === 2) {
      return VEHICLE_TYPE_IDS.PLANE.includes(v.typeId);
    }
    return false;
  });

  // Check if destination requires plane (different continent)
  const needsPlane = (destCityId: number) => {
    const destRegion = getCityRegion(destCityId);
    return destRegion !== currentCityRegion;
  };

  // Approve transaction
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useChainWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });

  useEffect(() => {
    if (isApproveConfirmed && !approved) {
      setApproved(true);
      toast({ title: "Approved!", description: "You can now travel." });
    }
  }, [isApproveConfirmed, approved, toast]);

  // Travel transaction
  const {
    writeContract: writeTravel,
    data: travelHash,
    isPending: isTravelPending,
    error: travelError,
    reset: resetTravel,
  } = useChainWriteContract();

  const { isLoading: isTravelConfirming, isSuccess: isTravelSuccess } =
    useWaitForTransactionReceipt({ hash: travelHash });

  useEffect(() => {
    if (isTravelSuccess) {
      toast({ title: "Traveling!", description: "Your journey has begun." });
      refetchTravelInfo();
      setSelectedDestination(null);
      resetTravel();
    }
  }, [isTravelSuccess, toast, refetchTravelInfo, resetTravel]);

  const handleApprove = () => {
    resetApprove();
    writeApprove({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [addresses.travel, APPROVE_AMOUNT],
    });
  };

  const handleTravel = () => {
    if (selectedDestination === null) return;

    const travelType = TRAVEL_TYPES[selectedTravelType];
    if (cashBalance < travelType.cost) {
      toast({
        title: "Insufficient Cash",
        description: `You need $${travelType.cost.toLocaleString()} but only have $${cashBalance.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    // For train, itemId is 0. For car/plane, use selected vehicle
    const itemId = selectedTravelType === 0 ? 0 : selectedVehicleId;

    if (selectedTravelType !== 0 && itemId === 0) {
      toast({
        title: "Select Vehicle",
        description: "Please select a vehicle for travel.",
        variant: "destructive",
      });
      return;
    }

    resetTravel();
    writeTravel({
      address: addresses.travel,
      abi: TRAVEL_CONTRACT_ABI,
      functionName: "travel",
      args: [BigInt(selectedDestination), BigInt(selectedTravelType), BigInt(itemId)],
    });
  };

  const isApproveLoading = isApprovePending || isApproveConfirming;
  const isTravelLoading = isTravelPending || isTravelConfirming;
  const isLoading = isApproveLoading || isTravelLoading;
  const selectedTravelTypeData = TRAVEL_TYPES[selectedTravelType];

  // Not connected
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Globe className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Travel</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to travel between cities.
        </p>
      </div>
    );
  }

  // Signing required
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

  if (signError || (!authData && !isSigning)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">Signature Required</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          A wallet signature is needed to verify your identity.
        </p>
        <Button onClick={requestSignature}>Sign Message</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with current location and travel status */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Travel</h2>
              <p className="text-xs text-muted-foreground">
                Move between cities using different transport
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current Location</p>
            <p className="font-semibold text-foreground flex items-center gap-1.5 justify-end">
              <MapPin className="h-4 w-4 text-primary" />
              {profile ? TravelCities.flatMap((r) => r.cities).find((c) => c.cityId === currentCityId)?.name || `City #${currentCityId}` : "Loading..."}
            </p>
            <p className="text-[10px] text-muted-foreground">{currentCityRegion}</p>
          </div>
        </div>

        {/* Travel Cooldown */}
        {isTraveling && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <Timer className="h-5 w-5 shrink-0 text-primary animate-pulse" />
            <div className="flex flex-1 items-center justify-between">
              <div>
                <span className="text-sm font-medium text-foreground">Currently Traveling</span>
                <p className="text-xs text-muted-foreground">
                  Via {TRAVEL_TYPES[travelInfo?.travelType ?? 0]?.label}
                </p>
              </div>
              <span className="font-mono text-lg font-bold text-primary tabular-nums">
                {timeLeft}
              </span>
            </div>
          </div>
        )}

        {!isTraveling && (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
            <span className="text-sm font-medium text-green-400">Ready to Travel</span>
          </div>
        )}

        {/* Cash Balance */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-background/50 px-4 py-2.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Cash Balance
          </span>
          <span className="font-mono text-sm font-semibold text-foreground">
            ${cashBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Travel Options */}
      {!isTraveling && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Select Travel Method</h3>

          {/* Travel Type Selector */}
          <div className="flex gap-2 mb-6">
            {TRAVEL_TYPES.map((type) => {
              const Icon = TRAVEL_ICONS[type.icon];
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedTravelType(type.id);
                    setSelectedVehicleId(0);
                    // Reset destination if changing away from plane and current dest needs plane
                    if (selectedDestination !== null && type.id !== 2 && needsPlane(selectedDestination)) {
                      setSelectedDestination(null);
                    }
                  }}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-2 rounded-lg border px-3 py-4 transition-all",
                    selectedTravelType === type.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{type.label}</span>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-muted-foreground">${type.cost.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {Math.floor(type.travelTime / 60)}m
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Vehicle Selector (for Car/Plane) */}
          {selectedTravelType !== 0 && (
            <div className="mb-6">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Select {selectedTravelType === 1 ? "Car/Motorcycle" : "Airplane"}
              </label>
              {loadingVehicles ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading vehicles...
                </div>
              ) : availableVehicles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No {selectedTravelType === 1 ? "cars/motorcycles" : "airplanes"} found.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Purchase one from the shop to use this travel method.
                  </p>
                </div>
              ) : (
                <Select
                  value={selectedVehicleId.toString()}
                  onValueChange={(v) => setSelectedVehicleId(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles.map((v) => (
                      <SelectItem key={v.itemId} value={v.itemId.toString()}>
                        {selectedTravelType === 1 ? "Car/Motorcycle" : "Airplane"} #{v.itemId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Destination Selector */}
          <div className="mb-6">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Select Destination
            </label>
            <div className="grid gap-4">
              {TravelCities.map((region) => {
                const isDifferentContinent = region.region !== currentCityRegion;
                const isDisabled = isDifferentContinent && selectedTravelType !== 2;

                return (
                  <div key={region.region}>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-xs font-semibold text-foreground">{region.region}</h4>
                      {isDifferentContinent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Plane Only
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {region.cities.map((city) => {
                        const isCurrent = city.cityId === currentCityId;
                        const disabled = isDisabled || isCurrent;

                        return (
                          <button
                            key={city.cityId}
                            onClick={() => !disabled && setSelectedDestination(city.cityId)}
                            disabled={disabled}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
                              selectedDestination === city.cityId
                                ? "border-primary bg-primary/10"
                                : disabled
                                  ? "border-border bg-background/30 opacity-50 cursor-not-allowed"
                                  : "border-border bg-background/50 hover:border-primary/30"
                            )}
                          >
                            <MapPin
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                selectedDestination === city.cityId
                                  ? "text-primary"
                                  : isCurrent
                                    ? "text-green-400"
                                    : "text-muted-foreground"
                              )}
                            />
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "text-xs font-medium truncate",
                                  selectedDestination === city.cityId
                                    ? "text-primary"
                                    : "text-foreground"
                                )}
                              >
                                {city.name}
                              </p>
                              {isCurrent && (
                                <p className="text-[10px] text-green-400">Current</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Travel Summary */}
          {selectedDestination !== null && (
            <div className="rounded-lg bg-background/50 p-4 mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">Travel Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium text-foreground">
                    {TravelCities.flatMap((r) => r.cities).find((c) => c.cityId === selectedDestination)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="font-medium text-foreground">{selectedTravelTypeData.label}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className={cn(
                    "font-medium",
                    cashBalance >= selectedTravelTypeData.cost ? "text-foreground" : "text-red-400"
                  )}>
                    ${selectedTravelTypeData.cost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Travel Time</p>
                  <p className="font-medium text-foreground">
                    {Math.floor(selectedTravelTypeData.travelTime / 60)} minutes
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {approveError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-400">
                {approveError.message.includes("User rejected")
                  ? "Approval rejected by user"
                  : approveError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {travelError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-400">
                {travelError.message.includes("User rejected")
                  ? "Travel rejected by user"
                  : travelError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={!isConnected || isLoading || approved}
              variant={approved ? "outline" : "secondary"}
              className="flex-1"
            >
              {isApproveLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isApprovePending ? "Approve..." : "Confirming..."}
                </>
              ) : approved ? (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2 text-green-400" />
                  Approved
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Approve Cash
                </>
              )}
            </Button>

            <Button
              onClick={handleTravel}
              disabled={
                !isConnected ||
                isLoading ||
                !approved ||
                selectedDestination === null ||
                (selectedTravelType !== 0 && selectedVehicleId === 0) ||
                cashBalance < selectedTravelTypeData.cost
              }
              className="flex-1"
            >
              {isTravelLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isTravelPending ? "Confirm..." : "Traveling..."}
                </>
              ) : (
                <>
                  <Plane className="h-4 w-4 mr-2" />
                  Travel
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
