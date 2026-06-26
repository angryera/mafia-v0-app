"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAccount, usePublicClient } from "wagmi";
import { Loader2, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useChain } from "@/components/chain-provider";
import { cn } from "@/lib/utils";
import {
  KILL_RESULT_COLORS,
  KILL_RESULT_LABELS,
  type DeadAccountKillerInfo,
} from "@/lib/deadAccount";
import { fetchDeadAccountKillerInfo } from "@/lib/deadAccountKiller";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function KillerLink({
  killerName,
  killerAddress,
}: {
  killerName: string;
  killerAddress?: string;
}) {
  const looksLikeAddress = killerName.startsWith("0x") && killerName.length >= 10;
  const displayName =
    killerName && !looksLikeAddress
      ? killerName
      : killerAddress
        ? shortAddress(killerAddress)
        : killerName;

  if (killerName && !looksLikeAddress) {
    return (
      <Link
        href={`/profile/${encodeURIComponent(killerName)}`}
        className="font-medium text-primary hover:underline"
      >
        {displayName}
      </Link>
    );
  }

  return <span className="font-mono text-sm text-foreground">{displayName}</span>;
}

function KillerInfoCard({ info }: { info: DeadAccountKillerInfo }) {
  const timestampLabel =
    info.timestamp > 0
      ? format(new Date(info.timestamp * 1000), "MMM d, yyyy · h:mm a")
      : "—";

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-sm">
      <CardContent className="space-y-3 p-4 text-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Killer</span>
          <KillerLink
            killerName={info.killerName}
            killerAddress={info.killerAddress}
          />
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Timestamp</span>
          <span className="text-foreground">{timestampLabel}</span>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Result</span>
          <span
            className={cn(
              "font-medium",
              KILL_RESULT_COLORS[info.resultType],
            )}
          >
            {KILL_RESULT_LABELS[info.resultType]}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export interface DeadAccountScreenProps {
  variant?: "fullscreen" | "embedded";
  showActions?: boolean;
  victimAddress?: `0x${string}`;
  victimName?: string;
}

export function DeadAccountScreen({
  variant = "fullscreen",
  showActions = true,
  victimAddress: victimAddressProp,
  victimName: victimNameProp,
}: DeadAccountScreenProps) {
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { activeChain } = useChain();

  const victimAddress = victimAddressProp ?? address;
  const victimName = victimNameProp ?? "";

  const [killerInfo, setKillerInfo] = useState<DeadAccountKillerInfo | null>(
    null,
  );
  const [killerLoading, setKillerLoading] = useState(false);

  useEffect(() => {
    if (!publicClient || !victimAddress) {
      setKillerInfo(null);
      setKillerLoading(false);
      return;
    }

    let cancelled = false;
    setKillerLoading(true);
    setKillerInfo(null);

    fetchDeadAccountKillerInfo({
      publicClient,
      chainId: activeChain,
      victimAddress,
      victimName,
    })
      .then((info) => {
        if (!cancelled) setKillerInfo(info);
      })
      .catch(() => {
        if (!cancelled) setKillerInfo(null);
      })
      .finally(() => {
        if (!cancelled) setKillerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicClient, activeChain, victimAddress, victimName]);

  const isFullscreen = variant === "fullscreen";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-10 text-center",
        isFullscreen
          ? "min-h-0 flex-1 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black"
          : "rounded-xl border border-border/50 bg-gradient-to-b from-zinc-950/80 to-background/90",
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-lg flex-col items-center",
          isFullscreen ? "gap-6" : "gap-5 p-6",
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
          <Skull className="h-7 w-7 text-red-400" aria-hidden />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            You are dead
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your account has been eliminated. Your attacker claimed your assets.
            You can pay the vault to rebirth with penalties, or unstake your
            remaining rank and equipment stakes.
          </p>
        </div>

        {killerLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading killer details...
          </div>
        )}

        {!killerLoading && killerInfo && (
          <div className="w-full">
            <KillerInfoCard info={killerInfo} />
          </div>
        )}

        {showActions && (
          <div className="flex w-full flex-col gap-3 sm:max-w-sm">
            <Button
              size="lg"
              className="w-full bg-red-600 font-semibold text-white hover:bg-red-500"
              onClick={() => router.push("/rebirth")}
            >
              Go to rebirth page
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/rank-activation")}
            >
              Unstake assets
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => router.push("/create-profile")}
            >
              Create new account
            </Button>
          </div>
        )}

        <p className="max-w-md text-xs leading-relaxed text-muted-foreground/80">
          Dead accounts cannot trade, commit crimes, or use ecosystem contracts
          until reborn. Only rebirth and unstaking are available.
        </p>
      </div>
    </div>
  );
}
