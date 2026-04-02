"use client";

import { useReadContract } from "wagmi";
import { CONTRACT_ABI } from "@/lib/contract";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";

function CopyableAddress({ address, label, explorerUrl }: { address: string; label: string; explorerUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2.5">
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="font-mono text-sm text-foreground">{truncated}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleCopy}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <a
          href={`${explorerUrl}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`View ${label} on explorer`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

export function ContractInfo() {
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorerUrl = chainConfig.explorer;
  const { data: owner } = useReadContract({
    address: addresses.crime,
    abi: CONTRACT_ABI,
    functionName: "owner",
  });

  const { data: gameBank } = useReadContract({
    address: addresses.crime,
    abi: CONTRACT_ABI,
    functionName: "gameBank",
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Contract Info</h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress address={addresses.crime} label="Contract" explorerUrl={explorerUrl} />
        {owner && (
          <CopyableAddress address={owner as string} label="Owner" explorerUrl={explorerUrl} />
        )}
        {gameBank && (
          <CopyableAddress address={gameBank as string} label="Game Bank" explorerUrl={explorerUrl} />
        )}
        <div className="mt-1 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Live on {chainConfig.label} (Mainnet)
          </span>
        </div>
      </div>
    </div>
  );
}
