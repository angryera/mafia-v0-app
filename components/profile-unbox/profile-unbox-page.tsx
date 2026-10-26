"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { isAddress, zeroAddress, type PublicClient } from "viem";

import { useChain, useChainAddresses } from "@/components/chain-provider";
import { ProfileIdentityCard } from "@/components/profile-unbox/identity";
import { ProfileRewardReveal } from "@/components/profile-unbox/reveal";
import { ProfileSignup } from "@/components/profile-unbox/signup";
import { ProfileTierConsole, type TokenBalance } from "@/components/profile-unbox/tiers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { toast } from "@/hooks/use-toast";
import { ERC20_ABI, USER_PROFILE_CONTRACT_ABI } from "@/lib/contract";
import { formatEllipsisAddress } from "@/lib/format";
import {
  FREE_TIER,
  PROFILE_CHECK_ERROR,
  PROFILE_UNBOX_ABI,
  TIER_COLORS,
  UNBOX_NETWORK_UNAVAILABLE,
  UnboxQuoteChangedError,
  actionErrorMessage,
  assertFreshPayment,
  bufferedUnboxPayment,
  claimOpenLock,
  claimRequestLock,
  decodeUnboxed,
  defaultTokenId,
  hasUnboxAddress,
  isVerifiedResult,
  loadPaidUnboxOptions,
  openLockKey,
  paidTierIndex,
  paymentLabel,
  profileNameError,
  quoteUnboxPayment,
  readAccountUnboxState,
  readFreshPayment,
  readPendingUnbox,
  releaseOpenLock,
  releaseRequestLock,
  sameAddress,
  type ContractRead,
  type PendingUnbox,
  type ProfileSignupDraft,
  type ProfileTier,
  type ProfileTierId,
  type ProfileUnboxResult,
  type UnboxPaymentToken,
} from "@/lib/profile-unbox";
import { cn } from "@/lib/utils";

type ProfileState =
  | { status: "disconnected" }
  | { status: "checking" }
  | { status: "error" }
  | { status: "ready"; hasProfile: boolean };

async function readTokenBalance(
  client: PublicClient,
  account: `0x${string}`,
  token: UnboxPaymentToken,
): Promise<bigint> {
  if (sameAddress(token.address, zeroAddress)) return client.getBalance({ address: account });
  return client.readContract({
    address: token.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account],
  }) as Promise<bigint>;
}

