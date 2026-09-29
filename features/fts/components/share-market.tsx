"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatEllipsisAddress } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetMark, FieldError, FtsMark, HelpTip, SectionCard, WalletWait } from "@/features/fts/components/fts-ui";
import {
  AUCTION_FILTERS,
  DURATION_OPTIONS,
  assetSymbol,
  currentBidAmount,
  defaultListShares,
  displayStatus,
  formatBidAmount,
  formatCountdown,
  formatFts,
  formatPerShare,
  minimumBidWei,
  parseTokenInput,
  shareAmountError,
  statusLine,
  trimUnits,
  usdPerFts,
  type AuctionFilter,
  type FtsListing,
  type ProfileDirectory,
  type SettlementAsset,
} from "@/features/fts/lib/fts";
import { cn } from "@/lib/utils";

function displayName(address: string, directory: ProfileDirectory): string {
  return directory.byAddress[address.toLowerCase()] || formatEllipsisAddress(address);
}

const LISTING_CARD_WIDTH = 148;
const LISTING_CARD_GAP = 12;

function useColumnCount() {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(2);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const width = element.clientWidth;
      setColumns(Math.max(1, Math.floor((width + LISTING_CARD_GAP) / (LISTING_CARD_WIDTH + LISTING_CARD_GAP))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, columns };
}

export function ShareMarket({
  listings,
  listingsCount,
  loading,
  nativeSymbol,
  bidIncreasePercent,
  feePercent,
  balanceWei,
  balance,
  prices,
  directory,
  now,
  cardPending,
  onList,
  onBid,
  onCancel,
  onSettle,
}: {
  listings: FtsListing[];
  listingsCount: number | null;
  loading: boolean;
  nativeSymbol: string;
  bidIncreasePercent: number;
  feePercent: number | null;
  balanceWei: bigint;
  balance: number;
  prices: { mafia: number; native: number };
  directory: ProfileDirectory;
  now: number;
  cardPending: { id: number; kind: "settle" | "cancel" } | null;
  onList: (shareAmount: bigint, asset: SettlementAsset, startAmount: bigint, days: number) => Promise<boolean>;
  onBid: (id: number, amount: bigint, asset: SettlementAsset) => Promise<boolean>;
  onCancel: (id: number) => Promise<boolean>;
  onSettle: (id: number) => Promise<boolean>;
}) {
  const [filter, setFilter] = useState<AuctionFilter>("open");
  const listingKey = listings.map((listing) => listing.id).join(",");
  const rowsKey = `${filter}:${listingKey}`;
  const [rowState, setRowState] = useState({ key: rowsKey, rows: 2 });
  if (rowState.key !== rowsKey) {
    setRowState({ key: rowsKey, rows: 2 });
  }
  const rows = rowState.rows;
  const [listOpen, setListOpen] = useState(false);
  const [bidListing, setBidListing] = useState<FtsListing | null>(null);
  const { ref, columns } = useColumnCount();

  const filtered = useMemo(
    () => listings.filter((listing) => filter === "all" || displayStatus(listing, now) === filter),
    [listings, filter, now],
  );
  const visibleCount = Math.min(filtered.length, rows * columns);
  const shown = filtered.slice(0, visibleCount);
  const empty = AUCTION_FILTERS.find((item) => item.value === filter)?.empty ?? AUCTION_FILTERS[4].empty;
  const skeletonCount = listingsCount == null ? columns * 2 : Math.min(columns * 2, listingsCount);

  return (
    <SectionCard
      title="Share market"
      subtitle={`Live founder-share auctions settled in MAFIA or ${nativeSymbol}`}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as AuctionFilter)}>
            <SelectTrigger className="h-9 w-[190px]" aria-label="Auction status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUCTION_FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" disabled={balance <= 0} onClick={() => setListOpen(true)}>
            Add listing
          </Button>
          <HelpTip text="List liquid founder shares" />
        </div>
      }
    >
      {feePercent != null ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Share market tax: {feePercent}% of the winning bid, deducted at settlement
        </p>
      ) : null}

      <div ref={ref} className="grid gap-3 [grid-template-columns:repeat(auto-fill,148px)]">
        {loading
          ? Array.from({ length: skeletonCount }, (_, index) => (
              <Skeleton key={index} className="h-56 w-full" />
            ))
          : shown.map((listing) => (
              <AuctionCard
                key={listing.id}
                listing={listing}
                nativeSymbol={nativeSymbol}
                prices={prices}
                directory={directory}
                now={now}
                pending={cardPending?.id === listing.id ? cardPending.kind : null}
                onBid={() => setBidListing(listing)}
                onCancel={() => void onCancel(listing.id)}
                onSettle={() => void onSettle(listing.id)}
              />
            ))}
      </div>

      {!loading && shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : null}

      {!loading && visibleCount < filtered.length ? (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setRowState((current) => ({ ...current, rows: current.rows + 1 }))}>
          Load more
        </Button>
      ) : null}
      {!loading ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {shown.length} of {filtered.length} auctions
        </p>
      ) : null}

      <ListDialog
        open={listOpen}
        onOpenChange={setListOpen}
        balanceWei={balanceWei}
        balance={balance}
        nativeSymbol={nativeSymbol}
        onList={onList}
      />
      <BidDialog
        listing={bidListing}
        onOpenChange={(open) => {
          if (!open) setBidListing(null);
        }}
        nativeSymbol={nativeSymbol}
        bidIncreasePercent={bidIncreasePercent}
        directory={directory}
        onBid={onBid}
      />
    </SectionCard>
  );
}

