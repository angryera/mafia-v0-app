"use client";

import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { Coins, ExternalLink } from "lucide-react";

export function BuyGiCreditsInfo() {
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-yellow-400" />
        <h4 className="text-sm font-bold text-foreground">
          Buy GI Credits Info
        </h4>
      </div>
      <div className="space-y-3 text-xs text-muted-foreground">
        <p>
          Purchase GI Credits using native tokens or ERC-20 stablecoins.
          Payment tokens come from the Swap Router; price and purchase
          go through the GI Credits contract.
        </p>
        <div className="rounded bg-secondary/50 p-2">
          <p className="mb-1 font-medium text-foreground">GI Credits Token</p>
          <CopyableAddress address={addresses.giCredits} />
        </div>
        <div className="rounded bg-secondary/50 p-2">
          <p className="mb-1 font-medium text-foreground">Swap Router</p>
          <CopyableAddress address={addresses.swapRouter} />
        </div>
        <a
          href={`${explorer}/address/${addresses.swapRouter}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          View Router on Explorer
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
