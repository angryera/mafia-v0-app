"use client";

import type { ReactNode } from "react";
import { CircleDollarSign, CircleHelp, Coins, Scroll } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { chainBadgeLetter, type SettlementAsset } from "@/features/fts/lib/fts";

export function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={text}>
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-left">{text}</TooltipContent>
    </Tooltip>
  );
}

export function SectionCard({
  title,
  help,
  subtitle,
  meta,
  children,
  className,
}: {
  title: string;
  help?: string;
  subtitle?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {help ? <HelpTip text={help} /> : null}
          </div>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {meta}
      </div>
      {children}
    </section>
  );
}

export function FtsMark({ className }: { className?: string }) {
  return <Scroll className={cn("h-4 w-4 text-primary", className)} />;
}

export function AssetMark({ asset, className }: { asset: SettlementAsset; className?: string }) {
  const Icon = asset === "mafia" ? Coins : CircleDollarSign;
  return <Icon className={cn("h-4 w-4", className)} />;
}

export function ChainMark({ name }: { name: string }) {
  const letter = chainBadgeLetter(name);
  if (!letter) return <Scroll className="h-4 w-4 text-primary" />;
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-border bg-secondary text-[10px] font-bold text-foreground">
      {letter}
    </span>
  );
}

export function WalletWait({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/85 p-6 text-center text-sm font-medium text-foreground">
      Waiting for wallet confirmation…
    </div>
  );
}

export function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