function AuctionCard({
  listing,
  nativeSymbol,
  prices,
  directory,
  now,
  pending,
  onBid,
  onCancel,
  onSettle,
}: {
  listing: FtsListing;
  nativeSymbol: string;
  prices: { mafia: number; native: number };
  directory: ProfileDirectory;
  now: number;
  pending: "settle" | "cancel" | null;
  onBid: () => void;
  onCancel: () => void;
  onSettle: () => void;
}) {
  const status = displayStatus(listing, now);
  const symbol = assetSymbol(listing.assetType, nativeSymbol);
  const bidder = listing.highestBidder ? displayName(listing.highestBidder, directory) : null;
  const price = listing.assetType === "native" ? prices.native : prices.mafia;
  const action = cardAction(listing, status);
  const label =
    pending === "settle" ? "Settling…" : pending === "cancel" ? "Cancelling…" : action.label;

  return (
    <article className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-border bg-background/40 p-2.5">
      <p className={cn("truncate text-sm font-medium", listing.isYours && "text-primary")}>
        {displayName(listing.seller, directory)}
      </p>
      <p className="text-xs text-muted-foreground">{statusLine(listing, now, bidder)}</p>
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <FtsMark />
        <span>{formatFts(listing.amount)} FTS</span>
      </p>
      <div className="flex items-center justify-between gap-1 text-xs">
        <span className="shrink-0 text-muted-foreground">Current bid</span>
        <span className="inline-flex min-w-0 items-center gap-1 font-medium">
          <AssetMark asset={listing.assetType} className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{formatBidAmount(listing)} {symbol}</span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-1 text-xs">
        <span className="shrink-0 text-muted-foreground">USD per FTS</span>
        <span className="truncate font-medium">{usdPerFts(listing, price)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Total bids</span>
        <span>{listing.bidCount}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Ends in</span>
        <span>{formatCountdown(listing.endTimestamp, now)}</span>
      </div>
      <Button
        type="button"
        size="sm"
        className="mt-auto w-full"
        variant={action.danger ? "destructive" : "default"}
        disabled={action.disabled || pending != null}
        onClick={() => {
          if (action.kind === "settle") onSettle();
          else if (action.kind === "cancel") onCancel();
          else if (action.kind === "bid") onBid();
        }}
      >
        {label}
      </Button>
    </article>
  );
}

function cardAction(listing: FtsListing, status: ReturnType<typeof displayStatus>): {
  label: string;
  kind: "settle" | "cancel" | "bid" | "none";
  danger?: boolean;
  disabled?: boolean;
} {
  if (status === "expired" && listing.highestBidder) return { label: "Settle auction", kind: "settle" };
  if (listing.isYours && (status === "open" || status === "expired")) {
    return { label: "Cancel auction", kind: "cancel", danger: true };
  }
  if (status === "open") return { label: "Place bid", kind: "bid" };
  if (status === "cancelled") return { label: "Auction cancelled", kind: "none", disabled: true };
  if (status === "completed") return { label: "Auction completed", kind: "none", disabled: true };
  return { label: "Auction expired", kind: "none", disabled: true };
}

function ListDialog({
  open,
  onOpenChange,
  balanceWei,
  balance,
  nativeSymbol,
  onList,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceWei: bigint;
  balance: number;
  nativeSymbol: string;
  onList: (shareAmount: bigint, asset: SettlementAsset, startAmount: bigint, days: number) => Promise<boolean>;
}) {
  const [shares, setShares] = useState("");
  const [asset, setAsset] = useState<SettlementAsset>("mafia");
  const [total, setTotal] = useState("1500");
  const [days, setDays] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wasOpen = useRef(false);
  const balanceLabel = formatFts(balance);
  const symbol = assetSymbol(asset, nativeSymbol);
  const shareWei = parseTokenInput(shares);
  const totalWei = parseTokenInput(total);
  const perShare = shareWei != null && totalWei != null ? formatPerShare(totalWei, shareWei) : null;

  useEffect(() => {
    if (open && !wasOpen.current) {
      setShares(defaultListShares(balanceWei));
      setAsset("mafia");
      setTotal("1500");
      setDays("3");
      setError(null);
    }
    wasOpen.current = open;
  }, [open, balanceWei]);

  const chooseAsset = (next: SettlementAsset) => {
    if (next === asset) return;
    setAsset(next);
    setTotal(next === "mafia" ? "1500" : "0.15");
  };

  const submit = async () => {
    const amountError = shareAmountError(shareWei, balanceWei, balanceLabel);
    if (amountError) {
      setError(amountError);
      return;
    }
    if (totalWei == null || totalWei <= BigInt(0)) {
      setError("Enter a starting total greater than zero.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const ok = await onList(shareWei as bigint, asset, totalWei, Number(days));
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent
        className={cn(submitting && "[&>button]:hidden")}
        onPointerDownOutside={(event) => { if (submitting) event.preventDefault(); }}
        onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>List founder shares</DialogTitle>
          <DialogDescription>Choose liquid FTS, a settlement asset, and the opening auction total.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{balanceLabel} liquid FTS available</p>
        <div className="space-y-2">
          <Label htmlFor="fts-list-shares">Shares to list</Label>
          <div className="relative">
            <FtsMark className="absolute left-3 top-1/2 -translate-y-1/2" />
            <Input id="fts-list-shares" className="pl-9 pr-14" inputMode="decimal" value={shares} onChange={(event) => setShares(event.target.value)} disabled={submitting} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">FTS</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Settlement asset</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={asset === "mafia" ? "default" : "outline"} onClick={() => chooseAsset("mafia")} disabled={submitting}>
              <AssetMark asset="mafia" />
              Mafia token
            </Button>
            <Button type="button" variant={asset === "native" ? "default" : "outline"} onClick={() => chooseAsset("native")} disabled={submitting}>
              <AssetMark asset="native" />
              Native token
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fts-list-total">Starting total</Label>
          <div className="relative">
            <AssetMark asset={asset} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input id="fts-list-total" className="pl-9 pr-16" inputMode="decimal" value={total} onChange={(event) => setTotal(event.target.value)} disabled={submitting} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{symbol}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {perShare ? `${perShare} ${symbol} per share` : "Enter an amount and total to calculate price per share"}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select value={days} onValueChange={setDays} disabled={submitting}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FieldError message={error} />
        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            Go back
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void submit()}>
            Add listing
          </Button>
        </DialogFooter>
        <WalletWait show={submitting} />
      </DialogContent>
    </Dialog>
  );
}

function BidDialog({
  listing,
  onOpenChange,
  nativeSymbol,
  bidIncreasePercent,
  directory,
  onBid,
}: {
  listing: FtsListing | null;
  onOpenChange: (open: boolean) => void;
  nativeSymbol: string;
  bidIncreasePercent: number;
  directory: ProfileDirectory;
  onBid: (id: number, amount: bigint, asset: SettlementAsset) => Promise<boolean>;
}) {
  const [bid, setBid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wasOpen = useRef(false);
  const open = listing != null;
  const symbol = listing ? assetSymbol(listing.assetType, nativeSymbol) : "";
  const minWei = listing ? minimumBidWei(listing, bidIncreasePercent) : BigInt(0);
  const minText = trimUnits(minWei);
  const bidWei = parseTokenInput(bid);
  const perShare = listing && bidWei != null ? formatPerShare(bidWei, listing.shareAmountWei) : null;

  useEffect(() => {
    if (open && !wasOpen.current && listing) {
      setBid(trimUnits(minimumBidWei(listing, bidIncreasePercent)));
      setError(null);
    }
    wasOpen.current = open;
  }, [open, listing, bidIncreasePercent]);

  const submit = async () => {
    if (!listing) return;
    if (bidWei == null || bidWei < minWei) {
      setError(`Enter at least ${minText} ${symbol}.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    const ok = await onBid(listing.id, bidWei, listing.assetType);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent
        className={cn(submitting && "[&>button]:hidden")}
        onPointerDownOutside={(event) => { if (submitting) event.preventDefault(); }}
        onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }}
      >
        {listing ? (
          <>
            <DialogHeader>
              <DialogTitle>Place auction bid</DialogTitle>
              <DialogDescription>
                Auction #{listing.id} from {displayName(listing.seller, directory)}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FtsMark />
              <span>{formatFts(listing.amount)} FTS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Founder share auction · {symbol}
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Current bid</span>
                <span>
                  {listing.assetType === "mafia"
                    ? formatBidAmount(listing)
                    : currentBidAmount(listing).toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
                  {symbol}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Minimum bid</span>
                <span>
                  {minText} {symbol}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              The contract requires each bid to increase by {bidIncreasePercent}%.
            </p>
            <div className="space-y-2">
              <Label htmlFor="fts-bid">Your total bid</Label>
              <div className="relative">
                <AssetMark asset={listing.assetType} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="fts-bid" className="pl-9 pr-16" inputMode="decimal" value={bid} onChange={(event) => setBid(event.target.value)} disabled={submitting} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{symbol}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {perShare ? `${perShare} ${symbol} per share` : "Enter your total bid"}
              </p>
            </div>
            <FieldError message={error} />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
                Go back
              </Button>
              <Button type="button" disabled={submitting} onClick={() => void submit()}>
                Place bid
              </Button>
            </DialogFooter>
          </>
        ) : null}
        <WalletWait show={submitting} />
      </DialogContent>
    </Dialog>
  );
}
