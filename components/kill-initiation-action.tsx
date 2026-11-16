"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits, getAddress, isAddress, parseEther, zeroAddress, type Abi } from "viem";
import { AlertTriangle, Clock3, Crosshair, RefreshCw, Search, ShieldAlert, User, Zap } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { BULLET_ABI, DETECTIVE_AGENCY_ABI, RANK_ABI, RANK_STAKE_ABI } from "@/lib/contract";
import { getEquippedWeaponInCity, type EquippedWeaponInfo } from "@/lib/equipmentContract";
import { formatWalletAddress } from "@/lib/format";
import {
  KILL_INITIATOR_ABI, decodeAttackFinishedReceipt, decodeAttackInitiationReceipt,
  getAttackResultMessage, getKnownProfiles, getPlayerCity, getUserDetectiveHires,
  computeKillEligibility, getEligibilityMessage,
  type DetectiveHireRecord, type KnownProfile, type PlayerCity,
} from "@/lib/killContract";

type Pending = { hasPending: boolean; attackId: bigint; revealBlock: bigint };
type Timers = { attackAvailableAt: bigint; hospitalEndsAt: bigint };
type Limits = { maxRankDifference: number; maxBulletAmount: bigint };

function parsePending(raw: unknown): Pending {
  const tuple = raw as readonly [boolean, bigint, bigint];
  return { hasPending: Boolean(tuple[0]), attackId: BigInt(tuple[1]), revealBlock: BigInt(tuple[2]) };
}
function parseTimers(raw: unknown): Timers {
  const tuple = raw as readonly [bigint, bigint];
  return { attackAvailableAt: BigInt(tuple[0]), hospitalEndsAt: BigInt(tuple[1]) };
}
function displayTime(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC";
}
function bulletWei(input: string): bigint | null {
  if (!/^[1-9]\d*$/.test(input)) return null;
  try { return parseEther(input); } catch { return null; }
}
function Alert({ children, href, title }: { children: React.ReactNode; href?: string; title: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-amber-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="text-xs leading-relaxed">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-amber-200/80">{children}</p>
        {href && <Link href={href} className="mt-1 inline-block font-semibold underline">Open page</Link>}
      </div>
    </div>
  );
}

