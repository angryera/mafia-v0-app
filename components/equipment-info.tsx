"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";
import {
  EQUIPMENT_SLOT_LABELS,
  SHOP_ITEM_STATS,
  MAX_EQUIPMENT_MAFIA_STAKE,
} from "@/lib/contract";
import { Shield, Swords, Coins } from "lucide-react";

export function EquipmentInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Equipment
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.equipment}
          label="Equipment Contract"
        />
        <CopyableAddress
          address={addresses.inventory}
          label="Inventory"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-2">Equipment Slots</p>
          <div className="flex flex-col gap-1">
            {Object.entries(EQUIPMENT_SLOT_LABELS).map(([slotId, label]) => (
              <div
                key={slotId}
                className="flex items-center justify-between text-xs"
              >
                <span className="font-mono text-muted-foreground">#{slotId}</span>
                <span className="font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-2">Shop Item Stats</p>
          <div className="flex flex-col gap-1">
            {Object.entries(SHOP_ITEM_STATS).slice(0, 5).map(([typeId, stats]) => (
              <div
                key={typeId}
                className="flex items-center justify-between text-xs"
              >
                <span className="font-medium text-foreground truncate max-w-[100px]">
                  {stats.name}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1 text-cyan-400"
                    title="Defense"
                  >
                    <Shield className="h-3 w-3" />
                    {stats.defense}
                  </span>
                  <span
                    className="flex items-center gap-1 text-red-400"
                    title="Offense"
                  >
                    <Swords className="h-3 w-3" />
                    {stats.offense}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Max MAFIA Stake</p>
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-primary" />
            <p className="font-mono text-sm text-primary">
              {MAX_EQUIPMENT_MAFIA_STAKE.toLocaleString()} MAFIA
            </p>
          </div>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
