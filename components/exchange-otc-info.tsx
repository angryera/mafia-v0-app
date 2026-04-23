"use client";

import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  HandCoins,
  Package,
  ShieldCheck,
} from "lucide-react";

import { useChain } from "@/components/chain-provider";
import { EXCHANGE_ADDRESSES, type ChainId } from "@/lib/contract";

export function ExchangeOTCInfo() {
  const { chainConfig, activeChain } = useChain();
  const exchangeAddress = EXCHANGE_ADDRESSES[activeChain as ChainId];

  return (
    <div className="flex flex-col gap-5">
      {/* Main Info Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">OTC Desk</h3>
            <p className="text-xs text-muted-foreground">
              Peer-to-peer item swaps
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <div className="rounded-lg bg-background/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-400" />
              <span className="font-medium text-foreground">What&apos;s listed</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Each open offer contains a set of <span className="font-medium text-foreground">offered</span> items
              escrowed by the creator, and a list of <span className="font-medium text-foreground">requested</span> items
              the counterparty must deliver. Both legs settle atomically on-chain.
            </p>
          </div>

          <div className="rounded-lg bg-background/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-amber-400" />
              <span className="font-medium text-foreground">Accepting an offer</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Click <span className="font-medium text-foreground">Accept</span>. We scan your inventory
              (and land slots if required), match the request, then send
              <code className="mx-1 rounded bg-background px-1 py-0.5 font-mono text-[11px]">
                acceptOTCOffer(offerId, itemIds)
              </code>
              with the matched IDs.
            </p>
          </div>

          <div className="rounded-lg bg-background/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-400" />
              <span className="font-medium text-foreground">Canceling your offer</span>
            </div>
            <p className="text-xs text-muted-foreground">
              If you created an open offer you can withdraw it at any time.
              After it expires, it can only be settled via
              <code className="mx-1 rounded bg-background px-1 py-0.5 font-mono text-[11px]">
                cancelExpiredOTCOffers()
              </code>
              , which releases the escrow back to the creator.
            </p>
          </div>

          <div className="rounded-lg bg-background/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="font-medium text-foreground">Statuses</span>
            </div>
            <ul className="ml-6 list-disc space-y-1 text-xs text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Open</span> — available to accept or cancel
              </li>
              <li>
                <span className="font-medium text-foreground">Accepted</span> — already settled by a counterparty
              </li>
              <li>
                <span className="font-medium text-foreground">Canceled</span> — pulled by the creator or expired
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Safety note */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-foreground">Trustless settlement</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Both sides of the trade move in the same transaction. If any item
          is missing or invalid, the call reverts and nothing is transferred.
        </p>
      </div>

      {/* Contract */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contract
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Exchange</span>
          <a
            href={`${chainConfig.explorer}/address/${exchangeAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-primary hover:underline"
          >
            {exchangeAddress.slice(0, 6)}...{exchangeAddress.slice(-4)}
          </a>
        </div>
      </div>

      {/* Warning */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-xs font-medium text-amber-400">Heads up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              OTC trades are final once accepted. Double-check the offered
              and requested items before confirming a transaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
