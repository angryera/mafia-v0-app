"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { Skull } from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";
import { getKnownProfiles } from "@/lib/killContract";
import { formatWalletAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export function useKillRecordNames() {
  const { activeChain } = useChain();
  const script = useMafiaUtilsScript("MafiaProfile");
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (script !== "ready") {
      setNames(new Map());
      return;
    }
    let cancelled = false;
    setNames(new Map());
    setLookupError(null);
    void getKnownProfiles({ chain: activeChain })
      .then((profiles) => {
        if (!cancelled) {
          setNames(new Map(profiles.map((profile) => [
            profile.address.toLowerCase(),
            profile.name.trim(),
          ])));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNames(new Map());
          setLookupError("Player profile lookup failed. Addresses are shown instead.");
        }
      });
    return () => { cancelled = true; };
  }, [activeChain, script]);

  return useMemo(() => ({
    error: script === "error" ? "Player profile helper is unavailable. Addresses are shown instead." : lookupError,
    label(address: string) {
      return names.get(address.toLowerCase()) || formatWalletAddress(address);
    },
  }), [lookupError, names, script]);
}

export function ProfileNamesWarning({ error }: { error: string | null }) {
  return error ? <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">{error}</p> : null;
}

export function PlayerRecordLink({
  address,
  name,
  dead = false,
}: {
  address: string;
  name: string;
  dead?: boolean;
}) {
  return (
    <Link
      href={`/players?q=${encodeURIComponent(address)}`}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium hover:text-primary hover:underline",
        dead && "text-muted-foreground line-through decoration-red-500 decoration-2",
      )}
      title={address}
    >
      {dead && <Skull className="h-3.5 w-3.5 shrink-0 text-red-400" />}
      <span className="truncate">{name}</span>
    </Link>
  );
}

export function formatCombatAmount(amount: bigint): string {
  const display = Number(formatEther(amount));
  if (Number.isSafeInteger(display)) return display.toLocaleString();
  return display.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function formatAttackDate(timestamp: number | bigint): string {
  if (timestamp === 0 || timestamp === 0n) return "—";
  const date = new Date(Number(timestamp) * 1000);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}
