import { Abi } from "viem";

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
    {
        inputs: [
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256[]", name: "itemIds", type: "uint256[]" },
        ],
        name: "transferItems",
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

export const OG_CRATE_ABI = [
    {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [
            { name: "account", type: "address", internalType: "address" },
            { name: "id", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    },
    {
        type: "function",
        name: "isApprovedForAll",
        stateMutability: "view",
        inputs: [
            { name: "account", type: "address", internalType: "address" },
            { name: "operator", type: "address", internalType: "address" },
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
    },
    {
        type: "function",
        name: "setApprovalForAll",
        stateMutability: "nonpayable",
        inputs: [
            { name: "operator", type: "address", internalType: "address" },
            { name: "approved", type: "bool", internalType: "bool" },
        ],
        outputs: [],
    },
];
