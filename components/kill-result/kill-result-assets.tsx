"use client";

import { useState } from "react";
import { zeroAddress } from "viem";
import { ChevronDown, Coins, Gift, Loader2, RefreshCw, Shield, Skull } from "lucide-react";
import { formatWalletAddress } from "@/lib/format";
import type { ChainConfig } from "@/lib/constants/address";
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
    <section className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/60">
        {title === "Claimable" ? <Gift className="h-4 w-4 text-amber-300" /> : <Shield className="h-4 w-4 text-slate-400" />}
        {title}
      </h4>
      {summaries.length === 0 && rows.length === 0 ? (
        <p className="text-sm text-white/40">No assets in this group.</p>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary, index) => (
            <div key={`${summary.specIndex}:${summary.kind}:${summary.dest}:${index}`} className="rounded-lg border border-white/5 bg-white/[.035] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white/90">{sourceName(summary.kind, summary.source, chainConfig.addresses)}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-white/45">Spec #{summary.specIndex.toString()}{summary.kind === 1 ? ` · category #${summary.category}` : ""}</p>
                </div>
                <p className="font-mono text-sm text-amber-200">
                  {amountText(summary.dest === 1 ? summary.total : summary.toKiller, summary.kind, summary.source, preview, chainConfig.id)}
                </p>
              </div>
              {summary.dest === 2 && <p className="mt-2 text-xs text-white/45">{summary.killerBps / 100}% to the current drainer. The remainder is burned.</p>}
            </div>
          ))}
          {rows.length > 0 && (
            <details className="group rounded-lg border border-white/10 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/60">
                {rows.length} detail {rows.length === 1 ? "row" : "rows"}
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {rows.map((row, index) => (
                  <div key={`${row.specIndex}:${row.id}:${row.itemId}:${index}`} className="flex flex-wrap items-start justify-between gap-2 border-t border-white/5 pt-2 text-xs">
                    <div>
                      <p className="text-white/80">{sourceName(row.kind, row.source, chainConfig.addresses)}</p>
                      <p className="font-mono text-white/40">Spec #{row.specIndex.toString()} · ID #{(row.itemId || row.id).toString()}{row.kind === 1 || row.kind === 3 ? ` · item ${row.categoryId}:${row.typeId}` : ""}</p>
                    </div>
                    <span className="font-mono text-white/70">
                      {row.kind === 0 || row.kind === 4 || row.kind === 5 || row.kind === 8 || row.kind === 9
                        ? amountText(row.amount, row.kind, row.source, preview, chainConfig.id)
                        : row.dest === 2 ? "Listed for split" : "×1"}
                    </span>
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
  onClaim: () => void;
  onSwitchChain: () => void;
  onRefresh: () => void;
}) {
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const claimable = views.some((view) => view.registry && !view.registry.finished && viewer && view.registry.drainer.toLowerCase() === viewer.toLowerCase());
  const hasPreview = views.some((view) => Boolean(view.preview));

  return (
    <section className="rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-500/[.07] to-transparent p-5 sm:p-7" aria-label="Asset disposition">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-amber-300">Asset disposition</p>
          <h2 className="mt-2 text-xl font-semibold text-white">What happens to the fallen players’ assets</h2>
          <p className="mt-1 text-sm text-white/50">The registry decides who can claim. The loot lens shows what can move.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading || claiming} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/5 disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading && views.length === 0 ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Reading kill registry and loot lens…</div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {views.map((view) => {
            const previewDrainer = view.preview?.drainer;
            const recipient = view.registry?.displayDrainer ?? (previewDrainer?.toLowerCase() === zeroAddress ? view.preview?.killer : previewDrainer);
            const canDrainThis = Boolean(view.registry && !view.registry.finished && viewer && recipient?.toLowerCase() === viewer.toLowerCase());
            return (
              <div key={`${view.fighter}:${view.killId}`} className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/90"><Skull className="h-4 w-4 text-red-400" /> {view.fighter === "victim" ? "Target" : "Attacker"} kill #{view.killId.toString()}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${view.registry?.finished ? "bg-white/10 text-white/50" : canDrainThis ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/10 text-amber-200"}`}>
                    {view.registry?.finished ? "Finished" : canDrainThis ? "Your claim" : "Recorded"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-white/50">Current drainer</p>
                <p className="mt-1 break-all font-mono text-xs text-white/80">{recipient ? formatWalletAddress(recipient) : "Unavailable"}</p>
                {view.registryError && <p role="alert" className="mt-3 text-xs text-red-300">Registry: {view.registryError}</p>}
                {view.lootError && <p role="alert" className="mt-2 text-xs text-red-300">Loot lens: {view.lootError}</p>}
                {view.preview && <p className="mt-3 text-xs text-white/50">{view.preview.summaries.length} asset groups · {view.preview.rows.length} detail rows</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {claimable && !walletReady && (
          <button type="button" onClick={onSwitchChain} disabled={claiming} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50">
            Switch wallet to {chainConfig.label} to claim
          </button>
        )}
        {claimable && walletReady && (
          <button type="button" onClick={onClaim} disabled={claiming || loading} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
            {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            {claiming ? "Claiming assets…" : "Claim assets"}
          </button>
        )}
        <button type="button" onClick={() => setLedgerOpen((open) => !open)} disabled={!hasPreview} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
          {ledgerOpen ? "Close loot ledger" : "Open loot ledger"}
        </button>
      </div>

      {ledgerOpen && (
        <div className="mt-6 space-y-5 border-t border-white/10 pt-5" aria-label="Loot ledger">
          {views.filter((view) => view.preview).map((view) => {
            const preview = view.preview!;
            const claimSummaries = preview.summaries.filter((summary) => summary.dest !== 1 && summary.toKiller > 0n);
            const victimSummaries = preview.summaries.filter((summary) => summary.dest === 1 && summary.total > 0n);
            const claimRows = preview.rows.filter((row) => row.dest !== 1);
            const victimRows = preview.rows.filter((row) => row.dest === 1);
            return (
              <div key={`ledger-${view.fighter}:${view.killId}`}>
                <h3 className="mb-3 text-sm font-semibold text-white">Kill #{view.killId.toString()} · {view.fighter === "victim" ? "target" : "attacker"}</h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  <LootGroup title="Claimable" summaries={claimSummaries} rows={claimRows} preview={preview} chainConfig={chainConfig} />
                  <LootGroup title="Stays with victim" summaries={victimSummaries} rows={victimRows} preview={preview} chainConfig={chainConfig} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
