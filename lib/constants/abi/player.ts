import { Abi } from "viem";

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

// ========== Rebirth Contract ==========
export const REBIRTH_ABI: Abi = [
    {
        type: "function",
        name: "quoteRebirth",
        inputs: [
            { name: "user", type: "address", internalType: "address" },
            { name: "optionId", type: "uint256", internalType: "uint256" },
            { name: "swapTokenId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [
            { name: "usdCost", type: "uint256", internalType: "uint256" },
            { name: "inputToken", type: "address", internalType: "address" },
            { name: "inputAmount", type: "uint256", internalType: "uint256" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getRebirthOption",
        inputs: [
            { name: "optionId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct MafiaRebirth.RebirthOption",
                components: [
                    { name: "costRatioBps", type: "uint16", internalType: "uint16" },
                    {
                        name: "rewards",
                        type: "tuple[]",
                        internalType: "struct MafiaRebirth.AssetSpec[]",
                        components: [
                            { name: "kind", type: "uint8", internalType: "enum MafiaRebirth.AssetKind" },
                            { name: "target", type: "address", internalType: "address" },
                            { name: "arg1", type: "uint256", internalType: "uint256" },
                            { name: "arg2", type: "uint256", internalType: "uint256" },
                        ],
                    },
                    { name: "enabled", type: "bool", internalType: "bool" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getRebirthOptionsCount",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "initiateRebirth",
        inputs: [
            { name: "optionId", type: "uint256", internalType: "uint256" },
            { name: "swapTokenId", type: "uint256", internalType: "uint256" },
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
        name: "exitSafehouse",
        inputs: [],
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
        name: "getTrainingCost",
        inputs: [
            { name: "categoryId", type: "uint256", internalType: "uint256" },
            { name: "typeId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
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
