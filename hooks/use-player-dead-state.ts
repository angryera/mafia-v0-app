"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { type Abi } from "viem";
import { useAuth } from "@/components/auth-provider";
import { useChainAddresses } from "@/components/chain-provider";
import { USER_PROFILE_CONTRACT_ABI } from "@/lib/contract";
import { MAFIA_FAMILY_ABI } from "@/lib/constants/abi";
import {
  isDeadAccount,
  isDeadAccountProfileLoaded,
  type DeadAccountProfile,
} from "@/lib/deadAccount";

type UserProfileTuple = {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
  isDead?: boolean;
  is_dead?: boolean;
};

type PlayerInfoTuple = {
  familyId: bigint;
  level: number;
  isDead: boolean;
};

export function usePlayerDeadState() {
  const { address, isConnected } = useAccount();
  const { authData } = useAuth();
  const addresses = useChainAddresses();

  const profileQueryEnabled = Boolean(authData && address && isConnected);

  const { data: profileRaw } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: profileQueryEnabled },
  });

  const { data: playerInfoRaw, isFetched: playerInfoFetched } = useReadContract({
    address: addresses.mafiaFamily,
    abi: MAFIA_FAMILY_ABI as Abi,
    functionName: "getPlayerInfo",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isConnected) },
  });

  const profile = profileRaw as UserProfileTuple | undefined;
  const playerInfo = playerInfoRaw as PlayerInfoTuple | undefined;

  const mergedProfile = useMemo((): DeadAccountProfile | null => {
    if (!profile && !playerInfo) return null;
    return {
      profileId: profile?.profileId,
      name: profile?.username,
      username: profile?.username,
      isDead: playerInfo?.isDead ?? profile?.isDead,
      is_dead: true, // FIXME: Remove this once we have a proper is_dead field in the profile
    };
  }, [profile, playerInfo]);

  const profileLoaded = useMemo(() => {
    if (isDeadAccountProfileLoaded(mergedProfile)) return true;
    // On-chain isDead is enough to gate layout before signed profile loads.
    if (playerInfoFetched && playerInfo?.isDead) return true;
    return false;
  }, [mergedProfile, playerInfoFetched, playerInfo?.isDead]);

  const isDead = useMemo(
    () => isDeadAccount(mergedProfile),
    [mergedProfile],
  );

  const profileName = profile?.username ?? "";

  return {
    isDead,
    profileLoaded,
    profileName,
    address,
    isConnected,
  };
}
