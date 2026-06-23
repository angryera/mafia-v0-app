// Kill battle outcome — types, narratives, and mock payload builders.

export type KillOutcomeType =
  | "single_kill"
  | "double_kill"
  | "no_kill"
  | "backfire_kill";

export interface KillBattlePlayer {
  name: string;
  address: `0x${string}`;
}

export interface KillWeapon {
  name: string;
  typeId: number;
  imageUrl: string;
}

export interface KillLootEntry {
  id: string;
  label: string;
  value: string;
  note?: string;
}

export interface KillBattlePayload {
  outcomeType: KillOutcomeType;
  seed: number;
  cityName: string;
  attacker: KillBattlePlayer;
  victim: KillBattlePlayer;
  bulletsFired: number;
  backfireBullets: number;
  weapon: KillWeapon;
  attackerHealthLost: number;
  victimHealthLost: number;
  storyIndex: number;
  rankXp: number;
  killXp: number;
  loot: KillLootEntry[];
  claimed: boolean;
  txHash?: string;
}

export const MOCK_WEAPON: KillWeapon = {
  name: "Remington",
  typeId: 1,
  imageUrl:
    "https://mafia.sfo3.cdn.digitaloceanspaces.com/new-images/shop-item-remington.png",
};

export const KILL_OUTCOME_STORIES: Record<KillOutcomeType, string[]> = {
  single_kill: [
    "The crew waited until the street went quiet. One burst from the Remington and the target dropped before anyone could raise an alarm.",
    "A black sedan idled at the corner while the shooter stepped from the shadows. The hit was surgical — no witnesses, no mercy.",
    "Word had spread that the victim owed the wrong family. Tonight the debt was collected in lead, and the city slept a little lighter.",
    "The attacker fired from the fire escape as the victim lit a cigarette below. Three shots echoed off the brick; only one man walked away.",
    "Inside the warehouse the deal turned sour. The Remington spoke last, and the syndicate chalked up another clean elimination.",
  ],
  double_kill: [
    "Both men drew at the same instant. Lead crossed in the alley and when the smoke cleared, neither was left standing.",
    "The victim's bodyguards were gone but the backfire rig was not. Attacker and target traded everything they had until the room fell silent.",
    "What was meant to be an ambush became a mutual execution. The family would bury two soldiers and call it a tragedy of pride.",
    "The shooter kicked in the door expecting an easy mark. The victim's hidden piece answered, and the feud ended with two graves.",
    "At the docks the exchange went wrong in seconds. Bullets flew both ways until the only sound left was the harbor fog rolling in.",
  ],
  no_kill: [
    "The attacker emptied the magazine but the target dove behind a steel desk. When the clip ran dry, both men were still breathing — barely.",
    "The hit was rushed and the aim was off. The victim staggered into the crowd bleeding, while the shooter melted back into the night empty-handed.",
    "Backfire tore through the attacker's coat as the victim sprinted for the service stairs. The contract would have to wait for another night.",
    "A jammed round and a lucky roll saved the target's life. The family sent word that the hunter had failed, and the streets would remember.",
    "The Remington barked in the parking garage but the victim had already started the engine. Glass shattered, tires screamed, and the hit was over.",
  ],
  backfire_kill: [
    "The attacker squeezed the trigger twice before the victim's automated backfire answered. By the time the echo faded, the hunter was down.",
    "Confidence killed faster than any bullet. The target never moved — the rig did the work, and the would-be assassin paid in blood.",
    "A textbook approach, a textbook mistake. The backfire rig caught the shooter across the chest and the streets claimed another amateur.",
    "The victim had wired the room for treachery. When the door opened, return fire was waiting, and the attacker's crew lost their man.",
    "The first shot missed. The second never came. Backfire cut the engagement short and the family sent flowers to the wrong funeral.",
  ],
};

export const OUTCOME_META: Record<
  KillOutcomeType,
  {
    statusLabel: string;
    headline: string;
    badgeColor: string;
  }
> = {
  single_kill: {
    statusLabel: "Successful attack",
    headline: "The hit was clean.",
    badgeColor: "#8fd48f",
  },
  double_kill: {
    statusLabel: "Double kill — both eliminated",
    headline: "Nobody walked away.",
    badgeColor: "#f5d76e",
  },
  no_kill: {
    statusLabel: "Victim survived",
    headline: "The target got away.",
    badgeColor: "#aaaaaa",
  },
  backfire_kill: {
    statusLabel: "Backfire kill — attacker eliminated",
    headline: "The hunter became the hunted.",
    badgeColor: "#ff8a8a",
  },
};

export const PREVIEW_OUTCOME_TYPES: KillOutcomeType[] = [
  "single_kill",
  "double_kill",
  "no_kill",
  "backfire_kill",
];

export function isPreviewOutcomeType(value: string): value is KillOutcomeType {
  return PREVIEW_OUTCOME_TYPES.includes(value as KillOutcomeType);
}

