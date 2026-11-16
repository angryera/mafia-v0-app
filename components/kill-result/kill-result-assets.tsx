"use client";

import { useState } from "react";
import type { PublicClient } from "viem";
import { ChevronDown, Coins, Gift, History, Loader2, RefreshCw, Shield, Skull } from "lucide-react";
import { formatWalletAddress } from "@/lib/format";
import { getItemLabel } from "@/lib/otc-helpers";
import type { ChainConfig } from "@/lib/constants/address";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClaimedAssetsDialog } from "./claimed-assets-dialog";
import { formatExactUnits } from "./kill-result-logic";

interface LootSummary {
  specIndex: bigint;
  kind: number;
  dest: number;
  source: string;
  category: bigint;
  killerBps: number;
  total: bigint;
  toKiller: bigint;
}

interface LootRow {
  specIndex: bigint;
  kind: number;
  dest: number;
  source: string;
  category: bigint;
  killerBps: number;
  id: bigint;
  itemId: bigint;
  categoryId: bigint;
  typeId: bigint;
  cityId: bigint;
  amount: bigint;
  mafia: bigint;
  price: bigint;
}

export interface KillAssetView {
  killId: bigint;
  fighter: "attacker" | "victim";
  registry?: {
    victim: string;
    killer: string;
    drainer: string;
    displayDrainer: string;
    finished: boolean;
    specIndex: bigint;
    startedAt: number;
    finishedAt: number;
  } | null;
  preview?: {
    victim: string;
    killer: string;
    drainer: string;
    summaries: LootSummary[];
    totalRows: bigint;
    rows: LootRow[];
    tokenDecimals?: Record<string, number>;
  };
  registryError?: string;
  lootError?: string;
}

const KIND_NAMES = [
  "Token", "Inventory items", "Listings", "Equipped items", "Equipment stake",
  "Jackpot entries", "Lottery entries", "Active stake", "Family cash", "Family native balance",
] as const;

function sourceName(kind: number, source: string, addresses: ChainConfig["addresses"]): string {
  if (kind !== 0) return KIND_NAMES[kind] ?? `Asset group ${kind}`;
  const normalized = source.toLowerCase();
  const named: Array<[string, string]> = [
    [addresses.ingameCurrency, "Liquid cash"],
    [addresses.mafia, "MAFIA"],
    [addresses.giCredits, "GI credits"],
    [addresses.bullets, "Bullets"],
    [addresses.health, "Health"],
    [addresses.bulletToken, "Bullet tokens"],
  ];
  return named.find(([address]) => address.toLowerCase() === normalized)?.[1]
    ?? `Token ${formatWalletAddress(source)}`;
}

function amountText(
  amount: bigint,
  kind: number,
  source: string,
  preview: NonNullable<KillAssetView["preview"]>,
  chainId: ChainConfig["id"],
): string {
  if (kind === 0) {
    const decimals = Object.entries(preview.tokenDecimals ?? {})
      .find(([key]) => key.toLowerCase() === source.toLowerCase())?.[1];
    return decimals === undefined ? `${amount.toLocaleString()} base units` : formatExactUnits(amount, decimals);
  }
  if (kind === 5 || kind === 8) return `$${formatExactUnits(amount)}`;
  if (kind === 9) return `${formatExactUnits(amount)} ${chainId === "bnb" ? "BNB" : "PLS"}`;
  if (kind === 4) return `${formatExactUnits(amount)} MAFIA`;
  return amount.toLocaleString();
}

function rowName(row: LootRow, addresses: ChainConfig["addresses"]): string {
  if (row.kind === 2 && row.category === 4n) return `Liquidity position #${row.id.toString()}`;
  if (row.kind === 5) return `Jackpot entry #${row.id.toString()}`;
  if (row.kind === 1 || row.kind === 3 || (row.kind === 2 && (row.category === 2n || row.category === 5n))) {
    const ids = [row.categoryId, row.typeId, row.cityId];
    if (ids.every((id) => id <= BigInt(Number.MAX_SAFE_INTEGER))) {
      return getItemLabel(Number(row.categoryId), Number(row.typeId), Number(row.cityId));
    }
  }
  return sourceName(row.kind, row.source, addresses);
}

