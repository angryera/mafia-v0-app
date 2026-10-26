"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { zeroAddress } from "viem";

import { RewardGlyph } from "@/components/profile-unbox/reward-glyph";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  accentForeground,
  bufferedUnboxPayment,
  formatReward,
  formatRewardRange,
  formatTierPrice,
  paymentLabel,
  quoteUnboxPayment,
  REWARD_APPLICATION,
  REWARD_KEYS,
  REWARD_LABELS,
  sameAddress,
  TIER_COLORS,
  unboxActionLabel,
  type PendingUnbox,
  type ProfileTier,
  type ProfileTierId,
  type RewardKey,
  type UnboxPaymentToken,
} from "@/lib/profile-unbox";
import { cn } from "@/lib/utils";

export interface TokenBalance {
  state: "loading" | "ready" | "unknown";
  value?: bigint;
}

interface TierConsoleProps {
  tiers: ProfileTier[];
  isExistingPlayer: boolean;
  selectedTierId: ProfileTierId;
  onSelectTier: (tierId: ProfileTierId) => void;
  tokens: UnboxPaymentToken[];
  balances: Record<number, TokenBalance>;
  selectedTokenId: number | null;
  onSelectToken: (tokenId: number) => void;
  onRefreshBalance: () => void;
  pending: PendingUnbox | null;
  requesting: boolean;
  opening: boolean;
  acknowledged: boolean;
  onAcknowledge: (checked: boolean) => void;
  onUnbox: () => void;
  onOpen: () => void;
  disabled: boolean;
}

function balanceLabel(balance: TokenBalance | undefined, token: UnboxPaymentToken): string {
  if (!balance || balance.state === "loading") return "…";
  if (balance.state === "unknown" || balance.value === undefined) return "—";
  return paymentLabel(balance.value, token).replace(` ${token.name}`, "");
}

