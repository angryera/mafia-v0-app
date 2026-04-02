"use client";

import { useChainAddresses, useChain } from "@/components/chain-provider";
import { TRAVEL_TYPES } from "@/lib/contract";
import { ExternalLink, Copy, Check, Train, Car, Plane, Clock, DollarSign } from "lucide-react";
import { useState } from "react";

function CopyableAddress({
  address,
  label,
  explorerUrl,
}: {
  address: string;
  label: string;
  explorerUrl: string;
}) {
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
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
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

const TRAVEL_ICONS = {
  train: Train,
  car: Car,
  plane: Plane,
};

export function TravelInfo() {
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const explorerUrl = chainConfig.explorer;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Travel Information
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress
          address={addresses.travel}
          label="Travel Contract"
          explorerUrl={explorerUrl}
        />

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1">Function</p>
          <p className="font-mono text-sm text-primary break-all">
            travel(destinationCity, travelType, itemId)
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-3">
          <p className="text-xs text-muted-foreground mb-2">Travel Methods</p>
          <div className="flex flex-col gap-2">
            {TRAVEL_TYPES.map((type) => {
              const Icon = TRAVEL_ICONS[type.icon as keyof typeof TRAVEL_ICONS];
              return (
                <div
                  key={type.id}
                  className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {type.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      (type {type.id})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {type.cost.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(type.travelTime / 60)}m
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1">Travel Rules</p>
          <ul className="text-xs text-foreground space-y-1">
            <li>- Train: Available for everyone (itemId = 0)</li>
            <li>- Car/Motorcycle: Requires owned vehicle (typeId 3, 5)</li>
            <li>- Airplane: Requires owned plane (typeId 9)</li>
            <li>- Cross-continent travel requires Airplane only</li>
          </ul>
        </div>

        <CopyableAddress
          address={addresses.ingameCurrency}
          label="Approval Contract"
          explorerUrl={explorerUrl}
        />

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
