import { Abi } from "viem";

// Includes all public functions discovered from bytecode analysis
export const CRIME_CONTRACT_ABI: Abi = [
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

// ========== Travel Contract ==========
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
                    { name: "startCity", type: "uint8", internalType: "uint8" },
                    { name: "destinationCity", type: "uint8", internalType: "uint8" },
                    { name: "isTravelling", type: "bool", internalType: "bool" },
                    { name: "travelUntil", type: "uint48", internalType: "uint48" },
                    { name: "itemId", type: "uint256", internalType: "uint256" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "userTravelInfo",
        inputs: [{ name: "account", type: "address", internalType: "address" }],
        outputs: [
            { name: "travelType", type: "uint8", internalType: "uint8" },
            { name: "startCity", type: "uint8", internalType: "uint8" },
            { name: "destinationCity", type: "uint8", internalType: "uint8" },
            { name: "isTravelling", type: "bool", internalType: "bool" },
            { name: "travelUntil", type: "uint48", internalType: "uint48" },
            { name: "itemId", type: "uint256", internalType: "uint256" },
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

// ========== Nick a Car Contract ==========
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

// ========== Kill Skill Contract ==========
export const KILLSKILL_CONTRACT_ABI: Abi = [
    {
        type: "function",
        name: "requestTrainSkill",
        inputs: [
            { name: "trainType", type: "uint8", internalType: "uint8" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "finishTrainSkill",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "trainRequests",
        inputs: [
            { name: "", type: "address", internalType: "address" },
        ],
        outputs: [
            { name: "isPending", type: "bool", internalType: "bool" },
            { name: "trainType", type: "uint8", internalType: "uint8" },
            { name: "requestBlock", type: "uint256", internalType: "uint256" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getTrainNonceStatus",
        inputs: [
            { name: "account", type: "address", internalType: "address" },
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "TrainSkillRequested",
        inputs: [
            { name: "trainer", type: "address", indexed: true, internalType: "address" },
            { name: "trainType", type: "uint8", indexed: false, internalType: "uint8" },
            { name: "requestBlock", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "trainCost", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
        ],
    },
    {
        type: "event",
        name: "TrainedSkill",
        inputs: [
            { name: "trainer", type: "address", indexed: true, internalType: "address" },
            { name: "trainType", type: "uint8", indexed: false, internalType: "uint8" },
            { name: "isSuccess", type: "bool", indexed: false, internalType: "bool" },
            { name: "trainCost", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "xpPoint", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "nextTrainTime", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
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

// ========== BustOutSkill Contract (XP) ==========
export const BUSTOUT_SKILL_ABI: Abi = [
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
] as const;

// ========== Jail Contract ==========
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
