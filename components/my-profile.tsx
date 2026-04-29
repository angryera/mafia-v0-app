"use client";

import {
  useAccount,
  useReadContract,
} from "wagmi";
import {
  USER_PROFILE_CONTRACT_ABI,
  POWER_ABI,
  RANK_ABI,
  RANK_NAMES,
  RANK_XP,
  TRAVEL_DESTINATIONS,
} from "@/lib/contract";
import { useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  User,
  MapPin,
  Loader2,
  AlertCircle,
  Shield,
  Swords,
  Star,
} from "lucide-react";


interface ProfileData {
  profileId: bigint;
  username: string;
  cityId: number;
  isActive: boolean;
}

export function MyProfile() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { authData, isSigning: signing, signError, requestSignature } = useAuth();

  const {
    data: profileRaw,
    isLoading,
    isError,
    refetch,
  } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "getUserProfile",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const profile = profileRaw as ProfileData | undefined;

  const { data: powerRaw, isLoading: isPowerLoading } = useReadContract({
    address: addresses.equipment,
    abi: POWER_ABI,
    functionName: "getTotalPower",
    args:
      authData && address && profile
        ? [address, profile.cityId, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address && !!profile },
  });

  const { data: rankRaw, isLoading: isRankLoading } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankLevel",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: rankXpRaw, isLoading: isRankXpLoading } = useReadContract({
    address: addresses.rankXp,
    abi: RANK_ABI,
    functionName: "getRankXp",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address },
  });

  const rankLevel = rankRaw !== undefined ? Number(rankRaw) : null;
  const rankXp = rankXpRaw !== undefined ? Number(rankXpRaw) : null;

  // Calculate rank progress percentage
  const rankProgress = (() => {
    if (rankLevel === null || rankXp === null) return null;
    const currentLevelXp = RANK_XP[rankLevel - 1] ?? 0;
    const nextLevelXp = RANK_XP[rankLevel];

    // Max rank — show 100%
    if (nextLevelXp === undefined) return 100;
    const range = nextLevelXp - currentLevelXp;
    if (range <= 0) return 100;
    const progress = ((rankXp - currentLevelXp) / range) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  })();

  const powerData = powerRaw as [bigint, bigint] | undefined;
  const defense = powerData ? Number(powerData[0]).toLocaleString() : null;
  const offense = powerData ? Number(powerData[1]).toLocaleString() : null;

  const cityName =
    profile && profile.cityId < TRAVEL_DESTINATIONS.length
      ? TRAVEL_DESTINATIONS[profile.cityId].label
      : profile
        ? `City #${profile.cityId}`
        : "Unknown";

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <User className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">My Profile</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to view your profile.
        </p>
      </div>
    );
  }

  if (signing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Sign to Verify</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please sign the message in your wallet to load your profile.
        </p>
      </div>
    );
  }

  if (signError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">
          Signature Required
        </p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          A wallet signature is needed to verify your identity.
        </p>
        <button
          onClick={requestSignature}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign Message
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">
          Loading Profile...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">
          Failed to Load Profile
        </p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Could not fetch your profile data.
        </p>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">My Profile</h3>
            <p className="text-xs text-muted-foreground font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Refresh profile"
        >
          <Loader2 className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </button>
      </div>

      {/* Profile Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Username */}
        <div className="rounded-lg bg-background/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Username
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {profile?.username || "Unknown"}
          </p>
        </div>

        {/* City Location */}
        <div className="rounded-lg bg-background/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              City Location
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{cityName}</p>
          {profile && profile.cityId < TRAVEL_DESTINATIONS.length && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {TRAVEL_DESTINATIONS[profile.cityId].country}
            </p>
          )}
        </div>

        {/* Rank Level */}
        <div className="rounded-lg bg-background/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rank
            </span>
          </div>
          {isRankLoading || isRankXpLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : rankLevel !== null ? (
            <>
              <p className="text-2xl font-bold text-foreground">
                {RANK_NAMES[rankLevel] ?? `Rank ${rankLevel}`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Level {rankLevel}
              </p>
              {rankProgress !== null && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {rankXp !== null ? `${rankXp.toLocaleString()} XP` : ""}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {rankLevel < 30
                        ? `${(RANK_XP[rankLevel + 1] ?? 0).toLocaleString()} XP`
                        : "MAX"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${rankProgress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium text-primary">
                    {rankProgress}% progress
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-2xl font-bold text-foreground">-</p>
          )}
        </div>

        {/* Defensive Power */}
        <div className="rounded-lg bg-background/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Defensive
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {isPowerLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              defense ?? "-"
            )}
          </p>
        </div>

        {/* Offensive Power */}
        <div className="rounded-lg bg-background/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Offensive
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {isPowerLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              offense ?? "-"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
