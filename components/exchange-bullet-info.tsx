"use client";

import { Zap, Info } from "lucide-react";

export function ExchangeBulletInfo() {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Bullet exchange</h3>
            <p className="text-xs text-muted-foreground">Wallet ↔ in-game</p>
          </div>
        </div>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Deposit</strong> moves bullet tokens from your
              wallet into your in-game balance (displayed 0% fee, 1:1 for the amount you enter).
            </span>
          </li>
          <li className="flex gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Withdraw</strong> takes bullets from
              in-game; the UI shows a 20% fee, so the estimated amount to your wallet is
              80% of the input.
            </span>
          </li>
          <li className="flex gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Trade</strong> opens a DEX to swap
              the game’s main token (MAFIA) into the wallet bullet token. Chain-specific
              routing is applied in the link.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
