"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import { formatEther, type Abi } from "viem";
import {
  GI_CREDITS_ABI,
  JAIL_CONTRACT_ABI,
  SAFEHOUSE_ABI,
  KILLSKILL_CONTRACT_ABI,
  BUSTOUT_SKILL_ABI,
  BULLET_ABI,
  HEALTH_ABI,
  CREDITS_ABI,
  INGAME_CURRENCY_ABI,
  USER_PROFILE_CONTRACT_ABI,
  RANK_ABI,
  RACE_XP_ABI,
  RANK_STAKE_ABI,
} from "@/lib/constants/abi";
import {
  RANK_XP,
  RANK_NAMES,
  TRAVEL_DESTINATIONS,
} from "@/lib/constants/const";
import {
  CHAIN_CONFIGS,
  type ChainId,
} from "@/lib/constants/address";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  Coins,
  User,
  DollarSign,
  Zap,
  CreditCard,
  Heart,
  Menu,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTabUrl, type Tab } from "@/lib/navigation";
import type { CooldownMap } from "@/hooks/use-cooldowns";
import {
  buildNavigationSections,
  type NavItem,
} from "@/components/navigation-config";

// Hook to read the connected user's city name
function useCityName(): string | null {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { authData } = useAuth();

  const { data: profileData } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address && isConnected },
  });

  const profile = profileData as { profileId: bigint; username: string; cityId: number; isActive: boolean } | undefined;
  if (!profile) return null;
  return profile.cityId < TRAVEL_DESTINATIONS.length
    ? TRAVEL_DESTINATIONS[profile.cityId].label
    : `City #${profile.cityId}`;
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
function UsernameLabel({ onNavigate }: { onNavigate: () => void }) {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { authData } = useAuth();

  const { data: profileData } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address },
  });

  const profile = profileData as { profileId: bigint; username: string; cityId: number; isActive: boolean } | undefined;
  const username = profile?.username || null;

  if (!isConnected || !username) return null;

  return (
    <button
      onClick={onNavigate}
      className="flex h-8 items-center gap-2 rounded-lg border border-border/60 bg-white/[0.035] px-2.5 text-foreground transition-all hover:border-primary/20 hover:bg-white/[0.07] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      title="View profile"
    >
      <User className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-foreground">{username}</span>
    </button>
  );
}

