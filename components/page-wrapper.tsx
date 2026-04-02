"use client";

import { usePathname } from "next/navigation";
import { getTabFromPath } from "@/components/header";
import type { Tab } from "@/components/header";
import { useChain } from "@/components/chain-provider";

const TAB_CONFIG: Record<
  Tab,
  {
    title: string;
    description: string;
    codeSample: string;
    contractAddress: string;
    contractShort: string;
  }
> = {
  crime: {
    title: "Crime Operations",
    description:
      "Connect your wallet to interact with the crime contract on BNB Smart Chain. Choose your crime type and execute on-chain.",
    codeSample: "makeCrime(uint8)",
    contractAddress: "0x167ad284c7bcc4d6342991aa258422e7a04f926e",
    contractShort: "0x167a...926e",
  },
  "organized-crime": {
    title: "Organized Crime",
    description:
      "Team up with 4 other players to pull off a heist. Create or join a lobby, select your role and equipment, then execute the crime together.",
    codeSample: "createLobby() / joinAs{Role}()",
    contractAddress: "0x281C0Db67c96ee7Ad32AF25817cB3964Fc7E79cD",
    contractShort: "0x281C...79cD",
  },
  travel: {
    title: "Travel System",
    description:
      "Travel between 11 cities on BNB Smart Chain. Pick your destination and choose to go by train, car, or plane.",
    codeSample: "travel(uint256, uint256)",
    contractAddress: "0xa08d627e071cb4b53c6d0611d77dbcb659902aa4",
    contractShort: "0xa08d...2aa4",
  },
  nickcar: {
    title: "Nick a Car",
    description:
      "Steal a car on BNB Smart Chain. Pick your method and call the function with your chosen crime type.",
    codeSample: "nickCar(uint256)",
    contractAddress: "0x60b8e0dd9566b42f9caa5538350aa0d29988373c",
    contractShort: "0x60b8...373c",
  },
  killskill: {
    title: "Kill Skill",
    description:
      "Train your kill skills on BNB Smart Chain. Pick a training type and level up your abilities.",
    codeSample: "trainSkill(uint256)",
    contractAddress: "0xa5dc2cb4dc13f12d8464eaa862fac00f19adc84d",
    contractShort: "0xa5dc...c84d",
  },
  jail: {
    title: "Jail",
    description:
      "Check if you are in jail, see your remaining sentence, or buy your way out.",
    codeSample: "buyOut(address)",
    contractAddress: "0x7371580cd13de739c734ae85062f75194d13fac2",
    contractShort: "0x7371...fac2",
  },
  helperbots: {
    title: "Helper Bots",
    description:
      "Hire bots to automate your operations or withdraw them. Approve InGameCurrency first, then manage your fleet.",
    codeSample: "start{Bot}() / end{Bot}()",
    contractAddress: "0xe2e4506c23c26eea2526d0e4dbb8dbf9cda9d105",
    contractShort: "0xe2e4...d105",
  },
  "buy-helper-credits": {
    title: "Buy Helper Credits",
    description:
      "Purchase helper credits on BNB Smart Chain. Each credit costs $0.05 USD.",
    codeSample: "buyCredit(uint256)",
    contractAddress: "0x192f029cc7e0bb80db201191e0040e8f801df34d",
    contractShort: "0x192f...f34d",
  },
  "buy-keys": {
    title: "Buy Keys",
    description:
      "Purchase key crates on BNB Smart Chain. Each crate costs $20.00 USD.",
    codeSample: "buyCrate(uint256)",
    contractAddress: "0x1f4eb51e87c4e2368316dba8e478cd561feb8b77",
    contractShort: "0x1f4e...8b77",
  },
  "buy-perk-boxes": {
    title: "Buy Perk Boxes",
    description:
      "Purchase perk boxes on BNB Smart Chain. Each perk box costs $10.00 USD.",
    codeSample: "buyPerkBoxes(uint256)",
    contractAddress: "0x55849c0f5a567a49d219b00642a4648389ada6f6",
    contractShort: "0x5584...a6f6",
  },
  "buy-premium": {
    title: "Premium Subscription",
    description:
      "Subscribe to Plus or Unlimited plans using native tokens or ERC-20 stablecoins. Prices fetched live from the contract.",
    codeSample: "subscribe(swapTokenId, planType)",
    contractAddress: "0x3CEef7Fe3CcF730b87D0bFC651c680a7a76dCa61",
    contractShort: "0x3CEe...Ca61",
  },
  "open-crate": {
    title: "Open Crate",
    description:
      "Open a key crate to reveal items. Two-step process: request a random seed, then finish to reveal.",
    codeSample: "requestOpenCrate() / finishOpenCrate()",
    contractAddress: "0x2CB8352Be090846d4878Faa92825188D7bf50654",
    contractShort: "0x2CB8...0654",
  },
  "open-perkbox": {
    title: "Open Perk Box",
    description:
      "Open a perk box to reveal perks. Two-step process: request a random seed, then finish to reveal.",
    codeSample: "requestOpenPerkBox(itemId) / finishOpenPerkBox()",
    contractAddress: "0x26563e46A96a07e66BC01Ad6b1b41B42a33364F8",
    contractShort: "0x2656...f1F8",
  },
  "buy-gi-credits": {
    title: "Buy GI Credits",
    description:
      "Purchase GI Credits using native tokens or ERC-20 stablecoins. Prices are fetched live from the contract.",
    codeSample: "buyCredit(swapTokenId, creditAmount)",
    contractAddress: "",
    contractShort: "",
  },
  "my-profile": {
    title: "My Profile",
    description:
      "View your player profile including name, city, rank XP, and rank name.",
    codeSample: "getUserProfile(address,string,bytes)",
    contractAddress: "0x2a4d56a74b0ba2422e2ad19d71fba7f2b0f394bf",
    contractShort: "0x2a4d...4bf",
  },
  worth: {
    title: "Player Worth",
    description:
      "Calculate and view your total player worth based on profile stats, assets, subscription status, and achievements. Worth includes rank, role, skills, equipment, and more.",
    codeSample: "MafiaWorth.computeWorth()",
    contractAddress: "",
    contractShort: "",
  },
  cash: {
    title: "Cash Balance",
    description:
      "View your in-game cash balance. Uses a signed message for on-chain verification.",
    codeSample: "balanceofWithSignMsg(address,string,bytes)",
    contractAddress: "0x376554F7BbcdeB348fa4b8371135B87eC6b29c38",
    contractShort: "0x3765...c38",
  },
  "biz-shop": {
    title: "Shop",
    description:
      "Buy weapons, armor, and bodyguards. Uses getShopItem(cityId, typeId) for stock and pricing, buyItem with signed authentication.",
    codeSample: "getShopItem(uint8,uint256) / buyItem(uint256,uint256,string,bytes)",
    contractAddress: "0xd922255cCeb4f97e2830038E4e7EF54Cb62B6733",
    contractShort: "0xd922...6733",
  },
  "biz-hospital": {
    title: "Hospital",
    description:
      "Reproduce blood or buy health at the on-chain hospital. Uses your profile cityId and signed messages.",
    codeSample: "reproduceBlood(uint8) / buyHealth(uint256,string,bytes)",
    contractAddress: "0xB4c9ef457e17992f9271B447de3507016fd0E0d7",
    contractShort: "0xB4c9...E0d7",
  },
  "biz-bulletfactory": {
    title: "Bullet Factory",
    description:
      "Buy bullets at your city's factory. Uses getCityMarketInfo for stock and pricing, buyBullets with signed authentication.",
    codeSample: "buyBullets(uint256,string,bytes)",
    contractAddress: "0xAbfdA460fFEa2697A4d0b17e955bc17e87b6d45E",
    contractShort: "0xAbfd...d45E",
  },
  "biz-detective-agency": {
    title: "Detective Agency",
    description:
      "Hire detectives to find a target player's city location. Approve cash, send detectives, finish the hire, and reveal the target.",
    codeSample: "requestHireDetective(address,uint256,string,bytes)",
    contractAddress: "0x6c7e8317698986c0B92FdDB7CA3086234B5e5F60",
    contractShort: "0x6c7e...5F60",
  },
  "biz-car-crusher": {
    title: "Car Crusher",
    description: "Crush your cars into bullets. Requires signed message authentication and cash approval.",
    codeSample: "crushCars(uint256[],string,bytes)",
    contractAddress: "0xC17B536db3431040f1F2A8980B2Eb80B814dD022",
    contractShort: "0xC17B...D022",
  },
  "biz-bank": {
    title: "Bank",
    description:
      "Transfer cash to another player on-chain. Uses a signed message for authentication.",
    codeSample: "userTransfer(address,uint256,string,bytes)",
    contractAddress: "0x376554F7BbcdeB348fa4b8371135B87eC6b29c38",
    contractShort: "0x3765...c38",
  },
  "biz-roulette": {
    title: "Roulette",
    description:
      "Place bets on the on-chain roulette wheel. Two-step process: initialize bet with VRF seed, then finish to spin the wheel.",
    codeSample: "initializeBet(uint8,Bet[],string,bytes) / finishBet(uint8)",
    contractAddress: "0x53e579dC9BE49B6Bac08c6F9ffA83D981A9A19F3",
    contractShort: "0x53e5...19F3",
  },
  "biz-slotmachine": {
    title: "Slot Machine",
    description:
      "Spin the on-chain slot machine. Two-step process: initialize bet with spin count, then finish to reveal the result via VRF.",
    codeSample: "initializeBet(uint8,uint8,uint256,string,bytes) / finishBet(uint8)",
    contractAddress: "0xa593553bdbA38730226aaabF07D241a16a3fc005",
    contractShort: "0xa593...c005",
  },
  "biz-jackpot": {
    title: "Jackpot",
    description:
      "Enter the pot with tokens, cash, or items. One winner takes all at the end of each round.",
    codeSample: "enterPot(uint8,uint256) / getCurrentRound()",
    contractAddress: "0x2FAcF1371d3e67B98A27490321655ac059f675B2",
    contractShort: "0x2FAc...75B2",
  },
  "biz-safehouse": {
    title: "Safehouse",
    description:
      "Hide from attacks by entering the safehouse. Costs 100,000 cash per hour. Approve spending, then enter.",
    codeSample: "enterSafehouse(uint256)",
    contractAddress: "0x6c7e8317698986c0B92FdDB7CA3086234B5e5F60",
    contractShort: "0x6c7e...5F60",
  },
  "biz-booze": {
    title: "Booze Warehouse",
    description:
      "Buy and sell booze items in the city warehouse. Prices fluctuate based on market activity. Watch the cooldown timer between transactions.",
    codeSample: "buyBooze(types[]) / sellBooze(itemIds[])",
    contractAddress: "0x36b09f1854CF3614Eb8d10fFae847511BB08868e",
    contractShort: "0x36b0...868e",
  },
  "biz-narcs": {
    title: "Narcotics Warehouse",
    description:
      "Buy and sell narcotics in the city warehouse. Higher risk, higher reward. Prices fluctuate based on market activity.",
    codeSample: "buyNarcs(types[]) / sellNarcs(itemIds[])",
    contractAddress: "0x36b09f1854CF3614Eb8d10fFae847511BB08868e",
    contractShort: "0x36b0...868e",
  },
  garage: {
    title: "Garage",
    description:
      "View all the cars in your garage. Fetches on-chain inventory items (category 15 = CAR_ITEM) and filters by your connected wallet.",
    codeSample: "getItemsByCategory(15)",
    contractAddress: "0x2CB8352Be090846d4878Faa92825188D7bf50654",
    contractShort: "0x2CB8...0654",
  },
  "city-map": {
    title: "City Map",
    description:
      "Explore the 50\u00d730 city grid. View user-owned businesses, family headquarters, and protocol-owned plots.",
    codeSample: "",
    contractAddress: "",
    contractShort: "",
  },
  "rank-activation": {
    title: "Rank Activation",
    description:
      "Stake MAFIA tokens to activate your rank. Each rank level requires a USD-equivalent stake that is reduced by family, equipment, and building bonuses.",
    codeSample: "stake() / unstake() / adjustStake()",
    contractAddress: "",
    contractShort: "",
  },
  "bodyguard-training": {
    title: "Bodyguard Training",
    description:
      "Train your bodyguards to level them up. Each level increases defense and offense stats. Select a bodyguard, approve cash spend, and start training.",
    codeSample: "trainBodyguard(slotId, itemId)",
    contractAddress: "0xb7D6c0B1a176711C98cceF191Eb5528F2e703fd5",
    contractShort: "0xb7D6...3fd5",
  },
  equipment: {
    title: "Equipment",
    description:
      "Equip shop items, bodyguards, buildings, and stake MAFIA tokens to boost your defense and offense power in each city.",
    codeSample: "equipItems(cityId, itemIds, delta)",
    contractAddress: "0xa2AA522B4CCBc95Dec0aFCa2B0c645f9C126cD24",
    contractShort: "0xa2AA...cD24",
  },
  players: {
    title: "Players Directory",
    description:
      "Browse all registered players in the game. Search by name, address, or country. View player status and profile information.",
    codeSample: "getUsersInfo(startIndex, length)",
    contractAddress: "0xa08D627E071cB4b53C6D0611d77dbCB659902AA4",
    contractShort: "0xa08D...2AA4",
  },
  families: {
    title: "Family Directory",
    description:
      "Browse all mafia families. View leadership hierarchy (Don, Consigliere, Capodecina, Capos), successors, and member lists. Sorted by member count.",
    codeSample: "getFamiliesWithPlayers()",
    contractAddress: "",
    contractShort: "",
  },
  info: {
    title: "Contract Addresses",
    description: "View all deployed contract addresses for the current chain.",
    codeSample: "",
    contractAddress: "",
    contractShort: "",
  },
  "exchange-convert": {
    title: "Exchange Convert",
    description:
      "Convert Cash Boxes, Shop Items, Credits, and Land Slots into in-game cash. Prices calculated using live MAFIA token prices.",
    codeSample: "convertItem(uint256[])",
    contractAddress: "0x605694A29c5258D6c7Aed642D01111c4b7036966",
    contractShort: "0x6056...6966",
  },
  referral: {
    title: "Referral Program",
    description:
      "Track your referrals and compete on the leaderboard. See who used your address as their referrer and climb the rankings.",
    codeSample: "getUsersInfo()",
    contractAddress: "0xa08D627E071cB4b53C6D0611d77dbCB659902AA4",
    contractShort: "0xa08D...2AA4",
  },
  "weekly-missions": {
    title: "Weekly Missions",
    description:
      "Complete weekly missions to earn cash rewards. Start a new mission cycle, complete common and smuggle missions, and claim your reward before it decays.",
    codeSample: "startWeeklyMission() / claimWeeklyMission()",
    contractAddress: "0xc82d2eD039af6f01b4A44a11699a73EEB90cBAbB",
    contractShort: "0xc82d...BAbB",
  },
  "story-mode": {
    title: "Story Mode",
    description:
      "Complete story missions across 7 chapters to earn rewards and become a Made Man. Each chapter has 5 tasks that auto-track your in-game actions.",
    codeSample: "getUserMissionStatus() / claimReward()",
    contractAddress: "0x4D9d610092B233a24193CB686De1A8746C5224f8",
    contractShort: "0x4D9d...24f8",
  },
  "xp-market": {
    title: "XP Market",
    description:
      "Trade your XP on the marketplace. List your Rank XP, Kill Skill XP, Bustout XP, or Race XP for auction. Bid on listings from other players.",
    codeSample: "listXP(xpType, listingType, token, price, duration)",
    contractAddress: "0x49F23822AFa248D4bE453d630F7e0dF8fcF80854",
    contractShort: "0x49F2...0854",
  },
  racing: {
    title: "Racing",
    description:
      "Race your cars against other players. Create or join race lobbies, bet cash or cars as prizes, and compete to win.",
    codeSample: "createRace(carId, prizeType, cashAmount)",
    contractAddress: "",
    contractShort: "",
  },
};

