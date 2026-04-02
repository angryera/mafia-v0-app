"use client";

import { useState } from "react";
import { useChain } from "@/components/chain-provider";
import { ExternalLink, Copy, Check, FileText } from "lucide-react";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const CONTRACT_REGISTRY: {
  section: string;
  contracts: { key: string; label: string }[];
}[] = [
  {
    section: "Core Gameplay",
    contracts: [
      { key: "crime", label: "Crime" },
      { key: "travel", label: "Travel" },
      { key: "nickcar", label: "Nick a Car" },
      { key: "killskill", label: "Kill Skill" },
      { key: "jail", label: "Jail" },
      { key: "helperbot", label: "Helper Bots" },
      { key: "safehouse", label: "Safehouse" },
      { key: "rankStake", label: "Rank Activation" },
    ],
  },
  {
    section: "Businesses",
    contracts: [
      { key: "shop", label: "Shop" },
      { key: "hospital", label: "Hospital" },
      { key: "bulletFactory", label: "Bullet Factory" },
      { key: "roulette", label: "Roulette" },
      { key: "slotMachine", label: "Slot Machine" },
      { key: "carCrusher", label: "Car Crusher" },
      { key: "jackpot", label: "Jackpot" },
      { key: "detectiveAgency", label: "Detective Agency" },
    ],
  },
  {
    section: "Purchases",
    contracts: [
      { key: "buyCredit", label: "Buy Credits" },
      { key: "buyPerkbox", label: "Buy Perk Boxes" },
      { key: "buyKeys", label: "Buy Keys" },
      { key: "inventory", label: "Inventory (Open Crate)" },
      { key: "perkOpener", label: "Perk Opener (Open Perk Box)" },
      { key: "playerSubscription", label: "Player Subscription" },
    ],
  },
  {
    section: "Tokens / Resources",
    contracts: [
      { key: "ingameCurrency", label: "In-Game Currency" },
      { key: "cash", label: "Cash" },
      { key: "bullets", label: "Bullets" },
      { key: "health", label: "Health" },
      { key: "giCredits", label: "GI Credits" },
      { key: "power", label: "Power" },
      { key: "rankXp", label: "Rank XP" },
      { key: "raceXp", label: "Race XP" },
    ],
  },
  {
    section: "Infrastructure",
    contracts: [
      { key: "userProfile", label: "User Profile" },
      { key: "swapRouter", label: "Swap Router" },
      { key: "wbnb", label: "Wrapped Native Token" },
      { key: "chainlinkPriceFeed", label: "Price Feed" },
    ],
  },
];

function ContractRow({
  label,
  address,
  explorerUrl,
}: {
  label: string;
  address: string;
  explorerUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const isZero = address === ZERO_ADDRESS;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-card/80">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {isZero ? (
          <p className="mt-0.5 text-xs text-muted-foreground/60 italic">
            Not deployed on this chain
          </p>
        ) : (
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {address}
          </p>
        )}
      </div>
      {!isZero && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={`Copy ${label} address`}
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
            aria-label={`View ${label} on block explorer`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

export function ContractsPage() {
  const { chainConfig } = useChain();
  const addresses = chainConfig.addresses as Record<string, string>;
  const explorerUrl = chainConfig.explorer;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Contract Addresses
          </h2>
          <p className="text-sm text-muted-foreground">
            All deployed contracts on {chainConfig.label}
          </p>
        </div>
      </div>

      {CONTRACT_REGISTRY.map((group) => {
        const activeContracts = group.contracts.filter(
          (c) => addresses[c.key] && addresses[c.key] !== ZERO_ADDRESS,
        );
        const inactiveContracts = group.contracts.filter(
          (c) => !addresses[c.key] || addresses[c.key] === ZERO_ADDRESS,
        );

        return (
          <section key={group.section}>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group.section}
              </h3>
              <span className="text-xs text-muted-foreground/60">
                {activeContracts.length}/{group.contracts.length}
              </span>
            </div>
            <div className="space-y-2">
              {activeContracts.map((contract) => (
                <ContractRow
                  key={contract.key}
                  label={contract.label}
                  address={addresses[contract.key]}
                  explorerUrl={explorerUrl}
                />
              ))}
              {inactiveContracts.map((contract) => (
                <ContractRow
                  key={contract.key}
                  label={contract.label}
                  address={ZERO_ADDRESS}
                  explorerUrl={explorerUrl}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
