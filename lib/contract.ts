import { type Abi, formatEther, getAddress } from "viem";

/**
 * Contract registry + UI metadata.
 *
 * Organization notes:
 * - Keep **addresses + ABIs + UI metadata** close together per feature.
 * - Prefer `getAddress()` for checksum normalization.
 * - This file is intentionally a single module (no extra files).
 *
 * Sections:
 * - Chain configuration + shared helpers
 * - Core gameplay (Crime / Travel / NickCar / KillSkill / Jail)
 * - Helper Bot
 * - Tokens / price feeds
 * - Shops / inventory / perks
 * - Minigames (Roulette / Slot)
 * - Subscriptions
 * - Organized Crime
 * - Markets (Smuggle / XP / Inventory marketplace)
 * - Exchange / deposit
 * - Misc (Safehouse / Detective agency / Rank stake / Equipment / Bodyguard training / Race)
 */

// ========== Chain Configuration ==========
export type ChainId = "bnb" | "pulsechain";

export type ChainConfig = {
  id: ChainId;
  label: string;
  wagmiChainId: number;
  rpc: string;
  explorer: string;
  signDomain: string;
  addresses: {
    crime: `0x${string}`;
    ingameCurrency: `0x${string}`;
    travel: `0x${string}`;
    nickcar: `0x${string}`;
    killskill: `0x${string}`;
    jail: `0x${string}`;
    helperbot: `0x${string}`;
    wbnb: `0x${string}`;
    chainlinkPriceFeed: `0x${string}`;
    buyCredit: `0x${string}`;
    buyPerkbox: `0x${string}`;
    buyKeys: `0x${string}`;
    userProfile: `0x${string}`;
    cash: `0x${string}`;
    bullets: `0x${string}`;
    health: `0x${string}`;
    giCredits: `0x${string}`;
    power: `0x${string}`;
    hospital: `0x${string}`;
    bulletFactory: `0x${string}`;
    shop: `0x${string}`;
    rankXp: `0x${string}`;
    swapRouter: `0x${string}`;
    inventory: `0x${string}`;
    perkOpener: `0x${string}`;
    roulette: `0x${string}`;
    slotMachine: `0x${string}`;
    playerSubscription: `0x${string}`;
    raceXp: `0x${string}`;
    carCrusher: `0x${string}`;
    jackpot: `0x${string}`;
    safehouse: `0x${string}`;
    detectiveAgency: `0x${string}`;
    rankStake: `0x${string}`;
    bodyguardTraining: `0x${string}`;
    equipment: `0x${string}`;
    mafia: `0x${string}`;
    /** ERC1155 OG Crate (keys); balanceOf(account, 0), setApprovalForAll for map. */
    ogCrate: `0x${string}`;
    map: `0x${string}`;
    /** MafiaFamily — `getPlayerInfo(player)` for familyId / level / isDead. */
    mafiaFamily: `0x${string}`;
    ocLobby: `0x${string}`;
    ocJoin: `0x${string}`;
    ocExecution: `0x${string}`;
    smuggleMarket: `0x${string}`;
    storyMode: `0x${string}`;
    weeklyMission: `0x${string}`;
    xpMarket: `0x${string}`;
    inventoryMarketplace: `0x${string}`;
    raceLobby: `0x${string}`;
  };
};

export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  bnb: {
    id: "bnb",
    label: "BNB Chain",
    wagmiChainId: 56,
    rpc: "https://bsc-dataseed1.binance.org",
    explorer: "https://bscscan.com",
    signDomain: "bnb.playmafia.io",
    addresses: {
      crime: getAddress("0x167ad284C7bcc4d6342991Aa258422E7a04f926E"),
      ingameCurrency: getAddress("0x376554F7BbcdeB348fa4b8371135b87eC6b29c38"),
      travel: getAddress("0xa08D627E071cB4b53C6D0611d77dbCB659902AA4"),
      nickcar: getAddress("0x60B8e0dd9566b42F9CAa5538350aA0D29988373c"),
      killskill: getAddress("0xa5dc2Cb4dC13f12d8464eaA862fAC00F19ADc84d"),
      jail: getAddress("0x7371580cd13dE739C734AE85062F75194d13Fac2"),
      helperbot: getAddress("0xE2E4506c23C26eea2526d0e4dBb8dbF9cDa9d105"),
      wbnb: getAddress("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"),
      chainlinkPriceFeed: getAddress("0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"),
      buyCredit: getAddress("0x192F029CC7e0BB80dB201191E0040e8F801df34d"),
      buyPerkbox: getAddress("0x55849c0F5A567A49d219B00642A4648389ada6f6"),
      buyKeys: getAddress("0x1F4Eb51E87C4e2368316dba8e478Cd561FEb8B77"),
      userProfile: getAddress("0xa08D627E071cB4b53C6D0611d77dbCB659902AA4"),
      cash: getAddress("0x0f98e19bb15e41c139b41244430047e7cd95ce46"),
      bullets: getAddress("0xa42AE5D3E84bff9cD2C734A072232D9629f2ED16"),
      health: getAddress("0xC63668378B83f3E58A9AAAe6E12Da3282F150225"),
      giCredits: getAddress("0x21b6833B76A4AD783fe681c04Fc9F3a3a0A5b0B7"),
      power: getAddress("0xa2AA522B4CCBc95Dec0aFCa2B0c645f9C126cD24"),
      hospital: getAddress("0xB4c9ef457e17992f9271B447de3507016fd0E0d7"),
      bulletFactory: getAddress("0xAbfdA460fFEa2697A4d0b17e955bc17e87b6d45E"),
      shop: getAddress("0xd922255cCeb4f97e2830038E4e7EF54Cb62B6733"),
      rankXp: getAddress("0x48F2C9C0ea337854492aF5bEbEa74e8917712B71"),
      swapRouter: getAddress("0xe7cb02aDa01A2100C83De3ab73d93ed18fbd9636"),
      inventory: getAddress("0x2CB8352Be090846d4878Faa92825188D7bf50654"),
      perkOpener: getAddress("0x26563e46A96a07e66BC01Ad6b1b41B42a33364F8"),
      roulette: getAddress("0x53e579dC9BE49B6Bac08c6F9ffA83D981A9A19F3"),
      slotMachine: getAddress("0xa593553bdbA38730226aaabF07D241a16a3fc005"),
      playerSubscription: getAddress("0x3CEef7Fe3CcF730b87D0bFC651c680a7a76dCa61"),
      raceXp: getAddress("0x05BE7743913dECe53D93E22120279f0630014743"),
      carCrusher: getAddress("0xC17B536db3431040f1F2A8980B2Eb80B814dD022"),
      jackpot: getAddress("0x2FAcF1371d3e67B98A27490321655ac059f675B2"),
      safehouse: getAddress("0x6c7e8317698986c0B92FdDB7CA3086234B5e5F60"),
      detectiveAgency: getAddress("0x0cCA060E6c22A67eF17E657342548A467D96B3CD"),
      rankStake: getAddress("0xDFfCf5D284D2bA80376BAba90F37494D60fe8820"),
      bodyguardTraining: getAddress("0xb7D6c0B1a176711C98cceF191Eb5528F2e703fd5"),
      equipment: getAddress("0xa2AA522B4CCBc95Dec0aFCa2B0c645f9C126cD24"),
      mafia: getAddress("0x3cb3F4f43D4Be61AA92BB4EEFfe7142A13bf4111"),
      ogCrate: getAddress("0x16B11C057cA6d354E81D58B375CB118f7930807c"),
      map: getAddress("0x1c88060e4509c59b4064A7a9818f64AeC41ef19E"),
      mafiaFamily: getAddress("0x1bC581fe134BdC7432eF8ba75BCeEd242F90BcD2"),
      ocLobby: getAddress("0x281C0Db67c96ee7Ad32AF25817cB3964Fc7E79cD"),
      ocJoin: getAddress("0x00D0933595F87eD8b50638796FCf5b22de3795a2"),
      ocExecution: getAddress("0xC813f8EA6668eAb88e157d00F00aeBCb2b5F56C0"),
      smuggleMarket: getAddress("0x36b09f1854CF3614Eb8d10fFae847511BB08868e"),
      storyMode: getAddress("0x4D9d610092B233a24193CB686De1A8746C5224f8"),
      weeklyMission: getAddress("0xc82d2eD039af6f01b4A44a11699a73EEB90cBAbB"),
      xpMarket: getAddress("0x49F23822AFa248D4bE453d630F7e0dF8fcF80854"),
      inventoryMarketplace: getAddress("0x1fb8C9F810afd99A6FAE3E81aBe0806f8796ba73"),
      raceLobby: getAddress("0xE3a3892fEC9bA9457fEE08Fe3d2E7b32bCeb33Ad"),
    },
  },
  pulsechain: {
    id: "pulsechain",
    label: "PulseChain",
    wagmiChainId: 369,
    rpc: "https://rpc.pulsechain.com",
    explorer: "https://scan.pulsechain.com",
    signDomain: "pulse.playmafia.io",
    addresses: {
      crime: getAddress("0xf077d4d0508505c5a80249aFC10bc6Ead90E47F1"),
      ingameCurrency: getAddress("0x839340bDC0b0E4449b7e1dEBD0db7E93861Ed1D9"),
      travel: getAddress("0x7FB6A056877c1da14a63bFECdE95ebbFa854f07F"),
      nickcar: getAddress("0x2bf1EEaa4e1D7502AeF7f5beCCf64356eDb4a8c8"),
      killskill: getAddress("0xdC45E5469A8B6D020473F69fEC91C0f0e83a3308"),
      jail: getAddress("0xDCD5E9c0b2b4E9Cb93677A258521D854b3A9f5A1"),
      helperbot: getAddress("0x6Ea05BaDD5B6e4226a49Af087eFd2A22c410e6cc"),
      wbnb: getAddress("0x0000000000000000000000000000000000000000"),
      chainlinkPriceFeed: getAddress("0x0000000000000000000000000000000000000000"),
      buyCredit: getAddress("0x9D2417e5cB35abaae331b32fb262c75A258a0717"),
      buyPerkbox: getAddress("0xF3B4F7d0ec795B555e12BC70150dDb1081FdA403"),
      buyKeys: getAddress("0x7FE7220E6A8AAB508c60be9d48fEfacDbe6BC179"),
      userProfile: getAddress("0x7FB6A056877c1da14a63bFECdE95ebbFa854f07F"),
      cash: getAddress("0x0000000000000000000000000000000000000000"),
      bullets: getAddress("0x98f0d50b77BCcd657ecfa2E5C1E4915c6f4565B8"),
      health: getAddress("0xA3b9a5E273a9199bbD64fFf81f369FEa0A3a0E1F"),
      giCredits: getAddress("0xEDe999DDF33851F99e450468dE7251CcE96e2A72"),
      power: getAddress("0x37edFc50908e194f05912EA0BC812Cd2f1Eb5bE4"),
      hospital: getAddress("0x222e69D7e1CA26D4Bbbd80637Dd49a8C07c3c8A1"),
      bulletFactory: getAddress("0x7770699325422632E76513823D84661D36AE8e6A"),
      shop: getAddress("0xd442356eF1c11f1B577c89542882c032E8DB82FE"),
      rankXp: getAddress("0x74eADd7ebeeED638FD7c413134FA3D3433699D92"),
      swapRouter: getAddress("0xf89DFF55EE67F4247cd0D351e75080f07c1f4D2B"),
      inventory: getAddress("0x2c60de22Ec20CcE72245311579c4aD9e5394Adc4"),
      perkOpener: getAddress("0xE3a3892fEC9bA9457fEE08Fe3d2E7b32bCeb33Ad"),
      roulette: getAddress("0xD49Df542a9278464E7E18af52AB93D40D3430A9F"),
      slotMachine: getAddress("0x52A929a1D43C18c6De571189D1c56c8574AA21a3"),
      playerSubscription: getAddress("0xC6409a0113cCF6c4194FBfD8C7409589465e15EC"),
      raceXp: getAddress("0x6B454a53581E3b1e93553485210A2172e4897FD0"),
      carCrusher: getAddress("0x5D9D43f6890868C88315411fd7B012b4194C96Ab"),
      jackpot: getAddress("0xeD548643332E019C97e3150736807839bf174dF9"),
      safehouse: getAddress("0x67336ec867c5631c08F1A536FAdF9DC489EeFf71"),
      detectiveAgency: getAddress("0xB31B9f5a9f99871B30956B96CcDEC275C48D84F1"),
      rankStake: getAddress("0xcecf804016bd0cfDEE8F506EA273c6E5D74f6699"),
      bodyguardTraining: getAddress("0x25d25524044A74eFe1Ff279abfe9708c69f5cbcE"),
      equipment: getAddress("0x37edFc50908e194f05912EA0BC812Cd2f1Eb5bE4"),
      mafia: getAddress("0xa27aDe5806Ded801b93499C6fA23cc8dC9AC55EA"),
      ogCrate: getAddress("0x3325E42aA71188939216b669E8d431718e5bd790"),
      map: getAddress("0xE571Aa670EDeEBd88887eb5687576199652A714F"),
      mafiaFamily: getAddress("0x3363cf983ae23AF2D95a81bA4A39C36084f8BEc4"),
      ocLobby: getAddress("0xE9680c72817477f9e51596bD39821C670790a66E"),
      ocJoin: getAddress("0xE79495F0982FCC3e884E5bCC2960D6d48439fCB6"),
      ocExecution: getAddress("0x7783e026416cF3B43046f3C2D45eFFa582bA2e91"),
      smuggleMarket: getAddress("0x9bf722B3350832ae9023B7C9762227bE33943d09"),
      storyMode: getAddress("0xaa4a6b620D869F05490A2DF6f43892d4664d2b7B"),
      weeklyMission: getAddress("0xCB8ab5f2A83F6Cd56d5aF97b3A6c942ab989fa25"),
      xpMarket: getAddress("0xc5731c6C3627F4912B54A2c6e13A8BFaeD69A39C"),
      inventoryMarketplace: getAddress("0x321e27aaB7e6F5DE221AE3eAe63306345f3A465d"),
      raceLobby: getAddress("0x10D0D93BD141a76F8cBcA1cd94CAf8081C5d0427"),
    },
  },
};

// Default exports for backward compatibility - these will be overridden by context
export const CONTRACT_ADDRESS =
  "0x167ad284c7bcc4d6342991aa258422e7a04f926e" as const;

