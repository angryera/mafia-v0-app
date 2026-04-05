"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatEther, type Abi } from "viem";
import {
  GI_CREDITS_ABI,
  CONTRACT_ABI,
  NICKCAR_CONTRACT_ABI,
  TRAVEL_CONTRACT_ABI,
  BULLET_FACTORY_ABI,
  HOSPITAL_CONTRACT_ABI,
  SHOP_CONTRACT_ABI,
  JAIL_CONTRACT_ABI,
  SAFEHOUSE_ABI,
  KILLSKILL_CONTRACT_ABI,
  CAR_CRUSHER_ABI,
  BULLET_ABI,
  HEALTH_ABI,
  CREDITS_ABI,
  INGAME_CURRENCY_ABI,
  USER_PROFILE_CONTRACT_ABI,
  RANK_ABI,
  RACE_XP_ABI,
  RANK_XP,
  RANK_STAKE_ABI,
  RANK_NAMES,
  CHAIN_CONFIGS,
  TRAVEL_DESTINATIONS,
  type ChainId,
} from "@/lib/contract";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  Crosshair,
  Plane,
  Car,
  Swords,
  Lock,
  Bot,
  ChevronDown,
  Key,
  Sparkles,
  Package,
  Crown,
  Trophy,
  Coins,
  User,
  DollarSign,
  Zap,
  CreditCard,
  Heart,
  Store,
  Stethoscope,
  Factory,
  Search,
  Wrench,
  Landmark,
  Building2,
  FileText,
  Menu,
  X,
  BoxSelect,
  Gift,
  Dices,
  Cherry,
  Warehouse,
  Home,
  Map,
  TrendingUp,
  Users,
  Beer,
  Pill,
  UserPlus,
  Target,
  BookOpen,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────
// Tab type (exported for page.tsx)
// ────────────────────────────────────────────────────────────────
export type Tab =
  | "crime"
  | "organized-crime"
  | "travel"
  | "nickcar"
  | "killskill"
  | "jail"
  | "helperbots"
  | "buy-helper-credits"
  | "buy-keys"
  | "buy-perk-boxes"
  | "buy-premium"
  | "buy-gi-credits"
  | "my-profile"
  | "worth"
  | "cash"
  | "biz-shop"
  | "biz-hospital"
  | "biz-bulletfactory"
  | "biz-detective-agency"
  | "biz-car-crusher"
  | "biz-bank"
  | "biz-roulette"
  | "biz-slotmachine"
  | "biz-jackpot"
  | "biz-safehouse"
  | "biz-booze"
  | "biz-narcs"
  | "city-map"
  | "garage"
  | "open-crate"
  | "open-perkbox"
  | "mystery-box"
  | "rank-activation"
  | "bodyguard-training"
  | "equipment"
  | "players"
  | "families"
  | "info"
  | "exchange-convert"
  | "referral"
  | "weekly-missions"
  | "story-mode"
  | "xp-market"
  | "marketplace"
  | "racing"
  | "create-profile";

type NavItem = { id: Tab; label: string; icon: React.ReactNode };

// Map tab IDs to URL paths
export function getTabUrl(tab: Tab): string {
  if (tab === "crime") return "/";
  return `/${tab}`;
}

// Map URL paths to tab IDs
export function getTabFromPath(pathname: string): Tab {
  if (pathname === "/" || pathname === "") return "crime";
  const path = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  // Get the first segment of the path (before any / for nested routes)
  const firstSegment = path.split("/")[0];
  // Check if it's a valid tab
  const validTabs: Tab[] = [
    "crime", "organized-crime", "travel", "nickcar", "killskill", "jail", "helperbots",
    "buy-helper-credits", "buy-keys", "buy-perk-boxes", "buy-premium", "buy-gi-credits",
    "my-profile", "worth", "cash", "biz-shop", "biz-hospital", "biz-bulletfactory",
    "biz-detective-agency", "biz-car-crusher", "biz-bank", "biz-roulette",
    "biz-slotmachine", "biz-jackpot", "biz-safehouse", "biz-booze", "biz-narcs",
    "city-map", "garage", "open-crate", "open-perkbox", "mystery-box", "rank-activation",
    "bodyguard-training", "equipment", "players", "families", "info", "exchange-convert", "referral",
    "weekly-missions", "story-mode", "xp-market", "marketplace", "racing", "create-profile"
  ];
  return validTabs.includes(firstSegment as Tab) ? (firstSegment as Tab) : "crime";
}

