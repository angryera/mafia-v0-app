"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import {
  AlertCircle,
  Plus,
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Search,
  ShoppingBag,
  User,
  XCircle,
} from "lucide-react";

import { useChain } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import {
  EXCHANGE_ADDRESSES,
  EXCHANGE_CONTRACT_ABI,
  ItemCategory,
  MARKETPLACE_ITEM_NAMES,
  City,
  CitySimple,
  BUILDING_STATS,
  type ChainId,
} from "@/lib/contract";
import {
  formatDateTime,
  formatRemaining,
  getOfferedItemText,
  getRequestItemText,
  matchRequestAgainstInventory,
  normalizeOffer,
  OTC_STATUS_ACCEPTED,
  OTC_STATUS_CANCELED,
  OTC_STATUS_OPEN,
  otcStatusLabel,
  shortAddress,
  type OTCOffer,
  type OTCRequestItem,
  type OwnedInventoryEntry,
  type OwnedSlotEntry,
} from "@/lib/otc-helpers";
import { cn } from "@/lib/utils";
import "@/types/mafia-globals"

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StatusFilter = "all" | "open" | "accepted" | "canceled" | "mine";

const PAGE_SIZE = 20;
const LAND_CATEGORY_ID = ItemCategory.LANDSLOT;
const LAND_X_MIN = 0;
const LAND_X_MAX = 49;
const LAND_Y_MIN = 0;
const LAND_Y_MAX = 29;

type RequestSourceOption = {
  key: string;
  label: string;
  categoryId: number;
  typeId: number;
  cityId: number;
  itemType: number;
};

type OwnedSlotWithSubtype = OwnedSlotEntry & {
  slotSubType?: number;
};

// ── Script loader ───────────────────────────────────────────────
function useOTCScripts() {
  const [exchangeReady, setExchangeReady] = useState(false);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mapApi = window.MafiaMapApi ?? window.MafiaMap;

    const load = (src: string, onReady: () => void, optional = false) => {
      const w = window as Window;
      // Already attached by some other module.
      if (src.includes("mafia-utils") && w.MafiaExchange && w.MafiaInventory) return onReady();

      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", onReady);
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = onReady;
      s.onerror = () => {
        if (!optional) setError(`Failed to load ${src}`);
      };
      document.head.appendChild(s);
    };

    load(
      "/js/mafia-utils.js",
      () => {
        setExchangeReady(Boolean(window.MafiaExchange));
        setInventoryReady(Boolean(window.MafiaInventory));
        setMapReady(
          Boolean(
            (window.MafiaMapApi ?? window.MafiaMap)?.getSlots ||
            (window.MafiaMapApi ?? window.MafiaMap)?.getLandSlotsByOwner,
          ),
        );
      },
      false,
    );

    if (mapApi?.getLandSlotsByOwner || mapApi?.getSlots) setMapReady(true);
  }, []);

  return { exchangeReady, inventoryReady, mapReady, error };
}