// ABI for the implementation behind the TransparentUpgradeableProxy
// Includes all public functions discovered from bytecode analysis
export const CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "makeCrime",
    inputs: [{ name: "crimeType", type: "uint8", internalType: "uint8" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "jail",
    inputs: [],
    outputs: [],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSuccessRate",
    inputs: [
      { name: "rankLevel", type: "uint8", internalType: "uint8" },
      { name: "crimeType", type: "uint8", internalType: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gameBank",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "nextCrimeTime",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "NewCrime",
    inputs: [
      { name: "criminal", type: "address", indexed: true, internalType: "address" },
      { name: "crimeType", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "isSuccess", type: "bool", indexed: false, internalType: "bool" },
      { name: "isJailed", type: "bool", indexed: false, internalType: "bool" },
      { name: "cashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "xpPoint", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "nextCrimeTime", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;

// Crime type labels for the uint8 parameter
export const CRIME_TYPES: { id: number; label: string; description: string; risk: "Low" | "Medium" | "High" | "Extreme" }[] = [
  { id: 0, label: "Rob a Hot Dog Vendor", description: "Swipe some cash from the street vendor", risk: "Low" },
  { id: 1, label: "Rob a Freight Train", description: "Intercept a cargo shipment on the rails", risk: "Medium" },
  { id: 2, label: "Rob the Bank", description: "Hit the vault for the big score", risk: "High" },
  { id: 3, label: "Bribe the Police Station", description: "Grease some palms to stay out of trouble", risk: "Extreme" },
];

// ========== InGameCurrency Approval Contract ==========
export const INGAME_CURRENCY_ADDRESS =
  "0x376554f7bbcdeb348fa4b8371135b87ec6b29c38" as const;

export const INGAME_CURRENCY_ABI: Abi = [
  {
    type: "function",
    name: "approveInGameCurrency",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOfWithSignMsg",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "spender", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// 100 million approval amount in wei (18 decimals)
export const INGAME_CURRENCY_APPROVE_AMOUNT = BigInt("100000000000000000000000000");

// ========== Travel Contract ==========
export const TRAVEL_CONTRACT_ADDRESS =
  "0xa08d627e071cb4b53c6d0611d77dbcb659902aa4" as const;

export const TRAVEL_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "travel",
    inputs: [
      { name: "destinationCity", type: "uint8", internalType: "uint8" },
      { name: "travelType", type: "uint8", internalType: "uint8" },
      { name: "itemId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getUserProfile",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct UserProfile",
        components: [
          { name: "profileId", type: "uint256", internalType: "uint256" },
          { name: "username", type: "string", internalType: "string" },
          { name: "cityId", type: "uint8", internalType: "uint8" },
          { name: "isActive", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserTravelInfo",
    inputs: [
      { name: "account", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct TravelInfo",
        components: [
          { name: "travelType", type: "uint8", internalType: "uint8" },
          { name: "travelUntil", type: "uint256", internalType: "uint256" },
          { name: "itemId", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ItemGenerated",
    inputs: [
      { name: "owner", type: "address", indexed: false, internalType: "address" },
      { name: "itemId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "categoryId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "typeId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;

// ========== Crate / Perk Box item category info (from on-chain ItemCategoryInfoList) ==========
export interface CrateItemCategory {
  id: number;
  name: string;
  values: (string | number)[];
  currency?: string;
}

// ItemCategory enum IDs from on-chain contract
export enum ItemCategory {
  CASH = 0,
  BULLET = 1,
  HEALTH = 2,
  SHOPITEM = 3,
  BUSINESS = 4,
  BODYGUARD = 5,
  CREDIT = 6,
  CAR = 7,
  KEY = 8,
  KEYITEMS = 9,
  MAFIA = 10,
  OGNFT = 11,
  NOTICREDIT = 12,
  LANDSLOT = 13,
  BUSINESS_EXTRA = 14,
  CAR_ITEM = 15,
  FBI_ASSETS = 16,
  PERK_BOX = 17,
  CRIME_SUCCESS = 18,
  NICK_CAR_SUCCESS = 19,
  BOOZE_SUCCESS = 20,
  NARCOTICS_SUCCESS = 21,
  KILL_SKILL_SUCCESS = 22,
  BUST_OUT_SUCCESS = 23,
  CRIME_COOLDOWN = 24,
  NICK_CAR_COOLDOWN = 25,
  BOOZE_COOLDOWN = 26,
  NARCOTICS_COOLDOWN = 27,
  KILL_SKILL_COOLDOWN = 28,
  TRAVEL_COOLDOWN = 29,
  BULLET_BUY_COOLDOWN = 30,
  HEALTH_BUY_COOLDOWN = 31,
  BUST_OUT_COOLDOWN = 32,
  MAP_YIELD_BOOST = 33,
  RACE_XP_BOOST = 34,
  KILL_SKILL_XP_BOOST = 35,
  BUST_OUT_XP_BOOST = 36,
  SALES_PRICE_NARCOTICS_BOOST = 37,
  SALES_PRICE_BOOZE_BOOST = 38,
  WORTH_BOOST = 39,
  REWARDS_BOOST = 40,
  PURCHASE_BOOST = 41,
  NO_JAIL_BOOST = 42,
  FREE_TRAVEL_BOOST = 43,
  BANK_FEE_BOOST = 44,
  CREDIT_COST_BOOST = 45,
  CONVERSION_RATE_BOOST = 46,
  CREDIT_SPEND_BOOST = 47,
  BODYGUARD_JOHNNY = 48,
  BODYGUARD_JIM = 49,
  BODYGUARD_SAM = 50,
  BODYGUARD_FRANK = 51,
  SUBSCRIPTION_ITEM = 52,
  GI_CREDIT = 53,
  MYSTERY_BOX = 54,
  BOOZE_PACK = 55,
  NARCS_PACK = 56,
}

export const CRATE_ITEM_CATEGORIES: CrateItemCategory[] = [
  // --- Crate rewards (0-17) ---
  {
    id: ItemCategory.CASH, name: "Cash", currency: "$",
    values: [50000, 150000, 250000, 350000, 500000, 1000000, 2500000, 4000000, 5000000, 10000000]
  },
  {
    id: ItemCategory.BULLET, name: "Bullet",
    values: [250, 500, 750, 1500, 3500, 5000, 7000, 15000, 20000, 30000]
  },
  {
    id: ItemCategory.HEALTH, name: "Health",
    values: [50, 100, 150, 200, 250, 300, 350, 500, 750, 1000]
  },
  {
    id: ItemCategory.SHOPITEM, name: "Shop Item",
    values: ["Hand Gun Colt", "Remington", "Thompson", "Molotov cocktail", "Grenade",
      "Motorcycle", "Bullet proof vest", "Bullet proof suit", "Armored car", "Douglas M-3"]
  },
  {
    id: ItemCategory.BUSINESS, name: "Business",
    values: ["Car crusher", "Gunstore", "Bank", "Hospital", "Detective Agency",
      "Booze warehouse", "Narcotics warehouse", "Slotmachine", "Roulette", "Bullet factory"]
  },
  {
    id: ItemCategory.BODYGUARD, name: "Bodyguard",
    values: ["Lvl 3 - Johnny", "Lvl 3 - Jim", "Lvl 3 - Sam", "Lvl 5 - Johnny",
      "Lvl 6 - Jim", "Lvl 6 - Sam", "Lvl 7 - Frank", "Lvl 8 - Johnny",
      "Lvl 10 - Sam", "Lvl 10 - Frank"]
  },
  {
    id: ItemCategory.CREDIT, name: "Helper Credits",
    values: [100, 250, 500, 1000, 1500, 2000, 2500, 3000, 3500, 5000]
  },
  {
    id: ItemCategory.CAR, name: "Car", currency: "$",
    values: [5000, 15000, 35000, 75000, 100000, 150000, 250000, 350000, 450000, 500000]
  },
  {
    id: ItemCategory.KEY, name: "Wrapped NFTs",
    values: ["Game Key", "Game OG"]
  },
  {
    id: ItemCategory.KEYITEMS, name: "Keys",
    values: ["1 Game Key", "3 Game Keys", "5 Game Keys", "7 Game Keys", "10 Game Keys",
      "15 Game Keys", "25 Game Keys", "50 Game Keys", "75 Game Keys", "100 Game Keys"]
  },
  {
    id: ItemCategory.MAFIA, name: "MAFIA",
    values: [10000, 15000, 20000, 30000, 50000, 100000, 250000, 500000, 1000000, 5000000]
  },
  {
    id: ItemCategory.OGNFT, name: "OG NFTs",
    values: ["1 OG NFT", "1 OG NFT", "1 OG NFT", "1 OG NFT", "1 OG NFT",
      "1 OG NFT", "3 OG NFTs", "3 OG NFTs", "7 OG NFTs", "10 OG NFTs"]
  },
  {
    id: ItemCategory.NOTICREDIT, name: "Noti Credits",
    values: ["1 Noti Credit", "1 Noti Credit", "1 Noti Credit", "1 Noti Credit",
      "1 Noti Credit", "1 Noti Credit", "3 Noti Credits", "3 Noti Credits",
      "7 Noti Credits", "10 Noti Credits"]
  },
  { id: ItemCategory.LANDSLOT, name: "Land Slot", values: ["Land Slot"] },
  {
    id: ItemCategory.BUSINESS_EXTRA, name: "Business",
    values: ["Jackpot hall", "Lottery hall", "Bank", "Hospital", "Detective Agency",
      "Booze warehouse", "Narcotics warehouse", "Slotmachine", "Roulette", "Bullet factory"]
  },
  { id: ItemCategory.CAR_ITEM, name: "Car", values: ["Car"] },
  {
    id: ItemCategory.FBI_ASSETS, name: "FBI Assets",
    values: ["FBI Training Pass", "Detective Badge", "Special Agent badge", "FBI Field office"]
  },
  {
    id: ItemCategory.PERK_BOX, name: "Perk Box",
    values: ["1 Perk Box", "3 Perk Boxes", "5 Perk Boxes", "7 Perk Boxes", "10 Perk Boxes",
      "15 Perk Boxes", "25 Perk Boxes", "50 Perk Boxes", "75 Perk Boxes", "100 Perk Boxes"]
  },

  // --- Perk Box rewards: success boosts (18-23) ---
  { id: ItemCategory.CRIME_SUCCESS, name: "Crime Success Boost", values: [] },
  { id: ItemCategory.NICK_CAR_SUCCESS, name: "Nick Car Success Boost", values: [] },
  { id: ItemCategory.BOOZE_SUCCESS, name: "Booze Success Boost", values: [] },
  { id: ItemCategory.NARCOTICS_SUCCESS, name: "Narcotics Success Boost", values: [] },
  { id: ItemCategory.KILL_SKILL_SUCCESS, name: "Kill Skill Success Boost", values: [] },
  { id: ItemCategory.BUST_OUT_SUCCESS, name: "Bust Out Success Boost", values: [] },

  // --- Perk Box rewards: cooldown boosts (24-32) ---
  { id: ItemCategory.CRIME_COOLDOWN, name: "Crime Cooldown Boost", values: [] },
  { id: ItemCategory.NICK_CAR_COOLDOWN, name: "Nick Car Cooldown Boost", values: [] },
  { id: ItemCategory.BOOZE_COOLDOWN, name: "Booze Cooldown Boost", values: [] },
  { id: ItemCategory.NARCOTICS_COOLDOWN, name: "Narcotics Cooldown Boost", values: [] },
  { id: ItemCategory.KILL_SKILL_COOLDOWN, name: "Kill Skill Cooldown Boost", values: [] },
  { id: ItemCategory.TRAVEL_COOLDOWN, name: "Travel Cooldown Boost", values: [] },
  { id: ItemCategory.BULLET_BUY_COOLDOWN, name: "Bullet Buy Cooldown Boost", values: [] },
  { id: ItemCategory.HEALTH_BUY_COOLDOWN, name: "Health Buy Cooldown Boost", values: [] },
  { id: ItemCategory.BUST_OUT_COOLDOWN, name: "Bust Out Cooldown Boost", values: [] },

  // --- Perk Box rewards: misc boosts (33-47) ---
  { id: ItemCategory.MAP_YIELD_BOOST, name: "Map Yield Boost", values: [] },
  { id: ItemCategory.RACE_XP_BOOST, name: "Race XP Boost", values: [] },
  { id: ItemCategory.KILL_SKILL_XP_BOOST, name: "Kill Skill XP Boost", values: [] },
  { id: ItemCategory.BUST_OUT_XP_BOOST, name: "Bust Out XP Boost", values: [] },
  { id: ItemCategory.SALES_PRICE_NARCOTICS_BOOST, name: "Narcotics Sale Price Boost", values: [] },
  { id: ItemCategory.SALES_PRICE_BOOZE_BOOST, name: "Booze Sale Price Boost", values: [] },
  { id: ItemCategory.WORTH_BOOST, name: "Worth Boost", values: [] },
  { id: ItemCategory.REWARDS_BOOST, name: "Rewards Boost", values: [] },
  { id: ItemCategory.PURCHASE_BOOST, name: "Purchase Boost", values: [] },
  { id: ItemCategory.NO_JAIL_BOOST, name: "No Jail Boost", values: [] },
  { id: ItemCategory.FREE_TRAVEL_BOOST, name: "Free Travel Boost", values: [] },
  { id: ItemCategory.BANK_FEE_BOOST, name: "Bank Fee Boost", values: [] },
  { id: ItemCategory.CREDIT_COST_BOOST, name: "Credit Cost Boost", values: [] },
  { id: ItemCategory.CONVERSION_RATE_BOOST, name: "Conversion Rate Boost", values: [] },
  { id: ItemCategory.CREDIT_SPEND_BOOST, name: "Credit Spend Boost", values: [] },

  // --- Bodyguards individual (48-51) ---
  {
    id: ItemCategory.BODYGUARD_JOHNNY, name: "Bodyguard Johnny",
    values: ["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4", "Lvl 5", "Lvl 6", "Lvl 7", "Lvl 8", "Lvl 9", "Lvl 10"]
  },
  {
    id: ItemCategory.BODYGUARD_JIM, name: "Bodyguard Jim",
    values: ["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4", "Lvl 5", "Lvl 6", "Lvl 7", "Lvl 8", "Lvl 9", "Lvl 10"]
  },
  {
    id: ItemCategory.BODYGUARD_SAM, name: "Bodyguard Sam",
    values: ["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4", "Lvl 5", "Lvl 6", "Lvl 7", "Lvl 8", "Lvl 9", "Lvl 10"]
  },
  {
    id: ItemCategory.BODYGUARD_FRANK, name: "Bodyguard Frank",
    values: ["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4", "Lvl 5", "Lvl 6", "Lvl 7", "Lvl 8", "Lvl 9", "Lvl 10"]
  },

  // --- Misc (52-56) ---
  {
    id: ItemCategory.SUBSCRIPTION_ITEM, name: "Subscription",
    values: ["1 Month Player+", "1 Month Unlimited", "1 Month Player+", "1 Month Unlimited",
      "2 Month Player+", "2 Month Unlimited", "3 Month Player+", "3 Month Unlimited",
      "6 Month Player+", "6 Month Unlimited"]
  },
  {
    id: ItemCategory.GI_CREDIT, name: "GI Credit",
    values: ["3 GI Credits", "4 GI Credits", "5 GI Credits", "7 GI Credits", "10 GI Credits",
      "15 GI Credits", "25 GI Credits", "50 GI Credits", "75 GI Credits", "100 GI Credits"]
  },
  { id: ItemCategory.MYSTERY_BOX, name: "Mystery Box", values: ["Mystery Box"] },
  { id: ItemCategory.BOOZE_PACK, name: "Booze Pack", values: [] },
  { id: ItemCategory.NARCS_PACK, name: "Narcs Pack", values: [] },
];

// Fast lookup by categoryId
const _categoryMap = new Map<number, CrateItemCategory>();
CRATE_ITEM_CATEGORIES.forEach((c) => _categoryMap.set(c.id, c));

/** Get the category info for an on-chain categoryId, or undefined */
export function getCrateCategory(categoryId: number): CrateItemCategory | undefined {
  return _categoryMap.get(categoryId);
}

/** Get the human-readable item value for an on-chain categoryId + typeId */
export function getCrateItemLabel(categoryId: number, typeId: number): string {
  const cat = _categoryMap.get(categoryId);
  if (!cat) return `Category #${categoryId} / Type #${typeId}`;
  // Perk / boost categories with empty values array — show name + typeId as level
  if (cat.values.length === 0) {
    return `${cat.name} (Tier ${typeId + 1})`;
  }
  const val = cat.values[typeId];
  if (val === undefined) return `${cat.name} #${typeId}`;
  if (typeof val === "number") {
    const formatted = val.toLocaleString();
    return cat.currency ? `${cat.currency}${formatted}` : `${formatted} ${cat.name}`;
  }
  return String(val);
}

export const TRAVEL_TYPES: {
  id: number;
  label: string;
  icon: string;
  cost: number;
  travelTime: number;
}[] = [
    { id: 0, label: "Train", icon: "train", cost: 250, travelTime: 240 * 60 },
    { id: 1, label: "Car/Motorcycle", icon: "car", cost: 750, travelTime: 120 * 60 },
    { id: 2, label: "Airplane", icon: "plane", cost: 1750, travelTime: 60 * 60 },
  ];

// City enum for reference
export const City: Record<number, string> = {
  0: "Chicago",
  1: "Detroit",
  2: "New York",
  3: "Miami",
  4: "Las Vegas",
  5: "Medellin",
  6: "Bogota",
  7: "Caracas",
  8: "Palermo",
  9: "Messina",
  10: "Napoli",
};

export type TravelRegion = {
  region: string;
  cities: { name: string; cityId: number }[];
};

export const TravelCities: TravelRegion[] = [
  {
    region: "North America",
    cities: [
      { name: City[0], cityId: 0 },
      { name: City[1], cityId: 1 },
      { name: City[2], cityId: 2 },
      { name: City[3], cityId: 3 },
      { name: City[4], cityId: 4 },
    ],
  },
  {
    region: "South America",
    cities: [
      { name: City[5], cityId: 5 },
      { name: City[6], cityId: 6 },
      { name: City[7], cityId: 7 },
    ],
  },
  {
    region: "Europe",
    cities: [
      { name: City[8], cityId: 8 },
      { name: City[9], cityId: 9 },
      { name: City[10], cityId: 10 },
    ],
  },
];

// Travel destination cities for the destinationCity parameter
export const TRAVEL_DESTINATIONS: { id: number; label: string; country: string }[] = [
  { id: 0, label: "Chicago", country: "USA" },
  { id: 1, label: "Detroit", country: "USA" },
  { id: 2, label: "New York", country: "USA" },
  { id: 3, label: "Miami", country: "USA" },
  { id: 4, label: "Las Vegas", country: "USA" },
  { id: 5, label: "Medellin", country: "Colombia" },
  { id: 6, label: "Bogota", country: "Colombia" },
  { id: 7, label: "Caracas", country: "Venezuela" },
  { id: 8, label: "Palermo", country: "Italy" },
  { id: 9, label: "Messina", country: "Italy" },
  { id: 10, label: "Napoli", country: "Italy" },
];

// Helper to get region for a city
export function getCityRegion(cityId: number): string {
  for (const region of TravelCities) {
    if (region.cities.some((c) => c.cityId === cityId)) {
      return region.region;
    }
  }
  return "Unknown";
}

// ========== Nick a Car Contract ==========
export const NICKCAR_CONTRACT_ADDRESS =
  "0x60b8e0dd9566b42f9caa5538350aa0d29988373c" as const;

export const NICKCAR_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "nickCar",
    inputs: [
      { name: "crimeType", type: "uint8", internalType: "uint8" },
      { name: "authMessage", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getSuccessRate",
    inputs: [
      { name: "rankLevel", type: "uint8", internalType: "uint8" },
      { name: "crimeType", type: "uint8", internalType: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextNickTime",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "NewCarNick",
    inputs: [
      { name: "criminal", type: "address", indexed: true, internalType: "address" },
      { name: "crimeType", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "isSuccess", type: "bool", indexed: false, internalType: "bool" },
      { name: "isJailed", type: "bool", indexed: false, internalType: "bool" },
      { name: "xpPoint", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "nextNickTime", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "inventoryItemId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "cityId", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "carType", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "damagePercent", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "successNonce", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;

// Nick a Car crime types for the crimeType parameter
export const NICKCAR_TYPES: { id: number; label: string; description: string }[] = [
  { id: 0, label: "On the Street Corner", description: "Hotwire a ride parked on the corner" },
  { id: 1, label: "At the Football Stadium", description: "Snag a car from the packed parking lot" },
  { id: 2, label: "From Private Residence", description: "Slip into a driveway and drive off" },
  { id: 3, label: "From the Dealership", description: "Walk into the showroom and never come back" },
];

// ========== Kill Skill Contract ==========
export const KILLSKILL_CONTRACT_ADDRESS =
  "0xa5dc2cb4dc13f12d8464eaa862fac00f19adc84d" as const;

export const KILLSKILL_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "trainSkill",
    inputs: [
      { name: "trainType", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "TrainedSkill",
    inputs: [
      { name: "player", type: "address", indexed: true, internalType: "address" },
      { name: "trainType", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "isSuccess", type: "bool", indexed: false, internalType: "bool" },
    ],
  },
  {
    type: "function",
    name: "getSkillXp",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextTrainTime",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// Kill skill training types for the trainType parameter
export const TRAIN_TYPES: { id: number; label: string; description: string }[] = [
  { id: 0, label: "Strength", description: "Build raw power for close-range encounters" },
  { id: 1, label: "Stealth", description: "Master the art of moving unseen" },
  { id: 2, label: "Accuracy", description: "Perfect your precision for ranged takedowns" },
];

// ========== Jail Contract ==========
export const JAIL_CONTRACT_ADDRESS =
  "0x7371580cd13de739c734ae85062f75194d13fac2" as const;

export const JAIL_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "isUserinJail",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "jailedUntil",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyOut",
    inputs: [{ name: "prisoner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "bustOut",
    inputs: [{ name: "prisoner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ========== Helper Bot Contract ==========
export const HELPERBOT_CONTRACT_ADDRESS =
  "0xe2e4506c23c26eea2526d0e4dbb8dbf9cda9d105" as const;

export const HELPERBOT_CONTRACT_ABI: Abi = [
  // Start functions - all take (uint256 attemptCount, uint256[] perkItemIds)
  {
    type: "function",
    name: "startCrimeBot",
    inputs: [
      { name: "attemptCount", type: "uint256", internalType: "uint256" },
      { name: "perkItemIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startCarBot",
    inputs: [
      { name: "attemptCount", type: "uint256", internalType: "uint256" },
      { name: "perkItemIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startKSBot",
    inputs: [
      { name: "attemptCount", type: "uint256", internalType: "uint256" },
      { name: "perkItemIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startBoozeBot",
    inputs: [
      { name: "attemptCount", type: "uint256", internalType: "uint256" },
      { name: "perkItemIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startNarcsBot",
    inputs: [
      { name: "attemptCount", type: "uint256", internalType: "uint256" },
      { name: "perkItemIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startBulletBot",
    inputs: [
      { name: "attemptCount", type: "uint256", internalType: "uint256" },
      { name: "perkItemIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startRacingBot",
    inputs: [
      { name: "attemptCount", type: "uint256", internalType: "uint256" },
      { name: "perkItemIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startBustOutBot",
    inputs: [
      { name: "attemptCount", type: "uint256", internalType: "uint256" },
      { name: "perkItemIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // End functions - no-auth variants (crime, ks, racing, bustout)
  { type: "function", name: "endCrimeBot", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "endKSBot", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "endRacingBot", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "endBustOutBot", inputs: [], outputs: [], stateMutability: "nonpayable" },
  // End functions - signed auth variants (car, booze, narcs)
  {
    type: "function",
    name: "endCarBot",
    inputs: [
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "endBoozeBot",
    inputs: [
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "endNarcsBot",
    inputs: [
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // End bullet bot - takes (bool isAccepting, string message, bytes signature)
  {
    type: "function",
    name: "endBulletBot",
    inputs: [
      { name: "isAccepting", type: "bool", internalType: "bool" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // User info functions - read bot state for a user
  {
    type: "function",
    name: "userCrimeBotInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct HelperBotInfo",
        components: [
          { name: "successRate", type: "uint256", internalType: "uint256" },
          { name: "startTimestamp", type: "uint256", internalType: "uint256" },
          { name: "endTimestamp", type: "uint256", internalType: "uint256" },
          { name: "attemptCount", type: "uint256", internalType: "uint256" },
          { name: "isRunning", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userCarBotInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct HelperBotInfo",
        components: [
          { name: "successRate", type: "uint256", internalType: "uint256" },
          { name: "startTimestamp", type: "uint256", internalType: "uint256" },
          { name: "endTimestamp", type: "uint256", internalType: "uint256" },
          { name: "attemptCount", type: "uint256", internalType: "uint256" },
          { name: "isRunning", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userKSBotInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct HelperBotInfo",
        components: [
          { name: "successRate", type: "uint256", internalType: "uint256" },
          { name: "startTimestamp", type: "uint256", internalType: "uint256" },
          { name: "endTimestamp", type: "uint256", internalType: "uint256" },
          { name: "attemptCount", type: "uint256", internalType: "uint256" },
          { name: "isRunning", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userBoozeBotInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct HelperBotInfo",
        components: [
          { name: "successRate", type: "uint256", internalType: "uint256" },
          { name: "startTimestamp", type: "uint256", internalType: "uint256" },
          { name: "endTimestamp", type: "uint256", internalType: "uint256" },
          { name: "attemptCount", type: "uint256", internalType: "uint256" },
          { name: "isRunning", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userNarcsBotInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct HelperBotInfo",
        components: [
          { name: "successRate", type: "uint256", internalType: "uint256" },
          { name: "startTimestamp", type: "uint256", internalType: "uint256" },
          { name: "endTimestamp", type: "uint256", internalType: "uint256" },
          { name: "attemptCount", type: "uint256", internalType: "uint256" },
          { name: "isRunning", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userBulletBotInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct HelperBotInfo",
        components: [
          { name: "successRate", type: "uint256", internalType: "uint256" },
          { name: "startTimestamp", type: "uint256", internalType: "uint256" },
          { name: "endTimestamp", type: "uint256", internalType: "uint256" },
          { name: "attemptCount", type: "uint256", internalType: "uint256" },
          { name: "isRunning", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userRacingBotInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct HelperBotInfo",
        components: [
          { name: "successRate", type: "uint256", internalType: "uint256" },
          { name: "startTimestamp", type: "uint256", internalType: "uint256" },
          { name: "endTimestamp", type: "uint256", internalType: "uint256" },
          { name: "attemptCount", type: "uint256", internalType: "uint256" },
          { name: "isRunning", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userBustOutBotInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct HelperBotInfo",
        components: [
          { name: "successRate", type: "uint256", internalType: "uint256" },
          { name: "startTimestamp", type: "uint256", internalType: "uint256" },
          { name: "endTimestamp", type: "uint256", internalType: "uint256" },
          { name: "attemptCount", type: "uint256", internalType: "uint256" },
          { name: "isRunning", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

// ========== HelperBot Info Type & Parser ==========
export type HelperBotInfo = {
  successRate: number;
  startTimestamp: number;
  endTimestamp: number;
  attemptCount: number;
  isRunning: boolean;
};

export const parseHelperBotInfo = (data: any): HelperBotInfo => {
  return {
    successRate: Number(data.successRate),
    startTimestamp: Number(data.startTimestamp),
    endTimestamp: Number(data.endTimestamp),
    attemptCount: Number(data.attemptCount),
    isRunning: Boolean(data.isRunning),
  };
};

export type HelperBotEndType = "none" | "signed" | "bulletSigned";

export const HELPER_BOTS: {
  id: number;
  label: string;
  description: string;
  startFn: string;
  endFn: string;
  infoFn: string;
  endType: HelperBotEndType;
  credits: number;
  rank: string;
  minAttempts: number;
  maxAttempts: number;
}[] = [
    { id: 0, label: "Crime Bot", description: "A stealthy robot executing street crimes with precision", startFn: "startCrimeBot", endFn: "endCrimeBot", infoFn: "userCrimeBotInfo", endType: "none", credits: 1, rank: "Low", minAttempts: 10, maxAttempts: 5000 },
    { id: 1, label: "Car Bot", description: "Bypasses security systems to steal cars with precision", startFn: "startCarBot", endFn: "endCarBot", infoFn: "userCarBotInfo", endType: "signed", credits: 4, rank: "Medium", minAttempts: 9, maxAttempts: 1249 },
    { id: 2, label: "Shooting Practice Bot", description: "Hones aiming skills to improve accuracy and reaction time", startFn: "startKSBot", endFn: "endKSBot", infoFn: "userKSBotInfo", endType: "none", credits: 8, rank: "Medium", minAttempts: 42, maxAttempts: 625 },
    { id: 3, label: "Booze Smuggling Bot", description: "Smuggles booze past authorities through stealth", startFn: "startBoozeBot", endFn: "endBoozeBot", infoFn: "userBoozeBotInfo", endType: "signed", credits: 7, rank: "High", minAttempts: 29, maxAttempts: 714 },
    { id: 4, label: "Narcotics Smuggling Bot", description: "Smuggles narcotics past authorities through stealth", startFn: "startNarcsBot", endFn: "endNarcsBot", infoFn: "userNarcsBotInfo", endType: "signed", credits: 10, rank: "High", minAttempts: 35, maxAttempts: 500 },
    { id: 5, label: "Bullet Dealer Bot", description: "Compares prices and assists in purchasing bullets", startFn: "startBulletBot", endFn: "endBulletBot", infoFn: "userBulletBotInfo", endType: "bulletSigned", credits: 12, rank: "Medium", minAttempts: 4, maxAttempts: 416 },
    { id: 6, label: "Race XP Bot", description: "Assists in earning race XP efficiently", startFn: "startRacingBot", endFn: "endRacingBot", infoFn: "userRacingBotInfo", endType: "none", credits: 5, rank: "Medium", minAttempts: 2, maxAttempts: 20 },
    { id: 7, label: "Bust Out Bot", description: "Assists in earning bust out XP efficiently", startFn: "startBustOutBot", endFn: "endBustOutBot", infoFn: "userBustOutBotInfo", endType: "none", credits: 2, rank: "Medium", minAttempts: 2, maxAttempts: 100 },
  ];

// ========== WBNB Token (for approvals) ==========
export const WBNB_ADDRESS =
  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as const;

export const WBNB_ABI: Abi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "spender", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ========== Chainlink BNB/USD Price Feed (BSC Mainnet) ==========
export const CHAINLINK_BNB_USD_ADDRESS =
  "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE" as const;

export const CHAINLINK_PRICE_FEED_ABI: Abi = [
  {
    type: "function",
    name: "latestRoundData",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80", internalType: "uint80" },
      { name: "answer", type: "int256", internalType: "int256" },
      { name: "startedAt", type: "uint256", internalType: "uint256" },
      { name: "updatedAt", type: "uint256", internalType: "uint256" },
      { name: "answeredInRound", type: "uint80", internalType: "uint80" },
    ],
    stateMutability: "view",
  },
] as const;

// ========== Buy Helper Credits Contract ==========
export const BUY_CREDIT_CONTRACT_ADDRESS =
  "0x192f029cc7e0bb80db201191e0040e8f801df34d" as const;

export const BUY_CREDIT_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "getSwapTokens",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct SwapToken[]",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "decimal", type: "uint8", internalType: "uint8" },
          { name: "tokenAddress", type: "address", internalType: "address" },
          { name: "price", type: "uint256", internalType: "uint256" },
          { name: "isStable", type: "bool", internalType: "bool" },
          { name: "isEnabled", type: "bool", internalType: "bool" },
        ],
      },
      { name: "", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "price",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyCredit",
    inputs: [
      { name: "swapTokenId", type: "uint256", internalType: "uint256" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

export const ERC20_ABI: Abi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "spender", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ========== Buy Perk Boxes Contract ==========
export const BUY_PERKBOX_CONTRACT_ADDRESS =
  "0x55849c0f5a567a49d219b00642a4648389ada6f6" as const;

export const BUY_PERKBOX_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "getSwapTokens",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct SwapToken[]",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "decimal", type: "uint8", internalType: "uint8" },
          { name: "tokenAddress", type: "address", internalType: "address" },
          { name: "price", type: "uint256", internalType: "uint256" },
          { name: "isStable", type: "bool", internalType: "bool" },
          { name: "isEnabled", type: "bool", internalType: "bool" },
        ],
      },
      { name: "", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "price",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyPerkBoxes",
    inputs: [
      { name: "swapTokenId", type: "uint256", internalType: "uint256" },
      { name: "perkBoxAmount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

// ========== Buy Keys Contract ==========
export const BUY_KEYS_CONTRACT_ADDRESS =
  "0x1f4eb51e87c4e2368316dba8e478cd561feb8b77" as const;

export const BUY_KEYS_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "getSwapTokens",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct SwapToken[]",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "decimal", type: "uint8", internalType: "uint8" },
          { name: "tokenAddress", type: "address", internalType: "address" },
          { name: "price", type: "uint256", internalType: "uint256" },
          { name: "isStable", type: "bool", internalType: "bool" },
          { name: "isEnabled", type: "bool", internalType: "bool" },
        ],
      },
      { name: "", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "price",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyCrates",
    inputs: [
      { name: "swapTokenId", type: "uint256", internalType: "uint256" },
      { name: "crateAmount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

// ========== User Profile Contract ==========
export const USER_PROFILE_CONTRACT_ADDRESS =
  "0xa08d627e071cb4b53c6d0611d77dbcb659902aa4" as const;

export const USER_PROFILE_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "getUserProfile",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct UserProfile",
        components: [
          { name: "profileId", type: "uint256", internalType: "uint256" },
          { name: "username", type: "string", internalType: "string" },
          { name: "cityId", type: "uint8", internalType: "uint8" },
          { name: "isActive", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createProfile",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "swapTokenId", type: "uint256", internalType: "uint256" },
      { name: "referrer", type: "address", internalType: "address" },
      { name: "gender", type: "uint8", internalType: "uint8" },
      { name: "country", type: "string", internalType: "string" },
      { name: "imageId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isTakenName",
    inputs: [{ name: "name", type: "string", internalType: "string" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
] as const;

// ========== Cash Balance Contract ==========
export const CASH_CONTRACT_ADDRESS =
  "0x0f98e19bb15e41c139b41244430047e7cd95ce46" as const;

export const CASH_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "balanceOfWithSignMsg",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ========== Bullet Contract ==========
export const BULLET_ABI: Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowances",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "spender", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ========== Health Contract ==========
export const HEALTH_ABI: Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOfWithSignMsg",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ========== Credits Contract ==========
export const CREDITS_ABI: Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ========== Power Contract ==========
export const POWER_ABI: Abi = [
  {
    type: "function",
    name: "getTotalPower",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "cityId", type: "uint8", internalType: "uint8" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      { name: "defense", type: "uint256", internalType: "uint256" },
      { name: "offense", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

// ========== GI Credits Contract ==========
export const GI_CREDITS_ABI: Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "price",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyCredit",
    inputs: [
      { name: "swapTokenId", type: "uint256", internalType: "uint256" },
      { name: "creditAmount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

// ========== Swap Router Contract ==========
export const SWAP_ROUTER_ABI: Abi = [
  {
    type: "function",
    name: "getSwapTokens",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct SwapToken[]",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "decimal", type: "uint8", internalType: "uint8" },
          { name: "tokenAddress", type: "address", internalType: "address" },
          { name: "price", type: "uint256", internalType: "uint256" },
          { name: "isStable", type: "bool", internalType: "bool" },
          { name: "isEnabled", type: "bool", internalType: "bool" },
        ],
      },
      { name: "", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenPrice",
    inputs: [
      { name: "tokenAddress", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyToken",
    inputs: [
      { name: "swapTokenId", type: "uint256", internalType: "uint256" },
      { name: "tokenAddress", type: "address", internalType: "address" },
      { name: "tokenAmount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

// ========== Hospital Contract ==========
export const HOSPITAL_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "reproduceBlood",
    inputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "buyHealth",
    inputs: [
      { name: "healthAmount", type: "uint256", internalType: "uint256" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getCityHospitalInfo",
    inputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [
      { name: "amountLeft", type: "uint256", internalType: "uint256" },
      { name: "price", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextBuyTime",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ========== Bullet Factory Contract ==========
export const BULLET_FACTORY_ABI: Abi = [
  {
    type: "function",
    name: "reproduceBullets",
    inputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "buyBullets",
    inputs: [
      { name: "bulletAmount", type: "uint256", internalType: "uint256" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getCityMarketInfo",
    inputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [
      { name: "amountLeft", type: "uint256", internalType: "uint256" },
      { name: "price", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextBuyTime",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ========== Bank Transfer Contract (uses InGameCurrency address) ==========
export const BANK_TRANSFER_ABI: Abi = [
  {
    type: "function",
    name: "userTransfer",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ========== Rank Level Contract ==========
export const RANK_CONTRACT_ADDRESS =
  "0x48F2C9C0ea337854492aF5bEbEa74e8917712B71" as `0x${string}`;

export const RANK_ABI: Abi = [
  {
    type: "function",
    name: "getRankLevel",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRankXp",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBustOutXp",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const RACE_XP_ABI: Abi = [
  {
    type: "function",
    name: "getXp",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// Rank level names (static, not on-chain)
export const RANK_NAMES: Record<number, string> = {
  1: "Nobody",
  2: "Apprentice",
  3: "Pickpocket",
  4: "Cloak",
  5: "Thief",
  6: "Locksmith",
  7: "Runner",
  8: "Associate",
  9: "Dealer",
  10: "Fixer",
  11: "Collector",
  12: "Enforcer",
  13: "Prospect",
  14: "Lieutenant",
  15: "Soldier",
  16: "Mobster",
  17: "Swindler",
  18: "Whisperer",
  19: "Architect",
  20: "Hitman",
  21: "Assassin",
  22: "Commander",
  23: "Executioner",
  24: "Widowmaker",
  25: "Bone Collector",
  26: "Tactician",
  27: "Chief",
  28: "Warlord",
  29: "Capo Bastone",
  30: "Godfather",
};

// XP required to reach each rank level (static, not on-chain)
// Array indexed by rank level (0-29), where index 0 = rank 1, index 29 = rank 30
export const RANK_XP: number[] = [
  0, 10000, 20000, 40000, 80000, 160000, 196800, 242100, 297700, 366200, 450400,
  554100, 681500, 838200, 1081300, 1394900, 1799400, 2321200, 2994400, 3862800,
  5407900, 7571000, 10599400, 14839200, 20774900, 29084900, 40718800, 57006400,
  79808900, 111732500,
];

// ========== Shop Contract ==========
export const SHOP_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "getShopItem",
    inputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
      { name: "typeId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ShopItem",
        components: [
          { name: "categoryId", type: "uint256", internalType: "uint256" },
          { name: "typeId", type: "uint256", internalType: "uint256" },
          { name: "stockAmount", type: "uint256", internalType: "uint256" },
          { name: "price", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyItems",
    inputs: [
      { name: "typeIds", type: "uint256[]", internalType: "uint256[]" },
      { name: "amounts", type: "uint256[]", internalType: "uint256[]" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "restockItems",
    inputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "nextBuyTime",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

export type ShopItemMeta = {
  id: number;
  name: string;
  category: "weapons" | "transport" | "bodyguard";
  typeId: number;
};

export const SHOP_ITEMS: ShopItemMeta[] = [
  // Weapons
  { id: 1, name: "Colt", category: "weapons", typeId: 0 },
  { id: 2, name: "Remington", category: "weapons", typeId: 1 },
  { id: 3, name: "Tommy Gun", category: "weapons", typeId: 2 },
  { id: 5, name: "Molotov", category: "weapons", typeId: 3 },
  { id: 4, name: "Grenade", category: "weapons", typeId: 4 },
  // Transport & Armor
  { id: 6, name: "Motorcycle", category: "transport", typeId: 5 },
  { id: 9, name: "Bulletproof Vest", category: "transport", typeId: 6 },
  { id: 10, name: "Bulletproof Suit", category: "transport", typeId: 7 },
  { id: 7, name: "Armored Car", category: "transport", typeId: 8 },
  { id: 8, name: "Douglas M-3", category: "transport", typeId: 9 },
  // Bodyguards
  { id: 11, name: "Bodyguard Johnny", category: "bodyguard", typeId: 10 },
  { id: 12, name: "Bodyguard Jim", category: "bodyguard", typeId: 11 },
  { id: 13, name: "Bodyguard Sam", category: "bodyguard", typeId: 12 },
  { id: 14, name: "Bodyguard Frank", category: "bodyguard", typeId: 13 },
];

export const SHOP_CATEGORIES = [
  { key: "weapons" as const, label: "Weapons" },
  { key: "transport" as const, label: "Transport & Armor" },
  { key: "bodyguard" as const, label: "Bodyguards" },
];

// ========== Inventory Contract (Open Crate / Open Perk Box) ==========
// Extracted from verified MafiaInventory ABI (BSC + PLS)
export const INVENTORY_CONTRACT_ABI: Abi = [
  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint256", name: "itemId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "categoryId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "typeId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "ItemGenerated",
    type: "event",
  },
  // --- Write functions ---
  {
    inputs: [],
    name: "requestOpenCrate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "finishOpenCrate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "requestOpenPerkBox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "finishOpenPerkBox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Garage: Ship Cars ---
  {
    inputs: [
      { internalType: "uint256[]", name: "itemIds", type: "uint256[]" },
      { internalType: "uint8[]", name: "destinationCities", type: "uint8[]" },
    ],
    name: "shipCars",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Garage: Transfer Item ---
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "itemId", type: "uint256" },
    ],
    name: "transferItem",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Garage: Sell Cars ---
  {
    inputs: [
      { internalType: "uint256[]", name: "itemIds", type: "uint256[]" },
    ],
    name: "sellCars",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Garage: Repair Cars ---
  {
    inputs: [
      { internalType: "uint256[]", name: "itemIds", type: "uint256[]" },
    ],
    name: "repairCars",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Garage events ---
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "itemId", type: "uint256" },
      { indexed: false, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint256", name: "cashAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "CarSold",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "itemId", type: "uint256" },
      { indexed: false, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint256", name: "cashAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "CarRepaired",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "itemId", type: "uint256" },
      { indexed: false, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint8", name: "newCityId", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "cashAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "ItemCityChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "from", type: "address" },
      { indexed: false, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "itemId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "ItemTransferred",
    type: "event",
  },
  // --- View functions ---
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getNonceStatus",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userNonceStatus",
    outputs: [
      { internalType: "bool", name: "isPending", type: "bool" },
      { internalType: "uint256", name: "requestId", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ========== Perk Opener Contract (Open Perk Box) ==========
// Extracted from verified MafiaPerkOpener ABI (BSC + PLS)
export const PERK_OPENER_CONTRACT_ABI: Abi = [
  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "itemId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "PerkBoxOpened",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "perkCategoryId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "perkTypeId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "PerkGenerated",
    type: "event",
  },
  // --- Write functions ---
  {
    inputs: [{ internalType: "uint256", name: "itemId", type: "uint256" }],
    name: "requestOpenPerkBox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "finishOpenPerkBox",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- View functions ---
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getNonceStatus",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userNonceStatus",
    outputs: [
      { internalType: "bool", name: "isPending", type: "bool" },
      { internalType: "uint256", name: "requestBlock", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ========== Roulette Contract ==========
// Extracted from verified MafiaRoulette ABI (BSC + PLS)
export const ROULETTE_CONTRACT_ABI: Abi = [
  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint8", name: "rouletteId", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "betId", type: "uint256" },
      { indexed: false, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "nonce", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "betAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "totalReward", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "rewardReceived", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "feeAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "FinishedBet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint8", name: "rouletteId", type: "uint8" },
      { indexed: false, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "InitializedBet",
    type: "event",
  },
  // --- Write functions ---
  {
    inputs: [
      { internalType: "uint8", name: "rouletteId", type: "uint8" },
      {
        components: [
          { internalType: "uint8", name: "betType", type: "uint8" },
          { internalType: "uint8", name: "number", type: "uint8" },
          { internalType: "uint240", name: "amount", type: "uint240" },
        ],
        internalType: "struct MafiaRoulette.Bet[]",
        name: "bets",
        type: "tuple[]",
      },
      { internalType: "string", name: "message", type: "string" },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    name: "initializeBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint8", name: "rouletteId", type: "uint8" }],
    name: "finishBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint8", name: "rouletteId", type: "uint8" }],
    name: "cancelBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- View functions ---
  {
    inputs: [],
    name: "getRoulettes",
    outputs: [
      {
        components: [
          { internalType: "uint8", name: "id", type: "uint8" },
          { internalType: "bool", name: "isOpened", type: "bool" },
          { internalType: "uint48", name: "ownedAt", type: "uint48" },
          { internalType: "uint256", name: "maxBet", type: "uint256" },
          { internalType: "uint256", name: "minBet", type: "uint256" },
          { internalType: "uint256", name: "minBetTop", type: "uint256" },
          { internalType: "uint256", name: "minBetBottom", type: "uint256" },
          { internalType: "uint256", name: "maxBetTop", type: "uint256" },
          { internalType: "uint256", name: "maxBetBottom", type: "uint256" },
          { internalType: "uint256", name: "feesPaid", type: "uint256" },
          { internalType: "uint256", name: "inventoryItemId", type: "uint256" },
          { internalType: "int256", name: "profit", type: "int256" },
        ],
        internalType: "struct MafiaRoulette.Roulette[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserBetInfo",
    outputs: [
      {
        components: [
          { internalType: "bool", name: "isPending", type: "bool" },
          { internalType: "uint256", name: "requestBlock", type: "uint256" },
          { internalType: "uint256", name: "totalAmount", type: "uint256" },
          {
            components: [
              { internalType: "uint8", name: "betType", type: "uint8" },
              { internalType: "uint8", name: "number", type: "uint8" },
              { internalType: "uint240", name: "amount", type: "uint240" },
            ],
            internalType: "struct MafiaRoulette.Bet[]",
            name: "bets",
            type: "tuple[]",
          },
        ],
        internalType: "struct MafiaRoulette.BetInfo[]",
        name: "list",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint8", name: "", type: "uint8" },
    ],
    name: "userBetInfo",
    outputs: [
      { internalType: "bool", name: "isPending", type: "bool" },
      { internalType: "uint256", name: "requestBlock", type: "uint256" },
      { internalType: "uint256", name: "totalAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "waitBlock",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feePercent",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Roulette bet types (betType field in the Bet struct)
// Bet type IDs matching the on-chain contract
// betType 0 = Red/Black, 1 = Column (R1/R2/R3), 2 = Dozen (S1/S2/S3),
// 3 = Half (H1/H2), 4 = Even/Odd, 5 = Straight number
export const ROULETTE_BET_TYPES = [
  {
    id: 0, label: "Red / Black", description: "18 numbers", payout: "1:1",
    options: [
      { value: 0, label: "Black" },
      { value: 1, label: "Red" },
    ]
  },
  {
    id: 1, label: "Column", description: "12 numbers (column)", payout: "2:1",
    options: [
      { value: 0, label: "1st Column" },
      { value: 1, label: "2nd Column" },
      { value: 2, label: "3rd Column" },
    ]
  },
  {
    id: 2, label: "Dozen", description: "12 numbers (section)", payout: "2:1",
    options: [
      { value: 0, label: "1st Dozen (1-12)" },
      { value: 1, label: "2nd Dozen (13-24)" },
      { value: 2, label: "3rd Dozen (25-36)" },
    ]
  },
  {
    id: 3, label: "Half", description: "18 numbers (high / low)", payout: "1:1",
    options: [
      { value: 0, label: "Low (1-18)" },
      { value: 1, label: "High (19-36)" },
    ]
  },
  {
    id: 4, label: "Even / Odd", description: "18 numbers", payout: "1:1",
    options: [
      { value: 0, label: "Even" },
      { value: 1, label: "Odd" },
    ]
  },
  {
    id: 5, label: "Straight", description: "Single number (0-37)", payout: "35:1",
    options: null
  },
] as const;

// ========== Slot Machine Contract ==========
export const SLOT_MACHINE_CONTRACT_ABI: Abi = [
  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint8", name: "slotMachineId", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "betId", type: "uint256" },
      { indexed: false, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "nonce", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "spinCount", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "amountPerSpin", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "totalReward", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "rewardReceived", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "feeAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "FinishedBet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint8", name: "slotMachineId", type: "uint8" },
      { indexed: false, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint8", name: "spinCount", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "amountPerSpin", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "InitializedBet",
    type: "event",
  },
  // --- Write functions ---
  {
    inputs: [
      { internalType: "uint8", name: "slotMachineId", type: "uint8" },
      { internalType: "uint8", name: "spinCount", type: "uint8" },
      { internalType: "uint256", name: "amountPerSpin", type: "uint256" },
      { internalType: "string", name: "message", type: "string" },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    name: "initializeBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint8", name: "slotMachineId", type: "uint8" }],
    name: "finishBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- View functions ---
  {
    inputs: [],
    name: "getSlotMachines",
    outputs: [
      {
        components: [
          { internalType: "uint8", name: "id", type: "uint8" },
          { internalType: "bool", name: "isOpened", type: "bool" },
          { internalType: "uint48", name: "ownedAt", type: "uint48" },
          { internalType: "uint256", name: "maxBet", type: "uint256" },
          { internalType: "uint256", name: "minBet", type: "uint256" },
          { internalType: "uint256", name: "minBetTop", type: "uint256" },
          { internalType: "uint256", name: "minBetBottom", type: "uint256" },
          { internalType: "uint256", name: "maxBetTop", type: "uint256" },
          { internalType: "uint256", name: "maxBetBottom", type: "uint256" },
          { internalType: "uint256", name: "feesPaid", type: "uint256" },
          { internalType: "uint256", name: "inventoryItemId", type: "uint256" },
          { internalType: "int256", name: "profit", type: "int256" },
        ],
        internalType: "struct MafiaSlotMachine.SlotMachine[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserBetInfo",
    outputs: [
      {
        components: [
          { internalType: "bool", name: "isPending", type: "bool" },
          { internalType: "uint8", name: "spinCount", type: "uint8" },
          { internalType: "uint256", name: "amountPerSpin", type: "uint256" },
          { internalType: "uint256", name: "requestId", type: "uint256" },
        ],
        internalType: "struct MafiaSlotMachine.BetInfo[]",
        name: "list",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint8", name: "", type: "uint8" },
    ],
    name: "userBetInfo",
    outputs: [
      { internalType: "bool", name: "isPending", type: "bool" },
      { internalType: "uint8", name: "spinCount", type: "uint8" },
      { internalType: "uint256", name: "amountPerSpin", type: "uint256" },
      { internalType: "uint256", name: "requestId", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxSpinCount",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "waitBlock",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feePercent",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint8", name: "slotMachineId", type: "uint8" },
    ],
    name: "getNonceStatus",
    outputs: [
      { internalType: "bool", name: "", type: "bool" },
      { internalType: "bool", name: "", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Slot machine payout summary table (for display)
export const SLOT_PAYOUT_SUMMARY = [
  { name: "Health", twoX: 0.05, threeX: 0.5 },
  { name: "Bodyguard", twoX: 0.1, threeX: 1 },
  { name: "Helper Bot", twoX: 0.15, threeX: 1.5 },
  { name: "Cash", twoX: 0.3, threeX: 3 },
  { name: "Bullets", twoX: 0.5, threeX: 5 },
  { name: "Crate", twoX: 1, threeX: 10 },
  { name: "MAFIA Token", twoX: 1.5, threeX: 15 },
  { name: "Keys", twoX: 2.5, threeX: 25 },
  { name: "OG NFT", twoX: 5, threeX: 50 },
  { name: "Diamond", twoX: 10, threeX: 100 },
  { name: "Jackpot 7", twoX: 50, threeX: 500 },
] as const;

// ========== Player Subscription Contract ==========
export const PLAYER_SUBSCRIPTION_ABI: Abi = [
  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "planType", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "swapToken", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "endsAt", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "PlayerSubscribed",
    type: "event",
  },
  // --- Write functions ---
  {
    inputs: [
      { internalType: "uint256", name: "swapTokenId", type: "uint256" },
      { internalType: "uint256", name: "planType", type: "uint256" },
    ],
    name: "subscribe",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "itemId", type: "uint256" },
    ],
    name: "activateSubscriptionItem",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- View functions ---
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getSubscriptionInfo",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "planType", type: "uint256" },
          { internalType: "uint256", name: "startedAt", type: "uint256" },
        ],
        internalType: "struct MafiaPlayerSubscription.Subscription",
        name: "",
        type: "tuple",
      },
      { internalType: "bool", name: "", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "isSubscribed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "isUnlimitedUser",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "planPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "planDuration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "typeId", type: "uint256" }],
    name: "getSubscriptionItemInfo",
    outputs: [
      { internalType: "uint256", name: "planType", type: "uint256" },
      { internalType: "uint256", name: "months", type: "uint256" },
    ],
    stateMutability: "pure",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
] as const;

// ========== Car Crusher ABI ==========
export const CAR_CRUSHER_ABI = [
  // --- crushCars ---
  {
    inputs: [
      { internalType: "uint256[]", name: "itemIds", type: "uint256[]" },
      { internalType: "string", name: "message", type: "string" },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    name: "crushCars",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- View: bulletsPerCar ---
  {
    inputs: [],
    name: "bulletsPerCar",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- View: crushCooldown ---
  {
    inputs: [],
    name: "crushCooldown",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- View: nextCrushTime ---
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "nextCrushTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- View: maxCrushCount ---
  {
    inputs: [],
    name: "maxCrushCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- View: cityCrusherInfo ---
  {
    inputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    name: "cityCrusherInfo",
    outputs: [
      { internalType: "uint256", name: "bulletProfit", type: "uint256" },
      { internalType: "uint256", name: "cashProfit", type: "uint256" },
      { internalType: "uint256", name: "inventoryItemId", type: "uint256" },
      { internalType: "uint256", name: "bulletFeePerCar", type: "uint256" },
      { internalType: "uint256", name: "oneTimeCashFee", type: "uint256" },
      { internalType: "uint256", name: "lastUpdateTime", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // --- Event: CrushedCars ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint8", name: "cityId", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "count", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "bulletAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "bulletFee", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "cashFee", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "CrushedCars",
    type: "event",
  },
] as const;

// ========== Jackpot ABI ==========
export const JACKPOT_ABI = [
  // --- getCurrentRound ---
  {
    inputs: [],
    name: "getCurrentRound",
    outputs: [
      { internalType: "uint256", name: "roundId", type: "uint256" },
      { internalType: "uint8", name: "state", type: "uint8" },
      { internalType: "uint256", name: "totalUSD", type: "uint256" },
      { internalType: "uint256", name: "liveTime", type: "uint256" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "uint256", name: "entriesCount", type: "uint256" },
      { internalType: "uint256", name: "minBetUSD", type: "uint256" },
      { internalType: "uint256", name: "maxBetUSD", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // --- getCurrentRoundTotalPotUSD ---
  {
    inputs: [],
    name: "getCurrentRoundTotalPotUSD",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- getAssetsPrice ---
  {
    inputs: [],
    name: "getAssetsPrice",
    outputs: [
      { internalType: "uint256", name: "mafiaPrice", type: "uint256" },
      { internalType: "uint256", name: "cashPrice", type: "uint256" },
      { internalType: "uint256", name: "creditPrice", type: "uint256" },
      { internalType: "uint256", name: "cratePrice", type: "uint256" },
      { internalType: "uint256", name: "perkBoxPrice", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // --- getBetLimits ---
  {
    inputs: [],
    name: "getBetLimits",
    outputs: [
      { internalType: "uint256", name: "minBetUSD", type: "uint256" },
      { internalType: "uint256", name: "maxBetUSD", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // --- getRoundAmounts ---
  {
    inputs: [{ internalType: "uint256", name: "roundId", type: "uint256" }],
    name: "getRoundAmounts",
    outputs: [
      { internalType: "uint256", name: "mafiaAmount", type: "uint256" },
      { internalType: "uint256", name: "inGameCashAmount", type: "uint256" },
      { internalType: "uint256", name: "helperCreditAmount", type: "uint256" },
      { internalType: "uint256", name: "perkBoxAmount", type: "uint256" },
      { internalType: "uint256", name: "ogCrateAmount", type: "uint256" },
      { internalType: "uint256", name: "inventoryItemUSD", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // --- enterPot ---
  {
    inputs: [
      { internalType: "uint8", name: "entryType", type: "uint8" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "enterPot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- enterPotWithPerkBoxes ---
  {
    inputs: [{ internalType: "uint256[]", name: "perkBoxItemIds", type: "uint256[]" }],
    name: "enterPotWithPerkBoxes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- enterPotWithInventoryItem ---
  {
    inputs: [{ internalType: "uint256", name: "inventoryItemId", type: "uint256" }],
    name: "enterPotWithInventoryItem",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- feePercentage ---
  {
    inputs: [],
    name: "feePercentage",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- roundDuration ---
  {
    inputs: [],
    name: "roundDuration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- roundState ---
  {
    inputs: [],
    name: "roundState",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  // --- entryCount ---
  {
    inputs: [],
    name: "entryCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- Event: EnteredPot ---
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "string", name: "assetType", type: "string" },
      { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "entryId", type: "uint256" },
      { indexed: true, internalType: "address", name: "userAddress", type: "address" },
      { indexed: false, internalType: "uint256", name: "usdValue", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "itemId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "categoryId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "typeId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "EnteredPot",
    type: "event",
  },
  // --- Event: CalculateWinner ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "winner", type: "address" },
      { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "roundTotalUSD", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "winnerEntriesTotalUSD", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "feeUSDAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "CalculateWinner",
    type: "event",
  },
  // --- Event: RoundStateChanged ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "oldState", type: "uint8" },
      { indexed: false, internalType: "uint8", name: "newState", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "RoundStateChanged",
    type: "event",
  },
] as const;

// ========== Safehouse Contract ==========
export const SAFEHOUSE_COST_PER_HOUR = 100_000;
export const SAFEHOUSE_MIN_HOURS = 1;
export const SAFEHOUSE_MAX_HOURS = 100;
export const SAFEHOUSE_BASE_COOLDOWN = 6 * 60 * 60; // 6 hours

export const SAFEHOUSE_ABI: Abi = [
  {
    type: "function",
    name: "enterSafehouse",
    inputs: [{ name: "hour", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getUserInfo",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct MafiaSafehouse.UserInfo",
        components: [
          { name: "safeUntil", type: "uint256", internalType: "uint256" },
          { name: "duration", type: "uint256", internalType: "uint256" },
          { name: "nextSafehouseTime", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gameBank",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IMafiaGameBank" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "EnteredSafehouse",
    inputs: [
      { name: "user", type: "address", indexed: false, internalType: "address" },
      { name: "safeUntil", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "duration", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "cost", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "nextSafehouseTime", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;

// ========== Detective Agency Contract ==========
export const DETECTIVE_HIRING_TIME = 40 * 60; // 40 minutes in seconds
export const DETECTIVE_TARGET_FOUND_DURATION = 2 * 60 * 60; // 2 hours

export const DETECTIVE_AGENCY_ABI: Abi = [
  // --- Functions ---
  {
    type: "function",
    name: "requestHireDetective",
    inputs: [
      { name: "target", type: "address", internalType: "address" },
      { name: "detectivesCount", type: "uint256", internalType: "uint256" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "finishHireDetective",
    inputs: [{ name: "hireId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revealTarget",
    inputs: [{ name: "hireId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimCityProfit",
    inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setCityDetectiveCost",
    inputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
      { name: "detectiveCost", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getCityDetectiveCost",
    inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cityAgencyInfo",
    inputs: [{ name: "", type: "uint8", internalType: "uint8" }],
    outputs: [
      { name: "detectiveCost", type: "uint256", internalType: "uint256" },
      { name: "inventoryItemId", type: "uint256", internalType: "uint256" },
      { name: "profit", type: "uint256", internalType: "uint256" },
      { name: "lastUpdateTime", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTotalHireCount",
    inputs: [],
    outputs: [{ name: "", type: "uint48", internalType: "uint48" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserDetectiveHires",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "startIndex", type: "uint48", internalType: "uint48" },
      { name: "length", type: "uint48", internalType: "uint48" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      { name: "hireIds", type: "uint48[]", internalType: "uint48[]" },
      {
        name: "list",
        type: "tuple[]",
        internalType: "struct MafiaDetectiveAgency.DetectiveHireInfo[]",
        components: [
          { name: "cityId", type: "uint8", internalType: "uint8" },
          { name: "target", type: "address", internalType: "address" },
          { name: "user", type: "address", internalType: "address" },
          { name: "requestBlock", type: "uint256", internalType: "uint256" },
          { name: "detectiveCount", type: "uint256", internalType: "uint256" },
          { name: "startedAt", type: "uint256", internalType: "uint256" },
          { name: "targetNumber", type: "uint256", internalType: "uint256" },
          { name: "totalCost", type: "uint256", internalType: "uint256" },
          { name: "status", type: "uint8", internalType: "enum MafiaDetectiveAgency.DetectiveHireStatus" },
          { name: "isTargetRevealed", type: "bool", internalType: "bool" },
          { name: "targetCityId", type: "uint8", internalType: "uint8" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "detectiveHires",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
      { name: "target", type: "address", internalType: "address" },
      { name: "user", type: "address", internalType: "address" },
      { name: "requestBlock", type: "uint256", internalType: "uint256" },
      { name: "detectiveCount", type: "uint256", internalType: "uint256" },
      { name: "startedAt", type: "uint256", internalType: "uint256" },
      { name: "targetNumber", type: "uint256", internalType: "uint256" },
      { name: "totalCost", type: "uint256", internalType: "uint256" },
      { name: "status", type: "uint8", internalType: "enum MafiaDetectiveAgency.DetectiveHireStatus" },
      { name: "isTargetRevealed", type: "bool", internalType: "bool" },
      { name: "targetCityId", type: "uint8", internalType: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "basicDetectiveCost",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxDetectiveCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "targetFoundDuration",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "canKillUntil",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint8", internalType: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "adminUpdateCooldown",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gameBank",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IMafiaGameBank" }],
    stateMutability: "view",
  },
  // --- Events ---
  {
    type: "event",
    name: "DetectiveHireRequested",
    inputs: [
      { name: "hireId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "cityId", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "user", type: "address", indexed: false, internalType: "address" },
      { name: "target", type: "address", indexed: false, internalType: "address" },
      { name: "detectivesCount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "totalCost", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "fee", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "DetectiveHireFinished",
    inputs: [
      { name: "hireId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "targetNumber", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "isTargetFound", type: "bool", indexed: false, internalType: "bool" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "DetectiveTargetRevealed",
    inputs: [
      { name: "hireId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "user", type: "address", indexed: false, internalType: "address" },
      { name: "target", type: "address", indexed: false, internalType: "address" },
      { name: "targetCityId", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "canKillUntilTime", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "CityProfitClaimed",
    inputs: [
      { name: "cityId", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "user", type: "address", indexed: false, internalType: "address" },
      { name: "profit", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;

// ========== Rank Stake Contract ==========

// USD requirement per rank (1-indexed, matching RANK_NAMES keys; first 3 ranks are free)
export const RANK_USD_REQUIREMENTS: Record<number, number> = {
  1: 0, 2: 0, 3: 0, 4: 5, 5: 10, 6: 15, 7: 20, 8: 25, 9: 30, 10: 35,
  11: 40, 12: 45, 13: 50, 14: 55, 15: 60, 16: 65, 17: 70, 18: 75, 19: 80,
  20: 85, 21: 90, 22: 95, 23: 100, 24: 105, 25: 110, 26: 115, 27: 120,
  28: 125, 29: 130, 30: 135,
};

export const RANK_STAKE_ABI: Abi = [
  {
    type: "function",
    name: "stake",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unstake",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "adjustStake",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mafia",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IERC20" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isUserRankActive",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMissingAmount",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getReductionPercents",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      { name: "totalReductionPercent", type: "uint256", internalType: "uint256" },
      { name: "familyReductionPercent", type: "uint256", internalType: "uint256" },
      { name: "equipmentReductionPercent", type: "uint256", internalType: "uint256" },
      { name: "buildingReductionPercent", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNextStakeRequirement",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      { name: "level", type: "uint8", internalType: "uint8" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "reductionPercent", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserStakingInfo",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct MafiaRankStake.UserStakingInfo",
        components: [
          {
            name: "stakes",
            type: "tuple[]",
            internalType: "struct MafiaRankStake.Stake[]",
            components: [
              { name: "rankLevel", type: "uint8", internalType: "uint8" },
              { name: "amount", type: "uint256", internalType: "uint256" },
              { name: "reductionPercent", type: "uint256", internalType: "uint256" },
              { name: "timestamp", type: "uint256", internalType: "uint256" },
            ],
          },
          { name: "currentStakeLevel", type: "uint8", internalType: "uint8" },
          { name: "totalAmount", type: "uint256", internalType: "uint256" },
          { name: "lastUnstakeTime", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "unstakeCooldown",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "StakeAmountChanged",
    inputs: [
      { name: "user", type: "address", indexed: false, internalType: "address" },
      { name: "rankLevel", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;

// ========== Bodyguard Training Contract ==========
export const BODYGUARD_TRAINING_ABI: Abi = [
  {
    type: "function",
    name: "getTrainingSlots",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct MafiaBodyguardTraining.TrainSlot[]",
        components: [
          { name: "oldItemId", type: "uint256", internalType: "uint256" },
          { name: "newItemId", type: "uint256", internalType: "uint256" },
          { name: "newCategoryId", type: "uint256", internalType: "uint256" },
          { name: "newTypeId", type: "uint256", internalType: "uint256" },
          { name: "startTime", type: "uint256", internalType: "uint256" },
          { name: "endTime", type: "uint256", internalType: "uint256" },
          { name: "trainingCost", type: "uint256", internalType: "uint256" },
          { name: "isTraining", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "trainBodyguard",
    inputs: [
      { name: "slotId", type: "uint8", internalType: "uint8" },
      { name: "itemId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "finishTraining",
    inputs: [
      { name: "slotId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ========== Bodyguard Info ==========
export type TrainingSlotType = {
  oldItemId: number;
  newItemId: number;
  newCategoryId: number;
  newTypeId: number;
  startTime: number;
  endTime: number;
  trainingCost: number;
  isTraining: boolean;
};

export const BODYGUARD_INFO: Record<
  number,
  {
    name: string;
    basePrice: number;
    pricePerTraining: number;
    img: string;
    defensePerLevel: number;
    offensePerLevel: number;
  }
> = {
  [ItemCategory.BODYGUARD_JOHNNY]: {
    name: "Johnny",
    basePrice: 250000,
    pricePerTraining: 50000,
    img: "johnny-bgsmall.png",
    defensePerLevel: 3,
    offensePerLevel: 4,
  },
  [ItemCategory.BODYGUARD_JIM]: {
    name: "Jim",
    basePrice: 500000,
    pricePerTraining: 110000,
    img: "jim-bgsmall.png",
    defensePerLevel: 6,
    offensePerLevel: 6,
  },
  [ItemCategory.BODYGUARD_SAM]: {
    name: "Sam",
    basePrice: 1000000,
    pricePerTraining: 250000,
    img: "sam-bgsmall.png",
    defensePerLevel: 17,
    offensePerLevel: 7,
  },
  [ItemCategory.BODYGUARD_FRANK]: {
    name: "Frank",
    basePrice: 1300000,
    pricePerTraining: 375000,
    img: "frank-bgsmall.png",
    defensePerLevel: 10,
    offensePerLevel: 25,
  },
};

export const BODYGUARD_CATEGORIES = [
  ItemCategory.BODYGUARD_JOHNNY,
  ItemCategory.BODYGUARD_JIM,
  ItemCategory.BODYGUARD_SAM,
  ItemCategory.BODYGUARD_FRANK,
];

export function getBodyguardTrainingCost(
  categoryId: number,
  typeId: number,
): number {
  const newTypeId = typeId + 1;
  const bodyguardInfo = BODYGUARD_INFO[categoryId];
  if (!bodyguardInfo) return 0;
  if (newTypeId <= 0 || newTypeId >= 10) return 0;
  return bodyguardInfo.basePrice + newTypeId * bodyguardInfo.pricePerTraining;
}

// ========== Equipment Contract ==========
export const EQUIPMENT_ABI: Abi = [
  {
    inputs: [],
    name: "mafia",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "inventory",
    outputs: [{ internalType: "contract IMafiaInventory", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "map",
    outputs: [{ internalType: "contract IMafiaMap", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint8", name: "cityId", type: "uint8" },
      { internalType: "uint256[]", name: "itemIds", type: "uint256[]" },
      { internalType: "int256", name: "delta", type: "int256" },
    ],
    name: "equipItems",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "string", name: "message", type: "string" },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    name: "getCitiesTotalPower",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" },
      { internalType: "uint256[]", name: "", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint8", name: "cityId", type: "uint8" },
      { internalType: "string", name: "message", type: "string" },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    name: "getEquipmentInfo",
    outputs: [
      {
        components: [
          { internalType: "uint256[]", name: "itemIds", type: "uint256[]" },
          { internalType: "uint256", name: "mafiaAmount", type: "uint256" },
          { internalType: "uint256", name: "equippedAt", type: "uint256" },
        ],
        internalType: "struct MafiaEquipment.EquipmentsInfo",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint8", name: "cityId", type: "uint8" },
      { internalType: "string", name: "message", type: "string" },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    name: "getTotalPower",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Equipment slot types
export const EQUIPMENT_SLOTS = {
  WEAPON: 0,          // Colt, Remington, Tommygun
  AMMUNITION_1: 1,    // Molotov, Grenade
  AMMUNITION_2: 2,    // Molotov, Grenade
  AMMUNITION_3: 3,    // Molotov, Grenade
  ARMOR: 4,           // Bullet proof vest, Bullet proof suit
  TRANSPORT: 5,       // Armored Car, Douglas M-3
  BUILDING_1: 6,
  BUILDING_2: 7,
  BODYGUARD_1: 8,
  BODYGUARD_2: 9,
} as const;

export const EQUIPMENT_SLOT_LABELS: Record<number, string> = {
  0: "Weapon",
  1: "Ammo 1",
  2: "Ammo 2",
  3: "Ammo 3",
  4: "Armor",
  5: "Transport",
  6: "Building 1",
  7: "Building 2",
  8: "Bodyguard 1",
  9: "Bodyguard 2",
};

// Shop item stats for defense/offense
export const SHOP_ITEM_STATS: Record<number, { offense: number; defense: number; name: string }> = {
  0: { offense: 10, defense: 10, name: "Hand Gun Colt" },
  1: { offense: 25, defense: 30, name: "Remington" },
  2: { offense: 75, defense: 25, name: "Thompson" },
  3: { offense: 10, defense: 8, name: "Molotov Cocktail" },
  4: { offense: 15, defense: 5, name: "Grenade" },
  5: { offense: 90, defense: 30, name: "Motorcycle" },
  6: { offense: 15, defense: 45, name: "Bullet Proof Vest" },
  7: { offense: 2, defense: 95, name: "Bullet Proof Suit" },
  8: { offense: 30, defense: 100, name: "Armored Car" },
  9: { offense: 75, defense: 75, name: "Douglas M-3" },
};

// Get shop item slot category
export function getShopItemSlotType(typeId: number): number {
  if (typeId >= 0 && typeId <= 2) return EQUIPMENT_SLOTS.WEAPON;
  if (typeId === 3 || typeId === 4) return EQUIPMENT_SLOTS.AMMUNITION_1; // Can also use AMMUNITION_2, AMMUNITION_3
  if (typeId === 6 || typeId === 7) return EQUIPMENT_SLOTS.ARMOR;
  if (typeId === 5 || typeId === 8 || typeId === 9) return EQUIPMENT_SLOTS.TRANSPORT;
  return -1;
}

// Building stats by slot subtype
export const BUILDING_STATS: Record<number, { offense: number; defense: number; name: string }> = {
  1: { offense: 3, defense: 5, name: "Shed" },
  2: { offense: 15, defense: 15, name: "House" },
  3: { offense: 30, defense: 30, name: "Villa" },
  4: { offense: 50, defense: 75, name: "Office" },
  5: { offense: 60, defense: 90, name: "Apartment" },
  6: { offense: 75, defense: 110, name: "Mansion" },
  7: { offense: 75, defense: 150, name: "Hotel" },
};

// Rarity amplifiers for buildings
export const RARITY_AMPLIFIERS: Record<number, number> = {
  0: 1.0,   // Common
  1: 1.15,  // Upper
  2: 1.3,   // Strategic
  3: 1.4,   // Elite
};

export const RARITY_NAMES: Record<number, string> = {
  0: "Common",
  1: "Upper",
  2: "Strategic",
  3: "Elite",
};

// Maximum MAFIA stake for equipment
export const MAX_EQUIPMENT_MAFIA_STAKE = 1000000;

// ========== Organized Crime ABIs ==========
export const OC_LOBBY_ABI: Abi = [
  {
    type: "function",
    name: "getLobby",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct MafiaOCLobby.CrimeLobby",
        components: [
          { name: "id", type: "uint256", internalType: "uint256" },
          { name: "leader", type: "address", internalType: "address" },
          {
            name: "members",
            type: "tuple[]",
            internalType: "struct MafiaOCLobby.Member[]",
            components: [
              { name: "user", type: "address", internalType: "address" },
              { name: "itemIds", type: "uint256[]", internalType: "uint256[]" },
              { name: "impactScore", type: "uint16", internalType: "uint16" },
              { name: "deductedScore", type: "uint16", internalType: "uint16" },
              { name: "assetAddresses", type: "address[]", internalType: "address[]" },
              { name: "assetAmounts", type: "uint256[]", internalType: "uint256[]" },
            ],
          },
          { name: "isSuccess", type: "bool", internalType: "bool" },
          { name: "city", type: "uint8", internalType: "uint8" },
          { name: "failureType", type: "uint8", internalType: "uint8" },
          { name: "assetExpectation", type: "uint8", internalType: "uint8" },
          { name: "minRank", type: "uint8", internalType: "uint8" },
          { name: "impactScore", type: "uint16", internalType: "uint16" },
          { name: "deductedScore", type: "uint16", internalType: "uint16" },
          { name: "status", type: "uint8", internalType: "uint8" },
          { name: "createdAt", type: "uint48", internalType: "uint48" },
          { name: "startBlock", type: "uint48", internalType: "uint48" },
          { name: "isRewardClaimed", type: "bool", internalType: "bool" },
          { name: "currentRewardIndex", type: "uint8", internalType: "uint8" },
          {
            name: "rewards",
            type: "tuple[]",
            internalType: "struct MafiaOCLobby.Reward[]",
            components: [
              { name: "typeId", type: "uint8", internalType: "uint8" },
              { name: "amount", type: "uint256", internalType: "uint256" },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "crimeLobbies",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "id", type: "uint256", internalType: "uint256" },
      { name: "leader", type: "address", internalType: "address" },
      { name: "isSuccess", type: "bool", internalType: "bool" },
      { name: "city", type: "uint8", internalType: "uint8" },
      { name: "failureType", type: "uint8", internalType: "uint8" },
      { name: "assetExpectation", type: "uint8", internalType: "uint8" },
      { name: "minRank", type: "uint8", internalType: "uint8" },
      { name: "impactScore", type: "uint16", internalType: "uint16" },
      { name: "deductedScore", type: "uint16", internalType: "uint16" },
      { name: "status", type: "uint8", internalType: "uint8" },
      { name: "createdAt", type: "uint48", internalType: "uint48" },
      { name: "startBlock", type: "uint48", internalType: "uint48" },
      { name: "isRewardClaimed", type: "bool", internalType: "bool" },
      { name: "currentRewardIndex", type: "uint8", internalType: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isInLobby",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextLobbyTime",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint48", internalType: "uint48" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "wasInLobby",
    inputs: [
      { name: "account", type: "address", internalType: "address" },
      { name: "lobbyId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "startLobby",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeMember",
    inputs: [
      { name: "lobbyId", type: "uint256", internalType: "uint256" },
      { name: "memberIndex", type: "uint8", internalType: "uint8" },
      { name: "isKicked", type: "bool", internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cooldown",
    inputs: [],
    outputs: [{ name: "", type: "uint48", internalType: "uint48" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxImpactScore",
    inputs: [],
    outputs: [{ name: "", type: "uint16", internalType: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "LobbyCreated",
    inputs: [
      { name: "lobbyId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "leader", type: "address", indexed: false, internalType: "address" },
      { name: "city", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "createdAt", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "expectedLevel", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "minRank", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "MemberJoined",
    inputs: [
      { name: "lobbyId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "user", type: "address", indexed: false, internalType: "address" },
      { name: "memberIndex", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "impactScore", type: "uint16", indexed: false, internalType: "uint16" },
      { name: "deductedScore", type: "uint16", indexed: false, internalType: "uint16" },
      { name: "itemIds", type: "uint256[]", indexed: false, internalType: "uint256[]" },
      { name: "assetAddresses", type: "address[]", indexed: false, internalType: "address[]" },
      { name: "assetAmounts", type: "uint256[]", indexed: false, internalType: "uint256[]" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "MemberOut",
    inputs: [
      { name: "lobbyId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "memberIndex", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "user", type: "address", indexed: false, internalType: "address" },
      { name: "isKicked", type: "bool", indexed: false, internalType: "bool" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "LobbyCancelled",
    inputs: [
      { name: "lobbyId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getLobbyCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserCurrentLobbyId",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const OC_JOIN_ABI: Abi = [
  {
    type: "function",
    name: "createLobby",
    inputs: [
      { name: "cashAmount", type: "uint256", internalType: "uint256" },
      { name: "assetExpectation", type: "uint8", internalType: "uint8" },
      { name: "minRank", type: "uint8", internalType: "uint8" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "joinAsDriver",
    inputs: [
      { name: "lobbyId", type: "uint256", internalType: "uint256" },
      { name: "carId", type: "uint256", internalType: "uint256" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "joinAsWeaponExpert",
    inputs: [
      { name: "lobbyId", type: "uint256", internalType: "uint256" },
      { name: "weaponId", type: "uint256", internalType: "uint256" },
      { name: "bulletAmount", type: "uint256", internalType: "uint256" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "joinAsExplosiveExpert",
    inputs: [
      { name: "lobbyId", type: "uint256", internalType: "uint256" },
      { name: "grenadeIds", type: "uint256[]", internalType: "uint256[]" },
      { name: "molotovIds", type: "uint256[]", internalType: "uint256[]" },
      { name: "armorId", type: "uint256", internalType: "uint256" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "joinAsTeamExpert",
    inputs: [
      { name: "lobbyId", type: "uint256", internalType: "uint256" },
      { name: "bodyguardId", type: "uint256", internalType: "uint256" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "leaveLobby",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelLobby",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "kickMember",
    inputs: [
      { name: "lobbyId", type: "uint256", internalType: "uint256" },
      { name: "memberIndex", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const OC_EXECUTION_ABI: Abi = [
  {
    type: "function",
    name: "getLobbyNonceStatus",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lobbyHealthDeduction",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "startLobby",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "finishLobby",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimLobbyReward",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getLobbyFinishInfos",
    inputs: [{ name: "lobbyIds", type: "uint256[]", internalType: "uint256[]" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct LobbyFinishInfo[]",
        components: [
          { name: "isSuccess", type: "bool", internalType: "bool" },
          { name: "failureType", type: "uint8", internalType: "uint8" },
          { name: "successChance", type: "uint256", internalType: "uint256" },
          { name: "carDamage", type: "uint256", internalType: "uint256" },
          { name: "cashDeduction", type: "uint256", internalType: "uint256" },
          { name: "bulletsDeduction", type: "uint256", internalType: "uint256" },
          { name: "bgDeduction", type: "uint256", internalType: "uint256" },
          { name: "newBodyguardItemId", type: "uint256", internalType: "uint256" },
          { name: "newBodyguardCategoryId", type: "uint256", internalType: "uint256" },
          { name: "newBodyguardTypeId", type: "uint256", internalType: "uint256" },
          { name: "rewardSizePercents", type: "uint8[]", internalType: "uint8[]" },
          { name: "rewardTypeIds", type: "uint8[]", internalType: "uint8[]" },
          { name: "rewardCount", type: "uint8", internalType: "uint8" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lobbyFinishInfos",
    inputs: [{ name: "lobbyId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "isSuccess", type: "bool", internalType: "bool" },
      { name: "failureType", type: "uint8", internalType: "uint8" },
      { name: "successChance", type: "uint256", internalType: "uint256" },
      { name: "carDamage", type: "uint256", internalType: "uint256" },
      { name: "cashDeduction", type: "uint256", internalType: "uint256" },
      { name: "bulletsDeduction", type: "uint256", internalType: "uint256" },
      { name: "bgDeduction", type: "uint256", internalType: "uint256" },
      { name: "newBodyguardItemId", type: "uint256", internalType: "uint256" },
      { name: "newBodyguardCategoryId", type: "uint256", internalType: "uint256" },
      { name: "newBodyguardTypeId", type: "uint256", internalType: "uint256" },
      { name: "rewardSizePercents", type: "uint8[]", internalType: "uint8[]" },
      { name: "rewardTypeIds", type: "uint8[]", internalType: "uint8[]" },
      { name: "rewardCount", type: "uint8", internalType: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "LobbyFinished",
    inputs: [
      { name: "lobbyId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "isSuccess", type: "bool", indexed: false, internalType: "bool" },
      { name: "failureType", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "successChance", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "carDamage", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "cashDeduction", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "bulletsDeduction", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "bgDeduction", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "newBodyguardItemId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "newBodyguardCategoryId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "newBodyguardTypeId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "rewardSizePercents", type: "uint8[]", indexed: false, internalType: "uint8[]" },
      { name: "rewardTypeIds", type: "uint8[]", indexed: false, internalType: "uint8[]" },
      { name: "rewardCount", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "LobbyStarted",
    inputs: [
      { name: "lobbyId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "leader", type: "address", indexed: false, internalType: "address" },
      { name: "startBlock", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "RewardClaimed",
    inputs: [
      { name: "lobbyId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "assetAddress", type: "address", indexed: false, internalType: "address" },
      { name: "categoryId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "typeId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;

// Organized Crime constants
export const OC_LOBBY_STATUS = {
  WAITING: 0,
  STARTED: 1,
  FINISHED: 2,
  CANCELLED: 3,
} as const;

export const OC_LOBBY_STATUS_LABELS: Record<number, string> = {
  0: "Waiting",
  1: "In Progress",
  2: "Finished",
  3: "Cancelled",
};

export const OC_ASSET_EXPECTATION = {
  FULL: 0,
  PARTIAL: 1,
  NONE: 2,
} as const;

export const OC_ASSET_EXPECTATION_LABELS: Record<number, string> = {
  0: "Full Asset",
  1: "Partial Asset",
  2: "No Requirement",
};

export const OC_ROLE_NAMES: Record<number, string> = {
  0: "Leader",
  1: "Driver",
  2: "Weapon Expert",
  3: "Explosive Expert",
  4: "Team Expert",
};

/** On-chain `Reward.typeId` → possible amount range (success rolls). Cash uses wei on-chain; others are integer counts. */
export const OC_REWARD_CONFIG: Record<number, { min: number; max: number; name: string }> = {
  0: { min: 100_000, max: 5_000_000, name: "Cash" },
  1: { min: 1, max: 3, name: "Keys" },
  2: { min: 50, max: 1000, name: "Booze items" },
  3: { min: 50, max: 800, name: "Narcs items" },
  4: { min: 50, max: 300, name: "Helper credits" },
  5: { min: 1, max: 50, name: "GI Credits" },
  6: { min: 1, max: 5, name: "Perk box" },
  7: { min: 1, max: 2, name: "Mystery boxes" },
  8: { min: 500, max: 20_000, name: "Bullets" },
  9: { min: 50, max: 500, name: "Health" },
};

/** `MafiaOCLobby.Reward`: amount is ether-denominated only for cash (typeId 0). */
export const OC_REWARD_CASH_TYPE_ID = 0;

export function parseOcRewardAmount(typeId: number, amountRaw: bigint): number {
  if (typeId === OC_REWARD_CASH_TYPE_ID) {
    return Number(formatEther(amountRaw));
  }
  return Number(amountRaw);
}

export const OC_MIN_HEALTH = 300;

// ========== Smuggle Market ABIs ==========
export const SMUGGLE_MARKET_ABI: Abi = [
  {
    type: "function",
    name: "getUserGoods",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "startIndex", type: "uint256", internalType: "uint256" },
      { name: "length", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct MafiaSmuggleMarket.Good[]",
        components: [
          { name: "id", type: "uint32", internalType: "uint32" },
          { name: "owner", type: "address", internalType: "address" },
          { name: "categoryId", type: "uint8", internalType: "uint8" },
          { name: "typeId", type: "uint8", internalType: "uint8" },
          { name: "isSold", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextBoozeTime",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextNarcsTime",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAmountLimit",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      { name: "boozeLimit", type: "uint32", internalType: "uint32" },
      { name: "narcsLimit", type: "uint32", internalType: "uint32" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCityMarketPrice",
    inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
    outputs: [
      { name: "boozePrices", type: "uint256[]", internalType: "uint256[]" },
      { name: "narcsPrices", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyBooze",
    inputs: [
      { name: "types", type: "uint8[]", internalType: "uint8[]" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sellBooze",
    inputs: [
      { name: "itemIds", type: "uint32[]", internalType: "uint32[]" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "buyNarcs",
    inputs: [
      { name: "types", type: "uint8[]", internalType: "uint8[]" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sellNarcs",
    inputs: [
      { name: "itemIds", type: "uint32[]", internalType: "uint32[]" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cityBoozeProfit",
    inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cityNarcsProfit",
    inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimBoozeProfit",
    inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimNarcsProfit",
    inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events for buy/sell operations
  {
    type: "event",
    name: "BoozeBuy",
    inputs: [
      { name: "buyer", type: "address", indexed: false, internalType: "address" },
      { name: "isSuccess", type: "bool", indexed: false, internalType: "bool" },
      { name: "isJailed", type: "bool", indexed: false, internalType: "bool" },
      { name: "totalUserBoozeCount", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "cashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "xpPoint", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "nextBoozeTime", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BoozeSell",
    inputs: [
      { name: "seller", type: "address", indexed: false, internalType: "address" },
      { name: "isSuccess", type: "bool", indexed: false, internalType: "bool" },
      { name: "isJailed", type: "bool", indexed: false, internalType: "bool" },
      { name: "totalUserBoozeCount", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "cashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "xpPoint", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "nextBoozeTime", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "NarcsBuy",
    inputs: [
      { name: "buyer", type: "address", indexed: false, internalType: "address" },
      { name: "isSuccess", type: "bool", indexed: false, internalType: "bool" },
      { name: "isJailed", type: "bool", indexed: false, internalType: "bool" },
      { name: "totalUserNarcsCount", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "cashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "xpPoint", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "nextNarcsTime", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "NarcsSell",
    inputs: [
      { name: "seller", type: "address", indexed: false, internalType: "address" },
      { name: "isSuccess", type: "bool", indexed: false, internalType: "bool" },
      { name: "isJailed", type: "bool", indexed: false, internalType: "bool" },
      { name: "totalUserNarcsCount", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "cashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "xpPoint", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "nextNarcsTime", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  // Additional events from contract
  {
    type: "event",
    name: "ClaimedProfit",
    inputs: [
      { name: "city", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "owner", type: "address", indexed: false, internalType: "address" },
      { name: "cashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "businessType", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "NewGoods",
    inputs: [
      { name: "goodsId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "buyer", type: "address", indexed: false, internalType: "address" },
      { name: "categoryId", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "typeId", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "cashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SellGoods",
    inputs: [
      { name: "goodsId", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "seller", type: "address", indexed: false, internalType: "address" },
      { name: "categoryId", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "typeId", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "cashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;

// Story Mode ABI (Mystery Box)
export const STORY_MODE_ABI: Abi = [
  {
    type: "function",
    name: "claimMysteryBox",
    inputs: [{ name: "itemId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "itemId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "mysteryBoxIndex",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "claimedAt",
        type: "uint256",
      },
    ],
    name: "MysteryBoxClaimed",
    type: "event",
  },
] as const;

// Mystery Box Rewards (27 items, index 0-26)
export const MYSTERY_BOX_REWARDS = [
  { id: 1, label: "1000 Credits" },
  { id: 2, label: "2000 Credits" },
  { id: 3, label: "5 Keys" },
  { id: 4, label: "10 Keys" },
  { id: 5, label: "3 Perk Box" },
  { id: 6, label: "5 Perk Box" },
  { id: 7, label: "10 Perk Box" },
  { id: 8, label: "Level 7 Frank Bodyguard" },
  { id: 9, label: "Level 7 Sam Bodyguard" },
  { id: 10, label: "Level 5 Jim Bodyguard" },
  { id: 11, label: "Level 5 Johnny Bodyguard" },
  { id: 12, label: "6 Month Unlimited Subscription" },
  { id: 13, label: "3 Month Unlimited Subscription" },
  { id: 14, label: "1 Month Unlimited Subscription" },
  { id: 15, label: "6 Month Badge Subscription" },
  { id: 16, label: "3 Month Badge Subscription" },
  { id: 17, label: "1 Month Badge Subscription" },
  { id: 18, label: "1.5% KillSkill XP Boost" },
  { id: 19, label: "2.5% KillSkill XP Boost" },
  { id: 20, label: "5% KillSkill XP Boost" },
  { id: 21, label: "20% Bodyguard XP Boost" },
  { id: 22, label: "15% Race XP Boost" },
  { id: 23, label: "1K Rank XP" },
  { id: 24, label: "1.5K Rank XP" },
  { id: 25, label: "2.5K Rank XP" },
  { id: 26, label: "3.5K Rank XP" },
  { id: 27, label: "5K Rank XP" },
] as const;

// Smuggle market constants
export const BOOZE_TYPES: Record<number, string> = {
  0: "Beer",
  1: "Wine",
  2: "Port",
  3: "Vodka",
  4: "Whiskey",
  5: "Cognac",
  6: "Tequila",
};

export const NARCS_TYPES: Record<number, string> = {
  0: "Glue",
  1: "Marijuana",
  2: "Amphetamine",
  3: "Cocaine",
  4: "Morphine",
  5: "Opium",
  6: "Heroin",
};
export const OC_MAX_CASH = 1_500_000;
export const OC_MAX_BULLETS = 5_000;
export const OC_JAIL_HOURS = 72; // 48 * 1.5
export const OC_HEALTH_LOSS = 300;

// ========== Exchange Contract (Convert Items) ==========
export const EXCHANGE_ADDRESSES: Record<ChainId, `0x${string}`> = {
  bnb: getAddress("0x605694A29c5258D6c7Aed642D01111c4b7036966"),
  pulsechain: getAddress("0x11ee2732eD4C6BFe673e7b4BE15ece35D6a8cCD7"),
};

export const DEPOSIT_ADDRESSES: Record<ChainId, `0x${string}`> = {
  bnb: getAddress("0xB081EC0763360a9Ad4D09AF2C9ec7DC1ED5190Ae"),
  pulsechain: getAddress("0xC9565b4f23C301Cf9f158D72A842BA6a53B84590"),
};

export const MAFIA_PAIR_ADDRESSES: Record<ChainId, `0x${string}`> = {
  bnb: getAddress("0xdE6e6378623C4F2c1102F2CcD35507d5bAf7924d"),
  pulsechain: getAddress("0x113bbdfea64b06aebe14a50e00c70149a32973ab"),
};

export const EXCHANGE_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "convertItem",
    inputs: [{ name: "itemIds", type: "uint256[]", internalType: "uint256[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "ItemConverted",
    inputs: [
      { name: "owner", type: "address", indexed: false, internalType: "address" },
      { name: "itemIds", type: "uint256[]", indexed: false, internalType: "uint256[]" },
      { name: "cashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;

export const DEPOSIT_CONTRACT_ABI: Abi = [
  {
    type: "function",
    name: "estimateSwap",
    inputs: [{ name: "mafiaAmount", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

// Exchange Cash values by typeId
export const CASH_VALUES: Record<number, number> = {
  0: 50000,
  1: 150000,
  2: 250000,
  3: 350000,
  4: 500000,
  5: 1000000,
  6: 2500000,
  7: 4000000,
  8: 5000000,
  9: 10000000,
};

// Exchange ShopItem values by typeId
export const SHOPITEM_VALUES: Record<number, number> = {
  0: 12500,
  1: 37500,
  2: 75000,
  3: 37500,
  4: 25000,
  5: 87500,
  6: 62500,
  7: 212500,
  8: 175000,
  9: 750000,
};

// Exchange Credit USD values by typeId
export const CREDIT_USD_VALUES: Record<number, number> = {
  0: 1,
  1: 2.5,
  2: 5,
  3: 10,
  4: 15,
  5: 20,
  6: 25,
  7: 30,
  8: 40,
  9: 75,
};

// Exchange LandSlot USD values by rarity
export const LANDSLOT_USD_VALUES: Record<string, number> = {
  Strategic: 15,
  Elite: 12,
  Upper: 8,
  Common: 4,
};

// Convert item category names
export const CONVERT_CATEGORY_NAMES: Record<number, string> = {
  0: "Cash",
  3: "Shop Item",
  6: "Credit",
  13: "Land Slot",
};

export const MAFIA_BUY_FEE = 4.7;

// ========== XP Market Contract ==========
export const XP_MARKET_ABI: Abi = [
  {
    type: "function",
    name: "listXp",
    inputs: [
      { name: "xpType", type: "uint8", internalType: "uint8" },
      { name: "listingType", type: "uint8", internalType: "uint8" },
      { name: "listingToken", type: "address", internalType: "address" },
      { name: "startPrice", type: "uint256", internalType: "uint256" },
      { name: "duration", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelListing",
    inputs: [{ name: "itemId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "bidOnAuctionItem",
    inputs: [
      { name: "itemId", type: "uint256", internalType: "uint256" },
      { name: "swapTokenId", type: "uint256", internalType: "uint256" },
      { name: "price", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "finishAuctionItem",
    inputs: [{ name: "itemId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getSwapTokens",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct SwapToken[]",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "decimal", type: "uint8", internalType: "uint8" },
          { name: "tokenAddress", type: "address", internalType: "address" },
          { name: "price", type: "uint256", internalType: "uint256" },
          { name: "isStable", type: "bool", internalType: "bool" },
          { name: "isEnabled", type: "bool", internalType: "bool" },
        ],
      },
      { name: "", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getListings",
    inputs: [
      { name: "startIndex", type: "uint256", internalType: "uint256" },
      { name: "length", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct XPMarketListing[]",
        components: [
          { name: "id", type: "uint256", internalType: "uint256" },
          { name: "xpType", type: "uint8", internalType: "uint8" },
          { name: "listingType", type: "uint8", internalType: "uint8" },
          { name: "status", type: "uint8", internalType: "uint8" },
          { name: "xpPoint", type: "uint256", internalType: "uint256" },
          { name: "owner", type: "address", internalType: "address" },
          { name: "buyer", type: "address", internalType: "address" },
          { name: "startPrice", type: "uint256", internalType: "uint256" },
          { name: "currentPrice", type: "uint256", internalType: "uint256" },
          { name: "endTimestamp", type: "uint256", internalType: "uint256" },
          { name: "listingToken", type: "address", internalType: "address" },
          {
            name: "bids",
            type: "tuple[]",
            internalType: "struct XPBid[]",
            components: [
              { name: "bidder", type: "address", internalType: "address" },
              { name: "price", type: "uint256", internalType: "uint256" },
              { name: "timestamp", type: "uint256", internalType: "uint256" },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listingCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
];

// ========== Inventory Marketplace Contract ==========
export const INVENTORY_MARKETPLACE_ABI: Abi = [
  {
    type: "function",
    name: "bidOnAuctionItem",
    inputs: [
      { name: "listingId", type: "uint256", internalType: "uint256" },
      { name: "swapTokenId", type: "uint256", internalType: "uint256" },
      { name: "price", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "cancelListing",
    inputs: [{ name: "listingId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createListing",
    inputs: [
      { name: "itemId", type: "uint256", internalType: "uint256" },
      { name: "startingPrice", type: "uint256", internalType: "uint256" },
      { name: "listingType", type: "uint256", internalType: "uint256" },
      { name: "listingToken", type: "address", internalType: "address" },
      { name: "duration", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "finishAuctionItem",
    inputs: [{ name: "listingId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "purchaseFixedItem",
    inputs: [
      { name: "listingId", type: "uint256", internalType: "uint256" },
      { name: "swapTokenId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getActiveListingCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveListings",
    inputs: [
      { name: "startIndex", type: "uint256", internalType: "uint256" },
      { name: "pageSize", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "list",
        type: "tuple[]",
        internalType: "struct MafiaInventoryMarketplace.Listing[]",
        components: [
          { name: "itemId", type: "uint256", internalType: "uint256" },
          { name: "listingType", type: "uint256", internalType: "uint256" },
          { name: "startingPrice", type: "uint256", internalType: "uint256" },
          { name: "currentPrice", type: "uint256", internalType: "uint256" },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
          { name: "expiresAt", type: "uint256", internalType: "uint256" },
          { name: "token", type: "address", internalType: "address" },
          { name: "seller", type: "address", internalType: "address" },
          { name: "buyer", type: "address", internalType: "address" },
          { name: "status", type: "uint256", internalType: "uint256" },
          {
            name: "bids",
            type: "tuple[]",
            internalType: "struct MafiaInventoryMarketplace.Bid[]",
            components: [
              { name: "buyer", type: "address", internalType: "address" },
              { name: "price", type: "uint256", internalType: "uint256" },
              { name: "amount", type: "uint256", internalType: "uint256" },
              { name: "timestamp", type: "uint256", internalType: "uint256" },
            ],
          },
        ],
      },
      { name: "ids", type: "uint256[]", internalType: "uint256[]" },
      {
        name: "items",
        type: "tuple[]",
        internalType: "struct IMafiaInventory.Item[]",
        components: [
          { name: "categoryId", type: "uint256", internalType: "uint256" },
          { name: "typeId", type: "uint256", internalType: "uint256" },
          { name: "owner", type: "address", internalType: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getListingInfo",
    inputs: [{ name: "listingId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct MafiaInventoryMarketplace.Listing",
        components: [
          { name: "itemId", type: "uint256", internalType: "uint256" },
          { name: "listingType", type: "uint256", internalType: "uint256" },
          { name: "startingPrice", type: "uint256", internalType: "uint256" },
          { name: "currentPrice", type: "uint256", internalType: "uint256" },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
          { name: "expiresAt", type: "uint256", internalType: "uint256" },
          { name: "token", type: "address", internalType: "address" },
          { name: "seller", type: "address", internalType: "address" },
          { name: "buyer", type: "address", internalType: "address" },
          { name: "status", type: "uint256", internalType: "uint256" },
          {
            name: "bids",
            type: "tuple[]",
            internalType: "struct MafiaInventoryMarketplace.Bid[]",
            components: [
              { name: "buyer", type: "address", internalType: "address" },
              { name: "price", type: "uint256", internalType: "uint256" },
              { name: "amount", type: "uint256", internalType: "uint256" },
              { name: "timestamp", type: "uint256", internalType: "uint256" },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSwapTokens",
    inputs: [],
    outputs: [
      {
        name: "list",
        type: "tuple[]",
        internalType: "struct MafiaInventoryMarketplace.SwapToken[]",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "decimal", type: "uint8", internalType: "uint8" },
          { name: "tokenAddress", type: "address", internalType: "address" },
          { name: "isStable", type: "bool", internalType: "bool" },
          { name: "isEnabled", type: "bool", internalType: "bool" },
        ],
      },
      { name: "prices", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
];

// ========== Inventory Marketplace Item Names ==========
export const MARKETPLACE_CATEGORY_NAMES: Record<number, string> = {
  0: "Cash",
  1: "Bullet",
  2: "Health",
  3: "ShopItem",
  4: "Business",
  5: "Bodyguards",
  6: "Helper Credits",
  7: "Car",
  8: "Wrapped NFTs",
  9: "Keys",
  10: "MAFIA",
  11: "OG NFTs",
  12: "Noti Credits",
  13: "Land Slot",
  14: "Business",
  15: "Car",
  16: "FBI Assets",
  17: "Perk Box",
  33: "Map Yield Boost",
  34: "Race XP Boost",
  35: "Kill Skill XP Boost",
  36: "Bust Out XP Boost",
  37: "Narcotics Sales Price Boost",
  38: "Booze Sales Price Boost",
  39: "Worth Boost",
  40: "Crime Rewards Boost",
  41: "Double Purchase",
  42: "No Jail Time",
  43: "Free Travel",
  44: "Bank Fee Reduction",
  45: "Credit Cost Reduction",
  46: "Increased Conversion Rate",
  47: "Credit Spend Reduction",
  48: "Bodyguard Johnny",
  49: "Bodyguard Jim",
  50: "Bodyguard Sam",
  51: "Bodyguard Frank",
  52: "Subscription Item",
  53: "GI Credit",
  54: "Mystery Box",
  55: "Booze Pack",
  56: "Narcotics Pack",
};

export const MARKETPLACE_ITEM_NAMES: Record<number, Record<number, string>> = {
  0: { // Cash
    0: "$50,000", 1: "$150,000", 2: "$250,000", 3: "$350,000", 4: "$500,000",
    5: "$1,000,000", 6: "$2,500,000", 7: "$4,000,000", 8: "$5,000,000", 9: "$10,000,000",
  },
  1: { // Bullet
    0: "250 Bullets", 1: "500 Bullets", 2: "750 Bullets", 3: "1,500 Bullets", 4: "3,500 Bullets",
    5: "5,000 Bullets", 6: "7,000 Bullets", 7: "15,000 Bullets", 8: "20,000 Bullets", 9: "30,000 Bullets",
  },
  2: { // Health
    0: "50 Health", 1: "100 Health", 2: "150 Health", 3: "200 Health", 4: "250 Health",
    5: "300 Health", 6: "350 Health", 7: "500 Health", 8: "750 Health", 9: "1,000 Health",
  },
  3: { // ShopItem
    0: "Hand Gun Colt", 1: "Remington", 2: "Thompson", 3: "Molotov cocktail", 4: "Grenade",
    5: "Motorcycle", 6: "Bullet proof vest", 7: "Bullet proof suit", 8: "Armored car", 9: "Douglas M-3",
  },
  4: { // Business
    0: "Car crusher", 1: "Gunstore", 2: "Bank", 3: "Hospital", 4: "Detective Agency",
    5: "Booze warehouse", 6: "Narcotics warehouse", 7: "Slotmachine", 8: "Roulette", 9: "Bullet factory",
  },
  5: { // Bodyguards (legacy)
    0: "Lvl 3 - Johnny", 1: "Lvl 3 - Jim", 2: "Lvl 3 - Sam", 3: "Lvl 5 - Johnny", 4: "Lvl 6 - Jim",
    5: "Lvl 6 - Sam", 6: "Lvl 7 - Frank", 7: "Lvl 8 - Johnny", 8: "Lvl 10 - Sam", 9: "Lvl 10 - Frank",
  },
  6: { // Helper Credits
    0: "100 Helper Credits", 1: "250 Helper Credits", 2: "500 Helper Credits", 3: "1,000 Helper Credits",
    4: "1,500 Helper Credits", 5: "2,000 Helper Credits", 6: "2,500 Helper Credits",
    7: "3,000 Helper Credits", 8: "3,500 Helper Credits", 9: "5,000 Helper Credits",
  },
  7: { // Car
    0: "$5,000 Car", 1: "$15,000 Car", 2: "$35,000 Car", 3: "$75,000 Car", 4: "$100,000 Car",
    5: "$150,000 Car", 6: "$250,000 Car", 7: "$350,000 Car", 8: "$450,000 Car", 9: "$500,000 Car",
  },
  8: { // Wrapped NFTs
    0: "Game Key", 1: "Game OG",
  },
  9: { // Keys
    0: "1 Game Key", 1: "3 Game Keys", 2: "5 Game Keys", 3: "7 Game Keys", 4: "10 Game Keys",
    5: "15 Game Keys", 6: "25 Game Keys", 7: "50 Game Keys", 8: "75 Game Keys", 9: "100 Game Keys",
  },
  10: { // MAFIA
    0: "10,000 MAFIA", 1: "15,000 MAFIA", 2: "20,000 MAFIA", 3: "30,000 MAFIA", 4: "50,000 MAFIA",
    5: "100,000 MAFIA", 6: "250,000 MAFIA", 7: "500,000 MAFIA", 8: "1,000,000 MAFIA", 9: "5,000,000 MAFIA",
  },
  11: { // OG NFTs
    0: "1 OG NFT", 1: "1 OG NFT", 2: "1 OG NFT", 3: "1 OG NFT", 4: "1 OG NFT",
    5: "1 OG NFT", 6: "3 OG NFTs", 7: "3 OG NFTs", 8: "7 OG NFTs", 9: "10 OG NFTs",
  },
  12: { // Noti Credits
    0: "1 Noti Credit", 1: "1 Noti Credit", 2: "1 Noti Credit", 3: "1 Noti Credit", 4: "1 Noti Credit",
    5: "1 Noti Credit", 6: "3 Noti Credits", 7: "3 Noti Credits", 8: "7 Noti Credits", 9: "10 Noti Credits",
  },
  13: { // Land Slot
    0: "Land Slot",
  },
  14: { // Business (v2)
    0: "Jackpot hall", 1: "Lottery hall", 2: "Bank", 3: "Hospital", 4: "Detective Agency",
    5: "Booze warehouse", 6: "Narcotics warehouse", 7: "Slotmachine", 8: "Roulette", 9: "Bullet factory",
  },
  // Category 15 = Car (Dynamic from CarsList - handled separately)
  16: { // FBI Assets
    0: "FBI Training Pass", 1: "Detective Badge", 2: "Special Agent badge", 3: "FBI Field office",
  },
  17: { // Perk Box
    0: "1 Perk Box", 1: "3 Perk Boxes", 2: "5 Perk Boxes", 3: "7 Perk Boxes", 4: "10 Perk Boxes",
    5: "15 Perk Boxes", 6: "25 Perk Boxes", 7: "50 Perk Boxes", 8: "75 Perk Boxes", 9: "100 Perk Boxes",
  },

  18: {
    0: "Crime Success +100% for 6 hours", 1: "Crime Success +100% for 12 hours", 2: "Crime Success +100% for 24 hours", 3: "Crime Success +100% for 48 hours", 4: "Crime Success +100% for 72 hours", 5: "Crime Success +100% for 96 hours",
    6: "Crime Success +75% for 6 hours", 7: "Crime Success +75% for 12 hours", 8: "Crime Success +75% for 24 hours", 9: "Crime Success +75% for 48 hours", 10: "Crime Success +75% for 72 hours", 11: "Crime Success +75% for 96 hours",
    12: "Crime Success +50% for 6 hours", 13: "Crime Success +50% for 12 hours", 14: "Crime Success +50% for 24 hours", 15: "Crime Success +50% for 48 hours", 16: "Crime Success +50% for 72 hours", 17: "Crime Success +50% for 96 hours",
  },
  19: {
    0: "Nick a car Success +100% for 6 hours", 1: "Nick a car Success +100% for 12 hours", 2: "Nick a car Success +100% for 24 hours", 3: "Nick a car Success +100% for 48 hours", 4: "Nick a car Success +100% for 72 hours", 5: "Nick a car Success +100% for 96 hours",
    6: "Nick a car Success +75% for 6 hours", 7: "Nick a car Success +75% for 12 hours", 8: "Nick a car Success +75% for 24 hours", 9: "Nick a car Success +75% for 48 hours", 10: "Nick a car Success +75% for 72 hours", 11: "Nick a car Success +75% for 96 hours",
    12: "Nick a car Success +50% for 6 hours", 13: "Nick a car Success +50% for 12 hours", 14: "Nick a car Success +50% for 24 hours", 15: "Nick a car Success +50% for 48 hours", 16: "Nick a car Success +50% for 72 hours", 17: "Nick a car Success +50% for 96 hours",
  },
  20: {
    0: "Booze Success +100% for 6 hours", 1: "Booze Success +100% for 12 hours", 2: "Booze Success +100% for 24 hours", 3: "Booze Success +100% for 48 hours", 4: "Booze Success +100% for 72 hours", 5: "Booze Success +100% for 96 hours",
    6: "Booze Success +75% for 6 hours", 7: "Booze Success +75% for 12 hours", 8: "Booze Success +75% for 24 hours", 9: "Booze Success +75% for 48 hours", 10: "Booze Success +75% for 72 hours", 11: "Booze Success +75% for 96 hours",
    12: "Booze Success +50% for 6 hours", 13: "Booze Success +50% for 12 hours", 14: "Booze Success +50% for 24 hours", 15: "Booze Success +50% for 48 hours", 16: "Booze Success +50% for 72 hours", 17: "Booze Success +50% for 96 hours",
  },
  21: {
    0: "Narcotics Success +100% for 6 hours", 1: "Narcotics Success +100% for 12 hours", 2: "Narcotics Success +100% for 24 hours", 3: "Narcotics Success +100% for 48 hours", 4: "Narcotics Success +100% for 72 hours", 5: "Narcotics Success +100% for 96 hours",
    6: "Narcotics Success +75% for 6 hours", 7: "Narcotics Success +75% for 12 hours", 8: "Narcotics Success +75% for 24 hours", 9: "Narcotics Success +75% for 48 hours", 10: "Narcotics Success +75% for 72 hours", 11: "Narcotics Success +75% for 96 hours",
    12: "Narcotics Success +50% for 6 hours", 13: "Narcotics Success +50% for 12 hours", 14: "Narcotics Success +50% for 24 hours", 15: "Narcotics Success +50% for 48 hours", 16: "Narcotics Success +50% for 72 hours", 17: "Narcotics Success +50% for 96 hours",
  },
  22: {
    0: "Kill skill Success +100% for 6 hours", 1: "Kill skill Success +100% for 12 hours", 2: "Kill skill Success +100% for 24 hours", 3: "Kill skill Success +100% for 48 hours", 4: "Kill skill Success +100% for 72 hours", 5: "Kill skill Success +100% for 96 hours",
    6: "Kill skill Success +75% for 6 hours", 7: "Kill skill Success +75% for 12 hours", 8: "Kill skill Success +75% for 24 hours", 9: "Kill skill Success +75% for 48 hours", 10: "Kill skill Success +75% for 72 hours", 11: "Kill skill Success +75% for 96 hours",
    12: "Kill skill Success +50% for 6 hours", 13: "Kill skill Success +50% for 12 hours", 14: "Kill skill Success +50% for 24 hours", 15: "Kill skill Success +50% for 48 hours", 16: "Kill skill Success +50% for 72 hours", 17: "Kill skill Success +50% for 96 hours",
  },
  23: {
    0: "Bust out Success +100% for 6 hours", 1: "Bust out Success +100% for 12 hours", 2: "Bust out Success +100% for 24 hours", 3: "Bust out Success +100% for 48 hours", 4: "Bust out Success +100% for 72 hours", 5: "Bust out Success +100% for 96 hours",
    6: "Bust out Success +75% for 6 hours", 7: "Bust out Success +75% for 12 hours", 8: "Bust out Success +75% for 24 hours", 9: "Bust out Success +75% for 48 hours", 10: "Bust out Success +75% for 72 hours", 11: "Bust out Success +75% for 96 hours",
    12: "Bust out Success +50% for 6 hours", 13: "Bust out Success +50% for 12 hours", 14: "Bust out Success +50% for 24 hours", 15: "Bust out Success +50% for 48 hours", 16: "Bust out Success +50% for 72 hours", 17: "Bust out Success +50% for 96 hours",
  },
  24: {
    0: "Crime Cooldown -90% for 6 hours", 1: "Crime Cooldown -90% for 12 hours", 2: "Crime Cooldown -90% for 24 hours", 3: "Crime Cooldown -90% for 48 hours", 4: "Crime Cooldown -90% for 72 hours", 5: "Crime Cooldown -90% for 96 hours",
    6: "Crime Cooldown -75% for 6 hours", 7: "Crime Cooldown -75% for 12 hours", 8: "Crime Cooldown -75% for 24 hours", 9: "Crime Cooldown -75% for 48 hours", 10: "Crime Cooldown -75% for 72 hours", 11: "Crime Cooldown -75% for 96 hours",
    12: "Crime Cooldown -50% for 6 hours", 13: "Crime Cooldown -50% for 12 hours", 14: "Crime Cooldown -50% for 24 hours", 15: "Crime Cooldown -50% for 48 hours", 16: "Crime Cooldown -50% for 72 hours", 17: "Crime Cooldown -50% for 96 hours",
  },
  25: {
    0: "Nick a car Cooldown -90% for 6 hours", 1: "Nick a car Cooldown -90% for 12 hours", 2: "Nick a car Cooldown -90% for 24 hours", 3: "Nick a car Cooldown -90% for 48 hours", 4: "Nick a car Cooldown -90% for 72 hours", 5: "Nick a car Cooldown -90% for 96 hours",
    6: "Nick a car Cooldown -75% for 6 hours", 7: "Nick a car Cooldown -75% for 12 hours", 8: "Nick a car Cooldown -75% for 24 hours", 9: "Nick a car Cooldown -75% for 48 hours", 10: "Nick a car Cooldown -75% for 72 hours", 11: "Nick a car Cooldown -75% for 96 hours",
    12: "Nick a car Cooldown -50% for 6 hours", 13: "Nick a car Cooldown -50% for 12 hours", 14: "Nick a car Cooldown -50% for 24 hours", 15: "Nick a car Cooldown -50% for 48 hours", 16: "Nick a car Cooldown -50% for 72 hours", 17: "Nick a car Cooldown -50% for 96 hours",
  },
  26: {
    0: "Booze Cooldown -90% for 6 hours", 1: "Booze Cooldown -90% for 12 hours", 2: "Booze Cooldown -90% for 24 hours", 3: "Booze Cooldown -90% for 48 hours", 4: "Booze Cooldown -90% for 72 hours", 5: "Booze Cooldown -90% for 96 hours",
    6: "Booze Cooldown -75% for 6 hours", 7: "Booze Cooldown -75% for 12 hours", 8: "Booze Cooldown -75% for 24 hours", 9: "Booze Cooldown -75% for 48 hours", 10: "Booze Cooldown -75% for 72 hours", 11: "Booze Cooldown -75% for 96 hours",
    12: "Booze Cooldown -50% for 6 hours", 13: "Booze Cooldown -50% for 12 hours", 14: "Booze Cooldown -50% for 24 hours", 15: "Booze Cooldown -50% for 48 hours", 16: "Booze Cooldown -50% for 72 hours", 17: "Booze Cooldown -50% for 96 hours",
  },
  27: {
    0: "Narcotics Cooldown -90% for 6 hours", 1: "Narcotics Cooldown -90% for 12 hours", 2: "Narcotics Cooldown -90% for 24 hours", 3: "Narcotics Cooldown -90% for 48 hours", 4: "Narcotics Cooldown -90% for 72 hours", 5: "Narcotics Cooldown -90% for 96 hours",
    6: "Narcotics Cooldown -75% for 6 hours", 7: "Narcotics Cooldown -75% for 12 hours", 8: "Narcotics Cooldown -75% for 24 hours", 9: "Narcotics Cooldown -75% for 48 hours", 10: "Narcotics Cooldown -75% for 72 hours", 11: "Narcotics Cooldown -75% for 96 hours",
    12: "Narcotics Cooldown -50% for 6 hours", 13: "Narcotics Cooldown -50% for 12 hours", 14: "Narcotics Cooldown -50% for 24 hours", 15: "Narcotics Cooldown -50% for 48 hours", 16: "Narcotics Cooldown -50% for 72 hours", 17: "Narcotics Cooldown -50% for 96 hours",
  },
  28: {
    0: "Kill skill Cooldown -90% for 6 hours", 1: "Kill skill Cooldown -90% for 12 hours", 2: "Kill skill Cooldown -90% for 24 hours", 3: "Kill skill Cooldown -90% for 48 hours", 4: "Kill skill Cooldown -90% for 72 hours", 5: "Kill skill Cooldown -90% for 96 hours",
    6: "Kill skill Cooldown -75% for 6 hours", 7: "Kill skill Cooldown -75% for 12 hours", 8: "Kill skill Cooldown -75% for 24 hours", 9: "Kill skill Cooldown -75% for 48 hours", 10: "Kill skill Cooldown -75% for 72 hours", 11: "Kill skill Cooldown -75% for 96 hours",
    12: "Kill skill Cooldown -50% for 6 hours", 13: "Kill skill Cooldown -50% for 12 hours", 14: "Kill skill Cooldown -50% for 24 hours", 15: "Kill skill Cooldown -50% for 48 hours", 16: "Kill skill Cooldown -50% for 72 hours", 17: "Kill skill Cooldown -50% for 96 hours",
  },
  29: {
    0: "Travel Cooldown -90% for 6 hours", 1: "Travel Cooldown -90% for 12 hours", 2: "Travel Cooldown -90% for 24 hours", 3: "Travel Cooldown -90% for 48 hours", 4: "Travel Cooldown -90% for 72 hours", 5: "Travel Cooldown -90% for 96 hours",
    6: "Travel Cooldown -75% for 6 hours", 7: "Travel Cooldown -75% for 12 hours", 8: "Travel Cooldown -75% for 24 hours", 9: "Travel Cooldown -75% for 48 hours", 10: "Travel Cooldown -75% for 72 hours", 11: "Travel Cooldown -75% for 96 hours",
    12: "Travel Cooldown -50% for 6 hours", 13: "Travel Cooldown -50% for 12 hours", 14: "Travel Cooldown -50% for 24 hours", 15: "Travel Cooldown -50% for 48 hours", 16: "Travel Cooldown -50% for 72 hours", 17: "Travel Cooldown -50% for 96 hours",
  },
  30: {
    0: "Bullet Buy Cooldown -90% for 6 hours", 1: "Bullet Buy Cooldown -90% for 12 hours", 2: "Bullet Buy Cooldown -90% for 24 hours", 3: "Bullet Buy Cooldown -90% for 48 hours", 4: "Bullet Buy Cooldown -90% for 72 hours", 5: "Bullet Buy Cooldown -90% for 96 hours",
    6: "Bullet Buy Cooldown -75% for 6 hours", 7: "Bullet Buy Cooldown -75% for 12 hours", 8: "Bullet Buy Cooldown -75% for 24 hours", 9: "Bullet Buy Cooldown -75% for 48 hours", 10: "Bullet Buy Cooldown -75% for 72 hours", 11: "Bullet Buy Cooldown -75% for 96 hours",
    12: "Bullet Buy Cooldown -50% for 6 hours", 13: "Bullet Buy Cooldown -50% for 12 hours", 14: "Bullet Buy Cooldown -50% for 24 hours", 15: "Bullet Buy Cooldown -50% for 48 hours", 16: "Bullet Buy Cooldown -50% for 72 hours", 17: "Bullet Buy Cooldown -50% for 96 hours",
  },
  31: {
    0: "Health Buy Cooldown -90% for 6 hours", 1: "Health Buy Cooldown -90% for 12 hours", 2: "Health Buy Cooldown -90% for 24 hours", 3: "Health Buy Cooldown -90% for 48 hours", 4: "Health Buy Cooldown -90% for 72 hours", 5: "Health Buy Cooldown -90% for 96 hours",
    6: "Health Buy Cooldown -75% for 6 hours", 7: "Health Buy Cooldown -75% for 12 hours", 8: "Health Buy Cooldown -75% for 24 hours", 9: "Health Buy Cooldown -75% for 48 hours", 10: "Health Buy Cooldown -75% for 72 hours", 11: "Health Buy Cooldown -75% for 96 hours",
    12: "Health Buy Cooldown -50% for 6 hours", 13: "Health Buy Cooldown -50% for 12 hours", 14: "Health Buy Cooldown -50% for 24 hours", 15: "Health Buy Cooldown -50% for 48 hours", 16: "Health Buy Cooldown -50% for 72 hours", 17: "Health Buy Cooldown -50% for 96 hours",
  },
  32: {
    0: "Bust out Cooldown -90% for 6 hours", 1: "Bust out Cooldown -90% for 12 hours", 2: "Bust out Cooldown -90% for 24 hours", 3: "Bust out Cooldown -90% for 48 hours", 4: "Bust out Cooldown -90% for 72 hours", 5: "Bust out Cooldown -90% for 96 hours",
    6: "Bust out Cooldown -75% for 6 hours", 7: "Bust out Cooldown -75% for 12 hours", 8: "Bust out Cooldown -75% for 24 hours", 9: "Bust out Cooldown -75% for 48 hours", 10: "Bust out Cooldown -75% for 72 hours", 11: "Bust out Cooldown -75% for 96 hours",
    12: "Bust out Cooldown -50% for 6 hours", 13: "Bust out Cooldown -50% for 12 hours", 14: "Bust out Cooldown -50% for 24 hours", 15: "Bust out Cooldown -50% for 48 hours", 16: "Bust out Cooldown -50% for 72 hours", 17: "Bust out Cooldown -50% for 96 hours",
  },
  // Perk Items (categoryId 33-47)
  33: { // Map Yield Boost
    0: "Map Yield Boost +100% for 6 hours", 1: "Map Yield Boost +100% for 12 hours", 2: "Map Yield Boost +100% for 24 hours", 3: "Map Yield Boost +100% for 48 hours", 4: "Map Yield Boost +100% for 72 hours", 5: "Map Yield Boost +100% for 96 hours",
    6: "Map Yield Boost +75% for 6 hours", 7: "Map Yield Boost +75% for 12 hours", 8: "Map Yield Boost +75% for 24 hours", 9: "Map Yield Boost +75% for 48 hours", 10: "Map Yield Boost +75% for 72 hours", 11: "Map Yield Boost +75% for 96 hours",
    12: "Map Yield Boost +50% for 6 hours", 13: "Map Yield Boost +50% for 12 hours", 14: "Map Yield Boost +50% for 24 hours", 15: "Map Yield Boost +50% for 48 hours", 16: "Map Yield Boost +50% for 72 hours", 17: "Map Yield Boost +50% for 96 hours",
    18: "Map Yield Boost +25% for 6 hours", 19: "Map Yield Boost +25% for 12 hours", 20: "Map Yield Boost +25% for 24 hours", 21: "Map Yield Boost +25% for 48 hours", 22: "Map Yield Boost +25% for 72 hours", 23: "Map Yield Boost +25% for 96 hours",
  },
  34: { // Race XP Boost
    0: "Race XP Boost +100% for 6 hours", 1: "Race XP Boost +100% for 12 hours", 2: "Race XP Boost +100% for 24 hours", 3: "Race XP Boost +100% for 48 hours", 4: "Race XP Boost +100% for 72 hours", 5: "Race XP Boost +100% for 96 hours",
    6: "Race XP Boost +75% for 6 hours", 7: "Race XP Boost +75% for 12 hours", 8: "Race XP Boost +75% for 24 hours", 9: "Race XP Boost +75% for 48 hours", 10: "Race XP Boost +75% for 72 hours", 11: "Race XP Boost +75% for 96 hours",
    12: "Race XP Boost +50% for 6 hours", 13: "Race XP Boost +50% for 12 hours", 14: "Race XP Boost +50% for 24 hours", 15: "Race XP Boost +50% for 48 hours", 16: "Race XP Boost +50% for 72 hours", 17: "Race XP Boost +50% for 96 hours",
    18: "Race XP Boost +25% for 6 hours", 19: "Race XP Boost +25% for 12 hours", 20: "Race XP Boost +25% for 24 hours", 21: "Race XP Boost +25% for 48 hours", 22: "Race XP Boost +25% for 72 hours", 23: "Race XP Boost +25% for 96 hours",
  },
  35: { // Kill Skill XP Boost
    0: "Kill Skill XP Boost +100% for 6 hours", 1: "Kill Skill XP Boost +100% for 12 hours", 2: "Kill Skill XP Boost +100% for 24 hours", 3: "Kill Skill XP Boost +100% for 48 hours", 4: "Kill Skill XP Boost +100% for 72 hours", 5: "Kill Skill XP Boost +100% for 96 hours",
    6: "Kill Skill XP Boost +75% for 6 hours", 7: "Kill Skill XP Boost +75% for 12 hours", 8: "Kill Skill XP Boost +75% for 24 hours", 9: "Kill Skill XP Boost +75% for 48 hours", 10: "Kill Skill XP Boost +75% for 72 hours", 11: "Kill Skill XP Boost +75% for 96 hours",
    12: "Kill Skill XP Boost +50% for 6 hours", 13: "Kill Skill XP Boost +50% for 12 hours", 14: "Kill Skill XP Boost +50% for 24 hours", 15: "Kill Skill XP Boost +50% for 48 hours", 16: "Kill Skill XP Boost +50% for 72 hours", 17: "Kill Skill XP Boost +50% for 96 hours",
    18: "Kill Skill XP Boost +25% for 6 hours", 19: "Kill Skill XP Boost +25% for 12 hours", 20: "Kill Skill XP Boost +25% for 24 hours", 21: "Kill Skill XP Boost +25% for 48 hours", 22: "Kill Skill XP Boost +25% for 72 hours", 23: "Kill Skill XP Boost +25% for 96 hours",
  },
  36: { // Bust Out XP Boost
    0: "Bust Out XP Boost +100% for 6 hours", 1: "Bust Out XP Boost +100% for 12 hours", 2: "Bust Out XP Boost +100% for 24 hours", 3: "Bust Out XP Boost +100% for 48 hours", 4: "Bust Out XP Boost +100% for 72 hours", 5: "Bust Out XP Boost +100% for 96 hours",
    6: "Bust Out XP Boost +75% for 6 hours", 7: "Bust Out XP Boost +75% for 12 hours", 8: "Bust Out XP Boost +75% for 24 hours", 9: "Bust Out XP Boost +75% for 48 hours", 10: "Bust Out XP Boost +75% for 72 hours", 11: "Bust Out XP Boost +75% for 96 hours",
    12: "Bust Out XP Boost +50% for 6 hours", 13: "Bust Out XP Boost +50% for 12 hours", 14: "Bust Out XP Boost +50% for 24 hours", 15: "Bust Out XP Boost +50% for 48 hours", 16: "Bust Out XP Boost +50% for 72 hours", 17: "Bust Out XP Boost +50% for 96 hours",
    18: "Bust Out XP Boost +25% for 6 hours", 19: "Bust Out XP Boost +25% for 12 hours", 20: "Bust Out XP Boost +25% for 24 hours", 21: "Bust Out XP Boost +25% for 48 hours", 22: "Bust Out XP Boost +25% for 72 hours", 23: "Bust Out XP Boost +25% for 96 hours",
  },
  37: { // Narcotics Sales Price Boost
    0: "Narcotics Sales Price Boost +100% for 6 hours", 1: "Narcotics Sales Price Boost +100% for 12 hours", 2: "Narcotics Sales Price Boost +100% for 24 hours", 3: "Narcotics Sales Price Boost +100% for 48 hours", 4: "Narcotics Sales Price Boost +100% for 72 hours", 5: "Narcotics Sales Price Boost +100% for 96 hours",
    6: "Narcotics Sales Price Boost +75% for 6 hours", 7: "Narcotics Sales Price Boost +75% for 12 hours", 8: "Narcotics Sales Price Boost +75% for 24 hours", 9: "Narcotics Sales Price Boost +75% for 48 hours", 10: "Narcotics Sales Price Boost +75% for 72 hours", 11: "Narcotics Sales Price Boost +75% for 96 hours",
    12: "Narcotics Sales Price Boost +50% for 6 hours", 13: "Narcotics Sales Price Boost +50% for 12 hours", 14: "Narcotics Sales Price Boost +50% for 24 hours", 15: "Narcotics Sales Price Boost +50% for 48 hours", 16: "Narcotics Sales Price Boost +50% for 72 hours", 17: "Narcotics Sales Price Boost +50% for 96 hours",
    18: "Narcotics Sales Price Boost +25% for 6 hours", 19: "Narcotics Sales Price Boost +25% for 12 hours", 20: "Narcotics Sales Price Boost +25% for 24 hours", 21: "Narcotics Sales Price Boost +25% for 48 hours", 22: "Narcotics Sales Price Boost +25% for 72 hours", 23: "Narcotics Sales Price Boost +25% for 96 hours",
  },
  38: { // Booze Sales Price Boost
    0: "Booze Sales Price Boost +100% for 6 hours", 1: "Booze Sales Price Boost +100% for 12 hours", 2: "Booze Sales Price Boost +100% for 24 hours", 3: "Booze Sales Price Boost +100% for 48 hours", 4: "Booze Sales Price Boost +100% for 72 hours", 5: "Booze Sales Price Boost +100% for 96 hours",
    6: "Booze Sales Price Boost +75% for 6 hours", 7: "Booze Sales Price Boost +75% for 12 hours", 8: "Booze Sales Price Boost +75% for 24 hours", 9: "Booze Sales Price Boost +75% for 48 hours", 10: "Booze Sales Price Boost +75% for 72 hours", 11: "Booze Sales Price Boost +75% for 96 hours",
    12: "Booze Sales Price Boost +50% for 6 hours", 13: "Booze Sales Price Boost +50% for 12 hours", 14: "Booze Sales Price Boost +50% for 24 hours", 15: "Booze Sales Price Boost +50% for 48 hours", 16: "Booze Sales Price Boost +50% for 72 hours", 17: "Booze Sales Price Boost +50% for 96 hours",
    18: "Booze Sales Price Boost +25% for 6 hours", 19: "Booze Sales Price Boost +25% for 12 hours", 20: "Booze Sales Price Boost +25% for 24 hours", 21: "Booze Sales Price Boost +25% for 48 hours", 22: "Booze Sales Price Boost +25% for 72 hours", 23: "Booze Sales Price Boost +25% for 96 hours",
  },
  39: { // Worth Boost
    0: "Worth Boost +100% for 6 hours", 1: "Worth Boost +100% for 12 hours", 2: "Worth Boost +100% for 24 hours", 3: "Worth Boost +100% for 48 hours", 4: "Worth Boost +100% for 72 hours", 5: "Worth Boost +100% for 96 hours",
    6: "Worth Boost +75% for 6 hours", 7: "Worth Boost +75% for 12 hours", 8: "Worth Boost +75% for 24 hours", 9: "Worth Boost +75% for 48 hours", 10: "Worth Boost +75% for 72 hours", 11: "Worth Boost +75% for 96 hours",
    12: "Worth Boost +50% for 6 hours", 13: "Worth Boost +50% for 12 hours", 14: "Worth Boost +50% for 24 hours", 15: "Worth Boost +50% for 48 hours", 16: "Worth Boost +50% for 72 hours", 17: "Worth Boost +50% for 96 hours",
    18: "Worth Boost +25% for 6 hours", 19: "Worth Boost +25% for 12 hours", 20: "Worth Boost +25% for 24 hours", 21: "Worth Boost +25% for 48 hours", 22: "Worth Boost +25% for 72 hours", 23: "Worth Boost +25% for 96 hours",
  },
  40: { // Crime Rewards Boost
    0: "Crime Rewards Boost +100% for 6 hours", 1: "Crime Rewards Boost +100% for 12 hours", 2: "Crime Rewards Boost +100% for 24 hours", 3: "Crime Rewards Boost +100% for 48 hours", 4: "Crime Rewards Boost +100% for 72 hours", 5: "Crime Rewards Boost +100% for 96 hours",
    6: "Crime Rewards Boost +75% for 6 hours", 7: "Crime Rewards Boost +75% for 12 hours", 8: "Crime Rewards Boost +75% for 24 hours", 9: "Crime Rewards Boost +75% for 48 hours", 10: "Crime Rewards Boost +75% for 72 hours", 11: "Crime Rewards Boost +75% for 96 hours",
    12: "Crime Rewards Boost +50% for 6 hours", 13: "Crime Rewards Boost +50% for 12 hours", 14: "Crime Rewards Boost +50% for 24 hours", 15: "Crime Rewards Boost +50% for 48 hours", 16: "Crime Rewards Boost +50% for 72 hours", 17: "Crime Rewards Boost +50% for 96 hours",
    18: "Crime Rewards Boost +25% for 6 hours", 19: "Crime Rewards Boost +25% for 12 hours", 20: "Crime Rewards Boost +25% for 24 hours", 21: "Crime Rewards Boost +25% for 48 hours", 22: "Crime Rewards Boost +25% for 72 hours", 23: "Crime Rewards Boost +25% for 96 hours",
  },
  41: { // Double Purchase
    0: "Double Purchase for 6 hours", 1: "Double Purchase for 12 hours", 2: "Double Purchase for 24 hours", 3: "Double Purchase for 48 hours", 4: "Double Purchase for 72 hours", 5: "Double Purchase for 96 hours",
  },
  42: { // No Jail Time
    0: "No Jail Time for 6 hours", 1: "No Jail Time for 12 hours", 2: "No Jail Time for 24 hours", 3: "No Jail Time for 48 hours", 4: "No Jail Time for 72 hours", 5: "No Jail Time for 96 hours",
  },
  43: { // Free Travel
    0: "Free Travel for 6 hours", 1: "Free Travel for 12 hours", 2: "Free Travel for 24 hours", 3: "Free Travel for 48 hours", 4: "Free Travel for 72 hours", 5: "Free Travel for 96 hours",
  },
  44: { // Bank Fee Reduction
    0: "Bank Fee Reduction for 6 hours", 1: "Bank Fee Reduction for 12 hours", 2: "Bank Fee Reduction for 24 hours", 3: "Bank Fee Reduction for 48 hours", 4: "Bank Fee Reduction for 72 hours", 5: "Bank Fee Reduction for 96 hours",
  },
  45: { // Credit Cost Reduction
    0: "Credit Cost Reduction for 6 hours", 1: "Credit Cost Reduction for 12 hours", 2: "Credit Cost Reduction for 24 hours", 3: "Credit Cost Reduction for 48 hours", 4: "Credit Cost Reduction for 72 hours", 5: "Credit Cost Reduction for 96 hours",
  },
  46: { // Increased Conversion Rate
    0: "Increased Conversion Rate for 6 hours", 1: "Increased Conversion Rate for 12 hours", 2: "Increased Conversion Rate for 24 hours", 3: "Increased Conversion Rate for 48 hours", 4: "Increased Conversion Rate for 72 hours", 5: "Increased Conversion Rate for 96 hours",
  },
  47: { // Credit Spend Reduction
    0: "Credit Spend Reduction for 6 hours", 1: "Credit Spend Reduction for 12 hours", 2: "Credit Spend Reduction for 24 hours", 3: "Credit Spend Reduction for 48 hours", 4: "Credit Spend Reduction for 72 hours", 5: "Credit Spend Reduction for 96 hours",
  },
  48: { // Bodyguard Johnny
    0: "Lvl 1 - Johnny", 1: "Lvl 2 - Johnny", 2: "Lvl 3 - Johnny", 3: "Lvl 4 - Johnny", 4: "Lvl 5 - Johnny",
    5: "Lvl 6 - Johnny", 6: "Lvl 7 - Johnny", 7: "Lvl 8 - Johnny", 8: "Lvl 9 - Johnny", 9: "Lvl 10 - Johnny",
  },
  49: { // Bodyguard Jim
    0: "Lvl 1 - Jim", 1: "Lvl 2 - Jim", 2: "Lvl 3 - Jim", 3: "Lvl 4 - Jim", 4: "Lvl 5 - Jim",
    5: "Lvl 6 - Jim", 6: "Lvl 7 - Jim", 7: "Lvl 8 - Jim", 8: "Lvl 9 - Jim", 9: "Lvl 10 - Jim",
  },
  50: { // Bodyguard Sam
    0: "Lvl 1 - Sam", 1: "Lvl 2 - Sam", 2: "Lvl 3 - Sam", 3: "Lvl 4 - Sam", 4: "Lvl 5 - Sam",
    5: "Lvl 6 - Sam", 6: "Lvl 7 - Sam", 7: "Lvl 8 - Sam", 8: "Lvl 9 - Sam", 9: "Lvl 10 - Sam",
  },
  51: { // Bodyguard Frank
    0: "Lvl 1 - Frank", 1: "Lvl 2 - Frank", 2: "Lvl 3 - Frank", 3: "Lvl 4 - Frank", 4: "Lvl 5 - Frank",
    5: "Lvl 6 - Frank", 6: "Lvl 7 - Frank", 7: "Lvl 8 - Frank", 8: "Lvl 9 - Frank", 9: "Lvl 10 - Frank",
  },
  52: { // Subscription Item
    0: "1 Month Player+", 1: "1 Month Unlimited", 2: "1 Month Player+", 3: "1 Month Unlimited",
    4: "2 Month Player+", 5: "2 Month Unlimited", 6: "3 Month Player+", 7: "3 Month Unlimited",
    8: "6 Month Player+", 9: "6 Month Unlimited",
  },
  53: { // GI Credit
    0: "3 GI Credits", 1: "4 GI Credits", 2: "5 GI Credits", 3: "7 GI Credits", 4: "10 GI Credits",
    5: "15 GI Credits", 6: "25 GI Credits", 7: "50 GI Credits", 8: "75 GI Credits", 9: "100 GI Credits",
  },
  54: { // Mystery Box
    0: "Mystery Box",
  },
  55: { // Booze Pack
    0: "75 Beer", 1: "75 Wine", 2: "75 Port", 3: "75 Vodka", 4: "75 Whiskey", 5: "75 Cognac", 6: "75 Tequila",
  },
  56: { // Narcotics Pack
    0: "50 Glue", 1: "50 Marijuana", 2: "50 Amphetamine", 3: "50 Cocaine", 4: "50 Morphine", 5: "50 Opium", 6: "50 Heroin",
  },
};

// ========== Race Lobby ABI ==========
export const RACE_LOBBY_ABI: Abi = [
  {
    type: "function",
    name: "getRaces",
    inputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
      { name: "startIndex", type: "uint256", internalType: "uint256" },
      { name: "length", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct MafiaRaceLobby.Race[]",
        components: [
          { name: "id", type: "uint256", internalType: "uint256" },
          { name: "startTime", type: "uint256", internalType: "uint256" },
          { name: "endTime", type: "uint256", internalType: "uint256" },
          { name: "creator", type: "address", internalType: "address" },
          { name: "opponent", type: "address", internalType: "address" },
          { name: "winner", type: "address", internalType: "address" },
          { name: "creatorCarId", type: "uint256", internalType: "uint256" },
          { name: "opponentCarId", type: "uint256", internalType: "uint256" },
          { name: "cashAmount", type: "uint256", internalType: "uint256" },
          { name: "creatorHealthLost", type: "uint256", internalType: "uint256" },
          { name: "opponentHealthLost", type: "uint256", internalType: "uint256" },
          { name: "cityId", type: "uint8", internalType: "uint8" },
          { name: "prizeType", type: "uint8", internalType: "enum MafiaRaceLobby.PrizeType" },
          { name: "result", type: "uint8", internalType: "enum MafiaRaceLobby.RaceResult" },
          { name: "status", type: "uint8", internalType: "enum MafiaRaceLobby.RaceStatus" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRace",
    inputs: [
      { name: "raceId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct MafiaRaceLobby.Race",
        components: [
          { name: "id", type: "uint256", internalType: "uint256" },
          { name: "startTime", type: "uint256", internalType: "uint256" },
          { name: "endTime", type: "uint256", internalType: "uint256" },
          { name: "creator", type: "address", internalType: "address" },
          { name: "opponent", type: "address", internalType: "address" },
          { name: "winner", type: "address", internalType: "address" },
          { name: "creatorCarId", type: "uint256", internalType: "uint256" },
          { name: "opponentCarId", type: "uint256", internalType: "uint256" },
          { name: "cashAmount", type: "uint256", internalType: "uint256" },
          { name: "creatorHealthLost", type: "uint256", internalType: "uint256" },
          { name: "opponentHealthLost", type: "uint256", internalType: "uint256" },
          { name: "cityId", type: "uint8", internalType: "uint8" },
          { name: "prizeType", type: "uint8", internalType: "enum MafiaRaceLobby.PrizeType" },
          { name: "result", type: "uint8", internalType: "enum MafiaRaceLobby.RaceResult" },
          { name: "status", type: "uint8", internalType: "enum MafiaRaceLobby.RaceStatus" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRaceCount",
    inputs: [
      { name: "cityId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createRace",
    inputs: [
      { name: "carId", type: "uint256", internalType: "uint256" },
      { name: "cashAmount", type: "uint256", internalType: "uint256" },
      { name: "prizeType", type: "uint8", internalType: "enum MafiaRaceLobby.PrizeType" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "joinRace",
    inputs: [
      { name: "raceId", type: "uint256", internalType: "uint256" },
      { name: "carId", type: "uint256", internalType: "uint256" },
      { name: "message", type: "string", internalType: "string" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelRace",
    inputs: [
      { name: "raceId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "hasActiveLobby",
    inputs: [
      { name: "account", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gameBank",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "address" },
    ],
    stateMutability: "view",
  },
];
