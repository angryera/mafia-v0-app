"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";
import {
  SAFEHOUSE_COST_PER_HOUR,
  SAFEHOUSE_MIN_HOURS,
  SAFEHOUSE_MAX_HOURS,
  SAFEHOUSE_BASE_COOLDOWN,
} from "@/lib/contract";

export function SafehouseInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Safehouse Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress address={addresses.safehouse} label="Contract" />

        {/* enterSafehouse */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function</p>
          <p className="font-mono text-sm text-primary break-all">
            enterSafehouse(uint256)
          </p>
          <div className="mt-1.5">
            <p className="font-mono text-xs text-foreground">
              hour <span className="text-muted-foreground">(uint256)</span>
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Number of hours to stay safe (1-100)
            </p>
          </div>
        </div>

        {/* Constants */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-2">Parameters</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Cost per hour
              </span>
              <span className="font-mono text-xs text-foreground">
                {SAFEHOUSE_COST_PER_HOUR.toLocaleString()} cash
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Min hours
              </span>
              <span className="font-mono text-xs text-foreground">
                {SAFEHOUSE_MIN_HOURS}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Max hours
              </span>
              <span className="font-mono text-xs text-foreground">
                {SAFEHOUSE_MAX_HOURS}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Cooldown after exit
              </span>
              <span className="font-mono text-xs text-foreground">
                {SAFEHOUSE_BASE_COOLDOWN / 3600}h
              </span>
            </div>
          </div>
        </div>

        {/* Flow */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-2">Flow</p>
          <ol className="flex flex-col gap-1.5 text-[10px] text-muted-foreground list-decimal list-inside">
            <li>Check cash balance is sufficient</li>
            <li>Approve in-game cash spending</li>
            <li>Enter safehouse with chosen hours</li>
          </ol>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
