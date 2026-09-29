import { Abi } from "viem";

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

export const LOTTERY_HALL_ABI: Abi = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "roundId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "totalUserEntries",
                "type": "uint256"
            }
        ],
        "name": "Entered",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint8",
                "name": "version",
                "type": "uint8"
            }
        ],
        "name": "Initialized",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "roundId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "OwnerWithdrawn",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "roundId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "initialPrize",
                "type": "uint256"
            }
        ],
        "name": "RoundStarted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "roundId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "winnerPrize",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "ownerFee",
                "type": "uint256"
            }
        ],
        "name": "WinnerDrawn",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "currentRoundId",
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
    {
        "inputs": [],
        "name": "drawWinner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "endCurrentRound",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "enter",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "gameBank",
        "outputs": [
            {
                "internalType": "contract IMafiaGameBank",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCurrentPrize",
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
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "roundId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "startIndex",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "length",
                "type": "uint256"
            }
        ],
        "name": "getParticipants",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "list",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "amounts",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "roundId",
                "type": "uint256"
            }
        ],
        "name": "getParticipantsCount",
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
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "startIndex",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "length",
                "type": "uint256"
            }
        ],
        "name": "getRoundFinishInfos",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "roundId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "winner",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "totalPrize",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "ownerFee",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bool",
                        "name": "isOwnerWithdraw",
                        "type": "bool"
                    }
                ],
                "internalType": "struct MafiaLotteryHall.RoundFinishInfo[]",
                "name": "list",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "initialPrize",
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
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "inventoryAddress",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "gameBankAddress",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "itemId",
                "type": "uint256"
            }
        ],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "inventory",
        "outputs": [
            {
                "internalType": "contract IMafiaInventory",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "lotteryItemId",
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
    {
        "inputs": [],
        "name": "lotteryOwner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "ownerFeePercent",
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
    {
        "inputs": [],
        "name": "ownerTotalProfit",
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
    {
        "inputs": [],
        "name": "ownerWithdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "roundDuration",
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
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "roundFinishInfos",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "roundId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "totalPrize",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "ownerFee",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "isOwnerWithdraw",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "rounds",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "totalEntries",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "winner",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "ended",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            }
        ],
        "name": "setGameBankAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "prize",
                "type": "uint256"
            }
        ],
        "name": "setInitialPrize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            }
        ],
        "name": "setInventoryAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "itemId",
                "type": "uint256"
            }
        ],
        "name": "setLotteryItemId",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "percent",
                "type": "uint256"
            }
        ],
        "name": "setOwnerFeePercent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "duration",
                "type": "uint256"
            }
        ],
        "name": "setRoundDuration",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "userEntries",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]
