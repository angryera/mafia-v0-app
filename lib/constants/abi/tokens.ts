import { Abi } from "viem";

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
        name: "withdrawTax",
        inputs: [],
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
