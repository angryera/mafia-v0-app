import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CITY_DEVELOPER_BOOST_PERCENT,
  cityDeveloperPowerTooltip,
  developedCityIdsFromResults,
  formatLoadoutEstimate,
  isCityDeveloperAddress,
  projectLoadoutPower,
  readDevelopedCityIds,
  splitCityDeveloperPower,
} from "./city-developer.ts";

const ZERO = "0x0000000000000000000000000000000000000000";
const WALLET = "0xAbCdef0000000000000000000000000000000001";

describe("city developer address", () => {
  it("does not treat the zero address as a developer", () => {
    assert.equal(isCityDeveloperAddress(ZERO, WALLET), false);
    assert.equal(isCityDeveloperAddress(ZERO, ZERO), false);
    assert.equal(isCityDeveloperAddress(undefined, WALLET), false);
    assert.equal(isCityDeveloperAddress(WALLET, undefined), false);
  });

  it("matches addresses case-insensitively", () => {
    assert.equal(
      isCityDeveloperAddress(WALLET.toLowerCase(), WALLET.toUpperCase()),
      true,
    );
    assert.equal(
      isCityDeveloperAddress(
        "0x00000000000000000000000000000000000000aa",
        WALLET,
      ),
      false,
    );
  });
});

describe("city developer multicall", () => {
  it("returns every city the account develops", async () => {
    const cityIds = [0, 1, 2, 3, 4];
    let reads = 0;
    const ids = await readDevelopedCityIds({
      wallet: WALLET,
      cityIds,
      multicall: async (requested) => {
        reads += 1;
        assert.deepEqual(requested, cityIds);
        return [
          { status: "success", result: [BigInt(0), ZERO] },
          { status: "success", result: [BigInt(1), WALLET.toLowerCase()] },
          { status: "failure" },
          {
            status: "success",
            result: {
              netWorth: BigInt(5),
              developer: "0x1111111111111111111111111111111111111111",
            },
          },
          { status: "success", result: [BigInt(9), WALLET.toUpperCase()] },
        ];
      },
    });

    assert.equal(reads, 1);
    assert.deepEqual(ids, [1, 4]);
    assert.deepEqual(
      developedCityIdsFromResults(WALLET, cityIds, [
        { status: "success", result: [BigInt(0), ZERO] },
      ]),
      [],
    );
  });

  it("performs no reads for an empty account", async () => {
    let reads = 0;
    const multicall = async () => {
      reads += 1;
      return [];
    };

    assert.deepEqual(
      await readDevelopedCityIds({ wallet: undefined, cityIds: [0, 1, 2], multicall }),
      [],
    );
    assert.deepEqual(
      await readDevelopedCityIds({ wallet: null, cityIds: [0, 1, 2], multicall }),
      [],
    );
    assert.deepEqual(
      await readDevelopedCityIds({ wallet: "   ", cityIds: [0, 1, 2], multicall }),
      [],
    );
    assert.equal(reads, 0);
  });
});

describe("city developer power", () => {
  it("keeps base equal to the total for non-developers", () => {
    assert.deepEqual(splitCityDeveloperPower(1200, false), {
      base: 1200,
      bonus: 0,
      total: 1200,
    });
    assert.deepEqual(splitCityDeveloperPower(1001, false), {
      base: 1001,
      bonus: 0,
      total: 1001,
    });
  });

  it("splits 1200 into base 1000 and bonus 200", () => {
    const power = splitCityDeveloperPower(1200, true);
    assert.deepEqual(power, { base: 1000, bonus: 200, total: 1200 });
    assert.equal(
      cityDeveloperPowerTooltip("offense", power),
      "Base offense 1,000 + 200 City Developer bonus (20%)",
    );
    assert.equal(
      cityDeveloperPowerTooltip("defense", power),
      "Base defense 1,000 + 200 City Developer bonus (20%)",
    );
    assert.equal(CITY_DEVELOPER_BOOST_PERCENT, 20);
  });

  it("keeps base + bonus equal to awkward on-chain totals", () => {
    for (let total = 0; total <= 5000; total++) {
      const power = splitCityDeveloperPower(total, true);
      assert.equal(power.base + power.bonus, power.total);
      assert.equal(power.total, total);
    }
    const awkward = splitCityDeveloperPower(1001, true);
    assert.equal(awkward.base + awkward.bonus, 1001);
    assert.equal(awkward.total, 1001);
  });
});

describe("unsaved loadout projection", () => {
  it("adds only the item delta and multiplies it for developers", () => {
    const saved = {
      onChainTotal: 1000,
      savedItemStat: 50,
      draftItemStat: 90,
    };
    assert.equal(
      projectLoadoutPower({ ...saved, isCityDeveloper: false }),
      1040,
    );
    assert.equal(
      projectLoadoutPower({ ...saved, isCityDeveloper: true }),
      1048,
    );
    assert.equal(
      formatLoadoutEstimate(1048, 1000),
      "→ 1,048 (+48)",
    );
    assert.equal(
      projectLoadoutPower({
        onChainTotal: 1000,
        savedItemStat: 80,
        draftItemStat: 80,
        isCityDeveloper: true,
      }),
      1000,
    );
  });

  it("never projects below 0", () => {
    const unequip = {
      onChainTotal: 10,
      savedItemStat: 50,
      draftItemStat: 0,
    };
    assert.equal(
      projectLoadoutPower({ ...unequip, isCityDeveloper: false }),
      0,
    );
    assert.equal(
      projectLoadoutPower({ ...unequip, isCityDeveloper: true }),
      0,
    );
  });
});
