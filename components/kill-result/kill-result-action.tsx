"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowUpRight, Crosshair, Heart, Loader2, RotateCcw,
  Skull, Swords, UserRound, Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChain } from "@/components/chain-provider";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import { City } from "@/lib/constants/const/cities";
import { formatWalletAddress } from "@/lib/format";
import { getAttack, type KillAttackEntry } from "@/lib/killHistoryService";
import { drainKill, getKillLootPreview, getKillRegistryRecord } from "@/lib/killContract";
import {
  BACKFIRE_POLICY_NAMES, formatExactUnits, formatUtc, hasStatsSnapshot,
  healthPercent, killTargets, parseAttackId, remainingHealth,
  resultOutcome, resultSubtitle, type ResultOutcome,
} from "./kill-result-logic";
import { KillResultAssets, type KillAssetView } from "./kill-result-assets";
import styles from "./kill-result.module.css";
import "@/types/mafia-globals";

type CombatProfile = { name?: string; portrait?: string };
type CombatProfiles = Record<"attacker" | "victim", CombatProfile>;
type ResultPhase = "record" | "pending" | "labels" | "assets" | "preparing" | "ready" | "error";
type SceneBeat = "matchup" | "first-shot" | "first-impact" | "return-shot" | "return-impact" | "verdict";

const outcomeLabels: Record<ResultOutcome, string> = {
  double: "DOUBLE KILL",
  insta_fail_backfire: "FIRST STRIKE FAILED",
  insta_fail: "INSTANT FAIL",
  insta_death: "INSTANT DEATH",
  success: "TARGET DOWN",
  backfire: "BACKFIRE KILL",
  survive: "TARGET SURVIVED",
};

const phaseLabels: Record<ResultPhase, string> = {
  record: "Reading attack record",
  pending: "Waiting for the attack to resolve",
  labels: "Identifying fighters",
  assets: "Reading asset disposition",
  preparing: "Preparing combat report",
  ready: "Attack record ready",
  error: "Attack record unavailable",
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message.split("\n")[0] : "The chain read failed.";
}

function safePortrait(profile: Record<string, unknown>): string | undefined {
  const value = profile.portrait ?? profile.avatarUrl ?? profile.avatar ?? profile.image;
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  return url.startsWith("/") || /^https:\/\//i.test(url) ? url : undefined;
}

function shortName(profile: CombatProfile, address: string): string {
  return profile.name?.trim() || formatWalletAddress(address);
}

function nameInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

