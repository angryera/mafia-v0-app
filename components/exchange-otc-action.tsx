"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import {
  AlertCircle,
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
  type OwnedInventoryEntry,
  type OwnedSlotEntry,
} from "@/lib/otc-helpers";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type StatusFilter = "all" | "open" | "accepted" | "canceled" | "mine";

const PAGE_SIZE = 20;

// ── Script loader ───────────────────────────────────────────────
function useOTCScripts() {
  const [exchangeReady, setExchangeReady] = useState(false);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const load = (src: string, onReady: () => void, optional = false) => {
      const w = window as Window;
      // Already attached by some other module.
      if (src.includes("mafia-utils") && w.MafiaExchange) return onReady();
      if (src.includes("mafia-inventory") && w.MafiaInventory) return onReady();
      if (src.includes("mafia-map") && w.MafiaMap) return onReady();

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

    load("/js/mafia-utils.js", () => setExchangeReady(true));
    load("/js/mafia-inventory.js", () => setInventoryReady(true));
    load("/js/mafia-map.js", () => setMapReady(true), true);
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

  // ── Pending on-chain actions ───────────────────────────────────
  const [pendingOfferId, setPendingOfferId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<"accept" | "cancel" | null>(null);

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
          rpcUrl: chainConfig.rpc,
        });
        batch.forEach((raw, idx) => {
          // offerId is 1-indexed in storage: startIndex=0 → offerId=1.
          const offerId = start + idx + 1;
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

  // ── Success handling: refresh on receipt ───────────────────────
  const lastSuccessHash = useRef<`0x${string}` | null>(null);
  useEffect(() => {
    if (!isReceiptSuccess || !txHash) return;
    if (lastSuccessHash.current === txHash) return;
    lastSuccessHash.current = txHash;

    if (pendingAction === "accept") {
      toast.success("Offer accepted");
    } else if (pendingAction === "cancel") {
      toast.success("Offer canceled");
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

  const handleAccept = useCallback(
    async (offer: OTCOffer) => {
      if (!isConnected || !address) {
        toast.error("Connect your wallet first");
        return;
      }
      if (!inventoryReady || typeof window === "undefined" || !window.MafiaInventory?.getAllItemsByOwner) {
        toast.error("Inventory script not ready yet, try again in a moment");
        return;
      }
      setPendingOfferId(offer.offerId);
      setPendingAction("accept");

      try {
        toast.info("Checking your inventory…");
        const inventory = (await window.MafiaInventory.getAllItemsByOwner({
          chain: chainSlug,
          owner: address,
          rpcUrl: chainConfig.rpc,
        })) as OwnedInventoryEntry[];

        // Only fetch land slots if any land is required.
        const needsLand = offer.requestItems.some((r) => Number(r.itemType) === 2);
        let slots: OwnedSlotEntry[] = [];
        if (needsLand) {
          if (!mapReady || !window.MafiaMap?.getLandSlotsByOwner) {
            toast.error("Map script not ready; cannot verify land slots");
            setPendingOfferId(null);
            setPendingAction(null);
            return;
          }
          const cityIds = Array.from(
            new Set(offer.requestItems.filter((r) => Number(r.itemType) === 2).map((r) => r.cityId)),
          );
          const rawSlots = await window.MafiaMap.getLandSlotsByOwner({
            chain: chainSlug,
            owner: address,
            cityIds,
            requireInventoryItem: true,
            rpcUrl: chainConfig.rpc,
          });
          slots = rawSlots.map((s) => ({
            cityId: Number(s.cityId),
            slotX: Number(s.x),
            slotY: Number(s.y),
            inventoryItemId: Number(s.inventoryItemId),
          }));
        }

        const match = matchRequestAgainstInventory(offer.requestItems, inventory, slots);
        if (!match.acceptable) {
          const missingText = match.missing
            .map((m) => getRequestItemText(m))
            .join(", ");
          toast.error(`Missing items: ${missingText}`);
          setPendingOfferId(null);
          setPendingAction(null);
          return;
        }

        writeContract({
          address: exchangeAddress as `0x${string}`,
          abi: EXCHANGE_CONTRACT_ABI,
          functionName: "acceptOTCOffer",
          args: [BigInt(offer.offerId), match.myItemIds.map((n) => BigInt(n))],
        });
      } catch (e) {
        console.log("[v0] Failed to prepare accept:", e);
        toast.error((e as Error).message ?? "Failed to accept offer");
        setPendingOfferId(null);
        setPendingAction(null);
      }
    },
    [
      isConnected,
      address,
      inventoryReady,
      mapReady,
      chainSlug,
      chainConfig.rpc,
      writeContract,
      exchangeAddress,
    ],
  );

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

        {/* Filter tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {filterButton("open", "Open")}
          {filterButton("mine", "My Offers")}
          {filterButton("accepted", "Accepted")}
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
        <div className="flex flex-col gap-3">
          {visibleOffers.map((offer) => (
            <OfferCard
              key={offer.offerId}
              offer={offer}
              myAddress={address}
              explorer={explorer}
              isBusy={isBusy(offer.offerId)}
              onAccept={() => void handleAccept(offer)}
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
    <article className="rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Offer #{offer.offerId}</h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <a
                href={`${explorer}/address/${offer.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-primary hover:underline"
              >
                {shortAddress(offer.creator)}
              </a>
              {isMine && (
                <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                  You
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-[11px] font-medium", statusStyles)}>
          {statusLabel}
        </Badge>
      </header>

      {/* Items grid */}
      <div className="grid gap-4 py-4 md:grid-cols-2">
        <ItemList
          title="Offered"
          icon={<PackageCheck className="h-3.5 w-3.5 text-emerald-400" />}
          items={offer.offeredItems.map((it) => getOfferedItemText(it))}
          emptyLabel="No offered items"
        />
        <ItemList
          title="Requested"
          icon={<PackageOpen className="h-3.5 w-3.5 text-amber-400" />}
          items={offer.requestItems.map((it) => getRequestItemText(it))}
          emptyLabel="No requested items"
        />
      </div>

      {/* Footer: times + actions */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Created {formatDateTime(offer.createdAt)}
          </span>
          {offer.expireAt > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
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
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            View creator
            <ExternalLink className="h-3 w-3" />
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
            <span className="inline-flex items-center gap-1 text-amber-400">
              <Ban className="h-3.5 w-3.5" />
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
    <div className="rounded-lg bg-background/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
        {icon}
        <span>{title}</span>
        <span className="text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((text, idx) => (
            <li
              key={idx}
              className="truncate text-xs text-muted-foreground"
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
