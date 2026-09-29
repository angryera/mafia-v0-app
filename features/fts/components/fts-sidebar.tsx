"use client";

import { useEffect, useRef, useState } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldError, FtsMark, SectionCard } from "@/features/fts/components/fts-ui";
import {
  formatFts,
  formatSupplyPercent,
  formatUsdValue,
  parseTokenInput,
  resolveRecipient,
  trimUnits,
  type FtsDerived,
  type HolderRow,
  type ProfileDirectory,
} from "@/features/fts/lib/fts";
import { cn } from "@/lib/utils";

function nameOf(address: string, directory: ProfileDirectory, you = false): string {
  const name = directory.byAddress[address.toLowerCase()] || formatEllipsisAddress(address);
  return you ? `${name} (You)` : name;
}

export function SupplyWidget({ derived }: { derived: FtsDerived }) {
  const segments = [
    { key: "liquid", label: "Liquid", amount: derived.circulating, className: "bg-primary" },
    { key: "subscribed", label: "Subscribed", amount: derived.subscribedSupply, className: "bg-[hsl(var(--chart-2))]" },
    { key: "burned", label: "Burned", amount: derived.burnedShares, className: "bg-muted-foreground" },
  ].filter((segment) => segment.amount > 0);

  return (
    <SectionCard title="Supply" help="Issued supply, fee burns, deployment subscriptions, and your holdings">
      <div className="space-y-3">
        <Stat label="Total supply" value={`${formatFts(derived.issued)} FTS`} />
        <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
          {segments.map((segment) => {
            const percent = derived.issued > 0 ? ((segment.amount / derived.issued) * 100).toFixed(2) : "0.00";
            return (
              <Tooltip key={segment.key}>
                <TooltipTrigger asChild>
                  <div
                    className={cn("h-full min-w-1", segment.className)}
                    style={{ width: `${derived.issued > 0 ? (segment.amount / derived.issued) * 100 : 0}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {segment.label}: {formatFts(segment.amount)} FTS ({percent}% of issued supply)
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <Stat label="Market cap" value={derived.marketCap == null ? "Unavailable" : formatUsdValue(derived.marketCap)} />
        <Stat label="Burned by transfer fee" value={`${formatFts(derived.burnedShares)} FTS`} />
        <Stat label="Subscribed" value={`${formatFts(derived.totalSubscribed)} FTS`} />
        <Stat label="My total share" value={`${formatFts(derived.myTotal)} FTS`} />
      </div>
    </SectionCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function TransferWidget({
  derived,
  directory,
  account,
  onTransfer,
}: {
  derived: FtsDerived;
  directory: ProfileDirectory;
  account?: string;
  onTransfer: (to: `0x${string}`, amount: bigint) => Promise<boolean>;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ to: `0x${string}`; name?: string; amount: bigint; label: string } | null>(null);
  const balanceLabel = formatFts(derived.balance);

  const review = () => {
    if (!recipient.trim() || !amount.trim()) {
      setError("Enter a recipient profile name or wallet and an amount.");
      return;
    }
    const resolved = resolveRecipient(recipient, directory);
    if (!resolved) {
      setError("Select a valid profile name or enter a wallet address.");
      return;
    }
    if (account && resolved.address.toLowerCase() === account.toLowerCase()) {
      setError("You cannot transfer founder shares to yourself.");
      return;
    }
    const amountWei = parseTokenInput(amount);
    if (amountWei == null || amountWei <= BigInt(0)) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (amountWei > derived.balanceWei) {
      setError(`You only have ${balanceLabel} liquid FTS available.`);
      return;
    }
    setError(null);
    setConfirm({ to: resolved.address, name: resolved.name, amount: amountWei, label: trimUnits(amountWei) });
  };

  const confirmTransfer = () => {
    if (!confirm) return;
    const pending = confirm;
    setRecipient("");
    setAmount("");
    setConfirm(null);
    void onTransfer(pending.to, pending.amount);
  };

  return (
    <SectionCard title="Transfer" help="Send liquid FTS to a player profile or wallet">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{balanceLabel} liquid FTS available</p>
        <div className="space-y-2">
          <Label htmlFor="fts-recipient">Recipient</Label>
          <Input
            id="fts-recipient"
            placeholder="Profile name or 0x..."
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fts-amount">Amount</Label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <FtsMark className="absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="fts-amount"
                className="pl-9"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <Button type="button" variant="outline" onClick={() => setAmount(trimUnits(derived.balanceWei))}>
              Max
            </Button>
          </div>
        </div>
        <FieldError message={error} />
        <Button type="button" className="w-full" onClick={review}>
          Review transfer
        </Button>
      </div>

      <Dialog open={confirm != null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm share transfer</DialogTitle>
            <DialogDescription>
              Check the recipient and amount carefully. Founder share transfers cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {confirm ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <FtsMark />
                <span>{confirm.label} FTS</span>
              </div>
              {confirm.name ? <p className="font-medium">{confirm.name}</p> : null}
              <p className="break-all font-mono text-xs text-muted-foreground">{confirm.to}</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              Go back
            </Button>
            <Button type="button" onClick={confirmTransfer}>
              Transfer shares
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

export function HoldingsWidget({ derived }: { derived: FtsDerived }) {
  return (
    <SectionCard title="Your founder shares" help="Your holdings valued at the latest daily auction price">
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Total owned</p>
          <p className="text-lg font-semibold tabular-nums">{formatFts(derived.myTotal)} FTS</p>
          <p className="text-sm text-muted-foreground">
            {derived.myUsd == null ? "Unavailable" : formatUsdValue(derived.myUsd)}
          </p>
        </div>
        <Stat label="Liquid" value={`${formatFts(derived.balance)} FTS`} />
        <Stat label="Listed" value={`${formatFts(derived.listedShares)} FTS`} />
        <Stat label="Subscribed" value={`${formatFts(derived.mySubscribed)} FTS`} />
      </div>
    </SectionCard>
  );
}

export function Leaderboard({
  holders,
  user,
  totalSupply,
  directory,
  account,
  loading,
}: {
  holders: HolderRow[];
  user: HolderRow | null;
  totalSupply: number;
  directory: ProfileDirectory;
  account?: string;
  loading: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () => {
      const overflow = element.scrollHeight - element.clientHeight > 4;
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 4;
      setHint(overflow && !atBottom);
    };
    update();
    element.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [holders, loading]);

  return (
    <SectionCard title="Leaderboard" help="Top FTS holders from the token holder registry">
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : holders.length === 0 && !user ? (
        <p className="text-sm text-muted-foreground">Connect to live chain data to load the holder leaderboard.</p>
      ) : (
        <div className="relative">
          <div ref={scroller} className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {holders.map((holder) => (
              <HolderLine
                key={holder.address}
                holder={holder}
                totalSupply={totalSupply}
                label={nameOf(holder.address, directory, !!account && holder.address.toLowerCase() === account.toLowerCase())}
              />
            ))}
          </div>
          {hint ? (
            <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/90 to-transparent pt-6 text-center text-xs text-muted-foreground">
              Scroll for more
            </p>
          ) : null}
        </div>
      )}
      {user ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Your position</p>
          <HolderLine
            holder={user}
            totalSupply={totalSupply}
            label={nameOf(user.address, directory, true)}
          />
        </div>
      ) : null}
    </SectionCard>
  );
}

function HolderLine({ holder, totalSupply, label }: { holder: HolderRow; totalSupply: number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm">
      <span className="w-8 shrink-0 tabular-nums text-muted-foreground">{holder.rank ?? "—"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{formatSupplyPercent(holder.balance, totalSupply)}</p>
      </div>
      <span className="shrink-0 tabular-nums">{formatFts(holder.balance)} FTS</span>
    </div>
  );
}
