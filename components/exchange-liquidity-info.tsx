"use client";

import {
  Coins,
  ArrowDownToLine,
  Trash2,
  Plus,
  AlertCircle,
  Info,
} from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { DEPOSIT_ADDRESSES, type ChainId } from "@/lib/contract";

export function ExchangeLiquidityInfo() {
  const { chainConfig, activeChain } = useChain();
  const depositAddress = DEPOSIT_ADDRESSES[activeChain as ChainId];

  return (
    <div className="flex flex-col gap-5">
      {/* Main Info Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Liquidity Positions
            </h3>
            <p className="text-xs text-muted-foreground">
              Provide liquidity and earn MAFIA
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <div className="rounded-lg bg-background/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-green-400" />
              <span className="font-medium text-foreground">Add Liquidity</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>Deposit in-game cash</li>
              <li>Set your exchange rate (cash per MAFIA)</li>
              <li>Earn MAFIA when traders swap</li>
            </ul>
          </div>

          <div className="rounded-lg bg-background/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownToLine className="h-4 w-4 text-blue-400" />
              <span className="font-medium text-foreground">Withdraw MAFIA</span>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Claim your earned MAFIA tokens from trades without closing your
              position.
            </p>
          </div>

          <div className="rounded-lg bg-background/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              <span className="font-medium text-foreground">
                Remove Liquidity
              </span>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Close your position and withdraw all remaining cash and earned
              MAFIA.
            </p>
          </div>
        </div>
      </div>

      {/* Position Info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Position Details
          </span>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>
            <span className="font-medium text-foreground">Position ID:</span>{" "}
            Unique identifier for your position
          </li>
          <li>
            <span className="font-medium text-foreground">Initial Cash:</span>{" "}
            Amount deposited when created
          </li>
          <li>
            <span className="font-medium text-foreground">Current Cash:</span>{" "}
            Remaining cash in position
          </li>
          <li>
            <span className="font-medium text-foreground">Cash per MAFIA:</span>{" "}
            Your exchange rate
          </li>
          <li>
            <span className="font-medium text-foreground">MAFIA Earned:</span>{" "}
            Total MAFIA received from trades
          </li>
          <li>
            <span className="font-medium text-foreground">
              MAFIA Withdrawn:
            </span>{" "}
            Amount already claimed
          </li>
        </ul>
      </div>

      {/* Contract address */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Contract
        </h4>
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

      {/* Warning */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-400">Important</p>
            <p className="text-xs text-muted-foreground mt-1">
              Removing liquidity will close your position permanently. Make sure
              to withdraw any available MAFIA before removing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
