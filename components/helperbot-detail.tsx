"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  HELPER_BOT_BULLET_PRICE,
  HELPERBOT_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
  parseBulletBotPlusInfo,
  parseHelperBotInfo,
  type BulletBotPlusInfo,
  type HelperBotInfo,
  type HELPER_BOTS,
} from "@/lib/contract";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  CircleDot,
  ChevronDown,
  Clock,
  Target,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type HelperBot = (typeof HELPER_BOTS)[number];
const BULLET_BOT_ID = 5;
const BULLET_PER_ATTEMPT_BASE = BigInt(10);
const HUNDRED = BigInt(100);
const CREDIT_SPEND_REDUCTION_PERCENT = 25;
const PERK_HELPER_BOT_ALLOWED = {
  CRIME_SUCCESS_PERK_CATEGORY: 18,
  CRIME_COOLDOWN_PERK_CATEGORY: 24,
  CRIME_REWARDS_PERK_CATEGORY: 40,
  CRIME_CREDIT_COST_PERK_CATEGORY: 47,
  CAR_SUCCESS_PERK_CATEGORY: 19,
  CAR_COOLDOWN_PERK_CATEGORY: 25,
  CREDIT_COST_PERK_CATEGORY: 47,
  KILLSKILL_SUCCESS_PERK_CATEGORY: 22,
  KILLSKILL_COOLDOWN_PERK_CATEGORY: 28,
  BOOZE_SUCCESS_PERK_CATEGORY: 20,
  BOOZE_COOLDOWN_PERK_CATEGORY: 26,
  BOOZE_SALES_PRICE_PERK_CATEGORY: 38,
  NARCS_SUCCESS_PERK_CATEGORY: 21,
  NARCS_COOLDOWN_PERK_CATEGORY: 27,
  NARCS_SALES_PRICE_PERK_CATEGORY: 37,
  BULLET_COOLDOWN_PERK_CATEGORY: 30,
  BULLET_DOUBLE_PURCHASE_PERK_CATEGORY: 41,
} as const;

const BOT_ALLOWED_PERK_CATEGORIES: Record<number, number[]> = {
  0: [
    PERK_HELPER_BOT_ALLOWED.CRIME_SUCCESS_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.CRIME_COOLDOWN_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.CRIME_CREDIT_COST_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.CRIME_REWARDS_PERK_CATEGORY,
  ],
  1: [
    PERK_HELPER_BOT_ALLOWED.CAR_SUCCESS_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.CAR_COOLDOWN_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.CREDIT_COST_PERK_CATEGORY,
  ],
  2: [
    PERK_HELPER_BOT_ALLOWED.KILLSKILL_SUCCESS_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.KILLSKILL_COOLDOWN_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.CREDIT_COST_PERK_CATEGORY,
  ],
  3: [
    PERK_HELPER_BOT_ALLOWED.BOOZE_SUCCESS_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.BOOZE_COOLDOWN_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.CREDIT_COST_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.BOOZE_SALES_PRICE_PERK_CATEGORY,
  ],
  4: [
    PERK_HELPER_BOT_ALLOWED.NARCS_SUCCESS_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.NARCS_COOLDOWN_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.CREDIT_COST_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.NARCS_SALES_PRICE_PERK_CATEGORY,
  ],
  5: [
    PERK_HELPER_BOT_ALLOWED.BULLET_COOLDOWN_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.CREDIT_COST_PERK_CATEGORY,
    PERK_HELPER_BOT_ALLOWED.BULLET_DOUBLE_PURCHASE_PERK_CATEGORY,
  ],
  6: [PERK_HELPER_BOT_ALLOWED.CREDIT_COST_PERK_CATEGORY],
  7: [PERK_HELPER_BOT_ALLOWED.CREDIT_COST_PERK_CATEGORY],
};

const BOT_MINUTES_PER_ATTEMPT: Record<number, number> = {
  0: 12,   // CrimeBot
  1: 30,   // GrandTheftAutoBot
  2: 35,   // ShootingPracticeBot
  3: 90,   // BoozeSmugglingBot
  4: 140,  // NarcoticsSmugglingBot
  5: 100,  // BulletDealerBot
  6: 180,  // RaceXPBot
  7: 8,    // BustOutXpBot
};

type PerkInventoryItem = {
  itemId: number;
  categoryId: number;
  typeId: number;
  owner?: string;
};

type PerkDisplay = {
  type: "success" | "cooldown" | "booster" | "tools";
  option: string;
  amount: string;
  duration: string;
  tools: string;
};

