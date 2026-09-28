import { zeroAddress } from "viem";
import type { Family, FamilyMember } from "@/features/families/types";
import {
  FAMILY_ROLE_ORDER,
  buildLeaderSlots,
  isLeaderAssigned,
  type LeaderSlot,
} from "@/features/families/lib/family-leadership";
import { formatWalletAddress } from "@/lib/format";

export interface FamilyMemberOption {
  address: string;
  name: string;
  level: number;
}

const ZERO_ADDRESS = zeroAddress.toLowerCase();

export function isEmptyAddress(address: string | null | undefined): boolean {
  const key = address?.trim().toLowerCase();
  return !key || key === ZERO_ADDRESS;
}

export function hasSuccessor(family: Family): boolean {
  return !!family.successor && !isEmptyAddress(family.successor.address);
}

export function getSortedLeaderSlots(family: Family): LeaderSlot[] {
  const sorted = [...family.leaders].sort(
    (a, b) => (FAMILY_ROLE_ORDER[a.role] ?? 99) - (FAMILY_ROLE_ORDER[b.role] ?? 99),
  );
  return buildLeaderSlots(sorted);
}

/** Players who hold neither a leadership slot nor the successor position. */
export function getRegularMembers(family: Family): FamilyMember[] {
  const leaderAddresses = new Set(family.leaders.map((l) => l.address.toLowerCase()));
  const successorAddress = family.successor?.address?.toLowerCase();
  return family.players.filter((player) => {
    const key = player.address.toLowerCase();
    return !leaderAddresses.has(key) && key !== successorAddress;
  });
}

export function findLeaderRole(family: Family, address: string): string | null {
  const key = address.toLowerCase();
  return family.leaders.find((l) => l.address.toLowerCase() === key)?.role ?? null;
}

export function isListedFamilyMember(family: Family, address: string): boolean {
  const key = address.toLowerCase();
  if (family.leaders.some((l) => l.address.toLowerCase() === key)) return true;
  if (family.players.some((p) => p.address.toLowerCase() === key)) return true;
  return family.successor?.address?.toLowerCase() === key;
}

export function getDonAddress(family: Family): string | null {
  const don = family.leaders.find((l) => l.role === "Don");
  return don && isLeaderAssigned(don) ? don.address.toLowerCase() : null;
}

/** Every distinct, non-empty roster address, sorted by display name. */
export function getMemberOptions(family: Family): FamilyMemberOption[] {
  const byAddress = new Map<string, FamilyMemberOption>();
  const add = (member: Pick<FamilyMember, "address" | "name" | "level">) => {
    const address = member.address?.trim();
    if (isEmptyAddress(address)) return;
    byAddress.set(address.toLowerCase(), {
      address,
      name: member.name?.trim() || formatWalletAddress(address),
      level: member.level,
    });
  };
  family.players.forEach(add);
  family.leaders.forEach(add);
  if (family.successor) add(family.successor);
  return Array.from(byAddress.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** Lower-cased address → display name for every named roster entry. */
export function buildRosterNameMap(family: Family): Record<string, string> {
  const names: Record<string, string> = {};
  const add = (member: Pick<FamilyMember, "address" | "name"> | undefined) => {
    const name = member?.name?.trim();
    if (name && member?.address) names[member.address.toLowerCase()] = name;
  };
  family.leaders.forEach(add);
  family.players.forEach(add);
  add(family.successor);
  return names;
}
