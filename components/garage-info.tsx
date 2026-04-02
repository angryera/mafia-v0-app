"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function GarageInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Garage (Inventory)
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.inventory}
          label="Inventory"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Category</p>
          <p className="font-mono text-sm text-primary break-all">CAR_ITEM (15)</p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Data Source</p>
          <p className="text-sm text-foreground">
            On-chain inventory filtered by connected wallet
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
