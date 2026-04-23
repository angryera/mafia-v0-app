"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ExternalLink, Loader2, X } from "lucide-react";
import { parseEther, maxUint256 } from "viem";
import { toast } from "sonner";
import {
  useChain,
  useChainAddresses,
  useChainExplorer,
} from "@/components/chain-provider";
import { ERC20_ABI, INGAME_CURRENCY_ABI } from "@/lib/contract";
import {
  FAMILY_HQ_CREATION_OG_CRATE_KEYS,
  MAFIA_FAMILY_ABI,
  MAFIA_MAP_ABI,
  OG_CRATE_ABI,
  OG_CRATE_KEY_TOKEN_ID,
} from "@/lib/city-map-contract-abis";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { slotHasOwner, type ParsedSlotInfo } from "@/lib/city-map-types";
import {
  formatMafiaStakingFromWei,
  isMafiaStakingPositive,
} from "@/lib/city-map-staking-format";
import {
  estimateGameCashYieldWeiLive,
  formatWeiWholeUnits,
  parseYieldPayoutRead,
} from "@/lib/city-map-yield-accrual";
import {
  YIELD_TIER_MAX_ACCRUAL_DAYS,
  YIELD_TIER_MIN_CLAIM_HOURS,
  canDepositActivateResidential,
  getActivateDepositMafiaHuman,
  getResidentialGameCashYieldPer24h,
  getResidentialUpgradeCost,
  isResidentialGameCashYieldTier,
  getSlotBuildingLabel,
  isResidentialEmptyTile,
  isResidentialFullyUpgraded,
  RESIDENTIAL_LEVEL_NAMES,
} from "@/lib/city-slot-config";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const MAX_FAMILY_NAME_LEN = 40;
const MAX_FAMILY_NAME_SPACES = 2;

/** Letters and spaces only; at most `MAX_FAMILY_NAME_SPACES` spaces; first character upper, the rest lower. */
function formatFamilyNameInput(raw: string): string {
  let v = raw.replace(/[^a-zA-Z ]/g, "");
  if (v.length > MAX_FAMILY_NAME_LEN) {
    v = v.slice(0, MAX_FAMILY_NAME_LEN);
  }
  let spaceCount = 0;
  let out = "";
  for (const ch of v) {
    if (ch === " ") {
      if (spaceCount >= MAX_FAMILY_NAME_SPACES) continue;
      spaceCount += 1;
    }
    out += ch;
  }
  v = out;
  if (v.length === 0) return "";
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

/** Disallow names where every letter is uppercase (e.g. CORLEONE). Single-letter names are allowed. */
function isAllUppercaseFamilyName(name: string): boolean {
  const letters = name.replace(/[^a-zA-Z]/g, "");
  return letters.length >= 2 && letters === letters.toUpperCase();
}

function parsePlayerFamilyId(raw: unknown): bigint | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "object" && raw !== null && "familyId" in raw) {
    return (raw as { familyId: bigint }).familyId;
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return raw[0] as bigint;
  }
  return undefined;
}

const RARITY_LABELS: Record<number, string> = {
  0: "Normal",
  1: "Upper class",
  2: "Elite",
  3: "Strategic",
};

export type CityMapCellPreview = {
  x: number;
  y: number;
  type: string;
  name?: string;
  owner?: string;
  slot?: ParsedSlotInfo;
};

type TypeMeta = { fill: string; label: string };

function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function explorerAddressUrl(explorerBase: string, addr: string): string {
  const base = explorerBase.replace(/\/$/, "");
  return `${base}/address/${addr}`;
}

