"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Philosopher } from "next/font/google";
import { toast } from "sonner";
import {
  Target,
  Loader2,
  Zap,
  Swords,
  BookOpen,
  Trophy,
  Gift,
  DollarSign,
  Map,
  Building2,
  Shield,
  CreditCard,
  Key,
  Coins,
  Box,
  Bot,
  Ticket,
  Store,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKillOutcome } from "@/components/kill-outcome-provider";
import {
  OUTCOME_META,
  buildPreviewKillBattle,
  canClaimRewards,
  getStoryText,
  isAttackerDead,
  isPreviewOutcomeType,
  isVictimDead,
  type KillBattlePayload,
  type KillLootEntry,
} from "@/lib/killOutcome";

const philosopher = Philosopher({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const REVEAL_MS = {
  attackDetails: 1500,
  story: 3500,
  result: 8000,
  rewards: 11000,
} as const;

const STORY_SPINNER_MS = 2000;
const RESULT_SPINNER_MS = 1500;

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function Divider() {
  return <div className="my-6 h-px bg-[rgba(255,255,255,0.08)]" />;
}

function RevealSection({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      {children}
    </div>
  );
}

function PlayerCard({
  role,
  name,
  address,
  dead,
}: {
  role: string;
  name: string;
  address: string;
  dead: boolean;
}) {
  return (
    <div className="flex-1 text-center">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#c44b4b]">
        {role}
      </p>
      <div
        className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#c44b4b] bg-[#1e1e1e]"
        aria-hidden
      >
        <Swords className="h-6 w-6 text-[#c44b4b]/70" />
      </div>
      <Link
        href={`/profile/${encodeURIComponent(name)}`}
        className={cn(
          "block text-base font-bold text-foreground transition-colors hover:text-[#c44b4b]",
          dead && "text-muted-foreground line-through decoration-[#c44b4b]/70 decoration-2",
        )}
      >
        {name}
      </Link>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        {shortAddress(address)}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-[#282828] px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

const LOOT_ICONS: Record<string, React.ReactNode> = {
  cash: <DollarSign className="h-4 w-4 text-green-400" />,
  map: <Map className="h-4 w-4 text-amber-400" />,
  biz: <Building2 className="h-4 w-4 text-blue-400" />,
  bg: <Shield className="h-4 w-4 text-purple-400" />,
  gi: <CreditCard className="h-4 w-4 text-cyan-400" />,
  perk: <Gift className="h-4 w-4 text-pink-400" />,
  keys: <Key className="h-4 w-4 text-yellow-400" />,
  mafia: <Coins className="h-4 w-4 text-primary" />,
  mystery: <Box className="h-4 w-4 text-violet-400" />,
  helper: <Bot className="h-4 w-4 text-orange-400" />,
  lottery: <Ticket className="h-4 w-4 text-rose-400" />,
  jackpot: <Trophy className="h-4 w-4 text-amber-300" />,
  market: <Store className="h-4 w-4 text-slate-300" />,
};

function LootCard({ item }: { item: KillLootEntry }) {
  return (
    <div className="rounded-lg bg-[#282828] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-2">
        {LOOT_ICONS[item.id] ?? <Gift className="h-4 w-4 text-muted-foreground" />}
        <span className="text-xs text-muted-foreground">{item.label}</span>
      </div>
      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {item.value}
      </p>
      {item.note && (
        <p className="mt-1 text-[10px] text-muted-foreground/80">{item.note}</p>
      )}
    </div>
  );
}

function BattleOutcomePanel({ battle }: { battle: KillBattlePayload }) {
  const { markRewardsClaimed } = useKillOutcome();
  const meta = OUTCOME_META[battle.outcomeType];
  const storyText = getStoryText(battle);

  const [showAttack, setShowAttack] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [storyReady, setStoryReady] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowAttack(true), REVEAL_MS.attackDetails),
      setTimeout(() => setShowStory(true), REVEAL_MS.story),
      setTimeout(() => setShowResult(true), REVEAL_MS.result),
      setTimeout(() => setShowRewards(true), REVEAL_MS.rewards),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!showStory) {
      setStoryReady(false);
      return;
    }
    const t = setTimeout(() => setStoryReady(true), STORY_SPINNER_MS);
    return () => clearTimeout(t);
  }, [showStory]);

  useEffect(() => {
    if (!showResult) {
      setResultReady(false);
      return;
    }
    const t = setTimeout(() => setResultReady(true), RESULT_SPINNER_MS);
    return () => clearTimeout(t);
  }, [showResult]);

  const showBackfire = battle.backfireBullets > 0;
  const claimable = canClaimRewards(battle);

  const handleClaim = () => {
    markRewardsClaimed();
    toast.success("Rewards claimed successfully.");
  };

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-2xl rounded-2xl border border-[rgba(255,255,255,0.08)] p-6 sm:p-8",
        philosopher.className,
      )}
      style={{ background: "rgba(25, 25, 25, 0.85)" }}
    >
      {/* Header — immediate */}
      <div className="text-center">
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <Target className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Battle outcome
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{battle.cityName}</p>
      </div>

      <Divider />

      <RevealSection visible>
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          <PlayerCard
            role="Attacker"
            name={battle.attacker.name}
            address={battle.attacker.address}
            dead={isAttackerDead(battle)}
          />
          <span className="shrink-0 text-lg font-bold text-[#c44b4b]">vs</span>
          <PlayerCard
            role="Victim"
            name={battle.victim.name}
            address={battle.victim.address}
            dead={isVictimDead(battle)}
          />
        </div>
      </RevealSection>

      {/* Attack details */}
      <RevealSection visible={showAttack}>
        <Divider />
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Attack details
        </h2>
        <div className="flex flex-col gap-2">
          <DetailRow label="Bullets fired">
            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              {battle.bulletsFired.toLocaleString()}
            </span>
          </DetailRow>
          <DetailRow label="Equipped weapon">
            <span className="inline-flex items-center gap-2">
              {battle.weapon.name}
            </span>
          </DetailRow>
          {showBackfire && (
            <DetailRow label="Backfire returned">
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-red-400">
                <Zap className="h-3.5 w-3.5" />
                {battle.backfireBullets.toLocaleString()}
              </span>
            </DetailRow>
          )}
        </div>
      </RevealSection>

      {/* Story */}
      <RevealSection visible={showStory}>
        <Divider />
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Story
        </h2>
        <div className="rounded-lg bg-[rgba(0,0,0,0.2)] px-4 py-4">
          {!storyReady ? (
            <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-[#c44b4b]" />
              <p className="text-sm">Piecing together what happened…</p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[#cccccc80]">
              <BookOpen className="mb-2 inline h-4 w-4 text-muted-foreground" />{" "}
              {storyText}
            </p>
          )}
        </div>
      </RevealSection>

      {/* Result */}
      <RevealSection visible={showResult}>
        <Divider />
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Result
        </h2>
        {!resultReady ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-[#c44b4b]" />
            <p className="text-sm">Revealing outcome…</p>
          </div>
        ) : (
          <div>
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={{
                color: meta.badgeColor,
                backgroundColor: `${meta.badgeColor}22`,
                border: `1px solid ${meta.badgeColor}55`,
              }}
            >
              {meta.statusLabel}
            </span>
            <p className="mt-3 text-lg font-bold text-foreground">{meta.headline}</p>

            <div className="mt-4 flex flex-col gap-2">
              <DetailRow label="Bullets fired">
                <span className="font-mono tabular-nums">
                  {battle.bulletsFired.toLocaleString()}
                </span>
              </DetailRow>
              {showBackfire && (
                <DetailRow label="Backfire returned">
                  <span className="font-mono tabular-nums text-red-400">
                    {battle.backfireBullets.toLocaleString()}
                  </span>
                </DetailRow>
              )}
              {battle.victimHealthLost > 0 && battle.outcomeType === "no_kill" && (
                <DetailRow label="Victim health lost">
                  <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-red-400">
                    <Heart className="h-3.5 w-3.5" />
                    -{battle.victimHealthLost}
                  </span>
                </DetailRow>
              )}
              {battle.attackerHealthLost > 0 && (
                <DetailRow label="Attacker health lost">
                  <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-red-400">
                    <Heart className="h-3.5 w-3.5" />
                    -{battle.attackerHealthLost}
                  </span>
                </DetailRow>
              )}
            </div>
          </div>
        )}
      </RevealSection>

      {/* Rewards */}
      <RevealSection visible={showRewards}>
        <Divider />
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Rewards
        </h2>

        {battle.outcomeType === "no_kill" ? (
          <p className="rounded-lg bg-[rgba(0,0,0,0.2)] px-4 py-4 text-sm text-muted-foreground">
            No rewards earned — the target survived this attempt.
          </p>
        ) : (
          <>
            {(battle.rankXp > 0 || battle.killXp > 0) && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-foreground">XP gained</p>
                <div className="flex flex-col gap-2">
                  {battle.rankXp > 0 && (
                    <DetailRow label="Rank XP">
                      <span className="font-mono tabular-nums text-primary">
                        +{battle.rankXp.toLocaleString()}
                      </span>
                    </DetailRow>
                  )}
                  {battle.killXp > 0 && (
                    <DetailRow label="Kill XP">
                      <span className="font-mono tabular-nums text-[#8fd48f]">
                        +{battle.killXp.toLocaleString()}
                      </span>
                    </DetailRow>
                  )}
                </div>
              </div>
            )}

            {battle.loot.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-foreground">
                  Obtained from victim
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {battle.loot.map((item) => (
                    <LootCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {isAttackerDead(battle) && (
              <p className="mb-4 text-sm text-muted-foreground">
                Rewards cannot be claimed — the attacker was eliminated.
              </p>
            )}

            {claimable && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleClaim}
                  className="flex min-w-[200px] items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "#2ca971" }}
                >
                  <Gift className="h-4 w-4" />
                  Claim rewards
                </button>
              </div>
            )}

            {battle.claimed && (
              <p className="text-center text-sm font-medium text-[#2ca971]">
                Rewards claimed.
              </p>
            )}
          </>
        )}
      </RevealSection>
    </div>
  );
}

export function KillOutcomeAction() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { battle, setKillBattle } = useKillOutcome();

  const previewParam = searchParams.get("preview");

  useEffect(() => {
    if (previewParam && isPreviewOutcomeType(previewParam)) {
      setKillBattle(buildPreviewKillBattle(previewParam));
    }
  }, [previewParam, setKillBattle]);

  useEffect(() => {
    if (!battle && !previewParam) {
      router.replace("/kill-initiation");
    }
  }, [battle, previewParam, router]);

  if (!battle) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c44b4b]" />
      </div>
    );
  }

  return (
    <div
      className="relative -mx-4 -my-6 min-h-[calc(100vh-4rem)] bg-cover bg-center bg-no-repeat px-4 py-10 sm:-mx-6 sm:px-6"
    >
      <BattleOutcomePanel battle={battle} />
    </div>
  );
}
