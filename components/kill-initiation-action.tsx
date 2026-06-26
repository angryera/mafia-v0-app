"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAccount, usePublicClient } from "wagmi";
import { isAddress, getAddress } from "viem";
import {
  Loader2,
  Crosshair,
  Zap,
  Search,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  Eye,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  getBulletBalance,
  getPlayerCity,
  getTargetSafehouseStatus,
  getUserDetectiveHires,
  getKnownProfiles,
  computeKillEligibility,
  getEligibilityMessage,
  initiateKill,
  MOCK_KILL_INITIATION_ENABLED,
  type KnownProfile,
  type PlayerCity,
  type DetectiveHireRecord,
  type KillBlockReason,
} from "@/lib/killContract";
import {
  getEquippedWeaponInCity,
  type EquippedWeaponInfo,
} from "@/lib/equipmentContract";
import { useKillOutcome } from "@/components/kill-outcome-provider";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function KillInitiationAction() {
  const router = useRouter();
  const { setKillBattle } = useKillOutcome();
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const { authData, isSigning, signError, requestSignature } = useAuth();
  const publicClient = usePublicClient();

  // ── Player reads (bullets + city/profile) ──────────────────────────────────
  const [bulletBalance, setBulletBalance] = useState<number | null>(null);
  const [playerCity, setPlayerCity] = useState<PlayerCity | null>(null);

  const refreshBullets = useCallback(async () => {
    if (!publicClient || !address || !authData) return;
    try {
      const bal = await getBulletBalance({
        publicClient,
        bulletsAddress: addresses.bullets,
        wallet: address,
        message: authData.message,
        signature: authData.signature,
      });
      setBulletBalance(bal);
    } catch (e) {
      console.error("Failed to read bullet balance:", e);
    }
  }, [publicClient, address, authData, addresses.bullets]);

  useEffect(() => {
    if (!authData) {
      setBulletBalance(null);
      return;
    }
    refreshBullets();
  }, [refreshBullets, authData]);

  useEffect(() => {
    if (!publicClient || !address || !authData) {
      setPlayerCity(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const city = await getPlayerCity({
          publicClient,
          userProfileAddress: addresses.userProfile,
          wallet: address,
          message: authData.message,
          signature: authData.signature,
        });
        if (!cancelled) setPlayerCity(city);
      } catch (e) {
        console.error("Failed to read player profile:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, authData, addresses.userProfile]);

  // ── Weapon equipped in current city ───────────────────────────────────────
  const [inventoryScriptReady, setInventoryScriptReady] = useState(
    () => typeof window !== "undefined" && !!window.MafiaInventory,
  );
  const [weaponChecking, setWeaponChecking] = useState(false);
  const [equippedWeapon, setEquippedWeapon] = useState<EquippedWeaponInfo | null>(
    null,
  );

  useEffect(() => {
    if (inventoryScriptReady) return;
    if (typeof window !== "undefined" && window.MafiaInventory) {
      setInventoryScriptReady(true);
      return;
    }
    const existing = document.querySelector('script[src="/js/mafia-utils.js"]');
    if (existing) {
      existing.addEventListener("load", () => setInventoryScriptReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setInventoryScriptReady(true);
    document.head.appendChild(script);
  }, [inventoryScriptReady]);

  const loadEquippedWeapon = useCallback(async (): Promise<EquippedWeaponInfo | null> => {
    if (
      !publicClient ||
      !address ||
      !authData ||
      playerCity?.cityId === undefined ||
      !inventoryScriptReady
    ) {
      return null;
    }
    return getEquippedWeaponInCity({
      publicClient,
      equipmentAddress: addresses.equipment,
      inventoryAddress: addresses.inventory,
      chain: chainConfig.id,
      account: address,
      cityId: playerCity.cityId,
      signMsg: authData.message,
      signature: authData.signature,
    });
  }, [
    publicClient,
    address,
    authData,
    playerCity?.cityId,
    addresses.equipment,
    addresses.inventory,
    chainConfig.id,
    inventoryScriptReady,
  ]);

  useEffect(() => {
    if (!authData || playerCity?.cityId === undefined || !inventoryScriptReady) {
      setEquippedWeapon(null);
      setWeaponChecking(false);
      return;
    }
    let cancelled = false;
    setWeaponChecking(true);
    (async () => {
      try {
        const weapon = await loadEquippedWeapon();
        if (!cancelled) setEquippedWeapon(weapon);
      } catch (e) {
        console.error("Failed to read equipped weapon:", e);
        if (!cancelled) setEquippedWeapon(null);
      } finally {
        if (!cancelled) setWeaponChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadEquippedWeapon, authData, playerCity?.cityId, inventoryScriptReady]);

  const hasWeaponEquipped = equippedWeapon !== null;

  // ── Known profiles (autocomplete) ───────────────────────────────────────────
  const [knownProfiles, setKnownProfiles] = useState<KnownProfile[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profiles = await getKnownProfiles({ chain: chainConfig.id });
        if (!cancelled) setKnownProfiles(profiles);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chainConfig.id]);

  // ── Detective hires (on-chain, same source as Detective Agency page) ────────
  const [hires, setHires] = useState<DetectiveHireRecord[]>([]);
  const [hiresLoading, setHiresLoading] = useState(false);

  const loadDetectiveHires = useCallback(async () => {
    if (!publicClient || !address || !authData) return;
    setHiresLoading(true);
    try {
      const list = await getUserDetectiveHires({
        publicClient,
        detectiveAgencyAddress: addresses.detectiveAgency,
        wallet: address,
        message: authData.message,
        signature: authData.signature,
      });
      setHires(list);
    } catch (e) {
      console.error("Failed to read detective hires:", e);
      setHires([]);
    } finally {
      setHiresLoading(false);
    }
  }, [
    publicClient,
    address,
    authData,
    addresses.detectiveAgency,
  ]);

  useEffect(() => {
    if (!authData) {
      setHires([]);
      return;
    }
    loadDetectiveHires();
  }, [loadDetectiveHires, authData]);

  // Attach profile names so name-based victim entry can match detective hires.
  const hiresWithNames = useMemo(
    () =>
      hires.map((h) => {
        const profile = knownProfiles.find(
          (p) => p.address.toLowerCase() === h.target.toLowerCase(),
        );
        return profile ? { ...h, targetName: profile.name } : h;
      }),
    [hires, knownProfiles],
  );

  // ── Victim field + target resolution ────────────────────────────────────────
  const [victim, setVictim] = useState("");
  const [targetAddress, setTargetAddress] = useState<`0x${string}` | null>(null);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Resolve the entered victim into an address whenever it (or the profile list)
  // changes. Pasting a valid 0x address resolves immediately; a name resolves on
  // an exact (case-insensitive) match against the known profiles.
  useEffect(() => {
    const trimmed = victim.trim();
    if (trimmed.length === 0) {
      setTargetAddress(null);
      setTargetName(null);
      return;
    }
    if (isAddress(trimmed)) {
      const checksummed = getAddress(trimmed);
      setTargetAddress(checksummed);
      const known = knownProfiles.find(
        (p) => p.address.toLowerCase() === checksummed.toLowerCase(),
      );
      setTargetName(known?.name ?? null);
      return;
    }
    const exact = knownProfiles.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exact) {
      setTargetAddress(exact.address);
      setTargetName(exact.name);
    } else {
      setTargetAddress(null);
      setTargetName(null);
    }
  }, [victim, knownProfiles]);

  // Autocomplete suggestions (prefix match on name, max 10).
  const suggestions = useMemo(() => {
    const trimmed = victim.trim().toLowerCase();
    if (trimmed.length === 0 || isAddress(victim.trim())) return [];
    return knownProfiles
      .filter((p) => p.name.toLowerCase().startsWith(trimmed))
      .slice(0, 10);
  }, [victim, knownProfiles]);

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (fieldRef.current && !fieldRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectProfile = (p: KnownProfile) => {
    setVictim(p.name);
    setTargetAddress(p.address);
    setTargetName(p.name);
    setShowDropdown(false);
  };

  // Is the resolved target the player themselves?
  const isSelfTarget = useMemo(() => {
    if (!targetAddress) return false;
    if (address && targetAddress.toLowerCase() === address.toLowerCase()) return true;
    if (
      playerCity?.username &&
      targetName &&
      playerCity.username.toLowerCase() === targetName.toLowerCase()
    ) {
      return true;
    }
    return false;
  }, [targetAddress, address, playerCity?.username, targetName]);

  const hasValidTarget = !!targetAddress && !isSelfTarget;

  // ── Bullet spend field ──────────────────────────────────────────────────────
  const [bulletInput, setBulletInput] = useState("");
  const bulletAmount = Number(bulletInput);
  const isValidBulletAmount =
    bulletInput.length > 0 && Number.isFinite(bulletAmount) && bulletAmount >= 1;

  // ── Live safehouse status for the resolved target ───────────────────────────
  const [safehouseChecking, setSafehouseChecking] = useState(false);
  const [targetInSafehouse, setTargetInSafehouse] = useState(false);

  useEffect(() => {
    if (!hasValidTarget || !targetAddress) {
      setTargetInSafehouse(false);
      setSafehouseChecking(false);
      return;
    }
    let cancelled = false;
    setSafehouseChecking(true);
    setTargetInSafehouse(false);
    (async () => {
      try {
        const status = await getTargetSafehouseStatus({ target: targetAddress });
        if (!cancelled) setTargetInSafehouse(status.inSafehouse);
      } catch (e) {
        console.error("Failed to read target safehouse status:", e);
      } finally {
        if (!cancelled) setSafehouseChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasValidTarget, targetAddress]);

  // ── Ticking clock (for kill-window expiry) ──────────────────────────────────
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Live detective eligibility ──────────────────────────────────────────────
  const eligibility = useMemo(
    () =>
      computeKillEligibility({
        hires: hiresWithNames,
        targetAddress,
        targetName,
        playerCityId: playerCity?.cityId ?? null,
        now,
      }),
    [hiresWithNames, targetAddress, targetName, playerCity?.cityId, now],
  );

  const detectiveState: KillBlockReason = hiresLoading ? "checking" : eligibility.reason;
  const detectiveBlocked =
    hasValidTarget && detectiveState !== "eligible";

  // ── Confirm ─────────────────────────────────────────────────────────────────
  const [confirming, setConfirming] = useState(false);

  const confirmDisabled =
    confirming ||
    !hasValidTarget ||
    !isValidBulletAmount ||
    safehouseChecking ||
    targetInSafehouse ||
    hiresLoading ||
    detectiveBlocked ||
    weaponChecking ||
    !hasWeaponEquipped;

  const handleConfirm = async () => {
    // 1) Wallet connected
    if (!isConnected || !address) {
      toast.error("Account not connected");
      return;
    }
    // 2) Signed / signature present
    if (!authData) {
      toast.error("Please sign the message in your wallet to verify your identity.");
      requestSignature();
      return;
    }
    // 3) Weapon equipped in current city — fresh read
    let weapon = equippedWeapon;
    try {
      weapon = await loadEquippedWeapon();
      setEquippedWeapon(weapon);
    } catch (e) {
      console.error("Weapon re-check failed:", e);
    }
    if (!weapon) {
      toast.error(
        playerCity?.cityName
          ? `Equip a weapon in ${playerCity.cityName} before initiating a kill.`
          : "Equip a weapon in your current city before initiating a kill.",
      );
      return;
    }
    // 4) Empty victim
    const trimmed = victim.trim();
    if (trimmed.length === 0) {
      toast.error("Please enter a victim name or wallet address.");
      return;
    }
    // 5) No resolved target
    if (!targetAddress) {
      toast.error("Target not found. Select a valid profile or wallet address.");
      return;
    }
    // 6) Self-target
    if (isSelfTarget) {
      toast.error("You cannot target yourself.");
      return;
    }
    // 7) Safehouse — fresh read
    let inSafehouse = targetInSafehouse;
    try {
      const status = await getTargetSafehouseStatus({ target: targetAddress });
      inSafehouse = status.inSafehouse;
      setTargetInSafehouse(status.inSafehouse);
    } catch (e) {
      console.error("Safehouse re-check failed:", e);
    }
    if (inSafehouse) {
      toast.error("This target is in the safehouse and cannot be attacked.");
      return;
    }
    // 8) Detective-agency eligibility
    const elig = computeKillEligibility({
      hires: hiresWithNames,
      targetAddress,
      targetName,
      playerCityId: playerCity?.cityId ?? null,
      now: Math.floor(Date.now() / 1000),
    });
    if (elig.reason !== "eligible") {
      toast.error(getEligibilityMessage(elig.reason, elig.targetCityName));
      return;
    }
    // 9) Bullet amount valid
    if (!Number.isFinite(bulletAmount) || bulletAmount < 1) {
      toast.error("Enter a valid bullet amount to spend on this attack.");
      return;
    }
    // 10) Enough bullets
    if (bulletBalance !== null && bulletAmount > bulletBalance) {
      toast.error("You don't have enough bullets for this attack.");
      return;
    }

    // All checks passed → initiate the attack.
    setConfirming(true);
    try {
      const outcome = await initiateKill({
        targetAddress,
        bulletAmount,
        attackerAddress: address,
        attackerName: playerCity?.username || shortAddress(address),
        victimName: targetName || shortAddress(targetAddress),
        cityName: playerCity?.cityName ?? "Unknown city",
      });

      if (MOCK_KILL_INITIATION_ENABLED && outcome) {
        setKillBattle(outcome);
        router.push("/kill-outcome");
        return;
      }

      toast.success(
        "Attack validated. On-chain kill initiation will be enabled in an upcoming update.",
      );
      setVictim("");
      setBulletInput("");
      setTargetAddress(null);
      setTargetName(null);
    } catch (e) {
      console.error("Kill initiation failed:", e);
      toast.error("Could not initiate the attack. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  // Helper label under the victim field.
  const victimHelper = (() => {
    if (victim.trim().length === 0) return null;
    if (isSelfTarget) return "You cannot target yourself.";
    if (targetAddress) return `Target: ${shortAddress(targetAddress)}`;
    return "Please select a valid profile name.";
  })();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <Crosshair className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Kill Initiation
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Target a player and spend bullets to launch your attack.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Your bullets
            </p>
            <p className="font-mono text-sm font-bold tabular-nums text-foreground">
              {bulletBalance !== null ? bulletBalance.toLocaleString() : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {/* Weapon requirement (player readiness) */}
        {authData && playerCity && (
          <div className="mb-4">
            {weaponChecking ? (
              <div className="flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-400">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span>Checking weapon in {playerCity.cityName}…</span>
              </div>
            ) : hasWeaponEquipped && equippedWeapon ? (
              <div className="flex items-center gap-2 rounded-md border border-green-400/30 bg-green-400/10 px-3 py-2">
                <Swords className="h-3.5 w-3.5 shrink-0 text-green-400" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  <span className="font-medium">{equippedWeapon.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · #{equippedWeapon.itemId} ·{" "}
                  </span>
                  <span className="font-mono text-red-400/90">
                    {equippedWeapon.offense} OFF
                  </span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="font-mono text-cyan-400/90">
                    {equippedWeapon.defense} DEF
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {playerCity.cityName}
                  </span>
                </span>
                <Link
                  href="/equipment"
                  className="shrink-0 text-[10px] font-medium text-green-400 hover:underline"
                >
                  Change
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
                <Swords className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  No weapon in {playerCity.cityName}.{" "}
                  <Link href="/equipment" className="font-medium hover:underline">
                    Equip
                  </Link>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Fields: victim + bullets side by side */}
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Victim */}
          <div className="flex-1" ref={fieldRef}>
            <label
              htmlFor="victim"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Victim
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="victim"
                type="text"
                autoComplete="off"
                placeholder="Player name or 0x address"
                value={victim}
                onChange={(e) => {
                  setVictim(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                disabled={confirming}
                className={cn(
                  "w-full rounded-lg border bg-background/50 px-3 py-2.5 pl-9 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
                  victim.trim().length > 0 && !targetAddress && !isSelfTarget
                    ? "border-red-400/40 focus:border-red-400"
                    : "border-border focus:border-primary",
                )}
              />

              {/* Autocomplete dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-xl shadow-black/30">
                  {suggestions.map((p) => (
                    <button
                      key={p.address}
                      type="button"
                      onClick={() => selectProfile(p)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/70"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.name}
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {shortAddress(p.address)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {victimHelper && (
              <p
                className={cn(
                  "mt-1.5 text-[11px]",
                  isSelfTarget
                    ? "text-red-400"
                    : targetAddress
                      ? "text-green-400"
                      : "text-muted-foreground",
                )}
              >
                {victimHelper}
              </p>
            )}
          </div>

          {/* Bullets */}
          <div className="sm:w-48">
            <label
              htmlFor="bullets"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Bullets to spend
            </label>
            <div className="relative">
              <Zap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
              <input
                id="bullets"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="1"
                value={bulletInput}
                onChange={(e) => setBulletInput(e.target.value)}
                disabled={confirming}
                className={cn(
                  "w-full rounded-lg border bg-background/50 px-3 py-2.5 pl-9 font-mono text-sm tabular-nums text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
                  bulletInput.length > 0 && !isValidBulletAmount
                    ? "border-red-400/40 focus:border-red-400"
                    : "border-border focus:border-primary",
                )}
              />
            </div>
            {bulletInput.length > 0 && !isValidBulletAmount && (
              <p className="mt-1.5 text-[11px] text-red-400">
                Enter at least 1 bullet.
              </p>
            )}
          </div>
        </div>

        {/* Conditional alerts (only once a valid target is entered) */}
        {hasValidTarget && (
          <div className="mt-4 flex flex-col gap-3">
            {/* Safehouse alert */}
            {targetInSafehouse && (
              <div className="flex items-start gap-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-semibold text-red-400">
                    Target is in safehouse
                  </p>
                  <p className="mt-0.5 text-xs text-red-400/80">
                    This target is in the safehouse and cannot be attacked.
                  </p>
                </div>
              </div>
            )}

            {/* Detective requirement alert */}
            {!targetInSafehouse && detectiveState === "checking" && (
              <DetectiveAlert
                icon={<Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-400" />}
                title="Checking detective records"
                message="Verifying whether this target has been located."
              />
            )}
            {!targetInSafehouse && detectiveState === "not_found" && (
              <DetectiveAlert
                icon={<Search className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                title="Target not located"
                message={getEligibilityMessage("not_found", null)}
              />
            )}
            {!targetInSafehouse && detectiveState === "not_revealed" && (
              <DetectiveAlert
                icon={<Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                title="Location not revealed"
                message={getEligibilityMessage("not_revealed", null)}
              />
            )}
            {!targetInSafehouse && detectiveState === "wrong_city" && (
              <DetectiveAlert
                icon={<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                title="Wrong city"
                message={getEligibilityMessage("wrong_city", eligibility.targetCityName)}
              />
            )}
            {!targetInSafehouse && detectiveState === "expired" && (
              <DetectiveAlert
                icon={<Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                title="Location expired"
                message={getEligibilityMessage("expired", null)}
              />
            )}
          </div>
        )}

        {/* Confirm */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className={cn(
              "flex min-w-[200px] items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-200",
              !confirmDisabled
                ? "bg-red-500 text-white hover:bg-red-500/90 active:scale-[0.98]"
                : "cursor-not-allowed bg-secondary text-muted-foreground",
            )}
          >
            {confirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                Confirm attack
              </>
            )}
          </button>
        </div>
      </div>

      {/* Signature hint (non-blocking) */}
      {isConnected && !authData && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {signError
              ? "A wallet signature is required to verify your identity."
              : isSigning
                ? "Awaiting wallet signature..."
                : "Sign the message to load your bullets and city."}
          </p>
          <button
            type="button"
            onClick={requestSignature}
            disabled={isSigning}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isSigning ? "Signing..." : "Sign Message"}
          </button>
        </div>
      )}
    </div>
  );
}

function DetectiveAlert({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3.5">
      {icon}
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {title}
        </p>
        <p className="mt-0.5 text-xs text-amber-400/80">{message}</p>
      </div>
    </div>
  );
}
