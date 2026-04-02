"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";
import { MYSTERY_BOX_REWARDS } from "@/lib/contract";

export function MysteryBoxInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Mystery Box
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.storyMode}
          label="Story Mode Contract"
        />
        <CopyableAddress
          address={addresses.inventory}
          label="Inventory Contract"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Contract Function</p>
          <p className="font-mono text-sm text-primary break-all">claimMysteryBox(itemId)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Opens a mystery box from your inventory and claims a random reward.
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">How it works</p>
          <p className="text-sm text-foreground leading-relaxed">
            Mystery boxes contain one of 27 possible rewards including Credits,
            Keys, Perk Boxes, Bodyguards, Subscriptions, and XP boosts. Click
            &quot;Open Now&quot; to claim a mystery box from your inventory and reveal
            your reward.
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-2">Possible Rewards ({MYSTERY_BOX_REWARDS.length})</p>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-1 gap-1">
              {MYSTERY_BOX_REWARDS.map((reward, index) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background/30"
                >
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span className="text-foreground">{reward.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
