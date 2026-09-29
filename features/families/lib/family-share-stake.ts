import { zeroAddress } from "viem";

export type FamilyStakeEntry = {
  id: bigint;
  user: `0x${string}`;
  familyId: bigint;
  amount: bigint;
  startedAt: bigint;
  endedAt: bigint;
  isActive: boolean;
};

/** `MafiaFamilyShareStake.familyStakes(id)` result, which may come back as a tuple or a named struct. */
export function parseFamilyStake(id: bigint, raw: unknown): FamilyStakeEntry | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return {
      id,
      user: (raw[0] ?? zeroAddress) as `0x${string}`,
      familyId: BigInt(raw[1] as bigint | string | number),
      amount: BigInt(raw[2] as bigint | string | number),
      startedAt: BigInt(raw[3] as bigint | string | number),
      endedAt: BigInt(raw[4] as bigint | string | number),
      isActive: Boolean(raw[5]),
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    id,
    user: (o.user ?? zeroAddress) as `0x${string}`,
    familyId: BigInt((o.familyId as bigint | string | number) ?? 0),
    amount: BigInt((o.amount as bigint | string | number) ?? 0),
    startedAt: BigInt((o.startedAt as bigint | string | number) ?? 0),
    endedAt: BigInt((o.endedAt as bigint | string | number) ?? 0),
    isActive: Boolean(o.isActive),
  };
}
