"use client";

import { Scroll } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeploymentSubscriptions } from "@/features/fts/components/deployment-subscriptions";
import { HoldingsWidget, Leaderboard, SupplyWidget, TransferWidget } from "@/features/fts/components/fts-sidebar";
import { ShareMarket } from "@/features/fts/components/share-market";
import { ShareValueChart } from "@/features/fts/components/share-value-chart";
import { useFoundersShares, useNow } from "@/features/fts/hooks/use-founders-shares";
import { useAccount } from "wagmi";

export function FtsPage() {
  const model = useFoundersShares();
  const now = useNow();
  const { address } = useAccount();
  const { derived } = model;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-4">
        <header className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-primary">
            <Scroll className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Founders table shares</h1>
        </header>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <ShareValueChart points={derived.priceHistory} loading={model.initialLoading} deployed={model.deployed} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <SupplyWidget derived={derived} />
            <HoldingsWidget derived={derived} />
          </div>
        </div>

        {!model.deployed ? (
          <p className="text-sm text-muted-foreground">Founder Table Shares are not deployed on this network.</p>
        ) : null}
        {model.error ? <p className="text-sm text-destructive">{model.error}</p> : null}

        <ShareMarket
          listings={derived.listings}
          listingsCount={derived.listingsCount}
          loading={model.initialLoading}
          nativeSymbol={model.nativeSymbol}
          bidIncreasePercent={derived.bidIncreasePercent}
          feePercent={derived.feePercent}
          balanceWei={derived.balanceWei}
          balance={derived.balance}
          prices={model.prices}
          directory={model.directory}
          now={now}
          cardPending={model.cardPending}
          onList={model.listShares}
          onBid={model.placeBid}
          onCancel={model.cancelAuction}
          onSettle={model.settleAuction}
        />

        <DeploymentSubscriptions
          deployments={derived.deployments}
          liveCount={derived.liveDeployments}
          loading={model.initialLoading}
          balanceWei={derived.balanceWei}
          balance={derived.balance}
          minSubscriptionWei={derived.minSubscriptionWei}
          now={now}
          onSubscribe={model.subscribe}
        />

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <TransferWidget derived={derived} directory={model.directory} account={address} onTransfer={model.transfer} />
          <Leaderboard
            holders={derived.holders}
            user={derived.userHolder}
            totalSupply={derived.totalSupply}
            directory={model.directory}
            account={address}
            loading={model.initialLoading}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