function Fighter({
  role, address, profile, killed, healthBefore, healthAfter, healthVisible, shot, impact,
}: {
  role: "attacker" | "victim";
  address: string;
  profile: CombatProfile;
  killed: boolean;
  healthBefore?: bigint;
  healthAfter?: bigint;
  healthVisible: boolean;
  shot?: boolean;
  impact?: boolean;
}) {
  const label = shortName(profile, address);
  const percent = healthBefore !== undefined && healthAfter !== undefined
    ? healthPercent(healthBefore, healthVisible ? healthAfter : healthBefore)
    : null;
  const displayedHealth = healthVisible ? healthAfter : healthBefore;
  return (
    <div className={`relative min-w-0 flex-1 text-center ${killed && healthVisible ? styles.fighterDown : ""} ${shot ? styles.shot : ""} ${impact ? styles.impact : ""}`}>
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[.28em] text-white/45">{role}</p>
      <Avatar className={`mx-auto h-28 w-28 border-2 border-white/15 bg-zinc-800 sm:h-36 sm:w-36 ${styles.portrait}`}>
        {profile.portrait && <AvatarImage src={profile.portrait} alt="" className="object-cover" />}
        <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-950 text-2xl font-semibold text-white/70">
          {profile.name ? nameInitials(profile.name) : <UserRound className="h-10 w-10 text-white/40" />}
        </AvatarFallback>
      </Avatar>
      <Link href={`/players?q=${encodeURIComponent(address)}`} className="mt-4 block truncate text-base font-semibold text-white hover:text-amber-200 sm:text-xl">
        {label}
      </Link>
      <p className="mt-1 truncate font-mono text-[10px] text-white/40">{formatWalletAddress(address)}</p>
      <div className="mx-auto mt-4 max-w-48 text-left">
        <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-white/45">
          <span>Health</span><span>{displayedHealth === undefined ? "Unavailable" : formatExactUnits(displayedHealth)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className={`${styles.healthFill} h-full rounded-full ${healthVisible && killed ? "bg-red-500" : "bg-emerald-400"}`} style={{ width: `${percent ?? 0}%` }} />
        </div>
        <p className={`mt-2 text-center text-xs font-bold uppercase tracking-[.16em] ${healthVisible && killed ? "text-red-400" : "text-emerald-300"}`}>
          {healthVisible ? killed ? "Down" : "Alive" : "At attack time"}
        </p>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
      <dt className="text-sm text-white/45">{label}</dt>
      <dd className="max-w-[65%] break-words text-right text-sm font-medium text-white/85">{children}</dd>
    </div>
  );
}

function ReturnLink() {
  return <Link href="/kill-initiation" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/5 hover:text-white"><ArrowLeft className="h-4 w-4" /> Return to kill initiation</Link>;
}

function StatusCard({
  entry, profiles, viewer, transactionHash, explorer,
}: {
  entry: KillAttackEntry;
  profiles: CombatProfiles;
  viewer?: string;
  transactionHash?: string;
  explorer: string;
}) {
  const { attack: record, id } = entry;
  const title = record.status === 2 ? "Attack voided" : record.status === 3 ? "Reveal window expired" : "Attack pending";
  const description = record.status === 2
    ? "Attack voided. Bullets not returned."
    : record.status === 3
      ? "256-block reveal window missed. Bullets not returned."
      : "Attack pending";
  const viewerRole = viewer?.toLowerCase() === record.attacker.toLowerCase() ? "Attacker"
    : viewer?.toLowerCase() === record.victim.toLowerCase() ? "Victim" : "Observer";
  return (
    <main className={`min-h-screen px-4 py-8 text-white sm:px-8 ${styles.stage}`}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 flex items-center justify-between gap-4">
          <ReturnLink />
          <span className="font-mono text-xs tracking-wider text-white/50">ATTACK #{id.toString()}</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-6 shadow-2xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[.27em] text-red-300">{City[record.cityId] ?? `City #${record.cityId}`} · On-chain combat</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-base text-white/60">{description}</p>
          {record.status === 0 && <div className="mt-5 flex items-center gap-2 text-sm text-amber-200"><Loader2 className="h-4 w-4 animate-spin" /> Checking the attack every 3 seconds</div>}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {(["attacker", "victim"] as const).map((role) => {
              const fighterAddress = record[role];
              const killed = role === "attacker" ? record.attackerKilled : record.victimKilled;
              const killId = role === "attacker" ? record.attackerKillId : record.victimKillId;
              const bullets = role === "attacker" ? record.bullets : record.backfireBullets;
              const damage = role === "attacker" ? record.backfireHealthLost : record.healthLost;
              return (
                <section key={role} className="rounded-xl border border-white/10 bg-white/[.035] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[.23em] text-white/45">{role}</p>
                  <Link href={`/players?q=${encodeURIComponent(fighterAddress)}`} className="mt-2 block truncate text-lg font-semibold text-white hover:text-amber-200">{shortName(profiles[role], fighterAddress)}</Link>
                  <p className="mt-1 font-mono text-xs text-white/40">{formatWalletAddress(fighterAddress)}</p>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/65"><span>{role === "attacker" ? "Bullets spent" : "Return-fire bullets"}: <strong className="text-white">{formatExactUnits(bullets)}</strong></span>{record.status === 1 && <span>Health lost: <strong className="text-white">{formatExactUnits(damage)}</strong></span>}</div>
                  {killed && <p className="mt-3 text-sm font-semibold text-red-300">Down · Kill #{killId.toString()}</p>}
                </section>
              );
            })}
          </div>

          <dl className="mt-7 grid gap-x-8 sm:grid-cols-2">
            <Detail label="City">{City[record.cityId] ?? `City #${record.cityId}`}</Detail>
            <Detail label="Requested">{formatUtc(record.requestedAt)}</Detail>
            <Detail label="Finished">{formatUtc(record.resolvedAt)}</Detail>
            <Detail label="Viewer role">{viewerRole}</Detail>
          </dl>
          {record.message.trim() && <div className="mt-6 rounded-lg border-l-2 border-red-400/60 bg-white/[.035] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Attacker message</p><p className="mt-2 whitespace-pre-wrap text-sm text-white/75">{record.message}</p></div>}
          {transactionHash && <a href={`${explorer}/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm text-amber-200 hover:text-amber-100">View finish transaction <ArrowUpRight className="h-4 w-4" /></a>}
          <div className="mt-8"><ReturnLink /></div>
        </div>
      </div>
    </main>
  );
}

function CombatReport({
  entry, profiles, viewer, transactionHash, explorer, assetViews, assetLoading,
  claiming, chainConfig, onClaim, onRefreshAssets, sceneBeat, sceneComplete,
  onSkip, onReplay, walletReady, onSwitchChain,
}: {
  entry: KillAttackEntry;
  profiles: CombatProfiles;
  viewer?: string;
  transactionHash?: string;
  explorer: string;
  assetViews: KillAssetView[];
  assetLoading: boolean;
  claiming: boolean;
  chainConfig: ReturnType<typeof useChain>["chainConfig"];
  onClaim: () => void;
  onRefreshAssets: () => void;
  sceneBeat: SceneBeat;
  sceneComplete: boolean;
  onSkip: () => void;
  onReplay: () => void;
  walletReady: boolean;
  onSwitchChain: () => void;
}) {
  const { attack: record, stats, id } = entry;
  const outcome = resultOutcome(record);
  const snapshotAvailable = hasStatsSnapshot(stats);
  const firstFired = record.outcome === 0 && record.bullets > 0n;
  const returnFired = record.backfireOutcome === 0 && record.backfireBullets > 0n;
  const firstImpact = sceneBeat === "first-impact" || sceneBeat === "return-shot" || sceneBeat === "return-impact" || sceneBeat === "verdict";
  const returnImpact = sceneBeat === "return-impact" || sceneBeat === "verdict";
  const verdict = sceneBeat === "verdict";
  const victimAfter = snapshotAvailable ? remainingHealth(stats.victimHealth, record.healthLost, record.victimKilled) : undefined;
  const attackerAfter = snapshotAvailable ? remainingHealth(stats.attackerHealth, record.backfireHealthLost, record.attackerKilled) : undefined;
  const viewerRole = viewer?.toLowerCase() === record.attacker.toLowerCase() ? "Attacker"
    : viewer?.toLowerCase() === record.victim.toLowerCase() ? "Victim" : "Observer";
  const didDie = record.victimKilled || record.attackerKilled;

  return (
    <main className={`min-h-screen pb-12 text-white ${styles.stage}`}>
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ReturnLink />
          <div className="flex items-center gap-3"><span className="font-mono text-xs tracking-widest text-white/50">ATTACK #{id.toString()}</span>{transactionHash && <a href={`${explorer}/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-200 hover:text-amber-100">Finish transaction <ArrowUpRight className="h-3.5 w-3.5" /></a>}</div>
        </div>

        <div className="mx-auto mt-8 max-w-4xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[.3em] text-red-300">{City[record.cityId] ?? `City #${record.cityId}`} · Combat / attack result</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[.07em] sm:text-5xl">{verdict ? outcomeLabels[outcome] : "THE EXCHANGE"}</h1>
          <p className="mt-3 min-h-12 text-sm text-white/65 sm:text-base">{verdict ? resultSubtitle(record) : sceneBeat === "first-shot" ? "The attacker fires." : sceneBeat === "return-shot" ? "Return fire." : sceneBeat === "first-impact" || sceneBeat === "return-impact" ? "The hit lands." : "The fighters face off."}</p>
        </div>

        <div className="relative mx-auto mt-3 max-w-4xl rounded-2xl border border-white/10 bg-black/30 p-5 shadow-2xl sm:p-8">
          <div className="flex items-center gap-4 sm:gap-12">
            <Fighter role="attacker" address={record.attacker} profile={profiles.attacker} killed={record.attackerKilled} healthBefore={snapshotAvailable ? stats.attackerHealth : undefined} healthAfter={attackerAfter} healthVisible={returnImpact || verdict} shot={sceneBeat === "first-shot"} impact={sceneBeat === "return-impact"} />
            <div className="flex shrink-0 flex-col items-center gap-2"><Swords className="h-5 w-5 text-red-400 sm:h-8 sm:w-8" /><span className="text-lg font-black tracking-widest text-red-400 sm:text-3xl">VS</span></div>
            <Fighter role="victim" address={record.victim} profile={profiles.victim} killed={record.victimKilled} healthBefore={snapshotAvailable ? stats.victimHealth : undefined} healthAfter={victimAfter} healthVisible={firstImpact || verdict} shot={sceneBeat === "return-shot"} impact={sceneBeat === "first-impact"} />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/45">
            <span>{viewerRole} view · {firstFired ? `${formatExactUnits(record.bullets)} attacker bullets` : "No first-strike shot recorded"}{returnFired ? ` · ${formatExactUnits(record.backfireBullets)} return-fire bullets` : ""}</span>
            <div className="flex gap-3"><button type="button" onClick={onReplay} className="inline-flex items-center gap-1 hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Replay</button>{!sceneComplete && <button type="button" onClick={onSkip} className="font-semibold text-amber-200 hover:text-amber-100">Skip to report</button>}</div>
          </div>
        </div>

        {sceneComplete && (
          <div className={`${styles.verdict} mx-auto mt-8 max-w-5xl space-y-6`}>
            <section className="rounded-2xl border border-white/10 bg-black/30 p-5 sm:p-7" aria-label="Resolved summary">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-[11px] font-semibold uppercase tracking-[.24em] text-red-300">Confirmed result</p><h2 className="mt-2 text-2xl font-bold text-white">{outcomeLabels[outcome]}</h2><p className="mt-2 text-sm text-white/55">{resultSubtitle(record)}</p></div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/60">{City[record.cityId] ?? `City #${record.cityId}`}</span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(["attacker", "victim"] as const).map((role) => {
                  const killed = role === "attacker" ? record.attackerKilled : record.victimKilled;
                  const before = snapshotAvailable ? role === "attacker" ? stats.attackerHealth : stats.victimHealth : undefined;
                  const after = role === "attacker" ? attackerAfter : victimAfter;
                  const loss = role === "attacker" ? record.backfireHealthLost : record.healthLost;
                  return (
                    <div key={role} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                      <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[.2em] text-white/45">{role}</p><span className={`text-xs font-bold uppercase ${killed ? "text-red-300" : "text-emerald-300"}`}>{killed ? "Down" : "Alive"}</span></div>
                      <p className="mt-2 truncate font-semibold text-white">{shortName(profiles[role], record[role])}</p>
                      <p className="mt-3 flex items-center gap-1 text-sm text-white/55"><Heart className="h-4 w-4" /> {before === undefined ? "Health unavailable" : `${formatExactUnits(before)} → ${formatExactUnits(after ?? 0n)}`}</p>
                      <p className="mt-1 text-xs text-white/40">Recorded damage: {formatExactUnits(loss)}{killed ? ` · Kill #${role === "attacker" ? record.attackerKillId : record.victimKillId}` : ""}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/30 p-5 sm:p-7" aria-label="Combat report">
              <div className="flex items-center gap-2"><Crosshair className="h-5 w-5 text-red-300" /><h2 className="text-lg font-semibold">Combat report</h2></div>
              <dl className="mt-3 grid gap-x-10 sm:grid-cols-2">
                <Detail label="Attacker offense">{snapshotAvailable ? stats.attackerOffense.toLocaleString() : "Unavailable"}</Detail>
                <Detail label="Target defense">{snapshotAvailable ? stats.victimDefense.toLocaleString() : "Unavailable"}</Detail>
                <Detail label="Target offense">{snapshotAvailable ? stats.victimOffense.toLocaleString() : "Unavailable"}</Detail>
                <Detail label="Attacker defense">{snapshotAvailable ? stats.attackerDefense.toLocaleString() : "Unavailable"}</Detail>
                <Detail label="Target damage">{formatExactUnits(record.healthLost)} HP</Detail>
                <Detail label="Attacker damage">{formatExactUnits(record.backfireHealthLost)} HP</Detail>
                <Detail label="Attacker bullets"><span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-300" /> {formatExactUnits(record.bullets)}</span></Detail>
                <Detail label="Return-fire bullets">{formatExactUnits(record.backfireBullets)}</Detail>
                <Detail label="Backfire policy">{BACKFIRE_POLICY_NAMES[record.backfirePolicy] ?? `Policy #${record.backfirePolicy}`}</Detail>
                <Detail label="Requested">{formatUtc(record.requestedAt)}</Detail>
                <Detail label="Finished">{formatUtc(record.resolvedAt)}</Detail>
                <Detail label="Viewer role">{viewerRole}</Detail>
              </dl>
              {record.message.trim() && <div className="mt-5 border-l-2 border-red-400/50 bg-white/[.03] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Attacker message</p><p className="mt-2 whitespace-pre-wrap text-sm text-white/75">{record.message}</p></div>}
            </section>

            {didDie ? (
              <KillResultAssets views={assetViews} loading={assetLoading} claiming={claiming} viewer={viewer} walletReady={walletReady} chainConfig={chainConfig} onClaim={onClaim} onSwitchChain={onSwitchChain} onRefresh={onRefreshAssets} />
            ) : (
              <section className="rounded-2xl border border-white/10 bg-black/30 p-6"><p className="text-xs font-semibold uppercase tracking-[.2em] text-white/45">Aftermath</p><h2 className="mt-2 text-xl font-semibold text-white">No assets to claim</h2><p className="mt-2 text-sm text-white/50">Both fighters survived this attack.</p></section>
            )}
            <div className="flex justify-center"><ReturnLink /></div>
          </div>
        )}
      </div>
    </main>
  );
}

function KillResultRoute({ idText }: { idText: string }) {
  const { chainConfig } = useChain();
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const { data: walletClient } = useWalletClient({ chainId: chainConfig.wagmiChainId });
  const profileScript = useMafiaUtilsScript("MafiaProfile");
  const id = useMemo(() => parseAttackId(idText), [idText]);
  const [entry, setEntry] = useState<KillAttackEntry | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordPhase, setRecordPhase] = useState<ResultPhase>("record");
  const [retry, setRetry] = useState(0);
  const [profiles, setProfiles] = useState<CombatProfiles>({ attacker: {}, victim: {} });
  const [profilesDone, setProfilesDone] = useState(false);
  const [assetViews, setAssetViews] = useState<KillAssetView[]>([]);
  const [assetsDone, setAssetsDone] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetRevision, setAssetRevision] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [slate, setSlate] = useState<"holding" | "exiting" | "done">("holding");
  const [pendingSlate, setPendingSlate] = useState<"holding" | "exiting" | "done">("holding");
  const [sceneBeat, setSceneBeat] = useState<SceneBeat>("matchup");
  const [sceneComplete, setSceneComplete] = useState(false);
  const [sceneSkipped, setSceneSkipped] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [transactionHash, setTransactionHash] = useState<string>();
  const slateStarted = useRef(Date.now());

  useEffect(() => {
    if (id === null) return;
    const key = `kill-finish-tx:${chainConfig.id}:${id.toString()}`;
    const candidate = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    if (candidate && /^0x[\da-fA-F]{64}$/.test(candidate)) {
      setTransactionHash(candidate);
    }
  }, [chainConfig.id, id]);

  useEffect(() => {
    if (id === null || !publicClient) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        setRecordError(null);
        setRecordPhase("record");
        const next = await getAttack({ publicClient, chainId: chainConfig.id, attackId: id });
        if (!active) return;
        setEntry(next);
        if (next.attack.status === 0) {
          setRecordPhase("pending");
          timer = setTimeout(load, 3_000);
        } else {
          setRecordPhase("ready");
        }
      } catch (error) {
        if (!active) return;
        setRecordError(errorText(error));
        setRecordPhase("error");
      }
    };
    void load();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [id, publicClient, chainConfig.id, retry]);

  const fighterKey = entry ? `${entry.attack.attacker.toLowerCase()}:${entry.attack.victim.toLowerCase()}` : "";
  useEffect(() => {
    if (!fighterKey) return;
    if (profileScript === "loading") {
      const timeout = setTimeout(() => setProfilesDone(true), 8_000);
      return () => clearTimeout(timeout);
    }
    let active = true;
    const loadProfiles = async () => {
      if (profileScript !== "ready" || !window.MafiaProfile) {
        if (active) setProfilesDone(true);
        return;
      }
      try {
        const users = await window.MafiaProfile.getUsersInfo({ chain: chainConfig.id }) as Array<Record<string, unknown>>;
        if (!active) return;
        const [attacker, victim] = fighterKey.split(":");
        const find = (wallet: string): CombatProfile => {
          const found = users.find((user) => String(user.user ?? user.address ?? "").toLowerCase() === wallet);
          if (!found) return {};
          return { name: typeof found.name === "string" ? found.name : typeof found.username === "string" ? found.username : undefined, portrait: safePortrait(found) };
        };
        setProfiles({ attacker: find(attacker), victim: find(victim) });
      } catch {
        // The record remains viewable with wallet labels when profile lookup fails.
      } finally {
        if (active) setProfilesDone(true);
      }
    };
    void loadProfiles();
    return () => { active = false; };
  }, [fighterKey, profileScript, chainConfig.id]);

  const attack = entry?.attack;
  useEffect(() => {
    if (!attack || attack.status !== 1) return;
    const targets = killTargets(attack);
    if (targets.length === 0) return;
    if (!publicClient) return;
    let active = true;
    const load = async () => {
      const views = await Promise.all(targets.map(async (target): Promise<KillAssetView> => {
        const [registry, preview] = await Promise.allSettled([
          getKillRegistryRecord({ publicClient, chainId: chainConfig.id, killId: target.killId }),
          getKillLootPreview({ publicClient, chainId: chainConfig.id, killId: target.killId }),
        ]);
        return {
          ...target,
          registry: registry.status === "fulfilled" ? registry.value : undefined,
          preview: preview.status === "fulfilled" ? preview.value : undefined,
          registryError: registry.status === "rejected" ? errorText(registry.reason)
            : registry.value === null ? "Kill record not found." : undefined,
          lootError: preview.status === "rejected" ? errorText(preview.reason) : undefined,
        };
      }));
      if (!active) return;
      setAssetViews(views);
      setAssetsDone(true);
      setAssetLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [attack, publicClient, chainConfig.id, assetRevision]);

  const assetTargets = attack?.status === 1 ? killTargets(attack) : [];
  const assetsReady = assetTargets.length === 0 || assetsDone;
  const readyForReveal = entry?.attack.status === 1 && profilesDone && assetsReady;
  useEffect(() => {
    if (entry?.attack.status !== 0 || pendingSlate !== "holding") return;
    const hold = Math.max(0, 1_600 - (Date.now() - slateStarted.current));
    const timer = setTimeout(() => setPendingSlate("exiting"), hold);
    return () => clearTimeout(timer);
  }, [entry, pendingSlate]);
  useEffect(() => {
    if (pendingSlate !== "exiting") return;
    const timer = setTimeout(() => setPendingSlate("done"), 700);
    return () => clearTimeout(timer);
  }, [pendingSlate]);
  useEffect(() => {
    if (!readyForReveal || slate !== "holding") return;
    const hold = Math.max(0, 1_600 - (Date.now() - slateStarted.current));
    const timer = setTimeout(() => setSlate("exiting"), hold);
    return () => clearTimeout(timer);
  }, [readyForReveal, slate]);
  useEffect(() => {
    if (slate !== "exiting") return;
    const timer = setTimeout(() => setSlate("done"), 700);
    return () => clearTimeout(timer);
  }, [slate]);

  useEffect(() => {
    if (slate !== "done" || entry?.attack.status !== 1 || sceneSkipped) return;
    const record = entry.attack;
    const firstFired = record.outcome === 0 && record.bullets > 0n;
    const returnFired = record.backfireOutcome === 0 && record.backfireBullets > 0n;
    const beats: Array<[SceneBeat, number]> = [["matchup", 900]];
    if (firstFired) beats.push(["first-shot", 650], ["first-impact", 700]);
    if (returnFired) beats.push(["return-shot", 650], ["return-impact", 700]);
    beats.push(["verdict", 1_200]);
    let elapsed = 0;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (let index = 1; index < beats.length; index++) {
      elapsed += beats[index - 1][1];
      const beat = beats[index][0];
      timers.push(setTimeout(() => setSceneBeat(beat), elapsed));
    }
    elapsed += beats.at(-1)![1];
    timers.push(setTimeout(() => setSceneComplete(true), elapsed));
    return () => timers.forEach(clearTimeout);
  }, [entry, slate, replayKey, sceneSkipped]);

  const claim = useCallback(async () => {
    if (!address || !entry) { toast.error("Connect your wallet to claim assets."); return; }
    if (!walletClient || !publicClient) { toast.error(`Switch your wallet to ${chainConfig.label} to claim assets.`); return; }
    const targets = killTargets(entry.attack);
    setClaiming(true);
    try {
      let claimed = 0;
      for (const target of targets) {
        let claimedThisTarget = false;
        for (;;) {
          const current = await getKillRegistryRecord({ publicClient, chainId: chainConfig.id, killId: target.killId });
          if (!current) throw new Error(`Kill #${target.killId} is unavailable in the registry.`);
          if (current.finished) break;
          if (current.drainer.toLowerCase() !== address.toLowerCase()) {
            if (claimedThisTarget) throw new Error("This claim has moved to another drainer.");
            break;
          }
          await drainKill({ publicClient, walletClient, chainId: chainConfig.id, killId: target.killId, account: address, maxBatch: 50 });
          claimedThisTarget = true;
          claimed++;
        }
      }
      if (claimed > 0) {
        toast.success("Asset claim complete.");
        window.dispatchEvent(new Event("kill-claims-changed"));
      }
      else toast.error("This claim has moved to another drainer.");
      setAssetLoading(true);
      setAssetRevision((revision) => revision + 1);
    } catch (error) {
      toast.error(errorText(error));
      setAssetLoading(true);
      setAssetRevision((revision) => revision + 1);
    } finally {
      setClaiming(false);
    }
  }, [address, walletClient, publicClient, entry, chainConfig.id, chainConfig.label]);

  if (id === null) {
    return <div className={`flex min-h-screen items-center justify-center px-4 text-white ${styles.stage}`}><div role="alert" className="max-w-lg rounded-2xl border border-red-500/20 bg-black/30 p-8 text-center"><Skull className="mx-auto h-8 w-8 text-red-300" /><h1 className="mt-4 text-2xl font-bold">Invalid attack ID</h1><p className="mt-2 text-sm text-white/55">Open a result from a real attack ID.</p><div className="mt-6"><ReturnLink /></div></div></div>;
  }

  if (recordError || !publicClient) {
    return <div className={`flex min-h-screen items-center justify-center px-4 text-white ${styles.stage}`}><div role="alert" className="max-w-lg rounded-2xl border border-red-500/20 bg-black/30 p-8 text-center"><Skull className="mx-auto h-8 w-8 text-red-300" /><h1 className="mt-4 text-2xl font-bold">Attack record unavailable</h1><p className="mt-2 text-sm text-white/55">{recordError ?? "The selected chain RPC is unavailable."}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => setRetry((value) => value + 1)} className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold hover:bg-red-600">Try again</button><ReturnLink /></div></div></div>;
  }

  if (entry && entry.attack.status !== 1) {
    return (
      <div className="relative min-h-screen bg-[#080a0d]">
        <StatusCard entry={entry} profiles={profiles} viewer={address} transactionHash={transactionHash} explorer={chainConfig.explorer} />
        {entry.attack.status === 0 && pendingSlate !== "done" && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 text-center text-white ${styles.slate} ${pendingSlate === "exiting" ? styles.slateExit : ""}`} aria-live="polite">
            <div>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10"><Loader2 className="h-9 w-9 animate-spin text-amber-300" /></div>
              <p className="mt-7 font-mono text-xs font-semibold uppercase tracking-[.32em] text-amber-300">Attack #{id.toString()}</p>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-[.1em] sm:text-5xl">Attack pending</h1>
              <p className="mt-4 text-sm text-white/50">Waiting for the attack to resolve</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const phase: ResultPhase = recordPhase === "error" ? "error" : !entry ? "record" : !profilesDone ? "labels" : !assetsReady ? "assets" : readyForReveal ? "ready" : "preparing";
  return (
    <div className="relative min-h-screen bg-[#080a0d]">
      {entry && <CombatReport entry={entry} profiles={profiles} viewer={address} transactionHash={transactionHash} explorer={chainConfig.explorer} assetViews={assetViews} assetLoading={assetLoading} claiming={claiming} chainConfig={chainConfig} onClaim={claim} onRefreshAssets={() => { setAssetLoading(true); setAssetRevision((revision) => revision + 1); }} sceneBeat={sceneBeat} sceneComplete={sceneComplete} onSkip={() => { setSceneSkipped(true); setSceneBeat("verdict"); setSceneComplete(true); }} onReplay={() => { setSceneBeat("matchup"); setSceneComplete(false); setSceneSkipped(false); setReplayKey((value) => value + 1); }} walletReady={Boolean(walletClient && publicClient)} onSwitchChain={() => { void switchChainAsync({ chainId: chainConfig.wagmiChainId }).catch((error) => toast.error(errorText(error))); }} />}
      {slate !== "done" && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 text-center text-white ${styles.slate} ${slate === "exiting" ? styles.slateExit : ""}`} aria-live="polite">
          <div>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10"><Swords className="h-9 w-9 text-red-300" /></div>
            <p className="mt-7 font-mono text-xs font-semibold uppercase tracking-[.32em] text-red-300">Attack #{id.toString()}</p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-[.1em] sm:text-5xl">The reckoning</h1>
            <p className="mt-4 text-sm text-white/50">{phaseLabels[phase]}</p>
            <div className="mx-auto mt-7 h-0.5 w-40 overflow-hidden bg-white/10"><div className="h-full w-1/2 animate-pulse bg-red-400" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function KillResultAction() {
  const params = useParams<{ attackId: string }>();
  const { chainConfig } = useChain();
  const idText = typeof params.attackId === "string" ? params.attackId : "";
  return <KillResultRoute key={`${chainConfig.id}:${idText}`} idText={idText} />;
}