function rowAmount(row: LootRow, preview: NonNullable<KillAssetView["preview"]>, chainId: ChainConfig["id"]): string {
  if (row.kind === 2 && row.category === 4n) {
    return row.dest === 1 ? "No cash to claim" : `$${formatExactUnits(row.amount)} cash${row.dest === 2 ? " listed" : ""}`;
  }
  if (row.kind === 1 || row.kind === 3 || (row.kind === 2 && (row.category === 2n || row.category === 5n))) {
    return row.dest === 2 ? "1 listed" : "×1";
  }
  if (row.kind === 5) return `$${formatExactUnits(row.amount)} entry value`;
  if (row.kind === 6) return `${row.amount.toLocaleString()} ${row.dest === 2 ? "listed " : ""}entries`;
  if (row.kind === 7) return `${row.amount.toLocaleString()} active ${row.amount === 1n ? "stake" : "stakes"}`;
  return amountText(row.amount, row.kind, row.source, preview, chainId);
}

function rowDetail(row: LootRow): string {
  const id = row.itemId || row.id;
  const parts = [`Spec #${row.specIndex.toString()}`, `ID #${id.toString()}`];
  if (row.kind === 1 || row.kind === 3 || (row.kind === 2 && (row.category === 2n || row.category === 5n))) {
    parts.push(`item ${row.categoryId.toString()}:${row.typeId.toString()}`);
  }
  if (row.kind === 2 && row.category === 4n) {
    parts.push(`${row.dest === 1 ? "MAFIA returned to target" : row.dest === 2 ? "MAFIA if selected" : "Unclaimed MAFIA to recipient"}: ${formatExactUnits(row.mafia)}`);
    parts.push(`Cash per MAFIA: $${formatExactUnits(row.price)}`);
  }
  if (row.dest === 2) parts.push("Possible reward; this row does not identify the selected asset");
  return parts.join(" · ");
}

