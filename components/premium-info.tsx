"use client";

import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { Crown, ExternalLink, CheckCircle2 } from "lucide-react";

export function PremiumInfo() {
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-400" />
        <h4 className="text-sm font-bold text-foreground">
          Premium Subscription
        </h4>
      </div>
      <div className="space-y-3 text-xs text-muted-foreground">
        <p>
          Subscribe to a premium plan using native tokens or ERC-20 stablecoins.
          Two plans are available: Plus and Unlimited.
        </p>

        {/* Plans overview */}
        <div className="rounded-lg bg-background/50 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Plan Benefits
          </p>
          <div className="space-y-2.5">
            <div>
              <p className="text-xs font-medium text-foreground">Plus Plan</p>
              <ul className="mt-1 space-y-0.5">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                  <span className="text-[10px]">Extended helper bot slots</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                  <span className="text-[10px]">Reduced cooldowns</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Unlimited Plan</p>
              <ul className="mt-1 space-y-0.5">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-amber-400" />
                  <span className="text-[10px]">All Plus benefits</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-amber-400" />
                  <span className="text-[10px]">Unlimited bot operations</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-amber-400" />
                  <span className="text-[10px]">Priority access to new features</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contract details */}
        <div className="space-y-2">
          <div className="rounded-lg bg-background/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Write Function</p>
            <p className="font-mono text-sm text-primary break-all">
              subscribe(swapTokenId, planType)
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Payable. Sends native token value or uses an approved ERC-20.
            </p>
          </div>
          <div className="rounded-lg bg-background/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Read Functions</p>
            <p className="font-mono text-[10px] text-primary break-all">
              isSubscribed(address) / planPrice(planType)
            </p>
          </div>
        </div>

        <div className="rounded bg-secondary/50 p-2">
          <p className="mb-1 font-medium text-foreground">Contract</p>
          <CopyableAddress address={addresses.playerSubscription} label="Contract" />
        </div>
        <a
          href={`${explorer}/address/${addresses.playerSubscription}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          View on Explorer
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
