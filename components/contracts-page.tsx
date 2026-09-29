"use client";

import { useState } from "react";
import { useChain } from "@/components/chain-provider";
import { getFtsNetwork } from "@/features/fts/lib/fts";
import {
  DEPOSIT_ADDRESSES,
  EXCHANGE_ADDRESSES,
  MAFIA_PAIR_ADDRESSES,
  MARKETING_DAO_ADDRESSES,
  type ChainConfig,
  type ChainId,
} from "@/lib/constants/address";
import { ExternalLink, Copy, Check, FileText } from "lucide-react";
import { zeroAddress } from "viem";

type AddressKey = keyof ChainConfig["addresses"];

const CONTRACT_REGISTRY = [
  {
    section: "Core Gameplay",
    contracts: [
      { key: "crime", label: "Crime" },
      { key: "travel", label: "Travel" },
      { key: "nickcar", label: "Nick a Car" },
      { key: "killskill", label: "Kill Skill" },
      { key: "bustOutSkill", label: "Bust Out Skill" },
      { key: "jail", label: "Jail" },
      { key: "helperbot", label: "Helper Bots" },
      { key: "safehouse", label: "Safehouse" },
      { key: "rankStake", label: "Rank Activation" },
      { key: "bodyguardTraining", label: "Bodyguard Training" },
      { key: "equipment", label: "Equipment" },
      { key: "kill", label: "Kill" },
      { key: "rebirth", label: "Rebirth" },
      { key: "storyMode", label: "Story Mode" },
      { key: "weeklyMission", label: "Weekly Missions" },
      { key: "raceLobby", label: "Racing" },
    ],
  },
  {
    section: "Organized Crime",
    contracts: [
      { key: "ocLobby", label: "OC Lobby" },
      { key: "ocJoin", label: "OC Join" },
      { key: "ocExecution", label: "OC Execution" },
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
      { key: "lotteryHall", label: "Lottery Hall" },
      { key: "detectiveAgency", label: "Detective Agency" },
      { key: "smuggleMarket", label: "Smuggle Market" },
      { key: "map", label: "City Map" },
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
      { key: "ingameCurrency", label: "Cash" },
      { key: "bullets", label: "Bullets" },
      { key: "bulletToken", label: "Bullet Token" },
      { key: "health", label: "Health" },
      { key: "giCredits", label: "GI Credits" },
      { key: "rankXp", label: "Rank XP" },
      { key: "raceXp", label: "Race XP" },
      { key: "ogCrate", label: "OG Crate (ERC1155 keys)" },
      { key: "mafia", label: "MAFIA" },
    ],
  },
  {
    section: "Family",
    contracts: [
      { key: "mafiaFamily", label: "Family" },
      { key: "familyGameCashBank", label: "Family Cash Bank" },
      { key: "familyShareStake", label: "Family Share Stake" },
    ],
  },
  {
    section: "Exchange",
    contracts: [
      { key: "exchange", label: "Exchange" },
      { key: "deposit", label: "Deposit" },
      { key: "mafiaPair", label: "MAFIA Pair" },
    ],
  },
  {
    section: "Marketplace",
    contracts: [
      { key: "xpMarket", label: "XP Market" },
      { key: "inventoryMarketplace", label: "Inventory Marketplace" },
    ],
  },
  {
    section: "Infrastructure",
    contracts: [
      { key: "userProfile", label: "User Profile" },
      { key: "swapRouter", label: "Swap Router" },
      { key: "marketingDao", label: "Marketing DAO" },
      { key: "fts", label: "Founders Shares" },
      { key: "ftsMarket", label: "Founders Market" },
      { key: "ftsSubscription", label: "Founders Subscription" },
    ],
  },
] as const;

type ListedKey = (typeof CONTRACT_REGISTRY)[number]["contracts"][number]["key"];
type MissingAddressKey = Exclude<AddressKey, ListedKey>;
const _allAddressesListed: [MissingAddressKey] extends [never] ? true : never = true;
void _allAddressesListed;

function resolveAddress(
  key: ListedKey,
  chainId: ChainId,
  addresses: ChainConfig["addresses"],
  wagmiChainId: number,
): string | undefined {
  switch (key) {
    case "exchange":
      return EXCHANGE_ADDRESSES[chainId];
    case "deposit":
      return DEPOSIT_ADDRESSES[chainId];
    case "mafiaPair":
      return MAFIA_PAIR_ADDRESSES[chainId];
    case "marketingDao":
      return MARKETING_DAO_ADDRESSES[chainId];
    case "fts":
    case "ftsMarket":
    case "ftsSubscription": {
      const network = getFtsNetwork(wagmiChainId);
      if (!network) return undefined;
      if (key === "fts") return network.fts;
      if (key === "ftsMarket") return network.market;
      return network.subscription;
    }
    default:
      return addresses[key];
  }
}

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
  const isZero = !address || address === zeroAddress;

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
  const addresses = chainConfig.addresses;
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
        const resolved = group.contracts.map((contract) => ({
          key: contract.key,
          label: contract.label,
          address:
            resolveAddress(
              contract.key,
              chainConfig.id,
              addresses,
              chainConfig.wagmiChainId,
            ) ?? zeroAddress,
        }));
        const activeContracts = resolved.filter(
          (contract) => contract.address !== zeroAddress,
        );
        const inactiveContracts = resolved.filter(
          (contract) => contract.address === zeroAddress,
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
                  address={contract.address}
                  explorerUrl={explorerUrl}
                />
              ))}
              {inactiveContracts.map((contract) => (
                <ContractRow
                  key={contract.key}
                  label={contract.label}
                  address={zeroAddress}
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
