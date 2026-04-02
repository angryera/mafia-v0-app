"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function NarcsInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Narcotics Warehouse Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress address={addresses.smuggleMarket} label="Contract" />

        {/* getUserGoods */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Read Function</p>
          <p className="font-mono text-sm text-primary break-all">
            getUserGoods(address,uint256,uint256)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              user <span className="text-muted-foreground">(address)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              startIndex <span className="text-muted-foreground">(uint256)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              length <span className="text-muted-foreground">(uint256)</span>
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Returns array of Good structs (id, owner, categoryId, typeId, isSold)
            </p>
          </div>
        </div>

        {/* buyNarcs */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Write Function</p>
          <p className="font-mono text-sm text-primary break-all">
            buyNarcs(uint8[],string,bytes)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              types <span className="text-muted-foreground">(uint8[])</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              message <span className="text-muted-foreground">(string)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              signature <span className="text-muted-foreground">(bytes)</span>
            </p>
          </div>
        </div>

        {/* sellNarcs */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Write Function</p>
          <p className="font-mono text-sm text-primary break-all">
            sellNarcs(uint256[],string,bytes)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              itemIds <span className="text-muted-foreground">(uint256[])</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              message <span className="text-muted-foreground">(string)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              signature <span className="text-muted-foreground">(bytes)</span>
            </p>
          </div>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
