"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { useAuth } from "@/components/auth-provider";
import { useChainAddresses } from "@/components/chain-provider";
import { USER_PROFILE_CONTRACT_ABI } from "@/lib/contract";

const CREATE_PROFILE_PATH = "/create-profile";

type ProfileRow = {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
};

function isCreateProfileRoute(pathname: string) {
  return (
    pathname === CREATE_PROFILE_PATH ||
    pathname.startsWith(`${CREATE_PROFILE_PATH}/`)
  );
}

/**
 * When the wallet is connected and the auth signature is available, ensures
 * users without an on-chain profile are sent to create-profile, and users
 * with a profile are not left on the create-profile screen.
 */
export function ProfileGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { authData } = useAuth();
  const addresses = useChainAddresses();

  const onCreateProfile = isCreateProfileRoute(pathname);
  const queryEnabled = !!authData && !!address && isConnected;

  const { data, isFetched, isError } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: queryEnabled },
  });

  const profile = data as ProfileRow | undefined;
  const hasProfile =
    profile !== undefined && profile.profileId !== BigInt(0);

  useEffect(() => {
    if (!queryEnabled || !isFetched || isError) return;

    if (!hasProfile && !onCreateProfile) {
      router.replace(CREATE_PROFILE_PATH);
      return;
    }
    if (hasProfile && onCreateProfile) {
      router.replace("/");
    }
  }, [
    queryEnabled,
    isFetched,
    isError,
    hasProfile,
    onCreateProfile,
    router,
  ]);

  return <>{children}</>;
}
