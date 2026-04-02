"use client";

import {
  ArrowRightLeft,
  Coins,
  Package,
  TrendingUp,
  Percent,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { EXCHANGE_ADDRESSES, DEPOSIT_ADDRESSES, type ChainId } from "@/lib/contract";

export function ExchangeConvertInfo() {
  const { chainConfig, activeChain } = useChain();
  const exchangeAddress = EXCHANGE_ADDRESSES[activeChain as ChainId];
  const depositAddress = DEPOSIT_ADDRESSES[activeChain as ChainId];

  return (
    <div className="flex flex-col gap-5">
      {/* Main Info Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Item Conversion</h3>
            <p className="text-xs text-muted-foreground">
              Convert items to in-game cash
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <div className="rounded-lg bg-background/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-green-400" />
              <span className="font-medium text-foreground">Convertible Items</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>Cash Boxes (50K - 10M)</li>
              <li>Shop Items (weapons, armor)</li>
              <li>Helper Credits</li>
              <li>Land Slots</li>
            </ul>
          </div>

          <div className="rounded-lg bg-background/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="font-medium text-foreground">Land Slot Values</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>Strategic: $15 USD</li>
              <li>Elite: $12 USD</li>
              <li>Upper: $8 USD</li>
              <li>Common: $4 USD</li>
            </ul>
            <p className="text-xs text-muted-foreground ml-6 mt-2">
              USD values are converted to cash using live MAFIA token prices.
            </p>
          </div>

          <div className="rounded-lg bg-background/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-4 w-4 text-amber-400" />
              <span className="font-medium text-foreground">Volume Bonuses</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>15M+ cash: +3% bonus</li>
              <li>50M+ cash: +5% bonus</li>
              <li>100M+ cash: +8% bonus</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Perk Info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium text-foreground">Conversion Perk</span>
        </div>
        <p className="text-xs text-muted-foreground">
          If you have an active Conversion Rate Boost perk, you&apos;ll receive an
          additional 20% on all conversions.
        </p>
      </div>

      {/* Contract addresses */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Contracts
        </h4>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Exchange</span>
            <a
              href={`${chainConfig.explorer}/address/${exchangeAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline"
            >
              {exchangeAddress.slice(0, 6)}...{exchangeAddress.slice(-4)}
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Deposit</span>
            <a
              href={`${chainConfig.explorer}/address/${depositAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline"
            >
              {depositAddress.slice(0, 6)}...{depositAddress.slice(-4)}
            </a>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-400">Important</p>
            <p className="text-xs text-muted-foreground mt-1">
              Item conversion is irreversible. Converted items will be burned
              and cannot be recovered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
