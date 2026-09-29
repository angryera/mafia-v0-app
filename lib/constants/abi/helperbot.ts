import { Abi } from "viem";

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