export function ProfileUnboxPage() {
  const { address: account } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const { writeContractAsync } = useChainWriteContract();
  const queryClient = useQueryClient();
  const refreshPlayerReads = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["readContract"] });
  }, [queryClient]);

  const [profileState, setProfileState] = useState<ProfileState>(
    account ? { status: "checking" } : { status: "disconnected" },
  );
  const [step, setStep] = useState<"signup" | "tier">("signup");
  const [draft, setDraft] = useState<ProfileSignupDraft | null>(null);
  const [paidTiers, setPaidTiers] = useState<ProfileTier[]>([]);
  const [tokens, setTokens] = useState<UnboxPaymentToken[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<ProfileTierId>("free");
  const [balances, setBalances] = useState<Record<number, TokenBalance>>({});
  const [optionsError, setOptionsError] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [pending, setPending] = useState<PendingUnbox | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [acknowledgedTierId, setAcknowledgedTierId] = useState<ProfileTierId | null>(null);
  const [result, setResult] = useState<ProfileUnboxResult | null>(null);
  const [revealFinished, setRevealFinished] = useState(false);
  const tierSectionRef = useRef<HTMLDivElement>(null);
  const autoOpenRef = useRef<{ account: string; requestBlock: bigint } | null>(null);
  const sessionKey = `${account ?? ""}:${chainConfig.wagmiChainId}`;
  const sessionKeyRef = useRef(sessionKey);
  const checkedKeyRef = useRef("");

  const unboxAddress = hasUnboxAddress(addresses.profileUnbox) ? addresses.profileUnbox : null;
  const isExisting = profileState.status === "ready" && profileState.hasProfile;
  const visibleTiers = isExisting ? paidTiers : [FREE_TIER, ...paidTiers];
  const displayedTierId = pending?.tierId ?? (isExisting && selectedTierId === "free" ? "common" : selectedTierId);
  const tier = visibleTiers.find((item) => item.id === displayedTierId) ?? visibleTiers[0];
  const showTier = isExisting || step === "tier";
  const themeId = showTier && tier ? tier.id : "free";
  const verified = result ? isVerifiedResult(result, paidTiers) : false;
  const resultTier = result ? paidTiers.find((item) => item.id === result.tierId) : undefined;
  const finishReveal = useCallback(() => setRevealFinished(true), []);

  const reader = useCallback<ContractRead>((parameters) => {
    if (!publicClient) return Promise.reject(new Error(PROFILE_CHECK_ERROR));
    return publicClient.readContract(parameters as never);
  }, [publicClient]);

  const reloadOptions = useCallback(async () => {
    if (!publicClient) return;
    if (!unboxAddress) {
      setPaidTiers([]);
      setTokens([]);
      setOptionsError(UNBOX_NETWORK_UNAVAILABLE);
      setOptionsLoading(false);
      return;
    }
    setOptionsLoading(true);
    try {
      const loaded = await loadPaidUnboxOptions(reader, {
        unbox: unboxAddress,
        profile: addresses.userProfile,
        swapRouter: addresses.swapRouter,
      });
      setPaidTiers(loaded.tiers);
      setTokens(loaded.tokens);
      setSelectedTokenId((current) => (
        current !== null && loaded.tokens.some((token) => token.id === current)
          ? current
          : defaultTokenId(loaded.tokens)
      ));
      setOptionsError(loaded.tokens.length ? "" : "No payment tokens are enabled for profile unboxing.");
    } catch (error) {
      setPaidTiers([]);
      setTokens([]);
      setOptionsError(error instanceof Error ? error.message : "Could not load profile tiers.");
    } finally {
      setOptionsLoading(false);
    }
  }, [addresses.swapRouter, addresses.userProfile, publicClient, reader, unboxAddress]);

  useEffect(() => {
    void reloadOptions();
  }, [reloadOptions]);

  useEffect(() => {
    const changedSession = sessionKeyRef.current !== sessionKey;
    sessionKeyRef.current = sessionKey;
    if (changedSession) {
      autoOpenRef.current = null;
      checkedKeyRef.current = "";
      setResult(null);
      setRevealFinished(false);
      setAcknowledgedTierId(null);
      setPending(null);
    }
    if (!account) {
      setProfileState({ status: "disconnected" });
      setPending(null);
      return;
    }
    if (!publicClient) {
      setProfileState({ status: "checking" });
      return;
    }
    let active = true;
    if (checkedKeyRef.current !== sessionKey) setProfileState({ status: "checking" });
    readAccountUnboxState(reader, addresses.userProfile, unboxAddress, account)
      .then((state) => {
        if (!active) return;
        checkedKeyRef.current = sessionKey;
        setProfileState({ status: "ready", hasProfile: state.hasProfile });
        setPending(state.pending);
        if (state.pending) setSelectedTierId(state.pending.tierId);
      })
      .catch(() => {
        if (!active) return;
        checkedKeyRef.current = "";
        setProfileState({ status: "error" });
        setPending(null);
      });
    return () => {
      active = false;
    };
  }, [account, addresses.userProfile, publicClient, reader, sessionKey, unboxAddress]);

  useEffect(() => {
    if (!draft) return;
    if (!account || draft.account.toLowerCase() !== account.toLowerCase()) {
      setDraft(null);
      setStep("signup");
      setResult(null);
    }
  }, [account, draft]);

  useEffect(() => {
    if (isExisting && selectedTierId === "free") setSelectedTierId("common");
  }, [isExisting, selectedTierId]);

  useEffect(() => {
    if (!account || !publicClient || !pending || pending.canOpen || !unboxAddress) return;
    const tick = () => {
      void readPendingUnbox(reader, unboxAddress, account)
        .then((next) => {
          if (!next) return;
          const expected = autoOpenRef.current;
          if (
            expected
            && expected.account.toLowerCase() === account.toLowerCase()
            && next.requestBlock !== expected.requestBlock
          ) {
            autoOpenRef.current = null;
          }
          setPending((current) => {
            if (
              current &&
              current.canOpen === next.canOpen &&
              current.tierId === next.tierId &&
              current.requestBlock === next.requestBlock
            ) return current;
            return next;
          });
        })
        .catch(() => undefined);
    };
    tick();
    const timer = window.setInterval(tick, 4000);
    return () => window.clearInterval(timer);
  }, [account, pending, publicClient, reader, unboxAddress]);

  const tokenKey = tokens.map((token) => `${token.id}:${token.address}`).join("|");
  useEffect(() => {
    if (!account || !publicClient || tokens.length === 0) {
      setBalances({});
      return;
    }
    let active = true;
    setBalances(Object.fromEntries(tokens.map((token) => [token.id, { state: "loading" }])));
    void Promise.all(tokens.map(async (token) => {
      try {
        const value = await readTokenBalance(publicClient, account, token);
        return [token.id, { state: "ready", value }] as const;
      } catch {
        toast({ title: `Could not read your ${token.name} balance.`, variant: "destructive" });
        return [token.id, { state: "unknown" }] as const;
      }
    })).then((entries) => {
      if (active) setBalances(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [account, publicClient, tokenKey, tokens]);

  const refreshSelectedBalance = async () => {
    const token = tokens.find((item) => item.id === selectedTokenId);
    if (!account || !publicClient || !token) return;
    try {
      const value = await readTokenBalance(publicClient, account, token);
      setBalances((current) => ({ ...current, [token.id]: { state: "ready", value } }));
    } catch {
      toast({ title: `Could not refresh your ${token.name} balance. Try again.`, variant: "destructive" });
    }
  };

  const selectTier = (tierId: ProfileTierId) => {
    if (pending || requesting || opening) return;
    if (tierId !== selectedTierId) setAcknowledgedTierId(null);
    setSelectedTierId(tierId);
  };

  const requestBox = async (tierId: ProfileTierId = tier?.id ?? "free") => {
    if (!account || !claimRequestLock()) return;
    const chosen = (isExisting ? paidTiers : [FREE_TIER, ...paidTiers]).find((item) => item.id === tierId);
    const token = tokens.find((item) => item.id === selectedTokenId);
    setRequesting(true);
    try {
      if (!publicClient) throw new Error(PROFILE_CHECK_ERROR);
      const exists = Boolean(await publicClient.readContract({
        address: addresses.userProfile,
        abi: USER_PROFILE_CONTRACT_ABI,
        functionName: "hasProfile",
        args: [account],
      }));
      if (exists !== isExisting) throw new Error("Your profile status changed. Refresh and try again.");

      if (chosen?.id === "free") {
        if (!draft || draft.account.toLowerCase() !== account.toLowerCase()) {
          throw new Error("Complete your player details for this wallet.");
        }
        const referrer = draft.referrer || zeroAddress;
        if (!isAddress(referrer)) throw new Error("Enter a valid referral wallet address.");
        const hash = await writeContractAsync({
          address: addresses.userProfile,
          abi: USER_PROFILE_CONTRACT_ABI,
          functionName: "createProfile",
          args: [draft.name, BigInt(0), referrer, draft.gender, draft.country, BigInt(0)],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        setProfileState({ status: "ready", hasProfile: true });
        setSelectedTierId("common");
        setStep("tier");
        refreshPlayerReads();
        toast({ title: "Profile created." });
        return;
      }

      if (!chosen || !token || !unboxAddress) return;
      const referrer = draft?.referrer || zeroAddress;
      if (!isExisting) {
        if (!draft || draft.account.toLowerCase() !== account.toLowerCase()) {
          throw new Error("Complete your player details for this wallet.");
        }
        if (!isAddress(referrer)) throw new Error("Enter a valid referral wallet address.");
      }
      const alreadyPending = await readPendingUnbox(reader, unboxAddress, account);
      if (alreadyPending) throw new Error("Open your pending box before buying another.");

      const estimated = quoteUnboxPayment(chosen.priceUsdWei, token);
      const shownBuffer = bufferedUnboxPayment(estimated);
      const fresh = await readFreshPayment(reader, unboxAddress, addresses.swapRouter);
      assertFreshPayment({
        rawPrices: fresh.rawPrices,
        tierIndex: paidTierIndex(chosen.id),
        previous: token,
        freshTokens: fresh.tokens,
        shownBuffer,
      });

      let available: bigint;
      try {
        available = await readTokenBalance(publicClient, account, token);
        setBalances((current) => ({ ...current, [token.id]: { state: "ready", value: available } }));
      } catch {
        throw new Error(`Could not check your ${token.name} balance. Try again.`);
      }
      if (available < shownBuffer) {
        throw new Error(`Insufficient ${token.name} balance. You need ${paymentLabel(shownBuffer, token)}.`);
      }

      const native = sameAddress(token.address, zeroAddress);
      if (!native) {
        const allowance = await publicClient.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [account, unboxAddress],
        }) as bigint;
        if (allowance < shownBuffer) {
          const approveHash = await writeContractAsync({
            address: token.address,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [unboxAddress, shownBuffer],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      const tierIndex = paidTierIndex(chosen.id);
      const hash = await writeContractAsync({
        address: unboxAddress,
        abi: PROFILE_UNBOX_ABI,
        functionName: isExisting ? "requestUnbox" : "createProfileAndUnbox",
        args: isExisting
          ? [tierIndex, BigInt(token.id)]
          : [draft!.name, referrer, draft!.gender, draft!.country, BigInt(0), tierIndex, BigInt(token.id)],
        ...(native ? { value: shownBuffer } : {}),
      } as never);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const requestBlock = receipt.blockNumber;
      autoOpenRef.current = { account, requestBlock };
      setPending({ tierId: chosen.id as PendingUnbox["tierId"], requestBlock, canOpen: false });
      setSelectedTierId(chosen.id);
      if (!isExisting) {
        setProfileState({ status: "ready", hasProfile: true });
        refreshPlayerReads();
      }
      try {
        const next = await readPendingUnbox(reader, unboxAddress, account);
        if (next && next.requestBlock === requestBlock) setPending(next);
      } catch {
        // The waiting state stays visible while polling retries.
      }
    } catch (error) {
      if (error instanceof UnboxQuoteChangedError || (error instanceof Error && /payment token/i.test(error.message))) {
        try {
          await reloadOptions();
        } catch {
          // The toast still reports why the request stopped.
        }
      }
      const fallback = chosen?.id === "free" ? "Could not create your profile." : "The unbox request failed.";
      toast({ title: actionErrorMessage(error, fallback), variant: "destructive" });
    } finally {
      releaseRequestLock();
      setRequesting(false);
    }
  };

  const openBox = useCallback(async () => {
    if (!account || !publicClient || !pending || !unboxAddress) return;
    const key = openLockKey(account, pending.requestBlock);
    if (!claimOpenLock(key)) return;
    autoOpenRef.current = null;
    setOpening(true);
    try {
      const hash = await writeContractAsync({
        address: unboxAddress,
        abi: PROFILE_UNBOX_ABI,
        functionName: "openUnbox",
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const award = decodeUnboxed(receipt, account);
      refreshPlayerReads();
      setRevealFinished(false);
      setResult(award);
      setPending(null);
      setSelectedTierId(award.tierId);
    } catch (error) {
      toast({ title: actionErrorMessage(error, "Could not open your box."), variant: "destructive" });
      try {
        const next = await readPendingUnbox(reader, unboxAddress, account);
        if (next) setPending(next);
      } catch {
        // Keep the ready box visible so the player can retry.
      }
    } finally {
      releaseOpenLock(key);
      setOpening(false);
    }
  }, [account, pending, publicClient, reader, refreshPlayerReads, unboxAddress, writeContractAsync]);

  const openBoxRef = useRef(openBox);
  openBoxRef.current = openBox;
  useEffect(() => {
    const expected = autoOpenRef.current;
    if (!expected || !account || !pending?.canOpen) return;
    if (expected.account.toLowerCase() !== account.toLowerCase()) return;
    if (expected.requestBlock !== pending.requestBlock) return;
    void openBoxRef.current();
  }, [account, pending]);

  const rollAgain = () => {
    if (!result) return;
    const tierId = result.tierId;
    setAcknowledgedTierId(tierId);
    setSelectedTierId(tierId);
    setResult(null);
    setRevealFinished(false);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tierSectionRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    tierSectionRef.current?.focus({ preventScroll: true });
    void requestBox(tierId);
  };

  const backHref = isExisting ? "/my-profile" : "/players";
  const heading = profileState.status === "checking"
    ? "Profile unboxing"
    : isExisting
      ? "Raise the stakes."
      : showTier
        ? "Choose your starting tier."
        : "Create your player.";
  const lede = isExisting
    ? "Choose a tier to upgrade your profile."
    : showTier
      ? "Review your tier and payment, then confirm in your wallet."
      : "Enter your player details. Choosing a tier comes next.";

  return (
    <div style={{ ["--unbox-accent" as string]: TIER_COLORS[themeId] }}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {isExisting ? "profile" : "players"}
      </Link>
      <header className="mt-4 mb-6 border-b border-white/10 pb-5" style={{ borderColor: "color-mix(in srgb, var(--unbox-accent) 45%, transparent)" }}>
        <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--unbox-accent)" }}>Profile unboxing</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{heading}</h1>
        {profileState.status !== "checking" && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{lede}</p>}
      </header>

      {profileState.status === "checking" && <p role="status">Checking your profile on chain…</p>}
      {profileState.status === "error" && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {PROFILE_CHECK_ERROR}
        </p>
      )}

      {profileState.status !== "error" && (
        <>
          {!isExisting && profileState.status !== "checking" && (
            <nav className="mb-5 flex gap-3 text-sm" aria-label="Profile creation steps">
              <span className={cn("rounded-full border px-3 py-1", step === "signup" ? "border-[var(--unbox-accent)] text-foreground" : "border-border text-muted-foreground")} aria-current={step === "signup" ? "step" : undefined}>
                01 <strong>Player details</strong>
              </span>
              <span className={cn("rounded-full border px-3 py-1", step === "tier" ? "border-[var(--unbox-accent)] text-foreground" : "border-border text-muted-foreground")} aria-current={step === "tier" ? "step" : undefined}>
                02 <strong>Choose tier</strong>
              </span>
            </nav>
          )}

          {!isExisting && (
            <div hidden={showTier || profileState.status === "checking"}>
              <ProfileSignup
                account={account}
                chainLabel={chainConfig.label}
                onCheckName={(name) => profileNameError(reader, addresses.userProfile, name)}
                onNext={(next) => {
                  setDraft(next);
                  setStep("tier");
                }}
              />
            </div>
          )}

          {showTier && profileState.status !== "checking" && (
            <div ref={tierSectionRef} tabIndex={-1} role="region" aria-label="Tier selection" className="scroll-mt-24 outline-none">
              {!isExisting && (
                <div className="mb-4 flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Player details saved for this session</span>
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => {
                      setStep("signup");
                      window.requestAnimationFrame(() => document.getElementById("signup-name")?.focus());
                    }}
                  >
                    Edit details
                  </button>
                </div>
              )}
              {optionsError && (
                <p role="alert" className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                  {optionsError}
                </p>
              )}
              {optionsLoading && !optionsError && paidTiers.length === 0 && (
                <p role="status" className="mb-4 text-sm text-muted-foreground">Loading paid tiers and payment options…</p>
              )}
              {tier && account && (
                <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <ProfileIdentityCard
                    existing={isExisting}
                    name={isExisting ? formatEllipsisAddress(account) : draft?.name || "Player"}
                    country={isExisting ? "Unlisted" : draft?.country || "Unlisted"}
                    gender={isExisting ? null : draft?.gender ?? null}
                    chainLabel={chainConfig.label}
                    referrer={isExisting ? undefined : draft?.referrer || undefined}
                    account={account}
                    tier={tier}
                  />
                  <ProfileTierConsole
                    tiers={visibleTiers}
                    isExistingPlayer={isExisting}
                    selectedTierId={tier.id}
                    onSelectTier={selectTier}
                    tokens={tokens}
                    balances={balances}
                    selectedTokenId={selectedTokenId}
                    onSelectToken={setSelectedTokenId}
                    onRefreshBalance={() => void refreshSelectedBalance()}
                    pending={pending}
                    requesting={requesting}
                    opening={opening}
                    acknowledged={acknowledgedTierId === tier.id}
                    onAcknowledge={(checked) => setAcknowledgedTierId(checked ? tier.id : null)}
                    onUnbox={() => void requestBox(tier.id)}
                    onOpen={() => void openBox()}
                    disabled={Boolean(optionsError) && tier.id !== "free"}
                  />
                </div>
              )}
              {pending && !tier && (
                <div className="mt-4">
                  <p role="status" className="mb-3 text-sm text-muted-foreground">
                    {pending.canOpen
                      ? "Your box is ready. Opening needs one more wallet confirmation."
                      : "Waiting for the required blocks. This page checks automatically."}
                  </p>
                  <Button type="button" onClick={() => void openBox()} disabled={!pending.canOpen || opening}>
                    {opening ? "Opening…" : pending.canOpen ? "Open box" : "Waiting for blocks…"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(result)} onOpenChange={(open) => { if (!open) setResult(null); }}>
        <DialogContent
          className="max-h-[85vh] max-w-xl overflow-y-auto"
          style={{ ["--unbox-accent" as string]: TIER_COLORS[result?.tierId ?? themeId], borderColor: "var(--unbox-accent)" }}
        >
          <DialogHeader>
            <DialogTitle>Profile unboxing result</DialogTitle>
            <DialogDescription className="sr-only">Rewards from the confirmed unbox transaction.</DialogDescription>
          </DialogHeader>
          {result && verified && resultTier && (
            <ProfileRewardReveal result={result} tier={resultTier} onRevealComplete={finishReveal} />
          )}
          {result && !verified && (
            <p role="alert">The profile result could not be verified. Refresh and try again.</p>
          )}
          {result && (!verified || revealFinished) && (
            <DialogFooter className="gap-2 sm:items-center sm:justify-between">
              {verified && (
                <p className="text-left text-sm text-muted-foreground sm:mr-auto">
                  Roll again buys a new box with the same tier and payment token. Your wallet will ask you to confirm payment.
                </p>
              )}
              <Button type="button" variant="outline" onClick={() => setResult(null)}>Close</Button>
              {verified && <Button type="button" onClick={rollAgain}>Roll again</Button>}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
