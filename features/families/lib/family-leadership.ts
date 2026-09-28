import { zeroAddress } from "viem";
import type { Family, FamilyLeader } from "@/features/families/types";

export const FAMILY_ROLE_ORDER: Readonly<Record<string, number>> = {
  Don: 0,
  Consigliere: 1,
  Capodecina: 2,
  Capo: 3,
};

export const WITHDRAW_LEADER_ROLES: ReadonlySet<string> = new Set([
  "Don",
  "Consigliere",
  "Capodecina",
]);

const FAMILY_LEADER_ROLE_INDEX: Readonly<Record<string, number>> = {
  Don: 0,
  Consigliere: 1,
  Capodecina: 2,
};

const CAPO_LEADER_INDEX_MIN = 3;
const CAPO_LEADER_INDEX_MAX = 7;

export interface LeaderSlot extends FamilyLeader {
  leaderIndex: number;
  displayRole: string;
}

export function canManageLeaderSlot(
  myRole: string | null,
  leaderIndex: number,
): boolean {
  if (!myRole || leaderIndex < 0) return false;
  if (myRole === "Don") {
    return leaderIndex <= CAPO_LEADER_INDEX_MAX;
  }
  if (myRole === "Consigliere" || myRole === "Capodecina") {
    return leaderIndex >= CAPO_LEADER_INDEX_MIN && leaderIndex <= CAPO_LEADER_INDEX_MAX;
  }
  return false;
}

export function buildLeaderSlots(leaders: Family["leaders"]): LeaderSlot[] {
  let capoNumber = 0;

  return leaders.map((leader) => {
    if (leader.role === "Capo") {
      const leaderIndex = CAPO_LEADER_INDEX_MIN + capoNumber;
      capoNumber += 1;
      return {
        ...leader,
        leaderIndex,
        displayRole: `Capo ${capoNumber}`,
      };
    }

    return {
      ...leader,
      leaderIndex: FAMILY_LEADER_ROLE_INDEX[leader.role] ?? -1,
      displayRole: leader.role,
    };
  });
}

export function isLeaderAssigned(leader: Pick<FamilyLeader, "name" | "address">): boolean {
  if (!leader.name.trim()) return false;
  const address = leader.address.toLowerCase();
  return address !== "" && address !== zeroAddress.toLowerCase();
}