type SelectedPerkDetail = {
  itemId: number;
  categoryId: number;
  typeId: number;
  display: PerkDisplay;
  durationHours: number;
};

const SUCCESS_OPTIONS = ["Crime Success", "NickCar Success", "Booze Success", "Narcotics Success", "KillSkill Success", "BustOut Success"];
const COOLDOWN_OPTIONS = ["Crime Cooldown", "NickCar Cooldown", "Booze Cooldown", "Narcotics Cooldown", "KillSkill Cooldown", "Travel Cooldown", "BulletBuy Cooldown", "HealthBuy Cooldown", "BustOut Cooldown"];
const BOOSTER_OPTIONS = ["MapYield Boost", "RaceXp Boost", "KillSkillXp Boost", "BustOutXp Boost", "SalesPriceNarcotics Boost", "SalesPriceBooze Boost", "Worth Boost", "Rewards Boost"];
const TOOLS_OPTIONS = ["Purchase", "NoJail", "FreeTravel", "BankFee", "CreditCost", "Convert", "CreditSpend"];
const DURATIONS = ["6", "12", "24", "48", "72", "96"];
const SUCCESS_AMOUNTS = ["100", "75", "50"];
const COOLDOWN_AMOUNTS = ["90", "75", "50"];
const BOOSTER_AMOUNTS = ["100", "75", "50", "25"];

function getPerkDisplay(categoryId: number, typeId: number): PerkDisplay {
  const D = DURATIONS.length;
  if (categoryId >= 18 && categoryId <= 23) {
    const optionIndex = categoryId - 18;
    const amountIndex = Math.floor(typeId / D);
    const durationIndex = typeId % D;
    return {
      type: "success",
      option: SUCCESS_OPTIONS[optionIndex] ?? `Option #${optionIndex}`,
      amount: SUCCESS_AMOUNTS[amountIndex] ?? "Unknown",
      duration: DURATIONS[durationIndex] ?? "Unknown",
      tools: "",
    };
  }
  if (categoryId >= 24 && categoryId <= 32) {
    const optionIndex = categoryId - 24;
    const amountIndex = Math.floor(typeId / D);
    const durationIndex = typeId % D;
    return {
      type: "cooldown",
      option: COOLDOWN_OPTIONS[optionIndex] ?? `Option #${optionIndex}`,
      amount: COOLDOWN_AMOUNTS[amountIndex] ?? "Unknown",
      duration: DURATIONS[durationIndex] ?? "Unknown",
      tools: "",
    };
  }
  if (categoryId >= 33 && categoryId <= 40) {
    const optionIndex = categoryId - 33;
    const amountIndex = Math.floor(typeId / D);
    const durationIndex = typeId % D;
    return {
      type: "booster",
      option: BOOSTER_OPTIONS[optionIndex] ?? `Option #${optionIndex}`,
      amount: BOOSTER_AMOUNTS[amountIndex] ?? "Unknown",
      duration: DURATIONS[durationIndex] ?? "Unknown",
      tools: "",
    };
  }
  if (categoryId >= 41 && categoryId <= 47) {
    const toolsIndex = categoryId - 41;
    const durationIndex = typeId % D;
    return {
      type: "tools",
      option: "",
      amount: "",
      duration: DURATIONS[durationIndex] ?? "Unknown",
      tools: TOOLS_OPTIONS[toolsIndex] ?? `Tool #${toolsIndex}`,
    };
  }
  return {
    type: "success",
    option: `Unknown (Cat ${categoryId})`,
    amount: "?",
    duration: "?",
    tools: "",
  };
}

function getToolsDisplayName(toolsId: string): string {
  const toolsNames: Record<string, string> = {
    Purchase: "Free Purchase",
    NoJail: "No Jail",
    FreeTravel: "Free Travel",
    BankFee: "No Bank Fee",
    CreditCost: "Reduced Credit Cost",
    Convert: "Free Convert",
    CreditSpend: "Reduced Credit Spend",
  };
  return toolsNames[toolsId] ?? toolsId;
}

function getPerkSummary(display: PerkDisplay): string {
  if (display.type === "tools") {
    return `${getToolsDisplayName(display.tools)} (${display.duration}h)`;
  }
  const amountPrefix = display.type === "cooldown" ? "-" : "+";
  return `${display.option} ${amountPrefix}${display.amount}% (${display.duration}h)`;
}

