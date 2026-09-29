import { Abi } from "viem";

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
        name: "nextRaceTime",
        inputs: [
            { name: "account", type: "address", internalType: "address" },
        ],
        outputs: [
            { name: "", type: "uint256", internalType: "uint256" },
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