// ── Main component ──────────────────────────────────────────────
export function ExchangeOTCAction() {
  const { activeChain, chainConfig } = useChain();
  const chainId = activeChain as ChainId;
  const exchangeAddress = EXCHANGE_ADDRESSES[chainId];
  const explorer = chainConfig.explorer;
  const chainSlug = activeChain === "bnb" ? "bnb" : "pls";

  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();

  const { exchangeReady, inventoryReady, mapReady, error: scriptError } = useOTCScripts();

  // ── State ──────────────────────────────────────────────────────
  const [totalOffers, setTotalOffers] = useState<number | null>(null);
  const [offers, setOffers] = useState<OTCOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [ownedItems, setOwnedItems] = useState<OwnedInventoryEntry[]>([]);
  const [ownedSlots, setOwnedSlots] = useState<OwnedSlotWithSubtype[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [addRequestItemOpen, setAddRequestItemOpen] = useState(false);
  const [addLandRequestOpen, setAddLandRequestOpen] = useState(false);
  const [offeredItemIdsDraft, setOfferedItemIdsDraft] = useState<number[]>([]);
  const [requestItemsDraft, setRequestItemsDraft] = useState<OTCRequestItem[]>([]);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestSource, setRequestSource] = useState<"marketplace" | "inventory">("marketplace");
  const [landCityId, setLandCityId] = useState(0);
  const [landX, setLandX] = useState("");
  const [landY, setLandY] = useState("");
  const [selectedAcceptOffer, setSelectedAcceptOffer] = useState<OTCOffer | null>(null);
  const [acceptCheckLoading, setAcceptCheckLoading] = useState(false);
  const [acceptCheckError, setAcceptCheckError] = useState<string | null>(null);
  const [acceptCheckMissing, setAcceptCheckMissing] = useState<OTCRequestItem[]>([]);
  const [acceptMatchItemIds, setAcceptMatchItemIds] = useState<number[]>([]);

  // ── Pending on-chain actions ───────────────────────────────────
  const [pendingOfferId, setPendingOfferId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<"accept" | "cancel" | "create" | null>(null);

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    reset: resetWrite,
  } = useChainWriteContract();

  const { isLoading: isReceiptPending, isSuccess: isReceiptSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  // ── Load offers ────────────────────────────────────────────────
  const loadOffers = useCallback(async () => {
    if (!exchangeReady || !publicClient) return;
    if (typeof window === "undefined" || !window.MafiaExchange) return;

    setLoading(true);
    setLoadError(null);
    try {
      // Total count from contract (1-indexed counter).
      const totalRaw = (await publicClient.readContract({
        address: exchangeAddress as `0x${string}`,
        abi: EXCHANGE_CONTRACT_ABI,
        functionName: "otcOfferIds",
      })) as bigint;
      const total = Number(totalRaw);
      setTotalOffers(total);

      if (total <= 0) {
        setOffers([]);
        return;
      }

      // Fetch the full list in chunks of 200; most games will have fewer than
      // a few hundred offers. This is still miles cheaper than N individual
      // reads because the helper batches them with multicall.
      const CHUNK = 200;
      const rawOffers: OTCOffer[] = [];
      for (let start = 0; start < total; start += CHUNK) {
        const length = Math.min(CHUNK, total - start);
        const batch = await window.MafiaExchange.getOTCOffers({
          chain: chainSlug,
          startIndex: start,
          length,
          contractAddress: exchangeAddress,
        });
        batch.forEach((raw, idx) => {
          // offerId is 1-indexed in storage: startIndex=0 → offerId=1.
          const offerId = start + idx;
          rawOffers.push(normalizeOffer(raw, offerId));
        });
      }

      // Newest first.
      rawOffers.sort((a, b) => b.offerId - a.offerId);
      setOffers(rawOffers);
    } catch (e) {
      console.log("[v0] Failed to load OTC offers:", e);
      setLoadError((e as Error).message ?? "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [exchangeReady, publicClient, exchangeAddress, chainSlug, chainConfig.rpc]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const loadOwnedInventory = useCallback(async () => {
    if (!isConnected || !address || !inventoryReady || typeof window === "undefined" || !window.MafiaInventory?.getAllItemsByOwner) {
      setOwnedItems([]);
      setOwnedSlots([]);
      return;
    }
    const mapApi = window.MafiaMapApi ?? window.MafiaMap;
    setInventoryLoading(true);
    try {
      const itemsPromise = window.MafiaInventory.getAllItemsByOwner({
        chain: chainSlug,
        owner: address,
      }) as Promise<OwnedInventoryEntry[]>;

      const canLoadSlots = mapReady && mapApi?.getLandSlotsByOwner;
      const allCityIds = Object.keys(City).map(Number).filter((n) => Number.isFinite(n));
      const slotsPromise: Promise<OwnedSlotWithSubtype[]> = canLoadSlots
        ? (mapApi.getLandSlotsByOwner({
          chain: chainSlug,
          owner: address,
          cityIds: allCityIds,
          requireInventoryItem: true,
        }) as Promise<any[]>).then((rawSlots) =>
          rawSlots.map((s) => ({
            ...s,
            cityId: Number(s.cityId),
            slotX: Number(s.x),
            slotY: Number(s.y),
            inventoryItemId: Number(s.inventoryItemId),
            slotSubType: Number(s.slotSubType),
          })),
        )
        : Promise.resolve([]);

      const [items, slots] = await Promise.all([itemsPromise, slotsPromise]);
      setOwnedItems(items);
      setOwnedSlots(slots);
    } catch (e) {
      console.log("[v0] Failed to load owned inventory:", e);
      setOwnedItems([]);
      setOwnedSlots([]);
    } finally {
      setInventoryLoading(false);
    }
  }, [isConnected, address, inventoryReady, mapReady, chainSlug]);

  useEffect(() => {
    if (createDialogOpen) {
      void loadOwnedInventory();
    }
  }, [createDialogOpen, loadOwnedInventory]);

  useEffect(() => {
    if (acceptDialogOpen) {
      void loadOwnedInventory();
    }
  }, [acceptDialogOpen, loadOwnedInventory]);

  // ── Success handling: refresh on receipt ───────────────────────
  const lastSuccessHash = useRef<`0x${string}` | null>(null);
  useEffect(() => {
    if (!isReceiptSuccess || !txHash) return;
    if (lastSuccessHash.current === txHash) return;
    lastSuccessHash.current = txHash;

    if (pendingAction === "accept") {
      toast.success("Offer accepted");
      setAcceptDialogOpen(false);
      setSelectedAcceptOffer(null);
      setAcceptCheckError(null);
      setAcceptCheckMissing([]);
      setAcceptMatchItemIds([]);
    } else if (pendingAction === "cancel") {
      toast.success("Offer canceled");
    } else if (pendingAction === "create") {
      toast.success("OTC offer created");
      setCreateDialogOpen(false);
      setOfferedItemIdsDraft([]);
      setRequestItemsDraft([]);
    }
    setPendingOfferId(null);
    setPendingAction(null);
    resetWrite();
    void loadOffers();
  }, [isReceiptSuccess, txHash, pendingAction, resetWrite, loadOffers]);

  // ── Filtering + pagination ─────────────────────────────────────
  const filteredOffers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offers.filter((o) => {
      // Status filter
      if (filter === "open" && o.status !== OTC_STATUS_OPEN) return false;
      if (filter === "accepted" && o.status !== OTC_STATUS_ACCEPTED) return false;
      if (filter === "canceled" && o.status !== OTC_STATUS_CANCELED) return false;
      if (filter === "mine") {
        if (!address) return false;
        if (o.creator.toLowerCase() !== address.toLowerCase()) return false;
      }

      if (!q) return true;

      if (String(o.offerId) === q) return true;
      if (o.creator.toLowerCase().includes(q)) return true;

      const offeredText = o.offeredItems
        .map((it) => getOfferedItemText(it).toLowerCase())
        .join(" ");
      const requestedText = o.requestItems
        .map((it) => getRequestItemText(it).toLowerCase())
        .join(" ");
      return offeredText.includes(q) || requestedText.includes(q);
    });
  }, [offers, filter, query, address]);

  const pageCount = Math.max(1, Math.ceil(filteredOffers.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const visibleOffers = filteredOffers.slice(
    clampedPage * PAGE_SIZE,
    (clampedPage + 1) * PAGE_SIZE,
  );

  useEffect(() => {
    // Reset to first page when filters change.
    setPage(0);
  }, [filter, query]);

  // ── Actions ────────────────────────────────────────────────────
  const handleCancel = useCallback(
    (offer: OTCOffer) => {
      if (!isConnected) {
        toast.error("Connect your wallet first");
        return;
      }
      setPendingOfferId(offer.offerId);
      setPendingAction("cancel");
      writeContract({
        address: exchangeAddress as `0x${string}`,
        abi: EXCHANGE_CONTRACT_ABI,
        functionName: "cancelOTCOffer",
        args: [BigInt(offer.offerId)],
      });
    },
    [isConnected, writeContract, exchangeAddress],
  );

  const runAcceptInventoryCheck = useCallback(
    async (offer: OTCOffer) => {
      setAcceptCheckLoading(true);
      setAcceptCheckError(null);
      setAcceptCheckMissing([]);
      setAcceptMatchItemIds([]);

      if (!isConnected || !address) {
        setAcceptCheckError("Connect your wallet first");
        setAcceptCheckLoading(false);
        return;
      }
      if (!inventoryReady || typeof window === "undefined" || !window.MafiaInventory?.getAllItemsByOwner) {
        setAcceptCheckError("Inventory script not ready yet, try again in a moment");
        setAcceptCheckLoading(false);
        return;
      }

      try {
        const inventory =
          ownedItems.length > 0
            ? ownedItems
            : ((await window.MafiaInventory.getAllItemsByOwner({
              chain: chainSlug,
              owner: address,
            })) as OwnedInventoryEntry[]);

        // Only fetch land slots if any land is required.
        const needsLand = offer.requestItems.some((r) => Number(r.itemType) === 2);
        let slots: OwnedSlotWithSubtype[] = [];
        if (needsLand) {
          const mapApi = window.MafiaMapApi ?? window.MafiaMap;
          if (!mapReady || !mapApi?.getLandSlotsByOwner) {
            setAcceptCheckError("Map script not ready; cannot verify land slots");
            return;
          }
          slots = ownedSlots;
          if (slots.length === 0) {
            const cityIds = Array.from(
              new Set(offer.requestItems.filter((r) => Number(r.itemType) === 2).map((r) => r.cityId)),
            );
            const rawSlots = await mapApi.getLandSlotsByOwner({
              chain: chainSlug,
              owner: address,
              cityIds,
              requireInventoryItem: true,
            });
            slots = rawSlots.map((s) => ({
              cityId: Number(s.cityId),
              slotX: Number(s.x),
              slotY: Number(s.y),
              inventoryItemId: Number(s.inventoryItemId),
              slotSubType: Number(s.slotSubType),
            }));
          }
        }
        console.log("slots", slots);
        console.log("offer.requestItems", offer.requestItems);

        const match = matchRequestAgainstInventory(offer.requestItems, inventory, slots);
        setAcceptCheckMissing(match.missing);
        setAcceptMatchItemIds(match.myItemIds);
      } catch (e) {
        console.log("[v0] Failed to prepare accept:", e);
        setAcceptCheckError((e as Error).message ?? "Failed to check inventory");
      } finally {
        setAcceptCheckLoading(false);
      }
    },
    [isConnected, address, inventoryReady, mapReady, chainSlug, ownedItems, ownedSlots],
  );

  const openAcceptDialog = useCallback(
    (offer: OTCOffer) => {
      setSelectedAcceptOffer(offer);
      setAcceptDialogOpen(true);
      void runAcceptInventoryCheck(offer);
    },
    [runAcceptInventoryCheck],
  );

  const confirmAcceptFromDialog = useCallback(() => {
    if (!selectedAcceptOffer) return;
    if (acceptCheckLoading) return;
    if (acceptCheckError) {
      toast.error(acceptCheckError);
      return;
    }
    if (acceptCheckMissing.length > 0) {
      const missingText = acceptCheckMissing.map((m) => getRequestItemText(m)).join(", ");
      toast.error(`Missing items: ${missingText}`);
      return;
    }
    if (acceptMatchItemIds.length !== selectedAcceptOffer.requestItems.length) {
      toast.error("Inventory check is incomplete. Please run the check again.");
      return;
    }

    setPendingOfferId(selectedAcceptOffer.offerId);
    setPendingAction("accept");
    writeContract({
      address: exchangeAddress as `0x${string}`,
      abi: EXCHANGE_CONTRACT_ABI,
      functionName: "acceptOTCOffer",
      args: [BigInt(selectedAcceptOffer.offerId), acceptMatchItemIds.map((n) => BigInt(n))],
    });
  }, [
    selectedAcceptOffer,
    acceptCheckLoading,
    acceptCheckError,
    acceptCheckMissing,
    acceptMatchItemIds,
    writeContract,
    exchangeAddress,
  ]);

  const marketplaceRequestOptions = useMemo<RequestSourceOption[]>(() => {
    const options: RequestSourceOption[] = [];
    const cityOptions = Object.entries(City)
      .filter(([k]) => !Number.isNaN(Number(k)))
      .map(([key]) => Number(key));

    for (const [categoryKey, typeMap] of Object.entries(MARKETPLACE_ITEM_NAMES)) {
      const categoryId = Number(categoryKey);
      if (categoryId === LAND_CATEGORY_ID || categoryId === ItemCategory.BUSINESS_EXTRA) continue;
      const seenLabelsInCategory = new Set<string>();

      for (const [typeKey, label] of Object.entries(typeMap ?? {})) {
        const typeId = Number(typeKey);
        const normalizedLabel = String(label).trim().toLowerCase();
        if (seenLabelsInCategory.has(normalizedLabel)) continue;
        seenLabelsInCategory.add(normalizedLabel);

        const itemType =
          categoryId === ItemCategory.BUSINESS ? 1 : 0;
        if (itemType === 1) {
          cityOptions.forEach((cityId) => {
            options.push({
              key: `m-${categoryId}-${typeId}-c-${cityId}`,
              label: `${label} - ${City[cityId] ?? `City #${cityId}`}`,
              categoryId,
              typeId,
              cityId,
              itemType,
            });
          });
        } else {
          options.push({
            key: `m-${categoryId}-${typeId}`,
            label,
            categoryId,
            typeId,
            cityId: 0,
            itemType,
          });
        }
      }
    }
    return options;
  }, []);

  const inventoryRequestOptions = useMemo<RequestSourceOption[]>(() => {
    return ownedItems
      .filter(
        (it) =>
          it.categoryId !== LAND_CATEGORY_ID &&
          it.categoryId !== ItemCategory.BUSINESS_EXTRA,
      )
      .map((it) => ({
        key: `i-${it.itemId}`,
        label: `From inventory: ${getOfferedItemText({ ...it, owner: it.owner as `0x${string}`, itemId: Number(it.itemId) })}`,
        categoryId: Number(it.categoryId),
        typeId: Number(it.typeId),
        cityId:
          it.categoryId === ItemCategory.BUSINESS || it.categoryId === ItemCategory.BUSINESS_EXTRA
            ? Number(it.cityId)
            : 0,
        itemType:
          it.categoryId === ItemCategory.BUSINESS || it.categoryId === ItemCategory.BUSINESS_EXTRA ? 1 : 0,
      }));
  }, [ownedItems]);

  const requestOptions = useMemo(() => {
    const sourceOptions = requestSource === "marketplace" ? marketplaceRequestOptions : inventoryRequestOptions;
    const q = requestSearch.trim().toLowerCase();
    if (!q) return sourceOptions;
    return sourceOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [requestSource, marketplaceRequestOptions, inventoryRequestOptions, requestSearch]);

  const acceptMissingSummary = useMemo(() => {
    if (!selectedAcceptOffer) return [];

    const toKey = (item: OTCRequestItem) =>
      `${item.itemType}-${item.categoryId}-${item.typeId}-${item.cityId}-${item.x}-${item.y}`;

    const requiredCount = new Map<string, number>();
    const missingCount = new Map<string, number>();
    const labelByKey = new Map<string, string>();

    selectedAcceptOffer.requestItems.forEach((item) => {
      const key = toKey(item);
      requiredCount.set(key, (requiredCount.get(key) ?? 0) + 1);
      if (!labelByKey.has(key)) labelByKey.set(key, getRequestItemText(item));
    });
    acceptCheckMissing.forEach((item) => {
      const key = toKey(item);
      missingCount.set(key, (missingCount.get(key) ?? 0) + 1);
      if (!labelByKey.has(key)) labelByKey.set(key, getRequestItemText(item));
    });

    return Array.from(missingCount.entries())
      .map(([key, missing]) => ({
        key,
        label: labelByKey.get(key) ?? key,
        missing,
        required: requiredCount.get(key) ?? missing,
      }))
      .sort((a, b) => b.missing - a.missing || a.label.localeCompare(b.label));
  }, [selectedAcceptOffer, acceptCheckMissing]);

  const offeredSelectableItems = useMemo(
    () => {
      const filtered = ownedItems.filter((it) => it.categoryId !== ItemCategory.BUSINESS_EXTRA);
      if (!address) return filtered;

      const existingIds = new Set(filtered.map((it) => Number(it.itemId)));
      const slotBackedLandItems: OwnedInventoryEntry[] = ownedSlots
        .filter((slot) => !existingIds.has(Number(slot.inventoryItemId)))
        .map((slot) => ({
          itemId: Number(slot.inventoryItemId),
          categoryId: LAND_CATEGORY_ID,
          typeId: 0,
          cityId: Number(slot.cityId),
          owner: address,
        }));

      return [...filtered, ...slotBackedLandItems];
    },
    [ownedItems, ownedSlots, address],
  );

  const ownedSlotByItemId = useMemo(() => {
    const map = new Map<number, OwnedSlotWithSubtype>();
    ownedSlots.forEach((slot) => {
      map.set(Number(slot.inventoryItemId), slot);
    });
    return map;
  }, [ownedSlots]);

  const getOfferedSelectableText = useCallback((item: OwnedInventoryEntry) => {
    if (item.categoryId === LAND_CATEGORY_ID) {
      const slot = ownedSlotByItemId.get(Number(item.itemId));
      if (slot) {
        const cityLabel = CitySimple[slot.cityId] ?? City[slot.cityId] ?? `City #${slot.cityId}`;
        const buildingName =
          typeof slot.slotSubType === "number" && Number.isFinite(slot.slotSubType)
            ? BUILDING_STATS[slot.slotSubType]?.name
            : undefined;
        return `${buildingName ?? "Land Slot"} #${cityLabel}-${slot.slotX}-${slot.slotY} (ID: ${item.itemId})`;
      }
    }
    return getOfferedItemText({ ...item, owner: item.owner as `0x${string}`, itemId: Number(item.itemId) });
  }, [ownedSlotByItemId]);

  const offeredItemsDraft = useMemo(
    () =>
      offeredSelectableItems.filter((it) =>
        offeredItemIdsDraft.includes(Number(it.itemId)),
      ),
    [offeredSelectableItems, offeredItemIdsDraft],
  );

  useEffect(() => {
    const selectableIds = new Set(offeredSelectableItems.map((it) => Number(it.itemId)));
    setOfferedItemIdsDraft((prev) => prev.filter((id) => selectableIds.has(id)));
  }, [offeredSelectableItems]);

  const addRequestOption = (opt: RequestSourceOption) => {
    setRequestItemsDraft((prev) => [
      ...prev,
      {
        itemType: opt.itemType,
        categoryId: opt.categoryId,
        typeId: opt.typeId,
        cityId: opt.cityId,
        x: 0,
        y: 0,
      },
    ]);
    setAddRequestItemOpen(false);
  };

  const addLandRequest = () => {
    const xText = landX.trim();
    const yText = landY.trim();
    if (!/^\d+$/.test(xText) || !/^\d+$/.test(yText)) {
      toast.error("Coordinates must be whole numbers");
      return;
    }

    const x = Number(xText);
    const y = Number(yText);
    if (
      x < LAND_X_MIN ||
      x > LAND_X_MAX ||
      y < LAND_Y_MIN ||
      y > LAND_Y_MAX
    ) {
      toast.error(`Coordinates out of range: X ${LAND_X_MIN}-${LAND_X_MAX}, Y ${LAND_Y_MIN}-${LAND_Y_MAX}`);
      return;
    }

    setRequestItemsDraft((prev) => [
      ...prev,
      {
        itemType: 2,
        categoryId: LAND_CATEGORY_ID,
        typeId: 0,
        cityId: landCityId,
        x,
        y,
      },
    ]);
    setAddLandRequestOpen(false);
    setLandX("");
    setLandY("");
  };

  const handleCreateOffer = () => {
    if (!isConnected) {
      toast.error("Connect your wallet first");
      return;
    }
    if (offeredItemsDraft.length === 0) {
      toast.error("Select at least one offered item");
      return;
    }
    if (requestItemsDraft.length === 0) {
      toast.error("Add at least one requested item");
      return;
    }
    setPendingAction("create");
    setPendingOfferId(null);
    writeContract({
      address: exchangeAddress as `0x${string}`,
      abi: EXCHANGE_CONTRACT_ABI,
      functionName: "createOTCOffer",
      args: [
        offeredItemsDraft.map((item) => BigInt(Number(item.itemId))),
        requestItemsDraft.map((r) => ({
          itemType: BigInt(r.itemType),
          categoryId: BigInt(r.categoryId),
          typeId: BigInt(r.typeId),
          cityId: BigInt(r.cityId),
          x: BigInt(r.x),
          y: BigInt(r.y),
        })),
      ],
    });
  };

  // ── Render helpers ─────────────────────────────────────────────
  const isBusy = (offerId: number) =>
    pendingOfferId === offerId && (isWritePending || isReceiptPending);

  const filterButton = (value: StatusFilter, label: string) => (
    <button
      type="button"
      key={value}
      onClick={() => setFilter(value)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        filter === value
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header + refresh */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">OTC Offers</h2>
            <p className="text-xs text-muted-foreground">
              {totalOffers === null
                ? "Loading offers…"
                : `${totalOffers.toLocaleString()} total offer${totalOffers === 1 ? "" : "s"} on-chain`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setCreateDialogOpen(true);
                setRequestSearch("");
                setRequestSource("marketplace");
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="ml-1.5">Create OTC Trade</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadOffers()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {filterButton("open", "Open")}
          {filterButton("mine", "My Offers")}
          {filterButton("accepted", "Completed")}
          {filterButton("canceled", "Canceled")}
          {filterButton("all", "All")}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by offer id, creator address, or item"
            className="pl-9"
          />
        </div>
      </div>

      {/* Errors */}
      {scriptError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-xs text-destructive">
            <p className="font-medium">Helper script failed to load</p>
            <p className="text-destructive/80">{scriptError}</p>
          </div>
        </div>
      )}
      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-xs text-destructive">
            <p className="font-medium">Failed to fetch offers</p>
            <p className="text-destructive/80">{loadError}</p>
          </div>
        </div>
      )}

      {/* List */}
      {loading && offers.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-border bg-card p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading OTC offers…</span>
        </div>
      ) : visibleOffers.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <PackageOpen className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">No offers found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different filter or search query.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleOffers.map((offer) => (
            <OfferCard
              key={offer.offerId}
              offer={offer}
              myAddress={address}
              explorer={explorer}
              isBusy={isBusy(offer.offerId)}
              onAccept={() => openAcceptDialog(offer)}
              onCancel={() => handleCancel(offer)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredOffers.length > PAGE_SIZE && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-xs text-muted-foreground">
            Page {clampedPage + 1} of {pageCount} · {filteredOffers.length.toLocaleString()} results
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={clampedPage === 0}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={clampedPage >= pageCount - 1}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={acceptDialogOpen}
        onOpenChange={(open) => {
          setAcceptDialogOpen(open);
          if (!open) {
            setSelectedAcceptOffer(null);
            setAcceptCheckError(null);
            setAcceptCheckMissing([]);
            setAcceptMatchItemIds([]);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAcceptOffer ? `Accept OTC Offer #${selectedAcceptOffer.offerId}` : "Accept OTC Offer"}
            </DialogTitle>
            <DialogDescription>
              Review offer details and check your inventory before confirming.
            </DialogDescription>
          </DialogHeader>

          {selectedAcceptOffer ? (
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <ItemList
                  title="Offered"
                  icon={<PackageCheck className="h-3 w-3 text-emerald-400" />}
                  items={selectedAcceptOffer.offeredItems.map((it) => getOfferedItemText(it))}
                  emptyLabel="No offered items"
                />
                <ItemList
                  title="Requested"
                  icon={<PackageOpen className="h-3 w-3 text-amber-400" />}
                  items={selectedAcceptOffer.requestItems.map((it) => getRequestItemText(it))}
                  emptyLabel="No requested items"
                />
              </div>

              <div className="rounded-lg border border-border bg-background/40 p-3 text-xs">
                {acceptCheckLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking your inventory...
                  </div>
                ) : acceptCheckError ? (
                  <div className="text-destructive">
                    <p className="font-medium">Inventory check failed</p>
                    <p className="mt-1 text-destructive/80">{acceptCheckError}</p>
                  </div>
                ) : acceptCheckMissing.length > 0 ? (
                  <div className="text-amber-400">
                    <p className="font-medium">Missing in your inventory</p>
                    <p className="mt-1 text-amber-300/90">
                      {acceptCheckMissing.length} missing of {selectedAcceptOffer.requestItems.length} required item
                      {selectedAcceptOffer.requestItems.length === 1 ? "" : "s"}.
                    </p>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {acceptMissingSummary.map((row) => (
                        <li key={row.key}>
                          · {row.label} (missing {row.missing} / required {row.required})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-emerald-400">
                    <p className="font-medium">Inventory check passed</p>
                    <p className="mt-1 text-emerald-300/90">
                      Ready to send {acceptMatchItemIds.length} matching item
                      {acceptMatchItemIds.length === 1 ? "" : "s"}.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    void runAcceptInventoryCheck(selectedAcceptOffer);
                  }}
                  disabled={acceptCheckLoading || (pendingAction === "accept" && isWritePending)}
                >
                  {acceptCheckLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">Recheck</span>
                </Button>
                <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={confirmAcceptFromDialog}
                  disabled={
                    acceptCheckLoading ||
                    Boolean(acceptCheckError) ||
                    acceptCheckMissing.length > 0 ||
                    acceptMatchItemIds.length !== selectedAcceptOffer.requestItems.length ||
                    (pendingAction === "accept" && isWritePending)
                  }
                >
                  {pendingAction === "accept" && isWritePending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5">Confirm Accept</span>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Create OTC Trade</DialogTitle>
            <DialogDescription>
              Select items you offer on the left and items you want on the right.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Items You Offer</h4>
                <span className="text-xs text-muted-foreground">{offeredItemsDraft.length} selected</span>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {inventoryLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading inventory...
                  </div>
                ) : offeredSelectableItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No inventory items found.</p>
                ) : (
                  offeredSelectableItems.map((item) => {
                    const selected = offeredItemIdsDraft.includes(Number(item.itemId));
                    return (
                      <button
                        key={item.itemId}
                        type="button"
                        onClick={() =>
                          setOfferedItemIdsDraft((prev) =>
                            selected
                              ? prev.filter((id) => id !== Number(item.itemId))
                              : [...prev, Number(item.itemId)],
                          )
                        }
                        className={cn(
                          "flex w-full items-center justify-between rounded border px-2 py-1 text-left text-xs",
                          selected ? "border-primary/50 bg-primary/10" : "border-border/50 bg-background/50 hover:bg-muted/40",
                        )}
                      >
                        <span className="truncate">{getOfferedSelectableText(item)}</span>
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {selected ? "Selected" : "Add"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Items You Want</h4>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAddRequestItemOpen(true)}>
                    Add Item
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddLandRequestOpen(true)}>
                    Add Land
                  </Button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {requestItemsDraft.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No requested items yet.</p>
                ) : (
                  requestItemsDraft.map((req, idx) => (
                    <div
                      key={`${req.itemType}-${req.categoryId}-${req.typeId}-${req.cityId}-${req.x}-${req.y}-${idx}`}
                      className="flex items-center justify-between rounded border border-border/50 bg-background/50 px-2 py-1"
                    >
                      <span className="truncate text-xs">{getRequestItemText(req)}</span>
                      <button
                        type="button"
                        onClick={() => setRequestItemsDraft((prev) => prev.filter((_, i) => i !== idx))}
                        className="ml-2 text-[10px] text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleCreateOffer}
              disabled={isWritePending || isReceiptPending}
            >
              {pendingAction === "create" && (isWritePending || isReceiptPending) ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="ml-1.5">Creating...</span>
                </>
              ) : (
                "Create OTC Offer"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addRequestItemOpen} onOpenChange={setAddRequestItemOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Requested Item</DialogTitle>
            <DialogDescription>Select from marketplace options or your inventory items.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={requestSource === "marketplace" ? "default" : "outline"}
              onClick={() => setRequestSource("marketplace")}
            >
              Marketplace Options
            </Button>
            <Button
              size="sm"
              variant={requestSource === "inventory" ? "default" : "outline"}
              onClick={() => setRequestSource("inventory")}
            >
              My Inventory
            </Button>
          </div>
          <Input
            value={requestSearch}
            onChange={(e) => setRequestSearch(e.target.value)}
            placeholder="Search options..."
          />
          <div className="max-h-80 overflow-y-auto space-y-1">
            {requestOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matching options.</p>
            ) : (
              requestOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => addRequestOption(opt)}
                  className="flex w-full items-center justify-between rounded border border-border/50 bg-background/50 px-2 py-1 text-left text-xs hover:bg-muted/40"
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                    Cat {opt.categoryId} · Type {opt.typeId}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addLandRequestOpen} onOpenChange={setAddLandRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Land Slot Request</DialogTitle>
            <DialogDescription>
              Select city and coordinates for the land slot (X: 0-49, Y: 0-29).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">City</label>
              <select
                value={landCityId}
                onChange={(e) => setLandCityId(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(City)
                  .filter(([k]) => !Number.isNaN(Number(k)))
                  .map(([key, name]) => (
                    <option key={key} value={Number(key)}>
                      {String(name)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">X</label>
                <Input
                  type="number"
                  min={LAND_X_MIN}
                  max={LAND_X_MAX}
                  step={1}
                  value={landX}
                  onChange={(e) => setLandX(e.target.value)}
                  placeholder="0-49"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Y</label>
                <Input
                  type="number"
                  min={LAND_Y_MIN}
                  max={LAND_Y_MAX}
                  step={1}
                  value={landY}
                  onChange={(e) => setLandY(e.target.value)}
                  placeholder="0-29"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddLandRequestOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addLandRequest}>Add Land Request</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────
function OfferCard({
  offer,
  myAddress,
  explorer,
  isBusy,
  onAccept,
  onCancel,
}: {
  offer: OTCOffer;
  myAddress: `0x${string}` | undefined;
  explorer: string;
  isBusy: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const now = Math.floor(Date.now() / 1000);
  const isMine = myAddress ? offer.creator.toLowerCase() === myAddress.toLowerCase() : false;
  const isOpen = offer.status === OTC_STATUS_OPEN;
  const isExpired = isOpen && offer.expireAt > 0 && offer.expireAt <= now;

  const statusLabel = isExpired ? "Expired" : otcStatusLabel(offer.status);
  const statusStyles = isExpired
    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
    : offer.status === OTC_STATUS_OPEN
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : offer.status === OTC_STATUS_ACCEPTED
        ? "border-sky-500/40 bg-sky-500/10 text-sky-400"
        : "border-muted-foreground/30 bg-muted text-muted-foreground";

  return (
    <article className="rounded-lg border border-border bg-card p-3">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">Offer #{offer.offerId}</h3>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="h-2.5 w-2.5" />
              <a
                href={`${explorer}/address/${offer.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-primary hover:underline"
              >
                {shortAddress(offer.creator)}
              </a>
              {isMine && (
                <Badge variant="outline" className="h-4 border-primary/40 px-1.5 text-[9px] text-primary">
                  You
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn("h-5 px-2 text-[10px] font-medium", statusStyles)}>
          {statusLabel}
        </Badge>
      </header>

      {/* Items grid */}
      <div className="grid gap-2 py-2 md:grid-cols-2">
        <ItemList
          title="Offered"
          icon={<PackageCheck className="h-3 w-3 text-emerald-400" />}
          items={offer.offeredItems.map((it) => getOfferedItemText(it))}
          emptyLabel="No offered items"
        />
        <ItemList
          title="Requested"
          icon={<PackageOpen className="h-3 w-3 text-amber-400" />}
          items={offer.requestItems.map((it) => getRequestItemText(it))}
          emptyLabel="No requested items"
        />
      </div>

      {/* Footer: times + actions */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-2.5 w-2.5" />
            Created {formatDateTime(offer.createdAt)}
          </span>
          {offer.expireAt > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-2.5 w-2.5" />
              {isOpen
                ? isExpired
                  ? `Expired ${formatDateTime(offer.expireAt)}`
                  : `Expires in ${formatRemaining(offer.expireAt, now)}`
                : `Expires ${formatDateTime(offer.expireAt)}`}
            </span>
          )}
          <a
            href={`${explorer}/address/${offer.creator}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            View creator
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && !isExpired && !isMine && (
            <Button size="sm" onClick={onAccept} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Accept</span>
            </Button>
          )}
          {isOpen && !isExpired && isMine && (
            <Button size="sm" variant="outline" onClick={onCancel} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Cancel</span>
            </Button>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
              <Ban className="h-3 w-3" />
              Expired
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}

function ItemList({
  title,
  icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-md bg-background/50 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
        {icon}
        <span>{title}</span>
        <span className="text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((text, idx) => (
            <li
              key={idx}
              className="truncate text-[11px] text-muted-foreground"
              title={text}
            >
              · {text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
