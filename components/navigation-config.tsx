import type { ReactNode } from "react";
import {
  ArrowRightLeft,
  Beer,
  Bot,
  BoxSelect,
  Building2,
  Car,
  Cherry,
  Coins,
  Crosshair,
  Crown,
  Dices,
  DollarSign,
  Factory,
  FileText,
  Flag,
  Gift,
  Home,
  Key,
  Landmark,
  Lock,
  Map,
  Package,
  Pill,
  Plane,
  Search,
  Shield,
  Skull,
  Sparkles,
  Stethoscope,
  Scroll,
  Store,
  Swords,
  Target,
  Ticket,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  Zap,
  BookOpen,
} from "lucide-react";
import type { Tab } from "@/lib/navigation";

export interface NavItem {
  id: Tab;
  label: string;
  icon: ReactNode;
}

export interface NavigationSection {
  label: string;
  items: readonly NavItem[];
}

const CRIME_SECTION: readonly NavItem[] = [
  { id: "crime", label: "Crime", icon: <Crosshair className="h-4 w-4" /> },
  { id: "organized-crime", label: "Organized Crime", icon: <Users className="h-4 w-4" /> },
  { id: "nickcar", label: "Nick a Car", icon: <Car className="h-4 w-4" /> },
  { id: "racing", label: "Racing", icon: <Flag className="h-4 w-4" /> },
  { id: "travel", label: "Travel", icon: <Plane className="h-4 w-4" /> },
  { id: "jail", label: "Jail", icon: <Lock className="h-4 w-4" /> },
  { id: "helperbots", label: "Helper Bots", icon: <Bot className="h-4 w-4" /> },
];

const KILL_SECTION: readonly NavItem[] = [
  { id: "killskill", label: "Kill Skill", icon: <Swords className="h-4 w-4" /> },
  { id: "kill-initiation", label: "Kill Initiation", icon: <Target className="h-4 w-4" /> },
  { id: "backfire-settings", label: "Backfire", icon: <Target className="h-4 w-4" /> },
  { id: "graveyard", label: "Graveyard", icon: <Skull className="h-4 w-4" /> },
  { id: "kill-attempt", label: "Kill Attempt", icon: <Swords className="h-4 w-4" /> },
  { id: "rebirth", label: "Rebirth", icon: <Skull className="h-4 w-4" /> },
];

const CITY_SECTION: readonly NavItem[] = [
  { id: "city-map", label: "City Map", icon: <Map className="h-4 w-4" /> },
  { id: "garage", label: "Garage", icon: <Warehouse className="h-4 w-4" /> },
  { id: "biz-safehouse", label: "Safehouse", icon: <Home className="h-4 w-4" /> },
  { id: "biz-booze", label: "Booze Warehouse", icon: <Beer className="h-4 w-4" /> },
  { id: "biz-narcs", label: "Narcotics Warehouse", icon: <Pill className="h-4 w-4" /> },
  { id: "biz-roulette", label: "Roulette", icon: <Dices className="h-4 w-4" /> },
  { id: "biz-slotmachine", label: "Slot Machine", icon: <Cherry className="h-4 w-4" /> },
  { id: "biz-jackpot", label: "Jackpot", icon: <Trophy className="h-4 w-4" /> },
  { id: "biz-lottery-hall", label: "Lottery Hall", icon: <Ticket className="h-4 w-4" /> },
  { id: "biz-detective-agency", label: "Detective Agency", icon: <Search className="h-4 w-4" /> },
  { id: "biz-bank", label: "Bank", icon: <Landmark className="h-4 w-4" /> },
  { id: "biz-bulletfactory", label: "Bullet Factory", icon: <Factory className="h-4 w-4" /> },
  { id: "biz-car-crusher", label: "Car Crusher", icon: <Wrench className="h-4 w-4" /> },
  { id: "biz-shop", label: "Shop", icon: <Store className="h-4 w-4" /> },
  { id: "biz-hospital", label: "Hospital", icon: <Stethoscope className="h-4 w-4" /> },
];

const GAME_SECTION: readonly NavItem[] = [
  { id: "story-mode", label: "Story Mode", icon: <BookOpen className="h-4 w-4" /> },
  { id: "weekly-missions", label: "Weekly Missions", icon: <Target className="h-4 w-4" /> },
  { id: "worth", label: "Player Worth", icon: <DollarSign className="h-4 w-4" /> },
  { id: "rank-activation", label: "Rank Activation", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "bodyguard-training", label: "Bodyguard Training", icon: <Shield className="h-4 w-4" /> },
  { id: "equipment", label: "Equipment", icon: <Swords className="h-4 w-4" /> },
  { id: "exchange-convert", label: "Exchange Convert", icon: <Coins className="h-4 w-4" /> },
  { id: "exchange-bullet", label: "Bullet exchange", icon: <Zap className="h-4 w-4" /> },
  { id: "exchange-liquidity", label: "Exchange Liquidity", icon: <Wallet className="h-4 w-4" /> },
  { id: "exchange-otc", label: "OTC Desk", icon: <ArrowRightLeft className="h-4 w-4" /> },
  { id: "xp-market", label: "XP Market", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "marketplace", label: "Marketplace", icon: <Store className="h-4 w-4" /> },
  { id: "fts", label: "Founders table shares", icon: <Scroll className="h-4 w-4" /> },
  { id: "referral", label: "Referral", icon: <UserPlus className="h-4 w-4" /> },
  { id: "players", label: "Players", icon: <Users className="h-4 w-4" /> },
  { id: "families", label: "Families", icon: <Building2 className="h-4 w-4" /> },
  { id: "marketing-dao", label: "Marketing DAO", icon: <Landmark className="h-4 w-4" /> },
  { id: "info", label: "Contracts", icon: <FileText className="h-4 w-4" /> },
  { id: "open-crate", label: "Open Crate", icon: <BoxSelect className="h-4 w-4" /> },
  { id: "open-perkbox", label: "Open Perk Box", icon: <Gift className="h-4 w-4" /> },
  { id: "mystery-box", label: "Mystery Box", icon: <Sparkles className="h-4 w-4" /> },
];

const BUY_SECTION: readonly NavItem[] = [
  { id: "buy-helper-credits", label: "Helper Credits", icon: <Sparkles className="h-4 w-4" /> },
  { id: "buy-keys", label: "Keys", icon: <Key className="h-4 w-4" /> },
  { id: "buy-perk-boxes", label: "Perk Boxes", icon: <Package className="h-4 w-4" /> },
  { id: "buy-gi-credits", label: "GI Credits", icon: <Coins className="h-4 w-4" /> },
  { id: "buy-premium", label: "Premium", icon: <Crown className="h-4 w-4" /> },
];

export function buildNavigationSections(cityLabel: string | null): readonly NavigationSection[] {
  return [
    { label: "Crime", items: CRIME_SECTION },
    { label: "Kill", items: KILL_SECTION },
    { label: cityLabel ?? "City", items: CITY_SECTION },
    { label: "Game", items: GAME_SECTION },
    { label: "Buy", items: BUY_SECTION },
  ];
}
