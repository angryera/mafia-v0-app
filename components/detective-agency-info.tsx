"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function DetectiveAgencyInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Detective Agency Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.detectiveAgency}
          label="Contract"
        />

        {/* requestHireDetective */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function 1</p>
          <p className="font-mono text-sm text-primary break-all">
            requestHireDetective(address,uint256,string,bytes)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              target <span className="text-muted-foreground">(address)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              detectivesCount <span className="text-muted-foreground">(uint256)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              message <span className="text-muted-foreground">(string)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              signature <span className="text-muted-foreground">(bytes)</span>
            </p>
          </div>
        </div>

        {/* finishHireDetective */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function 2</p>
          <p className="font-mono text-sm text-primary break-all">
            finishHireDetective(uint256)
          </p>
          <div className="mt-1.5">
            <p className="font-mono text-xs text-foreground">
              hireId <span className="text-muted-foreground">(uint256)</span>
            </p>
          </div>
        </div>

        {/* revealTarget */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function 3</p>
          <p className="font-mono text-sm text-primary break-all">
            revealTarget(uint256)
          </p>
          <div className="mt-1.5">
            <p className="font-mono text-xs text-foreground">
              hireId <span className="text-muted-foreground">(uint256)</span>
            </p>
          </div>
        </div>

        {/* setCityDetectiveCost */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Function 4 (Owner)</p>
          <p className="font-mono text-sm text-primary break-all">
            setCityDetectiveCost(uint8,uint256)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              cityId <span className="text-muted-foreground">(uint8)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              detectiveCost <span className="text-muted-foreground">(uint256)</span>
            </p>
          </div>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