function LootGroup({
  title,
  summaries,
  rows,
  preview,
  chainConfig,
}: {
  title: string;
  summaries: LootSummary[];
  rows: LootRow[];
  preview: NonNullable<KillAssetView["preview"]>;
  chainConfig: ChainConfig;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-white/15 bg-black/25 p-4 sm:p-5">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-white/85">
        {title === "Available to claim" ? <Gift className="h-4 w-4 text-amber-300" /> : <Shield className="h-4 w-4 text-sky-300" />}
        {title}
      </h4>
      {summaries.length === 0 && rows.length === 0 ? (
        <p className="text-sm text-white/70">No assets in this group.</p>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary, index) => (
            <div key={`${summary.specIndex}:${summary.kind}:${summary.dest}:${index}`} className="rounded-lg border border-white/10 bg-white/[.04] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{sourceName(summary.kind, summary.source, chainConfig.addresses)}</p>
                  <p className="mt-1 font-mono text-xs text-white/65">Spec #{summary.specIndex.toString()}{summary.kind === 1 ? ` · category #${summary.category}` : ""}</p>
                </div>
                <p className="font-mono text-sm text-amber-200">
                  {amountText(summary.dest === 1 ? summary.total : summary.toKiller, summary.kind, summary.source, preview, chainConfig.id)}
                </p>
              </div>
              {summary.dest === 2 && <p className="mt-2 text-xs leading-relaxed text-white/70">{summary.killerBps / 100}% goes to the assigned recipient. The rest is burned.</p>}
            </div>
          ))}
          {rows.length > 0 && (
            <details className="group rounded-lg border border-white/15 p-3">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between rounded text-xs font-semibold uppercase tracking-[.1em] text-white/80 outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                {rows.length} item {rows.length === 1 ? "detail" : "details"}
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {rows.map((row, index) => (
                  <div key={`${row.specIndex}:${row.id}:${row.itemId}:${index}`} className="flex flex-wrap items-start justify-between gap-2 border-t border-white/10 pt-2 text-xs">
                    <div>
                      <p className="font-semibold text-white/90">{rowName(row, chainConfig.addresses)}</p>
                      <p className="break-words font-mono text-white/70">{rowDetail(row)}</p>
                    </div>
                    <span className="font-mono text-white/90">{rowAmount(row, preview, chainConfig.id)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

export function KillResultAssets({
  views,
  loading,
  claiming,
  viewer,
  walletReady,
  chainConfig,
  publicClient,
  requestBlock,
  onClaim,
  onSwitchChain,
  onRefresh,
}: {
  views: KillAssetView[];
  loading: boolean;
  claiming: boolean;
  viewer?: string;
  walletReady: boolean;
  chainConfig: ChainConfig;
  publicClient: PublicClient | undefined;
  requestBlock: bigint;
  onClaim: () => void;
  onSwitchChain: () => void;
  onRefresh: () => void;
}) {
  const [claimOpen, setClaimOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const claimable = views.some((view) => view.registry && !view.registry.finished && viewer && view.registry.drainer.toLowerCase() === viewer.toLowerCase());

  return (
    <>
      <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-500/[.09] to-black/20 p-5 sm:p-7" aria-label="Loot and claims">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">Aftermath</p>
            <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">Loot and claims</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">Check pending assets and each kill’s on-chain claim status.</p>
          </div>
          <button type="button" onClick={onRefresh} disabled={loading || claiming} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh status
          </button>
        </div>

        {loading && views.length === 0 ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-white/75" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Checking asset records…</div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {views.map((view) => {
              const recipient = view.registry?.displayDrainer;
              const canDrainThis = Boolean(view.registry && !view.registry.finished && viewer && view.registry.drainer.toLowerCase() === viewer.toLowerCase());
              return (
                <div key={`${view.fighter}:${view.killId}`} className="rounded-xl border border-white/15 bg-black/35 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-white"><Skull className="h-4 w-4 text-red-400" /> {view.fighter === "victim" ? "Target" : "Attacker"} · Kill #{view.killId.toString()}</span>
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-[.08em] ${view.registry?.finished ? "border-white/15 bg-white/10 text-white/85" : canDrainThis ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" : view.registry ? "border-amber-400/20 bg-amber-500/10 text-amber-200" : "border-red-400/20 bg-red-500/10 text-red-200"}`}>
                      {view.registry?.finished ? "Complete" : canDrainThis ? "Your claim" : view.registry ? "Pending" : "Record unavailable"}
                    </span>
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[.08em] text-white/70">Assigned recipient</p>
                  <p className="mt-1 break-all font-mono text-sm text-white/90" title={recipient}>{recipient ? formatWalletAddress(recipient) : "Unavailable"}</p>
                  {view.registryError && <p role="alert" className="mt-3 text-xs leading-relaxed text-red-200">Claim record unavailable: {view.registryError}</p>}
                  {view.lootError && !view.registry?.finished && <p role="alert" className="mt-2 text-xs leading-relaxed text-red-200">Pending asset preview unavailable.</p>}
                </div>
              );
            })}
          </div>
        )}

        {!loading && views.length === 0 && <p className="mt-5 text-sm text-white/70">No kill asset records are available to display.</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setClaimOpen(true)} disabled={loading && views.length === 0} className="group flex min-h-16 items-center justify-between gap-4 rounded-xl border border-amber-300/40 bg-amber-300/10 px-5 py-4 text-left text-white transition-colors hover:border-amber-200 hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
            <span className="flex items-center gap-3"><Gift className="h-5 w-5 shrink-0 text-amber-200" /><span><strong className="block text-sm font-bold">Claimable assets</strong><span className="mt-1 block text-xs text-white/75">Pending loot and claim action</span></span></span>
            <span className="text-xl text-amber-200 transition-transform group-hover:translate-x-1" aria-hidden="true">›</span>
          </button>
          <button type="button" onClick={() => setHistoryOpen(true)} disabled={loading && views.length === 0} className="group flex min-h-16 items-center justify-between gap-4 rounded-xl border border-white/25 bg-white/[.04] px-5 py-4 text-left text-white transition-colors hover:border-white/45 hover:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
            <span className="flex items-center gap-3"><History className="h-5 w-5 shrink-0 text-sky-200" /><span><strong className="block text-sm font-bold">Claimed assets</strong><span className="mt-1 block text-xs text-white/75">On-chain claim status</span></span></span>
            <span className="text-xl text-sky-200 transition-transform group-hover:translate-x-1" aria-hidden="true">›</span>
          </button>
        </div>
      </section>

      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border-amber-300/35 bg-[#141a1c] p-0 text-white shadow-2xl [&>button]:text-white [&>button]:opacity-90 [&>button]:focus-visible:ring-amber-300">
          <DialogHeader className="shrink-0 border-b border-white/15 bg-[#1a2226] px-5 py-5 pr-14 text-left sm:px-7 sm:py-6 sm:pr-14">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Asset claim</p>
            <DialogTitle className="mt-1 text-xl font-black uppercase tracking-[.04em] text-white sm:text-2xl">Claimable assets</DialogTitle>
            <DialogDescription className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">Review what the assigned wallet can receive, then claim available assets.</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {views.length === 0 && <p className="text-sm text-white/75">Asset records are still loading.</p>}
            {views.map((view) => {
              const recipient = view.registry?.displayDrainer;
              const canDrainThis = Boolean(view.registry && !view.registry.finished && viewer && view.registry.drainer.toLowerCase() === viewer.toLowerCase());
              const preview = view.preview;
              const claimSummaries = preview?.summaries.filter((summary) => summary.dest !== 1 && summary.toKiller > 0n) ?? [];
              const victimSummaries = preview?.summaries.filter((summary) => summary.dest === 1 && summary.total > 0n) ?? [];
              const claimRows = preview?.rows.filter((row) => row.dest !== 1 &&
                preview.summaries.some((summary) => summary.specIndex === row.specIndex && summary.toKiller > 0n)) ?? [];
              const victimRows = preview?.rows.filter((row) => row.dest === 1) ?? [];
              return (
                <section key={`claim-${view.fighter}:${view.killId}`} className="overflow-hidden rounded-xl border border-white/20 bg-[#101619]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[.04] px-4 py-3 sm:px-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Skull className="h-4 w-4 text-red-300" /> {view.fighter === "victim" ? "Target" : "Attacker"} · Kill #{view.killId.toString()}</h3>
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-[.08em] ${view.registry?.finished ? "border-white/20 bg-white/10 text-white/80" : canDrainThis ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" : view.registry ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>{view.registry?.finished ? "Complete" : canDrainThis ? "Ready to claim" : view.registry ? "Pending" : "Unavailable"}</span>
                  </div>
                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold text-white/75">Assigned recipient</span><span className="break-all font-mono text-white" title={recipient}>{recipient ? formatWalletAddress(recipient) : "Unavailable"}</span></div>
                    {view.registryError && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm leading-relaxed text-red-100">Claim record unavailable: {view.registryError}</p>}
                    {view.registry?.finished ? (
                      <div className="rounded-lg border border-white/15 bg-white/[.04] p-4 text-sm leading-relaxed text-white/80">This claim is complete. Use Claimed assets to review its on-chain status.</div>
                    ) : preview ? (
                      <>
                        <p className="text-xs leading-relaxed text-white/70">{claimSummaries.length > 0 || claimRows.length > 0 ? "Pending asset preview. Item IDs listed for a split are possible rewards until the claim transaction confirms." : "The registry claim is pending, but the current preview lists no assets for the assigned recipient."}</p>
                        <LootGroup title="Available to claim" summaries={claimSummaries} rows={claimRows} preview={preview} chainConfig={chainConfig} />
                        {(victimSummaries.length > 0 || victimRows.length > 0) && (
                          <details className="group rounded-xl border border-white/15 bg-black/20 p-4">
                            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white/85 outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Assets staying with the target<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
                            <div className="mt-3"><LootGroup title="Stays with target" summaries={victimSummaries} rows={victimRows} preview={preview} chainConfig={chainConfig} /></div>
                          </details>
                        )}
                      </>
                    ) : (
                      <p className="rounded-lg border border-white/15 bg-white/[.04] p-4 text-sm leading-relaxed text-white/80">{view.lootError ? `Asset preview unavailable: ${view.lootError}` : "No pending asset preview is available."} The registry still determines who can claim.</p>
                    )}
                  </div>
                </section>
              );
            })}
            {!claimable && views.some((view) => view.registry && !view.registry.finished) && <p className="text-sm leading-relaxed text-white/75">{viewer ? "No pending claim is assigned to this wallet." : "Connect your wallet to check claim eligibility."}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-white/15 bg-[#1a2226] px-5 py-4 sm:px-7">
            <button type="button" onClick={onRefresh} disabled={loading || claiming} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh status</button>
            {claimable && !walletReady && <button type="button" onClick={onSwitchChain} disabled={claiming} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50">Switch to {chainConfig.label}</button>}
            {claimable && walletReady && <button type="button" onClick={onClaim} disabled={claiming || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">{claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}{claiming ? "Claiming assets…" : "Claim assets"}</button>}
          </div>
        </DialogContent>
      </Dialog>

      <ClaimedAssetsDialog open={historyOpen} onOpenChange={setHistoryOpen} views={views} chainConfig={chainConfig} publicClient={publicClient} requestBlock={requestBlock} onRefresh={onRefresh} loading={loading} />
    </>
  );
}