function hashSeed(parts: string[]): number {
  let h = 2166136261;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      h ^= part.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

function pickOutcomeType(seed: number): KillOutcomeType {
  const types: KillOutcomeType[] = [
    "single_kill",
    "no_kill",
    "double_kill",
    "backfire_kill",
  ];
  return types[seed % types.length];
}

function mockLootForSingleKill(): KillLootEntry[] {
  return [
    { id: "cash", label: "Liquid cash", value: "$245,000" },
    { id: "map", label: "Map slots", value: "2" },
    { id: "biz", label: "Businesses", value: "3" },
    { id: "bg", label: "Bodyguards", value: "1" },
    { id: "gi", label: "GI Credits", value: "1,200" },
    { id: "perk", label: "Perk boxes", value: "3" },
    { id: "keys", label: "Keys", value: "5" },
    { id: "mafia", label: "MAFIA tokens", value: "4,500" },
    { id: "mystery", label: "Mystery boxes", value: "2" },
    {
      id: "helper",
      label: "Helper credits",
      value: "150",
      note: "50% obtained, 50% burned",
    },
    { id: "lottery", label: "Lottery hall entries", value: "8" },
    { id: "jackpot", label: "Jackpot entries", value: "4" },
    { id: "market", label: "Marketplace listings", value: "2" },
  ];
}

function computeStats(
  outcomeType: KillOutcomeType,
  bulletsFired: number,
  seed: number,
): {
  backfireBullets: number;
  attackerHealthLost: number;
  victimHealthLost: number;
  rankXp: number;
  killXp: number;
  loot: KillLootEntry[];
} {
  const backfireBase = Math.floor(bulletsFired * 0.35) + (seed % 5000);

  switch (outcomeType) {
    case "single_kill":
      return {
        backfireBullets: 0,
        attackerHealthLost: 0,
        victimHealthLost: 100,
        rankXp: 420 + (seed % 80),
        killXp: 250 + (seed % 60),
        loot: mockLootForSingleKill(),
      };
    case "double_kill":
      return {
        backfireBullets: backfireBase,
        attackerHealthLost: 100,
        victimHealthLost: 100,
        rankXp: 60 + (seed % 30),
        killXp: 0,
        loot: [],
      };
    case "backfire_kill":
      return {
        backfireBullets: backfireBase + 8000,
        attackerHealthLost: 100,
        victimHealthLost: 15 + (seed % 25),
        rankXp: 40 + (seed % 25),
        killXp: 0,
        loot: [],
      };
    case "no_kill":
    default:
      return {
        backfireBullets: Math.floor(bulletsFired * 0.2) + (seed % 3000),
        attackerHealthLost: 8 + (seed % 35),
        victimHealthLost: 22 + (seed % 55),
        rankXp: 0,
        killXp: 0,
        loot: [],
      };
  }
}

export function buildKillBattlePayload(params: {
  outcomeType?: KillOutcomeType;
  attacker: KillBattlePlayer;
  victim: KillBattlePlayer;
  bulletsFired: number;
  cityName: string;
  seed?: number;
  txHash?: string;
}): KillBattlePayload {
  const seed =
    params.seed ??
    hashSeed([
      params.attacker.address,
      params.victim.address,
      String(params.bulletsFired),
      String(Date.now()),
    ]);

  const outcomeType = params.outcomeType ?? pickOutcomeType(seed);
  const stats = computeStats(outcomeType, params.bulletsFired, seed);
  const stories = KILL_OUTCOME_STORIES[outcomeType];
  const storyIndex = seed % stories.length;

  return {
    outcomeType,
    seed,
    cityName: params.cityName,
    attacker: params.attacker,
    victim: params.victim,
    bulletsFired: params.bulletsFired,
    backfireBullets: stats.backfireBullets,
    weapon: MOCK_WEAPON,
    attackerHealthLost: stats.attackerHealthLost,
    victimHealthLost: stats.victimHealthLost,
    storyIndex,
    rankXp: stats.rankXp,
    killXp: stats.killXp,
    loot: stats.loot,
    claimed: false,
    txHash: params.txHash,
  };
}

export function buildPreviewKillBattle(
  outcomeType: KillOutcomeType,
): KillBattlePayload {
  return buildKillBattlePayload({
    outcomeType,
    attacker: {
      name: "TonySoprano",
      address: "0x1111111111111111111111111111111111111111",
    },
    victim: {
      name: "PaulieWalnuts",
      address: "0x2222222222222222222222222222222222222222",
    },
    bulletsFired: 48_500,
    cityName: "Chicago",
    seed: hashSeed([outcomeType, "preview"]),
  });
}

export function isAttackerDead(outcome: KillBattlePayload): boolean {
  return (
    outcome.outcomeType === "double_kill" ||
    outcome.outcomeType === "backfire_kill"
  );
}

export function isVictimDead(outcome: KillBattlePayload): boolean {
  return (
    outcome.outcomeType === "single_kill" ||
    outcome.outcomeType === "double_kill"
  );
}

export function canClaimRewards(outcome: KillBattlePayload): boolean {
  return (
    outcome.outcomeType === "single_kill" &&
    !outcome.claimed &&
    !isAttackerDead(outcome)
  );
}

export function getStoryText(outcome: KillBattlePayload): string {
  const stories = KILL_OUTCOME_STORIES[outcome.outcomeType];
  return stories[outcome.storyIndex % stories.length];
}
