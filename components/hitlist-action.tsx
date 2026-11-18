"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { isAddress, parseEther, zeroAddress } from "viem";
import {
  ChevronDown,
  Crosshair,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import {
  formatAttackDate,
  PlayerRecordLink,
  ProfileNamesWarning,
  useKillRecordNames,
} from "@/components/kill-record-parts";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BNB_ADMIN_LIST, HITLIST_ABI, PULSE_ADMIN_LIST, USER_PROFILE_CONTRACT_ABI } from "@/lib/contract";
import { getKnownProfiles, type KnownProfile } from "@/lib/killContract";
import { cn } from "@/lib/utils";
import {
  decodeFulfillProtocolListingReceipt,
  decodeListingCreatedId,
  formatHitlistCountdown,
  formatHitlistReward,
  formatRewardNumber,
  HitlistKind,
  HitlistState,
  hitlistErrorMessage,
  isHitlistConfigured,
  listingStateLabel,
  loadHitlistSnapshot,
  requireHitlistAddress,
  resolveTargetAddress,
  rewardKindFromType,
  sameAddress,
  type HitlistListing,
  type HitlistSnapshot,
} from "@/lib/hitlistContract";

const IS_PRODUCTION = process.env.NODE_ENV === "production";


type ListingFilter = "All" | "Player" | "Protocol" | "Mine" | "On me";
type ExpiryMode = "permanent" | "timed";
type WriteAction = "create" | "request" | "reveal" | `settle-${string}` | null;

const LISTINGS_PER_PAGE = 20;

function localDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function RewardGlyph({ kind }: { kind: "cash" | "hc" | "keys" }) {
  if (kind === "keys") return <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />;
  if (kind === "hc") {
    return (
      <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-sky-500/20 text-[9px] font-bold text-sky-300" aria-hidden>
        HC
      </span>
    );
  }
  return (
    <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-emerald-500/20 text-[10px] font-bold text-emerald-300" aria-hidden>
      $
    </span>
  );
}

