"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function HelperBotInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Helper Bot Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.helperbot}
          label="Contract"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1">Bots Available</p>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-foreground">Crime Bot</p>
            <p className="text-xs text-foreground">Car Bot</p>
            <p className="text-xs text-foreground">Shooting Practice Bot</p>
            <p className="text-xs text-foreground">Booze Smuggling Bot</p>
            <p className="text-xs text-foreground">Narcotics Smuggling Bot</p>
            <p className="text-xs text-foreground">Bullet Dealer Bot</p>
            <p className="text-xs text-foreground">Race XP Bot</p>
            <p className="text-xs text-foreground">Bust Out Bot</p>
          </div>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1">Actions</p>
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-xs text-primary">
              {"start{Bot}(uint256, uint256[])"}
            </p>
            <p className="font-mono text-xs text-primary">
              {"end{Bot}() or end{Bot}(string, bytes)"}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {"user{Bot}Info(address)"}
            </p>
          </div>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
