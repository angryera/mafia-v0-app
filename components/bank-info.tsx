"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function BankInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Bank Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.ingameCurrency}
          label="Contract"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function</p>
          <p className="font-mono text-sm text-primary break-all">
            userTransfer(address,uint256,string,bytes)
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Parameters</p>
          <div className="flex flex-col gap-1">
            <p className="font-mono text-sm text-foreground">
              to <span className="text-muted-foreground">(address)</span>
            </p>
            <p className="font-mono text-sm text-foreground">
              amount <span className="text-muted-foreground">(uint256)</span>
            </p>
            <p className="font-mono text-sm text-foreground">
              message <span className="text-muted-foreground">(string)</span>
            </p>
            <p className="font-mono text-sm text-foreground">
              signature <span className="text-muted-foreground">(bytes)</span>
            </p>
          </div>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