function parseDurationHours(display: PerkDisplay): number {
  const parsed = Number(display.duration);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parsePercent(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatDurationFromMinutes(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDurationFromSeconds(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatAttemptTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) return `${minutes} min`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function HelperBotDetail({
  bot,
  creditBalance,
  onCreditChange,
}: {
  bot: HelperBot;
  creditBalance: number | null;
  onCreditChange?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const publicClient = usePublicClient();
  const { authData } = useAuth();
  const authMessage = authData?.message ?? null;
  const signature = authData?.signature ?? null;

  const [botInfo, setBotInfo] = useState<HelperBotInfo | null>(null);
  const [bulletBotPlusInfo, setBulletBotPlusInfo] = useState<BulletBotPlusInfo | null>(null);
  const [bulletBotCostLoadError, setBulletBotCostLoadError] = useState<string | null>(null);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [availablePerkItems, setAvailablePerkItems] = useState<PerkInventoryItem[]>([]);
  const [selectedPerkIds, setSelectedPerkIds] = useState<number[]>([]);
  const [perkLoading, setPerkLoading] = useState(false);
  const [perkLoadError, setPerkLoadError] = useState<string | null>(null);
  const isBulletDealerBot = bot.id === BULLET_BOT_ID;
  const allowedPerkCategories = BOT_ALLOWED_PERK_CATEGORIES[bot.id] ?? [];

  useEffect(() => {
    if (typeof window !== "undefined" && window.MafiaInventory) {
      setInventoryReady(true);
      return;
    }
    const existing = document.querySelector('script[src="/js/mafia-utils.js"]');
    if (existing) {
      existing.addEventListener("load", () => setInventoryReady(true), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setInventoryReady(true);
    document.head.appendChild(script);
  }, []);

  const fetchBotInfo = useCallback(async () => {
    if (!address || !publicClient) return;
    try {
      const result = await publicClient.readContract({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: bot.infoFn,
        args: [address],
      });
      if (result && typeof result === "object") {
        const info = parseHelperBotInfo(result);
        setBotInfo(info);
      }
    } catch {
      // silently fail
    }
  }, [address, publicClient, addresses.helperbot, bot.infoFn]);

  useEffect(() => {
    fetchBotInfo();
    const interval = setInterval(fetchBotInfo, 15000);
    return () => clearInterval(interval);
  }, [fetchBotInfo]);

  const fetchBulletBotCostInputs = useCallback(async () => {
    if (!isBulletDealerBot || !address || !publicClient) return;
    try {
      setBulletBotCostLoadError(null);
      const plusInfoResult = await publicClient.readContract({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: "userBulletBotPlusInfo",
        args: [address],
      });
      setBulletBotPlusInfo(parseBulletBotPlusInfo(plusInfoResult));
    } catch (e) {
      console.error(e);
      setBulletBotPlusInfo(null);
      setBulletBotCostLoadError("Unable to load Bullet Dealer cash requirement.");
    }
  }, [isBulletDealerBot, address, publicClient, addresses.helperbot]);

  useEffect(() => {
    fetchBulletBotCostInputs();
  }, [fetchBulletBotCostInputs]);

  const fetchAvailablePerks = useCallback(async () => {
    if (!inventoryReady || !window.MafiaInventory || !addresses.inventory) {
      setAvailablePerkItems([]);
      return;
    }
    if (allowedPerkCategories.length === 0) {
      setAvailablePerkItems([]);
      return;
    }
    setPerkLoading(true);
    setPerkLoadError(null);
    try {
      const categoryResults = await Promise.all(
        allowedPerkCategories.map((categoryId) =>
          window.MafiaInventory!.getItemsByCategory({
            chain: chainConfig.id,
            contractAddress: addresses.inventory,
            categoryId
          })
        )
      );

      const allItems = categoryResults.flat() as PerkInventoryItem[];
      const ownedItems = allItems.filter((item) => {
        if (Number(item.typeId) <= 0) return false;
        if (!address) return false;
        if (!item.owner) return false;
        return item.owner.toLowerCase() === address.toLowerCase();
      });
      setAvailablePerkItems(ownedItems);
    } catch {
      setAvailablePerkItems([]);
      setPerkLoadError("Unable to load available perks.");
    } finally {
      setPerkLoading(false);
    }
  }, [inventoryReady, addresses.inventory, allowedPerkCategories, chainConfig.id, address]);

  useEffect(() => {
    void fetchAvailablePerks();
  }, [fetchAvailablePerks]);

  const fetchIngameCashBalance = useCallback(async (): Promise<bigint | null> => {
    if (!address || !publicClient || !authMessage || !signature) return null;
    try {
      const balanceResult = await publicClient.readContract({
        address: addresses.ingameCurrency,
        abi: INGAME_CURRENCY_ABI,
        functionName: "balanceOfWithSignMsg",
        args: [address, authMessage, signature],
      });
      return balanceResult as bigint;
    } catch {
      return null;
    }
  }, [address, publicClient, authMessage, signature, addresses.ingameCurrency]);

  const isRunning = botInfo?.isRunning === true;

  const balanceMax = creditBalance !== null && bot.credits > 0
    ? Math.floor(creditBalance / bot.credits)
    : bot.maxAttempts;
  const maxAttempts = Math.min(balanceMax, bot.maxAttempts);
  const minAttempts = bot.minAttempts;
  const [selectedAttempts, setSelectedAttempts] = useState<number>(bot.minAttempts);
  const [inputMode, setInputMode] = useState<"dropdown" | "manual">("dropdown");
  const dropdownOptions = [
    minAttempts,
    ...([5, 10, 25, 50].filter((v) => v > minAttempts)),
    ...Array.from({ length: 50 }, (_, i) => (i + 1) * 100),
  ].filter((v) => v >= minAttempts && v <= maxAttempts);
  const selectedPerkDetails: SelectedPerkDetail[] = selectedPerkIds
    .map((itemId) => availablePerkItems.find((item) => item.itemId === itemId))
    .filter((item): item is PerkInventoryItem => Boolean(item))
    .map((item) => {
      const display = getPerkDisplay(item.categoryId, item.typeId);
      return {
        itemId: item.itemId,
        categoryId: item.categoryId,
        typeId: item.typeId,
        display,
        durationHours: parseDurationHours(display),
      };
    });
  const selectedDurationHours = selectedPerkDetails.length > 0 ? selectedPerkDetails[0].durationHours : null;
  const cooldownReductionPct = selectedPerkDetails.reduce((maxValue, perk) => {
    if (perk.display.type !== "cooldown") return maxValue;
    return Math.max(maxValue, parsePercent(perk.display.amount));
  }, 0);
  const creditSpendReductionPct = selectedPerkDetails.reduce((maxValue, perk) => {
    if (perk.display.type !== "tools") return maxValue;
    if (perk.display.tools !== "CreditCost" && perk.display.tools !== "CreditSpend") return maxValue;
    return Math.max(maxValue, CREDIT_SPEND_REDUCTION_PERCENT);
  }, 0);
  const minutesPerAttemptBase = BOT_MINUTES_PER_ATTEMPT[bot.id] ?? 0;
  const secondsPerAttemptBase = minutesPerAttemptBase * 60;
  const secondsPerAttempt =
    cooldownReductionPct > 0
      ? Math.max(1, Math.round((secondsPerAttemptBase * (100 - cooldownReductionPct)) / 100))
      : secondsPerAttemptBase;
  const durationBoundAttempts =
    selectedDurationHours !== null
      ? Math.floor((selectedDurationHours * 3600) / Math.max(1, secondsPerAttempt))
      : null;
  const hasSelectedPerks = selectedPerkDetails.length > 0;
  const effectiveAttemptCount =
    hasSelectedPerks && durationBoundAttempts !== null
      ? Math.max(0, durationBoundAttempts)
      : Math.min(maxAttempts, Math.max(minAttempts, selectedAttempts));
  const creditsPerAttemptEffective =
    creditSpendReductionPct > 0
      ? bot.credits * ((100 - creditSpendReductionPct) / 100)
      : bot.credits;
  const estimatedCreditCost = effectiveAttemptCount * creditsPerAttemptEffective;
  const estimatedDurationSeconds = effectiveAttemptCount * secondsPerAttempt;

  useEffect(() => {
    // Ensure attempt/time cost always reflects the currently selected bot.
    setSelectedAttempts(bot.minAttempts);
    setInputMode("dropdown");
    setSelectedPerkIds([]);
  }, [bot.id, bot.minAttempts]);

  useEffect(() => {
    setSelectedPerkIds((prev) =>
      prev.filter((itemId) => availablePerkItems.some((item) => item.itemId === itemId))
    );
  }, [availablePerkItems]);

  const {
    writeContract: writeStart,
    data: startHash,
    isPending: startPending,
    error: startError,
    reset: resetStart,
  } = useChainWriteContract();

  const { isLoading: startConfirming, isSuccess: startSuccess } =
    useWaitForTransactionReceipt({ hash: startHash });

  const togglePerkSelection = (perk: PerkInventoryItem) => {
    const isSelected = selectedPerkIds.includes(perk.itemId);
    if (isSelected) {
      setSelectedPerkIds((prev) => prev.filter((id) => id !== perk.itemId));
      return;
    }

    const nextDisplay = getPerkDisplay(perk.categoryId, perk.typeId);
    const nextDuration = parseDurationHours(nextDisplay);

    if (selectedPerkDetails.length > 0) {
      const existingDuration = selectedPerkDetails[0].durationHours;
      if (nextDuration !== existingDuration) {
        return;
      }

      const sameTypePerk = selectedPerkDetails.find((p) => p.display.type === nextDisplay.type);
      if (sameTypePerk) {
        return;
      }
    }

    setSelectedPerkIds((prev) => prev.concat(perk.itemId));
  };

  const isPerkSelectable = (perk: PerkInventoryItem): boolean => {
    const isSelected = selectedPerkIds.includes(perk.itemId);
    if (isSelected) return true;
    if (selectedPerkDetails.length === 0) return true;

    const display = getPerkDisplay(perk.categoryId, perk.typeId);
    const duration = parseDurationHours(display);
    const selectedDuration = selectedPerkDetails[0].durationHours;
    if (duration !== selectedDuration) return false;

    const hasSameType = selectedPerkDetails.some((p) => p.display.type === display.type);
    if (hasSameType) return false;

    return true;
  };

  const handleStart = () => {
    resetStart();
    writeStart({
      address: addresses.helperbot,
      abi: HELPERBOT_CONTRACT_ABI,
      functionName: bot.startFn,
      args: [BigInt(effectiveAttemptCount), selectedPerkIds.map((id) => BigInt(id))],
      gas: BigInt(500_000),
    });
  };

  const startToastFired = useRef(false);
  useEffect(() => {
    if (startSuccess && startHash && !startToastFired.current) {
      startToastFired.current = true;
      toast.success(`${bot.label} hired successfully`);
      fetchBotInfo();
      fetchBulletBotCostInputs();
      onCreditChange?.();
      const t = setTimeout(() => {
        fetchBotInfo();
        fetchBulletBotCostInputs();
        onCreditChange?.();
      }, 3000);
      return () => clearTimeout(t);
    }
    if (!startHash) startToastFired.current = false;
  }, [startSuccess, startHash, bot.label, fetchBotInfo, fetchBulletBotCostInputs, onCreditChange]);

  const {
    writeContract: writeEnd,
    data: endHash,
    isPending: endPending,
    error: endError,
    reset: resetEnd,
  } = useChainWriteContract();

  const { isLoading: endConfirming, isSuccess: endSuccess } =
    useWaitForTransactionReceipt({ hash: endHash });

  const handleEnd = async (bulletAccepting: boolean = true) => {
    resetEnd();
    if (bot.endType === "none") {
      writeEnd({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: bot.endFn,
        args: [],
        gas: BigInt(500_000),
      });
    } else if (bot.endType === "signed") {
      if (!authMessage || !signature) {
        toast.error("Authentication required. Please sign in first.");
        return;
      }
      writeEnd({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: bot.endFn,
        args: [authMessage, signature],
        gas: BigInt(500_000),
      });
    } else if (bot.endType === "bulletSigned") {
      if (!authMessage || !signature) {
        toast.error("Authentication required. Please sign in first.");
        return;
      }
      if (bulletAccepting && requiredBulletCashAmount === null) {
        toast.error("Unable to load Bullet Dealer completion cash requirement.");
        return;
      }
      if (bulletAccepting && requiredBulletCashAmount !== null && requiredBulletCashAmount > BigInt(0)) {
        const ingameCashBalance = await fetchIngameCashBalance();
        if (ingameCashBalance === null) {
          toast.error("Could not verify in-game cash balance. Please try again.");
          return;
        }

        if (ingameCashBalance < requiredBulletCashAmount) {
          toast.error(
            `Insufficient in-game cash. Need ${requiredBulletCashAmount.toLocaleString()}, have ${ingameCashBalance.toLocaleString()}.`
          );
          return;
        }
        toast.info(`Completing this bot will deduct ${requiredBulletCashAmount.toLocaleString()} cash.`);
      }
      writeEnd({
        address: addresses.helperbot,
        abi: HELPERBOT_CONTRACT_ABI,
        functionName: bot.endFn,
        args: [bulletAccepting, authMessage, signature],
        gas: BigInt(500_000),
      });
    }
  };

  const endToastFired = useRef(false);
  useEffect(() => {
    if (endSuccess && endHash && !endToastFired.current) {
      endToastFired.current = true;
      toast.success(`${bot.label} withdrawn successfully`);
      fetchBotInfo();
      fetchBulletBotCostInputs();
      onCreditChange?.();
      const t = setTimeout(() => {
        fetchBotInfo();
        fetchBulletBotCostInputs();
        onCreditChange?.();
      }, 3000);
      return () => clearTimeout(t);
    }
    if (!endHash) endToastFired.current = false;
  }, [endSuccess, endHash, bot.label, fetchBotInfo, fetchBulletBotCostInputs, onCreditChange]);

  const startLoading = startPending || startConfirming;
  const endLoading = endPending || endConfirming;
  const isLoading = startLoading || endLoading;
  const error = startError || endError;
  const txHash = startHash || endHash;
  const txSuccess = startSuccess || endSuccess;

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const endTimeSec = botInfo ? botInfo.endTimestamp : 0;
  const startTimeSec = botInfo ? botInfo.startTimestamp : 0;
  const timeLeft = endTimeSec > now ? endTimeSec - now : 0;
  const canWithdraw = isRunning && timeLeft === 0;

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const totalDuration = endTimeSec > startTimeSec ? endTimeSec - startTimeSec : 0;
  const elapsed = now > startTimeSec ? now - startTimeSec : 0;
  const progressPct = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;
  const bulletDoublePerk = false;

  const generatedBulletAmount =
    isBulletDealerBot && botInfo && bulletBotPlusInfo
      ? BigInt(botInfo.attemptCount) *
      bulletBotPlusInfo.amountModifiedPercent *
      BULLET_PER_ATTEMPT_BASE *
      (bulletDoublePerk ? BigInt(2) : BigInt(1))
      : null;

  const requiredBulletCashAmount =
    isBulletDealerBot && generatedBulletAmount !== null && bulletBotPlusInfo
      ? (BigInt(HELPER_BOT_BULLET_PRICE) * generatedBulletAmount * bulletBotPlusInfo.priceModifiedPercent) / HUNDRED
      : null;

  const missingBulletCashInputs =
    isBulletDealerBot &&
    isRunning &&
    canWithdraw &&
    bulletBotPlusInfo === null;

  return (
    <div
      className={cn(
        "space-y-4",
        txSuccess && "rounded-lg border border-primary/30 p-3",
        error && "rounded-lg border border-red-400/30 p-3"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{bot.description}</p>
        </div>
        {isConnected && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
              isRunning
                ? "bg-green-400/10 text-green-400"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <CircleDot className={cn("h-3 w-3", isRunning && "animate-pulse")} />
            {isRunning ? "Running" : "Idle"}
          </div>
        )}
      </div>

      <div className="rounded-md bg-background/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Credit / Attempt</span>
          <span className="text-xs font-medium text-foreground">
            {creditsPerAttemptEffective.toLocaleString(undefined, {
              minimumFractionDigits: Number.isInteger(creditsPerAttemptEffective) ? 0 : 2,
              maximumFractionDigits: 2,
            })}
            {creditSpendReductionPct > 0 && (
              <span className="ml-1 text-[10px] text-green-400">(-{creditSpendReductionPct}%)</span>
            )}
          </span>
        </div>
        {!isRunning && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Credits</span>
            <span className="text-xs font-semibold text-primary">
              {estimatedCreditCost.toLocaleString(undefined, {
                minimumFractionDigits: Number.isInteger(estimatedCreditCost) ? 0 : 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Time / Attempt</span>
          <span className="text-xs font-medium text-foreground">
            {formatAttemptTime(secondsPerAttempt)}
            {cooldownReductionPct > 0 && (
              <span className="ml-1 text-[10px] text-green-400">(-{cooldownReductionPct}%)</span>
            )}
          </span>
        </div>
        {!isRunning && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Estimated Duration</span>
            <span className="text-xs font-semibold text-chain-accent">
              {formatDurationFromSeconds(estimatedDurationSeconds)}
            </span>
          </div>
        )}
        {!isRunning && hasSelectedPerks && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Attempts (from perk duration)</span>
            <span className="text-xs font-semibold text-foreground">
              {effectiveAttemptCount.toLocaleString()}
            </span>
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Rank</span>
          <span
            className={cn(
              "text-xs font-medium",
              bot.rank === "High"
                ? "text-red-400"
                : bot.rank === "Medium"
                  ? "text-chain-accent"
                  : "text-green-400"
            )}
          >
            {bot.rank}
          </span>
        </div>
        {bot.endType !== "none" && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Withdraw</span>
            <span className="text-[10px] font-mono text-chain-accent">Requires signature</span>
          </div>
        )}
      </div>

      {isRunning && botInfo && (
        <div className="rounded-md border border-green-400/20 bg-green-400/5 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" /> Attempts
            </span>
            <span className="text-xs font-mono font-semibold text-foreground">
              {botInfo.attemptCount.toLocaleString()}
            </span>
          </div>
          {botInfo.successRate > 0 && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" /> Success Rate
              </span>
              <span className="text-xs font-mono text-green-400">
                {(botInfo.successRate / 100).toFixed(2)}%
              </span>
            </div>
          )}
          {timeLeft > 0 && (
            <>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Time Left
                </span>
                <span className="text-xs font-mono text-chain-accent">{formatTime(timeLeft)}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/80">
                <div
                  className="h-full rounded-full bg-green-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </>
          )}
          {timeLeft === 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className="text-xs font-medium text-green-400">Ready to withdraw</span>
            </div>
          )}
          {startTimeSec > 0 && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Started</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {new Date(startTimeSec * 1000).toLocaleString()}
              </span>
            </div>
          )}
          {endTimeSec > 0 && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ends</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {new Date(endTimeSec * 1000).toLocaleString()}
              </span>
            </div>
          )}
          {isBulletDealerBot && (
            <div className="mt-2 rounded-md border border-chain-accent/20 bg-chain-accent/5 px-2.5 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Generated Bullets</span>
                <span className="text-xs font-mono text-foreground">
                  {generatedBulletAmount !== null ? generatedBulletAmount.toLocaleString() : "-"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cash to complete</span>
                <span className="text-xs font-mono font-semibold text-chain-accent">
                  {requiredBulletCashAmount !== null ? requiredBulletCashAmount.toLocaleString() : "-"}
                </span>
              </div>
              {bulletBotPlusInfo && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Price modifier</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {bulletBotPlusInfo.priceModifiedPercent.toLocaleString()}%
                  </span>
                </div>
              )}
              {bulletBotCostLoadError && (
                <p className="mt-1 text-[10px] text-red-400">{bulletBotCostLoadError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {!isRunning && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Attempt Count</label>
            <div className="flex rounded-md border border-border bg-background/50">
              <button
                type="button"
                onClick={() => {
                  setInputMode("dropdown");
                  const nearest = dropdownOptions.reduce(
                    (a, b) => (Math.abs(b - selectedAttempts) < Math.abs(a - selectedAttempts) ? b : a),
                    dropdownOptions[0] ?? 100
                  );
                  setSelectedAttempts(nearest);
                }}
                className={cn(
                  "rounded-l-md px-2.5 py-1 text-[10px] font-medium transition-colors",
                  inputMode === "dropdown"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Preset
              </button>
              <button
                type="button"
                onClick={() => setInputMode("manual")}
                className={cn(
                  "rounded-r-md px-2.5 py-1 text-[10px] font-medium transition-colors",
                  inputMode === "manual"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Custom
              </button>
            </div>
          </div>

          {hasSelectedPerks ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Auto-calculated attempts</span>
                <span className="text-sm font-semibold text-primary">
                  {effectiveAttemptCount.toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Based on selected perk duration and cooldown reduction.
              </p>
            </div>
          ) : inputMode === "dropdown" ? (
            <div className="relative">
              <select
                value={selectedAttempts}
                onChange={(e) => setSelectedAttempts(Number(e.target.value))}
                className="w-full appearance-none rounded-lg border border-border bg-background/50 px-3 py-2 pr-8 text-sm text-foreground outline-none focus:border-primary"
                size={1}
              >
                {dropdownOptions.map((c) => (
                  <option key={c} value={c}>
                    {c.toLocaleString()} attempts
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={minAttempts}
                max={maxAttempts}
                step={1}
                value={selectedAttempts}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) {
                    setSelectedAttempts(Math.min(Math.max(minAttempts, val), maxAttempts));
                  }
                }}
                className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm font-mono text-foreground outline-none focus:border-primary"
                placeholder={`Min: ${minAttempts}`}
              />
            </div>
          )}

          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {hasSelectedPerks
              ? `Auto-adjusted by selected perk duration${selectedDurationHours ? ` (${selectedDurationHours}h)` : ""}.`
              : inputMode === "manual"
                ? `Min: ${minAttempts.toLocaleString()} / Max: ${maxAttempts.toLocaleString()}`
                : `Select from preset amounts (${minAttempts.toLocaleString()} - ${maxAttempts.toLocaleString()})`}
          </p>

          {creditBalance !== null && estimatedCreditCost > creditBalance && (
            <p className="mt-1 text-[10px] font-medium text-red-400">
              {"Insufficient credits. Need "}
              {estimatedCreditCost.toLocaleString(undefined, {
                minimumFractionDigits: Number.isInteger(estimatedCreditCost) ? 0 : 2,
                maximumFractionDigits: 2,
              })}
              {", have "}
              {creditBalance.toLocaleString()}
              {"."}
            </p>
          )}

          <div className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">Available Perks</p>
              <span className="text-[10px] text-muted-foreground">
                {availablePerkItems.length} items
              </span>
            </div>
            {perkLoading ? (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading perks...
              </div>
            ) : perkLoadError ? (
              <p className="mt-2 text-[11px] text-red-400">{perkLoadError}</p>
            ) : availablePerkItems.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                No available perks for this bot.
              </p>
            ) : (
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
                {availablePerkItems.map((perk) => (
                  <button
                    key={perk.itemId}
                    type="button"
                    onClick={() => togglePerkSelection(perk)}
                    disabled={!isPerkSelectable(perk)}
                    className={cn(
                      "flex w-full items-center justify-between rounded border px-2 py-1 text-left",
                      "transition-colors disabled:pointer-events-none",
                      selectedPerkIds.includes(perk.itemId)
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/40 bg-background/60 hover:bg-secondary/40",
                      !isPerkSelectable(perk) && !selectedPerkIds.includes(perk.itemId) && "opacity-35"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-foreground">
                        {getPerkSummary(getPerkDisplay(perk.categoryId, perk.typeId))}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        Item #{perk.itemId} · Cat {perk.categoryId} · Type {perk.typeId}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 text-[10px] font-semibold text-primary">
                      {selectedPerkIds.includes(perk.itemId) ? "Selected" : "Select"}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedPerkDetails.length > 0 && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Selected: {selectedPerkDetails.map((perk) => perk.display.type).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {txSuccess && txHash && (
        <div className="flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
          <a
            href={`${explorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="line-clamp-2 text-[10px] text-red-400">
            {error.message.includes("User rejected")
              ? "Transaction rejected by user"
              : error.message.split("\n")[0]}
          </p>
        </div>
      )}

      {!isRunning && (
        <button
          onClick={handleStart}
          disabled={!isConnected || isLoading || (creditBalance !== null && estimatedCreditCost > creditBalance)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {startLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{startPending ? "Confirm in wallet..." : "Starting..."}</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Hire Bot</span>
            </>
          )}
        </button>
      )}

      {isRunning && timeLeft > 0 && !endLoading && (
        <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-400/20 bg-green-400/5 px-4 py-2.5 text-sm font-semibold text-green-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Bot is working...</span>
        </div>
      )}

      {isRunning && canWithdraw && !isBulletDealerBot && (
        <button
          onClick={() => handleEnd()}
          disabled={!isConnected || endLoading}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            "bg-green-500 text-white hover:bg-green-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {endLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{endPending ? "Confirm in wallet..." : "Withdrawing..."}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Withdraw Results</span>
            </>
          )}
        </button>
      )}
      {isRunning && canWithdraw && isBulletDealerBot && (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => handleEnd(false)}
            disabled={!isConnected || endLoading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              "border border-border bg-secondary text-foreground hover:bg-secondary/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {endLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{endPending ? "Confirm in wallet..." : "Cancelling..."}</span>
              </>
            ) : (
              <span>Cancel Bot</span>
            )}
          </button>
          <button
            onClick={() => handleEnd(true)}
            disabled={!isConnected || endLoading || missingBulletCashInputs}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              "bg-green-500 text-white hover:bg-green-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {endLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{endPending ? "Confirm in wallet..." : "Completing..."}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Complete & Pay Cash</span>
              </>
            )}
          </button>
        </div>
      )}
      {isRunning && canWithdraw && missingBulletCashInputs && (
        <p className="text-[11px] text-red-400">
          Unable to load Bullet Dealer cash requirement. Please refresh and try again.
        </p>
      )}
    </div>
  );
}
