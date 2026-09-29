import { Abi } from "viem";

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
