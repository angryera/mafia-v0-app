"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function BuyCreditsInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Helper Credits
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.buyCredit}
          label="Contract"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Functions</p>
          <p className="font-mono text-sm text-primary break-all">getSwapTokens()</p>
          <p className="font-mono text-sm text-primary break-all">price()</p>
          <p className="font-mono text-sm text-primary break-all">
            buyCredit(uint256, uint256)
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Parameters</p>
          <p className="text-sm text-foreground">
            <span className="font-mono text-xs">tokenId</span> - payment
            token index
          </p>
          <p className="text-sm text-foreground">
            <span className="font-mono text-xs">amount</span> - payment
            amount (wei)
          </p>
        </div>

        <div className="rounded-lg bg-chain-accent/5 border border-chain-accent/20 px-3 py-2.5">
          <p className="text-xs font-medium text-chain-accent mb-1">
            Payment Flow
          </p>
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-chain-accent/70">
              Native token (id 0): send value directly
            </p>
            <p className="text-[11px] text-chain-accent/70">
              ERC20 tokens: approve, then buy
            </p>
          </div>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
