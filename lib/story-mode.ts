// Story Mode ABI and types

export const STORY_MODE_ABI = [
  { inputs: [], name: "NoMysteryBoxFound", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint8", name: "version", type: "uint8" },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "itemId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "mysteryBoxIndex", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "claimedAt", type: "uint256" },
    ],
    name: "MysteryBoxClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "startedAt", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "completedAt", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "bonusReward", type: "uint256" },
    ],
    name: "StoryModeCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "stage", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "startedAt", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "completedAt", type: "uint256" },
    ],
    name: "StoryModeStageCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "startedAt", type: "uint256" },
    ],
    name: "StoryModeStarted",
    type: "event",
  },
  {
    inputs: [],
    name: "bonusReward",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "bonusTimeFrame",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "itemId", type: "uint256" }],
    name: "claimMysteryBox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "index", type: "uint256" }],
    name: "getMissionGroup",
    outputs: [
      {
        components: [
          {
            components: [
              { internalType: "uint32", name: "id", type: "uint32" },
              { internalType: "string", name: "messageType", type: "string" },
              { internalType: "string", name: "messageSubType", type: "string" },
              { internalType: "uint8", name: "cityId", type: "uint8" },
              { internalType: "bool", name: "isCitySpecific", type: "bool" },
              { internalType: "bool", name: "shouldSuccess", type: "bool" },
              { internalType: "bool", name: "shouldFail", type: "bool" },
              { internalType: "bool", name: "extraDataNeeded", type: "bool" },
              { internalType: "bytes", name: "extraData", type: "bytes" },
            ],
            internalType: "struct MafiaStoryMode.Mission[]",
            name: "missions",
            type: "tuple[]",
          },
          {
            components: [
              { internalType: "string", name: "rewardType", type: "string" },
              { internalType: "address", name: "assetAddress", type: "address" },
              { internalType: "bytes", name: "extraData", type: "bytes" },
            ],
            internalType: "struct MafiaStoryMode.MissionReward[]",
            name: "rewards",
            type: "tuple[]",
          },
        ],
        internalType: "struct MafiaStoryMode.MissionGroup",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMissionGroupList",
    outputs: [
      {
        components: [
          {
            components: [
              { internalType: "uint32", name: "id", type: "uint32" },
              { internalType: "string", name: "messageType", type: "string" },
              { internalType: "string", name: "messageSubType", type: "string" },
              { internalType: "uint8", name: "cityId", type: "uint8" },
              { internalType: "bool", name: "isCitySpecific", type: "bool" },
              { internalType: "bool", name: "shouldSuccess", type: "bool" },
              { internalType: "bool", name: "shouldFail", type: "bool" },
              { internalType: "bool", name: "extraDataNeeded", type: "bool" },
              { internalType: "bytes", name: "extraData", type: "bytes" },
            ],
            internalType: "struct MafiaStoryMode.Mission[]",
            name: "missions",
            type: "tuple[]",
          },
          {
            components: [
              { internalType: "string", name: "rewardType", type: "string" },
              { internalType: "address", name: "assetAddress", type: "address" },
              { internalType: "bytes", name: "extraData", type: "bytes" },
            ],
            internalType: "struct MafiaStoryMode.MissionReward[]",
            name: "rewards",
            type: "tuple[]",
          },
        ],
        internalType: "struct MafiaStoryMode.MissionGroup[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserMissionStatus",
    outputs: [
      {
        components: [
          { internalType: "uint8", name: "currentStage", type: "uint8" },
          { internalType: "bool[]", name: "isMissionCompleted", type: "bool[]" },
          { internalType: "bool", name: "isStarted", type: "bool" },
          { internalType: "uint256", name: "startedAt", type: "uint256" },
          { internalType: "uint256[]", name: "completedAt", type: "uint256[]" },
        ],
        internalType: "struct MafiaStoryMode.UserMissionStatus",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Types
export interface Mission {
  id: number;
  messageType: string;
  messageSubType: string;
  cityId: number;
  isCitySpecific: boolean;
  shouldSuccess: boolean;
  shouldFail: boolean;
  extraDataNeeded: boolean;
  extraData: string;
}

export interface MissionReward {
  rewardType: string;
  assetAddress: string;
  extraData: string;
}

export interface MissionGroup {
  missions: Mission[];
  rewards: MissionReward[];
}

export interface UserMissionStatus {
  currentStage: number;
  isMissionCompleted: boolean[];
  isStarted: boolean;
  startedAt: bigint;
  completedAt: bigint[];
}

// Chapter metadata for UI
export interface ChapterTask {
  label: string;
  route: string;
}

export interface ChapterReward {
  type: string;
  amount?: string;
  icon?: string;
}

export interface ChapterMetadata {
  title: string;
  tasks: ChapterTask[];
  rewards: ChapterReward[];
}

export const CHAPTER_METADATA: ChapterMetadata[] = [
  {
    title: "Getting Started",
    tasks: [
      { label: "Create your profile", route: "/" },
      { label: "Rob a hotdog stand", route: "/" },
      { label: "Attempt kill skill training", route: "/killskill" },
      { label: "Get caught by police", route: "/" },
      { label: "Travel to another city", route: "/travel" },
    ],
    rewards: [
      { type: "Cash", amount: "25,000" },
      { type: "Hand Gun" },
    ],
  },
  {
    title: "Becoming Familiar",
    tasks: [
      { label: "Buy an item from the shop", route: "/biz-shop" },
      { label: "Make a bank transfer", route: "/biz-bank" },
      { label: "Bust someone out of jail", route: "/jail" },
      { label: "Steal a car on the street corner", route: "/nickcar" },
      { label: "Update your equipment", route: "/equipment" },
    ],
    rewards: [
      { type: "Cash", amount: "50,000" },
      { type: "Helper Credits", amount: "250" },
    ],
  },
  {
    title: "Stepping It Up",
    tasks: [
      { label: "Buy health", route: "/biz-hospital" },
      { label: "Rob a freight train", route: "/" },
      { label: "Start a helper bot for 250 credits", route: "/helperbots" },
      { label: "Buy bullets", route: "/biz-bulletfactory" },
      { label: "Promote to Apprentice", route: "/rank-activation" },
    ],
    rewards: [
      { type: "Perk Box", amount: "1" },
      { type: "Health", amount: "175" },
    ],
  },
  {
    title: "Becoming Someone",
    tasks: [
      { label: "Steal a car on the street corner", route: "/nickcar" },
      { label: "Open a perk box", route: "/open-perkbox" },
      { label: "Rob the bank", route: "/" },
      { label: "Successfully train kill skill", route: "/killskill" },
      { label: "Join a race", route: "/" },
    ],
    rewards: [
      { type: "Key", amount: "1" },
      { type: "Helper Credits", amount: "500" },
    ],
  },
  {
    title: "Diving In Deep",
    tasks: [
      { label: "Buy an item on the marketplace", route: "/" },
      { label: "Start helperbot min. 500 credits", route: "/helperbots" },
      { label: "Open a crate", route: "/open-crate" },
      { label: "Bribe the police", route: "/" },
      { label: "Promote to Pickpocket", route: "/rank-activation" },
    ],
    rewards: [
      { type: "Key", amount: "1" },
      { type: "GI Credits", amount: "10" },
    ],
  },
  {
    title: "Settling In",
    tasks: [
      { label: "Steal a car on the street corner", route: "/nickcar" },
      { label: "Request game intelligence - Bullets", route: "/buy-gi-credits" },
      { label: "Open a map tile", route: "/city-map" },
      { label: "Buy a motorcycle", route: "/biz-shop" },
      { label: "Promote to Cloak", route: "/rank-activation" },
    ],
    rewards: [
      { type: "Cash", amount: "500,000" },
      { type: "Unlimited", amount: "1 Month" },
    ],
  },
  {
    title: "Made Man",
    tasks: [
      { label: "Successfully buy Booze", route: "/biz-booze" },
      { label: "Rob the bank", route: "/" },
      { label: "Activate Player Unlimited", route: "/buy-premium" },
      { label: "Successfully sell Booze", route: "/biz-booze" },
      { label: "Join a family", route: "/families" },
    ],
    rewards: [{ type: "Mystery Box", amount: "1" }],
  },
];

// City names
export const CITY_NAMES: Record<number, string> = {
  0: "Detroit",
  1: "Chicago",
  2: "New York",
  3: "Las Vegas",
  4: "Palermo",
};

export function getCityName(cityId: number): string {
  return CITY_NAMES[cityId] || "Unknown City";
}

// Get outcome requirement text
export function getOutcomeRequirement(mission: Mission): string {
  if (mission.shouldSuccess) return "Must Succeed";
  if (mission.shouldFail) return "Must Fail";
  return "Any Outcome";
}

// Calculate progress percentage
export function calculateProgress(
  userStatus: UserMissionStatus,
  totalStages: number
): number {
  if (totalStages === 0) return 0;

  const completedStages = userStatus.completedAt.filter(
    (t) => Number(t) > 0
  ).length;
  const currentStage = Number(userStatus.currentStage);

  // If all stages completed
  if (currentStage >= totalStages) {
    return 100;
  }

  // Current stage mission progress
  const totalMissionsInCurrentStage = userStatus.isMissionCompleted.length;
  const completedMissionsInCurrentStage =
    userStatus.isMissionCompleted.filter(Boolean).length;
  const currentStageMissionProgress =
    totalMissionsInCurrentStage > 0
      ? completedMissionsInCurrentStage / totalMissionsInCurrentStage
      : 0;

  const progress =
    ((completedStages + currentStageMissionProgress) / totalStages) * 100;
  return Math.min(100, Math.max(0, progress));
}

// Check if current stage is claimable
export function isStageClaimable(
  userStatus: UserMissionStatus,
  stageIndex: number,
  totalStages: number
): boolean {
  const currentStage = Number(userStatus.currentStage);

  // Can only claim current stage
  if (stageIndex !== currentStage) return false;

  // Already claimed or past
  if (stageIndex >= totalStages) return false;

  // Check all missions completed for current stage
  return (
    userStatus.isMissionCompleted.length > 0 &&
    userStatus.isMissionCompleted.every(Boolean)
  );
}

// Get stage state
export type StageState = "locked" | "in-progress" | "claimable" | "completed";

export function getStageState(
  userStatus: UserMissionStatus,
  stageIndex: number,
  totalStages: number
): StageState {
  const currentStage = Number(userStatus.currentStage);

  // Past stage - check completedAt
  if (stageIndex < currentStage) {
    return "completed";
  }

  // Future stage
  if (stageIndex > currentStage) {
    return "locked";
  }

  // Current stage - check if all missions complete
  if (stageIndex === currentStage) {
    const allComplete =
      userStatus.isMissionCompleted.length > 0 &&
      userStatus.isMissionCompleted.every(Boolean);
    return allComplete ? "claimable" : "in-progress";
  }

  return "locked";
}

// Validate itemId for mystery box claim
export function isValidItemId(itemId: unknown): itemId is number {
  if (itemId === null || itemId === undefined) return false;
  const num = Number(itemId);
  return Number.isFinite(num) && Number.isInteger(num) && num >= 0;
}

// Format timestamp
export function formatTimestamp(timestamp: bigint | number): string {
  const ts = Number(timestamp);
  if (ts === 0) return "N/A";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
