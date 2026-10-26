import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeAbiParameters, encodeEventTopics, zeroAddress, type TransactionReceipt } from "viem";

import {
  FREE_TIER,
  UNBOX_LINK_MISMATCH,
  UNBOX_QUOTE_MOVED,
  USER_REJECTED_REQUEST,
  actionErrorMessage,
  assertFreshPayment,
  bufferedUnboxPayment,
  chargedTierPrice,
  decodeUnboxed,
  formatChargedUsd,
  formatReward,
  formatRewardRange,
  isRewardInTier,
  isVerifiedResult,
  loadPaidUnboxOptions,
  markerPositionAt,
  MOTION_DURATION_MS,
  paidTierIndex,
  parseSwapTokenList,
  profileNameError,
  quoteUnboxPayment,
  rangeFromBuckets,
  referralFieldError,
  referralFromQuery,
  rewardsFromUnboxResult,
  unboxActionLabel,
  validateProfileName,
  valueAtMarker,
  type ContractRead,
  type ProfileTier,
  type ProfileUnboxResult,
  PROFILE_UNBOX_ABI,
} from "./profile-unbox.ts";

const PROFILE = "0x1111111111111111111111111111111111111111";
const ROUTER = "0x2222222222222222222222222222222222222222";
const UNBOX = "0x3333333333333333333333333333333333333333";
const ACCOUNT = "0x4444444444444444444444444444444444444444";

function pow10(exponent: number): bigint {
  let value = BigInt(1);
  for (let index = 0; index < exponent; index += 1) value *= BigInt(10);
  return value;
}

const ONE = pow10(18);
const n = (value: number | string) => BigInt(value);

const token = {
  id: 0,
  name: "BNB",
  address: zeroAddress,
  decimals: 18,
  price: ONE,
};

describe("profile name rules", () => {
  it("formats and rejects names while typing", () => {
    assert.equal(validateProfileName(""), "Enter a character name.");
    assert.equal(validateProfileName("Michael1"), "Profile name must consist only of letters.");
    assert.equal(validateProfileName("Aaaaaaaaaaaaaaa"), "Character name must have at most 14 letters.");
    assert.equal(validateProfileName("Michael"), "");
  });

  it("requires the chain name check and reports a taken name", async () => {
    const read: ContractRead = async ({ functionName }) => {
      if (functionName === "isTakenName") return true;
      if (functionName === "isValidUserName") return true;
      throw new Error(functionName);
    };
    assert.equal(await profileNameError(read, PROFILE, "Michael"), "This profile name is already taken.");
  });

  it("surfaces a name the contract rejects as too short", async () => {
    const read: ContractRead = async ({ functionName }) => {
      if (functionName === "isTakenName") return false;
      throw new Error("execution reverted with the following reason:\ntoo short");
    };
    assert.equal(await profileNameError(read, PROFILE, "Al"), "Character name must have at least 3 letters.");
  });
});

describe("referral input", () => {
  it("prefills only a wallet address", () => {
    assert.equal(referralFromQuery("abc"), "");
    assert.equal(referralFromQuery(ACCOUNT), ACCOUNT);
    assert.equal(referralFieldError("not-a-wallet", ACCOUNT), "Enter a valid referral code from another player.");
    assert.equal(referralFieldError(ACCOUNT, ACCOUNT), "Enter a valid referral code from another player.");
    assert.equal(referralFieldError(PROFILE, ACCOUNT), "");
    assert.equal(referralFieldError(""), "");
  });
});

