// ABI for the implementation behind the TransparentUpgradeableProxy

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

// ========== InGameCurrency Approval Contract ==========
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
        name: "allowances",
        inputs: [
            { name: "owner", type: "address", internalType: "address" },
            { name: "spender", type: "address", internalType: "address" },
        ],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
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


// ========== Helper Bot Contract ==========
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
    {
        type: "function",
        name: "HELPER_BOT_BULLET_PRICE",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
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
        name: "userBulletBotPlusInfo",
        inputs: [{ name: "user", type: "address", internalType: "address" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct BulletBotPlusInfo",
                components: [
                    { name: "amountModifiedPercent", type: "uint256", internalType: "uint256" },
                    { name: "priceModifiedPercent", type: "uint256", internalType: "uint256" },
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


// ========== Buy Helper Credits Contract ==========
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
    {
        type: "function",
        name: "withdrawBullet",
        inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "decimals",
        inputs: [],
        outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
        stateMutability: "view",
    },
] as const;

// Wallet bullet ERC20: standard transfers + `depositBullet` into in-game balance
export const BULLET_WALLET_TOKEN_ABI: Abi = [
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
    {
        type: "function",
        name: "decimals",
        inputs: [],
        outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "depositBullet",
        inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
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
        name: "lastTransferTime",
        inputs: [{ name: "user", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "cityOwnerFee",
        inputs: [{ name: "", type: "uint8", internalType: "uint8" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
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
    {
        type: "function",
        name: "setCityOwnerFee",
        inputs: [
            { name: "cityId", type: "uint8", internalType: "uint8" },
            { name: "_cityOwnerFee", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
] as const;

// ========== Rank Level Contract ==========
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
        name: "getCityPrices",
        inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
        outputs: [
            { name: "basePrices", type: "uint256[]", internalType: "uint256[]" },
            { name: "onwerPrices", type: "uint256[]", internalType: "uint256[]" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getShopItems",
        inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
        outputs: [
            { name: "categoryIds", type: "uint256[]", internalType: "uint256[]" },
            { name: "typeIds", type: "uint256[]", internalType: "uint256[]" },
            { name: "stockAmounts", type: "uint256[]", internalType: "uint256[]" },
            { name: "prices", type: "uint256[]", internalType: "uint256[]" },
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
        name: "updateCityCostPrice",
        inputs: [
            { name: "cityId", type: "uint8", internalType: "uint8" },
            { name: "prices", type: "uint256[]", internalType: "uint256[]" },
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


export const EXCHANGE_CONTRACT_ABI: Abi = [
    {
        type: "function",
        name: "convertItem",
        inputs: [{ name: "itemIds", type: "uint256[]", internalType: "uint256[]" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "createOTCOffer",
        inputs: [
            { name: "offerItemIds", type: "uint256[]", internalType: "uint256[]" },
            {
                name: "requestItems",
                type: "tuple[]",
                internalType: "struct MafiaExchange.OTCRequestItem[]",
                components: [
                    { name: "itemType", type: "uint256", internalType: "uint256" },
                    { name: "categoryId", type: "uint256", internalType: "uint256" },
                    { name: "typeId", type: "uint256", internalType: "uint256" },
                    { name: "cityId", type: "uint256", internalType: "uint256" },
                    { name: "x", type: "uint256", internalType: "uint256" },
                    { name: "y", type: "uint256", internalType: "uint256" },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "acceptOTCOffer",
        inputs: [
            { name: "offerId", type: "uint256", internalType: "uint256" },
            { name: "myItemIds", type: "uint256[]", internalType: "uint256[]" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "cancelOTCOffer",
        inputs: [{ name: "offerId", type: "uint256", internalType: "uint256" }],
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
    {
        "inputs": [],
        "name": "otcOfferIds",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
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
    {
        type: "function",
        name: "addLiquidity",
        inputs: [
            { name: "cashAmount", type: "uint256", internalType: "uint256" },
            { name: "cashPerMafia", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "removeLiquidity",
        inputs: [
            { name: "liquidityId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "withdrawMafia",
        inputs: [
            { name: "liquidityId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
] as const;


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