"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function BuyKeysInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Buy Key Crates
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.buyKeys}
          label="OG Crate Minter"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function</p>
          <p className="font-mono text-sm text-primary break-all">buyCrates(uint256, uint256)</p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Parameters</p>
          <div className="flex flex-col gap-1">
            <p className="font-mono text-sm text-foreground">
              swapTokenId (token index)
            </p>
            <p className="font-mono text-sm text-foreground">
              crateAmount (integer)
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Payment</p>
          <p className="text-sm text-foreground">
            Supports multiple tokens via{" "}
            <span className="font-mono text-xs text-primary">getSwapTokens()</span>
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Price</p>
          <p className="text-sm text-foreground">
            Read from contract via{" "}
            <span className="font-mono text-xs text-primary">price()</span>
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
