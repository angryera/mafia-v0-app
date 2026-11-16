import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseUnits } from "viem";
import { capRecordedDamage, formatCombatUnits } from "./kill-result-logic.ts";

const hp = (value: string) => parseUnits(value, 18);

describe("kill-result combat numbers", () => {
  it("caps damage at the fighter's starting HP or 1,000 HP", () => {
    const recorded = hp("6800.143976286258733855");
    assert.equal(capRecordedDamage(recorded, hp("50")), hp("50"));
    assert.equal(capRecordedDamage(recorded, hp("1500")), hp("1000"));
    assert.equal(capRecordedDamage(recorded), hp("1000"));
    assert.equal(capRecordedDamage(hp("12.345"), hp("50")), hp("12.345"));
    assert.equal(capRecordedDamage(-hp("10"), hp("50")), 0n);
    assert.equal(capRecordedDamage(hp("10"), -hp("1")), 0n);
  });

  it("rounds to at most two decimals and groups whole HP", () => {
    assert.equal(formatCombatUnits(hp("6800.143976286258733855")), "6,800.14");
    assert.equal(formatCombatUnits(hp("1.994")), "1.99");
    assert.equal(formatCombatUnits(hp("1.995")), "2");
    assert.equal(formatCombatUnits(hp("50.10")), "50.1");
    assert.equal(formatCombatUnits(hp("50")), "50");
    assert.equal(formatCombatUnits(0n), "0");
    assert.equal(formatCombatUnits(12_345_678n, 6), "12.35");
  });

  it("keeps tiny nonzero amounts visible and handles huge bigints", () => {
    assert.equal(formatCombatUnits(hp("0.004999999999999999")), "<0.01");
    assert.equal(formatCombatUnits(hp("0.005")), "0.01");
    assert.equal(formatCombatUnits(hp("123456789012345678901234.999999999999999999")),
      "123,456,789,012,345,678,901,235");
  });
});
