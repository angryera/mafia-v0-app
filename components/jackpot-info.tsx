"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function JackpotInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Jackpot Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress address={addresses.jackpot} label="Contract" />

        {/* enterPot */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            Enter with Tokens
          </p>
          <p className="font-mono text-sm text-primary break-all">
            enterPot(uint8,uint256)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              entryType{" "}
              <span className="text-muted-foreground">
                (0=OGCrate, 1=PerkBox, 2=MafiaToken, 3=Cash, 4=Credit)
              </span>
            </p>
            <p className="font-mono text-xs text-foreground">
              amount <span className="text-muted-foreground">(uint256)</span>
            </p>
          </div>
        </div>

        {/* enterPotWithInventoryItem */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            Enter with Inventory Item
          </p>
          <p className="font-mono text-sm text-primary break-all">
            enterPotWithInventoryItem(uint256)
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Enter the pot using an inventory item (car, weapon, etc.) valued at
            its USD price.
          </p>
        </div>

        {/* enterPotWithPerkBoxes */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            Enter with Perk Boxes
          </p>
          <p className="font-mono text-sm text-primary break-all">
            enterPotWithPerkBoxes(uint256[])
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Enter the pot using one or more perk box items from your inventory.
            Pass an array of perk box item IDs.
          </p>
        </div>

        {/* getCurrentRound */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">View Function</p>
          <p className="font-mono text-sm text-primary break-all">getCurrentRound()</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Returns current round ID, state, total USD pot, live time, duration,
            entries count, and bet limits.
          </p>
        </div>

        {/* Round states */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1.5">
            Round States
          </p>
          <div className="flex flex-col gap-0.5 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-foreground">0 = WAITING</span>
              <span className="text-muted-foreground">Accepting entries</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">1 = LIVE</span>
              <span className="text-muted-foreground">Round is active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">2 = CALCULATING</span>
              <span className="text-muted-foreground">Picking winner</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">3 = CLOSED</span>
              <span className="text-muted-foreground">Round ended</span>
            </div>
          </div>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