export function HitlistAction() {
  const { address, isConnected } = useAccount();
  const { activeChain, chainConfig } = useChain();
  const addresses = useChainAddresses();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const write = useChainWriteContract();
  const names = useKillRecordNames();
  const profileScriptReady = useMafiaUtilsScript("MafiaProfile") === "ready";
  const configured = isHitlistConfigured(activeChain);

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [snapshot, setSnapshot] = useState<HitlistSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<KnownProfile[]>([]);
  const [profilesStatus, setProfilesStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [listingFilter, setListingFilter] = useState<ListingFilter>("All");
  const [listingsPage, setListingsPage] = useState(1);
  const [target, setTarget] = useState("");
  const [cash, setCash] = useState("");
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("permanent");
  const [expiryAt, setExpiryAt] = useState("");
  const [attemptedReview, setAttemptedReview] = useState(false);
  const [isVerifyingTarget, setIsVerifyingTarget] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [targetVerificationError, setTargetVerificationError] = useState("");
  const [reviewTargetAddress, setReviewTargetAddress] = useState("");
  const [reviewAccount, setReviewAccount] = useState("");
  const [writeAction, setWriteAction] = useState<WriteAction>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const requestId = useRef(0);
  const verificationInFlight = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = useCallback(async (quiet = false) => {
    if (!publicClient || !configured) {
      setSnapshot(null);
      setLoading(false);
      setError(configured ? "" : "Hitlist is not deployed on this chain.");
      return;
    }
    const id = ++requestId.current;
    if (!quiet) setLoading(true);
    try {
      const next = await loadHitlistSnapshot(publicClient, activeChain);
      if (id !== requestId.current) return;
      setSnapshot(next);
      setError("");
    } catch {
      if (id !== requestId.current) return;
      setSnapshot(null);
      setError("Could not read the Hitlist contract. Check your connection and retry.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [activeChain, configured, publicClient]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!writeAction) void refresh(true);
    }, 15_000);
    return () => {
      requestId.current += 1;
      window.clearInterval(timer);
    };
  }, [refresh, writeAction]);

  useEffect(() => {
    if (!profileScriptReady) {
      setProfiles([]);
      setProfilesStatus("loading");
      return;
    }
    let cancelled = false;
    setProfilesStatus("loading");
    void getKnownProfiles({ chain: activeChain })
      .then((rows) => {
        if (cancelled) return;
        setProfiles(rows);
        setProfilesStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setProfiles([]);
        setProfilesStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [activeChain, profileScriptReady]);

  useEffect(() => {
    setListingsPage(1);
    if (!address) {
      setListingFilter((current) => (current === "Mine" || current === "On me" ? "All" : current));
    }
  }, [address]);

  const { data: hasTargetProfile } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "hasProfile",
    args: reviewTargetAddress && isAddress(reviewTargetAddress) ? [reviewTargetAddress] : undefined,
    query: { enabled: Boolean(reviewTargetAddress && isAddress(reviewTargetAddress)) },
  });

  const hitlistAddress = configured ? requireHitlistAddress(activeChain) : zeroAddress;
  const minCash = snapshot?.config.playerMinAmount ?? 0n;
  const cashValid = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(cash) && cash.length <= 80;
  let cashAmount = 0n;
  if (cashValid) {
    try {
      cashAmount = parseEther(cash);
    } catch {
      cashAmount = 0n;
    }
  }
  const cashError =
    !cashValid || cashAmount <= 0n
      ? "Enter a positive cash amount with up to 18 decimal places."
      : snapshot && cashAmount < minCash
        ? `The minimum reward is $${formatRewardNumber(minCash, "cash")}.`
        : "";
  const targetAddress = resolveTargetAddress(target, profiles);
  const targetError = !target.trim()
    ? "Enter a player name or wallet address."
    : !targetAddress
      ? "Choose a known player name or enter their wallet address."
      : address && sameAddress(targetAddress, address)
        ? "You cannot place a bounty on yourself."
        : "";
  const expiryTimestamp = Date.parse(expiryAt);
  const durationSeconds =
    expiryMode === "permanent"
      ? 0
      : Number.isFinite(expiryTimestamp)
        ? Math.ceil(expiryTimestamp / 1000 - now)
        : -1;
  const expiryError =
    expiryMode === "timed" &&
    snapshot &&
    (durationSeconds < snapshot.config.playerMinDuration ||
      durationSeconds > snapshot.config.playerMaxDuration)
      ? `Choose a date ${Math.ceil(snapshot.config.playerMinDuration / 86_400)}–${Math.floor(snapshot.config.playerMaxDuration / 86_400)} days from now.`
      : "";
  const minimumExpiry = snapshot
    ? localDateTime(new Date((now + snapshot.config.playerMinDuration) * 1000))
    : "";
  const maximumExpiry = snapshot
    ? localDateTime(new Date((now + snapshot.config.playerMaxDuration) * 1000))
    : "";

  const adminCreatorAddresses = useMemo(() => {
    if (!IS_PRODUCTION) return new Set<string>();
    const adminNames = new Set<string>(
      activeChain === "bnb" ? [...BNB_ADMIN_LIST] : [...PULSE_ADMIN_LIST],
    );
    return new Set(
      profiles
        .filter((profile) => profile.address && profile.name && adminNames.has(profile.name))
        .map((profile) => profile.address.toLowerCase()),
    );
  }, [activeChain, profiles]);

  const awaitingAdminProfiles = IS_PRODUCTION && profilesStatus !== "ready";

  const visibleListings = useMemo(() => {
    const openListings = error ? [] : snapshot?.listings ?? [];
    return openListings.filter((listing) => {
      // Production: hide player bounties posted by admin accounts (and wait for names first).
      if (IS_PRODUCTION && listing.kind === HitlistKind.Player) {
        if (awaitingAdminProfiles || adminCreatorAddresses.has(listing.creator.toLowerCase())) {
          return false;
        }
      }
      if (listingFilter === "Player") return listing.kind === HitlistKind.Player;
      if (listingFilter === "Protocol") return listing.kind === HitlistKind.Protocol;
      if (listingFilter === "Mine") return sameAddress(listing.creator, address);
      if (listingFilter === "On me") return sameAddress(listing.target, address);
      return true;
    });
  }, [
    address,
    adminCreatorAddresses,
    awaitingAdminProfiles,
    error,
    listingFilter,
    snapshot?.listings,
  ]);

  const listingPageCount = Math.max(1, Math.ceil(visibleListings.length / LISTINGS_PER_PAGE));
  const currentListingPage = Math.min(listingsPage, listingPageCount);
  const pagedListings = visibleListings.slice(
    (currentListingPage - 1) * LISTINGS_PER_PAGE,
    currentListingPage * LISTINGS_PER_PAGE,
  );

  useEffect(() => {
    setListingsPage((current) => Math.min(current, listingPageCount));
  }, [listingPageCount]);

  const pending = error ? undefined : snapshot?.pending;
  const requestPending = Boolean(pending && pending.requestBlock > 0n && !pending.expired);
  const canReveal = Boolean(requestPending && pending?.ready);
  const canRequest = Boolean(snapshot && !error && !requestPending && now >= snapshot.nextProtocolListingAt);
  const protocolAction = canReveal ? "reveal" : canRequest ? "request" : null;
  const countdown = snapshot && !error ? Math.max(0, snapshot.nextProtocolListingAt - now) : 0;

  const reviewListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (verificationInFlight.current || !publicClient) return;
    setAttemptedReview(true);
    setReviewError("");
    setTargetVerificationError("");
    if (!snapshot || !targetAddress || targetError) return;
    if (cashError) return;
    if (expiryError) return;
    verificationInFlight.current = true;
    setIsVerifyingTarget(true);
    try {
      const exists = await publicClient.readContract({
        address: addresses.userProfile,
        abi: USER_PROFILE_CONTRACT_ABI,
        functionName: "hasProfile",
        args: [targetAddress],
      });
      if (!exists) {
        setTargetVerificationError("That target does not have a game profile.");
        return;
      }
      setReviewTargetAddress(targetAddress);
      setReviewAccount(address ?? "");
      setIsReviewing(true);
    } catch {
      setTargetVerificationError("Could not verify the target's game profile. Please try again.");
    } finally {
      verificationInFlight.current = false;
      setIsVerifyingTarget(false);
    }
  };

  const createListing = async () => {
    if (!snapshot || error || !address || !reviewTargetAddress || writeAction || !publicClient) return;
    if (sameAddress(reviewTargetAddress, address)) {
      setReviewError("You cannot place a bounty on yourself. Edit the target and review again.");
      return;
    }
    if (reviewAccount && !sameAddress(reviewAccount, address)) {
      setReviewError("Your connected wallet changed. Edit and review the listing again.");
      return;
    }
    const currentDuration =
      expiryMode === "permanent" ? 0 : Math.ceil(expiryTimestamp / 1000 - Date.now() / 1000);
    if (
      cashError ||
      (expiryMode === "timed" &&
        (!Number.isSafeInteger(currentDuration) ||
          currentDuration < snapshot.config.playerMinDuration ||
          currentDuration > snapshot.config.playerMaxDuration))
    ) {
      setReviewError("The listing details are no longer valid. Edit the listing and review again.");
      return;
    }
    if (hasTargetProfile === false) {
      setReviewError("That target does not have a game profile.");
      return;
    }
    setWriteAction("create");
    setReviewError("");
    try {
      const hash = await write.writeContractAsync({
        address: hitlistAddress,
        abi: HITLIST_ABI,
        functionName: "createListing",
        args: [reviewTargetAddress, cashAmount, currentDuration],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const listingId = decodeListingCreatedId(receipt, hitlistAddress);
      toast.success(`Listing #${listingId.toString()} is live.`);
      setTarget("");
      setCash("");
      setExpiryAt("");
      setExpiryMode("permanent");
      setReviewAccount("");
      setAttemptedReview(false);
      setIsReviewing(false);
      await refresh(true);
    } catch (caught) {
      const message = hitlistErrorMessage(caught);
      setReviewError(message);
      toast.error(message);
    } finally {
      setWriteAction(null);
    }
  };

  const runProtocolAction = async () => {
    if (!snapshot || error || !address || !protocolAction || writeAction || !publicClient) return;
    setWriteAction(protocolAction);
    try {
      if (protocolAction === "request") {
        const hash = await write.writeContractAsync({
          address: hitlistAddress,
          abi: HITLIST_ABI,
          functionName: "requestProtocolListing",
          args: [],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        toast.success("Protocol listing requested. Reveal it after two more blocks.");
      } else {
        const hash = await write.writeContractAsync({
          address: hitlistAddress,
          abi: HITLIST_ABI,
          functionName: "fulfillProtocolListing",
          args: [],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const result = decodeFulfillProtocolListingReceipt(receipt, hitlistAddress);
        toast[result.outcome === "created" ? "success" : "info"](
          result.outcome === "created"
            ? `Protocol listing #${result.listingId.toString()} is live.`
            : result.outcome === "skipped"
              ? "No eligible target was found. A new request is available."
              : "The request expired. Start a new one.",
        );
      }
      await refresh(true);
    } catch (caught) {
      toast.error(hitlistErrorMessage(caught));
      await refresh(true);
    } finally {
      setWriteAction(null);
    }
  };

  const settleListing = async (listing: HitlistListing) => {
    if (!snapshot || error || !address || writeAction || !publicClient) return;
    setWriteAction(`settle-${listing.id.toString()}`);
    try {
      const hash = await write.writeContractAsync({
        address: hitlistAddress,
        abi: HITLIST_ABI,
        functionName: "settle",
        args: [listing.id],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.success(
        listing.state === HitlistState.Refundable
          ? "Cash refunded to the listing creator."
          : "Survivor reward paid to the target.",
      );
      await refresh(true);
    } catch (caught) {
      toast.error(hitlistErrorMessage(caught));
      await refresh(true);
    } finally {
      setWriteAction(null);
    }
  };

  if (!configured) {
    return (
      <div className="rounded-xl border border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
        Hitlist is not deployed on {chainConfig.label}.
      </div>
    );
  }

  const filters: ListingFilter[] = [
    "All",
    "Player",
    "Protocol",
    ...(address ? (["Mine", "On me"] as const) : []),
  ];

  return (
    <div className="space-y-6">
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100" role="alert">
          <p>{error}</p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      ) : null}

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-400">
            Protocol submission · {snapshot && !error ? "live" : "status"}
          </p>
          <p className="text-sm text-foreground">
            {!snapshot || error
              ? error
                ? "Protocol status unavailable"
                : "Loading protocol status"
              : requestPending
                ? canReveal
                  ? "Protocol request ready"
                  : "Waiting for two blocks"
                : "Next protocol request"}
            <span className="ml-2 font-semibold text-red-300">
              {!snapshot || error
                ? error
                  ? "Read failed"
                  : "Loading"
                : requestPending
                  ? canReveal
                    ? "Reveal now"
                    : "Pending"
                  : formatHitlistCountdown(countdown)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {!snapshot || error
              ? error
                ? "Retry the contract read to see the current request and cooldown."
                : "Reading the current request and cooldown from the contract."
              : requestPending
                ? "Anyone can reveal this request after two blocks. Reveal it soon before its block window expires."
                : pending?.expired
                  ? "The previous request expired. A new request can be made when the cooldown allows it."
                  : "The cooldown applies only to protocol requests. Player cash bounties can still be created below."}
          </p>
        </div>
        {protocolAction ? (
          <Button
            className="shrink-0"
            disabled={Boolean(writeAction) || !isConnected}
            onClick={() => void runProtocolAction()}
          >
            {writeAction === protocolAction ? (
              <>
                <Loader2 className="animate-spin" /> Waiting…
              </>
            ) : !isConnected ? (
              "Connect wallet"
            ) : protocolAction === "reveal" ? (
              "Reveal listing"
            ) : (
              "Request listing"
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="shrink-0"
            disabled={loading || isRefreshing}
            onClick={() => {
              setIsRefreshing(true);
              void refresh(true).finally(() => setIsRefreshing(false));
            }}
          >
            {loading || isRefreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Refresh status
          </Button>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              The ledger
            </p>
            <h2 className="text-2xl font-semibold text-foreground">Open listings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live bounties, including expired listings waiting for settlement.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {error ? "Unavailable" : !snapshot ? "Loading" : `${visibleListings.length} listings`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter Hitlist listings">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={listingFilter === filter}
              onClick={() => {
                setListingFilter(filter);
                setListingsPage(1);
              }}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                listingFilter === filter
                  ? "border-red-400/70 bg-red-500/15 text-red-200"
                  : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {filter}
            </button>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            disabled={loading || isRefreshing}
            onClick={() => {
              setIsRefreshing(true);
              void refresh(true).finally(() => setIsRefreshing(false));
            }}
            aria-label="Refresh listings"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        <ProfileNamesWarning error={names.error} />

        {loading && !snapshot ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading on-chain listings…
            </CardContent>
          </Card>
        ) : null}
        {error ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Listings are unavailable until the contract read succeeds.
            </CardContent>
          </Card>
        ) : null}
        {!loading && !error && visibleListings.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
              {awaitingAdminProfiles ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin opacity-70" />
                  {profilesStatus === "failed"
                    ? "Player listings are unavailable until player profiles load. Reload the page to retry."
                    : "Loading player listings…"}
                </>
              ) : (
                <>
                  <Target className="h-8 w-8 opacity-40" />
                  No listings in this view yet.
                </>
              )}
            </CardContent>
          </Card>
        ) : null}

        <ol className="space-y-3" aria-label="Open hitlist listings">
          {pagedListings.map((listing) => {
            const kind = rewardKindFromType(listing.rewardType);
            const canRefund =
              listing.state === HitlistState.Refundable && sameAddress(listing.creator, address);
            const canClaim =
              listing.state === HitlistState.SurvivorClaimable &&
              sameAddress(listing.target, address);
            const expiresLabel =
              listing.expiresAt === 0
                ? "Never"
                : listing.expiresAt <= now
                  ? "Expired"
                  : formatHitlistCountdown(Math.ceil(listing.expiresAt - now));
            return (
              <li key={listing.id.toString()}>
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold uppercase tracking-wide">
                          Listing #{listing.id.toString()}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                            listing.kind === HitlistKind.Protocol
                              ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                              : "border-red-400/40 bg-red-500/10 text-red-200",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              listing.kind === HitlistKind.Protocol ? "bg-violet-300" : "bg-red-400",
                            )}
                            aria-hidden
                          />
                          {listing.kind === HitlistKind.Protocol ? "Protocol" : "Player"}
                        </span>
                      </div>
                      <time>{formatAttackDate(listing.createdAt)}</time>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Listing by
                        </p>
                        {listing.kind === HitlistKind.Protocol ? (
                          <p className="text-sm font-medium text-violet-200">Protocol</p>
                        ) : (
                          <PlayerRecordLink
                            address={listing.creator}
                            name={
                              sameAddress(listing.creator, address)
                                ? "You"
                                : names.label(listing.creator)
                            }
                          />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Target
                        </p>
                        <PlayerRecordLink
                          address={listing.target}
                          name={
                            sameAddress(listing.target, address)
                              ? "You"
                              : names.label(listing.target)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Reward
                        </p>
                        <p className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
                          <RewardGlyph kind={kind} />
                          {formatHitlistReward(listing.amount, kind)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Expires
                        </p>
                        <p
                          className="text-sm text-foreground"
                          title={
                            listing.expiresAt
                              ? `Ends ${new Date(listing.expiresAt * 1000).toLocaleString()}`
                              : undefined
                          }
                        >
                          {expiresLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          listing.state === HitlistState.Active
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-400/40 bg-amber-500/10 text-amber-200",
                        )}
                      >
                        {listingStateLabel(listing.state)}
                      </span>
                      {(canRefund || canClaim) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(writeAction)}
                          onClick={() => void settleListing(listing)}
                        >
                          {writeAction === `settle-${listing.id.toString()}` ? (
                            <>
                              <Loader2 className="animate-spin" /> Settling…
                            </>
                          ) : canRefund ? (
                            "Refund"
                          ) : (
                            `Claim ${snapshot ? snapshot.config.survivorBps / 100 : 50}%`
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>

        {listingPageCount > 1 ? (
          <div className="flex items-center justify-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={currentListingPage <= 1}
              onClick={() => setListingsPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {currentListingPage} of {listingPageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentListingPage >= listingPageCount}
              onClick={() => setListingsPage((page) => Math.min(listingPageCount, page + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Kill bounties pay automatically in the kill transaction. Expired rewards settle to the
          creator or surviving target.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-secondary/30 p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/10 text-red-300">
              <Crosshair className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Player submission
              </p>
              <h2 className="text-lg font-semibold text-foreground">Create a player cash bounty</h2>
            </div>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Fund a cash reward for another player. Your cash is taken when the transaction confirms,
            and your listing remains open if you die.
          </p>

          {isReviewing ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Review your listing</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirm the target, reward and expiry before paying with in-game cash.
                </p>
              </div>
              <dl className="space-y-3 rounded-lg border border-border bg-background/40 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Target</dt>
                  <dd className="text-right font-medium" title={reviewTargetAddress}>
                    <PlayerRecordLink
                      address={reviewTargetAddress}
                      name={names.label(reviewTargetAddress)}
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="break-all text-right text-xs">{reviewTargetAddress}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Cash reward</dt>
                  <dd className="inline-flex items-center gap-1.5 font-semibold">
                    <RewardGlyph kind="cash" />${formatRewardNumber(cashAmount, "cash")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd className="text-right">
                    {expiryMode === "permanent"
                      ? "Never · permanent"
                      : new Date(expiryTimestamp).toLocaleString()}
                  </dd>
                </div>
              </dl>
              <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/30 p-3 text-xs text-muted-foreground">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  No token approval is needed. The contract burns the cash from your in-game balance
                  on confirmation.
                </p>
              </div>
              {reviewError ? (
                <p className="text-sm text-red-300" role="alert">
                  {reviewError}
                </p>
              ) : null}
              <Button
                className="w-full"
                disabled={Boolean(writeAction) || !snapshot || Boolean(error) || !isConnected}
                onClick={() => void createListing()}
              >
                {writeAction === "create" ? (
                  <>
                    <Loader2 className="animate-spin" /> Waiting for wallet…
                  </>
                ) : !isConnected ? (
                  "Connect wallet to pay"
                ) : (
                  "Confirm and pay"
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={Boolean(writeAction)}
                onClick={() => {
                  setAttemptedReview(false);
                  setReviewError("");
                  setIsReviewing(false);
                }}
              >
                Edit listing
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(event) => void reviewListing(event)} noValidate>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="hitlist-target">
                  Target player name or address
                </label>
                <Input
                  id="hitlist-target"
                  placeholder="Player name or 0x address"
                  value={target}
                  maxLength={64}
                  disabled={isVerifyingTarget}
                  onChange={(event) => {
                    setTarget(event.target.value);
                    setTargetVerificationError("");
                  }}
                />
                <p
                  className={cn(
                    "text-xs",
                    targetVerificationError || (attemptedReview && targetError)
                      ? "text-red-300"
                      : "text-muted-foreground",
                  )}
                >
                  {targetVerificationError ||
                    (attemptedReview && targetError
                      ? targetError
                      : "The target must have a game profile and cannot be you.")}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="hitlist-cash">
                  Cash reward
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="hitlist-cash"
                    className="pl-7"
                    inputMode="decimal"
                    placeholder={snapshot ? formatRewardNumber(minCash, "cash") : "100000"}
                    value={cash}
                    disabled={isVerifyingTarget}
                    onChange={(event) => setCash(event.target.value)}
                  />
                </div>
                <p
                  className={cn(
                    "text-xs",
                    attemptedReview && cashError ? "text-red-300" : "text-muted-foreground",
                  )}
                >
                  {attemptedReview && cashError
                    ? cashError
                    : snapshot
                      ? `Minimum $${formatRewardNumber(minCash, "cash")}. Cash is paid up front.`
                      : "Loading contract minimum…"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Listing expiry</p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Listing expiry">
                  {(
                    [
                      ["permanent", "Permanent"],
                      ["timed", "Set end date"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={expiryMode === mode}
                      disabled={isVerifyingTarget}
                      onClick={() => setExpiryMode(mode)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                        expiryMode === mode
                          ? "border-red-400/70 bg-red-500/15 text-red-200"
                          : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {expiryMode === "timed" ? (
                  <>
                    <Input
                      type="datetime-local"
                      value={expiryAt}
                      min={minimumExpiry}
                      max={maximumExpiry}
                      disabled={isVerifyingTarget}
                      onChange={(event) => setExpiryAt(event.target.value)}
                    />
                    <p
                      className={cn(
                        "text-xs",
                        attemptedReview && expiryError ? "text-red-300" : "text-muted-foreground",
                      )}
                    >
                      {attemptedReview && expiryError
                        ? expiryError
                        : "If the listing expires, you can reclaim the full cash reward."}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The listing remains open until a normal kill pays it. Permanent listings cannot
                    be refunded.
                  </p>
                )}
              </div>

              {reviewError ? (
                <p className="text-sm text-red-300" role="alert">
                  {reviewError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={!snapshot || Boolean(error) || Boolean(writeAction) || isVerifyingTarget}
              >
                {isVerifyingTarget ? (
                  <>
                    <Loader2 className="animate-spin" /> Checking target…
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" /> Review listing
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Reviewing saves nothing. Payment happens only after wallet confirmation.
              </p>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-border bg-secondary/30 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Recorded settlements
              </p>
              <h2 className="text-lg font-semibold text-foreground">Recent history</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Settled listings among the 50 most recently created bounties.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {error ? "Unavailable" : snapshot ? `${snapshot.history.length} records` : "Loading"}
            </p>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-foreground"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
          >
            <span>View settled listings</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", historyOpen && "rotate-180")} />
          </button>
          {historyOpen ? (
            <div className="mt-3">
              {!snapshot || error ? (
                <p className="px-1 py-6 text-sm text-muted-foreground">
                  {error
                    ? "History is unavailable until the contract read succeeds."
                    : "Loading recent history…"}
                </p>
              ) : snapshot.history.length ? (
                <ol className="space-y-3" aria-label="Recent hitlist settlements">
                  {snapshot.history.map((listing) => {
                    const kind = rewardKindFromType(listing.rewardType);
                    return (
                      <li key={listing.id.toString()}>
                        <Card className="border-border/50 bg-background/30">
                          <CardContent className="space-y-3 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span className="font-semibold uppercase tracking-wide">
                                Listing #{listing.id.toString()}
                              </span>
                              <span>{listingStateLabel(listing.state)}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="inline-flex items-center gap-1.5 font-semibold">
                                <RewardGlyph kind={kind} />
                                {formatHitlistReward(listing.amount, kind)}
                              </span>
                              <span className="text-muted-foreground">on</span>
                              <PlayerRecordLink
                                address={listing.target}
                                name={names.label(listing.target)}
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                              {listing.state === HitlistState.Voided ? (
                                <span>No payout</span>
                              ) : (
                                <>
                                  <span>
                                    {listing.state === HitlistState.Refunded ? "Refunded" : "Awarded"}{" "}
                                    {formatHitlistReward(listing.settledAmount, kind)}
                                    {kind === "cash" && listing.state !== HitlistState.Refunded
                                      ? " before family tax"
                                      : ""}{" "}
                                    to
                                  </span>
                                  <PlayerRecordLink
                                    address={listing.settledTo}
                                    name={names.label(listing.settledTo)}
                                  />
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="px-1 py-6 text-sm text-muted-foreground">
                  No recent settlements to show.
                </p>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