export function ProfileTierConsole({
  tiers,
  isExistingPlayer,
  selectedTierId,
  onSelectTier,
  tokens,
  balances,
  selectedTokenId,
  onSelectToken,
  onRefreshBalance,
  pending,
  requesting,
  opening,
  acknowledged,
  onAcknowledge,
  onUnbox,
  onOpen,
  disabled,
}: TierConsoleProps) {
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);
  const tier = tiers.find((item) => item.id === selectedTierId) ?? tiers[0];
  const isFree = tier?.id === "free";
  const token = tokens.find((item) => item.id === selectedTokenId);
  const estimated = !isFree && token && tier ? quoteUnboxPayment(tier.priceUsdWei, token) : null;
  const buffer = estimated === null ? null : bufferedUnboxPayment(estimated);
  const isNative = token ? sameAddress(token.address, zeroAddress) : false;
  const caps = useMemo(() => {
    return Object.fromEntries(REWARD_KEYS.map((key) => [
      key,
      Math.max(1, ...tiers.map((item) => item.rewards[key].max)),
    ])) as Record<RewardKey, number>;
  }, [tiers]);

  if (!tier) return null;

  const selectedShort = token && buffer !== null && estimated !== null
    ? balances[token.id]?.state === "ready" && (balances[token.id]?.value ?? BigInt(0)) < buffer
    : false;
  const canRequest = (!isExistingPlayer || acknowledged) && (isFree || Boolean(token)) && !selectedShort && !disabled;
  const actionDisabled = pending ? !pending.canOpen || opening : !canRequest || requesting;
  const actionLabel = unboxActionLabel({
    pending,
    requesting,
    opening,
    isFree,
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-label="Profile tier options">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {pending ? "Your box" : "Choose a tier"}
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {pending ? "Your selected rewards" : isExistingPlayer ? "What could you receive?" : "What could you start with?"}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">{isExistingPlayer ? "Contract prices" : "Free and contract prices"}</span>
      </div>

      <div
        className={cn("grid grid-cols-2 gap-3", tiers.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3")}
        role="group"
        aria-label="Profile tier"
      >
        {tiers.map((option, index) => {
          const selected = option.id === tier.id;
          const color = TIER_COLORS[option.id];
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              disabled={Boolean(pending) || requesting || opening}
              onClick={() => onSelectTier(option.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                selected ? "bg-white/[0.04]" : "border-border hover:border-white/20",
              )}
              style={selected ? { borderColor: color, boxShadow: `inset 0 0 0 1px ${color}` } : undefined}
            >
              <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Tier {String(index + 1).padStart(2, "0")}
                <span
                  className="grid h-4 w-4 place-items-center rounded-full border"
                  style={selected ? { background: color, color: accentForeground(color), borderColor: color } : undefined}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
              </span>
              <span className="mt-3 block text-base font-semibold">{option.label}</span>
              <span className="mt-4 flex items-end justify-between gap-2">
                <span className="font-mono text-sm">{formatTierPrice(option.priceUsdWei)}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {selected ? "Selected" : "Choose"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Possible rewards</p>
            <strong>{tier.label}</strong>
          </div>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Min — max</span>
        </div>
        {REWARD_KEYS.map((key) => {
          const reward = tier.rewards[key];
          const cap = caps[key];
          return (
            <div key={key} className="grid grid-cols-[9rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="flex items-center gap-2">
                <RewardGlyph rewardKey={key} />
                <span>
                  {REWARD_LABELS[key]}
                  {isExistingPlayer && (
                    <small className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {REWARD_APPLICATION[key] === "replace" ? "Replaced" : "Added"}
                    </small>
                  )}
                </span>
              </span>
              <div>
                <div className="relative h-1.5 rounded-full bg-white/10">
                  <span
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      left: `${(reward.min / cap) * 100}%`,
                      width: `${Math.max(((reward.max - reward.min) / cap) * 100, reward.min === reward.max ? 1.5 : 0)}%`,
                      background: "var(--unbox-accent)",
                    }}
                  />
                </div>
                {(key === "cash" || key === "bullets") && (
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>0</span>
                    <span>{formatReward(key, cap)}</span>
                  </div>
                )}
              </div>
              <strong className="text-right font-mono text-xs">{formatRewardRange(key, reward)}</strong>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">
          Cash and bullet bars run from 0 to the largest max among the visible tiers. The numbers on the right are the selected tier&apos;s exact range.
        </p>
      </div>

      {isExistingPlayer && !pending && (
        <section className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4" aria-labelledby="profile-unbox-apply-title">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/80">Profile change</p>
              <h3 id="profile-unbox-apply-title" className="text-base font-semibold">Your rank and skills may go down</h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Opening this {tier.label} box replaces rank, kill skill, bust-out skill, and race skill, even when the new value is lower. It adds cash, bullets, and health to your current totals.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 p-3 text-sm">
              <strong>Replaced</strong>
              <p className="mt-1 text-muted-foreground">
                {tier.label} rank, kill skill, bust-out skill, and race skill take the rolled values. Your current values are overwritten, even if the new ones are lower.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-3 text-sm">
              <strong>Added</strong>
              <p className="mt-1 text-muted-foreground">
                {tier.label} cash, bullets, and health are added to your current totals.
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            You pay when you request the box. The profile change happens when you open it and cannot be undone.
          </p>
          <div className="mt-3 flex items-start gap-2">
            <Checkbox
              id="profile-unbox-apply-ack"
              checked={acknowledged}
              onCheckedChange={(checked) => onAcknowledge(checked === true)}
            />
            <Label htmlFor="profile-unbox-apply-ack" className="text-sm font-normal leading-snug">
              I understand my rank and skills may go down.
            </Label>
          </div>
        </section>
      )}

      {!pending && !isFree && (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Pay with</span>
            <div className="relative min-w-52 flex-1">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                onClick={() => setTokenMenuOpen((open) => !open)}
                disabled={requesting || disabled || tokens.length === 0}
                aria-label="Select payment token"
                aria-expanded={tokenMenuOpen}
              >
                <span>{token?.name ?? "Select token"}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", tokenMenuOpen && "rotate-180")} />
              </button>
              {tokenMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {tokens.map((option) => {
                    const required = bufferedUnboxPayment(quoteUnboxPayment(tier.priceUsdWei, option));
                    const balance = balances[option.id];
                    const short = balance?.state === "ready" && (balance.value ?? BigInt(0)) < required;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={short}
                        className={cn(
                          "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50",
                          option.id === selectedTokenId && "bg-white/5",
                        )}
                        onClick={() => {
                          onSelectToken(option.id);
                          setTokenMenuOpen(false);
                        }}
                      >
                        <span className="font-medium">{option.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          Balance {balanceLabel(balance, option)} · Required {paymentLabel(required, option)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {token && estimated !== null && buffer !== null && (
            <p className="text-sm text-muted-foreground">
              Estimated payment: {paymentLabel(estimated, token)}.{" "}
              {isNative
                ? `The wallet sends ${paymentLabel(buffer, token)} and unused native value is refunded.`
                : `The approval covers ${paymentLabel(buffer, token)}.`}
            </p>
          )}
          {selectedShort && token && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-300">
              <span>Insufficient {token.name} balance. Add funds or choose another token.</span>
              <Button type="button" variant="outline" size="sm" onClick={onRefreshBalance} disabled={requesting}>
                Refresh balance
              </Button>
            </div>
          )}
        </div>
      )}

      {pending && (
        <p className="mt-5 text-sm text-muted-foreground" role="status">
          {pending.canOpen
            ? "Your box is ready. Opening needs one more wallet confirmation."
            : "Waiting for the required blocks. This page checks automatically."}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Selected</p>
          <strong>{tier.label} · {formatTierPrice(tier.priceUsdWei)}</strong>
        </div>
        <Button
          type="button"
          onClick={pending ? onOpen : onUnbox}
          disabled={actionDisabled}
          aria-describedby={isExistingPlayer && !pending ? "profile-unbox-apply-title" : undefined}
          style={{ background: "var(--unbox-accent)", color: accentForeground(TIER_COLORS[tier.id]) }}
        >
          {actionLabel}
        </Button>
      </div>
      {!pending && (
        <p className="mt-3 text-xs text-muted-foreground">
          {isFree
            ? "Free creates your profile in one wallet transaction, with no token approval, tier payment, or reward roll."
            : "The request creates or upgrades your profile and takes payment. Opening requires a second transaction after the contract's block delay. Token conversion can change before confirmation."}
        </p>
      )}
    </section>
  );
}
