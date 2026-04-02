import type { Abi } from "viem";
import { City } from "@/lib/contract";

// ========== Weekly Mission Contract ABI ==========
export const WEEKLY_MISSION_ABI: Abi = [
  {
    inputs: [],
    name: "claimWeeklyMission",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserMissionStatus",
    outputs: [
      {
        components: [
          { internalType: "uint48", name: "startedAt", type: "uint48" },
          { internalType: "uint48", name: "completedAt", type: "uint48" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "uint256", name: "maxReward", type: "uint256" },
          {
            components: [
              { internalType: "uint32", name: "missionId", type: "uint32" },
              { internalType: "bool", name: "isCompleted", type: "bool" },
            ],
            internalType: "struct MafiaWeeklyMission.CommonMissionStatus[]",
            name: "commonMissions",
            type: "tuple[]",
          },
          {
            components: [
              { internalType: "string", name: "messageType", type: "string" },
              { internalType: "string", name: "messageSubType", type: "string" },
              { internalType: "uint8", name: "typeId", type: "uint8" },
              { internalType: "uint8", name: "cityId", type: "uint8" },
              { internalType: "bool", name: "isCompleted", type: "bool" },
            ],
            internalType: "struct MafiaWeeklyMission.SmuggleMission[]",
            name: "smuggleMissions",
            type: "tuple[]",
          },
        ],
        internalType: "struct MafiaWeeklyMission.UserMissionStatus",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "startWeeklyMission",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "reward", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "startedAt", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "completedAt", type: "uint256" },
    ],
    name: "WeeklyMissionClaimed",
    type: "event",
  },
] as const;

// ========== Mission Status Types ==========
export interface CommonMissionStatus {
  missionId: number;
  isCompleted: boolean;
}

export interface SmuggleMissionStatus {
  messageType: string;
  messageSubType: string;
  typeId: number;
  cityId: number;
  isCompleted: boolean;
}

export interface UserMissionStatus {
  startedAt: number;
  completedAt: number;
  status: number;
  maxReward: bigint;
  commonMissions: CommonMissionStatus[];
  smuggleMissions: SmuggleMissionStatus[];
}

// ========== Mission Metadata ==========
export interface MissionMetadata {
  id: number;
  messageType: string;
  messageSubType: string;
  title: string;
  description: string;
  link: string;
  image?: string;
  isCitySpecific?: boolean;
  cityId?: number;
}

