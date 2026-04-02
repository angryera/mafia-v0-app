"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function NickCarInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Nick a Car Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.nickcar}
          label="Contract"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function</p>
          <p className="font-mono text-sm text-primary break-all">nickCar(uint256)</p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Parameter</p>
          <p className="font-mono text-sm text-foreground">
            crimeType (integer 0-3)
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
