"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function BuyPerkboxInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Perk Boxes
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.buyPerkbox}
          label="Contract"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function</p>
          <p className="font-mono text-sm text-primary break-all">buyPerkBoxes(uint256, uint256)</p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Parameters</p>
          <p className="font-mono text-sm text-foreground">
            swapTokenId, perkBoxAmount
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Payment</p>
          <p className="text-sm text-foreground">
            Multi-token via <span className="font-mono text-primary">getSwapTokens()</span>
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
