"use client";

import { useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { useChainExplorer } from "@/components/chain-provider";

export function CopyableAddress({
  address,
  label,
}: {
  address: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const explorer = useChainExplorer();

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
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <a
          href={`${explorer}/address/${address}`}
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