export function CityMapSlotDetail({
  cell,
  cityId,
  typeMeta,
  onClose,
  onActionSuccess,
}: {
  cell: CityMapCellPreview;
  cityId: number;
  typeMeta: TypeMeta;
  onClose: () => void;
  onActionSuccess: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { activeChain } = useChain();
  const explorer = useChainExplorer();
  const addresses = useChainAddresses();
  const mapAddress = addresses.map;
  const mafiaAddress = addresses.mafia;
  const mafiaFamilyAddress = addresses.mafiaFamily;
  const ogCrateAddress = addresses.ogCrate;

  const s = cell.slot;

  const [withdrawStr, setWithdrawStr] = useState("");
  const [familyName, setFamilyName] = useState("");
  /**
   * InGameCurrency uses `approveInGameCurrency`, not ERC20 `allowance` — on-chain
   * `allowance(user, map)` often stays 0 after approve. We treat a successful approve
   * tx as spend OK until wallet changes.
   */
  const [gameCashMapApprovedSession, setGameCashMapApprovedSession] =
    useState(false);

  const {
    writeContract: writeMap,
    data: mapHash,
    isPending: mapPending,
    reset: resetMap,
  } = useChainWriteContract();

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    reset: resetApprove,
  } = useChainWriteContract();

  const {
    writeContract: writeApproveGameCash,
    data: gameCashApproveHash,
    isPending: gameCashApprovePending,
    reset: resetGameCashApprove,
  } = useChainWriteContract();

  const {
    writeContract: writeApproveOgCrate,
    data: ogCrateApproveHash,
    isPending: ogCrateApprovePending,
    reset: resetOgCrateApprove,
  } = useChainWriteContract();

  const { isLoading: mapConfirming, isSuccess: mapSuccess } =
    useWaitForTransactionReceipt({ hash: mapHash });
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });
  const {
    isLoading: gameCashApproveConfirming,
    isSuccess: gameCashApproveSuccess,
  } = useWaitForTransactionReceipt({ hash: gameCashApproveHash });
  const {
    isLoading: ogCrateApproveConfirming,
    isSuccess: ogCrateApproveSuccess,
  } = useWaitForTransactionReceipt({ hash: ogCrateApproveHash });

  const nowSec = Math.floor(Date.now() / 1000);

  const isMySlot = useMemo(() => {
    if (!s || !address || !slotHasOwner(s)) return false;
    return s.owner.toLowerCase() === address.toLowerCase();
  }, [s, address]);

  /** On-chain city id (prefer slot payload when present). */
  const cid = useMemo(
    () => (s ? (s.cityId ?? cityId) : cityId),
    [s, cityId]
  );

  const gameCashYieldTier = useMemo(
    () =>
      s
        ? isResidentialGameCashYieldTier(s.slotType, s.slotSubType)
        : false,
    [s]
  );

  const { data: yieldData, refetch: refetchYield } = useReadContract({
    address: mapAddress,
    abi: MAFIA_MAP_ABI,
    functionName: "calculateCurrentYieldPayout",
    args: s !== undefined ? [cid, s.x, s.y] : undefined,
    query: {
      enabled:
        !!s &&
        !!mapAddress &&
        gameCashYieldTier,
    },
  });

  const yieldParsed = useMemo(
    () => parseYieldPayoutRead(yieldData),
    [yieldData]
  );
  const claimableWei = yieldParsed?.amount;
  const lastDayTimestampSec = yieldParsed
    ? Number(yieldParsed.lastDayTimestamp)
    : 0;

  const tickYieldClock = Boolean(s && mapAddress && gameCashYieldTier);
  const [nowSecLive, setNowSecLive] = useState(() =>
    Math.floor(Date.now() / 1000)
  );
  useEffect(() => {
    if (!tickYieldClock) return;
    setNowSecLive(Math.floor(Date.now() / 1000));
    const id = window.setInterval(() => {
      setNowSecLive(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [tickYieldClock]);

  const estimatedClaimableWei = useMemo(() => {
    if (!s || claimableWei === undefined || !yieldParsed) return undefined;
    return estimateGameCashYieldWeiLive({
      baseWeiFromContract: claimableWei,
      lastDayTimestampSec,
      slotType: s.slotType,
      slotSubType: s.slotSubType,
      isOperating: s.isOperating,
      nowSec: nowSecLive,
    });
  }, [
    s,
    claimableWei,
    lastDayTimestampSec,
    nowSecLive,
    yieldParsed,
  ]);

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: mafiaAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && mapAddress ? [address, mapAddress] : undefined,
    query: {
      enabled: !!address && !!mafiaAddress && !!mapAddress,
    },
  });

  const activateHuman = s ? getActivateDepositMafiaHuman(s) : null;
  const activateWei =
    activateHuman != null ? parseEther(String(activateHuman)) : null;

  /** Only Shed+ can receive activation deposit; Empty tile must upgrade first. */
  const residentialCanDepositActivate =
    s &&
    s.slotType === 1 &&
    canDepositActivateResidential(s.slotSubType);

  const allowanceBn = (allowanceRaw as bigint | undefined) ?? 0n;
  const needsApproveForActivate =
    isMySlot &&
    s &&
    s.slotType === 1 &&
    residentialCanDepositActivate &&
    !s.isOperating &&
    activateWei != null &&
    activateWei > 0n &&
    allowanceBn < activateWei;

  const canActivate =
    isConnected &&
    isMySlot &&
    s &&
    s.slotType === 1 &&
    residentialCanDepositActivate &&
    !s.isOperating &&
    activateWei != null &&
    activateWei > 0n &&
    allowanceBn >= activateWei;

  const upgradeCooldownReady =
    s !== undefined &&
    (s.nextUpgradeAvailableAt === 0 || nowSec >= s.nextUpgradeAvailableAt);

  /** Residential (type 1) only — business tiles are view-only on this map. */
  const canUpgradeResidential =
    isMySlot &&
    s &&
    s.slotType === 1 &&
    !isResidentialFullyUpgraded(s.slotSubType) &&
    upgradeCooldownReady;

  const showUpgrade = canUpgradeResidential;

  const upgradeCostInfo = useMemo(() => {
    if (!s || s.slotType !== 1) return null;
    return getResidentialUpgradeCost(s.slotSubType);
  }, [s]);

  const upgradeCashWei = useMemo(() => {
    if (!upgradeCostInfo) return null;
    return parseEther(String(upgradeCostInfo.cash));
  }, [upgradeCostInfo]);

  const gameCashAllowanceEnabled =
    !!address &&
    !!mapAddress &&
    showUpgrade &&
    !!upgradeCostInfo &&
    upgradeCostInfo.cash > 0;

  const { data: gameCashAllowanceRaw, refetch: refetchGameCashAllowance } =
    useReadContract({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "allowance",
      args:
        address && mapAddress ? [address, mapAddress] : undefined,
      query: { enabled: gameCashAllowanceEnabled },
    });

  const crateReadsEnabled =
    !!address &&
    !!mapAddress &&
    !!ogCrateAddress &&
    showUpgrade &&
    !!upgradeCostInfo &&
    upgradeCostInfo.ogCrateKeys > BigInt(0);

  /** Any Family HQ tile that does not yet have a family — caller can `purchaseFamilyHQ` from here. */
  const familyHqCreateEnabled = Boolean(
    s && s.slotType === 4 && s.familyId === 0
  );

  const familyHqPlayerInfoEnabled = Boolean(
    familyHqCreateEnabled && address && mafiaFamilyAddress
  );

  const {
    data: playerInfoRaw,
    isLoading: playerFamilyInfoLoading,
    isError: playerFamilyInfoError,
    refetch: refetchPlayerFamilyInfo,
  } = useReadContract({
    address: mafiaFamilyAddress,
    abi: MAFIA_FAMILY_ABI,
    functionName: "getPlayerInfo",
    args: address ? [address] : undefined,
    query: { enabled: familyHqPlayerInfoEnabled },
  });

  const playerFamilyId = useMemo(
    () => parsePlayerFamilyId(playerInfoRaw),
    [playerInfoRaw]
  );

  const playerAlreadyHasFamily =
    playerFamilyId !== undefined && playerFamilyId > BigInt(0);

  const ogCrateMapReadEnabled = Boolean(
    address &&
    mapAddress &&
    ogCrateAddress &&
    (crateReadsEnabled || familyHqCreateEnabled)
  );

  const { data: ogCrateApprovedRaw, refetch: refetchOgCrateApproval } =
    useReadContract({
      address: ogCrateAddress,
      abi: OG_CRATE_ABI,
      functionName: "isApprovedForAll",
      args:
        address && mapAddress ? [address, mapAddress] : undefined,
      query: { enabled: ogCrateMapReadEnabled },
    });

  const { data: ogCrateKeyBalanceRaw, refetch: refetchOgCrateBalance } =
    useReadContract({
      address: ogCrateAddress,
      abi: OG_CRATE_ABI,
      functionName: "balanceOf",
      args:
        address && ogCrateAddress
          ? [address, OG_CRATE_KEY_TOKEN_ID]
          : undefined,
      query: { enabled: ogCrateMapReadEnabled },
    });

  const gameCashAllowanceBn =
    (gameCashAllowanceRaw as bigint | undefined) ?? BigInt(0);
  const gameCashSpendOkForUpgrade =
    upgradeCashWei == null ||
    upgradeCashWei <= BigInt(0) ||
    gameCashMapApprovedSession ||
    gameCashAllowanceBn >= upgradeCashWei;

  const needsGameCashApprovalForUpgrade =
    showUpgrade &&
    upgradeCashWei != null &&
    upgradeCashWei > BigInt(0) &&
    !gameCashSpendOkForUpgrade;

  const ogCrateKeysNeeded =
    upgradeCostInfo?.ogCrateKeys ?? BigInt(0);
  const needsOgCrateApprovalForUpgrade =
    showUpgrade &&
    ogCrateKeysNeeded > BigInt(0) &&
    ogCrateApprovedRaw !== true;

  const ogCrateKeyBalance =
    (ogCrateKeyBalanceRaw as bigint | undefined) ?? BigInt(0);
  const hasEnoughOgCrateKeys =
    ogCrateKeysNeeded === BigInt(0) ||
    ogCrateKeyBalance >= ogCrateKeysNeeded;

  const needsOgCrateApprovalForFamily =
    familyHqCreateEnabled &&
    !!address &&
    ogCrateApprovedRaw !== true;

  const hasEnoughOgCrateForFamily =
    ogCrateKeyBalance >= FAMILY_HQ_CREATION_OG_CRATE_KEYS;

  const familyNameTrimmed = familyName.trim();
  const familyNameValid =
    familyNameTrimmed.length > 0 &&
    familyNameTrimmed.length <= MAX_FAMILY_NAME_LEN &&
    !isAllUppercaseFamilyName(familyNameTrimmed);

  const canPurchaseFamilyHQ =
    familyHqCreateEnabled &&
    isConnected &&
    familyNameValid &&
    !needsOgCrateApprovalForFamily &&
    hasEnoughOgCrateForFamily &&
    !playerAlreadyHasFamily &&
    !playerFamilyInfoLoading &&
    !playerFamilyInfoError;

  const canUpgradeNow =
    showUpgrade &&
    upgradeCostInfo !== null &&
    !needsGameCashApprovalForUpgrade &&
    !needsOgCrateApprovalForUpgrade &&
    hasEnoughOgCrateKeys;

  const atMaxResidential =
    isMySlot && s && s.slotType === 1 && isResidentialFullyUpgraded(s.slotSubType);

  const upgradeBlockedByCooldown =
    isMySlot &&
    s &&
    s.slotType === 1 &&
    !upgradeCooldownReady &&
    s.nextUpgradeAvailableAt > 0 &&
    !isResidentialFullyUpgraded(s.slotSubType);

  const canClaim =
    isConnected &&
    isMySlot &&
    s &&
    s.slotType === 1 &&
    gameCashYieldTier &&
    estimatedClaimableWei !== undefined &&
    estimatedClaimableWei > BigInt(0);

  const buildingLabel = useMemo(() => {
    if (!s) return "";
    if (s.slotType === 1 && !slotHasOwner(s)) {
      return "Vacant user plot";
    }
    return getSlotBuildingLabel(s);
  }, [s]);
  const gameCashPer24h = s
    ? getResidentialGameCashYieldPer24h(s.slotType, s.slotSubType)
    : null;

  const mapToastFired = useRef(false);
  useEffect(() => {
    if (mapSuccess && mapHash && !mapToastFired.current) {
      mapToastFired.current = true;
      toast.success("Transaction confirmed");
      resetMap();
      void refetchYield();
      void refetchAllowance();
      void refetchGameCashAllowance();
      void refetchOgCrateApproval();
      void refetchOgCrateBalance();
      void refetchPlayerFamilyInfo();
      onActionSuccess();
    }
    if (!mapHash) mapToastFired.current = false;
  }, [
    mapSuccess,
    mapHash,
    resetMap,
    refetchYield,
    refetchAllowance,
    refetchGameCashAllowance,
    refetchOgCrateApproval,
    refetchOgCrateBalance,
    refetchPlayerFamilyInfo,
    onActionSuccess,
  ]);

  const approveToastFired = useRef(false);
  useEffect(() => {
    if (approveSuccess && approveHash && !approveToastFired.current) {
      approveToastFired.current = true;
      toast.success("MAFIA approved");
      resetApprove();
      void refetchAllowance();
    }
    if (!approveHash) approveToastFired.current = false;
  }, [approveSuccess, approveHash, resetApprove, refetchAllowance]);

  useEffect(() => {
    setGameCashMapApprovedSession(false);
  }, [address, activeChain]);

  const gameCashApproveToastFired = useRef(false);
  useEffect(() => {
    if (
      gameCashApproveSuccess &&
      gameCashApproveHash &&
      !gameCashApproveToastFired.current
    ) {
      gameCashApproveToastFired.current = true;
      setGameCashMapApprovedSession(true);
      toast.success("Game Cash approved for map");
      resetGameCashApprove();
      void refetchGameCashAllowance();
    }
    if (!gameCashApproveHash) gameCashApproveToastFired.current = false;
  }, [
    gameCashApproveSuccess,
    gameCashApproveHash,
    resetGameCashApprove,
    refetchGameCashAllowance,
  ]);

  const ogCrateApproveToastFired = useRef(false);
  useEffect(() => {
    if (
      ogCrateApproveSuccess &&
      ogCrateApproveHash &&
      !ogCrateApproveToastFired.current
    ) {
      ogCrateApproveToastFired.current = true;
      toast.success("OG Crate approved for map");
      resetOgCrateApprove();
      void refetchOgCrateApproval();
    }
    if (!ogCrateApproveHash) ogCrateApproveToastFired.current = false;
  }, [
    ogCrateApproveSuccess,
    ogCrateApproveHash,
    resetOgCrateApprove,
    refetchOgCrateApproval,
  ]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!familyHqCreateEnabled) setFamilyName("");
  }, [familyHqCreateEnabled]);

  const busy =
    mapPending ||
    mapConfirming ||
    approvePending ||
    approveConfirming ||
    gameCashApprovePending ||
    gameCashApproveConfirming ||
    ogCrateApprovePending ||
    ogCrateApproveConfirming;

  const handleApproveMafia = () => {
    if (!mafiaAddress || !mapAddress) return;
    writeApprove({
      address: mafiaAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [mapAddress, maxUint256],
    });
  };

  const handleClaim = () => {
    if (!s) return;
    writeMap({
      address: mapAddress,
      abi: MAFIA_MAP_ABI,
      functionName: "claimYieldPayout",
      args: [cid, s.x, s.y],
    });
  };

  const handleApproveGameCashForMap = () => {
    if (!mapAddress) return;
    writeApproveGameCash({
      address: addresses.ingameCurrency,
      abi: INGAME_CURRENCY_ABI,
      functionName: "approveInGameCurrency",
      args: [mapAddress, maxUint256],
    });
  };

  const handleApproveOgCrateForMap = () => {
    if (!mapAddress || !ogCrateAddress) return;
    writeApproveOgCrate({
      address: ogCrateAddress,
      abi: OG_CRATE_ABI,
      functionName: "setApprovalForAll",
      args: [mapAddress, true],
    });
  };

  const handleUpgrade = () => {
    if (!s || !showUpgrade || !canUpgradeNow) return;
    writeMap({
      address: mapAddress,
      abi: MAFIA_MAP_ABI,
      functionName: "upgradeSlot",
      args: [cid, s.x, s.y],
    });
  };

  const handleActivate = () => {
    if (
      !s ||
      !canActivate ||
      activateWei == null ||
      !canDepositActivateResidential(s.slotSubType)
    )
      return;
    writeMap({
      address: mapAddress,
      abi: MAFIA_MAP_ABI,
      functionName: "depositIntoSlot",
      args: [cid, s.x, s.y, activateWei],
    });
  };

  const handleWithdraw = () => {
    if (!s || !withdrawStr.trim()) return;
    let amount: bigint;
    try {
      amount = parseEther(withdrawStr.trim());
    } catch {
      toast.error("Invalid withdraw amount");
      return;
    }
    if (amount <= 0n) return;
    writeMap({
      address: mapAddress,
      abi: MAFIA_MAP_ABI,
      functionName: "withdrawFromSlot",
      args: [cid, s.x, s.y, amount],
    });
  };

  const handlePurchaseFamilyHQ = () => {
    if (!s || !mapAddress || !canPurchaseFamilyHQ) return;
    const name = familyName.trim();
    if (!name) {
      toast.error("Enter a family name");
      return;
    }
    if (name.length > MAX_FAMILY_NAME_LEN) {
      toast.error(`Family name must be at most ${MAX_FAMILY_NAME_LEN} characters`);
      return;
    }
    if (isAllUppercaseFamilyName(name)) {
      toast.error("Family name cannot be all capitals");
      return;
    }
    writeMap({
      address: mapAddress,
      abi: MAFIA_MAP_ABI,
      functionName: "purchaseFamilyHQ",
      args: [cid, s.x, s.y, name],
    });
  };

  return (
    <div
      className="pointer-events-auto max-h-[min(85vh,560px)] w-full overflow-y-auto rounded-xl border border-border bg-popover p-3 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-map-tile-detail-title"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-3 w-3 rounded-sm shrink-0 mt-0.5"
            style={{ backgroundColor: typeMeta.fill }}
          />
          <span
            id="city-map-tile-detail-title"
            className="text-sm font-semibold text-foreground"
          >
            {typeMeta.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground shrink-0">Coords</span>
          <span className="font-mono text-foreground">
            ({cell.x}, {cell.y})
          </span>
        </div>
        {buildingLabel && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Building</span>
            <span className="text-foreground text-right">{buildingLabel}</span>
          </div>
        )}
        {cell.name && !buildingLabel && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Slot type</span>
            <span className="text-foreground text-right truncate">{cell.name}</span>
          </div>
        )}
        {cell.owner && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Owner</span>
            {s && slotHasOwner(s) ? (
              <a
                href={explorerAddressUrl(explorer, s.owner)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-[min(100%,12rem)] items-center justify-end gap-1 font-mono text-sm text-primary truncate hover:underline"
              >
                <span className="truncate">{cell.owner}</span>
                <ExternalLink
                  className="h-3 w-3 shrink-0 opacity-80"
                  aria-hidden
                />
              </a>
            ) : (
              <span className="truncate text-right font-mono text-foreground">
                {cell.owner}
              </span>
            )}
          </div>
        )}

        {!s && (
          <p className="text-muted-foreground pt-1">Empty map tile (no on-chain slot).</p>
        )}

        {s && (
          <>
            <div className="border-t border-border pt-2 mt-1 space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Rarity</span>
                <span className="text-foreground">
                  {RARITY_LABELS[s.rarity] ?? s.rarity}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Defense</span>
                <span className="font-mono text-foreground">
                  {s.defensePower}
                  {s.originalDefensePower !== s.defensePower
                    ? ` (base ${s.originalDefensePower})`
                    : ""}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Boost</span>
                <span className="text-foreground">{s.boostPercentage}%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Owned</span>
                <span className="text-foreground">
                  {slotHasOwner(s) ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Activated</span>
                <span
                  className="text-foreground text-right"
                  title="Deposit MAFIA into the slot contract to activate. When active, eligible buildings accrue yield."
                >
                  {s.isOperating
                    ? "Yes (MAFIA deposited)"
                    : "No — deposit MAFIA"}
                </span>
              </div>
              {s.familyId > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Family ID</span>
                  <span className="font-mono text-foreground">{s.familyId}</span>
                </div>
              )}
              {s.inventoryItemId > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Item ID</span>
                  <span className="font-mono text-foreground">{s.inventoryItemId}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Staked MAFIA</span>
                <span className="font-mono text-foreground">
                  {formatMafiaStakingFromWei(s.stakingAmount)} MAFIA
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Yield (cached)</span>
                <span className="font-mono text-foreground">{s.yieldPayout}</span>
              </div>
            </div>

            {gameCashPer24h != null && (
              <div className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.07] px-2.5 py-2 mt-2 space-y-1">
                <p className="text-[11px] font-medium text-emerald-200/95">
                  Game Cash (office / apartment / mansion / hotel)
                </p>
                <p className="text-sm text-foreground">
                  <span className="font-semibold tabular-nums">
                    {gameCashPer24h.toLocaleString()}
                  </span>{" "}
                  Game Cash per 24 hours while activated
                </p>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Min. claim interval {YIELD_TIER_MIN_CLAIM_HOURS} hours · Max.
                  accrual {YIELD_TIER_MAX_ACCRUAL_DAYS} days
                </p>
                {!s.isOperating && (
                  <p className="text-[10px] text-amber-400/95 pt-0.5">
                    Deposit MAFIA to activate this slot — earnings apply after
                    activation.
                  </p>
                )}
              </div>
            )}

            {gameCashYieldTier && estimatedClaimableWei !== undefined && (
              <div className="rounded-md bg-secondary/40 px-2 py-1.5 mt-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  Claimable (live estimate, Game Cash)
                </p>
                <span className="font-mono font-medium text-foreground">
                  {formatWeiWholeUnits(estimatedClaimableWei)} Game Cash
                </span>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  Base from RPC + accrual since last day anchor · max{" "}
                  {YIELD_TIER_MAX_ACCRUAL_DAYS} days at your tier rate.
                </p>
              </div>
            )}

            {isMySlot && s.slotType === 3 && (
              <div className="border-t border-border pt-3 mt-2">
                <p className="text-[11px] text-muted-foreground">
                  Business tile — view only. Upgrades, deposits, and claims are
                  not available from the city map.
                </p>
              </div>
            )}

            {familyHqCreateEnabled && (
              <div className="border-t border-border pt-3 mt-2 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Create family
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This Family HQ has no family yet — you can found one from any
                  open HQ on the map. Cost:{" "}
                  <span className="font-mono text-foreground">
                    {FAMILY_HQ_CREATION_OG_CRATE_KEYS.toString()}
                  </span>{" "}
                  OG Crate keys (id {OG_CRATE_KEY_TOKEN_ID.toString()}). Approve
                  the map contract for OG Crate if prompted.
                </p>
                {isMySlot ? (
                  <p className="text-[10px] text-emerald-500/90">
                    You own this Family HQ plot.
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    You don&apos;t need to own this tile first — the map
                    contract assigns the HQ when the transaction succeeds.
                  </p>
                )}
                {isConnected && playerFamilyInfoLoading && (
                  <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    Checking family membership…
                  </p>
                )}
                {isConnected && playerFamilyInfoError && (
                  <p className="text-[11px] text-amber-500">
                    Could not load your family status from the chain. Try again
                    later.
                  </p>
                )}
                {isConnected && !playerFamilyInfoLoading && playerAlreadyHasFamily && (
                  <p className="text-[11px] text-amber-500">
                    You already belong to a family (id{" "}
                    <span className="font-mono">{playerFamilyId?.toString()}</span>
                    ). Leave on-chain before founding a new family
                    from the map.
                  </p>
                )}
                <div className="space-y-1">
                  <label
                    htmlFor="family-hq-name"
                    className="text-[11px] text-muted-foreground"
                  >
                    Family name
                  </label>
                  <Input
                    id="family-hq-name"
                    value={familyName}
                    onChange={(e) =>
                      setFamilyName(formatFamilyNameInput(e.target.value))
                    }
                    placeholder="e.g. Corleone"
                    maxLength={MAX_FAMILY_NAME_LEN}
                    disabled={
                      busy ||
                      playerFamilyInfoLoading ||
                      playerFamilyInfoError ||
                      playerAlreadyHasFamily
                    }
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Letters and spaces only · Up to {MAX_FAMILY_NAME_SPACES}{" "}
                    spaces · First letter auto-capitalized · No all-caps names
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {familyNameTrimmed.length}/{MAX_FAMILY_NAME_LEN}
                    {isConnected ? (
                      <>
                        {" "}
                        · Balance:{" "}
                        <span className="font-mono text-foreground">
                          {ogCrateKeyBalance.toString()}
                        </span>{" "}
                        keys
                      </>
                    ) : (
                      <> · Connect your wallet to see OG Crate key balance.</>
                    )}
                  </p>
                </div>
                {needsOgCrateApprovalForFamily && (
                  <button
                    type="button"
                    disabled={busy || !isConnected}
                    onClick={handleApproveOgCrateForMap}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    {ogCrateApprovePending || ogCrateApproveConfirming ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Approve OG Crate for map
                  </button>
                )}
                {isConnected &&
                  !needsOgCrateApprovalForFamily &&
                  !hasEnoughOgCrateForFamily && (
                    <p className="text-[11px] text-amber-500">
                      Not enough OG Crate keys (need{" "}
                      {FAMILY_HQ_CREATION_OG_CRATE_KEYS.toString()}, have{" "}
                      {ogCrateKeyBalance.toString()}).
                    </p>
                  )}
                <button
                  type="button"
                  disabled={busy || !canPurchaseFamilyHQ}
                  onClick={handlePurchaseFamilyHQ}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {mapPending || mapConfirming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Create family ({FAMILY_HQ_CREATION_OG_CRATE_KEYS.toString()} keys)
                </button>
                {!isConnected && (
                  <p className="text-[11px] text-amber-500">
                    Connect your wallet to create a family.
                  </p>
                )}
              </div>
            )}

            {isMySlot && s.slotType === 1 && (
              <div className="border-t border-border pt-3 mt-2 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Your slot
                </p>

                {slotHasOwner(s) &&
                  !s.isOperating &&
                  isResidentialEmptyTile(s.slotSubType) && (
                    <p className="text-[11px] text-muted-foreground">
                      Empty plots cannot be activated. Use{" "}
                      <span className="font-medium text-foreground">
                        Upgrade building
                      </span>{" "}
                      below to build a Shed first — then you can deposit MAFIA to
                      activate.
                    </p>
                  )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleClaim}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground",
                    "hover:bg-primary/90 disabled:opacity-50"
                  )}
                >
                  {mapPending || mapConfirming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Claim Game Cash
                </button>

                {showUpgrade && upgradeCostInfo && (
                  <div className="space-y-2 rounded-md border border-border bg-secondary/30 px-2.5 py-2">
                    <p className="text-[11px] font-medium text-foreground">
                      Upgrade to{" "}
                      {RESIDENTIAL_LEVEL_NAMES[upgradeCostInfo.nextTier]}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-mono text-foreground">
                        ${upgradeCostInfo.cash.toLocaleString()}
                      </span>{" "}
                      Game Cash
                      {ogCrateKeysNeeded > BigInt(0) ? (
                        <span>
                          {" "}
                          +{" "}
                          <span className="font-mono text-foreground">
                            {ogCrateKeysNeeded.toString()}
                          </span>{" "}
                          key (OG Crate)
                        </span>
                      ) : null}
                    </p>
                    {needsGameCashApprovalForUpgrade && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleApproveGameCashForMap}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        {gameCashApprovePending || gameCashApproveConfirming ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Approve Game Cash for map
                      </button>
                    )}
                    {needsOgCrateApprovalForUpgrade && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleApproveOgCrateForMap}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        {ogCrateApprovePending || ogCrateApproveConfirming ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Approve OG Crate for map
                      </button>
                    )}
                    {ogCrateKeysNeeded > BigInt(0) && !hasEnoughOgCrateKeys && (
                      <p className="text-[11px] text-amber-500">
                        Not enough OG Crate keys (balance:{" "}
                        {ogCrateKeyBalance.toString()}).
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={busy || !canUpgradeNow}
                      onClick={handleUpgrade}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-2 text-xs font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {mapPending || mapConfirming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Upgrade building
                    </button>
                  </div>
                )}

                {atMaxResidential && (
                  <p className="text-[11px] text-muted-foreground">
                    Residential building is fully upgraded (Large Hotel).
                  </p>
                )}
                {upgradeBlockedByCooldown && (
                  <p className="text-[11px] text-amber-400/95">
                    Next upgrade available{" "}
                    {new Date(s.nextUpgradeAvailableAt * 1000).toLocaleString()}
                  </p>
                )}

                {slotHasOwner(s) && !s.isOperating && activateHuman != null && (
                  <>
                    <p className="text-[11px] text-muted-foreground">
                      Activate this slot by depositing{" "}
                      <span className="font-mono text-foreground">
                        {activateHuman.toLocaleString()} MAFIA
                      </span>
                      . This sets the contract &quot;activated&quot; flag (
                      <code className="text-[10px]">isOperating</code>
                      ). Approve once if needed.
                    </p>
                    {needsApproveForActivate && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleApproveMafia}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        {approvePending || approveConfirming ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Approve MAFIA for map
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy || !canActivate}
                      onClick={handleActivate}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {mapPending || mapConfirming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Activate slot
                    </button>
                  </>
                )}

                {s.isOperating && isMafiaStakingPositive(s.stakingAmount) && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">
                      Withdraw MAFIA (amount)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={withdrawStr}
                        onChange={(e) => setWithdrawStr(e.target.value)}
                        placeholder="0.0"
                        className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleWithdraw}
                        className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                )}

                {!isConnected && (
                  <p className="text-[11px] text-amber-500">
                    Connect your wallet to manage this slot.
                  </p>
                )}
              </div>
            )}

            {slotHasOwner(s) && !isMySlot && address && (
              <p className="flex flex-wrap items-center gap-1 pt-2 text-[11px] text-muted-foreground">
                <span>Owner:</span>
                <a
                  href={explorerAddressUrl(explorer, s.owner)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                >
                  {shortAddress(s.owner)}
                  <ExternalLink
                    className="h-3 w-3 shrink-0 opacity-80"
                    aria-hidden
                  />
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
