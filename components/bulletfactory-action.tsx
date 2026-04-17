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
  BULLET_FACTORY_ABI,
  USER_PROFILE_CONTRACT_ABI,
  TRAVEL_DESTINATIONS,
} from "@/lib/contract";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Factory,
  CheckCircle2,
  XCircle,
  Crosshair,
  AlertCircle,
  MapPin,
  Package,
  Coins,
  RefreshCw,
  Timer,
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

export function BulletFactoryAction() {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const { authData, isSigning: authSigning, signError, requestSignature } = useAuth();
  const { signMessageAsync } = useSignMessage();
  const [inventoryReady, setInventoryReady] = useState(false);
  const [bulletBusinessItems, setBulletBusinessItems] = useState<BusinessInventoryItem[]>([]);

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

  // ---------- Read bullet market stock & price for current city ----------
  const publicClient = usePublicClient();
  const [marketInfo, setMarketInfo] = useState<[bigint, bigint] | null>(null);
  const [marketInfoLoading, setMarketInfoLoading] = useState(false);
  const [marketInfoFetching, setMarketInfoFetching] = useState(false);

  const fetchMarketInfo = async () => {
    if (cityId === undefined || !publicClient) return;
    setMarketInfoFetching(true);
    try {
      const result = await publicClient.readContract({
        address: addresses.bulletFactory,
        abi: BULLET_FACTORY_ABI,
        functionName: "getCityMarketInfo",
        args: [cityId],
      });
      const r = result as [bigint, bigint];
      setMarketInfo(r);
    } catch {
      // silently fail
    } finally {
      setMarketInfoFetching(false);
      setMarketInfoLoading(false);
    }
  };

  useEffect(() => {
    if (cityId === undefined || !publicClient) return;
    setMarketInfoLoading(true);
    fetchMarketInfo();
    const id = setInterval(fetchMarketInfo, 30_000);
    return () => clearInterval(id);
  }, [cityId, publicClient, addresses.bulletFactory]);

  const pricePerBullet = marketInfo?.[0];
  const amountLeft = marketInfo?.[1];
  const isBulletFactoryOwner =
    !!address &&
    cityId !== undefined &&
    bulletBusinessItems.some(
      (item) =>
        Number(item.typeId) === 9 &&
        Number(item.cityId) === Number(cityId) &&
        item.owner.toLowerCase() === address.toLowerCase()
    );
  const effectivePricePerBullet =
    pricePerBullet !== undefined
      ? isBulletFactoryOwner
        ? (pricePerBullet * OWNER_PRICE_FACTOR_NUM) / OWNER_PRICE_FACTOR_DEN
        : pricePerBullet
      : undefined;

  // ---------- reproduceBullets ----------
  const {
    writeContract: writeReproduce,
    data: reproduceHash,
    isPending: reproducePending,
    error: reproduceError,
    reset: resetReproduce,
  } = useChainWriteContract();

  const { isLoading: reproduceConfirming, isSuccess: reproduceSuccess } =
    useWaitForTransactionReceipt({ hash: reproduceHash });

  const handleReproduceBullets = () => {
    if (cityId === undefined) return;
    resetReproduce();
    writeReproduce({
      address: addresses.bulletFactory,
      abi: BULLET_FACTORY_ABI,
      functionName: "reproduceBullets",
      args: [cityId],
    });
  };

  const reproduceLoading = reproducePending || reproduceConfirming;

  // ---------- buyBullets ----------
  const [bulletAmount, setBulletAmount] = useState("");
  const [bulletSigning, setBulletSigning] = useState(false);

  const {
    writeContract: writeBullets,
    data: bulletHash,
    isPending: bulletPending,
    error: bulletError,
    reset: resetBullets,
  } = useChainWriteContract();

  const { isLoading: bulletConfirming, isSuccess: bulletSuccess } =
    useWaitForTransactionReceipt({ hash: bulletHash });

  const isValidAmount =
    bulletAmount.length > 0 &&
    Number(bulletAmount) > 0 &&
    !Number.isNaN(Number(bulletAmount));

  const handleBuyBullets = async () => {
    if (!isValidAmount || !address) return;
    resetBullets();
    setBulletSigning(true);
    try {
      const threeDaysInSeconds = 3 * 24 * 60 * 60;
      const utcTimestamp = Math.floor(Date.now() / 1000) + threeDaysInSeconds;
      const authMessage = `"Sign this message with ${address} - expire at ${utcTimestamp}"`;
      const signature = await signMessageAsync({ message: authMessage });
      setBulletSigning(false);

      const parsedAmount = parseUnits(bulletAmount, 0);

      writeBullets({
        address: addresses.bulletFactory,
        abi: BULLET_FACTORY_ABI,
        functionName: "buyBullets",
        args: [parsedAmount, authMessage, signature],
      });
    } catch {
      setBulletSigning(false);
    }
  };

  const bulletLoading = bulletSigning || bulletPending || bulletConfirming;

  // ---------- Cooldown: nextBuyTime ----------
  const { data: nextBuyTimeRaw } = useReadContract({
    address: addresses.bulletFactory,
    abi: BULLET_FACTORY_ABI,
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

  const fetchBulletBusinessItems = useCallback(async () => {
    if (!inventoryReady || cityId === undefined || !addresses.inventory) {
      setBulletBusinessItems([]);
      return;
    }
    if (!window.MafiaInventory) return;
    try {
      const items = await window.MafiaInventory.getItemsByCategory({
        chain: chainConfig.id,
        contractAddress: addresses.inventory,
        categoryId: 3,
      });
      setBulletBusinessItems(items as BusinessInventoryItem[]);
    } catch (e) {
      console.error("Failed to fetch bullet factory business items:", e);
      setBulletBusinessItems([]);
    }
  }, [inventoryReady, cityId, addresses.inventory, chainConfig.id]);

  useEffect(() => {
    void fetchBulletBusinessItems();
  }, [fetchBulletBusinessItems]);

  // ---------- Toast notifications ----------
  const bulletToastFired = useRef(false);
  useEffect(() => {
    if (bulletSuccess && bulletHash && !bulletToastFired.current) {
      bulletToastFired.current = true;
      toast.success(`Success - You purchased ${Number(bulletAmount).toLocaleString()} bullets`);
      fetchMarketInfo();
    }
    if (!bulletHash) {
      bulletToastFired.current = false;
    }
  }, [bulletSuccess, bulletHash, bulletAmount]);

  const reproduceToastFired = useRef(false);
  useEffect(() => {
    if (reproduceSuccess && reproduceHash && !reproduceToastFired.current) {
      reproduceToastFired.current = true;
      toast.success("Bullets reproduced successfully");
    }
    if (!reproduceHash) {
      reproduceToastFired.current = false;
    }
  }, [reproduceSuccess, reproduceHash]);

  // ---------- Auth states ----------
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Factory className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Bullet Factory</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to access the bullet factory.
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
          Please sign the message in your wallet to load market data.
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
          <h2 className="text-lg font-bold text-foreground">Bullet Factory</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Purchase bullets at your city's factory.
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          <Factory className="inline h-3.5 w-3.5" />
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

      {/* ===== Market Stock & Price Block ===== */}
      <div className="mb-5 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Factory className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Bullet Market{cityName ? ` - ${cityName}` : ""}
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                getCityMarketInfo(cityId)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchMarketInfo()}
            disabled={marketInfoFetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-50"
            aria-label="Refresh market data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", marketInfoFetching && "animate-spin")} />
          </button>
        </div>

        {marketInfoLoading || cityId === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading market data...
          </div>
        ) : marketInfo ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background/50 border border-border p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Package className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Bullets Available
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
                  Price per Bullet
                </span>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {effectivePricePerBullet !== undefined
                  ? Number(formatEther(effectivePricePerBullet)).toLocaleString()
                  : "\u2014"}
              </p>
              {isBulletFactoryOwner && (
                <p className="text-[10px] text-green-400 mt-0.5">
                  Owner discount applied (-{OWNER_DISCOUNT_PERCENT}%)
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">cash per 1 bullet</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No market data available for this city.
          </p>
        )}
      </div>



      <div className="flex flex-col gap-6">
        {/* ===== Reproduce Bullets Card ===== */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-6 transition-all duration-300",
            reproduceSuccess && "border-green-400/30",
            reproduceError && "border-red-400/30"
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chain-accent/10">
              <RefreshCw className="h-5 w-5 text-chain-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Reproduce Bullets
              </h3>
              <p className="text-xs text-muted-foreground">
                Reproduce bullets using your current city location
              </p>
            </div>
          </div>

          {/* City info */}
          <div className="mb-4 rounded-md bg-background/50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Function</span>
              <span className="font-mono text-[10px] text-primary">
                reproduceBullets(uint8)
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

          {/* Reproduce success */}
          {reproduceSuccess && reproduceHash && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
              <a
                href={`${explorer}/tx/${reproduceHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
              >
                {reproduceHash.slice(0, 10)}...{reproduceHash.slice(-8)}
              </a>
            </div>
          )}

          {/* Reproduce error */}
          {reproduceError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="line-clamp-2 text-[10px] text-red-400">
                {reproduceError.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : reproduceError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Reproduce button */}
          <button
            onClick={handleReproduceBullets}
            disabled={!isConnected || reproduceLoading || cityId === undefined}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              isConnected && cityId !== undefined
                ? "bg-primary/90 text-primary-foreground hover:bg-primary active:scale-[0.98] disabled:opacity-50"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {reproduceLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {reproducePending ? "Confirm in wallet..." : "Confirming..."}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Reproduce Bullets
              </>
            )}
          </button>
        </div>

        {/* ===== Buy Bullets Card ===== */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-6 transition-all duration-300",
            onCooldown && "opacity-40 pointer-events-none",
            bulletSuccess && "border-green-400/30",
            bulletError && "border-red-400/30"
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Crosshair className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Buy Bullets
              </h3>
              <p className="text-xs text-muted-foreground">
                Purchase bullets with a signed message for authentication
              </p>
            </div>
          </div>

          {/* Amount input */}
          <div className="mb-4">
            <label
              htmlFor="bullet-amount"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Bullet Amount
            </label>
            <input
              id="bullet-amount"
              type="number"
              placeholder="0"
              min="1"
              step="1"
              value={bulletAmount}
              onChange={(e) => setBulletAmount(e.target.value)}
              disabled={bulletLoading}
              className={cn(
                "w-full rounded-lg border bg-background/50 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
                bulletAmount.length > 0 && !isValidAmount
                  ? "border-red-400/50 focus:border-red-400"
                  : "border-border focus:border-primary"
              )}
            />
            {bulletAmount.length > 0 && !isValidAmount && (
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
                buyBullets(uint256,string,bytes)
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
                  {Number(bulletAmount).toLocaleString()} bullets
                </span>
              </div>
            )}
            {isValidAmount && effectivePricePerBullet !== undefined && (
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Cost</span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {(Number(formatEther(effectivePricePerBullet)) * Number(bulletAmount)).toLocaleString()} cash
                </span>
              </div>
            )}
          </div>

          {/* Success */}
          {bulletSuccess && bulletHash && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
              <a
                href={`${explorer}/tx/${bulletHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
              >
                {bulletHash.slice(0, 10)}...{bulletHash.slice(-8)}
              </a>
            </div>
          )}

          {/* Error */}
          {bulletError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="line-clamp-2 text-[10px] text-red-400">
                {bulletError.message.includes("User rejected")
                  ? "Transaction rejected by user"
                  : bulletError.message.split("\n")[0]}
              </p>
            </div>
          )}

          {/* Buy button */}
          <button
            onClick={handleBuyBullets}
            disabled={!isConnected || bulletLoading || !isValidAmount || onCooldown}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              isConnected && isValidAmount && !onCooldown
                ? "bg-orange-500/90 text-white hover:bg-orange-500 active:scale-[0.98] disabled:opacity-50"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {bulletLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {bulletSigning
                  ? "Sign message..."
                  : bulletPending
                    ? "Confirm in wallet..."
                    : "Confirming..."}
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                {isConnected ? "Buy Bullets" : "Connect Wallet"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
