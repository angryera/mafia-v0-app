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
  HOSPITAL_CONTRACT_ABI,
  USER_PROFILE_CONTRACT_ABI,
  TRAVEL_DESTINATIONS,
} from "@/lib/contract";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Droplets,
  Heart,
  AlertCircle,
  MapPin,
  Package,
  Coins,
  Timer,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseUnits, formatEther } from "viem";

interface ProfileData {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
}

interface BusinessInventoryItem {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner: string;
  cityId: number;
}

const OWNER_DISCOUNT_PERCENT = 20;
const OWNER_PRICE_FACTOR_NUM = BigInt(100 - OWNER_DISCOUNT_PERCENT); // 80
const OWNER_PRICE_FACTOR_DEN = BigInt(100);

export function HospitalAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData, isSigning: authSigning, signError, requestSignature } = useAuth();
  const { signMessageAsync } = useSignMessage();
  const [inventoryReady, setInventoryReady] = useState(false);
  const [hospitalBusinessItems, setHospitalBusinessItems] = useState<BusinessInventoryItem[]>([]);

  // ---------- Read user profile to get cityId ----------
  const { data: profileRaw, isLoading: profileLoading } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const profile = profileRaw as ProfileData | undefined;
  const cityId = profile?.cityId;
  const cityName =
    profile && profile.cityId < TRAVEL_DESTINATIONS.length
      ? TRAVEL_DESTINATIONS[profile.cityId].label
      : profile
        ? `City #${profile.cityId}`
        : null;

  // ---------- Read hospital stock & price for current city ----------
  const publicClient = usePublicClient();
  const [hospitalInfo, setHospitalInfo] = useState<[bigint, bigint] | null>(null);
  const [hospitalInfoLoading, setHospitalInfoLoading] = useState(false);
  const [hospitalInfoFetching, setHospitalInfoFetching] = useState(false);

  const fetchHospitalInfo = async () => {
    if (cityId === undefined || !publicClient) return;
    setHospitalInfoFetching(true);
    try {
      const result = await publicClient.readContract({
        address: addresses.hospital,
        abi: HOSPITAL_CONTRACT_ABI,
        functionName: "getCityHospitalInfo",
        args: [cityId],
      });
      setHospitalInfo(result as [bigint, bigint]);
    } catch (e) {
      console.log("[v0] Failed to fetch hospital info:", e);
    } finally {
      setHospitalInfoFetching(false);
      setHospitalInfoLoading(false);
    }
  };

  useEffect(() => {
    if (cityId === undefined || !publicClient) return;
    setHospitalInfoLoading(true);
    fetchHospitalInfo();
    const id = setInterval(fetchHospitalInfo, 30_000);
    return () => clearInterval(id);
  }, [cityId, publicClient, addresses.hospital]);

  const pricePerHealth = hospitalInfo?.[0];
  const amountLeft = hospitalInfo?.[1];
  const isHospitalOwner =
    !!address &&
    cityId !== undefined &&
    hospitalBusinessItems.some(
      (item) =>
        Number(item.typeId) === 3 &&
        Number(item.cityId) === Number(cityId) &&
        item.owner.toLowerCase() === address.toLowerCase()
    );
  const effectivePricePerHealth =
    pricePerHealth !== undefined
      ? isHospitalOwner
        ? (pricePerHealth * OWNER_PRICE_FACTOR_NUM) / OWNER_PRICE_FACTOR_DEN
        : pricePerHealth
      : undefined;

  // ---------- reproduceBlood ----------
  const {
    writeContract: writeBlood,
    data: bloodHash,
    isPending: bloodPending,
    error: bloodError,
    reset: resetBlood,
  } = useChainWriteContract();

  const { isLoading: bloodConfirming, isSuccess: bloodSuccess } =
    useWaitForTransactionReceipt({ hash: bloodHash });

  const handleReproduceBlood = () => {
    if (cityId === undefined) return;
    resetBlood();
    writeBlood({
      address: addresses.hospital,
      abi: HOSPITAL_CONTRACT_ABI,
      functionName: "reproduceBlood",
      args: [cityId],
    });
  };

  const bloodLoading = bloodPending || bloodConfirming;

  // ---------- buyHealth ----------
  const [healthAmount, setHealthAmount] = useState("");
  const [healthSigning, setHealthSigning] = useState(false);

  const {
    writeContract: writeHealth,
    data: healthHash,
    isPending: healthPending,
    error: healthError,
    reset: resetHealth,
  } = useChainWriteContract();

  const { isLoading: healthConfirming, isSuccess: healthSuccess } =
    useWaitForTransactionReceipt({ hash: healthHash });

  const isValidAmount =
    healthAmount.length > 0 &&
    Number(healthAmount) > 0 &&
    !Number.isNaN(Number(healthAmount));

  const handleBuyHealth = async () => {
    if (!isValidAmount || !address) return;
    resetHealth();
    setHealthSigning(true);
    try {
      const threeDaysInSeconds = 3 * 24 * 60 * 60;
      const utcTimestamp = Math.floor(Date.now() / 1000) + threeDaysInSeconds;
      const authMessage = `"Sign this message with ${address} - expire at ${utcTimestamp}"`;
      const signature = await signMessageAsync({ message: authMessage });
      setHealthSigning(false);

      const parsedAmount = parseUnits(healthAmount, 0);

      writeHealth({
        address: addresses.hospital,
        abi: HOSPITAL_CONTRACT_ABI,
        functionName: "buyHealth",
        args: [parsedAmount, authMessage, signature],
      });
    } catch {
      setHealthSigning(false);
    }
  };

  const healthLoading = healthSigning || healthPending || healthConfirming;

  // ---------- Cooldown: nextBuyTime ----------
  const { data: nextBuyTimeRaw } = useReadContract({
    address: addresses.hospital,
    abi: HOSPITAL_CONTRACT_ABI,
    functionName: "nextBuyTime",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 15_000,
    },
  });

  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    if (nextBuyTimeRaw === undefined) return;
    const cooldownEnd = Number(nextBuyTimeRaw) * 1000;

    const tick = () => {
      const diff = cooldownEnd - Date.now();
      setCooldownRemaining(diff > 0 ? diff : 0);
    };

    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [nextBuyTimeRaw]);

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);
  const cooldownMinutes = Math.floor(cooldownSeconds / 60);
  const cooldownSecs = cooldownSeconds % 60;
  const cooldownReady = cooldownSeconds <= 0;
  const onCooldown = isConnected && !cooldownReady;

  useEffect(() => {
    if (typeof window !== "undefined" && window.MafiaInventory) {
      setInventoryReady(true);
      return;
    }
    const existing = document.querySelector('script[src="/js/mafia-utils.js"]');
    if (existing) {
      existing.addEventListener("load", () => setInventoryReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setInventoryReady(true);
    document.head.appendChild(script);
  }, []);

  const fetchHospitalBusinessItems = useCallback(async () => {
    if (!inventoryReady || cityId === undefined || !addresses.inventory) {
      setHospitalBusinessItems([]);
      return;
    }
    if (!window.MafiaInventory) return;
    try {
      const items = await window.MafiaInventory.getItemsByCategory({
        chain: chainConfig.id,
        contractAddress: addresses.inventory,
        categoryId: 3,
      });
      setHospitalBusinessItems(items as BusinessInventoryItem[]);
    } catch (e) {
      console.error("Failed to fetch hospital business items:", e);
      setHospitalBusinessItems([]);
    }
  }, [inventoryReady, cityId, addresses.inventory, chainConfig.id]);

  useEffect(() => {
    void fetchHospitalBusinessItems();
  }, [fetchHospitalBusinessItems]);

  // ---------- Toast notifications ----------
  const healthToastFired = useRef(false);
  useEffect(() => {
    if (healthSuccess && healthHash && !healthToastFired.current) {
      healthToastFired.current = true;
      toast.success(`Success - You purchased ${Number(healthAmount).toLocaleString()} health`);
      fetchHospitalInfo();
    }
    if (!healthHash) {
      healthToastFired.current = false;
    }
  }, [healthSuccess, healthHash, healthAmount]);

  const bloodToastFired = useRef(false);
  useEffect(() => {
    if (bloodSuccess && bloodHash && !bloodToastFired.current) {
      bloodToastFired.current = true;
      toast.success("Blood reproduced successfully");
    }
    if (!bloodHash) {
      bloodToastFired.current = false;
    }
  }, [bloodSuccess, bloodHash]);

  // ---------- Auth states ----------
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Stethoscope className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Hospital</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to access the hospital.
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
          Please sign the message in your wallet to load hospital data.
        </p>
      </div>
    );
  }

  if (signError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">
          Signature Required
        </p>
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
        <p className="text-lg font-semibold text-foreground">
          Loading Profile...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Hospital</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Restore blood or buy health at the on-chain hospital.
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          <Stethoscope className="inline h-3.5 w-3.5" />
        </span>
      </div>

      {/* ===== Cooldown Timer ===== */}
      {isConnected && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Timer
            className={`h-5 w-5 shrink-0 ${cooldownReady ? "text-green-400" : "text-primary"}`}
          />
          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm text-muted-foreground">Next Purchase</span>
            {cooldownReady ? (
              <span className="font-mono text-sm font-semibold text-green-400">
                Now
              </span>
            ) : (
              <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                {cooldownMinutes}:{cooldownSecs.toString().padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ===== Hospital Stock & Price Block ===== */}
      <div className="mb-5 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Hospital Stock{cityName ? ` - ${cityName}` : ""}
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                getCityHospitalInfo(cityId)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchHospitalInfo()}
            disabled={hospitalInfoFetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-50"
            aria-label="Refresh hospital data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", hospitalInfoFetching && "animate-spin")} />
          </button>
        </div>

        {hospitalInfoLoading || cityId === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading hospital data...
          </div>
        ) : hospitalInfo ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background/50 border border-border p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Package className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Health Available
                </span>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {Number(amountLeft).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">units in stock</p>
            </div>
            <div className="rounded-lg bg-background/50 border border-border p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Coins className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Price per Health
                </span>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {effectivePricePerHealth !== undefined
                  ? Number(formatEther(effectivePricePerHealth)).toLocaleString()
                  : "—"}
              </p>
              {isHospitalOwner && (
                <p className="text-[10px] text-green-400 mt-0.5">
                  Owner discount applied (-{OWNER_DISCOUNT_PERCENT}%)
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">cash per 1 health</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hospital data available for this city.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {/* ===== Reproduce Blood Card ===== */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-6 transition-all duration-300",
            bloodSuccess && "border-green-400/30",
            bloodError && "border-red-400/30"
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Droplets className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Reproduce Blood
              </h3>
              <p className="text-xs text-muted-foreground">
                Regenerate blood using your current city location
              </p>
            </div>
          </div>

          {/* City info */}
          <div className="mb-4 rounded-md bg-background/50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Function</span>
              <span className="font-mono text-[10px] text-primary">
                reproduceBlood(uint8)
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">City</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <MapPin className="h-3 w-3 text-primary" />
                {cityName ?? "Loading..."}
                {cityId !== undefined && (
                  <span className="text-muted-foreground font-mono">
                    (id: {cityId})
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Blood success */}
          {bloodSuccess && bloodHash && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
              <a
                href={`${explorer}/tx/${bloodHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
              >
                {bloodHash.slice(0, 10)}...{bloodHash.slice(-8)}
              </a>
            </div>
          )}

          {/* Blood error */}
          {bloodError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="line-clamp-2 text-[10px] text-red-400">
                {bloodError.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : bloodError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Blood button */}
          <button
            onClick={handleReproduceBlood}
            disabled={!isConnected || bloodLoading || cityId === undefined}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              isConnected && cityId !== undefined
                ? "bg-red-500/90 text-white hover:bg-red-500 active:scale-[0.98] disabled:opacity-50"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {bloodLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {bloodPending ? "Confirm in wallet..." : "Confirming..."}
              </>
            ) : (
              <>
                <Droplets className="h-4 w-4" />
                Reproduce Blood
              </>
            )}
          </button>
        </div>

        {/* ===== Buy Health Card ===== */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-6 transition-all duration-300",
            onCooldown && "opacity-40 pointer-events-none",
            healthSuccess && "border-green-400/30",
            healthError && "border-red-400/30"
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Heart className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Buy Health
              </h3>
              <p className="text-xs text-muted-foreground">
                Purchase health with a signed message for authentication
              </p>
            </div>
          </div>

          {/* Amount input */}
          <div className="mb-4">
            <label
              htmlFor="health-amount"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Health Amount
            </label>
            <input
              id="health-amount"
              type="number"
              placeholder="0"
              min="1"
              step="1"
              value={healthAmount}
              onChange={(e) => setHealthAmount(e.target.value)}
              disabled={healthLoading}
              className={cn(
                "w-full rounded-lg border bg-background/50 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
                healthAmount.length > 0 && !isValidAmount
                  ? "border-red-400/50 focus:border-red-400"
                  : "border-border focus:border-primary"
              )}
            />
            {healthAmount.length > 0 && !isValidAmount && (
              <p className="mt-1 text-[10px] text-red-400">
                Please enter a valid amount greater than 0
              </p>
            )}
          </div>

          {/* Info */}
          <div className="mb-4 rounded-md bg-background/50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Function</span>
              <span className="font-mono text-[10px] text-primary">
                buyHealth(uint256,string,bytes)
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Auth</span>
              <span className="font-mono text-[10px] text-foreground">
                Signed message + signature
              </span>
            </div>
            {isValidAmount && (
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Buying</span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {Number(healthAmount).toLocaleString()} health
                </span>
              </div>
            )}
            {isValidAmount && effectivePricePerHealth !== undefined && (
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Cost</span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {(Number(formatEther(effectivePricePerHealth)) * Number(healthAmount)).toLocaleString()} cash
                </span>
              </div>
            )}
          </div>

          {/* Health success */}
          {healthSuccess && healthHash && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
              <a
                href={`${explorer}/tx/${healthHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
              >
                {healthHash.slice(0, 10)}...{healthHash.slice(-8)}
              </a>
            </div>
          )}

          {/* Health error */}
          {healthError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="line-clamp-2 text-[10px] text-red-400">
                {healthError.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : healthError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Health button */}
          <button
            onClick={handleBuyHealth}
            disabled={!isConnected || healthLoading || !isValidAmount || onCooldown}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              isConnected && isValidAmount && !onCooldown
                ? "bg-emerald-500/90 text-white hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {healthLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {healthSigning
                  ? "Sign message..."
                  : healthPending
                    ? "Confirm in wallet..."
                    : "Confirming..."}
              </>
            ) : (
              <>
                <Heart className="h-4 w-4" />
                {isConnected ? "Buy Health" : "Connect Wallet"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
