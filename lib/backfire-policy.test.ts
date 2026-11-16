import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther } from "viem";
import {
  BACKFIRE_MAX_BULLETS,
  BackfireMode,
  backfireSettingsFromLens,
  getDefaultBackfireSettings,
  toBackfireFixedAmount,
} from "./backfirePolicy.ts";

describe("backfire policy contract values", () => {
  it("uses the deployed policy ordinals and default", () => {
    assert.deepEqual(BackfireMode, {
      None: 0, Range: 1, DoubleAttacker: 2, RangeRandom: 3, SameAsAttacker: 4,
    });
    assert.deepEqual(getDefaultBackfireSettings(), { mode: 0, rangeMin: 1000, rangeMax: 1000 });
    assert.equal(BACKFIRE_MAX_BULLETS, 75_000);
  });

  it("decodes only exact whole fixed bullets within the page limit", () => {
    assert.deepEqual(backfireSettingsFromLens(1, parseEther("75000")), {
      mode: BackfireMode.Range, rangeMin: 75_000, rangeMax: 75_000,
    });
    assert.deepEqual(backfireSettingsFromLens(4, 0n), {
      mode: BackfireMode.SameAsAttacker, rangeMin: 1000, rangeMax: 1000,
    });
    assert.throws(() => backfireSettingsFromLens(5, 0n), /Unknown backfire policy/);
    assert.throws(() => backfireSettingsFromLens(1, parseEther("1.000000000000000001")), /Invalid fixed backfire amount/);
    assert.throws(() => backfireSettingsFromLens(1, parseEther("75001")), /Invalid fixed backfire amount/);
    assert.throws(() => backfireSettingsFromLens(1, 0n), /Invalid fixed backfire amount/);
    assert.throws(() => backfireSettingsFromLens(1, -1n), /Invalid fixed amount/);
  });

  it("encodes fixed bullets in 18-decimal units and zero for other modes", () => {
    assert.equal(toBackfireFixedAmount(BackfireMode.Range, 1), parseEther("1"));
    assert.equal(toBackfireFixedAmount(BackfireMode.Range, 75_000), parseEther("75000"));
    assert.equal(toBackfireFixedAmount(BackfireMode.None, 1000), 0n);
    assert.equal(toBackfireFixedAmount(BackfireMode.RangeRandom, 1000), 0n);
    for (const amount of [0, 1.5, 75_001, Number.NaN]) {
      assert.throws(() => toBackfireFixedAmount(BackfireMode.Range, amount), /Bullet amount must be between/);
    }
  });
});