describe("charged prices and payment quotes", () => {
  it("divides raw tier prices by 1000 before display", () => {
    assert.equal(formatChargedUsd(chargedTierPrice(n(20) * ONE)), "0.02");
    assert.equal(formatChargedUsd(chargedTierPrice(n(75) * ONE)), "0.075");
    assert.equal(formatChargedUsd(chargedTierPrice(n(150) * ONE)), "0.15");
  });

  it("quotes the charged amount and adds the 1% buffer in integer math", () => {
    const charged = chargedTierPrice(n(20) * ONE);
    const amount = quoteUnboxPayment(charged, token);
    assert.equal(amount, n("20000000000000000"));
    assert.equal(bufferedUnboxPayment(amount), n("20200000000000000"));
  });

  it("keeps a quote inside the shown buffer and rejects a larger one", () => {
    const shown = bufferedUnboxPayment(quoteUnboxPayment(chargedTierPrice(n(20) * ONE), token));
    const raw = [n(20) * ONE, n(75) * ONE, n(150) * ONE];
    assert.doesNotThrow(() => assertFreshPayment({
      rawPrices: raw,
      tierIndex: 0,
      previous: token,
      freshTokens: [{ ...token, enabled: true, price: n("995000000000000000") }],
      shownBuffer: shown,
    }));
    assert.throws(
      () => assertFreshPayment({
        rawPrices: raw,
        tierIndex: 0,
        previous: token,
        freshTokens: [{ ...token, enabled: true, price: n("980000000000000000") }],
        shownBuffer: shown,
      }),
      (error: unknown) => error instanceof Error && error.message === UNBOX_QUOTE_MOVED,
    );
  });

  it("drops disabled, unpriced, and oversized tokens", () => {
    const parsed = parseSwapTokenList([
      [
        { name: "BNB", decimal: 18, tokenAddress: zeroAddress, isEnabled: true },
        { name: "Off", decimal: 18, tokenAddress: PROFILE, isEnabled: false },
        { name: "Flat", decimal: 18, tokenAddress: ROUTER, isEnabled: true },
        { name: "Wide", decimal: 31, tokenAddress: UNBOX, isEnabled: true },
      ],
      [ONE, ONE, n(0), ONE],
    ]);
    assert.deepEqual(parsed.payable.map((item) => item.name), ["BNB"]);
    assert.equal(parsed.all[1]?.enabled, false);
  });
});

describe("reward ranges", () => {
  it("scales bucket bounds into display values", () => {
    assert.deepEqual(rangeFromBuckets([{ lo: n(1), hi: n(1) }], 0), { min: 0, max: 0 });
    assert.deepEqual(rangeFromBuckets([{ lo: n(10000), hi: n(50000) }], 1), { min: 1, max: 5 });
    assert.deepEqual(rangeFromBuckets([{ lo: n(25000), hi: n(50000) }], 2), { min: 5, max: 10 });
    assert.deepEqual(rangeFromBuckets([{ lo: n(10000), hi: n(50000) }], 4), { min: 10_000, max: 50_000 });
  });

  it("formats rank names, percents, and grouped amounts", () => {
    assert.equal(formatReward("rank", 0), "Nobody");
    assert.equal(formatReward("rank", 29), "Godfather");
    assert.equal(formatReward("killSkill", 15), "15%");
    assert.equal(formatReward("cash", 500_000), "500,000");
    assert.equal(formatRewardRange("rank", FREE_TIER.rewards.rank), "Nobody–Nobody");
    assert.equal(formatRewardRange("health", FREE_TIER.rewards.health), "100–100");
    assert.equal(isRewardInTier(FREE_TIER, "health", 100), true);
    assert.equal(isRewardInTier(FREE_TIER, "health", 101), false);
  });

  it("converts an Unboxed result without inventing rewards", () => {
    const rewards = rewardsFromUnboxResult({
      rankLevel: 15,
      killSkillXp: n(50000),
      bustOutXp: n(25000),
      raceXp: n(50000),
      cash: n(50) * ONE,
      bullets: n(5) * ONE,
      health: n(100) * ONE,
    });
    assert.deepEqual(rewards, {
      rank: 14,
      killSkill: 5,
      bustOutSkill: 5,
      raceSkill: 10,
      cash: 50,
      bullets: 5,
      health: 100,
    });
  });
});

describe("paid option loading", () => {
  it("stops when the unbox contract points at another profile or router", async () => {
    const read: ContractRead = async ({ functionName }) => {
      if (functionName === "profile") return PROFILE;
      if (functionName === "swapRouter") return ACCOUNT;
      throw new Error(`unexpected ${functionName}`);
    };
    await assert.rejects(
      () => loadPaidUnboxOptions(read, { unbox: UNBOX, profile: PROFILE, swapRouter: ROUTER }),
      (error: unknown) => error instanceof Error && error.message === UNBOX_LINK_MISMATCH,
    );
  });

  it("reads charged prices and rejects an empty bucket list", async () => {
    const read: ContractRead = async ({ functionName, args }) => {
      if (functionName === "profile") return PROFILE;
      if (functionName === "swapRouter") return ROUTER;
      if (functionName === "getTierPrices") return [n(20) * ONE, n(75) * ONE, n(150) * ONE];
      if (functionName === "getSwapTokens") {
        return [[{ name: "BNB", decimal: 18, tokenAddress: zeroAddress, isEnabled: true }], [ONE]];
      }
      if (functionName === "getBuckets") {
        const tier = Number(args?.[0]);
        const attribute = Number(args?.[1]);
        if (tier === 1 && attribute === 0) return [];
        if (attribute === 0) return [{ lo: n(1), hi: n(2), weight: 1 }];
        return [{ lo: n(0), hi: n(10000), weight: 1 }];
      }
      throw new Error(functionName);
    };
    await assert.rejects(
      () => loadPaidUnboxOptions(read, { unbox: UNBOX, profile: PROFILE, swapRouter: ROUTER }),
      /Rare reward buckets are not configured on chain/,
    );
  });
});