export { TAB_CONFIG };

interface PageWrapperProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  fullWidth?: boolean;
}

export function PageWrapper({ children, sidebar, fullWidth = false }: PageWrapperProps) {
  const pathname = usePathname();
  const activeTab = getTabFromPath(pathname);
  const { chainConfig } = useChain();
  
  // Ensure config always has a valid value with explicit fallback
  const rawConfig = TAB_CONFIG[activeTab];
  const config = rawConfig ?? TAB_CONFIG.crime;

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Page header */}
        <section className="mb-8">
          <h2 className="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {config.title}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {config.description}{" "}
            {config.codeSample && (
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
                {config.codeSample}
              </code>
            )}
          </p>
        </section>

        {/* Content */}
        {fullWidth ? (
          children
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row">
            {sidebar && (
              <aside className="lg:w-80 shrink-0">
                <div className="sticky top-20">{sidebar}</div>
              </aside>
            )}
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs text-muted-foreground">
            {config.contractAddress ? (
              <>
                Contract{" "}
                <a
                  href={`${chainConfig.explorer}/address/${config.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary/70 hover:text-primary transition-colors"
                >
                  {config.contractShort}
                </a>{" "}
                on {chainConfig.label}
              </>
            ) : (
              `Playmafia App on ${chainConfig.label}`
            )}
          </p>
        </div>
      </footer>
    </>
  );
}
