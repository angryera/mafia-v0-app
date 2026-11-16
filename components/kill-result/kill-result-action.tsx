"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import type { PublicClient } from "viem";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowUpRight, ChevronDown, Crosshair, Heart, Loader2, RotateCcw,
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
  BACKFIRE_POLICY_NAMES, capRecordedDamage, formatCombatUnits, formatUtc, hasStatsSnapshot,
  healthPercent, killTargets, parseAttackId, remainingHealth,
  resultOutcome, resultSubtitle, type ResultOutcome,
} from "./kill-result-logic";
import { KillResultAssets, type KillAssetView } from "./kill-result-assets";
import styles from "./kill-result.module.css";
import "@/types/mafia-globals";

type CombatProfile = { name?: string; portrait?: string };
type CombatProfiles = Record<"attacker" | "victim", CombatProfile>;
type ResultPhase = "record" | "pending" | "labels" | "assets" | "preparing" | "ready" | "error";
type SceneBeat = "matchup" | "first-shot" | "return-shot" | "verdict";

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
  role, address, profile, killed, killId, damage, healthBefore, healthAfter, healthVisible, shot,
}: {
  role: "attacker" | "victim";
  address: string;
  profile: CombatProfile;
  killed: boolean;
  killId: bigint;
  damage: bigint;
  healthBefore?: bigint;
  healthAfter?: bigint;
  healthVisible: boolean;
  shot?: boolean;
}) {
  const label = shortName(profile, address);
  const isDown = killed && healthVisible;
  const percent = healthBefore !== undefined && healthAfter !== undefined
    ? healthPercent(healthBefore, healthVisible ? healthAfter : healthBefore)
    : null;
  const displayedHealth = healthVisible ? healthAfter : healthBefore;
  return (
    <div className={`relative min-w-0 rounded-xl border border-white/15 bg-[#151b21] p-3 text-center sm:p-5 ${styles.fighterCard} ${role === "victim" ? styles.fighterCardVictim : ""} ${isDown ? styles.fighterDown : ""} ${shot ? styles.shot : ""}`}>
      <div className="flex items-center justify-between gap-2 text-left">
        <span className={`text-xs font-bold uppercase tracking-[.12em] ${role === "attacker" ? "text-amber-200" : "text-sky-200"}`}>{role === "attacker" ? "Attacker" : "Target"}</span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${isDown ? "bg-red-400" : healthVisible ? "bg-emerald-400" : "bg-amber-300"}`} aria-hidden="true" />
      </div>
      <Avatar className={`mx-auto mt-4 h-20 w-20 rounded-lg border-2 border-white/25 bg-zinc-800 sm:h-28 sm:w-28 ${styles.portrait}`}>
        {profile.portrait && <AvatarImage src={profile.portrait} alt="" className="object-cover" />}
        <AvatarFallback className="rounded-lg bg-[#28313a] text-2xl font-semibold text-white/80">
          {profile.name ? nameInitials(profile.name) : <UserRound className="h-8 w-8 text-white/65" />}
        </AvatarFallback>
      </Avatar>
      <Link href={`/players?q=${encodeURIComponent(address)}`} className="mx-auto mt-3 block max-w-full break-words rounded-sm text-sm font-bold leading-snug text-white hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:text-lg">
        {label}
      </Link>
      <p className="mt-1 break-all font-mono text-xs text-white/65">{formatWalletAddress(address)}</p>
      <div className="mt-4 border-t border-white/15 pt-3 text-left">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="text-xs font-semibold uppercase tracking-[.08em] text-white/70">Status</span>
          <strong className={`text-sm font-bold ${isDown ? "text-red-300" : healthVisible ? "text-emerald-300" : "text-amber-200"}`}>{healthVisible ? killed ? "Down" : "Alive" : "In combat"}</strong>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[.08em] text-white/70"><Heart className="h-3.5 w-3.5" /> HP</span>
          <strong className="break-all font-mono text-sm text-white">{displayedHealth === undefined ? "Unavailable" : formatCombatUnits(displayedHealth)}</strong>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15" role={percent === null ? undefined : "progressbar"} aria-label={percent === null ? undefined : `${role === "victim" ? "Target" : "Attacker"} health remaining`} aria-valuemin={percent === null ? undefined : 0} aria-valuemax={percent === null ? undefined : 100} aria-valuenow={percent === null ? undefined : percent}>
          <div className={`${styles.healthFill} h-full rounded-full ${isDown ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${percent ?? 0}%` }} />
        </div>
        {healthVisible && <p className="mt-2 break-words text-xs leading-relaxed text-white/70">{healthBefore === undefined || healthAfter === undefined ? "Health snapshot unavailable" : `${formatCombatUnits(healthBefore)} → ${formatCombatUnits(healthAfter)} HP`}</p>}
        {healthVisible && <p className="mt-1 break-words text-xs font-semibold text-white/85">Damage taken: <span className={damage > 0n ? "text-red-300" : "text-white"}>{formatCombatUnits(damage)} HP</span></p>}
        {isDown && <p className="mt-1 font-mono text-xs font-semibold text-red-300">KILL #{killId.toString()}</p>}
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
      <dt className="text-sm text-white/75">{label}</dt>
      <dd className="max-w-[65%] break-words text-right text-sm font-semibold text-white">{children}</dd>
    </div>
  );
}

function ReturnLink() {
  return <Link href="/kill-initiation" className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/[.04] px-4 py-2.5 text-sm font-semibold text-white hover:border-amber-300/70 hover:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"><ArrowLeft className="h-4 w-4" /> Return to kill initiation</Link>;
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
    ? "The attack was voided. Spent bullets were not returned."
    : record.status === 3
      ? "The reveal window passed before the attack was finished. Spent bullets were not returned."
      : "The attack is still resolving. This report refreshes automatically.";
  const viewerRole = viewer?.toLowerCase() === record.attacker.toLowerCase() ? "Attacker"
    : viewer?.toLowerCase() === record.victim.toLowerCase() ? "Target" : "Observer";
  return (
    <main className={`min-h-screen px-4 py-8 text-white sm:px-8 ${styles.stage}`}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <ReturnLink />
          <span className="font-mono text-xs font-semibold tracking-[.1em] text-white/75">ATTACK #{id.toString()}</span>
        </div>
        <div className={`rounded-2xl border border-amber-200/20 p-5 shadow-2xl sm:p-8 ${styles.arena}`}>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-amber-200"><Crosshair className="h-4 w-4" /> {City[record.cityId] ?? `City #${record.cityId}`} · Combat report</p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-[.025em] sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{description}</p>
          {record.status === 0 && <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100"><Loader2 className="h-4 w-4 animate-spin" /> Checking every 3 seconds</div>}

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {(["attacker", "victim"] as const).map((role) => {
              const fighterAddress = record[role];
              const killed = role === "attacker" ? record.attackerKilled : record.victimKilled;
              const killId = role === "attacker" ? record.attackerKillId : record.victimKillId;
              const bullets = role === "attacker" ? record.bullets : record.backfireBullets;
              return (
                <section key={role} className="min-w-0 rounded-xl border border-white/15 bg-[#151b21] p-4 sm:p-5">
                  <p className={`text-xs font-bold uppercase tracking-[.12em] ${role === "attacker" ? "text-amber-200" : "text-sky-200"}`}>{role === "attacker" ? "Attacker" : "Target"}</p>
                  <Link href={`/players?q=${encodeURIComponent(fighterAddress)}`} className="mt-2 block w-fit max-w-full break-words rounded-sm text-lg font-bold text-white hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">{shortName(profiles[role], fighterAddress)}</Link>
                  <p className="mt-1 break-all font-mono text-xs text-white/65">{formatWalletAddress(fighterAddress)}</p>
                  <p className="mt-4 text-sm text-white/75">{role === "attacker" ? "Bullets spent" : "Return-fire bullets"}: <strong className="break-all font-mono text-white">{formatCombatUnits(bullets)}</strong></p>
                  {killed && <p className="mt-3 text-sm font-semibold text-red-300">Down · Kill #{killId.toString()}</p>}
                </section>
              );
            })}
          </div>

          <dl className="mt-6 grid gap-x-8 border-t border-white/15 pt-3 sm:grid-cols-2">
            <Detail label="City">{City[record.cityId] ?? `City #${record.cityId}`}</Detail>
            <Detail label="Requested">{formatUtc(record.requestedAt)}</Detail>
            <Detail label="Finished">{formatUtc(record.resolvedAt)}</Detail>
            <Detail label="Viewer role">{viewerRole}</Detail>
          </dl>
          {record.message.trim() && <div className="mt-6 rounded-lg border-l-2 border-amber-300 bg-white/[.04] p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-amber-200">Attacker message</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/85">{record.message}</p></div>}
          {transactionHash && <a href={`${explorer}/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-amber-200 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">View transaction <ArrowUpRight className="h-4 w-4" /></a>}
          <div className="mt-8"><ReturnLink /></div>
        </div>
      </div>
    </main>
  );
}

function CombatReport({
  entry, profiles, viewer, transactionHash, explorer, assetViews, assetLoading,
  claiming, chainConfig, onClaim, onRefreshAssets, sceneBeat, sceneComplete,
  onSkip, onReplay, walletReady, onSwitchChain, reduceMotion, publicClient,
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
  reduceMotion: boolean;
  publicClient: PublicClient | undefined;
}) {
  const { attack: record, stats, id } = entry;
  const outcome = resultOutcome(record);
  const snapshotAvailable = hasStatsSnapshot(stats);
  const firstFired = record.outcome === 0 && record.bullets > 0n;
  const returnFired = record.backfireOutcome === 0 && record.backfireBullets > 0n;
  const verdict = sceneBeat === "verdict";
  const victimDamage = capRecordedDamage(record.healthLost, snapshotAvailable ? stats.victimHealth : undefined);
  const attackerDamage = capRecordedDamage(record.backfireHealthLost, snapshotAvailable ? stats.attackerHealth : undefined);
  const victimAfter = snapshotAvailable ? remainingHealth(stats.victimHealth, record.healthLost, record.victimKilled) : undefined;
  const attackerAfter = snapshotAvailable ? remainingHealth(stats.attackerHealth, record.backfireHealthLost, record.attackerKilled) : undefined;
  const viewerRole = viewer?.toLowerCase() === record.attacker.toLowerCase() ? "Attacker"
    : viewer?.toLowerCase() === record.victim.toLowerCase() ? "Target" : "Observer";
  const didDie = record.victimKilled || record.attackerKilled;
  const cityName = City[record.cityId] ?? `City #${record.cityId}`;
  const sceneLine = verdict ? resultSubtitle(record)
    : sceneBeat === "first-shot" ? "The attacker fires."
      : sceneBeat === "return-shot" ? "The target fires back."
        : "The fighters face off.";

  return (
    <main className={`min-h-screen pb-12 text-white ${styles.stage}`}>
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
          <ReturnLink />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span className="font-mono text-xs font-semibold tracking-[.1em] text-white/75">ATTACK #{id.toString()}</span>{transactionHash && <a href={`${explorer}/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-amber-200 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">View transaction <ArrowUpRight className="h-4 w-4" /></a>}</div>
        </div>

        <section className={`mx-auto max-w-5xl rounded-2xl border border-amber-200/20 p-4 shadow-2xl sm:p-7 ${styles.arena}`} aria-label="Attack result">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-5">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-amber-200"><Crosshair className="h-4 w-4" /> {cityName} · Combat report</p>
              <h1 className={`mt-3 text-3xl font-black uppercase leading-[1.05] tracking-[.025em] sm:text-5xl ${record.victimKilled ? "text-amber-50" : record.attackerKilled ? "text-red-100" : "text-white"}`} aria-live="polite">{verdict ? outcomeLabels[outcome] : "THE EXCHANGE"}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base" aria-live="polite">{sceneLine}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-[.12em] ${verdict ? "border-amber-300/45 bg-amber-300/10 text-amber-100" : "border-white/20 bg-white/[.05] text-white/80"}`}><span className={`h-2 w-2 rounded-full ${verdict ? "bg-amber-300" : "bg-red-400"}`} aria-hidden="true" />{verdict ? "Resolved" : "Combat replay"}</span>
          </div>
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] sm:gap-4">
            <Fighter role="attacker" address={record.attacker} profile={profiles.attacker} killed={record.attackerKilled} killId={record.attackerKillId} damage={attackerDamage} healthBefore={snapshotAvailable ? stats.attackerHealth : undefined} healthAfter={attackerAfter} healthVisible={verdict} shot={sceneBeat === "first-shot"} />
            <div className="flex min-w-0 flex-col items-center justify-center gap-1" aria-hidden="true"><Swords className="h-4 w-4 text-amber-300 sm:h-6 sm:w-6" /><span className="text-sm font-black tracking-tight text-amber-100 sm:text-2xl">VS</span></div>
            <Fighter role="victim" address={record.victim} profile={profiles.victim} killed={record.victimKilled} killId={record.victimKillId} damage={victimDamage} healthBefore={snapshotAvailable ? stats.victimHealth : undefined} healthAfter={victimAfter} healthVisible={verdict} shot={sceneBeat === "return-shot"} />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
            <p className="text-sm text-white/75"><span className="font-semibold text-white">Viewer:</span> {viewerRole}</p>
            {!reduceMotion && <div className="flex flex-wrap gap-2"><button type="button" onClick={onReplay} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/25 bg-white/[.04] px-3 py-2 text-sm font-semibold text-white hover:border-amber-300/60 hover:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"><RotateCcw className="h-4 w-4" /> Replay</button>{!sceneComplete && <button type="button" onClick={onSkip} className="inline-flex min-h-10 items-center rounded-lg border border-amber-300/45 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Skip to report</button>}</div>}
          </div>
        </section>

        {sceneComplete && (
          <div className={`${styles.verdict} mx-auto mt-6 max-w-5xl space-y-5`}>
            <section className="rounded-2xl border border-white/15 bg-[#11171d] p-4 sm:p-7" aria-label="Combat breakdown">
              <div className="flex items-center gap-3"><Crosshair className="h-5 w-5 text-amber-300" /><div><p className="text-xs font-bold uppercase tracking-[.14em] text-amber-200">Damage report</p><h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">Combat breakdown</h2></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <article className="min-w-0 rounded-xl border border-amber-300/20 bg-[#1a2026] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-[.12em] text-amber-200">01 / First strike</span><span className="rounded border border-white/20 px-2 py-1 text-xs font-semibold text-white/80">{firstFired ? "Shots fired" : "No shot recorded"}</span></div>
                  <h3 className="mt-4 text-base font-bold text-white">Attacker <span className="px-1 text-amber-300" aria-hidden="true">→</span> Target</h3>
                  <div className="mt-4 rounded-lg border border-red-300/20 bg-red-400/[.06] p-4"><p className="text-xs font-semibold uppercase tracking-[.1em] text-white/75">Damage to target</p><p className="mt-1 font-mono text-2xl font-bold text-red-200 sm:text-3xl">{formatCombatUnits(victimDamage)} <span className="text-sm text-white/70">HP</span></p></div>
                  <dl className="mt-3"><Detail label="Bullets spent"><span className="inline-flex items-center gap-1"><Zap className="h-4 w-4 text-amber-300" />{formatCombatUnits(record.bullets)}</span></Detail><Detail label="Attacker offense">{snapshotAvailable ? stats.attackerOffense.toLocaleString() : "Unavailable"}</Detail><Detail label="Target defense">{snapshotAvailable ? stats.victimDefense.toLocaleString() : "Unavailable"}</Detail></dl>
                </article>
                <article className="min-w-0 rounded-xl border border-sky-300/20 bg-[#1a2026] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-[.12em] text-sky-200">02 / Return fire</span><span className="rounded border border-white/20 px-2 py-1 text-xs font-semibold text-white/80">{returnFired ? "Shots fired" : "No shot recorded"}</span></div>
                  <h3 className="mt-4 text-base font-bold text-white">Target <span className="px-1 text-sky-300" aria-hidden="true">→</span> Attacker</h3>
                  <div className="mt-4 rounded-lg border border-red-300/20 bg-red-400/[.06] p-4"><p className="text-xs font-semibold uppercase tracking-[.1em] text-white/75">Damage to attacker</p><p className="mt-1 font-mono text-2xl font-bold text-red-200 sm:text-3xl">{formatCombatUnits(attackerDamage)} <span className="text-sm text-white/70">HP</span></p></div>
                  <dl className="mt-3"><Detail label="Bullets spent"><span className="inline-flex items-center gap-1"><Zap className="h-4 w-4 text-amber-300" />{formatCombatUnits(record.backfireBullets)}</span></Detail><Detail label="Target offense">{snapshotAvailable ? stats.victimOffense.toLocaleString() : "Unavailable"}</Detail><Detail label="Attacker defense">{snapshotAvailable ? stats.attackerDefense.toLocaleString() : "Unavailable"}</Detail></dl>
                </article>
              </div>
              <details className="group mt-4 rounded-xl border border-white/15 bg-black/20">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-300"><span>Attack record details <span className="ml-1 font-normal text-white/65">· timing and backfire rule</span></span><ChevronDown className="h-4 w-4 shrink-0 text-amber-200 transition-transform group-open:rotate-180" /></summary>
                <dl className="border-t border-white/10 px-4 pb-2 sm:grid sm:grid-cols-2 sm:gap-x-8"><Detail label="Backfire rule">{BACKFIRE_POLICY_NAMES[record.backfirePolicy] ?? `Policy #${record.backfirePolicy}`}</Detail><Detail label="Requested">{formatUtc(record.requestedAt)}</Detail><Detail label="Finished">{formatUtc(record.resolvedAt)}</Detail><Detail label="Viewer role">{viewerRole}</Detail></dl>
              </details>
              {record.message.trim() && <div className="mt-4 rounded-lg border-l-2 border-amber-300 bg-white/[.04] p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-amber-200">Attacker message</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/85">{record.message}</p></div>}
            </section>

            {didDie ? (
              <KillResultAssets views={assetViews} loading={assetLoading} claiming={claiming} viewer={viewer} walletReady={walletReady} chainConfig={chainConfig} publicClient={publicClient} requestBlock={record.requestBlock} onClaim={onClaim} onSwitchChain={onSwitchChain} onRefresh={onRefreshAssets} />
            ) : (
              <section className="rounded-2xl border border-white/15 bg-[#11171d] p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-amber-200">Aftermath</p><h2 className="mt-2 text-xl font-bold text-white">No assets to claim</h2><p className="mt-2 text-sm text-white/75">Both fighters survived this attack.</p></section>
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
  const [reduceMotion, setReduceMotion] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>();
  const slateStarted = useRef(Date.now());

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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
        const params = { publicClient, chainId: chainConfig.id, killId: target.killId };
        let registry;
        try {
          registry = await getKillRegistryRecord(params);
        } catch (error) {
          return { ...target, registryError: errorText(error) };
        }
        if (!registry) return { ...target, registry: null, registryError: "Kill record not found." };
        // The lens previews assets that are still pending. A finished kill's
        // transferred assets must come from recorded drain history instead.
        if (registry.finished) return { ...target, registry };

        try {
          const preview = await getKillLootPreview(params);
          if (preview.victim.toLowerCase() !== registry.victim.toLowerCase() ||
              preview.killer.toLowerCase() !== registry.killer.toLowerCase()) {
            throw new Error(`Kill #${target.killId} preview does not match the registry.`);
          }
          return { ...target, registry, preview };
        } catch (error) {
          // A claim can finish between the registry and lens reads.
          const latest = await getKillRegistryRecord(params).catch(() => null);
          if (latest?.finished) return { ...target, registry: latest };
          return { ...target, registry, lootError: errorText(error) };
        }
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
    if (reduceMotion) { setPendingSlate("done"); return; }
    const hold = Math.max(0, 1_600 - (Date.now() - slateStarted.current));
    const timer = setTimeout(() => setPendingSlate("exiting"), hold);
    return () => clearTimeout(timer);
  }, [entry, pendingSlate, reduceMotion]);
  useEffect(() => {
    if (pendingSlate !== "exiting") return;
    if (reduceMotion) { setPendingSlate("done"); return; }
    const timer = setTimeout(() => setPendingSlate("done"), 700);
    return () => clearTimeout(timer);
  }, [pendingSlate, reduceMotion]);
  useEffect(() => {
    if (!readyForReveal || slate !== "holding") return;
    if (reduceMotion) { setSlate("done"); return; }
    const hold = Math.max(0, 1_600 - (Date.now() - slateStarted.current));
    const timer = setTimeout(() => setSlate("exiting"), hold);
    return () => clearTimeout(timer);
  }, [readyForReveal, slate, reduceMotion]);
  useEffect(() => {
    if (slate !== "exiting") return;
    if (reduceMotion) { setSlate("done"); return; }
    const timer = setTimeout(() => setSlate("done"), 700);
    return () => clearTimeout(timer);
  }, [slate, reduceMotion]);

  useEffect(() => {
    if (slate !== "done" || entry?.attack.status !== 1 || sceneSkipped) return;
    if (reduceMotion) { setSceneBeat("verdict"); setSceneComplete(true); return; }
    const record = entry.attack;
    const firstFired = record.outcome === 0 && record.bullets > 0n;
    const returnFired = record.backfireOutcome === 0 && record.backfireBullets > 0n;
    const beats: Array<[SceneBeat, number]> = [["matchup", 650]];
    if (firstFired) beats.push(["first-shot", 800]);
    if (returnFired) beats.push(["return-shot", 800]);
    beats.push(["verdict", 900]);
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
  }, [entry, slate, replayKey, sceneSkipped, reduceMotion]);

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
        {(entry.attack.status !== 0 || pendingSlate === "done") && <StatusCard entry={entry} profiles={profiles} viewer={address} transactionHash={transactionHash} explorer={chainConfig.explorer} />}
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
      {entry && slate === "done" && <CombatReport entry={entry} profiles={profiles} viewer={address} transactionHash={transactionHash} explorer={chainConfig.explorer} assetViews={assetViews} assetLoading={assetLoading} claiming={claiming} chainConfig={chainConfig} publicClient={publicClient} onClaim={claim} onRefreshAssets={() => { setAssetLoading(true); setAssetRevision((revision) => revision + 1); }} sceneBeat={reduceMotion ? "verdict" : sceneBeat} sceneComplete={reduceMotion || sceneComplete} onSkip={() => { setSceneSkipped(true); setSceneBeat("verdict"); setSceneComplete(true); }} onReplay={() => { setSceneBeat("matchup"); setSceneComplete(false); setSceneSkipped(false); setReplayKey((value) => value + 1); }} walletReady={Boolean(walletClient && publicClient)} onSwitchChain={() => { void switchChainAsync({ chainId: chainConfig.wagmiChainId }).catch((error) => toast.error(errorText(error))); }} reduceMotion={reduceMotion} />}
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
