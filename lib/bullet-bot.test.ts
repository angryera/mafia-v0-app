import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatUnits, parseUnits } from "viem";
import {
  bulletBotCashForOutputWei,
  bulletBotOutputForCashWei,
  bulletBotRefundedCreditsWei,
  maxBulletBotOutputWei,
  parseBulletCashInput,
} from "./bullet-bot.ts";

describe("bullet dealer withdrawal quote", () => {
  it("counts every successful attempt and doubles when the purchase perk is active", () => {
    const single = maxBulletBotOutputWei(3, 10_000, false);
    const doubled = maxBulletBotOutputWei(3, 10_000, true);
    assert.equal(formatUnits(single, 18), "9000");
    assert.equal(formatUnits(doubled, 18), "18000");
    assert.equal(formatUnits(bulletBotCashForOutputWei(doubled), 18), "3600000");
  });

  it("scales the bullet amount with the stored success rate", () => {
    const partial = maxBulletBotOutputWei(3, 3333, false);
    assert.equal(formatUnits(partial, 18), "2999.7");
    assert.equal(maxBulletBotOutputWei(3, 0, true), BigInt(0));
  });

  it("quotes partial purchases and caps them at the bot output", () => {
    const maxBullets = maxBulletBotOutputWei(3, 10_000, true);
    assert.equal(
      formatUnits(bulletBotOutputForCashWei(parseUnits("250.01", 18), maxBullets), 18),
      "1.25005",
    );
    assert.equal(
      formatUnits(bulletBotOutputForCashWei(parseUnits("3600001", 18), maxBullets), 18),
      "18000",
    );
    assert.equal(bulletBotOutputForCashWei(BigInt(0), maxBullets), BigInt(0));
  });

  it("refunds the unused share of the credit cost", () => {
    const maxBullets = parseUnits("2", 18);
    assert.equal(
      formatUnits(bulletBotRefundedCreditsWei(parseUnits("200", 18), maxBullets, 1, 12, 0), 18),
      "6",
    );
    assert.equal(
      formatUnits(bulletBotRefundedCreditsWei(parseUnits("200", 18), maxBullets, 1, 12, 25), 18),
      "4.5",
    );
    assert.equal(
      bulletBotRefundedCreditsWei(parseUnits("400", 18), maxBullets, 1, 12, 0),
      BigInt(0),
    );
    assert.equal(bulletBotRefundedCreditsWei(BigInt(0), BigInt(0), 1, 12, 0), BigInt(0));
  });

  it("accepts cash amounts with up to two decimals", () => {
    assert.equal(parseBulletCashInput("250.01"), parseUnits("250.01", 18));
    assert.equal(parseBulletCashInput("0"), BigInt(0));
    assert.equal(parseBulletCashInput("250.001"), null);
    assert.equal(parseBulletCashInput(""), null);
  });
});