// Common mission types metadata
export const WEEKLY_COMMON_MISSION_TYPE: MissionMetadata[] = [
  {
    id: 0,
    messageType: "BasicCrime",
    messageSubType: "Hotdog",
    title: "Rob a hotdog stand",
    description: "A simple street crime to earn some quick cash.",
    link: "/",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/rob-hotdog.png",
  },
  {
    id: 1,
    messageType: "BasicCrime",
    messageSubType: "Train",
    title: "Rob a freight train",
    description: "Pull off a daring freight train heist.",
    link: "/",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/rob-train.png",
  },
  {
    id: 2,
    messageType: "BasicCrime",
    messageSubType: "Bank",
    title: "Rob the bank",
    description: "The ultimate heist. Navigate through security systems.",
    link: "/",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/rob-bank.png",
  },
  {
    id: 3,
    messageType: "BasicCrime",
    messageSubType: "PoliceStation",
    title: "Bribe the police station",
    description: "Corruption runs deep. Pay off the right officers.",
    link: "/",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/bribe-police.png",
  },
  {
    id: 4,
    messageType: "CarNick",
    messageSubType: "StreetCorner",
    title: "Steal car from street corner",
    description: "Boost an unattended vehicle from a quiet street.",
    link: "/nickcar",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/nick-car-street-corner.png",
  },
  {
    id: 5,
    messageType: "CarNick",
    messageSubType: "FootballStadium",
    title: "Steal car from football stadium",
    description: "Hit the stadium parking lot during game time.",
    link: "/nickcar",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/nick-car-stadium.png",
  },
  {
    id: 6,
    messageType: "CarNick",
    messageSubType: "PrivateResidence",
    title: "Steal car from private residence",
    description: "Break into a wealthy neighborhood for a high-end vehicle.",
    link: "/nickcar",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/nick-car-private-residence.png",
  },
  {
    id: 7,
    messageType: "CarNick",
    messageSubType: "Dealership",
    title: "Steal car from the dealership",
    description: "The most audacious car theft from the showroom floor.",
    link: "/nickcar",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/nick-car-dealership.png",
  },
  {
    id: 8,
    messageType: "Jail",
    messageSubType: "BustOut",
    title: "Bust out a player",
    description: "Break one of your crew members out of jail.",
    link: "/jail",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/jail.webp",
  },
  {
    id: 9,
    messageType: "KillSkill",
    messageSubType: "Train",
    title: "Train kill skill",
    description: "Sharpen your assassination techniques at the training facility.",
    link: "/killskill",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/killskill-bottles.png",
  },
  {
    id: 10,
    messageType: "Jail",
    messageSubType: "Imprison",
    title: "Get caught",
    description: "Sometimes you get caught. Serve your time.",
    link: "",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/jail.webp",
  },
  {
    id: 11,
    messageType: "MafiaProfile",
    messageSubType: "Travel",
    isCitySpecific: true,
    cityId: 0,
    title: "Travel to Chicago by train",
    description: "Take the rails to the Windy City.",
    link: "/travel",
    image: "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/travel.webp",
  },
  // Travel missions for other cities
  { id: 12, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 4, title: "Travel to Las Vegas by train", description: "Journey to Sin City by rail.", link: "/travel" },
  { id: 13, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 1, title: "Travel to Detroit by train", description: "Head to Motor City by train.", link: "/travel" },
  { id: 14, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 3, title: "Travel to Miami by train", description: "Ride the rails to the Magic City.", link: "/travel" },
  { id: 15, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 2, title: "Travel to New York by train", description: "Take the train to the Big Apple.", link: "/travel" },
  { id: 16, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 7, title: "Travel to Caracas by train", description: "Journey south to Venezuela's capital.", link: "/travel" },
  { id: 17, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 5, title: "Travel to Medellin by train", description: "Head to Colombia's cartel heartland.", link: "/travel" },
  { id: 18, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 6, title: "Travel to Bogota by train", description: "Travel to Colombia's capital by rail.", link: "/travel" },
  { id: 19, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 10, title: "Travel to Napoli by train", description: "Journey to Napoli, home of the Camorra.", link: "/travel" },
  { id: 20, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 8, title: "Travel to Palermo by train", description: "Head to Sicily's capital.", link: "/travel" },
  { id: 21, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 9, title: "Travel to Messina by train", description: "Take the train to Sicily's eastern port.", link: "/travel" },
  // Plane travel missions
  { id: 22, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 0, title: "Travel to Chicago by plane", description: "Fly into Chicago for urgent business.", link: "/travel" },
  { id: 23, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 4, title: "Travel to Las Vegas by plane", description: "Take a private flight to Vegas.", link: "/travel" },
  { id: 24, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 1, title: "Travel to Detroit by plane", description: "Fly to Motor City for quick business.", link: "/travel" },
  { id: 25, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 3, title: "Travel to Miami by plane", description: "Catch a flight to Miami's shores.", link: "/travel" },
  { id: 26, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 2, title: "Travel to New York by plane", description: "Fly into the Big Apple.", link: "/travel" },
  { id: 27, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 7, title: "Travel to Caracas by plane", description: "Fly south to Caracas.", link: "/travel" },
  { id: 28, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 5, title: "Travel to Medellin by plane", description: "Take a charter flight to cartel territory.", link: "/travel" },
  { id: 29, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 6, title: "Travel to Bogota by plane", description: "Fly into Bogota's distribution hub.", link: "/travel" },
  { id: 30, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 10, title: "Travel to Napoli by plane", description: "Take a flight to Napoli.", link: "/travel" },
  { id: 31, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 8, title: "Travel to Palermo by plane", description: "Fly to Palermo.", link: "/travel" },
  { id: 32, messageType: "MafiaProfile", messageSubType: "Travel", isCitySpecific: true, cityId: 9, title: "Travel to Messina by plane", description: "Charter a flight to Messina.", link: "/travel" },
  // Race missions
  { id: 33, messageType: "RaceLobby", messageSubType: "JoinRace", isCitySpecific: true, cityId: 0, title: "Win a race in Chicago", description: "Prove your driving skills on Chicago's streets.", link: "/racing" },
  { id: 34, messageType: "RaceLobby", messageSubType: "JoinRace", isCitySpecific: true, cityId: 4, title: "Win a race in Las Vegas", description: "Dominate the Vegas Strip.", link: "/racing" },
  { id: 35, messageType: "RaceLobby", messageSubType: "JoinRace", isCitySpecific: true, cityId: 1, title: "Win a race in Detroit", description: "Show Detroit what you're made of.", link: "/racing" },
  { id: 36, messageType: "RaceLobby", messageSubType: "JoinRace", isCitySpecific: true, cityId: 3, title: "Win a race in Miami", description: "Burn rubber on Miami's Ocean Drive.", link: "/racing" },
  { id: 37, messageType: "RaceLobby", messageSubType: "JoinRace", isCitySpecific: true, cityId: 2, title: "Win a race in New York", description: "Navigate the concrete jungle.", link: "/racing" },
  { id: 44, messageType: "RaceLobby", messageSubType: "JoinRace", isCitySpecific: false, title: "Lose a race", description: "Sometimes you need to throw a race.", link: "/racing" },
  { id: 45, messageType: "RaceLobby", messageSubType: "JoinRace", isCitySpecific: false, title: "Join a race", description: "Enter the street racing scene.", link: "/racing" },
  // Casino missions
  { id: 46, messageType: "Jackpot", messageSubType: "Winner", title: "Win a Jackpot round", description: "Strike it rich at the Jackpot.", link: "/biz-jackpot" },
  { id: 47, messageType: "Roulette", messageSubType: "Winner", title: "Win 10x on roulette", description: "Make a bold bet on the roulette wheel.", link: "/biz-roulette" },
  { id: 48, messageType: "SlotMachine", messageSubType: "Winner", title: "Win 10x on slot machine", description: "Hit the jackpot on the slots.", link: "/biz-slotmachine" },
  { id: 49, messageType: "Roulette", messageSubType: "Winner", title: "Win 5x on roulette", description: "Place your chips and spin to win.", link: "/biz-roulette" },
  { id: 50, messageType: "SlotMachine", messageSubType: "Winner", title: "Win 5x on slot machine", description: "Pull the lever and multiply your bet.", link: "/biz-slotmachine" },
  // Shop missions
  { id: 51, messageType: "Shop", messageSubType: "Buy", title: "Buy from the shop", description: "Visit the black market shop and purchase equipment.", link: "/biz-shop" },
  { id: 52, messageType: "Shop", messageSubType: "Buy", title: "Buy a grenade", description: "Stock up on explosives.", link: "/biz-shop" },
  { id: 53, messageType: "Shop", messageSubType: "Buy", title: "Buy a Remington", description: "Acquire a Remington shotgun.", link: "/biz-shop" },
  { id: 54, messageType: "Shop", messageSubType: "Buy", title: "Buy a gun", description: "Purchase a firearm from the shop.", link: "/biz-shop" },
  { id: 55, messageType: "Shop", messageSubType: "Buy", title: "Buy a motorcycle", description: "Get yourself a fast bike.", link: "/biz-shop" },
  { id: 56, messageType: "Shop", messageSubType: "Buy", title: "Buy a Molotov cocktail", description: "Pick up some Molotov cocktails.", link: "/biz-shop" },
  { id: 57, messageType: "Shop", messageSubType: "Buy", title: "Buy a bulletproof vest", description: "Invest in protection.", link: "/biz-shop" },
  { id: 58, messageType: "Shop", messageSubType: "Buy", title: "Hire a bodyguard", description: "Recruit a trained bodyguard.", link: "/biz-shop" },
  // Exchange missions
  { id: 59, messageType: "Exchange", messageSubType: "CompleteOTC", title: "Complete an OTC deal", description: "Finalize an over-the-counter transaction.", link: "/exchange-convert" },
  { id: 60, messageType: "Exchange", messageSubType: "ConvertTile", title: "Convert a tile", description: "Transform your property tiles through the exchange.", link: "/exchange-convert" },
  // Marketplace
  { id: 61, messageType: "Marketplace", messageSubType: "List", title: "List on marketplace", description: "Put an item up for sale.", link: "/market" },
  { id: 62, messageType: "Marketplace", messageSubType: "Buy", title: "Buy from marketplace", description: "Purchase an item from the underground marketplace.", link: "/market" },
  // Training
  { id: 63, messageType: "BodyguardTraining", messageSubType: "Train", title: "Train a bodyguard", description: "Improve your bodyguard's combat skills.", link: "/bodyguard-training" },
  { id: 64, messageType: "Inventory", messageSubType: "RepairCar", title: "Repair a car", description: "Fix up a damaged vehicle.", link: "/garage" },
  { id: 65, messageType: "GameBank", messageSubType: "Transfer", title: "Make a bank transfer", description: "Move money through the banking system.", link: "/biz-bank" },
  // Hospital & Bullet Factory
  { id: 66, messageType: "Hospital", messageSubType: "Buy", title: "Buy blood under 3000", description: "Purchase blood bags from the hospital.", link: "/biz-hospital" },
  { id: 67, messageType: "Hospital", messageSubType: "Buy", title: "Buy blood under 2000", description: "Get a good deal on blood bags.", link: "/biz-hospital" },
  { id: 68, messageType: "Hospital", messageSubType: "Buy", title: "Buy blood under 1500", description: "Score an excellent price on blood bags.", link: "/biz-hospital" },
  { id: 69, messageType: "BulletFactory", messageSubType: "Buy", title: "Buy bullets under 600", description: "Purchase ammunition.", link: "/biz-bulletfactory" },
  { id: 70, messageType: "BulletFactory", messageSubType: "Buy", title: "Buy bullets under 400", description: "Get a solid deal on bullets.", link: "/biz-bulletfactory" },
  { id: 71, messageType: "BulletFactory", messageSubType: "Buy", title: "Buy bullets under 300", description: "Score an excellent bulk deal.", link: "/biz-bulletfactory" },
  // Misc
  { id: 72, messageType: "Equipment", messageSubType: "Update", title: "Update your equipment", description: "Refresh your loadout.", link: "/equipment" },
  { id: 73, messageType: "PerkManager", messageSubType: "Activate", title: "Activate a perk", description: "Unlock special abilities.", link: "/open-perkbox" },
  { id: 74, messageType: "Inventory", messageSubType: "OpenCrate", title: "Open a crate", description: "Crack open a loot crate.", link: "/open-crate" },
  { id: 75, messageType: "HelperBot", messageSubType: "StartBot", title: "Start helper bot (100 credits)", description: "Deploy an automated helper bot.", link: "/helperbots" },
  { id: 76, messageType: "HelperBot", messageSubType: "StartBot", title: "Start helper bot (300 credits)", description: "Launch a premium helper bot.", link: "/helperbots" },
  { id: 77, messageType: "HelperBot", messageSubType: "StartBot", title: "Start helper bot (500 credits)", description: "Activate an elite helper bot.", link: "/helperbots" },
  { id: 78, messageType: "Map", messageSubType: "UpgradeSlot", title: "Upgrade a building", description: "Invest in your territory.", link: "/city-map" },
  { id: 79, messageType: "Map", messageSubType: "ClaimSlot", title: "Claim a map tile", description: "Expand your empire.", link: "/city-map" },
  { id: 80, messageType: "Deposit", messageSubType: "BuyCash", title: "Buy cash (50,000 min)", description: "Purchase in-game cash.", link: "/cash" },
  { id: 81, messageType: "Deposit", messageSubType: "BuyCash", title: "Buy cash (150,000 min)", description: "Make a substantial purchase.", link: "/cash" },
  { id: 82, messageType: "Deposit", messageSubType: "BuyCash", title: "Buy cash (250,000 min)", description: "Go big with a cash purchase.", link: "/cash" },
  { id: 83, messageType: "Deposit", messageSubType: "AddLiquidity", title: "Sell cash (100,000 min)", description: "List cash for sale.", link: "/cash" },
  { id: 84, messageType: "PerkMinter", messageSubType: "BuyPerk", title: "Buy a perk box", description: "Purchase a mystery perk box.", link: "/buy-perk-boxes" },
  { id: 85, messageType: "OGCrateMinter", messageSubType: "BuyKey", title: "Buy a key", description: "Acquire a key to unlock exclusive crates.", link: "/buy-keys" },
  { id: 86, messageType: "GICredit", messageSubType: "BuyCredit", title: "Buy 5 GI credits", description: "Purchase GI credits.", link: "/buy-gi-credits" },
];

