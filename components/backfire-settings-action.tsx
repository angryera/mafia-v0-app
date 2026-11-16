"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAccount, usePublicClient } from "wagmi";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { useChain } from "@/components/chain-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { getErrorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { KILL_INITIATOR_ABI, requireKillAddress } from "@/lib/killChain";
import {
  BACKFIRE_MAX_BULLETS,
  BACKFIRE_MIN_BULLETS,
  BACKFIRE_MODE_OPTIONS,
  BackfireMode,
  getDefaultBackfireSettings,
  loadBackfireSettings,
  toBackfireFixedAmount,
  type BackfireSettings,
} from "@/lib/backfireContract";

interface Draft {
  key: string;
  mode: BackfireMode;
  bulletAmount: string;
}

type LoadState = { key: string; status: "idle" | "loading" | "error"; message?: string };

function draftFromSettings(key: string, settings: BackfireSettings): Draft {
  return { key, mode: settings.mode, bulletAmount: String(settings.rangeMin) };
}

function ModeCard({
  title, description, index, selected, disabled, wide, onSelect,
}: {
  title: string;
  description: string;
  index: number;
  selected: boolean;
  disabled: boolean;
  wide: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex min-h-40 flex-col gap-3 rounded-xl border p-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background max-sm:min-h-0",
        wide && "sm:col-span-2 sm:min-h-0",
        disabled ? "cursor-default opacity-55" : "cursor-pointer hover:border-red-400/60",
        selected ? "border-red-400/80 bg-red-500/10" : "border-border bg-secondary/50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-400">
          {selected ? "Selected policy" : `Policy ${String(index + 1).padStart(2, "0")}`}
        </span>
        <span aria-hidden="true" className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-red-400" : "border-muted-foreground",
        )}>
          {selected && <span className="h-2.5 w-2.5 rounded-full bg-red-400" />}
        </span>
      </div>
      <h3 className="text-lg font-bold leading-tight text-foreground sm:text-xl">{title}</h3>
      <p className="mt-auto text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export function BackfireSettingsAction() {
  const { address, isConnected } = useAccount();
  const { activeChain, chainConfig } = useChain();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const { authData, isSigning, signError, requestSignature } = useAuth();
  const write = useChainWriteContract();

  const identity = address && authData
    ? `${activeChain}:${address.toLowerCase()}:${authData.signature}`
    : "";
  const latestIdentity = useRef(identity);

  const [loaded, setLoaded] = useState<{ key: string; settings: BackfireSettings } | null>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFromSettings("", getDefaultBackfireSettings()));
  const [loadState, setLoadState] = useState<LoadState>({ key: "", status: "idle" });
  const [saving, setSaving] = useState(false);

  const settings = loaded?.key === identity ? loaded.settings : null;
  const hasLoaded = Boolean(identity && settings && draft.key === identity);
  const isLoading = Boolean(identity && loadState.key === identity && loadState.status === "loading");
  const loadError = identity && loadState.key === identity && loadState.status === "error"
    ? loadState.message
    : null;

  const load = useCallback(async () => {
    if (!identity || !address || !authData || !publicClient) return false;
    const key = identity;
    setLoadState({ key, status: "loading" });
    try {
      const next = await loadBackfireSettings(
        publicClient, activeChain, address, authData.message, authData.signature,
      );
      if (latestIdentity.current !== key) return false;
      setLoaded({ key, settings: next });
      setDraft(draftFromSettings(key, next));
      setLoadState({ key, status: "idle" });
      return true;
    } catch (error) {
      if (latestIdentity.current !== key) return false;
      setLoaded(null);
      setLoadState({
        key,
        status: "error",
        message: getErrorMessage(error as Error) || "Could not load your saved policy.",
      });
      return false;
    }
  }, [identity, address, authData, publicClient, activeChain]);

  useEffect(() => {
    latestIdentity.current = identity;
  }, [identity]);

  useEffect(() => {
    if (!identity || !publicClient) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [identity, publicClient, load]);

  const selectedOption = BACKFIRE_MODE_OPTIONS.find((option) => option.mode === draft.mode)
    ?? BACKFIRE_MODE_OPTIONS[0];
  const savedOption = BACKFIRE_MODE_OPTIONS.find((option) => option.mode === settings?.mode)
    ?? BACKFIRE_MODE_OPTIONS[0];
  const isRange = draft.mode === BackfireMode.Range;
  const hasUnsavedChanges = Boolean(hasLoaded && settings && (
    draft.mode !== settings.mode ||
    (isRange && Number(draft.bulletAmount) !== settings.rangeMin)
  ));

  function handleReset() {
    if (settings && hasLoaded && !saving) setDraft(draftFromSettings(identity, settings));
  }

  async function handleSave() {
    if (!hasLoaded || !settings || !address || !publicClient || saving || !hasUnsavedChanges) return;
    const amount = Number(draft.bulletAmount);
    if (isRange && (
      !/^\d+$/.test(draft.bulletAmount) ||
      !Number.isSafeInteger(amount) ||
      amount < BACKFIRE_MIN_BULLETS ||
      amount > BACKFIRE_MAX_BULLETS
    )) {
      toast.error(`Bullet amount must be between ${BACKFIRE_MIN_BULLETS.toLocaleString()} and ${BACKFIRE_MAX_BULLETS.toLocaleString()}.`);
      return;
    }

    const key = identity;
    setSaving(true);
    try {
      const hash = await write.writeContractAsync({
        address: requireKillAddress(activeChain, "killInitiator"),
        abi: KILL_INITIATOR_ABI,
        functionName: "setBackfire",
        args: [draft.mode, toBackfireFixedAmount(draft.mode, amount)],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Backfire transaction failed.");
      if (latestIdentity.current === key) {
        await load();
        toast.success("Backfire settings saved.");
      }
    } catch (error) {
      if (latestIdentity.current === key) {
        toast.error(getErrorMessage(error as Error) || "Failed to save backfire settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  const statusText = settings
    ? <>{savedOption.title}{settings.mode === BackfireMode.Range ? ` · ${settings.rangeMin.toLocaleString()} bullets` : ""}</>
    : isLoading ? "Loading from contract…"
      : loadError ? "Could not load your saved policy."
        : !isConnected ? "Connect a wallet to view your policy."
          : isSigning ? "Waiting for wallet authorization…"
            : !authData ? "Sign a message to view your policy."
              : "Connecting to network…";

  return (
    <div className="flex flex-col gap-6">
      <header className="relative isolate overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 shadow-lg sm:min-h-44 sm:px-8 sm:py-9">
        <div className="absolute inset-0 -z-20 bg-[url('/backfire/killskill_bg.webp')] bg-right-top bg-no-repeat opacity-75 [background-size:auto_100%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-card from-[28%] via-card/95 via-[60%] to-card/25" />
        <div className="max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-red-400">Combat / defense</p>
          <div className="mt-3 flex items-center gap-4">
            <Image src="/backfire/bulletitem.png" alt="" width={38} height={38} className="h-9 w-9 object-contain" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Backfire settings</h1>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/75 sm:text-base">
            Choose how you automatically return fire when another player attacks you.
          </p>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]">
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="backfire-policy-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-400">Defense policy</p>
              <h2 id="backfire-policy-title" className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Choose your response</h2>
              <p className="mt-2 text-sm text-muted-foreground">Select one policy for attacks against you.</p>
            </div>
            <p className="text-xs text-muted-foreground">{BACKFIRE_MODE_OPTIONS.length} options</p>
          </div>

          <div role="radiogroup" aria-label="Backfire mode" className="grid gap-3 sm:grid-cols-2">
            {BACKFIRE_MODE_OPTIONS.map((option, index) => (
              <ModeCard
                key={option.mode}
                title={option.title}
                description={option.description}
                index={index}
                selected={hasLoaded && draft.mode === option.mode}
                disabled={!hasLoaded || saving}
                wide={index === BACKFIRE_MODE_OPTIONS.length - 1}
                onSelect={() => setDraft((current) => ({ ...current, mode: option.mode }))}
              />
            ))}
          </div>
        </section>

        <aside className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-400">Policy preview</p>
          <h2 className="mt-2 break-words text-2xl font-bold leading-tight text-foreground">
            {hasLoaded ? selectedOption.title : "Your defense policy"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {hasLoaded ? selectedOption.description : "Load your current setting to choose a response."}
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-secondary/50">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Currently saved</p>
              <p aria-live="polite" className="mt-1 text-sm font-semibold leading-snug text-foreground">{statusText}</p>
              {loadError && <p className="mt-2 text-xs leading-relaxed text-red-400">{loadError}</p>}
              {loadError && <Button variant="outline" size="sm" onClick={() => void load()} className="mt-3">Retry loading</Button>}
              {isConnected && !authData && !isSigning && (signError || !loadError) && (
                <Button variant="outline" size="sm" onClick={requestSignature} className="mt-3">Sign message</Button>
              )}
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground">New selection</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {!hasLoaded ? "Available after loading" : hasUnsavedChanges ? "Unsaved changes" : "Up to date"}
              </p>
            </div>
          </div>

          {hasLoaded && isRange ? (
            <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4">
              <p className="text-sm font-bold text-foreground">Bullet amount</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                How many bullets to shoot when backfiring ({BACKFIRE_MIN_BULLETS.toLocaleString()}–{BACKFIRE_MAX_BULLETS.toLocaleString()}).
              </p>
              <label htmlFor="backfire-bullets" className="mt-4 block text-xs font-semibold text-muted-foreground">Bullets to shoot</label>
              <div className="relative mt-2">
                <Image src="/backfire/bulletitem.png" alt="" width={20} height={20} className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 object-contain" />
                <Input
                  id="backfire-bullets"
                  type="number"
                  inputMode="numeric"
                  min={BACKFIRE_MIN_BULLETS}
                  max={BACKFIRE_MAX_BULLETS}
                  step={1}
                  value={draft.bulletAmount}
                  onChange={(event) => setDraft((current) => ({ ...current, bulletAmount: event.target.value }))}
                  disabled={saving}
                  placeholder="Enter bullet amount"
                  className="pl-10 font-mono tabular-nums"
                />
              </div>
            </div>
          ) : hasLoaded ? (
            <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4">
              <p className="text-sm font-bold text-foreground">{draft.mode === BackfireMode.None ? "Backfire off" : "Automatic response"}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {draft.mode === BackfireMode.None
                  ? "No bullets will be spent automatically while this policy is active."
                  : "This policy determines the bullet amount when an attack triggers backfire."}
              </p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={handleReset} disabled={!hasLoaded || !hasUnsavedChanges || saving} className="h-11 text-xs">
              <RotateCcw className="h-4 w-4" /> Reset changes
            </Button>
            <Button onClick={() => void handleSave()} disabled={!hasLoaded || !hasUnsavedChanges || saving} className="h-11 text-xs">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
          {isLoading && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your policy…</p>}
          {loadError && <p className="mt-3 flex items-center gap-2 text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" /> Your settings are unavailable until the contract read succeeds.</p>}
        </aside>
      </div>
    </div>
  );
}
