"use client";

import { useChain } from "@/components/chain-provider";

export function ChainStatusBadge() {
  const { chainConfig } = useChain();
  return (
    <div className="mt-1 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
      <span className="text-xs text-muted-foreground">
        Live on {chainConfig.label} (Mainnet)
      </span>
    </div>
  );
}