describe("opening and labels", () => {
  it("decodes the wallet's Unboxed event", () => {
    const resultInput = PROFILE_UNBOX_ABI.find((item) => item.type === "event" && item.name === "Unboxed")!.inputs.filter((input) => !input.indexed);
    const data = encodeAbiParameters(resultInput, [
      1,
      false,
      {
        rankLevel: 15,
        rankXp: n(450400),
        killSkillXp: n(50000),
        bustOutXp: n(25000),
        raceXp: n(50000),
        cash: n(50) * ONE,
        bullets: n(5) * ONE,
        health: n(100) * ONE,
      },
      n(123),
    ]);
    const topics = encodeEventTopics({
      abi: PROFILE_UNBOX_ABI,
      eventName: "Unboxed",
      args: { user: ACCOUNT },
    });
    const receipt = {
      transactionHash: `0x${"ab".repeat(32)}`,
      logs: [{
        address: UNBOX,
        data,
        topics,
        blockNumber: n(1),
        transactionHash: `0x${"ab".repeat(32)}`,
        logIndex: 0,
        transactionIndex: 0,
        blockHash: `0x${"cd".repeat(32)}`,
        removed: false,
      }],
    } as unknown as TransactionReceipt;
    const decoded = decodeUnboxed(receipt, ACCOUNT);
    assert.equal(decoded.tierId, "rare");
    assert.equal(decoded.rewards.rank, 14);
    assert.equal(decoded.rewards.cash, 50);
    assert.equal(decoded.transactionHash, receipt.transactionHash);
  });

  it("hides roll again when the hash or the range does not verify", () => {
    const tier = {
      ...FREE_TIER,
      id: "rare" as const,
      rewards: {
        ...FREE_TIER.rewards,
        rank: { min: 0, max: 10 },
      },
    } as ProfileTier;
    const result: ProfileUnboxResult = {
      tierId: "rare",
      transactionHash: "",
      rewards: {
        rank: 0,
        killSkill: 0,
        bustOutSkill: 0,
        raceSkill: 0,
        cash: 0,
        bullets: 0,
        health: 100,
      },
    };
    assert.equal(isVerifiedResult(result, [tier]), false);
    assert.equal(isVerifiedResult({
      ...result,
      transactionHash: "0xabc",
      rewards: { ...result.rewards, rank: 40 },
    }, [tier]), false);
  });

  it("uses the exact wallet rejection text and the in-flight labels", () => {
    assert.equal(actionErrorMessage(new Error("User rejected the request."), "The unbox request failed."), USER_REJECTED_REQUEST);
    assert.equal(actionErrorMessage(new Error("execution reverted"), "The unbox request failed."), "execution reverted");
    assert.equal(actionErrorMessage(new Error(""), "Could not open your box."), "Could not open your box.");
    assert.equal(unboxActionLabel({ pending: null, requesting: true, opening: false, isFree: false }), "Confirming…");
    assert.equal(unboxActionLabel({ pending: { canOpen: false }, requesting: false, opening: false, isFree: false }), "Waiting for blocks…");
    assert.equal(unboxActionLabel({ pending: { canOpen: true }, requesting: false, opening: false, isFree: false }), "Open box");
    assert.equal(unboxActionLabel({ pending: { canOpen: true }, requesting: false, opening: true, isFree: false }), "Opening…");
    assert.equal(unboxActionLabel({ pending: null, requesting: false, opening: false, isFree: true }), "Create free profile");
    assert.equal(unboxActionLabel({ pending: null, requesting: false, opening: false, isFree: false }), "Request unbox");
  });

  it("lands the reveal marker on the confirmed position", () => {
    assert.equal(markerPositionAt(0, 40), 0);
    assert.equal(markerPositionAt(MOTION_DURATION_MS, 40), 40);
    assert.equal(valueAtMarker(0, 100, 40), 40);
    assert.equal(paidTierIndex("rare"), 1);
    assert.equal(paidTierIndex("free"), -1);
  });
});
