"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function OpenCrateInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Open Crate
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.inventory}
          label="Inventory Contract"
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Step 1</p>
          <p className="font-mono text-sm text-primary break-all">requestOpenCrate()</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Requests a random seed for opening your crate.
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Step 2</p>
          <p className="font-mono text-sm text-primary break-all">finishOpenCrate()</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Finalizes the crate opening and reveals your items.
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">VRF Check</p>
          <p className="font-mono text-sm text-primary break-all">getNonceStatus(address)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Polls whether the VRF random seed has been fulfilled. Returns{" "}
            <code className="font-mono text-[10px] text-primary">true</code>{" "}
            when ready.
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">How it works</p>
          <p className="text-sm text-foreground leading-relaxed">
            Opening a crate uses Chainlink VRF for verifiable randomness.
            Call{" "}
            <span className="font-mono text-xs text-primary">requestOpenCrate</span>{" "}
            to request a random seed, wait for VRF fulfillment (polled via{" "}
            <span className="font-mono text-xs text-primary">getNonceStatus</span>
            ), then call{" "}
            <span className="font-mono text-xs text-primary">finishOpenCrate</span>{" "}
            to reveal and claim your items. If you already have a pending
            request, you will skip straight to step 2.
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
