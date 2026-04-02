"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function JailInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Jail Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress address={addresses.jail} label="Contract" />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1">Functions</p>
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs text-primary">isUserinJail(address)</p>
            <p className="font-mono text-xs text-primary">jailedUntil(address)</p>
            <p className="font-mono text-xs text-primary">buyOut(address)</p>
            <p className="font-mono text-xs text-primary">bustOut(address)</p>
          </div>
        </div>

        <CopyableAddress
          address={addresses.ingameCurrency}
          label="Approval Contract"
        />

        <div className="rounded-lg bg-chain-accent/5 border border-chain-accent/20 px-3 py-2.5">
          <p className="text-xs font-medium text-chain-accent mb-0.5">
            Step 1: Approve
          </p>
          <p className="font-mono text-[11px] text-chain-accent/70">
            approveInGameCurrency()
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