// ────────────────────────────────────────────────────────────────
// Sidebar sections
// ────────────────────────────────────────────────────────────────
const CRIME_SECTION: NavItem[] = [
  { id: "crime", label: "Crime", icon: <Crosshair className="h-4 w-4" /> },
  { id: "organized-crime", label: "Organized Crime", icon: <Users className="h-4 w-4" /> },
  { id: "nickcar", label: "Nick a Car", icon: <Car className="h-4 w-4" /> },
  { id: "killskill", label: "Kill Skill", icon: <Swords className="h-4 w-4" /> },
  { id: "racing", label: "Racing", icon: <Flag className="h-4 w-4" /> },
  { id: "travel", label: "Travel", icon: <Plane className="h-4 w-4" /> },
  { id: "jail", label: "Jail", icon: <Lock className="h-4 w-4" /> },
  { id: "helperbots", label: "Helper Bots", icon: <Bot className="h-4 w-4" /> },
];

const CITY_SECTION: NavItem[] = [
  { id: "city-map", label: "City Map", icon: <Map className="h-4 w-4" /> },
  { id: "garage", label: "Garage", icon: <Warehouse className="h-4 w-4" /> },
  { id: "biz-safehouse", label: "Safehouse", icon: <Home className="h-4 w-4" /> },
  { id: "biz-booze", label: "Booze Warehouse", icon: <Beer className="h-4 w-4" /> },
  { id: "biz-narcs", label: "Narcotics Warehouse", icon: <Pill className="h-4 w-4" /> },
  { id: "biz-roulette", label: "Roulette", icon: <Dices className="h-4 w-4" /> },
  { id: "biz-slotmachine", label: "Slot Machine", icon: <Cherry className="h-4 w-4" /> },
  { id: "biz-jackpot", label: "Jackpot", icon: <Trophy className="h-4 w-4" /> },
  { id: "biz-detective-agency", label: "Detective Agency", icon: <Search className="h-4 w-4" /> },
  { id: "biz-bank", label: "Bank", icon: <Landmark className="h-4 w-4" /> },
  { id: "biz-bulletfactory", label: "Bullet Factory", icon: <Factory className="h-4 w-4" /> },
  { id: "biz-car-crusher", label: "Car Crusher", icon: <Wrench className="h-4 w-4" /> },
  { id: "biz-shop", label: "Shop", icon: <Store className="h-4 w-4" /> },
  { id: "biz-hospital", label: "Hospital", icon: <Stethoscope className="h-4 w-4" /> },
];

const GAME_SECTION: NavItem[] = [
  { id: "story-mode", label: "Story Mode", icon: <BookOpen className="h-4 w-4" /> },
  { id: "weekly-missions", label: "Weekly Missions", icon: <Target className="h-4 w-4" /> },
  { id: "worth", label: "Player Worth", icon: <DollarSign className="h-4 w-4" /> },
  { id: "rank-activation", label: "Rank Activation", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "bodyguard-training", label: "Bodyguard Training", icon: <Shield className="h-4 w-4" /> },
  { id: "equipment", label: "Equipment", icon: <Swords className="h-4 w-4" /> },
  { id: "exchange-convert", label: "Exchange Convert", icon: <Coins className="h-4 w-4" /> },
  { id: "xp-market", label: "XP Market", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "marketplace", label: "Marketplace", icon: <Store className="h-4 w-4" /> },
  { id: "referral", label: "Referral", icon: <UserPlus className="h-4 w-4" /> },
  { id: "players", label: "Players", icon: <Users className="h-4 w-4" /> },
  { id: "families", label: "Families", icon: <Building2 className="h-4 w-4" /> },
  { id: "info", label: "Contracts", icon: <FileText className="h-4 w-4" /> },
  { id: "open-crate", label: "Open Crate", icon: <BoxSelect className="h-4 w-4" /> },
  { id: "open-perkbox", label: "Open Perk Box", icon: <Gift className="h-4 w-4" /> },
  { id: "mystery-box", label: "Mystery Box", icon: <Sparkles className="h-4 w-4" /> },
];

