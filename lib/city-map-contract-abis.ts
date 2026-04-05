import type { Abi } from "viem";

/** Subset of MafiaMap.sol for city map (wagmi / viem). */
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
] as const satisfies Abi;

/** OG Crate ERC1155 — keys use token id 0 (`balanceOf(account, 0)`). */
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
] as const satisfies Abi;

export const OG_CRATE_KEY_TOKEN_ID = BigInt(0);

/** OG Crate keys (id 0) required to `purchaseFamilyHQ` / create family on map. */
export const FAMILY_HQ_CREATION_OG_CRATE_KEYS = BigInt(10);

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
] as const satisfies Abi;