// Build lookup map by mission ID
const commonMissionById = new Map<number, MissionMetadata>();
WEEKLY_COMMON_MISSION_TYPE.forEach((m) => commonMissionById.set(m.id, m));

/**
 * Get mission metadata by missionId for common missions
 */
export function getCommonMissionMetadata(missionId: number): MissionMetadata | undefined {
  return commonMissionById.get(missionId);
}

// Item name lookups for smuggle missions
const NARCS_ITEMS = ["Glue", "Marijuana", "Amphetamine", "Cocaine", "Morphine", "Opium", "Heroin"];
const BOOZE_ITEMS = ["Beer", "Wine", "Port", "Vodka", "Whiskey", "Cognac", "Tequila"];

/**
 * Get smuggle mission display info
 * Title format: `<messageSubType> <itemName> at <cityName> <priceRule>`
 */
export function getSmuggleMissionInfo(
  messageType: string,
  messageSubType: string,
  typeId: number,
  cityId: number,
  playerCityId?: number
): { title: string; description: string; link: string } {
  const cityName = City[cityId] || `City #${cityId}`;
  const isNarcs = messageType === "Narcs";
  
  // Get item name based on type
  const itemName = isNarcs 
    ? (NARCS_ITEMS[typeId] || `Narcs #${typeId}`)
    : (BOOZE_ITEMS[typeId] || `Booze #${typeId}`);
  
  // Get price rule based on action and type
  const priceThreshold = isNarcs ? "10,000" : "3,000";
  const priceRule = messageSubType === "Sell" 
    ? `over ${priceThreshold}` 
    : `under ${priceThreshold}`;
  
  // Build title: `<messageSubType> <itemName> at <cityName> <priceRule>`
  const title = `${messageSubType} ${itemName} at ${cityName} ${priceRule}`;
  
  // Get description based on messageType and messageSubType
  let description: string;
  if (isNarcs) {
    if (messageSubType === "Sell") {
      description = "Offload your narcotics stash at this location for maximum profit. Complete the sale to mark this mission as finished.";
    } else {
      description = "Stock up on narcotics at this city to expand your smuggling operation. Purchase min. 1 unit to complete this mission.";
    }
  } else {
    if (messageSubType === "Sell") {
      description = "Move your booze inventory at this location for a good payout. Sell the specified amount to finish this mission.";
    } else {
      description = "Acquire booze at this city to fill your smuggling inventory. Buy the required quantity to mark this mission complete.";
    }
  }
  
  // Link navigates to narcs or booze page with player's current city
  const basePath = isNarcs ? "/biz-narcs" : "/biz-booze";
  const citySlug = playerCityId !== undefined ? City[playerCityId]?.toLowerCase() : undefined;
  const link = citySlug ? `${basePath}/${citySlug}` : basePath;

  return { title, description, link };
}

