"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function OpenPerkBoxInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Perk Box
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.perkOpener}
          label="Perk Opener Contract"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">How it works</p>
          <p className="text-sm text-foreground leading-relaxed">
            Opening a perk box uses VRF for verifiable randomness. Click Open,
            wait for VRF fulfillment, then finish to reveal your perk.
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1.5">Perk Types</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-foreground">Success Boost</span>
              <span className="text-[10px] text-muted-foreground ml-auto">+% success chance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span className="text-xs text-foreground">Cooldown Reduction</span>
              <span className="text-[10px] text-muted-foreground ml-auto">-% cooldown</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-xs text-foreground">Booster</span>
              <span className="text-[10px] text-muted-foreground ml-auto">+% various</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
              <span className="text-xs text-foreground">Tools</span>
              <span className="text-[10px] text-muted-foreground ml-auto">special abilities</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1.5">Durations</p>
          <p className="text-xs text-foreground">
            6h, 12h, 24h, 48h, 72h, or 96h
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Step 1</p>
          <p className="font-mono text-sm text-primary break-all">
            requestOpenPerkBox(itemId)
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Step 2</p>
          <p className="font-mono text-sm text-primary break-all">finishOpenPerkBox()</p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
