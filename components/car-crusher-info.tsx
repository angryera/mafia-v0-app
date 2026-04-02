"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function CarCrusherInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Car Crusher
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.carCrusher}
          label="Car Crusher"
        />
        <CopyableAddress
          address={addresses.inventory}
          label="Inventory"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function</p>
          <p className="font-mono text-xs text-primary break-all">
            crushCars(uint256[],string,bytes)
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Description</p>
          <p className="text-sm text-foreground">
            Select cars from your garage to crush into bullets. Requires signed
            message authentication and cash approval.
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