export function KillInitiationAction() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { activeChain, chainConfig } = useChain();
  const addresses = useChainAddresses();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const write = useChainWriteContract();
  const { authData, isSigning, signError, requestSignature } = useAuth();
  const profileScriptReady = useMafiaUtilsScript("MafiaProfile") === "ready";
  const inventoryScriptReady = useMafiaUtilsScript("MafiaInventory") === "ready";
  const initiatorReady = addresses.killInitiator !== zeroAddress;

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const [pending, setPending] = useState<Pending | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [timers, setTimers] = useState<Timers | null>(null);
  const [timerError, setTimerError] = useState<string | null>(null);
  const [chainTime, setChainTime] = useState<{ timestamp: number; fetchedAt: number } | null>(null);
  const [currentBlock, setCurrentBlock] = useState<bigint | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [limitsError, setLimitsError] = useState<string | null>(null);
  const [rankActive, setRankActive] = useState<boolean | null>(null);
  const [rankError, setRankError] = useState<string | null>(null);
  const [attackerRank, setAttackerRank] = useState<number | null>(null);
  const [victimRank, setVictimRank] = useState<number | null>(null);
  const [bulletRaw, setBulletRaw] = useState<bigint | null>(null);
  const [bulletDecimals, setBulletDecimals] = useState<number | null>(null);
  const [playerCity, setPlayerCity] = useState<PlayerCity | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [equippedWeapon, setEquippedWeapon] = useState<EquippedWeaponInfo | null>(null);
  const [weaponChecking, setWeaponChecking] = useState(false);
  const [weaponError, setWeaponError] = useState<string | null>(null);
  const [knownProfiles, setKnownProfiles] = useState<KnownProfile[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [hires, setHires] = useState<DetectiveHireRecord[]>([]);
  const [victimInput, setVictimInput] = useState("");
  const [bullets, setBullets] = useState("");
  const [message, setMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [leadUntil, setLeadUntil] = useState<bigint | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const victimField = useRef<HTMLDivElement>(null);
  const readScope = `${activeChain}:${address?.toLowerCase() ?? ""}`;
  const readScopeRef = useRef(readScope);
  readScopeRef.current = readScope;
  const pendingRequest = useRef(0);
  const timerRequest = useRef(0);
  const blockRequest = useRef(0);

  const refreshPending = useCallback(async (): Promise<Pending> => {
    if (!publicClient || !address || !initiatorReady) throw new Error("Kill initiator unavailable");
    const request = ++pendingRequest.current;
    try {
      const raw = await publicClient.readContract({ address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi, functionName: "getPendingAttack", args: [address] });
      const next = parsePending(raw);
      if (readScopeRef.current === readScope && request === pendingRequest.current) {
        setPending(next);
        setPendingError(null);
      }
      return next;
    } catch (error) {
      if (readScopeRef.current === readScope && request === pendingRequest.current) {
        setPendingError(error instanceof Error ? error.message : "Pending attack unavailable");
      }
      throw error;
    }
  }, [publicClient, address, initiatorReady, addresses.killInitiator, readScope]);

  useEffect(() => {
    if (!isConnected || !address || !initiatorReady) { setPending(null); setPendingError(null); return; }
    setPending(null);
    const run = () => { void refreshPending().catch(() => undefined); };
    run();
    const timer = window.setInterval(run, 12000);
    return () => window.clearInterval(timer);
  }, [isConnected, address, initiatorReady, refreshPending]);

  const refreshTimers = useCallback(async (): Promise<Timers> => {
    if (!publicClient || !address || !initiatorReady) throw new Error("Kill timer unavailable");
    const request = ++timerRequest.current;
    try {
      const [raw, block] = await Promise.all([
        publicClient.readContract({ address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi, functionName: "getAttackTimers", args: [address] }),
        publicClient.getBlock({ blockTag: "latest" }),
      ]);
      const next = parseTimers(raw);
      if (readScopeRef.current === readScope && request === timerRequest.current) {
        setTimers(next);
        setChainTime({ timestamp: Number(block.timestamp), fetchedAt: Date.now() });
        setTimerError(null);
      }
      return next;
    } catch (error) {
      if (readScopeRef.current === readScope && request === timerRequest.current) {
        setTimerError(error instanceof Error ? error.message : "Timer unavailable");
      }
      throw error;
    }
  }, [publicClient, address, initiatorReady, addresses.killInitiator, readScope]);

  useEffect(() => {
    if (!isConnected || !address || !initiatorReady) { setTimers(null); setChainTime(null); setTimerError(null); return; }
    setTimers(null);
    setChainTime(null);
    const run = () => { void refreshTimers().catch(() => undefined); };
    run();
    const timer = window.setInterval(run, 30000);
    return () => window.clearInterval(timer);
  }, [isConnected, address, initiatorReady, refreshTimers]);

  const refreshBlock = useCallback(async () => {
    if (!publicClient) throw new Error("Block status unavailable");
    const request = ++blockRequest.current;
    try {
      const number = await publicClient.getBlockNumber();
      if (readScopeRef.current === readScope && request === blockRequest.current) {
        setCurrentBlock(number);
        setBlockError(null);
      }
      return number;
    } catch (error) {
      if (readScopeRef.current === readScope && request === blockRequest.current) {
        setCurrentBlock(null);
        setBlockError(error instanceof Error ? error.message : "Block status unavailable");
      }
      throw error;
    }
  }, [publicClient, readScope]);
  useEffect(() => {
    if (!pending?.hasPending) { setCurrentBlock(null); setBlockError(null); return; }
    const run = () => { void refreshBlock().catch(() => undefined); };
    run();
    const timer = window.setInterval(run, 3000);
    return () => window.clearInterval(timer);
  }, [pending?.hasPending, refreshBlock]);

  useEffect(() => {
    if (!publicClient || !initiatorReady) { setLimits(null); setLimitsError(null); return; }
    let cancelled = false;
    Promise.all([
      publicClient.readContract({ address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi, functionName: "maxRankDifference" }),
      publicClient.readContract({ address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi, functionName: "maxBulletAmount" }),
    ]).then(([gap, max]) => { if (!cancelled) { setLimits({ maxRankDifference: Number(gap), maxBulletAmount: BigInt(max as bigint) }); setLimitsError(null); } })
      .catch((error) => { if (!cancelled) setLimitsError(error instanceof Error ? error.message : "Attack limits unavailable"); });
    return () => { cancelled = true; };
  }, [publicClient, initiatorReady, addresses.killInitiator]);

  useEffect(() => {
    if (!publicClient || !address) { setRankActive(null); setAttackerRank(null); return; }
    let cancelled = false;
    Promise.all([
      publicClient.readContract({ address: addresses.rankStake, abi: RANK_STAKE_ABI, functionName: "isUserRankActive", args: [address] }),
      publicClient.readContract({ address: addresses.rankXp, abi: RANK_ABI, functionName: "getRankLevel", args: [address] }),
    ]).then(([active, rank]) => { if (!cancelled) { setRankActive(active === true); setAttackerRank(Number(rank)); setRankError(null); } })
      .catch((error) => { if (!cancelled) { setRankActive(null); setAttackerRank(null); setRankError(error instanceof Error ? error.message : "Rank unavailable"); } });
    return () => { cancelled = true; };
  }, [publicClient, address, addresses.rankStake, addresses.rankXp]);

  useEffect(() => {
    if (!publicClient || !address || !authData) { setBulletRaw(null); setBulletDecimals(null); setPlayerCity(null); setHires([]); return; }
    let cancelled = false;
    Promise.all([
      publicClient.readContract({ address: addresses.bullets, abi: BULLET_ABI, functionName: "balanceOf", args: [address, authData.message, authData.signature] }),
      publicClient.readContract({ address: addresses.bullets, abi: BULLET_ABI, functionName: "decimals" }),
      getPlayerCity({ publicClient, userProfileAddress: addresses.userProfile, wallet: address, message: authData.message, signature: authData.signature }),
      getUserDetectiveHires({ publicClient, detectiveAgencyAddress: addresses.detectiveAgency, wallet: address, message: authData.message, signature: authData.signature }).catch(() => []),
    ]).then(([balance, decimals, city, userHires]) => { if (!cancelled) { setBulletRaw(BigInt(balance as bigint)); setBulletDecimals(Number(decimals)); setPlayerCity(city); setHires(userHires); setPlayerError(null); } })
      .catch((error) => { if (!cancelled) setPlayerError(error instanceof Error ? error.message : "Player data unavailable"); });
    return () => { cancelled = true; };
  }, [publicClient, address, authData, addresses.bullets, addresses.userProfile, addresses.detectiveAgency]);

  useEffect(() => {
    if (!profileScriptReady) { setKnownProfiles([]); return; }
    let cancelled = false;
    getKnownProfiles({ chain: activeChain }).then((profiles) => { if (!cancelled) { setKnownProfiles(profiles); setProfileError(null); } })
      .catch((error) => { if (!cancelled) setProfileError(error instanceof Error ? error.message : "Player picker unavailable"); });
    return () => { cancelled = true; };
  }, [profileScriptReady, activeChain]);

  useEffect(() => {
    if (!publicClient || !address || !authData || playerCity === null || !inventoryScriptReady) { setEquippedWeapon(null); setWeaponChecking(false); return; }
    let cancelled = false;
    setWeaponChecking(true);
    getEquippedWeaponInCity({ publicClient, equipmentAddress: addresses.equipment, inventoryAddress: addresses.inventory, chain: activeChain, account: address, cityId: playerCity.cityId, signMsg: authData.message, signature: authData.signature, throwOnError: true })
      .then((weapon) => { if (!cancelled) { setEquippedWeapon(weapon); setWeaponError(null); } })
      .catch((error) => { if (!cancelled) { setEquippedWeapon(null); setWeaponError(error instanceof Error ? error.message : "Weapon unavailable"); } })
      .finally(() => { if (!cancelled) setWeaponChecking(false); });
    return () => { cancelled = true; };
  }, [publicClient, address, authData, playerCity, inventoryScriptReady, addresses.equipment, addresses.inventory, activeChain]);

  const target = useMemo((): KnownProfile | null => {
    const input = victimInput.trim();
    if (!input) return null;
    if (isAddress(input)) {
      const addr = getAddress(input);
      return knownProfiles.find((p) => p.address.toLowerCase() === addr.toLowerCase()) ?? { address: addr, name: "" };
    }
    return knownProfiles.find((p) => p.name.toLowerCase() === input.toLowerCase()) ?? null;
  }, [victimInput, knownProfiles]);
  const targetAddress = target?.address ?? null;
  const isSelf = Boolean(address && targetAddress && address.toLowerCase() === targetAddress.toLowerCase());
  const suggestions = useMemo(() => {
    const input = victimInput.trim().toLowerCase();
    if (!input || isAddress(input)) return [];
    return knownProfiles.filter((p) => p.name.toLowerCase().startsWith(input)).slice(0, 10);
  }, [victimInput, knownProfiles]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (victimField.current && !victimField.current.contains(event.target as Node)) setShowSuggestions(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!publicClient || !targetAddress) { setVictimRank(null); return; }
    let cancelled = false;
    setVictimRank(null);
    publicClient.readContract({ address: addresses.rankXp, abi: RANK_ABI, functionName: "getRankLevel", args: [targetAddress] })
      .then((rank) => { if (!cancelled) setVictimRank(Number(rank)); })
      .catch((error) => { if (!cancelled) { setVictimRank(null); console.error("Target rank read failed", error); } });
    return () => { cancelled = true; };
  }, [publicClient, targetAddress, addresses.rankXp]);

  useEffect(() => {
    if (!publicClient || !address || !targetAddress || !playerCity) { setLeadUntil(null); setLeadError(null); return; }
    let cancelled = false;
    setLeadUntil(null);
    const run = () => publicClient.readContract({ address: addresses.detectiveAgency, abi: DETECTIVE_AGENCY_ABI, functionName: "canKillUntil", args: [address, targetAddress, playerCity.cityId] })
      .then((until) => { if (!cancelled) { setLeadUntil(BigInt(until as bigint)); setLeadError(null); } })
      .catch((error) => { if (!cancelled) { setLeadUntil(null); setLeadError(error instanceof Error ? error.message : "Detective lead unavailable"); } });
    run();
    const timer = window.setInterval(run, 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [publicClient, address, targetAddress, playerCity, addresses.detectiveAgency]);

  const chainNow = chainTime === null ? null : chainTime.timestamp + Math.max(0, now - Math.floor(chainTime.fetchedAt / 1000));
  const spendWei = bulletWei(bullets);
  const messageBytes = new TextEncoder().encode(message.trim()).length;
  const gapValid = attackerRank !== null && victimRank !== null && limits !== null && Math.abs(attackerRank - victimRank) <= limits.maxRankDifference;
  const leadValid = leadUntil !== null && leadUntil > BigInt(chainNow ?? now);
  const cooldownActive = timers !== null && chainNow !== null && BigInt(chainNow) < timers.attackAvailableAt;
  const bulletsValid = spendWei !== null && bulletRaw !== null && limits !== null && spendWei <= bulletRaw && spendWei <= limits.maxBulletAmount;
  const canConfirm = Boolean(isConnected && address && authData && initiatorReady && pending?.hasPending === false && !pendingError && timers && !timerError && chainNow !== null && !cooldownActive && rankActive === true && !rankError && !playerError && !weaponError && (weaponChecking || equippedWeapon !== null) && targetAddress && !isSelf && leadValid && attackerRank !== null && victimRank !== null && victimRank <= 13 && gapValid && bulletsValid && messageBytes <= 280 && !submitting);

  const hireEligibility = useMemo(() => computeKillEligibility({
    hires: hires.map((hire) => ({ ...hire, targetName: knownProfiles.find((p) => p.address.toLowerCase() === hire.target.toLowerCase())?.name })),
    targetAddress, targetName: target?.name ?? null, playerCityId: playerCity?.cityId ?? null, now,
  }), [hires, knownProfiles, targetAddress, target?.name, playerCity?.cityId, now]);
  const confirmLabel = submitting ? "Confirming..." : !initiatorReady ? "Coming soon" : timerError ? "Timer unavailable" : !timers || chainNow === null ? "Checking timer..." : cooldownActive ? "Cooldown active" : "Confirm attack";

  const handleConfirm = async () => {
    if (!publicClient || !address || !authData || !targetAddress || !canConfirm || !spendWei || !playerCity) return;
    setSubmitting(true);
    try {
      // Re-read pending and timer state on the selected chain immediately before spending bullets.
      const [freshPending, freshTimersRaw, block, freshLead] = await Promise.all([
        publicClient.readContract({ address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi, functionName: "getPendingAttack", args: [address] }),
        publicClient.readContract({ address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi, functionName: "getAttackTimers", args: [address] }),
        publicClient.getBlock({ blockTag: "latest" }),
        publicClient.readContract({ address: addresses.detectiveAgency, abi: DETECTIVE_AGENCY_ABI, functionName: "canKillUntil", args: [address, targetAddress, playerCity.cityId] }),
      ]);
      if (readScopeRef.current !== readScope) throw new Error("Wallet or network changed. Check the attack form again.");
      const nextPending = parsePending(freshPending);
      const nextTimers = parseTimers(freshTimersRaw);
      setPending(nextPending);
      setTimers(nextTimers);
      setChainTime({ timestamp: Number(block.timestamp), fetchedAt: Date.now() });
      if (nextPending.hasPending) { toast.error("Finish your pending attack first."); return; }
      if (block.timestamp < nextTimers.attackAvailableAt) { toast.error("Your attack cooldown is active."); return; }
      if (BigInt(freshLead as bigint) <= block.timestamp) { toast.error("Your detective lead has expired."); return; }
      if (messageBytes > 280) { toast.error("Message exceeds 280 UTF-8 bytes."); return; }
      const hash = await write.writeContractAsync({
        address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi,
        functionName: "initiateAttack", args: [targetAddress, spendWei, message.trim()],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Attack transaction reverted");
      const outcome = decodeAttackInitiationReceipt(receipt, addresses.killInitiator);
      if (readScopeRef.current !== readScope) return;
      if (outcome.result !== 0) { toast.error(getAttackResultMessage(outcome.result)); return; }
      if (outcome.attackId === null || outcome.revealBlock === null) throw new Error("AttackRequested event missing");
      setPending({ hasPending: true, attackId: outcome.attackId, revealBlock: outcome.revealBlock });
      setVictimInput(""); setBullets(""); setMessage(""); setLeadUntil(null);
      setBulletRaw((balance) => balance === null ? null : balance - spendWei);
      toast.success("Attack committed. Bullets were spent in this transaction.");
    } catch (error) {
      console.error("Attack initiation failed", error);
      toast.error(error instanceof Error ? error.message : "Could not initiate attack");
    } finally { setSubmitting(false); }
  };

  const lastEligibleBlock = pending ? pending.revealBlock + 256n : null;
  const expired = Boolean(pending?.hasPending && currentBlock !== null && lastEligibleBlock !== null && currentBlock > lastEligibleBlock);
  const canFinish = Boolean(pending?.hasPending && currentBlock !== null && currentBlock > pending.revealBlock);
  const pendingTitle = blockError ? "Block status unavailable" : currentBlock === null ? "Checking the latest block" : expired ? "256-block window missed" : canFinish ? "Finish your attack" : "Waiting for the reveal block";

  const handleFinish = async () => {
    if (!publicClient || !address || !pending?.hasPending || !canFinish || finishing) return;
    setFinishing(true);
    try {
      const id = pending.attackId;
      const fresh = parsePending(await publicClient.readContract({
        address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi,
        functionName: "getPendingAttack", args: [address],
      }));
      if (readScopeRef.current !== readScope) throw new Error("Wallet or network changed. Check the pending attack again.");
      if (!fresh.hasPending || fresh.attackId !== id) {
        setPending(fresh);
        toast.error("The pending attack changed. Review it before finishing.");
        return;
      }
      let gas: bigint;
      try {
        const estimate = await publicClient.estimateContractGas({ account: address, address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi, functionName: "finishAttack", args: [id] });
        gas = estimate * 120n / 100n;
      } catch {
        gas = activeChain === "bnb" ? 16_777_216n : 30_000_000n;
      }
      if (readScopeRef.current !== readScope) throw new Error("Wallet or network changed. Check the pending attack again.");
      const hash = await write.writeContractAsync({ address: addresses.killInitiator, abi: KILL_INITIATOR_ABI as Abi, functionName: "finishAttack", args: [id], gas });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Finish transaction reverted");
      const finished = decodeAttackFinishedReceipt(receipt, addresses.killInitiator);
      if (finished.attackId !== id) throw new Error("Finish event attack id mismatch");
      if (readScopeRef.current !== readScope) return;
      window.sessionStorage.setItem(`kill-finish-tx:${activeChain}:${id}`, hash);
      router.push(`/kill-result/attack/${id}`);
    } catch (error) {
      console.error("Finish attack failed", error);
      toast.error(error instanceof Error ? error.message : "Could not finish attack");
      refreshPending().catch(() => undefined);
    } finally { setFinishing(false); }
  };

  const checklist = [
    ["Target", targetAddress && !isSelf ? "Ready" : "Choose a player", Boolean(targetAddress && !isSelf)],
    ["Bullets", bulletsValid ? "Ready" : "Enter a whole amount within your balance", bulletsValid],
    ["Active rank", rankActive === true ? "Ready" : rankActive === false ? "Inactive" : "Checking", rankActive === true],
    ["Weapon", weaponChecking ? "Checking" : equippedWeapon ? equippedWeapon.name : "None equipped", weaponChecking || equippedWeapon !== null],
    ["Detective lead", leadValid ? "Ready" : leadError ? "Unavailable" : leadUntil === 0n ? "No lock" : "Checking or expired", leadValid],
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Combat / attack</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Kill initiation</h1></div>
        {!initiatorReady && <div className="mb-4"><Alert title="Kill contract not deployed">Kill initiation is unavailable on {chainConfig.label}.</Alert></div>}
        {isConnected && pendingError && <div className="mb-4"><Alert title="Pending attack unavailable">{pendingError}</Alert></div>}
        {isConnected && timerError && <div className="mb-4"><Alert title="Timer unavailable">{timerError}</Alert></div>}
        {limitsError && <div className="mb-4"><Alert title="Attack limits unavailable">{limitsError}</Alert></div>}
        {rankError && <div className="mb-4"><Alert title="Rank unavailable">{rankError}</Alert></div>}
        {playerError && <div className="mb-4"><Alert title="Player data unavailable">{playerError}</Alert></div>}
        {weaponError && <div className="mb-4"><Alert title="Weapon status unavailable">{weaponError}</Alert></div>}
        {profileError && <div className="mb-4"><Alert title="Player picker unavailable">{profileError}</Alert></div>}
        {isConnected && pending?.hasPending ? (
          <div className="rounded-xl border border-red-500/25 bg-card p-6">
            <div className="flex items-center gap-2 text-red-400"><Clock3 className="h-5 w-5" /><h2 className="text-xl font-bold">{pendingTitle}</h2></div>
            <p className="mt-2 text-sm text-muted-foreground">{expired ? "The reveal window was missed. Finishing clears the attack and does not refund bullets." : "Finish your connected wallet's attack after its reveal block."}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[["Attack id", pending.attackId.toString()], ["Reveal block", pending.revealBlock.toString()], ["Current block", currentBlock?.toString() ?? "—"], ["Last eligible", lastEligibleBlock?.toString() ?? "—"]].map(([label, value]) => <div key={label} className="rounded-lg bg-background/70 p-3"><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="mt-1 break-all font-mono font-semibold text-foreground">{value}</dd></div>)}
            </dl>
            {blockError && <p className="mt-3 text-xs text-red-400">{blockError}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" disabled={!canFinish || finishing} onClick={handleFinish} className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{finishing ? "Finishing..." : expired ? "Clear attack" : "Finish attack"}</button>
              <button type="button" onClick={() => { refreshPending().catch(() => undefined); refreshBlock().catch(() => undefined); }} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground"><RefreshCw className="h-4 w-4" /> Refresh</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            {timers && chainNow !== null && BigInt(chainNow) < timers.hospitalEndsAt && <Alert title="You are in hospital">Hospital ends {displayTime(timers.hospitalEndsAt)}.</Alert>}
            {cooldownActive && timers && <Alert title="Attack cooldown active">Next attack available {displayTime(timers.attackAvailableAt)}.</Alert>}
            {rankActive === false && <Alert title="Rank inactive" href="/rank-activation">Activate your rank before attacking.</Alert>}
            {!weaponChecking && playerCity && !equippedWeapon && <Alert title="No weapon equipped" href="/equipment">Equip a weapon in {playerCity.cityName}.</Alert>}
            {victimRank !== null && victimRank > 13 && <Alert title="Target rank too high">Victims must be Lieutenant rank or below.</Alert>}
            {attackerRank !== null && victimRank !== null && limits && !gapValid && <Alert title="Rank gap too wide">The maximum rank difference is {limits.maxRankDifference}.</Alert>}
            {targetAddress && !leadValid && <Alert title="Detective lead required" href="/biz-detective-agency">{leadUntil === 0n ? getEligibilityMessage(hireEligibility.reason === "eligible" ? "not_found" : hireEligibility.reason, hireEligibility.targetCityName) : leadError ?? "Find, reveal, and reach the target's city before the lock expires."}</Alert>}
            <div ref={victimField} className="relative">
              <label htmlFor="kill-victim" className="mb-1.5 block text-xs font-medium text-muted-foreground">Victim</label>
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input id="kill-victim" value={victimInput} onChange={(event) => { setVictimInput(event.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} placeholder="Player name or 0x address" autoComplete="off" disabled={submitting} className="w-full rounded-lg border border-border bg-background/60 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" /></div>
              {showSuggestions && suggestions.length > 0 && <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-xl">{suggestions.map((profile) => <button key={profile.address} type="button" onClick={() => { setVictimInput(profile.name); setShowSuggestions(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-secondary"><User className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 truncate text-sm text-foreground">{profile.name}</span><span className="font-mono text-[10px] text-muted-foreground">{formatWalletAddress(profile.address)}</span></button>)}</div>}
              {victimInput && <p className="mt-1 text-xs text-muted-foreground">{isSelf ? "You cannot target yourself." : targetAddress ? `Target: ${formatWalletAddress(targetAddress)}` : "Select a player or enter a valid address."}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="kill-bullets" className="mb-1.5 block text-xs font-medium text-muted-foreground">Whole bullets to spend</label><input id="kill-bullets" type="text" inputMode="numeric" value={bullets} onChange={(event) => setBullets(event.target.value)} placeholder="1" disabled={submitting} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary" /></div>
              <div><label htmlFor="kill-message" className="mb-1.5 block text-xs font-medium text-muted-foreground">Message (optional)</label><input id="kill-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Leave a message" disabled={submitting} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" /><p className={`mt-1 text-xs ${messageBytes > 280 ? "text-red-400" : "text-muted-foreground"}`}>{messageBytes}/280 UTF-8 bytes</p></div>
            </div>
            <button type="button" onClick={handleConfirm} disabled={!canConfirm} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"><Crosshair className="h-4 w-4" />{confirmLabel}</button>
            {!isConnected && <p className="text-center text-xs text-muted-foreground">Connect your wallet to prepare an attack.</p>}
            {isConnected && !authData && <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><span className="text-xs text-muted-foreground">{signError ? "A wallet signature is required." : isSigning ? "Awaiting signature..." : "Sign to read bullets and equipment."}</span><button type="button" onClick={requestSignature} disabled={isSigning} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">{isSigning ? "Signing..." : "Sign message"}</button></div>}
          </div>
        )}
      </div>
      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Zap className="h-4 w-4 text-amber-400" /> Bullets available</div><p className="mt-3 font-mono text-2xl font-bold tabular-nums text-foreground">{bulletRaw !== null && bulletDecimals !== null ? Number(formatUnits(bulletRaw, bulletDecimals)).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</p>{limits && <p className="mt-1 text-xs text-muted-foreground">Maximum attack: {Number(formatUnits(limits.maxBulletAmount, 18)).toLocaleString()} bullets</p>}</div>
        <div className="rounded-xl border border-border bg-card p-5"><h2 className="text-sm font-semibold text-foreground">Attack checklist</h2><ul className="mt-3 space-y-3">{checklist.map(([name, detail, ready]) => <li key={name} className="flex items-start justify-between gap-2 text-xs"><span className="text-muted-foreground">{name}</span><span className={ready ? "text-green-400 text-right" : "text-amber-400 text-right"}>{detail}</span></li>)}</ul></div>
        <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground"><div className="flex items-center gap-2 font-semibold text-foreground"><ShieldAlert className="h-4 w-4 text-red-400" /> On-chain result</div><p className="mt-2 leading-relaxed">The contract rolls the attack when you finish after the reveal block. A confirmed attack spends bullets when it is initiated.</p><div className="mt-3 flex flex-wrap gap-2"><Link href="/biz-detective-agency" className="text-primary hover:underline">Detectives</Link><Link href="/equipment" className="text-primary hover:underline">Equipment</Link><Link href="/rank-activation" className="text-primary hover:underline">Rank</Link></div></div>
      </aside>
    </div>
  );
}
