"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";
import { BODYGUARD_INFO } from "@/lib/contract";
import { Shield, Swords } from "lucide-react";

export function BodyguardTrainingInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Bodyguard Training
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.bodyguardTraining}
          label="Training Contract"
        />
        <CopyableAddress
          address={addresses.inventory}
          label="Inventory"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-2">Bodyguard Types</p>
          <div className="flex flex-col gap-1.5">
            {Object.entries(BODYGUARD_INFO).map(([catId, info]) => (
              <div
                key={catId}
                className="flex items-center justify-between text-xs"
              >
                <span className="font-medium text-foreground">{info.name}</span>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1 text-cyan-400"
                    title="Defense per level"
                  >
                    <Shield className="h-3 w-3" />
                    {info.defensePerLevel}
                  </span>
                  <span
                    className="flex items-center gap-1 text-red-400"
                    title="Offense per level"
                  >
                    <Swords className="h-3 w-3" />
                    {info.offensePerLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Max Level</p>
          <p className="font-mono text-sm text-primary">Level 10</p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
