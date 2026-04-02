"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function RacingInfo() {
  const addresses = useChainAddresses();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Racing Lobby
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.raceLobby}
          label="Race Lobby"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Prize Types</p>
          <p className="text-sm text-foreground">
            <span className="font-mono text-primary">OpponentCar (0)</span>{" "}
            or{" "}
            <span className="font-mono text-primary">GameCash (1)</span>
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Race Status</p>
          <p className="text-sm text-foreground">
            <span className="font-mono text-yellow-400">Pending (0)</span>
            {" · "}
            <span className="font-mono text-blue-400">Started (1)</span>
            {" · "}
            <span className="font-mono text-green-400">Finished (2)</span>
            {" · "}
            <span className="font-mono text-red-400">Cancelled (3)</span>
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Data Source</p>
          <p className="text-sm text-foreground">
            On-chain race data filtered by city and status
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
