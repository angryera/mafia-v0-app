"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useChainAddresses } from "@/components/chain-provider";
import type { Family } from "@/features/families/types";
import { parsePlayerFamilyId } from "@/features/families/lib/family-bank";
import { WITHDRAW_LEADER_ROLES } from "@/features/families/lib/family-leadership";
import { findLeaderRole, isListedFamilyMember } from "@/features/families/lib/family-roster";
import { MAFIA_FAMILY_ABI } from "@/lib/constants/abi";

const LEADER_MANAGER_ROLES: ReadonlySet<string> = new Set([
  "Don",
  "Consigliere",
  "Capodecina",
]);

export interface FamilyMembership {
  isConnected: boolean;
  /** The connected player's on-chain family is this family. */
  isMyFamily: boolean;
  /** On-chain membership, or listed in the loaded roster. */
  isFamilyMember: boolean;
  myLeaderRole: string | null;
  canWithdrawFromBank: boolean;
  canSetPromotionRewards: boolean;
  canManageFamilyLeaders: boolean;
}

/** Connected player's relationship to `familyId` and the permissions it grants. */
export function useFamilyMembership(family: Family | null, familyId: number) {
  const addresses = useChainAddresses();
  const { address, isConnected } = useAccount();

  const { data: playerInfoRaw, refetch } = useReadContract({
    address: addresses.mafiaFamily,
    abi: MAFIA_FAMILY_ABI,
    functionName: "getPlayerInfo",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const membership = useMemo((): FamilyMembership => {
    const myFamilyId = parsePlayerFamilyId(playerInfoRaw);
    const isMyFamily = familyId > 0 && myFamilyId === BigInt(familyId);
    const isListed = !!family && !!address && isListedFamilyMember(family, address);
    const isFamilyMember = isMyFamily || isListed;
    const myLeaderRole = family && address ? findLeaderRole(family, address) : null;

    return {
      isConnected,
      isMyFamily,
      isFamilyMember,
      myLeaderRole,
      canWithdrawFromBank:
        isFamilyMember && !!myLeaderRole && WITHDRAW_LEADER_ROLES.has(myLeaderRole),
      canSetPromotionRewards: isFamilyMember && myLeaderRole === "Don",
      canManageFamilyLeaders:
        isConnected && isFamilyMember && !!myLeaderRole && LEADER_MANAGER_ROLES.has(myLeaderRole),
    };
  }, [playerInfoRaw, familyId, family, address, isConnected]);

  return { ...membership, refetchPlayerInfo: refetch };
}
