"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicClient } from "viem";
import { AlertCircle, ArrowUpRight, ChevronDown, Clock3, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChainConfig } from "@/lib/constants/address";
import { formatWalletAddress } from "@/lib/format";
import {
  BNB_KILL_LOG_PUBLIC_CLIENT,
  getKillDrainEventHistory,
  KillDrainHistoryRangeError,
  type KillDrainEvent,
  type KillDrainEventHistory,
} from "@/lib/killDrainEventHistory";
import type { KillAssetView } from "./kill-result-assets";

export interface ClaimedAssetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  views: KillAssetView[];
  chainConfig: ChainConfig;
  onRefresh: () => void;
  loading: boolean;
  publicClient: PublicClient | undefined;
  requestBlock: bigint;
}

function dateLabel(timestamp: number): string | null {
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return null;
  const date = new Date(timestamp * 1000);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

interface DrainTransaction {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  events: KillDrainEvent[];
  ruleCount: number;
  drainedCount: bigint;
}

function groupDrainTransactions(events: readonly KillDrainEvent[]): DrainTransaction[] {
  const groups = new Map<string, DrainTransaction>();
  for (const event of events) {
    const key = `${event.transactionHash}:${event.blockNumber}`;
    const group = groups.get(key);
    if (group) {
      group.events.push(event);
      group.drainedCount += BigInt(event.drainedCount);
    } else {
      groups.set(key, {
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        events: [event],
        ruleCount: 0,
        drainedCount: BigInt(event.drainedCount),
      });
    }
  }
  return Array.from(groups.values(), (group) => ({
    ...group,
    ruleCount: new Set(group.events.map((event) => event.specIndex)).size,
  })).reverse();
}

function KillClaimStatus({ view, history, historyLoading, historyError, historySelected, onSelectHistory, chainConfig }: {
  view: KillAssetView;
  history: KillDrainEventHistory | null;
  historyLoading: boolean;
  historyError: string | null;
  historySelected: boolean;
  onSelectHistory: () => void;
  chainConfig: ChainConfig;
}) {
  const registry = view.registry;
  const title = `${view.fighter === "victim" ? "Target" : "Attacker"} · Kill #${view.killId.toString()}`;
  const state = registry ? (registry.finished ? "Complete" : "Pending") : "Unavailable";
  const stateClass = registry?.finished
    ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-200"
    : registry
      ? "border-amber-300/35 bg-amber-400/10 text-amber-200"
      : "border-white/25 bg-white/[.06] text-white/75";
  const transactions = history ? groupDrainTransactions(history.events) : [];

  return (
    <section aria-label={title} className="overflow-hidden rounded-xl border border-white/20 bg-[#101619]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[.04] px-4 py-3 sm:px-5">
        <h3 className="text-sm font-bold text-white sm:text-base">{title}</h3>
        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-[.08em] ${stateClass}`}>
          {registry?.finished ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : registry ? <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
          {state}
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {!registry ? (
          <p role={view.registryError ? "alert" : "status"} className="rounded-lg border border-white/15 bg-white/[.04] p-3 text-sm leading-relaxed text-white/80">
            {view.registryError ? `The on-chain claim record could not be read: ${view.registryError}` : "The on-chain claim record is unavailable."}
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-white/85">
              {registry.finished
                ? "The registry confirms that this kill's claim process is complete."
                : "The registry confirms that this kill's claim process is still pending."}
            </p>
            <dl className="grid gap-3 rounded-lg border border-white/15 bg-black/20 p-3.5 sm:grid-cols-2 sm:p-4">
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-white/60">Assigned recipient</dt>
                <dd className="mt-1 break-all font-mono text-sm font-semibold text-white" title={registry.displayDrainer}>
                  {formatWalletAddress(registry.displayDrainer)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-white/60">Contract claim cursor</dt>
                <dd className="mt-1 font-mono text-sm font-semibold text-amber-200">#{registry.specIndex.toString()}</dd>
              </div>
              {dateLabel(registry.startedAt) && (
                <div className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-[.1em] text-white/60">Kill registered</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">{dateLabel(registry.startedAt)}</dd>
                </div>
              )}
              {registry.finished && dateLabel(registry.finishedAt) && (
                <div className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-[.1em] text-white/60">Asset process completed</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">{dateLabel(registry.finishedAt)}</dd>
                </div>
              )}
            </dl>
            <p className="text-xs leading-relaxed text-white/65">
              The cursor is the registry&apos;s current asset rule index. It is not a count of assets received.
            </p>
          </>
        )}

        {registry?.finished && (
          <div className="border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-xs font-bold uppercase tracking-[.12em] text-amber-200">On-chain drain transactions</h4>
              {!historySelected && <button type="button" onClick={onSelectHistory} className="inline-flex min-h-9 items-center rounded-md border border-amber-300/30 px-3 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">View batches</button>}
            </div>
            {historySelected && historyLoading && <p role="status" className="mt-2 inline-flex items-center gap-2 text-sm text-white/70"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Reading transaction events…</p>}
            {historySelected && historyError && <p role="status" className="mt-2 text-sm leading-relaxed text-white/70">Transaction events are unavailable: {historyError}</p>}
            {historySelected && !historyLoading && !historyError && history?.events.length === 0 && <p className="mt-2 text-sm leading-relaxed text-white/70">No drain transactions were found for this kill in the scanned block range.</p>}
            {historySelected && transactions.length > 0 && (
              <ol className="mt-3 space-y-3">
                {transactions.map((transaction, index) => {
                  const txUrl = `${chainConfig.explorer.replace(/\/$/, "")}/tx/${transaction.transactionHash}`;
                  const nonzeroCount = new Set(transaction.events
                    .filter((event) => event.drainedCount > 0)
                    .map((event) => event.specIndex)).size;
                  const orderedEvents = [...transaction.events].sort((a, b) =>
                    Number(b.drainedCount > 0) - Number(a.drainedCount > 0) || a.specIndex - b.specIndex || a.logIndex - b.logIndex
                  );
                  return (
                    <li key={`${transaction.transactionHash}:${transaction.blockNumber}`} className="rounded-lg border border-white/15 bg-black/20 p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <strong className="text-sm text-white">Claim transaction {transactions.length > 1 ? `#${transactions.length - index}` : ""}</strong>
                        <span className="text-xs font-semibold text-white/60">Block #{transaction.blockNumber.toString()}</span>
                      </div>
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border border-white/10 bg-white/[.03] px-3 py-2">
                          <dt className="text-xs text-white/60">Asset rules processed</dt>
                          <dd className="mt-0.5 font-mono text-base font-bold text-white">{transaction.ruleCount.toLocaleString("en-US")}</dd>
                        </div>
                        <div className="rounded-md border border-white/10 bg-white/[.03] px-3 py-2">
                          <dt className="text-xs text-white/60">Contract drain count</dt>
                          <dd className="mt-0.5 font-mono text-base font-bold text-amber-200">{transaction.drainedCount.toLocaleString("en-US")}</dd>
                        </div>
                      </dl>
                      <p className="mt-2 text-xs leading-relaxed text-white/60">The contract drain count is not a count of assets received.</p>
                      <details className="group mt-3 border-t border-white/10 pt-2">
                        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded text-xs font-semibold text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                          <span>Rule details · {nonzeroCount.toLocaleString("en-US")} with a nonzero count</span>
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1 text-xs text-white/70">
                          {orderedEvents.map((event) => (
                            <li key={event.logIndex} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded bg-white/[.04] px-2.5 py-1.5">
                              <span>Rule #{event.specIndex.toLocaleString("en-US")} · {event.specDone ? "Finished" : "Continuing"}</span>
                              <span className="font-mono text-white/85">Count {event.drainedCount.toLocaleString("en-US")}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                      <a href={txUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-8 items-center gap-1 rounded text-xs font-semibold text-sky-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                        View transaction <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function ClaimedAssetsDialog({
  open,
  onOpenChange,
  views,
  chainConfig,
  onRefresh,
  loading,
  publicClient,
  requestBlock,
}: ClaimedAssetsDialogProps) {
  const [historyCache, setHistoryCache] = useState<Record<string, KillDrainEventHistory>>({});
  const [selectedKillId, setSelectedKillId] = useState<string | null>(null);
  const [historyRequest, setHistoryRequest] = useState<{ key: string; loading: boolean; error: string | null } | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const requestId = useRef(0);
  const complete = views.filter((view) => view.registry?.finished).length;
  const pending = views.filter((view) => view.registry && !view.registry.finished).length;
  const registryUrl = `${chainConfig.explorer.replace(/\/$/, "")}/address/${chainConfig.addresses.killRegistry}`;
  const activeView = selectedKillId
    ? views.find((view) => view.registry?.finished && view.killId.toString() === selectedKillId)
    : undefined;
  const activeKillId = activeView?.killId.toString() ?? null;
  const finishedAt = activeView?.registry?.finishedAt;
  const historyKey = activeKillId
    ? [chainConfig.id, chainConfig.addresses.killRegistry, requestBlock, activeKillId, finishedAt, historyRevision].join(":")
    : null;
  const activeHistory = historyKey ? historyCache[historyKey] ?? null : null;
  const historyLoading = historyRequest?.key === historyKey && historyRequest.loading;
  const historyError = !publicClient && activeKillId
    ? "Chain RPC is unavailable."
    : historyRequest?.key === historyKey ? historyRequest.error : null;

  useEffect(() => {
    if (!open || !publicClient || !activeKillId || !historyKey || activeHistory) return;
    const controller = new AbortController();
    const id = ++requestId.current;
    void (async () => {
      setHistoryRequest({ key: historyKey, loading: true, error: null });
      try {
        const history = await getKillDrainEventHistory({
          publicClient,
          logPublicClient: chainConfig.id === "bnb" ? BNB_KILL_LOG_PUBLIC_CLIENT : undefined,
          registryAddress: chainConfig.addresses.killRegistry,
          killId: BigInt(activeKillId),
          requestBlock,
          finishedAt,
          signal: controller.signal,
        });
        if (controller.signal.aborted || id !== requestId.current) return;
        setHistoryCache((cache) => ({ ...cache, [historyKey]: history }));
        setHistoryRequest(null);
      } catch (error) {
        if (controller.signal.aborted || id !== requestId.current) return;
        const message = error instanceof KillDrainHistoryRangeError
          ? "This claim spans more blocks than this screen can scan safely. The registry status above remains available."
          : error instanceof Error ? error.message : "RPC log query failed.";
        setHistoryRequest({ key: historyKey, loading: false, error: message });
      }
    })();
    return () => {
      requestId.current += 1;
      controller.abort();
    };
  }, [open, publicClient, chainConfig.id, chainConfig.addresses.killRegistry, requestBlock, activeKillId, activeHistory, historyKey, finishedAt]);

  const refresh = useCallback(() => {
    onRefresh();
    setHistoryRevision((revision) => revision + 1);
  }, [onRefresh]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedKillId(null);
      setHistoryRequest(null);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border-amber-300/35 bg-[#141a1c] p-0 text-white shadow-2xl [&>button]:text-white [&>button]:opacity-90 [&>button]:focus-visible:ring-amber-300">
        <DialogHeader className="shrink-0 border-b border-white/15 bg-[#1a2226] px-5 py-5 pr-14 text-left sm:px-7 sm:py-6 sm:pr-14">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">On-chain record · {chainConfig.label}</p>
          <DialogTitle className="mt-1 text-xl font-black uppercase tracking-[.04em] text-white sm:text-2xl">Claimed assets</DialogTitle>
          <DialogDescription className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
            Review claim completion for each kill directly from the registry.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {views.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-md border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1.5 text-emerald-200">{complete} complete</span>
              <span className="rounded-md border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-amber-200">{pending} pending</span>
            </div>
          )}
          {views.length === 0 && <p role="status" className="text-sm text-white/75">{loading ? "Loading on-chain claim records…" : "No kill records are available."}</p>}
          {views.map((view) => (
            <KillClaimStatus
              key={`${view.fighter}:${view.killId.toString()}`}
              view={view}
              history={view.killId.toString() === activeKillId ? activeHistory : null}
              historyLoading={view.killId.toString() === activeKillId && historyLoading}
              historyError={view.killId.toString() === activeKillId ? historyError : null}
              historySelected={view.killId.toString() === activeKillId}
              onSelectHistory={() => setSelectedKillId(view.killId.toString())}
              chainConfig={chainConfig}
            />
          ))}

          <p className="rounded-lg border border-sky-300/20 bg-sky-400/[.06] p-4 text-sm leading-relaxed text-white/75">
            The registry records claim status and drain batches. Batch counts can include work that did not transfer an asset to the recipient. The chain does not expose an itemized claimed-asset list here. Pending estimates appear under Claimable assets until the claim completes.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/15 bg-[#1a2226] px-5 py-4 sm:px-7">
          <a href={registryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-sky-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
            View registry <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <button type="button" onClick={refresh} disabled={loading || historyLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
            {loading || historyLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Refresh on-chain status
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