const BUY_SECTION: NavItem[] = [
  { id: "buy-helper-credits", label: "Helper Credits", icon: <Sparkles className="h-4 w-4" /> },
  { id: "buy-keys", label: "Keys", icon: <Key className="h-4 w-4" /> },
  { id: "buy-perk-boxes", label: "Perk Boxes", icon: <Package className="h-4 w-4" /> },
  { id: "buy-gi-credits", label: "GI Credits", icon: <Coins className="h-4 w-4" /> },
  { id: "buy-premium", label: "Premium", icon: <Crown className="h-4 w-4" /> },
];

function buildSections(cityLabel: string | null) {
  return [
    { label: "Crime", items: CRIME_SECTION },
    { label: cityLabel ?? "City", items: CITY_SECTION },
    { label: "Game", items: GAME_SECTION },
    { label: "Buy", items: BUY_SECTION },
  ];
}

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
      className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-1.5 transition-colors hover:bg-secondary active:scale-95"
      title="View profile"
    >
      <User className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-foreground">{username}</span>
    </button>
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
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getBustOutXp",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled },
  });

  if (!isConnected) return null;

  // Rank XP: level-based ranges
  const rankLevel = rankLevelRaw !== undefined ? Number(rankLevelRaw) : null;
  const rankXp = rankXpRaw !== undefined ? Number(rankXpRaw) : null;
  const rankPercent = (() => {
    if (rankLevel === null || rankXp === null) return null;
    const currentLevelXp = RANK_XP[rankLevel-1] ?? 0;
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
    ? Math.min(100, Math.max(0, (Number(raceXpRaw) / 5000) * 100))
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
  const secondaryBars = bars.slice(1);

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
        className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-500 transition-all duration-200 hover:bg-red-500/25 active:scale-95"
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
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500"
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
      className="relative flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-2.5 py-1.5 text-cyan-400 transition-all duration-200 hover:bg-cyan-500/25 active:scale-95"
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
        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-emerald-400 transition-all duration-200 hover:bg-emerald-500/25 active:scale-95"
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
      className="relative flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-red-400 transition-all duration-200 hover:bg-red-500/25 active:scale-95"
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
// Cooldown hook: reads all action cooldowns from contracts
// ────────────────��───────────────────────────────────────────────
type CooldownMap = Record<string, { seconds: number; label: string }>;

function formatCooldown(secs: number): string {
  if (secs <= 0) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useCooldowns(): CooldownMap {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const enabled = isConnected && !!address;

  const contracts = useMemo(() => {
    if (!address) return [];
    return [
      { address: addresses.crime, abi: CONTRACT_ABI, functionName: "nextCrimeTime", args: [address] },           // 0
      { address: addresses.nickcar, abi: NICKCAR_CONTRACT_ABI, functionName: "nextNickTime", args: [address] },   // 1
      { address: addresses.travel, abi: TRAVEL_CONTRACT_ABI, functionName: "userTravelInfo", args: [address] },   // 2
      { address: addresses.jail, abi: JAIL_CONTRACT_ABI, functionName: "jailedUntil", args: [address] },          // 3
      { address: addresses.killskill, abi: KILLSKILL_CONTRACT_ABI, functionName: "nextTrainTime", args: [address] }, // 4
      { address: addresses.bulletFactory, abi: BULLET_FACTORY_ABI, functionName: "nextBuyTime", args: [address] },// 5
      { address: addresses.hospital, abi: HOSPITAL_CONTRACT_ABI, functionName: "nextBuyTime", args: [address] },  // 6
      { address: addresses.shop, abi: SHOP_CONTRACT_ABI, functionName: "nextBuyTime", args: [address] },          // 7
      { address: addresses.carCrusher, abi: CAR_CRUSHER_ABI, functionName: "nextCrushTime", args: [address] },   // 8
    ];
  }, [address, addresses]);

  const { data: results } = useReadContracts({
    contracts: contracts as any,
    query: { enabled, refetchInterval: 10_000 },
  });

  const [cooldowns, setCooldowns] = useState<CooldownMap>({});

  useEffect(() => {
    if (!results || !enabled) {
      setCooldowns({});
      return;
    }

    const calcRemaining = (timestamp: bigint | number | undefined): number => {
      if (timestamp === undefined) return 0;
      const target = Number(timestamp) * 1000;
      const diff = target - Date.now();
      return diff > 0 ? Math.ceil(diff / 1000) : 0;
    };

    const tick = () => {
      const map: CooldownMap = {};

      // 0: Crime - nextCrimeTime
      if (results[0]?.status === "success") {
        const s = calcRemaining(results[0].result as bigint);
        if (s > 0) map["crime"] = { seconds: s, label: formatCooldown(s) };
      }

      // 1: Nick a car - nextNickTime
      if (results[1]?.status === "success") {
        const s = calcRemaining(results[1].result as bigint);
        if (s > 0) map["nickcar"] = { seconds: s, label: formatCooldown(s) };
      }

      // 2: Travel - userTravelInfo returns { travelUntil }
      if (results[2]?.status === "success") {
        const info = results[2].result as { travelUntil: bigint } | undefined;
        if (info) {
          const s = calcRemaining(info.travelUntil);
          if (s > 0) map["travel"] = { seconds: s, label: formatCooldown(s) };
        }
      }

      // 3: Jail - jailedUntil
      if (results[3]?.status === "success") {
        const s = calcRemaining(results[3].result as bigint);
        if (s > 0) map["jail"] = { seconds: s, label: formatCooldown(s) };
      }

      // 4: Kill Skill - nextTrainTime
      if (results[4]?.status === "success") {
        const s = calcRemaining(results[4].result as bigint);
        if (s > 0) map["killskill"] = { seconds: s, label: formatCooldown(s) };
      }

      // 5: Bulletfactory - nextBuyTime
      if (results[5]?.status === "success") {
        const s = calcRemaining(results[5].result as bigint);
        if (s > 0) map["biz-bulletfactory"] = { seconds: s, label: formatCooldown(s) };
      }

      // 6: Hospital - nextBuyTime
      if (results[6]?.status === "success") {
        const s = calcRemaining(results[6].result as bigint);
        if (s > 0) map["biz-hospital"] = { seconds: s, label: formatCooldown(s) };
      }

      // 7: Shop - nextBuyTime  
      if (results[7]?.status === "success") {
        const s = calcRemaining(results[7].result as bigint);
        if (s > 0) map["biz-shop"] = { seconds: s, label: formatCooldown(s) };
      }

      // 8: Car Crusher - nextCrushTime
      if (results[8]?.status === "success") {
        const s = calcRemaining(results[8].result as bigint);
        if (s > 0) map["biz-car-crusher"] = { seconds: s, label: formatCooldown(s) };
      }

      setCooldowns(map);
    };

    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [results, enabled]);

  return cooldowns;
}

// ────────────────────────────────────────────────────────────────
// Desktop sidebar nav section
// ────────────────────────────────────────────────────────────────
function SidebarSection({
  label,
  items,
  activeTab,
  cooldowns,
}: {
  label: string;
  items: NavItem[];
  activeTab: Tab;
  cooldowns: CooldownMap;
}) {
  return (
    <div className="mb-1">
      <div className="px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const cd = cooldowns[item.id];
          return (
            <Link
              key={item.id}
              href={getTabUrl(item.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                activeTab === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
              )}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {cd ? (
                <span className={cn(
                  "font-mono text-[10px] tabular-nums",
                  item.id === "jail" ? "text-red-500 font-semibold" : "text-amber-400/80",
                )}>
                  {cd.label}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Desktop Sidebar (exported for page.tsx)
// ──���───────────────────────────────────────��──���──────────────────
export function Sidebar({
  activeTab,
}: {
  activeTab: Tab;
}) {
  const cityName = useCityName();
  const sections = buildSections(cityName);
  const cooldowns = useCooldowns();

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex-1 overflow-y-auto py-3 px-2 sidebar-scroll">
        {sections.map((section) => (
          <SidebarSection
            key={section.label}
            label={section.label}
            items={section.items}
            activeTab={activeTab}
            cooldowns={cooldowns}
          />
        ))}

        {/* Profile */}
        <div className="mt-1 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Account
          </span>
        </div>
        <Link
          href="/my-profile"
          className={cn(
            "mx-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
            activeTab === "my-profile"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
          )}
        >
          <User className="h-4 w-4" />
          My Profile
        </Link>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────
// TopBar (exported for page.tsx)
// ────────────────────────────────────────────────────────────────
export function TopBar({
  activeTab,
}: {
  activeTab: Tab;
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
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      {/* Desktop */}
      <div className="hidden lg:flex items-center gap-4 px-4 py-2.5">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 mr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-foreground">
            Playmafia
          </h1>
        </Link>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Inline asset balances */}
        <div className="flex flex-1 items-center gap-1">
          <AssetBalanceItem
            label="Cash"
            icon={<DollarSign className="h-3 w-3" />}
            contractAddress={addresses.ingameCurrency}
            href="/cash"
          />
          <AssetBalanceItem
            label="Bullets"
            icon={<Zap className="h-3 w-3" />}
            contractAddress={addresses.bullets}
            contractAbi={BULLET_ABI}
            fnName="balanceOf"
          />
          <AssetBalanceItem
            label="Health"
            icon={<Heart className="h-3 w-3" />}
            contractAddress={addresses.health}
            contractAbi={HEALTH_ABI}
            fnName="balanceOf"
          />
          <AssetBalanceItem
            label="Credits"
            icon={<CreditCard className="h-3 w-3" />}
            contractAddress={addresses.buyCredit}
            contractAbi={CREDITS_ABI}
            fnName="balanceOf"
          />
          <AssetBalanceItem
            label="GI Credits"
            icon={<Coins className="h-3 w-3" />}
            contractAddress={addresses.giCredits}
            contractAbi={GI_CREDITS_ABI}
            fnName="balanceOf"
          />
        </div>

        {/* XP Bars */}
        <div className="h-6 w-px bg-border" />
        <XpBars />

        {/* Right side: jail, username, wallet, chain */}
        <div className="flex shrink-0 items-center gap-2">
          <RankActivationIndicator onGoToRank={() => navigateTo("rank-activation")} />
          <SafehouseIndicator onGoToSafehouse={() => navigateTo("biz-safehouse")} />
          <JailIndicator onGoToJail={() => navigateTo("jail")} />
          <UsernameLabel onNavigate={() => navigateTo("my-profile")} />
          <ConnectButton accountStatus="address" chainStatus="none" showBalance={false} />

          {/* Chain Switcher */}
          <div ref={chainRef} className="relative">
            <button
              onClick={() => setChainOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border",
                activeChain === "bnb"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                  : "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", activeChain === "bnb" ? "bg-yellow-500" : "bg-purple-500")} />
              {chainConfig.label}
              <ChevronDown className={cn("h-3 w-3 transition-transform", chainOpen && "rotate-180")} />
            </button>

            {chainOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/20 z-50">
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
      <MobileHeader activeTab={activeTab} />
    </header>
  );
}

// ────────────────────────────────────────────────────────────────
// Mobile header + expandable menu
// ───────────────────────────────────────────────────────────��────
function MobileHeader({
  activeTab,
}: {
  activeTab: Tab;
}) {
  const router = useRouter();
  const { activeChain, chainConfig, setActiveChain } = useChain();
  const addresses = useChainAddresses();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileChainOpen, setMobileChainOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [mobileAssetsOpen, setMobileAssetsOpen] = useState(false);
  const cityName = useCityName();
  const sections = buildSections(cityName);
  const cooldowns = useCooldowns();

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
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex shrink-0 items-center gap-2">
          <UsernameLabel onNavigate={() => handleMobileNav("my-profile")} />
          <RankActivationIndicator onGoToRank={() => handleMobileNav("rank-activation")} />
          <SafehouseIndicator onGoToSafehouse={() => handleMobileNav("biz-safehouse")} />
          <JailIndicator onGoToJail={() => handleMobileNav("jail")} />
        </div>
        <div className="flex items-center">
          <ConnectButton accountStatus="address" chainStatus="none" showBalance={false} />
        </div>
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/60 text-foreground transition-colors hover:bg-secondary active:scale-95"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Expandable mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4">
          <div className="py-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current: {getActiveLabel()}
            </span>
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
                          <span className={cn(
                            "font-mono text-[9px] tabular-nums",
                            tab.id === "jail" ? "text-red-500 font-semibold" : "text-amber-400",
                          )}>
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

// Keep backward compat export (not used directly anymore, but Tab type is)
export function Header({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return <TopBar activeTab={activeTab} onTabChange={onTabChange} />;
}