function WalletControl() {
  return (
    <ConnectButton.Custom>
      {({ account, mounted, openAccountModal, openConnectModal }) => {
        const connected = mounted && Boolean(account);

        return (
          <button
            type="button"
            onClick={connected ? openAccountModal : openConnectModal}
            className="group flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label={connected ? "Open wallet details" : "Connect wallet"}
            style={!mounted ? { opacity: 0, pointerEvents: "none", userSelect: "none" } : undefined}
          >
            <span className="relative grid h-6 w-6 place-items-center rounded-md bg-primary/[0.08] text-primary transition-colors group-hover:bg-primary/[0.14]">
              <Wallet className="h-3.5 w-3.5" />
              {connected && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-background" />
              )}
            </span>
            <span className="max-w-28 truncate font-mono text-[11px] tracking-tight">
              {account?.displayName ?? "Connect wallet"}
            </span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

function AssetBalanceItem({
  label,
  icon,
  contractAddress,
  contractAbi,
  fnName,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  contractAddress: `0x${string}`;
  contractAbi?: Abi;
  fnName?: string;
  href?: string;
}) {
  const { address } = useAccount();
  const { authData } = useAuth();

  const { data: balanceRaw, isLoading } = useReadContract({
    address: contractAddress,
    abi: contractAbi ?? INGAME_CURRENCY_ABI,
    functionName: fnName ?? "balanceOfWithSignMsg",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address },
  });

  const balance = balanceRaw !== undefined ? Number(formatEther(balanceRaw as bigint)).toLocaleString() : null;

  const content = (
    <>
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] tabular-nums text-primary">
        {isLoading ? "..." : balance ?? "-"}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-secondary/80 cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
    >
      {content}
    </div>
  );
}

// ── XP bars for top bar ──────────────────────────────────────────
function XpBars() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { authData } = useAuth();
  const enabled = isConnected && !!address && !!authData;

  // Rank level + rank XP
  const { data: rankLevelRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankLevel",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: rankXpRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankXp",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled },
  });

  // Kill Skill XP (0-10000) — on killskill contract
  const { data: killXpRaw } = useReadContract({
    address: addresses.killskill,
    abi: KILLSKILL_CONTRACT_ABI,
    functionName: "getSkillXp",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled },
  });

  // Race XP — on raceXp contract, getXp with JSON.stringify(message)
  const { data: raceXpRaw } = useReadContract({
    address: addresses.raceXp,
    abi: RACE_XP_ABI,
    functionName: "getXp",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled },
  });

  // Bust Out XP (0-10000)
  const { data: bustXpRaw } = useReadContract({
    address: addresses.bustOutSkill,
    abi: BUSTOUT_SKILL_ABI,
    functionName: "getSkillXp",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled },
  });

  if (!isConnected) return null;

  // Rank XP: level-based ranges
  const rankLevel = rankLevelRaw !== undefined ? Number(rankLevelRaw) : null;
  const rankXp = rankXpRaw !== undefined ? Number(rankXpRaw) : null;
  const rankPercent = (() => {
    if (rankLevel === null || rankXp === null) return null;
    const currentLevelXp = RANK_XP[rankLevel - 1] ?? 0;
    const nextLevelXp = RANK_XP[rankLevel];
    if (nextLevelXp === undefined) return 100;
    const range = nextLevelXp - currentLevelXp;
    if (range <= 0) return 100;
    return Math.min(100, Math.max(0, ((rankXp - currentLevelXp) / range) * 100));
  })();

  // Other XPs: 0 to 1,000,000 scale -> 0-100%
  const toPercent = (raw: unknown): number | null => {
    if (raw === undefined) return null;
    const val = Number(raw);
    return Math.min(100, Math.max(0, (val / 1_000_000) * 100));
  };

  const killPercent = toPercent(killXpRaw);

  const racePercent = raceXpRaw !== undefined
    ? Math.min(100, Math.max(0, (Number(raceXpRaw) / 500000) * 100))
    : null;
  const bustPercent = toPercent(bustXpRaw);

  const bars: { label: string; percent: number | null; color: string }[] = [
    { label: "Rank", percent: rankPercent, color: "bg-primary" },
    { label: "Kill", percent: killPercent, color: "bg-red-500" },
    { label: "Race", percent: racePercent, color: "bg-cyan-500" },
    { label: "Bust", percent: bustPercent, color: "bg-amber-500" },
  ];

  const fmtPercent = (p: number | null): string => {
    if (p === null) return "...";
    if (p >= 10) return `${Math.round(p)}%`;
    if (p >= 1) return `${p.toFixed(1)}%`;
    if (p >= 0.01) return `${p.toFixed(2)}%`;
    return `${p.toFixed(4)}%`;
  };

  const rankBar = bars[0];
  return (
    <div className="relative group">
      {/* Always-visible: Rank XP */}
      <div
        className="flex cursor-default items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-secondary/50"
        title={`${rankBar.label} XP: ${fmtPercent(rankBar.percent)} — hover for all XP`}
      >
        <span className="text-[10px] font-medium text-muted-foreground/70 w-7 text-right">
          {rankBar.label}
        </span>
        <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", rankBar.color)}
            style={{ width: rankBar.percent !== null ? `${Math.max(rankBar.percent, 0.5)}%` : "0%" }}
          />
        </div>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground w-12">
          {fmtPercent(rankBar.percent)}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground/50 transition-transform group-hover:rotate-180" />
      </div>

      {/* Dropdown: all 4 XP bars */}
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-border bg-card p-3 opacity-0 shadow-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Experience Points
        </p>
        <div className="flex flex-col gap-2">
          {bars.map((bar) => (
            <div
              key={bar.label}
              className="flex items-center gap-2"
              title={`${bar.label} XP: ${fmtPercent(bar.percent)}`}
            >
              <span className="text-[10px] font-medium text-muted-foreground/70 w-7 text-right">
                {bar.label}
              </span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", bar.color)}
                  style={{ width: bar.percent !== null ? `${Math.max(bar.percent, 0.5)}%` : "0%" }}
                />
              </div>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground w-12 text-right">
                {fmtPercent(bar.percent)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function JailIndicator({ onGoToJail }: { onGoToJail: () => void }) {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();

  const { data: jailedUntilRaw } = useReadContract({
    address: addresses.jail,
    abi: JAIL_CONTRACT_ABI,
    functionName: "jailedUntil",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });

  const now = Math.floor(Date.now() / 1000);
  const jailedUntil = jailedUntilRaw !== undefined ? Number(jailedUntilRaw) : 0;
  const isInJail = isConnected && jailedUntil > now;

  if (!isConnected) return null;

  if (isInJail) {
    return (
      <button
        onClick={onGoToJail}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 text-red-400 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/20 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
        title="You are in jail! Click to view."
      >
        <ShieldAlert className="h-4 w-4" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      </button>
    );
  }

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400"
      title="You are free"
    >
      <CheckCircle2 className="h-4 w-4" />
    </div>
  );
}

function SafehouseIndicator({ onGoToSafehouse }: { onGoToSafehouse: () => void }) {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { authData } = useAuth();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data: userInfoRaw } = useReadContract({
    address: addresses.safehouse,
    abi: SAFEHOUSE_ABI,
    functionName: "getUserInfo",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address, refetchInterval: 15000 },
  });

  const safeUntilTs =
    userInfoRaw !== undefined
      ? Number((userInfoRaw as { safeUntil: bigint }).safeUntil)
      : 0;
  const isInSafehouse = isConnected && safeUntilTs > Math.floor(Date.now() / 1000);

  useEffect(() => {
    if (!isInSafehouse || !safeUntilTs) {
      setTimeLeft(null);
      return;
    }
    function tick() {
      const now = Math.floor(Date.now() / 1000);
      const remaining = safeUntilTs - now;
      setTimeLeft(remaining > 0 ? remaining : 0);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isInSafehouse, safeUntilTs]);

  if (!isConnected || !isInSafehouse || timeLeft === null || timeLeft <= 0) return null;

  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;
  const display = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;

  return (
    <button
      onClick={onGoToSafehouse}
      className="relative flex h-8 items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 text-cyan-300 transition-all duration-200 hover:border-cyan-500/40 hover:bg-cyan-500/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
      title="You are in the safehouse"
    >
      <Shield className="h-3.5 w-3.5" />
      <span className="font-mono text-[11px] font-semibold tabular-nums">{display}</span>
      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
      </span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────
// Rank Activation Indicator (top-bar warning / green badge)
// ────────────────────────────────────────────────────────────────
function RankActivationIndicator({ onGoToRank }: { onGoToRank: () => void }) {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();

  // Read rank level from RANK_ABI
  const { data: rankLevelRaw } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankLevel",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  // Read whether the user's rank is currently activated
  const { data: isActiveRaw } = useReadContract({
    address: addresses.rankStake,
    abi: RANK_STAKE_ABI,
    functionName: "isUserRankActive",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address, refetchInterval: 30000 },
  });

  const rankLevel = rankLevelRaw !== undefined ? Number(rankLevelRaw) : null;
  const isActive = isActiveRaw === true;

  // Don't render anything until connected and data is loaded
  if (!isConnected || rankLevel === null) return null;

  const rankName = RANK_NAMES[rankLevel] ?? `Rank ${rankLevel}`;

  if (isActive) {
    return (
      <button
        onClick={onGoToRank}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 text-emerald-300 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        title={`Rank active: ${rankName}`}
      >
        <Shield className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold">{rankName}</span>
        <CheckCircle2 className="h-3 w-3" />
      </button>
    );
  }

  // Not active -- show warning
  return (
    <button
      onClick={onGoToRank}
      className="relative flex h-8 items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 text-red-300 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
      title={`Rank NOT active: ${rankName} -- Stake to activate!`}
    >
      <ShieldAlert className="h-3.5 w-3.5" />
      <span className="text-[11px] font-semibold">Rank Inactive</span>
      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────
// Desktop sidebar nav section
// ────────────────────────────────────────────────────────────────
function SidebarSection({
  label,
  items,
  activeTab,
  cooldowns,
  isOpen,
  onToggle,
}: {
  label: string;
  items: readonly NavItem[];
  activeTab: Tab;
  cooldowns: CooldownMap;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.035]"
        aria-expanded={isOpen}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 transition-colors group-hover:text-foreground/80">
          {label}
        </span>
        <span className="h-px flex-1 bg-border/70" />
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground/50 transition-transform", isOpen && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows,opacity] duration-200", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-60")}>
        <div className="min-h-0 overflow-hidden">
        <div className="flex flex-col gap-0.5 pb-1">
        {items.map((item) => {
          const cd = cooldowns[item.id];
          return (
            <Link
              key={item.id}
              href={getTabUrl(item.id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                activeTab === item.id
                  ? "bg-primary/[0.12] text-primary shadow-[inset_0_0_0_1px_rgb(var(--chain-accent)/0.12)]"
                  : "text-muted-foreground hover:bg-white/[0.045] hover:text-foreground",
              )}
            >
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors", activeTab === item.id ? "bg-primary/15" : "bg-white/[0.025] group-hover:bg-white/[0.06]")}>
                {item.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
              {cd ? (
                <span
                  title={cd.title}
                  className={cn(
                    "shrink-0 font-mono text-[10px] tabular-nums",
                    item.id === "jail" ? "text-red-500 font-semibold" : "text-amber-400/80",
                  )}
                >
                  {cd.label}
                </span>
              ) : null}
            </Link>
          );
        })}
        </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Desktop Sidebar (exported for page.tsx)
// ──���───────────────────────────────────────��──���──────────────────
export function Sidebar({
  activeTab,
  cooldowns,
}: {
  activeTab: Tab;
  cooldowns: CooldownMap;
}) {
  const cityName = useCityName();
  const sections = buildNavigationSections(cityName);
  const activeSection = sections.find((section) => section.items.some((item) => item.id === activeTab))?.label;
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(activeSection ? [activeSection] : ["Crime"]));

  const toggleSection = (label: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <aside className="relative hidden w-64 shrink-0 flex-col border-r border-border/80 bg-card/45 lg:flex">
      <div className="flex h-[57px] items-center border-b border-border/70 px-4">
        <Link href="/" className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-primary/20 bg-primary/[0.08] text-primary shadow-[0_0_24px_rgb(var(--chain-accent)/0.08)]">
            <Shield className="h-4 w-4" />
            <span className="absolute inset-x-1 bottom-1 h-px bg-primary/40" />
          </div>
          <p className="text-[15px] font-bold tracking-[-0.02em] text-foreground">PLAYMAFIA</p>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3 sidebar-scroll">
        {sections.map((section) => (
          <SidebarSection
            key={section.label}
            label={section.label}
            items={section.items}
            activeTab={activeTab}
            cooldowns={cooldowns}
            isOpen={openSections.has(section.label) || activeSection === section.label}
            onToggle={() => toggleSection(section.label)}
          />
        ))}

        {/* Profile */}
        <div className="mt-2 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Account
          </span>
        </div>
        <Link
          href="/my-profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
            activeTab === "my-profile"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
          )}
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-white/[0.025]"><User className="h-4 w-4" /></span>
          My Profile
        </Link>
      </div>
      <div className="border-t border-border/70 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]" />
          Network operations online
        </div>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────
// TopBar (exported for page.tsx)
// ────────────────────────────────────────────────────────────────
export function TopBar({
  activeTab,
  cooldowns,
}: {
  activeTab: Tab;
  cooldowns: CooldownMap;
}) {
  const router = useRouter();
  const { activeChain, chainConfig, setActiveChain } = useChain();
  const addresses = useChainAddresses();
  const [chainOpen, setChainOpen] = useState(false);
  const chainRef = useRef<HTMLDivElement>(null);
  const navigateTo = (tab: Tab) => {
    router.push(getTabUrl(tab));
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (chainRef.current && !chainRef.current.contains(e.target as Node)) {
        setChainOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-2xl">
      {/* Desktop */}
      <div className="hidden h-[57px] min-w-0 items-center gap-3 px-4 lg:flex">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="hidden shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55 2xl:inline">Balances</span>
          <div className="sidebar-scroll flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            <AssetBalanceItem label="Cash" icon={<DollarSign className="h-3 w-3" />} contractAddress={addresses.ingameCurrency} href="/cash" />
            <AssetBalanceItem label="Bullets" icon={<Zap className="h-3 w-3" />} contractAddress={addresses.bullets} contractAbi={BULLET_ABI} fnName="balanceOf" />
            <AssetBalanceItem label="Health" icon={<Heart className="h-3 w-3" />} contractAddress={addresses.health} contractAbi={HEALTH_ABI} fnName="balanceOf" />
            <AssetBalanceItem label="Credits" icon={<CreditCard className="h-3 w-3" />} contractAddress={addresses.buyCredit} contractAbi={CREDITS_ABI} fnName="balanceOf" />
            <AssetBalanceItem label="GI Credits" icon={<Coins className="h-3 w-3" />} contractAddress={addresses.giCredits} contractAbi={GI_CREDITS_ABI} fnName="balanceOf" />
          </div>
          <div className="h-6 w-px shrink-0 bg-border/70" />
          <XpBars />
        </div>

        <div className="h-6 w-px shrink-0 bg-border/70" />

        <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center gap-1" aria-label="Player status">
              <RankActivationIndicator onGoToRank={() => navigateTo("rank-activation")} />
              <SafehouseIndicator onGoToSafehouse={() => navigateTo("biz-safehouse")} />
              <JailIndicator onGoToJail={() => navigateTo("jail")} />
            </div>

            <div className="mx-1 h-5 w-px bg-border/70" />

            <div className="flex items-center gap-1.5" aria-label="Player account">
              <UsernameLabel onNavigate={() => navigateTo("my-profile")} />
              <WalletControl />
            </div>

            <div className="mx-1 h-5 w-px bg-border/70" />

            <div ref={chainRef} className="relative">
              <button
                onClick={() => setChainOpen((prev) => !prev)}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-lg border border-transparent px-2.5 text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  activeChain === "bnb"
                    ? "bg-yellow-500/[0.08] text-yellow-500 hover:border-yellow-500/20 hover:bg-yellow-500/15"
                    : "bg-purple-500/[0.08] text-purple-400 hover:border-purple-500/20 hover:bg-purple-500/15",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", activeChain === "bnb" ? "bg-yellow-500" : "bg-purple-500")} />
                {chainConfig.label}
                <ChevronDown className={cn("h-3 w-3 transition-transform", chainOpen && "rotate-180")} />
              </button>

              {chainOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/20">
                  {(Object.keys(CHAIN_CONFIGS) as ChainId[]).map((chainId) => {
                    const cfg = CHAIN_CONFIGS[chainId];
                    const isActive = activeChain === chainId;
                    return (
                      <button
                        key={chainId}
                        onClick={() => { setActiveChain(chainId); setChainOpen(false); }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          isActive
                            ? chainId === "bnb" ? "bg-yellow-500/10 text-yellow-500" : "bg-purple-500/10 text-purple-400"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full", chainId === "bnb" ? "bg-yellow-500" : "bg-purple-500")} />
                        {cfg.label}
                        {isActive && <CheckCircle2 className="ml-auto h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
        </div>
      </div>

      {/* ===== MOBILE HEADER ===== */}
      <MobileHeader activeTab={activeTab} cooldowns={cooldowns} />
    </header>
  );
}

// ────────────────────────────────────────────────────────────────
// Mobile header + expandable menu
// ───────────────────────────────────────────────────────────��────
function MobileHeader({
  activeTab,
  cooldowns,
}: {
  activeTab: Tab;
  cooldowns: CooldownMap;
}) {
  const router = useRouter();
  const { activeChain, chainConfig, setActiveChain } = useChain();
  const addresses = useChainAddresses();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileChainOpen, setMobileChainOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [mobileAssetsOpen, setMobileAssetsOpen] = useState(false);
  const cityName = useCityName();
  const sections = buildNavigationSections(cityName);

  const handleMobileNav = (tab: Tab) => {
    router.push(getTabUrl(tab));
    setMobileOpen(false);
    setExpandedSection(null);
    setMobileAssetsOpen(false);
  };

  const getActiveLabel = (): string => {
    for (const section of sections) {
      const found = section.items.find((t) => t.id === activeTab);
      if (found) return found.label;
    }
    if (activeTab === "cash") return "Cash";
    if (activeTab === "my-profile") return "Profile";
    return "Menu";
  };

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="flex h-16 items-center gap-3 px-4">
        <Link href="/" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary">
          <Shield className="h-[18px] w-[18px]" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">Playmafia</p>
          <p className="truncate text-sm font-semibold text-foreground">{getActiveLabel()}</p>
        </div>
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-foreground transition-all active:scale-95", mobileOpen ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 bg-card/70 hover:bg-secondary")}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="sidebar-scroll flex items-center gap-2 overflow-x-auto border-t border-border/60 bg-card/30 px-4 py-2">
        <UsernameLabel onNavigate={() => handleMobileNav("my-profile")} />
        <RankActivationIndicator onGoToRank={() => handleMobileNav("rank-activation")} />
        <SafehouseIndicator onGoToSafehouse={() => handleMobileNav("biz-safehouse")} />
        <JailIndicator onGoToJail={() => handleMobileNav("jail")} />
        <div className="ml-auto shrink-0"><WalletControl /></div>
      </div>

      {/* Expandable mobile menu */}
      {mobileOpen && (
        <div className="max-h-[calc(100dvh-109px)] overflow-y-auto border-t border-border bg-background/98 px-4 pb-5 shadow-2xl sidebar-scroll">
          <div className="mb-2 flex items-center gap-2 py-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operations directory</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Sections */}
          {sections.map((section) => (
            <div key={section.label} className="mb-2">
              <button
                onClick={() =>
                  setExpandedSection(expandedSection === section.label ? null : section.label)
                }
                className="mb-1.5 flex w-full items-center justify-between px-2"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform",
                    expandedSection === section.label && "rotate-180",
                  )}
                />
              </button>
              {expandedSection === section.label && (
                <div className="grid grid-cols-3 gap-1.5">
                  {section.items.map((tab) => {
                    const cd = cooldowns[tab.id];
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleMobileNav(tab.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-all relative",
                          activeTab === tab.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {tab.icon}
                        <span className="text-center leading-tight">{tab.label}</span>
                        {cd ? (
                          <span
                            title={cd.title}
                            className={cn(
                              "font-mono text-[9px] tabular-nums",
                              tab.id === "jail" ? "text-red-500 font-semibold" : "text-amber-400",
                            )}
                          >
                            {cd.label}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Assets */}
          <div className="mb-2">
            <button
              onClick={() => setMobileAssetsOpen((prev) => !prev)}
              className="mb-1.5 flex w-full items-center justify-between px-2"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assets
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-transform",
                  mobileAssetsOpen && "rotate-180",
                )}
              />
            </button>
            {mobileAssetsOpen && (
              <div className="rounded-lg border border-border bg-card p-1.5">
                <AssetBalanceItem
                  label="Cash"
                  icon={<DollarSign className="h-3.5 w-3.5" />}
                  contractAddress={addresses.ingameCurrency}
                  href="/cash"
                />
                <AssetBalanceItem
                  label="Bullets"
                  icon={<Zap className="h-3.5 w-3.5" />}
                  contractAddress={addresses.bullets}
                  contractAbi={BULLET_ABI}
                  fnName="balanceOf"
                />
                <AssetBalanceItem
                  label="Health"
                  icon={<Heart className="h-3.5 w-3.5" />}
                  contractAddress={addresses.health}
                  contractAbi={HEALTH_ABI}
                  fnName="balanceOf"
                />
                <AssetBalanceItem
                  label="Credits"
                  icon={<CreditCard className="h-3.5 w-3.5" />}
                  contractAddress={addresses.buyCredit}
                  contractAbi={CREDITS_ABI}
                  fnName="balanceOf"
                />
                <AssetBalanceItem
                  label="GI Credits"
                  icon={<Coins className="h-3.5 w-3.5" />}
                  contractAddress={addresses.giCredits}
                  contractAbi={GI_CREDITS_ABI}
                  fnName="balanceOf"
                />
              </div>
            )}
          </div>

          {/* Profile + Chain */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Link
              href="/my-profile"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                activeTab === "my-profile"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary",
              )}
            >
              <User className="h-3.5 w-3.5" />
              Profile
            </Link>
            <div className="relative flex-1">
              <button
                onClick={() => setMobileChainOpen((prev) => !prev)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all border",
                  activeChain === "bnb"
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                    : "border-purple-500/30 bg-purple-500/10 text-purple-400",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", activeChain === "bnb" ? "bg-yellow-500" : "bg-purple-500")} />
                {chainConfig.label}
                <ChevronDown className={cn("h-3 w-3 transition-transform", mobileChainOpen && "rotate-180")} />
              </button>
              {mobileChainOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-full rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/20 z-50">
                  {(Object.keys(CHAIN_CONFIGS) as ChainId[]).map((chainId) => {
                    const cfg = CHAIN_CONFIGS[chainId];
                    const isActive = activeChain === chainId;
                    return (
                      <button
                        key={chainId}
                        onClick={() => { setActiveChain(chainId); setMobileChainOpen(false); }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          isActive
                            ? chainId === "bnb" ? "bg-yellow-500/10 text-yellow-500" : "bg-purple-500/10 text-purple-400"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full", chainId === "bnb" ? "bg-yellow-500" : "bg-purple-500")} />
                        {cfg.label}
                        {isActive && <CheckCircle2 className="ml-auto h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