/**
 * Get city name safely
 */
export function getCityName(cityId: number): string {
  const cityIdNum = Number(cityId);
  if (!Number.isFinite(cityIdNum)) return "Unknown City";
  return City[cityIdNum] || `City #${cityIdNum}`;
}

// ========== Constants ==========
export const WEEKLY_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const DAILY_REDUCTION_RATE = 0.18; // 18% per day

/**
 * Calculate current reward based on decay
 */
export function calculateCurrentReward(maxReward: number, startedAt: number): number {
  if (startedAt === 0) return maxReward;
  const currentTime = Math.floor(Date.now() / 1000);
  const elapsedSeconds = Math.max(0, currentTime - startedAt);
  const elapsedDays = elapsedSeconds / 86400;
  const decayedReward = maxReward * (1 - DAILY_REDUCTION_RATE * elapsedDays);
  return Math.max(0, Math.round(decayedReward));
}

/**
 * Calculate remaining time in seconds
 */
export function calculateRemainingTime(startedAt: number): number {
  if (startedAt === 0) return 0;
  const currentTime = Math.floor(Date.now() / 1000);
  const endTime = startedAt + WEEKLY_DURATION_SECONDS;
  return Math.max(0, endTime - currentTime);
}

/**
 * Format time remaining as string
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Expired";
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
