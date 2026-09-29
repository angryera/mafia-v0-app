"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChainMark, FieldError, FtsMark, HelpTip, SectionCard, WalletWait } from "@/features/fts/components/fts-ui";
import {
  clampPercent,
  defaultSubscribeAmount,
  deploymentPhase,
  formatDeploymentShare,
  formatFts,
  formatMediumDate,
  parseTokenInput,
  shareAmountError,
  timelinePercent,
  type FtsDeployment,
} from "@/features/fts/lib/fts";
import { cn } from "@/lib/utils";

export function DeploymentSubscriptions({
  deployments,
  liveCount,
  loading,
  balanceWei,
  balance,
  minSubscriptionWei,
  now,
  onSubscribe,
}: {
  deployments: FtsDeployment[];
  liveCount: number;
  loading: boolean;
  balanceWei: bigint;
  balance: number;
  minSubscriptionWei: bigint;
  now: number;
  onSubscribe: (deploymentId: number, amount: bigint) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<FtsDeployment | null>(null);

  return (
    <SectionCard
      title="Deployment subscriptions"
      subtitle="Commit liquid FTS to live chain deployments"
      meta={
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>{liveCount} live deployments</span>
          <HelpTip text="Subscribe FTS to a deployment" />
        </div>
      }
    >
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        {loading
          ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-64 w-full" />)
          : deployments.map((deployment) => (
              <DeploymentCard
                key={deployment.id}
                deployment={deployment}
                now={now}
                onOpen={() => setSelected(deployment)}
              />
            ))}
      </div>
      <SubscribeDialog
        deployment={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        balanceWei={balanceWei}
        balance={balance}
        minSubscriptionWei={minSubscriptionWei}
        onSubscribe={onSubscribe}
      />
    </SectionCard>
  );
}

function DeploymentCard({
  deployment,
  now,
  onOpen,
}: {
  deployment: FtsDeployment;
  now: number;
  onOpen: () => void;
}) {
  const phase = deploymentPhase(deployment, now);
  const share = deployment.totalSubscribed > 0 ? (deployment.heldAmount / deployment.totalSubscribed) * 100 : 0;
  const badge = phase === "open" ? "Open" : phase === "closed" ? "Closed" : "Pending";
  const dot = phase === "open" ? "bg-emerald-400" : phase === "closed" ? "bg-muted-foreground" : "bg-amber-400";
  const statusText = phase === "open" ? "Accepting FTS" : phase === "closed" ? "No longer accepting" : "Not yet open";

  return (
    <article className="flex h-full flex-col gap-2.5 rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium">
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          {badge}
        </span>
        <span className="text-xs text-muted-foreground">Deployment {deployment.id + 1}</span>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium">
        <ChainMark name={deployment.name} />
        <span className="truncate">{deployment.name}</span>
        <span className="text-xs font-normal text-muted-foreground">On-chain allocation</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Deployment total</span>
        <span>{formatFts(deployment.totalSubscribed)} FTS</span>
      </div>
      <p className="text-sm">{statusText}</p>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex justify-between gap-3">
          <span>Opened</span>
          <span>{deployment.createdAt > 0 ? formatMediumDate(deployment.createdAt) : "Not available"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Closes</span>
          <span>{deployment.closeAt > 0 ? formatMediumDate(deployment.closeAt) : "No deadline"}</span>
        </div>
        {deployment.closeAt > 0 ? <Progress value={timelinePercent(deployment.createdAt, deployment.closeAt, now)} className="h-2" /> : null}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Your commitment</span>
          <span>{deployment.heldAmount > 0 ? `${formatFts(deployment.heldAmount)} FTS` : "No FTS committed"}</span>
        </div>
        <p className="text-xs text-muted-foreground">{formatDeploymentShare(deployment.heldAmount, deployment.totalSubscribed)}</p>
        <Progress value={clampPercent(share)} className="h-2" />
      </div>
      {phase === "open" ? (
        <Button type="button" size="sm" className="mt-auto" onClick={onOpen}>
          {deployment.subscribed ? "Add more" : "Subscribe"}
        </Button>
      ) : (
        <Button type="button" size="sm" className="mt-auto" disabled>
          {phase === "closed" ? "Closed" : "Coming soon"}
        </Button>
      )}
    </article>
  );
}

function SubscribeDialog({
  deployment,
  onOpenChange,
  balanceWei,
  balance,
  minSubscriptionWei,
  onSubscribe,
}: {
  deployment: FtsDeployment | null;
  onOpenChange: (open: boolean) => void;
  balanceWei: bigint;
  balance: number;
  minSubscriptionWei: bigint;
  onSubscribe: (deploymentId: number, amount: bigint) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const wasOpen = useRef(false);
  const open = deployment != null;
  const balanceLabel = formatFts(balance);
  const amountWei = parseTokenInput(amount);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setAmount(defaultSubscribeAmount(minSubscriptionWei, balanceWei));
      setError(null);
    }
    wasOpen.current = open;
  }, [open, minSubscriptionWei, balanceWei]);

  const submit = async () => {
    if (!deployment) return;
    const amountError = shareAmountError(amountWei, balanceWei, balanceLabel);
    if (amountError) {
      setError(amountError);
      return;
    }
    setError(null);
    setSubmitting(true);
    const ok = await onSubscribe(deployment.id, amountWei as bigint);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  const adding = deployment?.subscribed ?? false;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent
        className={cn(submitting && "[&>button]:hidden")}
        onPointerDownOutside={(event) => { if (submitting) event.preventDefault(); }}
        onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }}
      >
        {deployment ? (
          <>
            <DialogHeader>
              <DialogTitle>{adding ? `Add shares to ${deployment.name}` : `Subscribe to ${deployment.name}`}</DialogTitle>
              <DialogDescription>Choose how many liquid founder shares to commit to this deployment.</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{balanceLabel} liquid FTS available</p>
            <div className="space-y-2">
              <Label htmlFor="fts-subscribe">Shares to subscribe</Label>
              <div className="relative">
                <FtsMark className="absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="fts-subscribe"
                  className="pl-9 pr-14"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={submitting}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">FTS</span>
              </div>
            </div>
            <FieldError message={error} />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
                Go back
              </Button>
              <Button type="button" disabled={submitting} onClick={() => void submit()}>
                {adding ? "Add shares" : "Subscribe"}
              </Button>
            </DialogFooter>
          </>
        ) : null}
        <WalletWait show={submitting} />
      </DialogContent>
    </Dialog>
  );
}
