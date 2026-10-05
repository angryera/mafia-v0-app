import { Abi } from "viem";

// ========== Family Share Stake Contract ==========
export const FAMILY_SHARE_STAKE_ABI: Abi = [
    {
        type: "function",
        name: "family",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "contract IMafiaFamily" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "familyStakeIds",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "familyStakedAmount",
        inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "familyStakes",
        inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        outputs: [
            { name: "user", type: "address", internalType: "address" },
            { name: "familyId", type: "uint256", internalType: "uint256" },
            { name: "amount", type: "uint256", internalType: "uint256" },
            { name: "startedAt", type: "uint256", internalType: "uint256" },
            { name: "endedAt", type: "uint256", internalType: "uint256" },
            { name: "isActive", type: "bool", internalType: "bool" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getFamilyActiveStakes",
        inputs: [
            { name: "familyId", type: "uint256", internalType: "uint256" },
            { name: "offset", type: "uint256", internalType: "uint256" },
            { name: "limit", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getFamilyActiveStakesCount",
        inputs: [{ name: "familyId", type: "uint256", internalType: "uint256" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getFamilyActiveStakes",
        inputs: [
            { name: "familyId", type: "uint256", internalType: "uint256" },
            { name: "offset", type: "uint256", internalType: "uint256" },
            { name: "limit", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getFamilyActiveStakesCount",
        inputs: [{ name: "familyId", type: "uint256", internalType: "uint256" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getUserActiveStakes",
        inputs: [
            { name: "user", type: "address", internalType: "address" },
            { name: "offset", type: "uint256", internalType: "uint256" },
            { name: "limit", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getUserActiveStakesCount",
        inputs: [{ name: "user", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "initialize",
        inputs: [
            { name: "mafiaAddress", type: "address", internalType: "address" },
            { name: "familyAddress", type: "address", internalType: "address" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "initializeActiveFamilyStakesIndex",
        inputs: [
            { name: "offset", type: "uint256", internalType: "uint256" },
            { name: "limit", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "processed", type: "uint256", internalType: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "initializeActiveStakesIndex",
        inputs: [
            { name: "offset", type: "uint256", internalType: "uint256" },
            { name: "limit", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "processed", type: "uint256", internalType: "uint256" }],
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
        name: "maxStakePerFamily",
        inputs: [],
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
        name: "playerStatusChecker",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "contract IMafiaPlayerStatusChecker" }],
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
        name: "setMaxStakePerFamily",
        inputs: [{ name: "value", type: "uint256", internalType: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setPlayerStatusCheckerAddress",
        inputs: [{ name: "addr", type: "address", internalType: "address" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setWithdrawCooldown",
        inputs: [{ name: "value", type: "uint256", internalType: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "stake",
        inputs: [
            { name: "familyId", type: "uint256", internalType: "uint256" },
            { name: "amount", type: "uint256", internalType: "uint256" },
        ],
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
        name: "withdraw",
        inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "withdrawCooldown",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "EndFamilyStake",
        inputs: [
            { name: "id", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "endedAt", type: "uint256", indexed: false, internalType: "uint256" },
        ],
    },
    {
        type: "event",
        name: "FamilyStakeAmountChanged",
        inputs: [
            { name: "familyId", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
        ],
    },
    {
        type: "event",
        name: "Initialized",
        inputs: [{ name: "version", type: "uint8", indexed: false, internalType: "uint8" }],
    },
    {
        type: "event",
        name: "NewFamilyStake",
        inputs: [
            { name: "id", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "familyId", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "user", type: "address", indexed: false, internalType: "address" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "startedAt", type: "uint256", indexed: false, internalType: "uint256" },
        ],
    },
    {
        type: "event",
        name: "OwnershipTransferred",
        inputs: [
            { name: "previousOwner", type: "address", indexed: true, internalType: "address" },
            { name: "newOwner", type: "address", indexed: true, internalType: "address" },
        ],
    },
] as const;

export const FAMILY_GAME_CASH_BANK = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "familyId",
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
                "name": "newBalance",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "Deposited",
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
                "name": "familyId",
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
                "name": "nativeAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "cashReceived",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newNativeBalance",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newCashBalance",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "NativeSwapped",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "familyId",
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
                "internalType": "string",
                "name": "subType",
                "type": "string"
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
                "name": "newNativeBalance",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "NativeTaxCollected",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "familyId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "recipient",
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
                "name": "newNativeBalance",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "NativeWithdrawn",
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
                "name": "familyId",
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
                "internalType": "uint8",
                "name": "rank",
                "type": "uint8"
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
                "name": "newBalance",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "PromotionRewardPaid",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "familyId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint8",
                "name": "rank",
                "type": "uint8"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "setter",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "PromotionRewardUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "familyId",
                "type": "uint256"
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
                "name": "newBalance",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "Seeded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "familyId",
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
                "internalType": "string",
                "name": "subType",
                "type": "string"
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
                "name": "newBalance",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "TaxCollected",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "familyId",
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
                "name": "newBalance",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "Withdrawn",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "MAX_RANK",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "cashSwap",
        "outputs": [
            {
                "internalType": "contract IMafiaInGameCashSwap",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "cashTaxBP",
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
                "name": "familyId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "subType",
                "type": "string"
            }
        ],
        "name": "collectNativeTax",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "familyId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "subType",
                "type": "string"
            }
        ],
        "name": "collectTax",
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
        "name": "computeCashTax",
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
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "computeNativeTax",
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
                "name": "familyId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "family",
        "outputs": [
            {
                "internalType": "contract IMafiaFamily",
                "name": "",
                "type": "address"
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
        "name": "familyBalance",
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
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "familyLogs",
        "outputs": [
            {
                "internalType": "enum MafiaFamilyCashBank.LogType",
                "name": "logType",
                "type": "uint8"
            },
            {
                "internalType": "string",
                "name": "logSubType",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "recipient",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "secondaryAmount",
                "type": "uint256"
            },
            {
                "internalType": "uint8",
                "name": "rank",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
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
        "name": "familyNativeBalance",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "familyId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "start",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "length",
                "type": "uint256"
            }
        ],
        "name": "getFamilyLogs",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "enum MafiaFamilyCashBank.LogType",
                        "name": "logType",
                        "type": "uint8"
                    },
                    {
                        "internalType": "string",
                        "name": "logSubType",
                        "type": "string"
                    },
                    {
                        "internalType": "address",
                        "name": "user",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "secondaryAmount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint8",
                        "name": "rank",
                        "type": "uint8"
                    },
                    {
                        "internalType": "uint256",
                        "name": "timestamp",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct MafiaFamilyCashBank.BankLog[]",
                "name": "list",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "familyId",
                "type": "uint256"
            }
        ],
        "name": "getFamilyLogsCount",
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
                "name": "familyId",
                "type": "uint256"
            }
        ],
        "name": "getPromotionRewards",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "rewards",
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
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "hasBeenSeeded",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
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
                "name": "_gameBank",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_family",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_messageCenter",
                "type": "address"
            }
        ],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "isAuthorized",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "messageCenter",
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
        "name": "nativeTaxBP",
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
                "components": [
                    {
                        "internalType": "string",
                        "name": "messageType",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "messageSubType",
                        "type": "string"
                    },
                    {
                        "internalType": "address",
                        "name": "user",
                        "type": "address"
                    },
                    {
                        "internalType": "uint8",
                        "name": "cityId",
                        "type": "uint8"
                    },
                    {
                        "internalType": "bool",
                        "name": "isSuccess",
                        "type": "bool"
                    },
                    {
                        "internalType": "uint256",
                        "name": "timestamp",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "internalType": "struct MafiaMessageLibrary.Message",
                "name": "message",
                "type": "tuple"
            }
        ],
        "name": "onMessageReceived",
        "outputs": [],
        "stateMutability": "nonpayable",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            },
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "name": "promotionReward",
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
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256[]",
                "name": "familyIds",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "amounts",
                "type": "uint256[]"
            }
        ],
        "name": "seedFamilyBalances",
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
            },
            {
                "internalType": "bool",
                "name": "value",
                "type": "bool"
            }
        ],
        "name": "setAuthorized",
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
        "name": "setCashSwapAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "bp",
                "type": "uint256"
            }
        ],
        "name": "setCashTaxBP",
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
        "name": "setFamilyAddress",
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
        "name": "setGameBankAddress",
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
        "name": "setMessageCenterAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "bp",
                "type": "uint256"
            }
        ],
        "name": "setNativeTaxBP",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "familyId",
                "type": "uint256"
            },
            {
                "internalType": "uint8[]",
                "name": "ranks",
                "type": "uint8[]"
            },
            {
                "internalType": "uint256[]",
                "name": "amounts",
                "type": "uint256[]"
            }
        ],
        "name": "setPromotionRewards",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "familyId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "swapNativeToCash",
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
                "name": "familyId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "familyId",
                "type": "uint256"
            },
            {
                "internalType": "address payable",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "withdrawNative",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "stateMutability": "payable",
        "type": "receive"
    }
]

/** MafiaFamily.sol — player family membership. */
export const MAFIA_FAMILY_ABI = [
    {
        type: "function",
        name: "getPlayerInfo",
        stateMutability: "view",
        inputs: [{ name: "player", type: "address", internalType: "address" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct MafiaFamily.PlayerInfo",
                components: [
                    { name: "familyId", type: "uint256", internalType: "uint256" },
                    { name: "level", type: "uint8", internalType: "uint8" },
                    { name: "isDead", type: "bool", internalType: "bool" },
                ],
            },
        ],
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "familyId", "type": "uint256" },
            { "internalType": "address", "name": "memberAddress", "type": "address" },
            { "internalType": "uint256", "name": "leaderIndex", "type": "uint256" }
        ],
        "name": "updateFamilyLeader",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
];

export const MAFIA_MAP_ABI = [
    {
        type: "function",
        name: "calculateCurrentYieldPayout",
        stateMutability: "view",
        inputs: [
            { name: "cityId", type: "uint8", internalType: "uint8" },
            { name: "x", type: "uint8", internalType: "uint8" },
            { name: "y", type: "uint8", internalType: "uint8" },
        ],
        outputs: [
            { name: "amount", type: "uint256", internalType: "uint256" },
            { name: "lastDayTimestamp", type: "uint48", internalType: "uint48" },
        ],
    },
    {
        type: "function",
        name: "claimYieldPayout",
        stateMutability: "nonpayable",
        inputs: [
            { name: "cityId", type: "uint8", internalType: "uint8" },
            { name: "x", type: "uint8", internalType: "uint8" },
            { name: "y", type: "uint8", internalType: "uint8" },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "upgradeSlot",
        stateMutability: "nonpayable",
        inputs: [
            { name: "cityId", type: "uint8", internalType: "uint8" },
            { name: "x", type: "uint8", internalType: "uint8" },
            { name: "y", type: "uint8", internalType: "uint8" },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "depositIntoSlot",
        stateMutability: "nonpayable",
        inputs: [
            { name: "cityId", type: "uint8", internalType: "uint8" },
            { name: "x", type: "uint8", internalType: "uint8" },
            { name: "y", type: "uint8", internalType: "uint8" },
            { name: "amount", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "withdrawFromSlot",
        stateMutability: "nonpayable",
        inputs: [
            { name: "cityId", type: "uint8", internalType: "uint8" },
            { name: "x", type: "uint8", internalType: "uint8" },
            { name: "y", type: "uint8", internalType: "uint8" },
            { name: "amount", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "calculateBulkCurrentYieldPayout",
        stateMutability: "view",
        inputs: [
            { name: "cityIds", type: "uint8[]", internalType: "uint8[]" },
            { name: "slotXs", type: "uint8[]", internalType: "uint8[]" },
            { name: "slotYs", type: "uint8[]", internalType: "uint8[]" },
        ],
        outputs: [
            { name: "amounts", type: "uint256[]", internalType: "uint256[]" },
            { name: "lastDayTimestamps", type: "uint48[]", internalType: "uint48[]" },
        ],
    },
    {
        type: "function",
        name: "bulkClaimYieldPayout",
        stateMutability: "nonpayable",
        inputs: [
            { name: "cityIds", type: "uint8[]", internalType: "uint8[]" },
            { name: "slotXs", type: "uint8[]", internalType: "uint8[]" },
            { name: "slotYs", type: "uint8[]", internalType: "uint8[]" },
        ],
        outputs: [],
    },
    /** VRF land claim — step 1 (after OG Crate approval for map). */
    {
        type: "function",
        name: "requestOpenSlot",
        stateMutability: "nonpayable",
        inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
        outputs: [],
    },
    /** VRF land claim — step 2 after delay / nonce fulfilled. */
    {
        type: "function",
        name: "finishOpenSlot",
        stateMutability: "nonpayable",
        inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
        outputs: [],
    },
    /**
     * Land claim VRF status for `(user, cityId)`.
     * Returns `[isPending, isFulfilled]` (unnamed on-chain).
     */
    {
        type: "function",
        name: "getNonceStatus",
        stateMutability: "view",
        inputs: [
            { name: "user", type: "address", internalType: "address" },
            { name: "cityId", type: "uint8", internalType: "uint8" },
        ],
        outputs: [
            { name: "", type: "bool", internalType: "bool" },
            { name: "", type: "bool", internalType: "bool" },
        ],
    },
    /**
     * City developer for a city. `developer` is the zero address when the city
     * has no developer. Offense and defense boosts are applied in equipment
     * `getTotalPower`, not by multiplying this result.
     */
    {
        type: "function",
        name: "cityDevelopers",
        stateMutability: "view",
        inputs: [{ name: "cityId", type: "uint8", internalType: "uint8" }],
        outputs: [
            { name: "netWorth", type: "uint256", internalType: "uint256" },
            { name: "developer", type: "address", internalType: "address" },
        ],
    },
    /** Create family on your Family HQ tile (burns OG Crate keys via contract). */
    {
        type: "function",
        name: "purchaseFamilyHQ",
        stateMutability: "nonpayable",
        inputs: [
            { name: "cityId", type: "uint8", internalType: "uint8" },
            { name: "x", type: "uint8", internalType: "uint8" },
            { name: "y", type: "uint8", internalType: "uint8" },
            { name: "name", type: "string", internalType: "string" },
        ],
        outputs: [],
    },
];
